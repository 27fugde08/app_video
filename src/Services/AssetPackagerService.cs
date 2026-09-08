// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: AssetPackagerService.cs
// Target: C# .NET 9 (Zero-Copy Atomic MFT File Mover & Self-Contained Bundle Packager)
// ==============================================================================

using System;
using System.Buffers;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Core.Infrastructure;

namespace CreatorOS.Core.Services;

/// <summary>
/// Chiến lược xử lý khi xảy ra trùng lặp tên tệp đích.
/// </summary>
public enum FileCollisionStrategy
{
    AutoIncrementNumber = 0, // Tự động đánh số tăng dần (e.g. video_1.mp4)
    Overwrite = 1,           // Ghi đè tệp cũ
    Skip = 2                 // Bỏ qua không chép
}

/// <summary>
/// Cấu hình tùy chọn dọn dẹp và đóng gói tài nguyên.
/// </summary>
public sealed class AssetPackagerOptions
{
    public bool DeleteOriginalAfterPackaging { get; set; } = false;
    public bool PurgeIntermediateStems { get; set; } = true;
    public bool ShowNotificationToast { get; set; } = true;
    public FileCollisionStrategy CollisionStrategy { get; set; } = FileCollisionStrategy.AutoIncrementNumber;
    public string OutputPatternTemplate { get; set; } = SmartPathRouter.DefaultPattern;
    public string CustomBaseDirectory { get; set; } = string.Empty;
}

/// <summary>
/// Dữ liệu đầu vào yêu cầu đóng gói một bộ sản phẩm video hoàn chỉnh.
/// </summary>
public sealed class AssetBundleRequest
{
    public required string FinalDubbedVideoPath { get; set; }
    public string? OriginalVideoPath { get; set; }
    public string? Thumbnail3DPath { get; set; }
    public string? SrtSubtitlePath { get; set; }
    public string? AssSubtitlePath { get; set; }
    public string? DirectorScriptJsonPath { get; set; }
    public string? MetadataJsonPath { get; set; }
    public List<string> IntermediateStemPaths { get; set; } = new();

    public required PathContext Context { get; set; }
}

/// <summary>
/// Kết quả tổng hợp sau khi hoàn tất đóng gói Bundle.
/// </summary>
public sealed class AssetBundleResult
{
    public bool IsSuccess { get; set; }
    public string BundleDirectoryPath { get; set; } = string.Empty;
    public string FinalVideoPath { get; set; } = string.Empty;
    public string? ThumbnailPath { get; set; }
    public long TotalBundleSizeBytes { get; set; }
    public int TotalFilesCount { get; set; }
    public double ElapsedMilliseconds { get; set; }
    public bool UsedAtomicMftMove { get; set; }
    public string? ErrorMessage { get; set; }
    public List<string> PackagedFiles { get; set; } = new();
}

/// <summary>
/// AssetPackagerService: Đóng gói bộ tài nguyên phái sinh thành cấu trúc thư mục tự trị (Self-Contained Bundle).
/// - Thực hiện chuyển tệp nguyên tử (Atomic Zero-Copy Move) trong &lt; 5ms nếu cùng phân vùng ổ đĩa.
/// - Sao chép luồng bất đồng bộ qua System.IO.RandomAccess và ArrayPool&lt;byte&gt; nếu khác ổ đĩa.
/// - Dọn rác trung gian triệt để theo cấu hình người dùng.
/// </summary>
public sealed class AssetPackagerService
{
    private const int BufferSize = 128 * 1024; // 128KB buffer cho RandomAccess cross-volume copy
    private readonly AssetPackagerOptions _options;

    public AssetPackagerService(AssetPackagerOptions? options = null)
    {
        _options = options ?? new AssetPackagerOptions();
    }

