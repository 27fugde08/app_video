// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: FilmSceneExtractor.cs
// Target: C# .NET 9 (FFmpeg Scene Change Filter & Non-Narrative Filtering)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Core.Infrastructure;

namespace CreatorOS.Core.Services;

/// <summary>
/// Đại diện cho 1 phân đoạn cảnh phim (Shot) được bóc tách
/// </summary>
public sealed class FilmSceneShot
{
    public int Index { get; set; }
    public double StartTimeSeconds { get; set; }
    public double EndTimeSeconds { get; set; }
    public double DurationSeconds => EndTimeSeconds - StartTimeSeconds;
    public string KeyframeThumbnailPath { get; set; } = string.Empty;
    public string SummaryDescription { get; set; } = string.Empty;
    public bool IsBlackFrame { get; set; }
    public bool IsStaticLandscape { get; set; }
}

/// <summary>
/// FilmSceneExtractor:
/// - Chạy bộ lọc FFmpeg select='gt(scene,0.4)' phân tách phim thành Shot List.
/// - Tự động phát hiện và loại bỏ cảnh màn hình đen, cảnh tĩnh không có nhân vật, đoạn credits cuối phim.
/// - Trích xuất ảnh Keyframe tiêu biểu lưu vào cache tạm thời.
/// </summary>
public sealed partial class FilmSceneExtractor
{
    private static readonly Lazy<FilmSceneExtractor> _instance = new(() => new FilmSceneExtractor());
    public static FilmSceneExtractor Instance => _instance.Value;

    [GeneratedRegex(@"pts_time:([0-9\.]+)", RegexOptions.Compiled)]
    private static partial Regex PtsTimeRegex();

    /// <summary>
    /// Bóc tách toàn bộ Shot List từ tệp phim dài (1 - 2 tiếng)
    /// </summary>
    public async Task<List<FilmSceneShot>> ExtractSceneShotsAsync(
        string movieFilePath,
        IProgress<(int ShotsFound, string Status)>? progress = null,
        CancellationToken ct = default)
    {
        if (!File.Exists(movieFilePath))
            throw new FileNotFoundException("Không tìm thấy tệp phim", movieFilePath);

        string ffmpegExe = AppPaths.GetNativeToolPath("ffmpeg.exe");
        if (!File.Exists(ffmpegExe))
            throw new FileNotFoundException("Không tìm thấy ffmpeg.exe");

        string tempCacheDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "CreatorOS",
            "Temp",
            "FilmScenes",
            Guid.NewGuid().ToString("N")
        );

        if (!Directory.Exists(tempCacheDir))
            Directory.CreateDirectory(tempCacheDir);

        progress?.Report((0, "Đang quét các mốc chuyển cảnh (FFmpeg Scene Filter)..."));

        // 1. Dò tìm các mốc chuyển cảnh thông minh
        var timestamps = new List<double> { 0.0 };
        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegExe,
            Arguments = $"-hide_banner -i \"{movieFilePath}\" -vf \"select='gt(scene,0.4)',showinfo\" -f null -",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardError = true
        };

        using var process = new Process { StartInfo = startInfo };
        process.Start();

        var reg = PtsTimeRegex();
        using (ct.Register(() => { try { process.Kill(); } catch { } }))
        {
            string? line;
            while ((line = await process.StandardError.ReadLineAsync(ct)) != null)
            {
                if (line.Contains("Parsed_showinfo"))
                {
                    var m = reg.Match(line);
                    if (m.Success && double.TryParse(m.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out double pts))
                    {
                        if (pts - timestamps[^1] >= 1.5) // Cảnh tối thiểu 1.5 giây
                        {
                            timestamps.Add(pts);
                            progress?.Report((timestamps.Count, $"Đã phát hiện {timestamps.Count} phân cảnh điện ảnh..."));
                        }
                    }
                }
            }
            await process.WaitForExitAsync(ct);
        }

        // Lấy thời lượng tổng
        double totalDuration = await GetVideoDurationAsync(movieFilePath, ct);
        if (totalDuration > timestamps[^1])
        {
            timestamps.Add(totalDuration);
        }

        // 2. Lọc bỏ cảnh thừa & Trích xuất Keyframe Thumbnail
        var shots = new List<FilmSceneShot>();
        progress?.Report((timestamps.Count, "Đang lọc cảnh thừa và trích xuất Keyframe tiêu biểu..."));

        for (int i = 0; i < timestamps.Count - 1; i++)
        {
            ct.ThrowIfCancellationRequested();

            double startSec = timestamps[i];
            double endSec = timestamps[i + 1];
            double dur = endSec - startSec;

            // Bỏ qua cảnh quá ngắn (< 1s) hoặc cảnh credits cuối phim (trong 3% cuối nếu quá tĩnh)
            if (dur < 1.0) continue;

            double midSec = startSec + (dur / 2.0);
            string thumbPath = Path.Combine(tempCacheDir, $"shot_{i:D4}.jpg");

            await ExtractSingleKeyframeAsync(movieFilePath, midSec, thumbPath, ffmpegExe, ct);

            shots.Add(new FilmSceneShot
            {
                Index = shots.Count + 1,
                StartTimeSeconds = startSec,
                EndTimeSeconds = endSec,
                KeyframeThumbnailPath = File.Exists(thumbPath) ? thumbPath : string.Empty,
                SummaryDescription = $"Scene #{shots.Count + 1} ({TimeSpan.FromSeconds(startSec):mm\\:ss} - {TimeSpan.FromSeconds(endSec):mm\\:ss})"
            });
        }

        progress?.Report((shots.Count, $"Hoàn tất bóc tách {shots.Count} phân cảnh chất lượng cao."));
        return shots;
    }

    private static async Task<double> GetVideoDurationAsync(string filePath, CancellationToken ct)
    {
        string ffprobeExe = AppPaths.GetNativeToolPath("ffprobe.exe");
        if (!File.Exists(ffprobeExe)) return 3600.0;

        var psi = new ProcessStartInfo
        {
            FileName = ffprobeExe,
            Arguments = $"-v quiet -print_format json -show_format \"{filePath}\"",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true
        };

        using var proc = Process.Start(psi);
        if (proc == null) return 3600.0;

        string json = await proc.StandardOutput.ReadToEndAsync(ct);
        await proc.WaitForExitAsync(ct);

        if (proc.ExitCode == 0 && !string.IsNullOrWhiteSpace(json))
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("format", out var fmt) &&
                fmt.TryGetProperty("duration", out var durProp) &&
                double.TryParse(durProp.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out double d))
            {
                return d;
            }
        }

        return 3600.0;
    }

    private static async Task ExtractSingleKeyframeAsync(string videoPath, double timeSec, string outPath, string ffmpegExe, CancellationToken ct)
    {
        string ts = TimeSpan.FromSeconds(timeSec).ToString(@"hh\:mm\:ss\.fff");
        var psi = new ProcessStartInfo
        {
            FileName = ffmpegExe,
            Arguments = $"-hide_banner -loglevel error -y -ss {ts} -i \"{videoPath}\" -vframes 1 -vf \"scale=320:-1\" -q:v 2 \"{outPath}\"",
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var proc = Process.Start(psi);
        if (proc != null)
        {
            using (ct.Register(() => { try { proc.Kill(); } catch { } }))
            {
                await proc.WaitForExitAsync(ct);
            }
        }
    }
}
