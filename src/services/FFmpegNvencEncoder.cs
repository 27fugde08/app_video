using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Services
{
    /// <summary>
    /// Payload cấu hình cho tiến trình mã hóa FFmpeg NVENC
    /// </summary>
    public class NvencEncodingOptions
    {
        public string InputPath { get; set; } = string.Empty;
        public string OutputPath { get; set; } = string.Empty;
        public string FFmpegExecutablePath { get; set; } = "ffmpeg";
        public string Preset { get; set; } = "p7"; // p1 (fastest) -> p7 (highest quality)
        public string RateControl { get; set; } = "vbr"; // vbr, cbr, constqp
        public int CqValue { get; set; } = 19; // Constant Quality level (18-23 recommended)
        public int BitrateKbps { get; set; } = 8000; // Target bitrate for VBR/CBR
        public bool EnableSpatialAq { get; set; } = true;
        public bool EnableTemporalAq { get; set; } = true;
        public bool EnableZeroLatency { get; set; } = false;
        public string CustomVideoFilter { get; set; } = string.Empty; // e.g. "scale=1920:1080"
        public string AudioCodec { get; set; } = "aac";
        public string AudioBitrate { get; set; } = "192k";
        public bool OverwriteOutput { get; set; } = true;
    }

    /// <summary>
    /// Kết quả trả về sau khi hoàn tất mã hóa
    /// </summary>
    public class NvencEncodingResult
    {
        public bool Success { get; set; }
        public string OutputPath { get; set; } = string.Empty;
        public TimeSpan Duration { get; set; }
        public long FileSizeBytes { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public int ExitCode { get; set; }
    }

    /// <summary>
    /// Wrapper xử lý FFmpeg NVIDIA NVENC (h264_nvenc) cao cấp cho CreatorOS
    /// - Ngăn ngừa Deadlock bộ đệm bằng BeginErrorReadLine bất đồng bộ
    /// - Tiêu diệt triệt để Process Tree khi nhận tín hiệu CancellationToken
    /// - Trả log và % tiến trình thời gian thực qua IProgress<string> & IProgress<double>
    /// </summary>
    public class FFmpegNvencEncoder
    {
        private static readonly Regex TimeRegex = new Regex(@"time=(\d{2}):(\d{2}):(\d{2}\.\d+)", RegexOptions.Compiled);
        private static readonly Regex DurationRegex = new Regex(@"Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)", RegexOptions.Compiled);

        /// <summary>
        /// Mã hóa video với card đồ họa NVIDIA NVENC (h264_nvenc) bất đồng bộ
        /// </summary>
        /// <param name="options">Cấu hình mã hóa đầu vào/đầu ra</param>
        /// <param name="logProgress">Interface báo cáo log dòng văn bản theo thời gian thực</param>
        /// <param name="percentProgress">Interface báo cáo phần trăm % hoàn thành (0 - 100)</param>
        /// <param name="cancellationToken">Tín hiệu hủy tác vụ từ giao diện/hệ thống</param>
        public async Task<NvencEncodingResult> ExecuteEncodingAsync(
            NvencEncodingOptions options,
            IProgress<string>? logProgress = null,
            IProgress<double>? percentProgress = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(options.InputPath) || !File.Exists(options.InputPath))
            {
                throw new FileNotFoundException($"File đầu vào không tồn tại: {options.InputPath}");
            }

            if (string.IsNullOrWhiteSpace(options.OutputPath))
            {
                throw new ArgumentException("Đường dẫn file đầu ra không được để trống.", nameof(options.OutputPath));
            }

            // Tạo thư mục đầu ra nếu chưa có
            var outputDirectory = Path.GetDirectoryName(options.OutputPath);
            if (!string.IsNullOrEmpty(outputDirectory) && !Directory.Exists(outputDirectory))
            {
                Directory.CreateDirectory(outputDirectory);
            }

            // Xây dựng chuỗi tham số CLI FFmpeg NVENC tối ưu hóa phần cứng GPU NVIDIA
            var arguments = BuildNvencArguments(options);
            logProgress?.Report($"[FFmpeg NVENC Engine] Bắt đầu mã hóa phần cứng:");
            logProgress?.Report($"[FFmpeg Executable] {options.FFmpegExecutablePath}");
            logProgress?.Report($"[FFmpeg Arguments] {arguments}");

            var startInfo = new ProcessStartInfo
            {
                FileName = options.FFmpegExecutablePath,
                Arguments = arguments,
                UseShellExecute = false,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true, // BẮT BỘC REDIRECT ĐỂ TRÁNH DEADLOCK BỘ ĐỆM OS
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            using var process = new Process { StartInfo = startInfo };
            var stopwatch = Stopwatch.StartNew();
            TimeSpan totalVideoDuration = TimeSpan.Zero;
            var errorLogs = new StringBuilder();

            // Đăng ký Callback lắng nghe StandardError bất đồng bộ
            process.ErrorDataReceived += (sender, e) =>
            {
                if (string.IsNullOrEmpty(e.Data)) return;

                // 1. Gửi log dòng thời gian thực về UI
                logProgress?.Report(e.Data);
                errorLogs.AppendLine(e.Data);

                // 2. Parse thời lượng tổng của video gốc (Duration: HH:MM:SS.ms)
                if (totalVideoDuration == TimeSpan.Zero)
                {
                    var matchDuration = DurationRegex.Match(e.Data);
                    if (matchDuration.Success)
                    {
                        if (double.TryParse(matchDuration.Groups[3].Value, out double seconds) &&
                            int.TryParse(matchDuration.Groups[1].Value, out int hours) &&
                            int.TryParse(matchDuration.Groups[2].Value, out int minutes))
                        {
                            totalVideoDuration = new TimeSpan(0, hours, minutes, (int)seconds, (int)((seconds - (int)seconds) * 1000));
                        }
                    }
                }

                // 3. Parse mốc thời gian đã render (time=HH:MM:SS.ms) để tính % tiến độ
                if (totalVideoDuration.TotalSeconds > 0 && percentProgress != null)
                {
                    var matchTime = TimeRegex.Match(e.Data);
                    if (matchTime.Success)
                    {
                        if (double.TryParse(matchTime.Groups[3].Value, out double curSec) &&
                            int.TryParse(matchTime.Groups[1].Value, out int curHours) &&
                            int.TryParse(matchTime.Groups[2].Value, out int curMins))
                        {
                            var currentProcessed = new TimeSpan(0, curHours, curMins, (int)curSec, (int)((curSec - (int)curSec) * 1000));
                            double percent = Math.Min(100.0, Math.Max(0.0, (currentProcessed.TotalSeconds / totalVideoDuration.TotalSeconds) * 100.0));
                            percentProgress.Report(Math.Round(percent, 2));
                        }
                    }
                }
            };

            // Đăng ký Callback hủy tác vụ bằng CancellationToken
            using var cancellationRegistration = cancellationToken.Register(() =>
            {
                try
                {
                    if (!process.HasExited)
                    {
                        logProgress?.Report("[FFmpeg NVENC Engine] Đã nhận tín hiệu hủy! Đang tiêu diệt toàn bộ Process Tree...");
                        
                        // Gửi phím 'q' nhẹ nhàng trước để FFmpeg flush stream
                        try
                        {
                            process.StandardInput.WriteLine("q");
                            process.StandardInput.Flush();
                        }
                        catch { /* Ignored */ }

                        // Tiêu diệt triệt để process con và toàn bộ cây tiến trình (Process Tree Kill)
                        process.Kill(entireProcessTree: true);
                        logProgress?.Report("[FFmpeg NVENC Engine] Đã tiêu diệt triệt để tiến trình FFmpeg và toàn bộ child processes.");
                    }
                }
                catch (Exception ex)
                {
                    logProgress?.Report($"[FFmpeg NVENC Engine Warning] Lỗi khi ngắt process tree: {ex.Message}");
                }
            });

            try
            {
                process.Start();

                // KHỞI ĐỘNG ĐỌC BẤT ĐỒNG BỘ 2 LUỒNG ĐỂ TRÁNH DEADLOCK PIPE BUFFER
                process.BeginErrorReadLine();
                process.BeginOutputReadLine();

                // Chờ tiến trình kết thúc bất đồng bộ
                await process.WaitForExitAsync(cancellationToken).ConfigureAwait(false);
                stopwatch.Stop();

                cancellationToken.ThrowIfCancellationRequested();

                bool isSuccess = process.ExitCode == 0 && File.Exists(options.OutputPath);
                long fileSize = isSuccess ? new FileInfo(options.OutputPath).Length : 0;

                if (isSuccess)
                {
                    percentProgress?.Report(100.0);
                    logProgress?.Report($"[FFmpeg NVENC Success] Mã hóa hoàn tất thành công trong {stopwatch.Elapsed.TotalSeconds:F2}s! File size: {fileSize / (1024 * 1024):N2} MB");
                }
                else
                {
                    logProgress?.Report($"[FFmpeg NVENC Error] Tiến trình kết thúc với mã lỗi ExitCode: {process.ExitCode}");
                }

                return new NvencEncodingResult
                {
                    Success = isSuccess,
                    OutputPath = options.OutputPath,
                    Duration = stopwatch.Elapsed,
                    FileSizeBytes = fileSize,
                    ExitCode = process.ExitCode,
                    ErrorMessage = isSuccess ? string.Empty : errorLogs.ToString()
                };
            }
            catch (OperationCanceledException)
            {
                // Dọn dẹp file dở dang nếu tác vụ bị hủy
                CleanUpPartialFile(options.OutputPath);
                logProgress?.Report("[FFmpeg NVENC Cancelled] Tác vụ mã hóa đã bị hủy bởi người dùng.");
                throw;
            }
            catch (Exception ex)
            {
                CleanUpPartialFile(options.OutputPath);
                logProgress?.Report($"[FFmpeg NVENC Exception] Lỗi nghiêm trọng trong quá trình render: {ex.Message}");
                return new NvencEncodingResult
                {
                    Success = false,
                    OutputPath = options.OutputPath,
                    ErrorMessage = ex.Message,
                    ExitCode = -1
                };
            }
        }

        /// <summary>
        /// Xây dựng các cờ CLI mã hóa NVIDIA NVENC (`h264_nvenc`) đạt hiệu suất tối đa
        /// </summary>
        private static string BuildNvencArguments(NvencEncodingOptions options)
        {
            var sb = new StringBuilder();

            if (options.OverwriteOutput)
            {
                sb.Append("-y ");
            }

            // GPU Hardware Acceleration flags
            sb.Append("-hwaccel cuda -hwaccel_output_format cuda ");

            // Input File
            sb.Append($"-i \"{options.InputPath}\" ");

            // Video Filters (nếu có)
            if (!string.IsNullOrWhiteSpace(options.CustomVideoFilter))
            {
                sb.Append($"-vf \"{options.CustomVideoFilter}\" ");
            }

            // NVIDIA NVENC Video Codec & Quality Optimization
            sb.Append("-c:v h264_nvenc ");
            sb.Append($"-preset {options.Preset} ");
            sb.Append($"-rc {options.RateControl} ");
            sb.Append($"-cq {options.CqValue} ");
            sb.Append($"-b:v {options.BitrateKbps}k ");
            sb.Append("-maxrate:v 15000k -bufsize:v 30000k ");

            if (options.EnableSpatialAq)
            {
                sb.Append("-spatial-aq 1 ");
            }
            if (options.EnableTemporalAq)
            {
                sb.Append("-temporal-aq 1 ");
            }
            if (options.EnableZeroLatency)
            {
                sb.Append("-tune zerolatency ");
            }

            sb.Append("-pix_fmt yuv420p ");

            // Audio Codec settings
            sb.Append($"-c:a {options.AudioCodec} -b:a {options.AudioBitrate} ");

            // Output Path
            sb.Append($"\"{options.OutputPath}\"");

            return sb.ToString();
        }

        private static void CleanUpPartialFile(string filePath)
        {
            try
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            catch
            {
                // Ignored
            }
        }
    }
}
