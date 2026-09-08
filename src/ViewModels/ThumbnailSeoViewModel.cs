// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: ThumbnailSeoViewModel.cs
// Target: C# .NET 9 WPF (CommunityToolkit.Mvvm, Preset Gallery & Feed Simulator)
// ==============================================================================

using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// Đại diện cho 1 phương án bìa 3D trong Preset Gallery
/// </summary>
public sealed partial class ThumbnailPresetItem : ObservableObject
{
    [ObservableProperty]
    private int _presetIndex = 1;

    [ObservableProperty]
    private string _title = "Phong Cách Cyber Glow";

    [ObservableProperty]
    private string _hookText = "BÍ MẬT 99%!";

    [ObservableProperty]
    private string _previewImagePath = string.Empty;

    [ObservableProperty]
    private bool _isSelected;
}

/// <summary>
/// ThumbnailSeoViewModel: Quản lý thiết kế thumbnail 3D và tối ưu hóa SEO
/// </summary>
public sealed partial class ThumbnailSeoViewModel : ObservableObject, IDisposable
{
    private readonly SubjectMattingService _mattingService;
    private readonly Thumbnail3DComposer _composer;
    private readonly SeoMetadataOptimizer _seoOptimizer;

    private bool _isGenerating;
    private double _progressValue;
    private string _statusMessage = "Sẵn sàng tạo ảnh bìa 3D & Siêu dữ liệu SEO";
    private bool _disposed;

    [ObservableProperty]
    private string _videoSourcePath = "C:\\Videos\\SoloLeveling_Chapter1.mp4";

    [ObservableProperty]
    private string _customHookText = "SỰ THẬT KINH HOÀNG!";

    [ObservableProperty]
    private double _textRotationAngle = -4.0;

    [ObservableProperty]
    private string _selectedTitle = "Sự Thật Kinh Hoàng Về Solo Leveling Mà Chưa Ai Tiết Lộ!";

    [ObservableProperty]
    private string _videoDescription = string.Empty;

    [ObservableProperty]
    private string _seoTags = string.Empty;

    [ObservableProperty]
    private int _seoScore = 96;

    [ObservableProperty]
    private bool _isFeedSimulatorVisible;

    [ObservableProperty]
    private ThumbnailPresetItem? _selectedPreset;

    public ObservableCollection<ThumbnailPresetItem> PresetGallery { get; } = new();
    public ObservableCollection<string> TitleVariants { get; } = new();

    public bool IsGenerating
    {
        get => _isGenerating;
        private set => SetProperty(ref _isGenerating, value);
    }

    public double ProgressValue
    {
        get => _progressValue;
        private set => SetProperty(ref _progressValue, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public ThumbnailSeoViewModel(
        SubjectMattingService? mattingService = null,
        Thumbnail3DComposer? composer = null,
        SeoMetadataOptimizer? seoOptimizer = null)
    {
        _mattingService = mattingService ?? SubjectMattingService.Instance;
        _composer = composer ?? Thumbnail3DComposer.Instance;
        _seoOptimizer = seoOptimizer ?? SeoMetadataOptimizer.Instance;

        SeedInitialPresets();
    }

    private void SeedInitialPresets()
    {
        PresetGallery.Clear();
        PresetGallery.Add(new ThumbnailPresetItem
        {
            PresetIndex = 1,
            Title = "Phong Cách Neon Cyber",
            HookText = "BÍ MẬT KINH HOÀNG!",
            IsSelected = true
        });

        PresetGallery.Add(new ThumbnailPresetItem
        {
            PresetIndex = 2,
            Title = "Phong Cách Dramatic Dark",
            HookText = "SỰ THẬT ĐÃ LỘ DIỆN!",
            IsSelected = false
        });

        PresetGallery.Add(new ThumbnailPresetItem
        {
            PresetIndex = 3,
            Title = "Phong Cách Comic Manga Pop",
            HookText = "ĐỪNG XEM NẾU CHƯA ĐỌC!",
            IsSelected = false
        });

        if (PresetGallery.Count > 0)
            SelectedPreset = PresetGallery[0];
    }

    [RelayCommand]
    public async Task AutoGenerateThumbnailAndSeoAsync()
    {
        if (IsGenerating) return;

        IsGenerating = true;
        ProgressValue = 0;
        StatusMessage = "Đang quét frame sắc nét & Tách nền RMBG-1.4...";

        try
        {
            var prog = new Progress<(int Step, string Status)>(t =>
            {
                StatusMessage = t.Status;
                ProgressValue = t.Step * 25.0;
            });

            // 1. Trích xuất frame & tách nền
            var frames = await _mattingService.ExtractTopKeyframesAndMatteAsync(VideoSourcePath, prog);

            // 2. Sinh SEO bằng Gemini API
            StatusMessage = "Đang tối ưu hóa Title, Description & Tags qua Gemini API...";
            var seoPkg = await _seoOptimizer.GenerateSeoPackageAsync("Solo Leveling Chapter 1", "Tóm tắt trận chiến Valoria");

            TitleVariants.Clear();
            foreach (var tv in seoPkg.TitleVariants)
                TitleVariants.Add(tv);

            SelectedTitle = seoPkg.BestTitle;
            VideoDescription = seoPkg.DescriptionWithTimestamps;
            SeoTags = seoPkg.CommaSeparatedTags;
            SeoScore = seoPkg.SeoScore;

            ProgressValue = 100.0;
            StatusMessage = "Hoàn tất tạo 3 phương án Thumbnail 3D & Siêu dữ liệu SEO!";
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
    public void CopyTitleToClipboard()
    {
        if (!string.IsNullOrEmpty(SelectedTitle))
        {
            Clipboard.SetText(SelectedTitle);
            StatusMessage = "Đã sao chép tiêu đề vào Clipboard!";
        }
    }

    [RelayCommand]
    public void CopyTagsToClipboard()
    {
        if (!string.IsNullOrEmpty(SeoTags))
        {
            Clipboard.SetText(SeoTags);
            StatusMessage = "Đã sao chép danh sách Tag vào Clipboard!";
        }
    }

    [RelayCommand]
    public void CopyDescriptionToClipboard()
    {
        if (!string.IsNullOrEmpty(VideoDescription))
        {
            Clipboard.SetText(VideoDescription);
            StatusMessage = "Đã sao chép toàn bộ mô tả kèm Chapters vào Clipboard!";
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
    }
}
