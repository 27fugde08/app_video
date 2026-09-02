using System;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Services
{
    /// <summary>
    /// Cấu hình tùy chỉnh biến đổi video chống quét vân tay bản quyền
    /// </summary>
    public class VideoMutationOptions
    {
        public string InputPath { get; set; } = string.Empty;
        public string OutputPath { get; set; } = string.Empty;
        public string FFmpegExecutablePath { get; set; } = "ffmpeg";
        public bool UseNvenc { get; set; } = true;
        public int CropPixels { get; set; } = 2; // Trim border 2px
        public double Brightness { get; set; } = 0.02; // Range -1.0 to 1.0
        public double Contrast { get; set; } = 1.03; // Range 0.0 to 3.0
        public double Saturation { get; set; } = 1.04; // Range 0.0 to 3.0
        public double SpeedMultiplier { get; set; } = 1.01; // Retiming 1%
        public bool EnableHorizontalFlip { get; set; } = false;
        public bool EnableSubtleNoise { get; set; } = false;
        public int CqValue { get; set; } = 19;
    }

    /// <summary>
    /// Báo cáo kết quả mã hóa và biến đổi mã Hash
    /// </summary>
    public class VideoMutationResult
    {
        public bool Success { get; set; }
        public string OutputPath { get; set; } = string.Empty;
        public string OriginalMd5 { get; set; } = string.Empty;
        public string OriginalSha256 { get; set; } = string.Empty;
        public string MutatedMd5 { get; set; } = string.Empty;
        public string MutatedSha256 { get; set; } = string.Empty;
        public TimeSpan ElapsedTime { get; set; }
        public long FileSizeBytes { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }

    /// <summary>
    /// Service xử lý biến đổi video tự động chống trùng lặp mã Hash (Fingerprint Mutation)
    /// - Kết hợp GPU NVIDIA NVENC (h264_nvenc)
    /// - Bộ lọc vi mô hình ảnh (crop 2px, eq brightness/contrast/saturation)
    /// - Đọc async StandardError tránh Deadlock bộ đệm OS
    /// - Ghi muối nhị phân ngẫu nhiên cuối file đảm bảo thay đổi hoàn toàn MD5/SHA256
    /// </summary>
    public class VideoMutatorService
    {
        public async Task<VideoMutationResult> MutateVideoAsync(
            VideoMutationOptions options,
            IProgress<string>? logProgress = null,
            IProgress<double>? percentProgress = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(options.InputPath) || !File.Exists(options.InputPath))
            {
                throw new FileNotFoundException($"File video đầu vào không tồn tại: {options.InputPath}");
            }

            var outputDir = Path.GetDirectoryName(options.OutputPath);
            if (!string.IsNullOrEmpty(outputDir) && !Directory.Exists(outputDir))
            {
                Directory.CreateDirectory(outputDir);
            }

            // Tính toán mã Hash gốc
            var (origMd5, origSha256) = await ComputeFileHashesAsync(options.InputPath, cancellationToken).ConfigureAwait(false);
            logProgress?.Report($"[VideoMutator] Raw Video Hashes -> MD5: {origMd5[..8]}... | SHA256: {origSha256[..12]}...");

            var arguments = BuildMutationArguments(options);
            logProgress?.Report($"[VideoMutator Engine] Bắt đầu xử lý biến đổi NVENC:");
            logProgress?.Report($"[FFmpeg Executable] {options.FFmpegExecutablePath}");
            logProgress?.Report($"[FFmpeg Arguments] {arguments}");

            var startInfo = new ProcessStartInfo
            {
                FileName = options.FFmpegExecutablePath,
                Arguments = arguments,
                UseShellExecute = false,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true, // Deadlock protection
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            using var process = new Process { StartInfo = startInfo };
            var stopwatch = Stopwatch.StartNew();
            var errorLogs = new StringBuilder();

            process.ErrorDataReceived += (s, e) =>
            {
                if (string.IsNullOrEmpty(e.Data)) return;
                logProgress?.Report(e.Data);
                errorLogs.AppendLine(e.Data);
            };

            using var cancellationRegistration = cancellationToken.Register(() =>
            {
                try
                {
                    if (!process.HasExited)
                    {
                        logProgress?.Report("[VideoMutator] Nhận tín hiệu hủy! Đang tiêu diệt tiến trình FFmpeg process tree...");
                        try { process.StandardInput.WriteLine("q"); } catch { }
                        process.Kill(entireProcessTree: true);
                    }
                }
                catch { }
            });

            try
            {
                process.Start();
                process.BeginErrorReadLine();
                process.BeginOutputReadLine();

                await process.WaitForExitAsync(cancellationToken).ConfigureAwait(false);
                stopwatch.Stop();

                cancellationToken.ThrowIfCancellationRequested();

                bool isSuccess = process.ExitCode == 0 && File.Exists(options.OutputPath);

                if (!isSuccess)
                {
                    CleanUpFile(options.OutputPath);
                    return new VideoMutationResult
                    {
                        Success = false,
                        OutputPath = options.OutputPath,
                        OriginalMd5 = origMd5,
                        OriginalSha256 = origSha256,
                        ErrorMessage = errorLogs.ToString()
                    };
                }

                // Ghi ngẫu nhiên muối nhị phân ở đuôi tệp để đảm bảo 100% mã Hash nhị phân bị thay đổi hoàn toàn
                await AppendBinaryTailSaltAsync(options.OutputPath, cancellationToken).ConfigureAwait(false);

                // Tính toán mã Hash mới sau biến đổi
                var (mutMd5, mutSha256) = await ComputeFileHashesAsync(options.OutputPath, cancellationToken).ConfigureAwait(false);
                long fileSize = new FileInfo(options.OutputPath).Length;

                percentProgress?.Report(100.0);
                logProgress?.Report($"[VideoMutator Success] Hoàn tất biến đổi trong {stopwatch.Elapsed.TotalSeconds:F2}s!");
                logProgress?.Report($"  MD5:    {origMd5} -> {mutMd5}");
                logProgress?.Report($"  SHA256: {origSha256} -> {mutSha256}");

                return new VideoMutationResult
                {
                    Success = true,
                    OutputPath = options.OutputPath,
                    OriginalMd5 = origMd5,
                    OriginalSha256 = origSha256,
                    MutatedMd5 = mutMd5,
                    MutatedSha256 = mutSha256,
                    ElapsedTime = stopwatch.Elapsed,
                    FileSizeBytes = fileSize
                };
            }
            catch (OperationCanceledException)
            {
                CleanUpFile(options.OutputPath);
                logProgress?.Report("[VideoMutator] Tác vụ đã bị hủy bởi người dùng.");
                throw;
            }
            catch (Exception ex)
            {
                CleanUpFile(options.OutputPath);
                logProgress?.Report($"[VideoMutator Exception] Lỗi: {ex.Message}");
                return new VideoMutationResult
                {
                    Success = false,
                    OutputPath = options.OutputPath,
                    OriginalMd5 = origMd5,
                    OriginalSha256 = origSha256,
                    ErrorMessage = ex.Message
                };
            }
        }

        private static string BuildMutationArguments(VideoMutationOptions options)
        {
            var sb = new StringBuilder("-y ");

            if (options.UseNvenc)
            {
                sb.Append("-hwaccel cuda -hwaccel_output_format cuda ");
            }

            sb.Append($"-i \"{options.InputPath}\" ");

            // Video Filters
            var vf = new StringBuilder();
            if (options.CropPixels > 0)
            {
                vf.Append($"crop=in_w-{options.CropPixels * 2}:in_h-{options.CropPixels * 2}:{options.CropPixels}:{options.CropPixels},");
            }
            if (options.EnableHorizontalFlip)
            {
                vf.Append("hflip,");
            }

            vf.Append($"eq=brightness={options.Brightness}:contrast={options.Contrast}:saturation={options.Saturation},");

            if (options.SpeedMultiplier != 1.0)
            {
                vf.Append($"setpts={(1.0 / options.SpeedMultiplier):F4}*PTS,");
            }

            if (options.EnableSubtleNoise)
            {
                vf.Append("noise=alls=1:allf=t+u,");
            }

            string vfString = vf.ToString().TrimEnd(',');
            if (!string.IsNullOrEmpty(vfString))
            {
                sb.Append($"-vf \"{vfString}\" ");
            }

            // Audio Filters
            if (options.SpeedMultiplier != 1.0)
            {
                sb.Append($"-af \"atempo={options.SpeedMultiplier:F4}\" ");
            }

            // Encoder & Metadata
            if (options.UseNvenc)
            {
                sb.Append($"-c:v h264_nvenc -preset p4 -rc vbr -cq {options.CqValue} -spatial-aq 1 -temporal-aq 1 ");
            }
            else
            {
                sb.Append("-c:v libx264 -preset fast -crf 19 ");
            }

            sb.Append($"-pix_fmt yuv420p -c:a aac -b:a 192k ");
            sb.Append($"-metadata creation_time=\"{DateTime.UtcNow:o}\" ");
            sb.Append($"\"{options.OutputPath}\"");

            return sb.ToString();
        }

        private static async Task AppendBinaryTailSaltAsync(string filePath, CancellationToken cancellationToken)
        {
            try
            {
                byte[] salt = new byte[64];
                RandomNumberGenerator.Fill(salt);
                await using var stream = new FileStream(filePath, FileMode.Append, FileAccess.Write, FileShare.None);
                await stream.WriteAsync(salt, cancellationToken).ConfigureAwait(false);
            }
            catch { }
        }

        private static async Task<(string md5, string sha256)> ComputeFileHashesAsync(string filePath, CancellationToken cancellationToken)
        {
            using var md5 = MD5.Create();
            using var sha256 = SHA256.Create();

            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            
            byte[] buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = await stream.ReadAsync(buffer, cancellationToken).ConfigureAwait(false)) > 0)
            {
                md5.TransformBlock(buffer, 0, bytesRead, null, 0);
                sha256.TransformBlock(buffer, 0, bytesRead, null, 0);
            }

            md5.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
            sha256.TransformFinalBlock(Array.Empty<byte>(), 0, 0);

            return (
                Convert.ToHexString(md5.Hash ?? Array.Empty<byte>()).ToLowerInvariant(),
                Convert.ToHexString(sha256.Hash ?? Array.Empty<byte>()).ToLowerInvariant()
            );
        }

        private static void CleanUpFile(string filePath)
        {
            try { if (File.Exists(filePath)) File.Delete(filePath); } catch { }
        }
    }
}
