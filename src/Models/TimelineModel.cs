// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: TimelineModel.cs
// Target: C# .NET 9 (Non-Destructive Multi-Track Data Model & Undo/Redo Engine)
// ==============================================================================

using System;
using System.Collections.Generic;

namespace CreatorOS.Core.Models;

/// <summary>
/// Loại rãnh timeline
/// </summary>
public enum TrackType
{
    MainVideo = 0,
    Voice = 1,
    Music = 2,
    Subtitle = 3
}

/// <summary>
/// Một phân đoạn clip phi phá hủy trên timeline
/// </summary>
public sealed class TimelineClip
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string SourceFilePath { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    
    // Tọa độ cắt phi phá hủy trên file gốc (Giây)
    public double SourceInSeconds { get; set; } = 0.0;
    public double SourceOutSeconds { get; set; } = 10.0;

    // Vị trí đặt trên Timeline (Giây)
    public double TimelineStartSeconds { get; set; } = 0.0;
    
    // Tốc độ phát lại (0.5x - 2.0x)
    public double SpeedRate { get; set; } = 1.0;

    // Thời lượng thực tế trên timeline
    public double TimelineDurationSeconds => (SourceOutSeconds - SourceInSeconds) / (SpeedRate > 0 ? SpeedRate : 1.0);
    public double TimelineEndSeconds => TimelineStartSeconds + TimelineDurationSeconds;

    // Âm lượng và hiệu ứng
    public double Volume { get; set; } = 1.0; // 0.0 đến 2.0
    public double FadeInSeconds { get; set; } = 0.0;
    public double FadeOutSeconds { get; set; } = 0.0;

    // Phụ đề (chỉ dùng cho TrackType.Subtitle)
    public string SubtitleText { get; set; } = string.Empty;

    public TimelineClip Clone()
    {
        return new TimelineClip
        {
            Id = Guid.NewGuid().ToString("N"),
            SourceFilePath = SourceFilePath,
            Name = Name,
            SourceInSeconds = SourceInSeconds,
            SourceOutSeconds = SourceOutSeconds,
            TimelineStartSeconds = TimelineStartSeconds,
            SpeedRate = SpeedRate,
            Volume = Volume,
            FadeInSeconds = FadeInSeconds,
            FadeOutSeconds = FadeOutSeconds,
            SubtitleText = SubtitleText
        };
    }
}

/// <summary>
/// Một rãnh (Track) độc lập chứa danh sách các clip tuần tự
/// </summary>
public sealed class TimelineTrack
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = "Track";
    public TrackType Type { get; set; } = TrackType.MainVideo;
    public bool IsMuted { get; set; } = false;
    public bool IsLocked { get; set; } = false;
    public List<TimelineClip> Clips { get; set; } = new();

    public double GetTotalDurationSeconds()
    {
        double maxEnd = 0.0;
        foreach (var clip in Clips)
        {
            if (clip.TimelineEndSeconds > maxEnd)
                maxEnd = clip.TimelineEndSeconds;
        }
        return maxEnd;
    }
}

/// <summary>
/// Toàn bộ cấu trúc dự án dựng phim trên Timeline
/// </summary>
public sealed class TimelineProject
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string ProjectName { get; set; } = "Untitled Studio Project";
    public int CanvasWidth { get; set; } = 1080;
    public int CanvasHeight { get; set; } = 1920; // Default vertical 9:16 Shorts/TikTok
    public double FrameRate { get; set; } = 30.0;

    public TimelineTrack MainVideoTrack { get; set; } = new() { Name = "Main Video", Type = TrackType.MainVideo };
    public TimelineTrack VoiceTrack { get; set; } = new() { Name = "AI Voice", Type = TrackType.Voice };
    public TimelineTrack MusicTrack { get; set; } = new() { Name = "BGM Music", Type = TrackType.Music };
    public TimelineTrack SubtitleTrack { get; set; } = new() { Name = "Subtitles", Type = TrackType.Subtitle };

    public IEnumerable<TimelineTrack> AllTracks
    {
        get
        {
            yield return MainVideoTrack;
            yield return VoiceTrack;
            yield return MusicTrack;
            yield return SubtitleTrack;
        }
    }

    public double GetTotalDurationSeconds()
    {
        double maxDur = 0.0;
        foreach (var track in AllTracks)
        {
            double d = track.GetTotalDurationSeconds();
            if (d > maxDur) maxDur = d;
        }
        return Math.Max(maxDur, 1.0);
    }
}
