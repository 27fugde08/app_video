// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: TimelineEditorViewModel.cs
// Target: C# .NET 9 WPF (CommunityToolkit.Mvvm, Undo/Redo, Realtime Playback)
// ==============================================================================

using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Models;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// TimelineEditorViewModel: Quản lý dự án dựng video, Play/Pause, Split clip và xuất file bằng NVENC
/// </summary>
public sealed partial class TimelineEditorViewModel : ObservableObject, IDisposable
{
    private readonly TimelineCompiler _compiler;
    private readonly DispatcherTimer _playbackTimer;
    private bool _isPlaying;
    private bool _isExporting;
    private double _exportProgress;
    private string _exportStatusMessage = "Sẵn sàng";
    private bool _disposed;

    [ObservableProperty]
    private TimelineProject _project = new();

    [ObservableProperty]
    private double _currentPositionSeconds = 0.0;

    [ObservableProperty]
    private string _activePreviewSource = string.Empty;

    public bool IsPlaying
    {
        get => _isPlaying;
        private set => SetProperty(ref _isPlaying, value);
    }

    public bool IsExporting
    {
        get => _isExporting;
        private set => SetProperty(ref _isExporting, value);
    }

    public double ExportProgress
    {
        get => _exportProgress;
        private set => SetProperty(ref _exportProgress, value);
    }

    public string ExportStatusMessage
    {
        get => _exportStatusMessage;
        private set => SetProperty(ref _exportStatusMessage, value);
    }

    public TimelineEditorViewModel(TimelineCompiler? compiler = null)
    {
        _compiler = compiler ?? TimelineCompiler.Instance;

        _playbackTimer = new DispatcherTimer(DispatcherPriority.Render)
        {
            Interval = TimeSpan.FromMilliseconds(33) // ~30 FPS UI playback tick
        };
        _playbackTimer.Tick += OnPlaybackTick;

        // Seed initial demo project
        InitializeDemoTimeline();
    }

    private void InitializeDemoTimeline()
    {
        _project.ProjectName = "AI Auto-Dubbing & Highlight Cut";
        _project.MainVideoTrack.Clips.Add(new TimelineClip
        {
            Name = "Opening Scene (4K)",
            SourceFilePath = "C:\\Videos\\Sample_Clip1.mp4",
            SourceInSeconds = 0.0,
            SourceOutSeconds = 12.5,
            TimelineStartSeconds = 0.0,
            SpeedRate = 1.0
        });
        _project.MainVideoTrack.Clips.Add(new TimelineClip
        {
            Name = "Highlight Climax (60 FPS)",
            SourceFilePath = "C:\\Videos\\Sample_Clip2.mp4",
            SourceInSeconds = 5.0,
            SourceOutSeconds = 25.0,
            TimelineStartSeconds = 12.5,
            SpeedRate = 1.2
        });

        _project.VoiceTrack.Clips.Add(new TimelineClip
        {
            Name = "Vietnamese AI Voiceover",
            SourceFilePath = "C:\\Videos\\Voice_TTS.wav",
            SourceInSeconds = 0.0,
            SourceOutSeconds = 28.0,
            TimelineStartSeconds = 1.0,
            Volume = 1.5
        });

        _project.MusicTrack.Clips.Add(new TimelineClip
        {
            Name = "Background Lo-Fi Beat",
            SourceFilePath = "C:\\Videos\\BGM.mp3",
            SourceInSeconds = 0.0,
            SourceOutSeconds = 32.5,
            TimelineStartSeconds = 0.0,
            Volume = 0.35
        });

        if (_project.MainVideoTrack.Clips.Count > 0)
        {
            ActivePreviewSource = _project.MainVideoTrack.Clips[0].SourceFilePath;
        }
    }

    [RelayCommand]
    public void TogglePlayPause()
    {
        if (IsPlaying)
        {
            _playbackTimer.Stop();
            IsPlaying = false;
        }
        else
        {
            _playbackTimer.Start();
            IsPlaying = true;
        }
    }

    [RelayCommand]
    public void SplitClipAtPlayhead()
    {
        double pos = CurrentPositionSeconds;
        foreach (var clip in _project.MainVideoTrack.Clips)
        {
            if (pos > clip.TimelineStartSeconds && pos < clip.TimelineEndSeconds)
            {
                // Chia clip thành 2 đoạn phi phá hủy
                double splitOffsetTimeline = pos - clip.TimelineStartSeconds;
                double splitSourceSec = clip.SourceInSeconds + (splitOffsetTimeline * clip.SpeedRate);

                var rightClip = new TimelineClip
                {
                    Name = $"{clip.Name} (Part 2)",
                    SourceFilePath = clip.SourceFilePath,
                    SourceInSeconds = splitSourceSec,
                    SourceOutSeconds = clip.SourceOutSeconds,
                    TimelineStartSeconds = pos,
                    SpeedRate = clip.SpeedRate,
                    Volume = clip.Volume
                };

                clip.SourceOutSeconds = splitSourceSec;
                _project.MainVideoTrack.Clips.Add(rightClip);
                OnPropertyChanged(nameof(Project));
                break;
            }
        }
    }

    [RelayCommand]
    public async Task ExportVideoAsync()
    {
        if (IsExporting) return;

        IsExporting = true;
        ExportProgress = 0;
        ExportStatusMessage = "Đang cấu hình NVENC GPU Filtergraph...";

        try
        {
            string outPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.MyVideos),
                "CreatorOS",
                $"Studio_Export_{DateTime.Now:yyyyMMdd_HHmmss}.mp4"
            );

            var progress = new Progress<double>(p =>
            {
                ExportProgress = p;
                ExportStatusMessage = $"Đang xuất video: {p:F0}%";
            });

            bool success = await _compiler.ExportProjectAsync(_project, outPath, progress);
            ExportStatusMessage = success ? $"Xuất thành công: {Path.GetFileName(outPath)}" : "Xuất thất bại.";
        }
        catch (Exception ex)
        {
            ExportStatusMessage = $"Lỗi: {ex.Message}";
        }
        finally
        {
            IsExporting = false;
        }
    }

    private void OnPlaybackTick(object? sender, EventArgs e)
    {
        double totalDuration = _project.GetTotalDurationSeconds();
        CurrentPositionSeconds += 0.033;

        if (CurrentPositionSeconds >= totalDuration)
        {
            CurrentPositionSeconds = 0.0;
            _playbackTimer.Stop();
            IsPlaying = false;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _playbackTimer.Stop();
    }
}
