// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: ContentIdShieldViewModel.cs
// Target: C# .NET 9 WPF (CommunityToolkit.Mvvm, Direct3D Split-Screen Comparison)
// ==============================================================================

using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// ContentIdShieldViewModel: Quản lý các bộ preset an toàn bản quyền và so sánh A/B
/// </summary>
public sealed partial class ContentIdShieldViewModel : ObservableObject, IDisposable
{
    private readonly ShieldFilterPipeline _pipeline;
    private bool _isProcessing;
    private double _processingProgress;
    private string _statusMessage = "Sẵn sàng áp dụng Anti-Content ID Shield";
    private bool _disposed;

    [ObservableProperty]
    private string _sourceVideoPath = "C:\\Videos\\Documentary_Story_Clip.mp4";

    [ObservableProperty]
    private ShieldIntensity _selectedIntensity = ShieldIntensity.Balanced;

    [ObservableProperty]
    private double _splitSliderPosition = 0.5; // 0.0 - 1.0

    [ObservableProperty]
    private int _safetyScore = 88; // 0% - 100%

    [ObservableProperty]
    private bool _enableKenBurnsBreathing = true;

    [ObservableProperty]
    private bool _enableFilmGrain = true;

    [ObservableProperty]
    private bool _enableStereoDecouple = true;

    [ObservableProperty]
    private bool _enableDynamicFps = true;

    public bool IsProcessing
    {
        get => _isProcessing;
        private set => SetProperty(ref _isProcessing, value);
    }

    public double ProcessingProgress
    {
        get => _processingProgress;
        private set => SetProperty(ref _processingProgress, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public ContentIdShieldViewModel(ShieldFilterPipeline? pipeline = null)
    {
        _pipeline = pipeline ?? ShieldFilterPipeline.Instance;
        UpdateSafetyScore();
    }

    partial void OnSelectedIntensityChanged(ShieldIntensity value)
    {
        switch (value)
        {
            case ShieldIntensity.Safe:
                EnableFilmGrain = false;
                EnableStereoDecouple = false;
                EnableDynamicFps = false;
                break;
            case ShieldIntensity.Balanced:
                EnableFilmGrain = true;
                EnableStereoDecouple = true;
                EnableDynamicFps = false;
                break;
            case ShieldIntensity.Aggressive:
                EnableFilmGrain = true;
                EnableStereoDecouple = true;
                EnableDynamicFps = true;
                break;
        }
        UpdateSafetyScore();
    }

    private void UpdateSafetyScore()
    {
        int score = 40;
        if (EnableKenBurnsBreathing) score += 15;
        if (EnableFilmGrain) score += 15;
        if (EnableStereoDecouple) score += 18;
        if (EnableDynamicFps) score += 12;
        SafetyScore = Math.Min(100, score);
    }

    [RelayCommand]
    public async Task ApplyShieldAndExportAsync()
    {
        if (IsProcessing) return;

        IsProcessing = true;
        ProcessingProgress = 0;
        StatusMessage = "Đang áp dụng bộ lọc phá vân tay & Render NVENC 1-Pass...";

        try
        {
            string finalOut = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.MyVideos),
                "CreatorOS",
                $"Shielded_{DateTime.Now:yyyyMMdd_HHmmss}.mp4"
            );

            var p = new Progress<double>(val =>
            {
                ProcessingProgress = val;
                StatusMessage = $"Tiến độ xuất bảo vệ: {val:F0}%";
            });

            bool success = await _pipeline.ProcessAndExportShieldedVideoAsync(
                SourceVideoPath,
                finalOut,
                SelectedIntensity,
                p
            );

            StatusMessage = success ? $"Xuất thành công: {Path.GetFileName(finalOut)}" : "Xuất thất bại.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Lỗi: {ex.Message}";
        }
        finally
        {
            IsProcessing = false;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
    }
}
