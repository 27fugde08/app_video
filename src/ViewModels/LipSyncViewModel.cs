// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: LipSyncViewModel.cs
// Target: C# .NET 9 WPF (CommunityToolkit.Mvvm, Interactive ROI Calibration & 5s Loop)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// LipSyncViewModel: Quản lý đồng bộ khẩu hình AI, căn chỉnh ROI và xuất bản video NVENC
/// </summary>
public sealed partial class LipSyncViewModel : ObservableObject, IDisposable
{
    private readonly FaceLandmarkTracker _landmarkTracker;
    private readonly Wav2LipInferenceService _inferenceService;
    private readonly FaceFeatheringBlender _blender;

    private readonly DispatcherTimer _previewTimer;
    private bool _isProcessing;
    private double _processingProgress;
    private string _statusMessage = "Sẵn sàng căn chỉnh khẩu hình";
    private bool _disposed;

    [ObservableProperty]
    private string _sourceVideoPath = "C:\\Videos\\Interview_Speaker.mp4";

    [ObservableProperty]
    private string _targetAudioPath = "C:\\Audio\\New_Dubbing_Vietnamese.wav";

    [ObservableProperty]
    private double _smoothingStrength = 0.65; // 0.1 - 1.0

    [ObservableProperty]
    private int _featherRadius = 18; // 5px - 35px

    [ObservableProperty]
    private bool _enableColorCorrection = true;

    [ObservableProperty]
    private int _batchSize = 16;

    [ObservableProperty]
    private double _roiX = 0.42;

    [ObservableProperty]
    private double _roiY = 0.50;

    [ObservableProperty]
    private double _roiWidth = 0.16;

    [ObservableProperty]
    private double _roiHeight = 0.12;

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

    public LipSyncViewModel(
        FaceLandmarkTracker? landmarkTracker = null,
        Wav2LipInferenceService? inferenceService = null,
        FaceFeatheringBlender? blender = null)
    {
        _landmarkTracker = landmarkTracker ?? FaceLandmarkTracker.Instance;
        _inferenceService = inferenceService ?? Wav2LipInferenceService.Instance;
        _blender = blender ?? FaceFeatheringBlender.Instance;

        _previewTimer = new DispatcherTimer(DispatcherPriority.Background)
        {
            Interval = TimeSpan.FromMilliseconds(100)
        };
    }

    [RelayCommand]
    public async Task TrackFaceAndMouthAsync()
    {
        if (IsProcessing) return;

        IsProcessing = true;
        ProcessingProgress = 0;
        StatusMessage = "Đang nhận diện khuôn mặt và khẩu hình (SCRFD ONNX)...";

        try
        {
            var prog = new Progress<(int FrameCount, string Status)>(t =>
            {
                StatusMessage = t.Status;
                ProcessingProgress = Math.Min(100, (t.FrameCount / 900.0) * 100.0);
            });

            var trajectories = await _landmarkTracker.TrackFaceLandmarksAsync(SourceVideoPath, prog);
            StatusMessage = $"Đã quét thành công {trajectories.Count} khung hình khuôn mặt!";
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

    [RelayCommand]
    public async Task Preview5SecondsAsync()
    {
        if (IsProcessing) return;

        IsProcessing = true;
        ProcessingProgress = 0;
        StatusMessage = "Đang tạo bản xem trước 5 giây đầu (5-Second Preview Loop)...";

        try
        {
            string previewOut = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "CreatorOS", "Temp", "LipSync_Preview_5s.mp4"
            );

            var options = new LipSyncInferenceOptions
            {
                BatchSize = BatchSize,
                SmoothingStrength = SmoothingStrength,
                FeatherRadius = FeatherRadius,
                EnableColorCorrection = EnableColorCorrection,
                Fast5SecondPreviewOnly = true
            };

            var dummyTraj = new List<FaceBoxTrajectory>();
            for (int i = 0; i < 150; i++) dummyTraj.Add(new FaceBoxTrajectory());

            var p = new Progress<double>(val => ProcessingProgress = val);
            await _inferenceService.RunInferenceAsync(SourceVideoPath, TargetAudioPath, dummyTraj, options, p);

            StatusMessage = "Xem trước 5 giây sẵn sàng!";
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

    [RelayCommand]
    public async Task RenderFullLipSyncVideoAsync()
    {
        if (IsProcessing) return;

        IsProcessing = true;
        ProcessingProgress = 0;
        StatusMessage = "Đang suy luận khẩu hình AI & Xuất NVENC 1080p...";

        try
        {
            string finalOut = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.MyVideos),
                "CreatorOS",
                $"LipSync_Final_{DateTime.Now:yyyyMMdd_HHmmss}.mp4"
            );

            var options = new LipSyncInferenceOptions
            {
                BatchSize = BatchSize,
                SmoothingStrength = SmoothingStrength,
                FeatherRadius = FeatherRadius,
                EnableColorCorrection = EnableColorCorrection,
                Fast5SecondPreviewOnly = false
            };

            var dummyTraj = new List<FaceBoxTrajectory>();
            for (int i = 0; i < 900; i++) dummyTraj.Add(new FaceBoxTrajectory());

            var p = new Progress<double>(val =>
            {
                ProcessingProgress = val;
                StatusMessage = $"Tiến độ xuất LipSync: {val:F0}%";
            });

            await _inferenceService.RunInferenceAsync(SourceVideoPath, TargetAudioPath, dummyTraj, options, p);
            bool success = await _blender.BlendAndExportVideoAsync(SourceVideoPath, TargetAudioPath, finalOut, options, p);

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
        _previewTimer.Stop();
    }
}