    /// <summary>
    /// Thực thi quy trình đóng gói gói tài nguyên toàn diện.
    /// </summary>
    public async Task<AssetBundleResult> PackageAsync(
        AssetBundleRequest request, 
        CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var result = new AssetBundleResult();

        try
        {
            if (!File.Exists(request.FinalDubbedVideoPath))
            {
                throw new FileNotFoundException("Không tìm thấy tệp video thành phẩm cần đóng gói.", request.FinalDubbedVideoPath);
            }

            // 1. Giải quyết đường dẫn thư mục đích bằng SmartPathRouter
            string bundleDir = SmartPathRouter.ResolveBundleDirectory(
                _options.OutputPatternTemplate, 
                request.Context
            );

            // Đảm bảo thư mục đích tồn tại
            if (!Directory.Exists(bundleDir))
            {
                Directory.CreateDirectory(bundleDir);
            }

            result.BundleDirectoryPath = bundleDir;
            string sanitizedTitle = SmartPathRouter.SanitizeSegment(request.Context.Title, 80);

            // 2. Chuyển tệp video thành phẩm (Final Dubbed Video)
            string destDubbedPath = Path.Combine(bundleDir, $"{sanitizedTitle}_Dubbed.mp4");
            destDubbedPath = ResolveCollisionPath(destDubbedPath, _options.CollisionStrategy);

            bool atomicUsed = await MoveOrCopyFileAsync(request.FinalDubbedVideoPath, destDubbedPath, ct);
            result.FinalVideoPath = destDubbedPath;
            result.UsedAtomicMftMove = atomicUsed;
            result.PackagedFiles.Add(destDubbedPath);

            // 3. Chuyển / Xử lý video gốc (Original Video)
            if (!string.IsNullOrEmpty(request.OriginalVideoPath) && File.Exists(request.OriginalVideoPath))
            {
                if (_options.DeleteOriginalAfterPackaging)
                {
                    try { File.Delete(request.OriginalVideoPath); } catch { }
                }
                else
                {
                    string destOriginalPath = Path.Combine(bundleDir, $"{sanitizedTitle}_Original.mp4");
                    destOriginalPath = ResolveCollisionPath(destOriginalPath, _options.CollisionStrategy);
                    await MoveOrCopyFileAsync(request.OriginalVideoPath, destOriginalPath, ct);
                    result.PackagedFiles.Add(destOriginalPath);
                }
            }

            // 4. Chuyển Thumbnail 3D (cover_3d.jpg)
            if (!string.IsNullOrEmpty(request.Thumbnail3DPath) && File.Exists(request.Thumbnail3DPath))
            {
                string destThumbPath = Path.Combine(bundleDir, "cover_3d.jpg");
                await MoveOrCopyFileAsync(request.Thumbnail3DPath, destThumbPath, ct);
                result.ThumbnailPath = destThumbPath;
                result.PackagedFiles.Add(destThumbPath);
            }

            // 5. Chuyển Phụ đề SRT (subtitles_vi.srt)
            if (!string.IsNullOrEmpty(request.SrtSubtitlePath) && File.Exists(request.SrtSubtitlePath))
            {
                string destSrtPath = Path.Combine(bundleDir, $"subtitles_{request.Context.Lang}.srt");
                await MoveOrCopyFileAsync(request.SrtSubtitlePath, destSrtPath, ct);
                result.PackagedFiles.Add(destSrtPath);
            }

            // 6. Chuyển Phụ đề ASS Karaoke (subtitles_vi.ass)
            if (!string.IsNullOrEmpty(request.AssSubtitlePath) && File.Exists(request.AssSubtitlePath))
            {
                string destAssPath = Path.Combine(bundleDir, $"subtitles_{request.Context.Lang}.ass");
                await MoveOrCopyFileAsync(request.AssSubtitlePath, destAssPath, ct);
                result.PackagedFiles.Add(destAssPath);
            }

            // 7. Chuyển Script Director JSON (script_director.json)
            if (!string.IsNullOrEmpty(request.DirectorScriptJsonPath) && File.Exists(request.DirectorScriptJsonPath))
            {
                string destScriptPath = Path.Combine(bundleDir, "script_director.json");
                await MoveOrCopyFileAsync(request.DirectorScriptJsonPath, destScriptPath, ct);
                result.PackagedFiles.Add(destScriptPath);
            }

            // 8. Chuyển Metadata SEO JSON (metadata.json)
            if (!string.IsNullOrEmpty(request.MetadataJsonPath) && File.Exists(request.MetadataJsonPath))
            {
                string destMetaPath = Path.Combine(bundleDir, "metadata.json");
                await MoveOrCopyFileAsync(request.MetadataJsonPath, destMetaPath, ct);
                result.PackagedFiles.Add(destMetaPath);
            }

            // 9. Dọn rác các tệp Audio Stems trung gian nếu được bật
            if (_options.PurgeIntermediateStems && request.IntermediateStemPaths != null)
            {
                foreach (var stemPath in request.IntermediateStemPaths)
                {
                    try
                    {
                        if (File.Exists(stemPath)) File.Delete(stemPath);
                    }
                    catch { }
                }
            }

            // 10. Tính toán tổng dung lượng và số lượng tệp trong gói
            long totalBytes = 0;
            int fileCount = 0;
            var dirInfo = new DirectoryInfo(bundleDir);
            if (dirInfo.Exists)
            {
                foreach (var file in dirInfo.EnumerateFiles("*", SearchOption.TopDirectoryOnly))
                {
                    totalBytes += file.Length;
                    fileCount++;
                }
            }

            result.TotalBundleSizeBytes = totalBytes;
            result.TotalFilesCount = fileCount;
            result.IsSuccess = true;

            // 11. Bắn thông báo Native WinRT Toast kèm ảnh Hero Preview và Nút bấm tương tác
            if (_options.ShowNotificationToast && !string.IsNullOrEmpty(result.FinalVideoPath))
            {
                _ = NativeToastService.ShowSuccessToastAsync(new ToastNotificationRequest
                {
                    Title = string.IsNullOrWhiteSpace(request.Context.Title) ? Path.GetFileNameWithoutExtension(result.FinalVideoPath) : request.Context.Title,
                    Resolution = string.IsNullOrWhiteSpace(request.Context.Resolution) ? "1080p" : request.Context.Resolution,
                    FileSizeBytes = totalBytes,
                    ProcessingElapsedMs = sw.Elapsed.TotalMilliseconds,
                    FinalVideoPath = result.FinalVideoPath,
                    BundleDirectory = bundleDir,
                    Thumbnail3DPath = result.ThumbnailPath,
                    Tag = Guid.NewGuid().ToString("N")
                });
            }
        }
        catch (Exception ex)
        {
            result.IsSuccess = false;
            result.ErrorMessage = ex.Message;
        }
        finally
        {
            sw.Stop();
            result.ElapsedMilliseconds = sw.Elapsed.TotalMilliseconds;
        }

        return result;
    }

