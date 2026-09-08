// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DubbingScriptEditorViewModel.cs
// Target: C# .NET 9 (CommunityToolkit.Mvvm, Virtualizing Script Grid, Syllable Meter, Gemini 1-Click Re-Fit)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Media;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Contracts;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

public enum SyllableMeterStatus
{
    Perfect, // Xanh lục: 10/10 hoặc 9/10 (Khớp hoàn hảo)
    Warning, // Vàng cam: 12/10 (Hơi dài, TTS tăng tốc nhẹ)
    Danger,  // Đỏ: 15/10 (Quá dài, nguy cơ vấp nhịp)
    Short    // Xanh dương: 6/10 (Hơi ngắn, sẽ đệm silence)
}

/// <summary>
/// Đại diện cho một câu thoại trong lưới biên tập lồng tiếng (Virtualizing Script Grid item)
/// </summary>
public sealed partial class DubbingScriptItemViewModel : ObservableObject
{
    private static readonly string[] DefaultVoiceOptions =
    {
        "vi-VN-HoaiMyNeural",
        "vi-VN-NamMinhNeural",
        "vi-VN-ThanhMinhNeural",
        "Kokoro-VN-HoaiMy",
        "Kokoro-VN-NamMinh"
    };

    [ObservableProperty]
    private int _id;

    [ObservableProperty]
    private double _startSec;

    [ObservableProperty]
    private double _endSec;

    [ObservableProperty]
    private string _speakerId = "Speaker 1";

    [ObservableProperty]
    private string _selectedVoice = "vi-VN-HoaiMyNeural";

    [ObservableProperty]
    private string _originalText = string.Empty;

    [ObservableProperty]
    private string _vietnameseText = string.Empty;

    [ObservableProperty]
    private string _emotion = "calm";

    [ObservableProperty]
    private int _targetSyllables;

    [ObservableProperty]
    private int _actualSyllables;

    [ObservableProperty]
    private SyllableMeterStatus _meterStatus = SyllableMeterStatus.Perfect;

    [ObservableProperty]
    private string _syllableBadgeColor = "#10B981";

    [ObservableProperty]
    private string _syllableStatusText = "Khớp hoàn hảo";

    [ObservableProperty]
    private string _syllableRatioText = "10/10";

    [ObservableProperty]
    private double _speedMultiplier = 1.0;

    [ObservableProperty]
    private string _emotionBadgeColor = "#334155";

    [ObservableProperty]
    private bool _isOptimizing;

    [ObservableProperty]
    private bool _isPlayingPreview;

    public double DurationSec => Math.Max(0.05, EndSec - StartSec);

    public string TimeRangeFormatted =>
        $"{TimeSpan.FromSeconds(StartSec):mm\\:ss\\.fff} - {TimeSpan.FromSeconds(EndSec):mm\\:ss\\.fff} (ΔT {DurationSec:F1}s)";

    public IReadOnlyList<string> AvailableVoices => DefaultVoiceOptions;

    public DubbingScriptItemViewModel()
    {
    }

    public DubbingScriptItemViewModel(int id, double startSec, double endSec, string speakerId, string originalText, string vietnameseText, string emotion = "calm")
    {
        _id = id;
        _startSec = startSec;
        _endSec = endSec;
        _speakerId = speakerId;
        _originalText = originalText;
        _vietnameseText = vietnameseText;
        _emotion = emotion;
        
        UpdateSyllableMetrics(vietnameseText);
        UpdateEmotionBadgeColor(emotion);
    }

    partial void OnVietnameseTextChanged(string value)
    {
        UpdateSyllableMetrics(value);
    }

    partial void OnEmotionChanged(string value)
    {
        UpdateEmotionBadgeColor(value);
    }

