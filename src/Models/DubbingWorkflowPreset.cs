// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DubbingWorkflowPreset.cs
// Target: C# .NET 9 WPF (Workflow Preset Model for Standard Dubbing, Cinema Recap, Comic Manga)
// ==============================================================================

using System;

namespace CreatorOS.Desktop.Wpf.Models;

public enum DubbingPresetType
{
    StandardDubbing,
    CinemaRecap,
    ComicManga
}

/// <summary>
/// Preset kịch bản và cấu hình xử lý tự động trong module Dịch & Lồng Tiếng AI
/// </summary>
public sealed class DubbingWorkflowPreset
{
    public DubbingPresetType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DisplayTitle { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = "🎙️";
    public string Badge { get; set; } = "Standard";
    public string BadgeColor { get; set; } = "#3B82F6";
    public string BadgeBgColor { get; set; } = "#1E3A8A";
    public string WorkflowStepsDescription { get; set; } = string.Empty;
    public string GeminiSystemPrompt { get; set; } = string.Empty;
    public double DefaultDuckingThresholdDb { get; set; } = -14.0;
    public double DefaultSidechainAttackMs { get; set; } = 20.0;
    public double DefaultSidechainReleaseMs { get; set; } = 280.0;
    public double DefaultMusicVoiceBalance { get; set; } = 0.35;
    public double DefaultVoiceVolume { get; set; } = 1.0;
    public double DefaultBgmVolume { get; set; } = 0.60;
    public double DefaultSfxVolume { get; set; } = 0.80;
    public bool AutoOcrSpeechBubbles { get; set; }
    public bool Auto5ActStructuring { get; set; }

    public static DubbingWorkflowPreset CreateStandardPreset() => new()
    {
        Type = DubbingPresetType.StandardDubbing,
        Name = "StandardMultiSpeaker",
        DisplayTitle = "Lồng Tiếng Đối Thoại Chuẩn (Standard Multi-Speaker)",
        Subtitle = "Trích xuất phụ đề gốc ➔ Gemini dịch giữ nhịp âm tiết ➔ Căn nhịp WSOLA ➔ Dynamic Ducking",
        Description = "Thích hợp cho video vlog, phỏng vấn, bài giảng, podcast đa nhân vật cần giữ chuẩn độ trễ và nhịp nói tự nhiên.",
        Icon = "🎙️",
        Badge = "ĐỐI THOẠI CHUẨN",
        BadgeColor = "#38BDF8",
        BadgeBgColor = "#0C4A6E",
        WorkflowStepsDescription = "1. Trích xuất phụ đề Whisper ➔ 2. Gemini dịch khóa âm tiết ➔ 3. Căn nhịp WSOLA ➔ 4. Dynamic Ducking Mixer",
        GeminiSystemPrompt = "You are a professional audiovisual translator and dubbing director. Translate source subtitles into natural Vietnamese while strictly locking syllable counts to match original speech duration. Maintain colloquial nuance, humor, and precise speaker diarization.",
        DefaultDuckingThresholdDb = -14.0,
        DefaultSidechainAttackMs = 20.0,
        DefaultSidechainReleaseMs = 280.0,
        DefaultMusicVoiceBalance = 0.35,
        DefaultVoiceVolume = 1.0,
        DefaultBgmVolume = 0.55,
        DefaultSfxVolume = 0.70,
        AutoOcrSpeechBubbles = false,
        Auto5ActStructuring = false
    };

    public static DubbingWorkflowPreset CreateCinemaRecapPreset() => new()
    {
        Type = DubbingPresetType.CinemaRecap,
        Name = "CinemaRecapNarration",
        DisplayTitle = "Tóm Tắt & Review Điện Ảnh (Cinema Recap & Narration)",
        Subtitle = "Gemini phân tích cấu trúc 5 Hồi ➔ Sinh lời bình review hấp dẫn ➔ Cắt ghép phân cảnh cao trào",
        Description = "Chuyên dụng cho video tóm tắt phim, review điện ảnh và tài liệu: tự động tạo kịch bản 5 hồi kịch tính kèm thuyết minh điện ảnh.",
        Icon = "🎬",
        Badge = "REVIEW ĐIỆN ẢNH",
        BadgeColor = "#EC4899",
        BadgeBgColor = "#831843",
        WorkflowStepsDescription = "1. Phân tích 5 Hồi kịch tính ➔ 2. Sinh lời bình review (Giọng Cinema) ➔ 3. Ghép phân cảnh cao trào ➔ 4. Deep Ducking BGM",
        GeminiSystemPrompt = "You are an expert film critic and cinematic recap narrator. Analyze the 5-act dramatic structure (Exposition, Rising Action, Climax, Falling Action, Resolution), generate engaging third-person narrative commentary with hook-driven pacing, and time-align key plot climaxes with emotional resonance.",
        DefaultDuckingThresholdDb = -18.0,
        DefaultSidechainAttackMs = 15.0,
        DefaultSidechainReleaseMs = 350.0,
        DefaultMusicVoiceBalance = 0.25,
        DefaultVoiceVolume = 1.0,
        DefaultBgmVolume = 0.65,
        DefaultSfxVolume = 0.85,
        AutoOcrSpeechBubbles = false,
        Auto5ActStructuring = true
    };

    public static DubbingWorkflowPreset CreateComicMangaPreset() => new()
    {
        Type = DubbingPresetType.ComicManga,
        Name = "ComicMangaDubbing",
        DisplayTitle = "Lồng Tiếng & Chuyển Động Truyện Tranh (Comic / Manga)",
        Subtitle = "Tự động OCR bóng thoại ➔ Inpainting xóa chữ gốc ➔ Phân vai kịch bản Nam/Nữ/Người dẫn chuyện",
        Description = "Dành riêng cho truyện tranh, webtoon, manga: bóc tách khung thoại bằng OCR, xóa text bóng thoại và phân vai kịch bản sinh động.",
        Icon = "🎨",
        Badge = "TRUYỆN TRANH MANGA",
        BadgeColor = "#A855F7",
        BadgeBgColor = "#581C87",
        WorkflowStepsDescription = "1. OCR bóng thoại đa ngôn ngữ ➔ 2. Inpainting xóa bóng thoại gốc ➔ 3. Phân chia kịch bản Nam/Nữ/Dẫn chuyện ➔ 4. Phối âm SFX",
        GeminiSystemPrompt = "You are a manga and comic audio drama director. Process OCR dialog bubbles, assign distinct voice personas (Protagonist, Antagonist, Supporting Characters, Narrator), and write dynamic character dialogue lines with sound effect (SFX) cues for motion manga animation.",
        DefaultDuckingThresholdDb = -10.0,
        DefaultSidechainAttackMs = 30.0,
        DefaultSidechainReleaseMs = 200.0,
        DefaultMusicVoiceBalance = 0.40,
        DefaultVoiceVolume = 1.0,
        DefaultBgmVolume = 0.50,
        DefaultSfxVolume = 0.90,
        AutoOcrSpeechBubbles = true,
        Auto5ActStructuring = false
    };
}
