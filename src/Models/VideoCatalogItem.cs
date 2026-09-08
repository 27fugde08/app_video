// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: VideoFileEntry.cs
// Target: C# .NET 9 (Zero-Allocation Native Video Catalog Model)
// ==============================================================================

using System;

namespace CreatorOS.Core.Models;

/// <summary>
/// Trạng thái quy trình sản xuất của video trong CreatorOS
/// </summary>
public enum VideoEditStatus
{
    Unprocessed = 0,   // Chưa xử lý
    Dubbed = 1,        // Đã lồng tiếng AI
    Rendered = 2,      // Đã render hoàn tất
    Failed = 3         // Lỗi xử lý
}

/// <summary>
/// Định dạng hướng khung hình video
/// </summary>
public enum VideoAspectRatio
{
    Unknown = 0,
    Vertical9x16 = 1,  // Dọc (TikTok, Shorts, Reels)
    Horizontal16x9 = 2,// Ngang (YouTube, TV)
    Square1x1 = 3      // Vuông
}

/// <summary>
/// Đại diện cho một mục video được lưu trữ và lập chỉ mục trong cơ sở dữ liệu SQLite
/// </summary>
public sealed class VideoCatalogItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string FilePath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Tags { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public double DurationSeconds { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public string VideoCodec { get; set; } = "h264";
    public string AudioCodec { get; set; } = "aac";
    public int BitrateKbps { get; set; }
    public double FrameRate { get; set; } = 30.0;
    public VideoAspectRatio AspectRatio { get; set; } = VideoAspectRatio.Unknown;
    public VideoEditStatus EditStatus { get; set; } = VideoEditStatus.Unprocessed;
    public string? ThumbnailPath { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastModifiedAt { get; set; } = DateTime.UtcNow;

    // Helper properties for UI formatting
    public string FormattedSize => FileSizeBytes switch
    {
        >= 1024 * 1024 * 1024 => $"{(double)FileSizeBytes / (1024 * 1024 * 1024):F1} GB",
        >= 1024 * 1024 => $"{(double)FileSizeBytes / (1024 * 1024):F1} MB",
        _ => $"{(double)FileSizeBytes / 1024:F0} KB"
    };

    public string FormattedDuration
    {
        get
        {
            var ts = TimeSpan.FromSeconds(DurationSeconds);
            return ts.TotalHours >= 1
                ? $"{ts.Hours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2}"
                : $"{ts.Minutes:D2}:{ts.Seconds:D2}";
        }
    }

    public string ResolutionLabel => Width > 0 && Height > 0
        ? (Width >= 3840 || Height >= 3840 ? "4K UHD" : Width >= 1920 || Height >= 1920 ? "1080p FHD" : $"{Width}x{Height}")
        : "N/A";
}
