// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: VideoFingerprintDistorter.cs
// Target: C# .NET 9 (Micro-Geometric Warping, Film Grain Dither & Color Shift)
// ==============================================================================

using System;
using System.Text;

namespace CreatorOS.Core.Services;

/// <summary>
/// Cấu hình can thiệp thị giác vi mô
/// </summary>
public sealed class VideoDistortionOptions
{
    public double ZoomScale { get; set; } = 1.02; // 1.01x - 1.04x
    public double RotationAngleDegrees { get; set; } = 0.3; // 0.1 - 0.5 độ
    public double CropPercentage { get; set; } = 1.5; // 1.0% - 2.5%
    public bool EnableFilmGrain { get; set; } = true;
    public double ContrastBoost { get; set; } = 1.02; // +2%
    public double GammaShift { get; set; } = 1.02; // Sắc thái xanh/ấm
    public bool EnableDynamicFps { get; set; } = true;
    public double TargetFps { get; set; } = 29.97;
}

/// <summary>
/// VideoFingerprintDistorter:
/// - Xây dựng chuỗi FFmpeg filtergraph biến đổi hình học vi mô.
/// - Chèn nhiễu hạt điện ảnh siêu mịn phá vỡ macroblock hashes.
/// - Dịch chuyển biểu đồ màu vi mô không làm biến dạng cảm quan mắt người.
/// </summary>
public sealed class VideoFingerprintDistorter
{
    private static readonly Lazy<VideoFingerprintDistorter> _instance = new(() => new VideoFingerprintDistorter());
    public static VideoFingerprintDistorter Instance => _instance.Value;

    /// <summary>
    /// Xây dựng chuỗi bộ lọc video tối ưu hóa cho FFmpeg
    /// </summary>
    public string BuildVideoFilterChain(VideoDistortionOptions options, int width = 1920, int height = 1080)
    {
        var filters = new StringBuilder();

        // 1. Crop vi mô viền màn hình (Loại bỏ pixel tọa độ gốc)
        int cropW = (int)(width * (1.0 - (options.CropPercentage * 2.0 / 100.0)));
        int cropH = (int)(height * (1.0 - (options.CropPercentage * 2.0 / 100.0)));
        int cropX = (width - cropW) / 2;
        int cropY = (height - cropH) / 2;
        filters.Append($"crop={cropW}:{cropH}:{cropX}:{cropY}");

        // 2. Phóng to & Xoay vi mô (Ken Burns Breathing)
        filters.Append($",scale={width}:{height}");
        if (Math.Abs(options.RotationAngleDegrees) > 0.01)
        {
            double rad = options.RotationAngleDegrees * Math.PI / 180.0;
            filters.Append($",rotate={rad:F4}:fillcolor=black:ow={width}:oh={height}");
        }

        // 3. Chỉnh màu vi mô (Micro HSL & Contrast Boost)
        filters.Append($",eq=contrast={options.ContrastBoost:F2}:gamma_g={options.GammaShift:F2}:saturation=1.02");

        // 4. Chèn hạt điện ảnh (Film Grain Dither phá Macroblock Hash)
        if (options.EnableFilmGrain)
        {
            filters.Append(",noise=alls=3:allf=t");
        }

        // 5. Tần số khung hình biến thiên (Dynamic FPS)
        if (options.EnableDynamicFps)
        {
            filters.Append($",fps={options.TargetFps:F2}");
        }

        return filters.ToString();
    }
}
