// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: TimelineCompiler.cs
// Target: C# .NET 9 (FFmpeg NVENC Complex Filtergraph Builder & Zero-Reencode)
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
using CreatorOS.Core.Models;

namespace CreatorOS.Core.Services;

/// <summary>
/// TimelineCompiler:
/// - Chuyển đổi toàn bộ Multi-Track Timeline thành chuỗi lệnh FFmpeg tối ưu.
/// - Nhận diện cắt đơn giản -> Zero-reencode stream copy (-c copy) xuất trong < 2s.
/// - Phức tạp -> Tự động sinh -filter_complex (scale, pad, crop 9:16, amix audio) + GPU NVENC (h264_nvenc).
/// </summary>
public sealed class TimelineCompiler
{
    private static readonly Lazy<TimelineCompiler> _instance = new(() => new TimelineCompiler());
    public static TimelineCompiler Instance => _instance.Value;

    /// <summary>
    /// Biên dịch TimelineProject ra file video MP4 thành phẩm
    /// </summary>
    public async Task<bool> ExportProjectAsync(
        TimelineProject project,
        string outputMp4Path,
        IProgress<double>? progress = null,
        CancellationToken ct = default)
    {
        string ffmpegExe = AppPaths.GetNativeToolPath("ffmpeg.exe");
        if (!File.Exists(ffmpegExe))
            throw new FileNotFoundException("Không tìm thấy ffmpeg.exe trong runtimes/native");

        var outDir = Path.GetDirectoryName(outputMp4Path);
        if (!string.IsNullOrEmpty(outDir) && !Directory.Exists(outDir))
            Directory.CreateDirectory(outDir);

        // Kiểm tra xem có thể dùng chế độ Zero-Reencode Copy siêu tốc không
        if (CanUseFastStreamCopy(project))
        {
            return await ExecuteFastStreamCopyAsync(project, outputMp4Path, ffmpegExe, ct);
        }

        // Chế độ Full Filtergraph + Hardware NVENC
        return await ExecuteFullFiltergraphRenderAsync(project, outputMp4Path, ffmpegExe, progress, ct);
    }

    /// <summary>
    /// Kiểm tra nếu chỉ có 1 clip trên MainVideoTrack, không có lồng tiếng/nhạc và không chỉnh tốc độ
    /// </summary>
    private static bool CanUseFastStreamCopy(TimelineProject project)
    {
        if (project.MainVideoTrack.Clips.Count == 1 &&
            project.VoiceTrack.Clips.Count == 0 &&
            project.MusicTrack.Clips.Count == 0 &&
            project.SubtitleTrack.Clips.Count == 0)
        {
            var clip = project.MainVideoTrack.Clips[0];
            return Math.Abs(clip.SpeedRate - 1.0) < 0.001 && clip.Volume >= 0.99;
        }
        return false;
    }

