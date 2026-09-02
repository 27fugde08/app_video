using System;

namespace CreatorOS.Services.Database.Entities
{
    /// <summary>
    /// Trạng thái của tác vụ xử lý video
    /// </summary>
    public enum VideoProjectStatus
    {
        Draft = 0,
        Queued = 1,
        Processing = 2,
        Completed = 3,
        Failed = 4,
        Cancelled = 5
    }

    /// <summary>
    /// Thực thể đại diện cho một dự án/tác vụ xử lý video trong CreatorOS
    /// </summary>
    public class VideoProjectEntity
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Title { get; set; } = string.Empty;
        public string SourceUrl { get; set; } = string.Empty;
        public string SourcePlatform { get; set; } = "unknown"; // tiktok, douyin, youtube, facebook
        public string RawFilePath { get; set; } = string.Empty;
        public string RenderedFilePath { get; set; } = string.Empty;
        public VideoProjectStatus Status { get; set; } = VideoProjectStatus.Draft;
        public double ProgressPercent { get; set; } = 0.0;
        public long FileSizeBytes { get; set; } = 0;
        public double DurationSeconds { get; set; } = 0.0;
        public string ErrorMessage { get; set; } = string.Empty;
        public string SettingsJson { get; set; } = "{}";
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