    /// <summary>
    /// Tính toán thước đo âm tiết thời gian thực với độ trễ 0ms (Zero-Lag Typing)
    /// </summary>
    public void UpdateSyllableMetrics(string text)
    {
        TargetSyllables = VietnameseSyllableCounter.CalculateTargetSyllables(DurationSec);
        ActualSyllables = VietnameseSyllableCounter.CountSyllables(text);
        SyllableRatioText = $"{ActualSyllables}/{TargetSyllables}";
        SpeedMultiplier = VietnameseSyllableCounter.CalculateSpeedMultiplier(ActualSyllables, DurationSec);

        int diff = ActualSyllables - TargetSyllables;

        // Tiêu chuẩn thước đo trực quan:
        // - 10/10 hoặc 9/10: Màu xanh lục (Khớp hoàn hảo)
        // - 12/10: Màu vàng cam (Hơi dài, TTS sẽ tăng tốc nhẹ)
        // - 15/10: Màu đỏ cảnh báo (Quá dài, có nguy cơ vấp nhịp)
        // - < 9/10: Màu xanh dương (Hơi ngắn, sẽ đệm silence)
        if (Math.Abs(diff) <= 1)
        {
            MeterStatus = SyllableMeterStatus.Perfect;
            SyllableBadgeColor = "#10B981"; // Xanh lục chuẩn
            SyllableStatusText = "Khớp chuẩn";
        }
        else if (diff > 1 && diff <= 3)
        {
            MeterStatus = SyllableMeterStatus.Warning;
            SyllableBadgeColor = "#F59E0B"; // Vàng cam
            SyllableStatusText = "Hơi dài";
        }
        else if (diff > 3)
        {
            MeterStatus = SyllableMeterStatus.Danger;
            SyllableBadgeColor = "#EF4444"; // Đỏ cảnh báo
            SyllableStatusText = "Quá dài";
        }
        else
        {
            MeterStatus = SyllableMeterStatus.Short;
            SyllableBadgeColor = "#0284C7"; // Xanh dương
            SyllableStatusText = "Hơi ngắn";
        }
    }

    private void UpdateEmotionBadgeColor(string emotion)
    {
        EmotionBadgeColor = emotion.ToLowerInvariant() switch
        {
            "angry" or "giận dữ" => "#DC2626",
            "excited" or "hào hứng" or "vui vẻ" => "#D97706",
            "sad" or "buồn" => "#4F46E5",
            "whisper" or "thì thầm" => "#7C3AED",
            _ => "#334155"
        };
    }
}

/// <summary>
/// DubbingScriptEditorViewModel: Quản lý toàn bộ trải nghiệm Studio Biên tập kịch bản:
/// 1. Virtualizing Script Grid 60 FPS (Recycling mode).
/// 2. Thước đo âm tiết cập nhật tức thì khi gõ text.
/// 3. Tính năng Gemini Re-Fit 1 Câu Tức Thì (1-Click Re-Fit < 350ms).
/// 4. Đồng bộ D3DVideoCanvas (nhấp đúp tua frame, phím Space phát/dừng, phím Tab nghe thử TTS).
/// </summary>
public sealed partial class DubbingScriptEditorViewModel : ObservableObject, IDisposable
{
    private readonly GeminiDirectorClient _directorClient;
    private readonly AcousticStudioEngine _acousticEngine;
    private readonly CancellationTokenSource _cts = new();
    private bool _disposed;

    [ObservableProperty]
    private ObservableCollection<DubbingScriptItemViewModel> _scriptLines = new();

    [ObservableProperty]
    private DubbingScriptItemViewModel? _selectedItem;

    [ObservableProperty]
    private string _videoSourcePath = string.Empty;

    [ObservableProperty]
    private double _currentPlaybackTimestamp;

    [ObservableProperty]
    private bool _isVideoPlaying;

    [ObservableProperty]
    private bool _isLoopingSegment = true;

    [ObservableProperty]
    private string _geminiApiKey = string.Empty;

    [ObservableProperty]
    private string _searchFilter = string.Empty;

    [ObservableProperty]
    private string _statusMessage = "Sẵn sàng biên tập kịch bản phòng thu.";

    [ObservableProperty]
    private int _perfectCount;

    [ObservableProperty]
    private int _warningCount;

    [ObservableProperty]
    private int _dangerCount;

    [ObservableProperty]
    private int _totalLines;

    public DubbingScriptEditorViewModel(
        GeminiDirectorClient? directorClient = null,
        AcousticStudioEngine? acousticEngine = null)
    {
        _directorClient = directorClient ?? new GeminiDirectorClient();
        _acousticEngine = acousticEngine ?? new AcousticStudioEngine();

        // Nạp API key từ môi trường nếu có
        GeminiApiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? string.Empty;

        // Khởi tạo kịch bản mẫu chuẩn nghiệp vụ
        LoadInitialSampleScript();
    }

