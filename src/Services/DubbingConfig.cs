// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DubbingConfig.cs
// Target: C# .NET 9 WPF (Dubbing & Inpainting Pipeline Configuration)
// ==============================================================================

using System;
using System.Drawing;

namespace CreatorOS.Core.Services;

/// <summary>
/// Chế độ tẩy xóa phụ đề cứng và hình mờ (Watermark / Inpainting Engine)
/// </summary>
public enum InpaintingMode
{
    /// <summary>
    /// AI LaMa / ProPainter DirectML phục hồi nền tự nhiên, khử flickering 60 FPS
    /// </summary>
    AiDeepClean = 0,

    /// <summary>
    /// Bộ lọc cổ điển FFmpeg delogo siêu tốc > 150 FPS, tối ưu máy không có GPU rời hoặc tải cao
    /// </summary>
    FastDelogo = 1
}

/// <summary>
/// Cấu hình tùy chọn cho tác vụ lồng tiếng và tiền xử lý video (Pre-Cleaning Stage)
/// </summary>
public sealed class DubbingTaskConfig
{
    /// <summary>
    /// Bật/tắt tự động tẩy sạch phụ đề gốc hoặc watermark trước khi lồng tiếng
    /// </summary>
    public bool AutoEraseOriginalSubs { get; set; } = false;

    /// <summary>
    /// Thuật toán xóa phụ đề (LaMa DirectML vs FFmpeg Delogo Fallback)
    /// </summary>
    public InpaintingMode Mode { get; set; } = InpaintingMode.AiDeepClean;

    /// <summary>
    /// Vùng chữ nhật quét phụ đề mặc định (mặc định 25% - 30% đáy màn hình)
    /// </summary>
    public Rectangle SubtitleRegionRoi { get; set; } = new Rectangle(0, 720, 1920, 360);

    /// <summary>
    /// Độ nở viền mặt nạ Morphological Dilation (px) để phủ trọn bóng viền đen của chữ
    /// </summary>
    public int MaskDilationPx { get; set; } = 4;

    /// <summary>
    /// Bật hòa trộn thời gian Temporal Coherence (Alpha = 0.82)
    /// </summary>
    public bool EnableTemporalSmoothing { get; set; } = true;

    /// <summary>
    /// Ngôn ngữ đích cần lồng tiếng (mặc định vi-VN)
    /// </summary>
    public string TargetLanguage { get; set; } = "vi-VN";

    /// <summary>
    /// Tự động sinh và ghép phụ đề tiếng Việt sau khi làm sạch
    /// </summary>
    public bool BurnVietnameseSubtitles { get; set; } = true;

    /// <summary>
    /// Đường dẫn file phụ đề ASS tiếng Việt mới (nếu có)
    /// </summary>
    public string? AssSubtitlePath { get; set; }
}
