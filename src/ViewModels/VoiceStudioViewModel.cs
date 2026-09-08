// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: VoiceStudioViewModel.cs
// Target: C# .NET 9 WPF (CommunityToolkit.Mvvm, Script Studio & Waveform Player)
// ==============================================================================

using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// Đại diện cho 1 thẻ giọng trong Thư viện Giọng Đọc
/// </summary>
public sealed partial class VoiceCardItem : ObservableObject
{
    [ObservableProperty]
    private string _id = string.Empty;

    [ObservableProperty]
    private string _name = string.Empty;

    [ObservableProperty]
    private string _flag = "🇻🇳";

    [ObservableProperty]
    private string _gender = "Nữ";

    [ObservableProperty]
    private string _category = "Studio"; // Studio hoặc My Clones

    [ObservableProperty]
    private bool _isCloned;
}

/// <summary>
/// Đại diện cho 1 đoạn câu thoại trong Script Studio
/// </summary>
public sealed partial class ScriptSentenceItem : ObservableObject
{
    [ObservableProperty]
    private int _index;

    [ObservableProperty]
    private string _text = string.Empty;

    [ObservableProperty]
    private string _assignedVoiceId = "vi-VN-HoaiMyNeural";

    [ObservableProperty]
    private double _speed = 1.0;

    [ObservableProperty]
    private double _estimatedSeconds = 3.5;
}

/// <summary>
/// VoiceStudioViewModel: Quản lý sinh giọng đọc AI, nhân bản giọng và phát dạng sóng âm
/// </summary>
public sealed partial class VoiceStudioViewModel : ObservableObject, IDisposable
{
    private readonly VoiceSynthesisService _synthService;
    private readonly VoiceCloningService _cloningService;

    private readonly DispatcherTimer _playheadTimer;
    private bool _isPlaying;
    private double _currentPlayheadProgress;
    private bool _isGenerating;
    private double _generationProgress;
    private string _statusMessage = "Sẵn sàng sinh giọng đọc";
    private bool _disposed;

    [ObservableProperty]
    private string _scriptFullText = "Chào mừng bạn đến với CreatorOS Desktop. Hệ thống sản xuất video tự động bằng công nghệ AI cục bộ tốc độ cao!";

    [ObservableProperty]
    private VoiceCardItem? _selectedVoice;

    [ObservableProperty]
    private string _cloneSampleAudioPath = "C:\\AudioSamples\\MyVoice_10s.wav";

    [ObservableProperty]
    private string _newCloneName = "Giọng Clone Của Tôi";

    [ObservableProperty]
    private int _selectedTabIndex = 0; // 0: Studio, 1: My Clones

    public ObservableCollection<VoiceCardItem> VoiceCards { get; } = new();
    public ObservableCollection<ScriptSentenceItem> ScriptSentences { get; } = new();

    public bool IsPlaying
    {
        get => _isPlaying;
        private set => SetProperty(ref _isPlaying, value);
    }

    public double CurrentPlayheadProgress
    {
        get => _currentPlayheadProgress;
        set => SetProperty(ref _currentPlayheadProgress, value);
    }

    public bool IsGenerating
    {
        get => _isGenerating;
        private set => SetProperty(ref _isGenerating, value);
    }

