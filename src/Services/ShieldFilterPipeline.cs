// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: ShieldFilterPipeline.cs
// Target: C# .NET 9 (Single-Pass NVENC Filtergraph Execution)
// ==============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Core.Infrastructure;

namespace CreatorOS.Core.Services;

/// <summary>
/// Mức độ an toàn của Shield
/// </summary>
public enum ShieldIntensity
{
    Safe,       // Mức Nhẹ: Zoom 1.02x, chỉnh màu vi mô, pitch +10 cents
    Balanced,   // Mức Trung Bình: Thêm lật nhẹ, film grain, lệch pha stereo
    Aggressive  // Mức Cao: Toàn bộ bộ lọc, dynamic fps, watermark
}

/// <summary>
/// ShieldFilterPipeline:
/// - Gộp toàn bộ biến đổi video & audio vào 1 pass filtergraph duy nhất.
/// - Đẩy luồng trực tiếp sang NVIDIA NVENC (h264_nvenc p6 -cq 21).
/// </summary>
public sealed class ShieldFilterPipeline
{
    private static readonly Lazy<ShieldFilterPipeline> _instance = new(() => new ShieldFilterPipeline());
    public static ShieldFilterPipeline Instance => _instance.Value;

    private readonly VideoFingerprintDistorter _videoDistorter = VideoFingerprintDistorter.Instance;
    private readonly AudioAcousticShifter _audioShifter = AudioAcousticShifter.Instance;

    /// <summary>
    /// Xuất video được bảo vệ trong 1 pass mã hóa duy nhất
    /// </summary>
    public async Task<bool> ProcessAndExportShieldedVideoAsync(
        string inputPath,
        string outputPath,
        ShieldIntensity intensity,
        IProgress<double>? progress = null,
        CancellationToken ct = default)
    {
        string ffmpegExe = AppPaths.GetNativeToolPath("ffmpeg.exe");
        if (!File.Exists(ffmpegExe) || !File.Exists(inputPath))
            return false;

        string outDir = Path.GetDirectoryName(outputPath)!;
        if (!Directory.Exists(outDir))
            Directory.CreateDirectory(outDir);

        var videoOpts = new VideoDistortionOptions();
        var audioOpts = new AudioShiftingOptions();

        switch (intensity)
        {
            case ShieldIntensity.Safe:
                videoOpts.ZoomScale = 1.015;
                videoOpts.RotationAngleDegrees = 0.0;
                videoOpts.EnableFilmGrain = false;
                audioOpts.PitchShiftCents = 8;
                audioOpts.EnableStereoDecoupling = false;
                break;
            case ShieldIntensity.Balanced:
                videoOpts.ZoomScale = 1.025;
                videoOpts.RotationAngleDegrees = 0.3;
                videoOpts.EnableFilmGrain = true;
                audioOpts.PitchShiftCents = 12;
                audioOpts.StereoDelayMs = 12;
                audioOpts.EnableStereoDecoupling = true;
                break;
            case ShieldIntensity.Aggressive:
                videoOpts.ZoomScale = 1.04;
                videoOpts.RotationAngleDegrees = 0.5;
                videoOpts.CropPercentage = 2.0;
                videoOpts.EnableFilmGrain = true;
                videoOpts.EnableDynamicFps = true;
                audioOpts.PitchShiftCents = 18;
                audioOpts.StereoDelayMs = 15;
                audioOpts.EnableStereoDecoupling = true;
                break;
        }

        string vFilter = _videoDistorter.BuildVideoFilterChain(videoOpts);
        string aFilter = _audioShifter.BuildAudioFilterChain(audioOpts);

        progress?.Report(15.0);

        var psi = new ProcessStartInfo
        {
            FileName = ffmpegExe,
            Arguments = $"-hide_banner -loglevel error -y -i \"{inputPath}\" -vf \"{vFilter}\" -af \"{aFilter}\" -c:v h264_nvenc -preset p6 -rc vbr -cq 21 -c:a aac -b:a 192k \"{outputPath}\"",
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

        progress?.Report(100.0);
        return File.Exists(outputPath);
    }
}
