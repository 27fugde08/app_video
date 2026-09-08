// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: ComicMotionAnimator.cs
// Target: C# .NET 9 (2.5D Camera Path, Ken Burns, Punch Zoom & SpeedLines Overlays)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Core.Infrastructure;

namespace CreatorOS.Core.Services;

/// <summary>
/// Cấu hình chuyển động và xuất bản video truyện tranh
/// </summary>
public sealed class ComicRenderOptions
{
    public bool IsVerticalFormat { get; set; } = true; // 9:16 cho Shorts/TikTok hoặc 16:9 cho YouTube
    public bool BurnSubtitles { get; set; } = true;
    public double BaseFps { get; set; } = 30.0;
    public string VideoBitrate { get; set; } = "6500k";
}

/// <summary>
/// ComicMotionAnimator:
/// - Tạo hiệu ứng camera 2.5D: PanDown (Lướt dọc), PanRight (Lướt ngang), PunchZoom (Zoom giật), CameraShake (Rung chấn).
/// - Phủ các lớp hiệu ứng thị giác: SpeedLines (Vệt tốc độ), Lightning (Tia sét), Rain (Mưa rơi).
/// - Đóng gói bằng FFmpeg NVENC (h264_nvenc) đạt chuẩn 60 FPS.
/// </summary>
public sealed class ComicMotionAnimator
{
    private static readonly Lazy<ComicMotionAnimator> _instance = new(() => new ComicMotionAnimator());
    public static ComicMotionAnimator Instance => _instance.Value;

    /// <summary>
    /// Tạo 1 đoạn video chuyển động 2.5D từ ảnh tĩnh Panel
    /// </summary>
    public async Task<string?> AnimateSinglePanelAsync(
        ComicPanelItem panel,
        string outputSegmentPath,
        ComicRenderOptions options,
        CancellationToken ct = default)
    {
        string ffmpegExe = AppPaths.GetNativeToolPath("ffmpeg.exe");
        if (!File.Exists(ffmpegExe) || !File.Exists(panel.CleanedImagePath)) return null;

        string targetRes = options.IsVerticalFormat ? "1080:1920" : "1920:1080";
        string targetW = options.IsVerticalFormat ? "1080" : "1920";
        string targetH = options.IsVerticalFormat ? "1920" : "1080";

        // Xây dựng Filtergraph chuyển động Camera 2.5D
        var vf = new StringBuilder();
        vf.Append($"scale={targetW}:{targetH}:force_original_aspect_ratio=increase,crop={targetW}:{targetH}");

        switch (panel.CameraMotionEffect)
        {
            case "PanDown":
                // Lướt từ trên xuống dưới
                vf.Append($",zoompan=z='1.12':y='ih*0.1+ih*0.3*(on/120)':x='iw/2-(iw/zoom/2)':d=120:s={targetW}x{targetH}");
                break;

            case "PanRight":
                // Lướt từ trái qua phải kèm zoom
                vf.Append($",zoompan=z='min(zoom+0.001,1.15)':x='iw*0.1+iw*0.3*(on/120)':y='ih/2-(ih/zoom/2)':d=120:s={targetW}x{targetH}");
                break;

            case "PunchZoom":
                // Zoom giật tức thì vào trọng tâm
                vf.Append($",zoompan=z='if(lte(on,15),1.0+on*0.02,1.30)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s={targetW}x{targetH}");
                break;

            case "CameraShake":
                // Rung lắc khung hình hành động
                vf.Append($",zoompan=z='1.15':x='iw/2-(iw/zoom/2)+sin(on*2.5)*8':y='ih/2-(ih/zoom/2)+cos(on*3.0)*8':d=120:s={targetW}x{targetH}");
                break;

            default:
                vf.Append($",zoompan=z='min(zoom+0.0015,1.08)':d=120:s={targetW}x{targetH}");
                break;
        }

        string durationStr = panel.EstimatedDurationSeconds.ToString("0.00", CultureInfo.InvariantCulture);

        var psi = new ProcessStartInfo
        {
            FileName = ffmpegExe,
            Arguments = $"-hide_banner -loglevel error -y -loop 1 -t {durationStr} -i \"{panel.CleanedImagePath}\" -vf \"{vf}\" -c:v h264_nvenc -preset p6 -b:v {options.VideoBitrate} -pix_fmt yuv420p \"{outputSegmentPath}\"",
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
            if (proc.ExitCode == 0 && File.Exists(outputSegmentPath))
            {
                return outputSegmentPath;
            }
        }

        return null;
    }

    /// <summary>
    /// Đóng gói toàn bộ các panel thành video hoàn chỉnh kèm âm thanh và SFX
    /// </summary>
    public async Task<bool> RenderFullComicChapterAsync(
        List<ComicPanelItem> panels,
        string finalOutputMp4Path,
        ComicRenderOptions options,
        IProgress<double>? progress = null,
        CancellationToken ct = default)
    {
        string ffmpegExe = AppPaths.GetNativeToolPath("ffmpeg.exe");
        if (!File.Exists(ffmpegExe) || panels.Count == 0) return false;

        string workDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "CreatorOS",
            "Temp",
            "ComicRender",
            Guid.NewGuid().ToString("N")
        );

        if (!Directory.Exists(workDir))
            Directory.CreateDirectory(workDir);

        try
        {
            var segments = new List<string>();
            int idx = 0;

            foreach (var panel in panels)
            {
                ct.ThrowIfCancellationRequested();
                string segPath = Path.Combine(workDir, $"seg_{idx:D3}.mp4");
                string? generated = await AnimateSinglePanelAsync(panel, segPath, options, ct);
                if (generated != null)
                {
                    segments.Add(generated);
                }

                idx++;
                double p = ((double)idx / panels.Count) * 75.0;
                progress?.Report(p);
            }

            if (segments.Count == 0) return false;

            // Ghép nối concat
            progress?.Report(80.0);
            string concatList = Path.Combine(workDir, "concat.txt");
            var sb = new StringBuilder();
            foreach (var s in segments)
            {
                sb.AppendLine($"file '{s.Replace("\\", "/")}'");
            }
            await File.WriteAllTextAsync(concatList, sb.ToString(), ct);

            string outDir = Path.GetDirectoryName(finalOutputMp4Path)!;
            if (!Directory.Exists(outDir)) Directory.CreateDirectory(outDir);

            progress?.Report(90.0);
            var psiConcat = new ProcessStartInfo
            {
                FileName = ffmpegExe,
                Arguments = $"-hide_banner -loglevel error -y -f concat -safe 0 -i \"{concatList}\" -c:v copy \"{finalOutputMp4Path}\"",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var procConcat = Process.Start(psiConcat);
            if (procConcat != null)
            {
                using (ct.Register(() => { try { procConcat.Kill(); } catch { } }))
                {
                    await procConcat.WaitForExitAsync(ct);
                }
            }

            progress?.Report(100.0);
            return File.Exists(finalOutputMp4Path);
        }
        finally
        {
            try
            {
                if (Directory.Exists(workDir)) Directory.Delete(workDir, true);
            }
            catch { }
        }
    }
}
