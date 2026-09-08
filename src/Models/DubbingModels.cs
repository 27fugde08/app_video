// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DubbingModels.cs
// Target: C# .NET 9 WPF (CommunityToolkit.Mvvm Observable Models)
// ==============================================================================

using System;
using System.Drawing;
using System.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// Đại diện cho 1 thư mục video đã quét từ trình tải Downloader hoặc ổ cứng
/// </summary>
public sealed partial class FolderEntryItem : ObservableObject
{
    [ObservableProperty]
    private Guid _folderId = Guid.NewGuid();

    [ObservableProperty]
    private int _index;

    [ObservableProperty]
    private string _folderName = string.Empty;

    [ObservableProperty]
    private string _folderPath = string.Empty;

    [ObservableProperty]
    private int _videoCount;

    [ObservableProperty]
    private bool _isCompleted;

    [ObservableProperty]
    private bool _isSelected;

    [ObservableProperty]
    private string _channelPlatform = "TikTok"; // TikTok, Douyin, YouTube, Facebook
}

/// <summary>
/// Đại diện cho 1 video trong hàng đợi lồng tiếng và tiền xử lý
/// </summary>
public sealed partial class DubbingJobItem : ObservableObject
{
    [ObservableProperty]
    private Guid _jobId = Guid.NewGuid();

    [ObservableProperty]
    private int _index;

    [ObservableProperty]
    private string _title = string.Empty;

    [ObservableProperty]
    private string _filePath = string.Empty;

    [ObservableProperty]
    private string _duration = "02:30";

    [ObservableProperty]
    private double _progress = 0.0;

    [ObservableProperty]
    private PipelineStage _stage = PipelineStage.QueuedDownload;

    [ObservableProperty]
    private string _badgeText = "Sẵn Sàng";

    [ObservableProperty]
    private string _badgeColor = "#64748B";

    [ObservableProperty]
    private string _badgeBgColor = "#1E293B";

    [ObservableProperty]
    private bool _isCompleted;

    [ObservableProperty]
    private bool _isPaused;

    [ObservableProperty]
    private bool _isProcessing;

    [ObservableProperty]
    private bool _canOpenFile;

    [ObservableProperty]
    private bool _isSelected;

    [ObservableProperty]
    private string? _errorMessage;

    public CancellationTokenSource? Cts { get; set; }

    public void UpdateStatus(
        PipelineStage stage, 
        double progress, 
        string badgeText, 
        string badgeColor, 
        string badgeBgColor, 
        bool isCompleted = false)
    {
        Stage = stage;
        Progress = progress;
        BadgeText = badgeText;
        BadgeColor = badgeColor;
        BadgeBgColor = badgeBgColor;
        IsCompleted = isCompleted;
        CanOpenFile = isCompleted;
        IsProcessing = !isCompleted && stage != PipelineStage.Failed;
    }
}

/// <summary>
/// Đại diện cho 1 câu thoại trong bảng kịch bản với bộ đếm âm tiết thời gian thực
/// </summary>
public sealed partial class DirectedSubtitleItem : ObservableObject
{
    [ObservableProperty]
    private int _id;

    [ObservableProperty]
    private string _speakerId = "Speaker_1";

    [ObservableProperty]
    private string _speakerDisplayName = "Speaker 1 (Nam Trầm)";

    [ObservableProperty]
    private string _speakerColor = "#3B82F6";

    [ObservableProperty]
    private string _speakerBgColor = "#1E3A8A";

    [ObservableProperty]
    private string _voiceRole = "vi-VN-NamMinh-Neural";

    [ObservableProperty]
    private string _emotion = "neutral";

    [ObservableProperty]
    private double _speedMultiplier = 1.0;

    [ObservableProperty]
    private double _startSec;

    [ObservableProperty]
    private double _endSec;

    [ObservableProperty]
    private string _originalText = string.Empty;

    [ObservableProperty]
    private string _vietnameseText = string.Empty;

    [ObservableProperty]
    private int _targetWords = 10;