    /// <summary>
    /// Tối ưu 1 câu duy nhất bằng Gemini Re-Fit (1-Click Re-Fit dưới 350ms)
    /// </summary>
    [RelayCommand]
    public async Task ReFitLineAsync(DubbingScriptItemViewModel? item)
    {
        if (item == null || item.IsOptimizing) return;

        item.IsOptimizing = true;
        StatusMessage = $"⚡ Đang tối ưu câu #{item.Id} bằng Gemini Re-Fit...";

        var sw = Stopwatch.StartNew();
        try
        {
            var line = new SubtitleLine(
                Id: item.Id,
                StartSec: item.StartSec,
                EndSec: item.EndSec,
                SpeakerId: item.SpeakerId,
                OriginalText: item.OriginalText
            );

            // Gửi micro request tới Gemini Director
            var directed = await _directorClient.ReFitSingleLineAsync(
                line: line,
                currentVietnameseText: item.VietnameseText,
                targetSyllables: item.TargetSyllables,
                apiKey: GeminiApiKey,
                emotion: item.Emotion,
                ct: _cts.Token
            ).ConfigureAwait(true);

            sw.Stop();

            // Cập nhật câu thoại mới và đổi màu thước đo sang xanh lục tức thì
            item.VietnameseText = directed.VietnameseText;
            item.Emotion = directed.Emotion;
            item.SpeedMultiplier = directed.SpeedMultiplier;
            item.UpdateSyllableMetrics(directed.VietnameseText);

            RefreshStatistics();
            StatusMessage = $"✅ Câu #{item.Id} đã tối ưu khớp chuẩn {item.ActualSyllables}/{item.TargetSyllables} từ ({sw.ElapsedMilliseconds}ms)";
        }
        catch (Exception ex)
        {
            sw.Stop();
            StatusMessage = $"⚠️ Lỗi Re-Fit câu #{item.Id}: {ex.Message}";
        }
        finally
        {
            item.IsOptimizing = false;
        }
    }

    /// <summary>
    /// Nghe thử file TTS của câu thoại được chọn (In-Memory PCM Audio)
    /// </summary>
    [RelayCommand]
    public async Task PreviewTtsAsync(DubbingScriptItemViewModel? item)
    {
        if (item == null || item.IsPlayingPreview) return;
        if (string.IsNullOrWhiteSpace(item.VietnameseText)) return;

        item.IsPlayingPreview = true;
        StatusMessage = $"🔊 Đang tổng hợp giọng nghe thử câu #{item.Id}...";

        try
        {
            // Sinh luồng âm thanh In-Memory (Zero disk garbage)
            using var audioStream = await _acousticEngine.SynthesizeAndTrimAsync(
                text: item.VietnameseText,
                voiceModel: item.SelectedVoice,
                speedRate: item.SpeedMultiplier,
                ct: _cts.Token
            ).ConfigureAwait(false);

            if (audioStream != null && audioStream.Length > 44)
            {
                audioStream.Seek(0, SeekOrigin.Begin);
                using var player = new SoundPlayer(audioStream);
                player.Play();
            }

            StatusMessage = $"▶ Đang phát giọng đọc câu #{item.Id} ({item.SpeedMultiplier:F2}x, {item.Emotion})";
        }
        catch (Exception ex)
        {
            StatusMessage = $"⚠️ Lỗi nghe thử TTS câu #{item.Id}: {ex.Message}";
        }
        finally
        {
            await Task.Delay(400);
            item.IsPlayingPreview = false;
        }
    }

    /// <summary>
    /// Nhấp đúp: Trình phát D3DVideoCanvas tự động nhảy đến đúng StartSec và phát lặp lại phân đoạn đó.
    /// </summary>
    [RelayCommand]
    public void SeekAndLoopSegment(DubbingScriptItemViewModel? item)
    {
        if (item == null) return;

        SelectedItem = item;
        CurrentPlaybackTimestamp = item.StartSec;
        IsVideoPlaying = true;
        StatusMessage = $"🎬 D3D11 Canvas: Nhảy đến mốc {item.TimeRangeFormatted}";
    }

    /// <summary>
    /// Phím tắt Space: Tạm dừng / Phát tiếp đoạn video
    /// </summary>
    [RelayCommand]
    public void ToggleVideoPlayPause()
    {
        IsVideoPlaying = !IsVideoPlaying;
        StatusMessage = IsVideoPlaying ? "▶ Đang phát video" : "⏸ Đã tạm dừng video";
    }

    /// <summary>
    /// Phím tắt Tab: Nghe thử câu thoại hiện đang chọn
    /// </summary>
    [RelayCommand]
    public async Task PreviewSelectedLineAsync()
    {
        if (SelectedItem != null)
        {
            await PreviewTtsAsync(SelectedItem);
        }
    }