    /// <summary>
    /// Chuyển tệp tin sử dụng MFT Atomic Move nếu cùng ổ đĩa hoặc RandomAccess Copy nếu khác ổ đĩa.
    /// </summary>
    private static async Task<bool> MoveOrCopyFileAsync(string sourcePath, string destPath, CancellationToken ct)
    {
        if (string.Equals(sourcePath, destPath, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        string? sourceRoot = Path.GetPathRoot(Path.GetFullPath(sourcePath));
        string? destRoot = Path.GetPathRoot(Path.GetFullPath(destPath));

        // Cùng ổ đĩa (e.g. C:\ -> C:\ hoặc D:\ -> D:\) -> File.Move tức thì qua MFT pointer update
        if (!string.IsNullOrEmpty(sourceRoot) && 
            !string.IsNullOrEmpty(destRoot) && 
            string.Equals(sourceRoot, destRoot, StringComparison.OrdinalIgnoreCase))
        {
            if (File.Exists(destPath))
            {
                File.Delete(destPath);
            }

            File.Move(sourcePath, destPath, overwrite: true);
            return true;
        }

        // Khác ổ đĩa (e.g. C:\AppData -> D:\Output) -> Sao chép bằng RandomAccess + ArrayPool
        await CopyFileWithRandomAccessAsync(sourcePath, destPath, ct).ConfigureAwait(false);

        // Xóa tệp nguồn sau khi chép hoàn tất an toàn
        try
        {
            File.Delete(sourcePath);
        }
        catch { }

        return false;
    }

    /// <summary>
    /// Sao chép tệp tốc độ cao giữa các ổ đĩa với System.IO.RandomAccess và ArrayPool&lt;byte&gt;.
    /// </summary>
    private static async Task CopyFileWithRandomAccessAsync(string sourcePath, string destPath, CancellationToken ct)
    {
        var fileInfo = new FileInfo(sourcePath);
        long fileLength = fileInfo.Length;

        using var srcHandle = File.OpenHandle(sourcePath, FileMode.Open, FileAccess.Read, FileShare.Read, FileOptions.Asynchronous | FileOptions.SequentialScan);
        using var dstHandle = File.OpenHandle(destPath, FileMode.Create, FileAccess.Write, FileShare.None, FileOptions.Asynchronous | FileOptions.SequentialScan, preallocationSize: fileLength);

        byte[] rentBuffer = ArrayPool<byte>.Shared.Rent(BufferSize);
        try
        {
            long position = 0;
            while (position < fileLength)
            {
                ct.ThrowIfCancellationRequested();
                int bytesToRead = (int)Math.Min(BufferSize, fileLength - position);
                var memory = rentBuffer.AsMemory(0, bytesToRead);

                int bytesRead = await RandomAccess.ReadAsync(srcHandle, memory, position, ct).ConfigureAwait(false);
                if (bytesRead == 0) break;

                await RandomAccess.WriteAsync(dstHandle, memory[..bytesRead], position, ct).ConfigureAwait(false);
                position += bytesRead;
            }

            await RandomAccess.FlushStoreToDiskAsync(dstHandle).ConfigureAwait(false);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(rentBuffer);
        }
    }

    /// <summary>
    /// Giải quyết xung đột tên file dựa trên chiến lược (AutoIncrement, Overwrite, Skip).
    /// </summary>
    private static string ResolveCollisionPath(string targetPath, FileCollisionStrategy strategy)
    {
        if (!File.Exists(targetPath) || strategy == FileCollisionStrategy.Overwrite)
        {
            return targetPath;
        }

        if (strategy == FileCollisionStrategy.Skip)
        {
            return targetPath;
        }

        // Auto-increment: video.mp4 -> video_1.mp4 -> video_2.mp4
        string directory = Path.GetDirectoryName(targetPath) ?? string.Empty;
        string fileNameWithoutExt = Path.GetFileNameWithoutExtension(targetPath);
        string extension = Path.GetExtension(targetPath);

        int counter = 1;
        string newPath = targetPath;
        while (File.Exists(newPath))
        {
            newPath = Path.Combine(directory, $"{fileNameWithoutExt}_{counter}{extension}");
            counter++;
        }

        return newPath;
    }
}
