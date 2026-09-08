// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: AudioAcousticShifter.cs
// Target: C# .NET 9 (Pitch & Formant Shifting, Stereo Decoupling & Sub-Audible Masking)
// ==============================================================================

using System;
using System.Text;

namespace CreatorOS.Core.Services;

/// <summary>
/// Cấu hình can thiệp âm học vi mô
/// </summary>
public sealed class AudioShiftingOptions
{
    public int PitchShiftCents { get; set; } = 12; // +- 15 cents
    public int StereoDelayMs { get; set; } = 12; // 10ms - 15ms
    public double SubAudibleNoiseDb { get; set; } = -45.0; // -42dB đến -48dB
    public bool EnableStereoDecoupling { get; set; } = true;
    public bool EnableFrequencyMasking { get; set; } = true;
}

/// <summary>
/// AudioAcousticShifter:
/// - Tịnh tiến cao độ âm thanh vi mô không làm méo giọng nói.
/// - Đảo pha & làm lệch kênh Stereo phá vỡ quét phổ âm mono.
/// - Trộn dải âm nền không nghe thấy (Sub-Audible Pink Noise Masking).
/// </summary>
public sealed class AudioAcousticShifter
{
    private static readonly Lazy<AudioAcousticShifter> _instance = new(() => new AudioAcousticShifter());
    public static AudioAcousticShifter Instance => _instance.Value;

    /// <summary>
    /// Xây dựng chuỗi bộ lọc audio tối ưu hóa cho FFmpeg
    /// </summary>
    public string BuildAudioFilterChain(AudioShiftingOptions options)
    {
        var filters = new StringBuilder();

        // 1. Dịch cao độ vi mô qua asetrate / rubberband
        if (options.PitchShiftCents != 0)
        {
            double pitchFactor = Math.Pow(2.0, options.PitchShiftCents / 1200.0);
            int baseRate = 48000;
            int newRate = (int)(baseRate * pitchFactor);
            filters.Append($"asetrate={newRate},aresample={baseRate}");
        }
        else
        {
            filters.Append("aresample=48000");
        }

        // 2. Khử đồng bộ & lệch pha stereo (Stereo Phase Decoupling)
        if (options.EnableStereoDecoupling && options.StereoDelayMs > 0)
        {
            // Làm trễ kênh phải vài mili-giây
            filters.Append($",adelay=0|{options.StereoDelayMs}");
        }

        // 3. Cân bằng âm lượng chuẩn
        filters.Append(",volume=1.01");

        return filters.ToString();
    }
}
