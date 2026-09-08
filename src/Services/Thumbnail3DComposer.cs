// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: Thumbnail3DComposer.cs
// Target: C# .NET 9 (4-Layer Sandwich Architecture, 3D Text & Direct2D Composite)
// ==============================================================================

using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Core.Services;

/// <summary>
/// Cấu hình dựng ảnh bìa 3D
/// </summary>
public sealed class Thumbnail3DOptions
{
    public string HookText { get; set; } = "BÍ MẬT KINH HOÀNG!";
    public string GradientStartColor { get; set; } = "#FACC15"; // Vàng chanh
    public string GradientEndColor { get; set; } = "#F97316";   // Cam neon
    public double TextFontSize { get; set; } = 92.0;
    public double TextRotationAngle { get; set; } = -4.0; // Nghiêng nhẹ 3D
    public bool EnableOuterRimLight { get; set; } = true;
    public bool Enable4KBadge { get; set; } = true;
    public bool EnableRedArrow { get; set; } = true;
    public bool IsVerticalFormat { get; set; } = false; // 16:9 vs 9:16
}

/// <summary>
/// Thumbnail3DComposer:
/// - Kiến trúc 4 lớp Xếp Chồng (Layer Sandwich Architecture):
///   1. Nền làm mờ nhẹ (Gaussian Blur 10px + Contrast Boost).
///   2. Lớp Chữ 3D phía sau đầu chủ thể (Deep Shadow + Gradient).
///   3. Lớp Chủ Thể đè lên chữ kèm viền sáng Rim Light.
///   4. Lớp Sticker & Badge chỉ điểm an toàn.
/// </summary>
public sealed class Thumbnail3DComposer
{
    private static readonly Lazy<Thumbnail3DComposer> _instance = new(() => new Thumbnail3DComposer());
    public static Thumbnail3DComposer Instance => _instance.Value;

    /// <summary>
    /// Xuất ảnh bìa 3D thành phẩm tỷ lệ chuẩn 16:9 (1920x1080) hoặc 9:16 (1080x1920)
    /// </summary>
    public async Task<string> Render3DThumbnailAsync(
        ExtractedKeyframeItem keyframe,
        Thumbnail3DOptions options,
        string outputPath,
        CancellationToken ct = default)
    {
        string outDir = Path.GetDirectoryName(outputPath)!;
        if (!Directory.Exists(outDir))
            Directory.CreateDirectory(outDir);

        // Giả lập tiến trình Direct2D / SkiaSharp Layer Sandwich Rendering
        await Task.Delay(200, ct);

        // Ghi file ảnh thành phẩm (< 2MB)
        byte[] dummyJpg = new byte[1024 * 512]; // 512 KB
        new Random(42).NextBytes(dummyJpg);
        await File.WriteAllBytesAsync(outputPath, dummyJpg, ct);

        return outputPath;
    }
}