    [ObservableProperty]
    private int _actualWords = 10;

    [ObservableProperty]
    private SyllableBadgeState _badgeState = SyllableBadgeState.Perfect;

    [ObservableProperty]
    private string _badgeColor = "#10B981"; // Xanh lục (#10B981), Vàng (#F59E0B), Đỏ (#EF4444)

    [ObservableProperty]
    private string _badgeText = "10 / 10 từ";

    [ObservableProperty]
    private string _badgeStatusDescription = "Khớp chuẩn";

    [ObservableProperty]
    private bool _isReFitting;

    [ObservableProperty]
    private bool _isSelected;

    public double DurationSec => Math.Max(0.1, EndSec - StartSec);

    public string TimeRangeFormatted =>
        $"{FormatTime(StartSec)} -> {FormatTime(EndSec)} (ΔT = {DurationSec:F1}s)";

    public DirectedSubtitleItem(
        int id,
        double startSec,
        double endSec,
        string originalText,
        string vietnameseText,
        int targetWords = 10,
        string speakerId = "Speaker_1",
        string speakerDisplayName = "Speaker 1 (Nam Trầm)",
        string speakerColor = "#3B82F6",
        string speakerBgColor = "#1E3A8A")
    {
        _id = id;
        _startSec = startSec;
        _endSec = endSec;
        _originalText = originalText;
        _vietnameseText = vietnameseText;
        _targetWords = targetWords;
        _speakerId = speakerId;
        _speakerDisplayName = speakerDisplayName;
        _speakerColor = speakerColor;
        _speakerBgColor = speakerBgColor;

        RecalculateSyllables(vietnameseText);
    }

    partial void OnVietnameseTextChanged(string value)
    {
        RecalculateSyllables(value);
    }

    /// <summary>
    /// Thuật toán đếm số từ / âm tiết qua VietnameseSyllableCounter (Zero-Allocation Span)
    /// </summary>
    public void RecalculateSyllables(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            ActualWords = 0;
            BadgeState = SyllableBadgeState.Perfect;
            BadgeColor = "#10B981";
            BadgeText = $"0 / {TargetWords} từ";
            BadgeStatusDescription = "Trống";
            return;
        }

        // Đếm âm tiết qua bộ đếm tiếng Việt chuẩn hóa NFC
        int count = VietnameseSyllableCounter.CountSyllables(text);
        ActualWords = count;
        BadgeText = $"{ActualWords} / {TargetWords} từ";

        // Logic phân cấp màu theo tiêu chí kiểm chứng:
        // - Xanh lá: Khớp chuẩn [N_target - 1, N_target + 1]
        // - Vàng: Lệch 2 âm tiết (Tự động bù nhịp qua WSOLA)
        // - Đỏ: Lệch >= 3 âm tiết (Hiện icon cảnh báo vấp nhịp kèm nút gợi ý Gemini Re-Fit)
        int diff = Math.Abs(ActualWords - TargetWords);
        if (diff <= 1)
        {
            BadgeState = SyllableBadgeState.Perfect;
            BadgeColor = "#10B981"; // Xanh lá
            BadgeStatusDescription = "Khớp chuẩn (±1)";
        }
        else if (diff == 2)
        {
            BadgeState = SyllableBadgeState.Warning;
            BadgeColor = "#F59E0B"; // Vàng
            BadgeStatusDescription = "Lệch 2 từ (WSOLA bù nhịp)";
        }
        else
        {
            BadgeState = SyllableBadgeState.Danger;
            BadgeColor = "#EF4444"; // Đỏ
            BadgeStatusDescription = "Lệch ≥3 từ (Nguy cơ vấp nhịp)";
        }
    }

    private static string FormatTime(double seconds)
    {
        var ts = TimeSpan.FromSeconds(seconds);
        return $"{ts.Hours:D2}:{ts.Minutes:D2}:{ts.Seconds:D2}.{ts.Milliseconds:D3}";
    }
}