    private static async Task<bool> ExecuteFastStreamCopyAsync(
        TimelineProject project,
        string outputMp4Path,
        string ffmpegExe,
        CancellationToken ct)
    {
        var clip = project.MainVideoTrack.Clips[0];
        string ss = clip.SourceInSeconds.ToString("F3", CultureInfo.InvariantCulture);
        string to = clip.SourceOutSeconds.ToString("F3", CultureInfo.InvariantCulture);

        string args = $"-hide_banner -y -ss {ss} -to {to} -i \"{clip.SourceFilePath}\" -c copy -movflags +faststart \"{outputMp4Path}\"";

        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = ffmpegExe,
                Arguments = args,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true
            }
        };

        process.Start();
        using (ct.Register(() => { try { process.Kill(); } catch { } }))
        {
            await process.WaitForExitAsync(ct);
        }

        return process.ExitCode == 0 && File.Exists(outputMp4Path);
    }

    private static async Task<bool> ExecuteFullFiltergraphRenderAsync(
        TimelineProject project,
        string outputMp4Path,
        string ffmpegExe,
        IProgress<double>? progress,
        CancellationToken ct)
    {
        var inputs = new List<string>();
        var inputIndexMap = new Dictionary<string, int>();

        int GetInputIndex(string path)
        {
            if (!inputIndexMap.TryGetValue(path, out int idx))
            {
                idx = inputs.Count;
                inputs.Add(path);
                inputIndexMap[path] = idx;
            }
            return idx;
        }

        // Đăng ký inputs
        foreach (var clip in project.MainVideoTrack.Clips) GetInputIndex(clip.SourceFilePath);
        foreach (var clip in project.VoiceTrack.Clips) GetInputIndex(clip.SourceFilePath);
        foreach (var clip in project.MusicTrack.Clips) GetInputIndex(clip.SourceFilePath);

        if (inputs.Count == 0) return false;

        var sbInputs = new StringBuilder();
        foreach (var inp in inputs)
        {
            sbInputs.Append($"-i \"{inp}\" ");
        }

        var sbFilter = new StringBuilder();
        var videoSegments = new List<string>();
        var audioSegments = new List<string>();

        // 1. Build Main Video Segments
        int vSegIdx = 0;
        foreach (var clip in project.MainVideoTrack.Clips)
        {
            int inputIdx = GetInputIndex(clip.SourceFilePath);
            string inSec = clip.SourceInSeconds.ToString("F3", CultureInfo.InvariantCulture);
            string outSec = clip.SourceOutSeconds.ToString("F3", CultureInfo.InvariantCulture);
            string setpts = (1.0 / clip.SpeedRate).ToString("F3", CultureInfo.InvariantCulture);

            // Scale to target canvas (e.g. 1080x1920 with padding/contain)
            sbFilter.Append($"[{inputIdx}:v]trim=start={inSec}:end={outSec},setpts=PTS-STARTPTS,setpts={setpts}*PTS,scale={project.CanvasWidth}:{project.CanvasHeight}:force_original_aspect_ratio=decrease,pad={project.CanvasWidth}:{project.CanvasHeight}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v{vSegIdx}]; ");
            videoSegments.Add($"[v{vSegIdx}]");

            // Audio segment
            sbFilter.Append($"[{inputIdx}:a]atrim=start={inSec}:end={outSec},asetpts=PTS-STARTPTS,volume={clip.Volume.ToString("F2", CultureInfo.InvariantCulture)}[a{vSegIdx}]; ");
            audioSegments.Add($"[a{vSegIdx}]");
            vSegIdx++;
        }

        string finalVideoLabel = "[vout]";
        if (videoSegments.Count > 1)
        {
            sbFilter.Append($"{string.Join("", videoSegments)}concat=n={videoSegments.Count}:v=1:a=0[vcat]; ");
            finalVideoLabel = "[vcat]";
        }
        else if (videoSegments.Count == 1)
        {
            finalVideoLabel = videoSegments[0];
        }

        // 2. Build Audio Mix (Voice & Music)
        var mixAudioInputs = new List<string>();
        if (audioSegments.Count > 0)
        {
            if (audioSegments.Count > 1)
            {
                sbFilter.Append($"{string.Join("", audioSegments)}concat=n={audioSegments.Count}:v=0:a=1[amain]; ");
                mixAudioInputs.Add("[amain]");
            }
            else
            {
                mixAudioInputs.Add(audioSegments[0]);
            }
        }

        // Voice track
        int voiceIdx = 0;
        foreach (var clip in project.VoiceTrack.Clips)
        {
            int inputIdx = GetInputIndex(clip.SourceFilePath);
            string delayMs = ((long)(clip.TimelineStartSeconds * 1000)).ToString();
            sbFilter.Append($"[{inputIdx}:a]adelay={delayMs}|{delayMs},volume={clip.Volume.ToString("F2", CultureInfo.InvariantCulture)}[voice{voiceIdx}]; ");
            mixAudioInputs.Add($"[voice{voiceIdx}]");
            voiceIdx++;
        }

        // Music track
        int musicIdx = 0;
        foreach (var clip in project.MusicTrack.Clips)
        {
            int inputIdx = GetInputIndex(clip.SourceFilePath);
            string delayMs = ((long)(clip.TimelineStartSeconds * 1000)).ToString();
            sbFilter.Append($"[{inputIdx}:a]adelay={delayMs}|{delayMs},volume={clip.Volume.ToString("F2", CultureInfo.InvariantCulture)}[music{musicIdx}]; ");
            mixAudioInputs.Add($"[music{musicIdx}]");
            musicIdx++;
        }

        string finalAudioLabel = "[aout]";
        if (mixAudioInputs.Count > 1)
        {
            sbFilter.Append($"{string.Join("", mixAudioInputs)}amix=inputs={mixAudioInputs.Count}:duration=first:dropout_transition=2[aout]");
        }
        else if (mixAudioInputs.Count == 1)
        {
            finalAudioLabel = mixAudioInputs[0];
        }

        string filterStr = sbFilter.ToString().TrimEnd(' ', ';');

        // Render arguments with GPU NVENC (fallback libx264 ultrafast)
        string nvencArgs = $"-hide_banner -y {sbInputs} -filter_complex \"{filterStr}\" -map {finalVideoLabel} -map {finalAudioLabel} -c:v h264_nvenc -preset p6 -b:v 8M -c:a aac -b:a 192k -movflags +faststart \"{outputMp4Path}\"";

        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = ffmpegExe,
                Arguments = nvencArgs,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true
            }
        };

        process.Start();
        using (ct.Register(() => { try { process.Kill(); } catch { } }))
        {
            await process.WaitForExitAsync(ct);
        }

        // Nếu NVENC không khả dụng trên máy không có card NVIDIA, fallback CPU
        if (process.ExitCode != 0 || !File.Exists(outputMp4Path))
        {
            string cpuArgs = $"-hide_banner -y {sbInputs} -filter_complex \"{filterStr}\" -map {finalVideoLabel} -map {finalAudioLabel} -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 192k -movflags +faststart \"{outputMp4Path}\"";
            using var cpuProc = Process.Start(new ProcessStartInfo
            {
                FileName = ffmpegExe,
                Arguments = cpuArgs,
                UseShellExecute = false,
                CreateNoWindow = true
            });
            if (cpuProc != null)
            {
                await cpuProc.WaitForExitAsync(ct);
            }
        }

        progress?.Report(100.0);
        return File.Exists(outputMp4Path);
    }
}