    /// <summary>
    /// Tải 200 câu thoại kiểm thử cuộn mượt 60 FPS chuẩn tiêu chí kiểm chứng
    /// </summary>
    [RelayCommand]
    public void LoadBenchmark200Lines()
    {
        var list = new List<DubbingScriptItemViewModel>(200);
        double currentSec = 0.0;
        string[] speakers = { "Speaker 1", "Speaker 2", "Narrator" };
        string[] emotions = { "calm", "excited", "angry", "sad", "whisper" };

        string[] sampleEn =
        {
            "We have to move now before the security system resets.",
            "Are you sure this is the right access code?",
            "Look out behind you, incoming drone!",
            "I found the main server room downstairs.",
            "Hold your position until I give the signal.",
            "This will only take a couple of seconds.",
            "The extraction helicopter is arriving at the rooftop.",
            "Don't look back, just keep running forward!",
            "Did anyone notice the anomaly on radar?",
            "Everything is under control, stay calm."
        };

        string[] sampleVi =
        {
            "Chúng ta phải hành động ngay bây giờ.",
            "Cậu có chắc đây là mật khẩu chính xác không?",
            "Cẩn thận phía sau, máy bay không người lái đang tới!",
            "Tôi đã tìm thấy phòng máy chủ chính bên dưới.",
            "Giữ nguyên vị trí cho tới khi có tín hiệu của tôi.",
            "Việc này chỉ mất vài giây thôi.",
            "Trực thăng giải cứu đang tới trên sân thượng.",
            "Đừng nhìn lại, cứ chạy thẳng về phía trước đi!",
            "Có ai nhận thấy điểm bất thường trên radar không?",
            "Mọi chuyện vẫn trong tầm kiểm soát, hãy bình tĩnh."
        };

        for (int i = 1; i <= 200; i++)
        {
            int idx = (i - 1) % sampleEn.Length;
            double dur = 2.4 + (i % 4) * 0.5; // 2.4s đến 3.9s
            double endSec = currentSec + dur;

            var item = new DubbingScriptItemViewModel(
                id: i,
                startSec: currentSec,
                endSec: endSec,
                speakerId: speakers[i % speakers.Length],
                originalText: sampleEn[idx],
                vietnameseText: sampleVi[idx],
                emotion: emotions[i % emotions.Length]
            );

            list.Add(item);
            currentSec = endSec + 0.3; // 300ms pause giữa các câu
        }

        ScriptLines = new ObservableCollection<DubbingScriptItemViewModel>(list);
        SelectedItem = ScriptLines.FirstOrDefault();
        RefreshStatistics();
        StatusMessage = "⚡ Đã tải 200 câu thoại kiểm thử. Virtualization recycling 60 FPS sẵn sàng!";
    }

    private void LoadInitialSampleScript()
    {
        var sampleData = new List<DubbingScriptItemViewModel>
        {
            new(1, 0.5, 3.2, "Speaker 1", "We need to secure the perimeter immediately.", "Chúng ta phải bảo vệ khu vực này ngay lập tức.", "excited"),
            new(2, 3.5, 6.1, "Speaker 2", "Understood, setting up defensive barriers now.", "Rõ, đang thiết lập hàng rào phòng thủ đây.", "calm"),
            new(3, 6.5, 9.8, "Speaker 1", "Keep your eyes open, they could be anywhere in the mist.", "Hãy chú ý quan sát, đối phương có thể ẩn nấp bất cứ đâu trong sương mù.", "whisper"),
            new(4, 10.2, 12.8, "Narrator", "The storm approaches rapidly from the north.", "Cơn bão đang tiến nhanh từ phía bắc.", "calm"),
            new(5, 13.2, 16.5, "Speaker 2", "I am detecting heavy seismic readings underground!", "Tôi đang phát hiện chấn động địa chấn rất mạnh dưới lòng đất!", "angry"),
            new(6, 17.0, 19.5, "Speaker 1", "Fall back to the extraction zone!", "Tất cả rút lui về khu vực đón ngay lập tức!", "excited"),
            new(7, 20.0, 22.8, "Speaker 2", "I won't leave you behind, captain!", "Tôi sẽ không bỏ lại chỉ huy đâu!", "sad"),
            new(8, 23.2, 26.0, "Speaker 1", "That's an order, soldier. Go now!", "Đây là mệnh lệnh của cấp trên, đi ngay đi!", "angry")
        };

        ScriptLines = new ObservableCollection<DubbingScriptItemViewModel>(sampleData);
        SelectedItem = ScriptLines.FirstOrDefault();
        RefreshStatistics();
    }

    public void RefreshStatistics()
    {
        TotalLines = ScriptLines.Count;
        PerfectCount = ScriptLines.Count(x => x.MeterStatus == SyllableMeterStatus.Perfect);
        WarningCount = ScriptLines.Count(x => x.MeterStatus == SyllableMeterStatus.Warning);
        DangerCount = ScriptLines.Count(x => x.MeterStatus == SyllableMeterStatus.Danger);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _cts.Cancel();
        _cts.Dispose();
        _directorClient.Dispose();
        _acousticEngine.Dispose();

        GC.SuppressFinalize(this);
    }
}