    public double GenerationProgress
    {
        get => _generationProgress;
        private set => SetProperty(ref _generationProgress, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public VoiceStudioViewModel(
        VoiceSynthesisService? synthService = null,
        VoiceCloningService? cloningService = null)
    {
        _synthService = synthService ?? VoiceSynthesisService.Instance;
        _cloningService = cloningService ?? VoiceCloningService.Instance;

        _playheadTimer = new DispatcherTimer(DispatcherPriority.Render)
        {
            Interval = TimeSpan.FromMilliseconds(33) // ~30-60 FPS
        };
        _playheadTimer.Tick += PlayheadTimer_Tick;

        PopulateVoiceCards();
        SplitScriptIntoSentences();
    }

    private void PlayheadTimer_Tick(object? sender, EventArgs e)
    {
        CurrentPlayheadProgress += 0.015;
        if (CurrentPlayheadProgress >= 1.0)
        {
            CurrentPlayheadProgress = 0.0;
            IsPlaying = false;
            _playheadTimer.Stop();
        }
    }

    private void PopulateVoiceCards()
    {
        VoiceCards.Clear();

        // Giọng mặc định Studio
        VoiceCards.Add(new VoiceCardItem { Id = "vi-VN-HoaiMyNeural", Name = "Hoài My (Truyền Cảm)", Flag = "🇻🇳", Gender = "Nữ", Category = "Studio" });
        VoiceCards.Add(new VoiceCardItem { Id = "vi-VN-NamMinhNeural", Name = "Nam Minh (Trầm Kịch Tính)", Flag = "🇻🇳", Gender = "Nam", Category = "Studio" });
        VoiceCards.Add(new VoiceCardItem { Id = "en-US-ChristopherNeural", Name = "Christopher (Cinema Review)", Flag = "🇺🇸", Gender = "Nam", Category = "Studio" });
        VoiceCards.Add(new VoiceCardItem { Id = "en-US-JennyNeural", Name = "Jenny (Storyteller)", Flag = "🇺🇸", Gender = "Nữ", Category = "Studio" });

        // Giọng Cloned từ service
        foreach (var cloned in _cloningService.GetClonedProfiles())
        {
            VoiceCards.Add(new VoiceCardItem
            {
                Id = cloned.VoiceId,
                Name = cloned.DisplayName,
                Flag = "⚡",
                Gender = cloned.Gender == "Male" ? "Nam" : "Nữ",
                Category = "My Clones",
                IsCloned = true
            });
        }

        if (VoiceCards.Count > 0)
            SelectedVoice = VoiceCards[0];
    }

    [RelayCommand]
    public void SplitScriptIntoSentences()
    {
        ScriptSentences.Clear();
        if (string.IsNullOrWhiteSpace(ScriptFullText)) return;

        var rawParts = ScriptFullText.Split(new[] { '.', '!', '?', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        int idx = 1;
        foreach (var p in rawParts)
        {
            string clean = p.Trim();
            if (clean.Length > 0)
            {
                ScriptSentences.Add(new ScriptSentenceItem
                {
                    Index = idx++,
                    Text = clean,
                    AssignedVoiceId = SelectedVoice?.Id ?? "vi-VN-HoaiMyNeural",
                    Speed = 1.0,
                    EstimatedSeconds = Math.Max(1.5, clean.Length * 0.07)
                });
            }
        }
    }

    [RelayCommand]
    public void TogglePlayback()
    {
        if (IsPlaying)
        {
            IsPlaying = false;
            _playheadTimer.Stop();
        }
        else
        {
            IsPlaying = true;
            CurrentPlayheadProgress = 0.0;
            _playheadTimer.Start();
        }
    }

    [RelayCommand]
    public async Task CloneNewVoiceAsync()
    {
        if (IsGenerating) return;

        IsGenerating = true;
        StatusMessage = "Đang nhân bản giọng mẫu (Zero-Shot Voice Cloning)...";

        try
        {
            var prog = new Progress<string>(msg => StatusMessage = msg);
            var cloned = await _cloningService.CloneVoiceFromSampleAsync(CloneSampleAudioPath, NewCloneName, "Male", prog);
            PopulateVoiceCards();
            StatusMessage = $"Nhân bản thành công: {cloned.DisplayName}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Lỗi: {ex.Message}";
        }
        finally
        {
            IsGenerating = false;
        }
    }

    [RelayCommand]
    public async Task GenerateFullNarrationAudioAsync()
    {
        if (IsGenerating) return;

        IsGenerating = true;
        GenerationProgress = 0;
        StatusMessage = "Đang sinh toàn bộ audio qua Kokoro TTS (PCM Stream)...";

        try
        {
            int count = ScriptSentences.Count;
            for (int i = 0; i < count; i++)
            {
                var sentence = ScriptSentences[i];
                var req = new VoiceSynthesisRequest
                {
                    Text = sentence.Text,
                    VoiceId = sentence.AssignedVoiceId,
                    SpeedRate = sentence.Speed
                };

                using var stream = await _synthService.SynthesizeToMemoryStreamAsync(req);
                GenerationProgress = ((double)(i + 1) / count) * 100.0;
                StatusMessage = $"Đã sinh câu {i + 1}/{count}...";
            }

            StatusMessage = "Hoàn tất sinh toàn bộ giọng đọc narration!";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Lỗi: {ex.Message}";
        }
        finally
        {
            IsGenerating = false;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _playheadTimer.Stop();
        _playheadTimer.Tick -= PlayheadTimer_Tick;
    }
}
