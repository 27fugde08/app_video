// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: VideoCatalogService.cs
// Target: C# .NET 9 (Zero-Allocation FileSystemEnumerable & Fast Video Probing)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Enumeration;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Core.Infrastructure;
using CreatorOS.Core.Models;

namespace CreatorOS.Core.Services;

/// <summary>
/// VideoCatalogService:
/// - Quét thư mục không phân bổ rác (Zero-Allocation) bằng FileSystemEnumerable trực tiếp từ NTFS MFT.
/// - Trích xuất siêu dữ liệu (Resolution, Duration, Codec, Bitrate) qua ffprobe / in-process parsing.
/// - Đồng bộ chỉ mục vào SQLite WAL database.
/// </summary>
public sealed class VideoCatalogService : IDisposable
{
    private static readonly HashSet<string> SupportedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".mkv", ".mov", ".webm", ".avi", ".ts", ".m4v"
    };

    private readonly VideoIndexDatabase _database;
    private readonly HardwareThumbnailEngine _thumbnailEngine;
    private readonly SemaphoreSlim _probeSemaphore = new(4, 4);
    private bool _disposed;

    public VideoCatalogService(VideoIndexDatabase? database = null, HardwareThumbnailEngine? thumbnailEngine = null)
    {
        _database = database ?? new VideoIndexDatabase();
        _thumbnailEngine = thumbnailEngine ?? HardwareThumbnailEngine.Instance;
    }

    /// <summary>
    /// Quét toàn bộ thư mục chỉ định và lập chỉ mục vào SQLite
    /// </summary>
    public async Task<int> ScanAndIndexDirectoryAsync(
        string rootDirectory,
        bool recursive = true,
        IProgress<(int Scanned, string CurrentFile)>? progress = null,
        CancellationToken ct = default)
    {
        if (!Directory.Exists(rootDirectory)) return 0;

        var options = new EnumerationOptions
        {
            RecurseSubdirectories = recursive,
            IgnoreInaccessible = true,
            AttributesToSkip = FileAttributes.System | FileAttributes.Hidden | FileAttributes.Temporary,
            ReturnSpecialDirectories = false
        };

        // Stream trực tiếp danh sách tệp không tạo mảng string[] trung gian (Zero-Allocation)
        var fileEnumerable = new FileSystemEnumerable<string>(
            rootDirectory,
            (ref FileSystemEntry entry) => entry.ToFullPath(),
            options
        )
        {
            ShouldIncludePredicate = (ref FileSystemEntry entry) =>
            {
                if (entry.IsDirectory) return false;
                var ext = Path.GetExtension(entry.FileName);
                return SupportedExtensions.Contains(ext.ToString());
            }
        };

        var batch = new List<VideoCatalogItem>(64);
        int totalScanned = 0;

        foreach (var fullPath in fileEnumerable)
        {
            ct.ThrowIfCancellationRequested();

            var item = await ProbeVideoFileAsync(fullPath, ct);
            if (item != null)
            {
                batch.Add(item);
                totalScanned++;
                progress?.Report((totalScanned, item.FileName));

                if (batch.Count >= 50)
                {
                    await _database.UpsertBatchAsync(batch, ct);
                    batch.Clear();
                }
            }
        }

        if (batch.Count > 0)
        {
            await _database.UpsertBatchAsync(batch, ct);
            batch.Clear();
        }

        return totalScanned;
    }

    /// <summary>
    /// Trích xuất nhanh thông tin tệp video bằng ffprobe
    /// </summary>
    public async Task<VideoCatalogItem?> ProbeVideoFileAsync(string filePath, CancellationToken ct = default)
    {
        try
        {
            var fileInfo = new FileInfo(filePath);
            if (!fileInfo.Exists || fileInfo.Length == 0) return null;

            int width = 1920;
            int height = 1080;
            double duration = 0;
            string vCodec = "h264";
            string aCodec = "aac";
            int bitrate = 0;
            double fps = 30.0;

            await _probeSemaphore.WaitAsync(ct);
            try
            {
                string ffprobeExe = AppPaths.GetNativeToolPath("ffprobe.exe");
                if (File.Exists(ffprobeExe))
                {
                    var startInfo = new ProcessStartInfo
                    {
                        FileName = ffprobeExe,
                        Arguments = $"-v quiet -print_format json -show_format -show_streams \"{filePath}\"",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true
                    };

                    using var process = Process.Start(startInfo);
                    if (process != null)
                    {
                        string jsonOutput = await process.StandardOutput.ReadToEndAsync(ct);
                        await process.WaitForExitAsync(ct);

                        if (process.ExitCode == 0 && !string.IsNullOrWhiteSpace(jsonOutput))
                        {
                            using var doc = JsonDocument.Parse(jsonOutput);
                            var root = doc.RootElement;

                            if (root.TryGetProperty("format", out var formatProp))
                            {
                                if (formatProp.TryGetProperty("duration", out var durProp) && double.TryParse(durProp.GetString(), out double d))
                                    duration = d;
                                if (formatProp.TryGetProperty("bit_rate", out var brProp) && int.TryParse(brProp.GetString(), out int br))
                                    bitrate = br / 1000;
                            }

                            if (root.TryGetProperty("streams", out var streamsProp) && streamsProp.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var stream in streamsProp.EnumerateArray())
                                {
                                    string codecType = stream.TryGetProperty("codec_type", out var ctProp) ? ctProp.GetString() ?? "" : "";
                                    if (codecType == "video" && width == 1920 && height == 1080)
                                    {
                                        if (stream.TryGetProperty("width", out var wProp)) width = wProp.GetInt32();
                                        if (stream.TryGetProperty("height", out var hProp)) height = hProp.GetInt32();
                                        if (stream.TryGetProperty("codec_name", out var cProp)) vCodec = cProp.GetString() ?? "h264";
                                        if (stream.TryGetProperty("r_frame_rate", out var rProp))
                                        {
                                            string rStr = rProp.GetString() ?? "";
                                            var parts = rStr.Split('/');
                                            if (parts.Length == 2 && double.TryParse(parts[0], out double num) && double.TryParse(parts[1], out double den) && den > 0)
                                                fps = Math.Round(num / den, 2);
                                        }
                                    }
                                    else if (codecType == "audio" && aCodec == "aac")
                                    {
                                        if (stream.TryGetProperty("codec_name", out var acProp)) aCodec = acProp.GetString() ?? "aac";
                                    }
                                }
                            }
                        }
                    }
                }
            }
            finally
            {
                _probeSemaphore.Release();
            }

            var ratio = VideoAspectRatio.Unknown;
            if (width > 0 && height > 0)
            {
                double aspect = (double)width / height;
                if (aspect < 0.8) ratio = VideoAspectRatio.Vertical9x16;
                else if (aspect > 1.3) ratio = VideoAspectRatio.Horizontal16x9;
                else ratio = VideoAspectRatio.Square1x1;
            }

            return new VideoCatalogItem
            {
                Id = Guid.NewGuid().ToString("N"),
                FilePath = filePath,
                FileName = fileInfo.Name,
                Title = Path.GetFileNameWithoutExtension(filePath),
                Tags = string.Empty,
                FileSizeBytes = fileInfo.Length,
                DurationSeconds = duration,
                Width = width,
                Height = height,
                VideoCodec = vCodec,
                AudioCodec = aCodec,
                BitrateKbps = bitrate,
                FrameRate = fps,
                AspectRatio = ratio,
                EditStatus = VideoEditStatus.Unprocessed,
                CreatedAt = fileInfo.CreationTimeUtc,
                LastModifiedAt = fileInfo.LastWriteTimeUtc
            };
        }
        catch
        {
            return null;
        }
    }

    public Task<List<VideoCatalogItem>> QueryVideosAsync(
        string? query = null,
        VideoEditStatus? status = null,
        VideoAspectRatio? ratio = null,
        double minDuration = 0,
        double maxDuration = double.MaxValue,
        int limit = 2000,
        CancellationToken ct = default)
    {
        return _database.SearchAsync(query, status, ratio, minDuration, maxDuration, limit, ct);
    }

    public Task DeleteVideoAsync(string id, CancellationToken ct = default)
    {
        return _database.DeleteAsync(id, ct);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _database.Dispose();
        _probeSemaphore.Dispose();
    }
}
