// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: OutputSettingsViewModel.cs
// Target: C# .NET 9 WPF (CommunityToolkit.Mvvm Reactive Output Settings)
// ==============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Infrastructure;
using CreatorOS.Core.Models;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// OutputSettingsViewModel: Quản lý cấu hình định tuyến đầu ra và đóng gói tài nguyên.
/// </summary>
public sealed partial class OutputSettingsViewModel : ObservableObject
{
    private readonly SettingsService _settingsService;
    private readonly AssetPackagerService _packagerService;
    private readonly CatalogSyncService _catalogSyncService;

    [ObservableProperty]
    private string _baseDirectory = @"D:\CreatorOS\Dubbed_Output";

    [ObservableProperty]
    private string _patternTemplate = SmartPathRouter.DefaultPattern;

    [ObservableProperty]
    private string _livePreviewPath = string.Empty;

    [ObservableProperty]
    private bool _deleteOriginalAfterPackaging;

    [ObservableProperty]
    private bool _purgeIntermediateStems = true;

    [ObservableProperty]
    private int _selectedCollisionIndex = 0; // 0: AutoIncrement, 1: Overwrite, 2: Skip

    [ObservableProperty]
    private string _statusMessage = "Sẵn sàng định tuyến cấu trúc tệp.";

    [ObservableProperty]
    private bool _isPackagingSimulating;

    [ObservableProperty]
    private string _lastPackagedResultSummary = string.Empty;

    public OutputSettingsViewModel(
        SettingsService? settingsService = null,
        AssetPackagerService? packagerService = null,
        CatalogSyncService? catalogSyncService = null)
    {
        _settingsService = settingsService ?? new SettingsService();
        _packagerService = packagerService ?? new AssetPackagerService();
        _catalogSyncService = catalogSyncService ?? new CatalogSyncService();

        LoadConfig();
        UpdateLivePreview();
    }

    private void LoadConfig()
    {
        var cfg = _settingsService.Current;
        if (!string.IsNullOrWhiteSpace(cfg.DefaultExportDirectory))
        {
            BaseDirectory = cfg.DefaultExportDirectory;
        }
        else
        {
            BaseDirectory = @"D:\CreatorOS\Dubbed_Output";
        }

        PatternTemplate = string.IsNullOrWhiteSpace(cfg.OutputPatternTemplate)
            ? SmartPathRouter.DefaultPattern
            : cfg.OutputPatternTemplate;

        DeleteOriginalAfterPackaging = cfg.DeleteOriginalAfterPackaging;
        PurgeIntermediateStems = cfg.PurgeIntermediateStems;
        SelectedCollisionIndex = Math.Clamp(cfg.FileCollisionMode, 0, 2);
    }

    partial void OnPatternTemplateChanged(string value)
    {
        UpdateLivePreview();
    }

    partial void OnBaseDirectoryChanged(string value)
    {
        UpdateLivePreview();
    }

    public void UpdateLivePreview()
    {
        LivePreviewPath = SmartPathRouter.GenerateLivePreview(PatternTemplate, BaseDirectory);
    }

    [RelayCommand]
    public void InsertToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return;

        if (PatternTemplate.EndsWith(@"\") || PatternTemplate.EndsWith("/"))
        {
            PatternTemplate += token;
        }
        else
        {
            PatternTemplate += @"\" + token;
        }

        UpdateLivePreview();
    }

    [RelayCommand]
    public void ResetToDefaultPattern()
    {
        PatternTemplate = SmartPathRouter.DefaultPattern;
        BaseDirectory = @"D:\CreatorOS\Dubbed_Output";
        DeleteOriginalAfterPackaging = false;
        PurgeIntermediateStems = true;
        SelectedCollisionIndex = 0;
        UpdateLivePreview();
        StatusMessage = "Đã khôi phục mẫu định tuyến chuẩn của CreatorOS.";
    }

    [RelayCommand]
    public async Task SaveSettingsAsync()
    {
        var cfg = _settingsService.Current;
        cfg.DefaultExportDirectory = BaseDirectory;
        cfg.OutputPatternTemplate = PatternTemplate;
        cfg.DeleteOriginalAfterPackaging = DeleteOriginalAfterPackaging;
        cfg.PurgeIntermediateStems = PurgeIntermediateStems;
        cfg.FileCollisionMode = SelectedCollisionIndex;

        await _settingsService.SaveSettingsAsync();
        StatusMessage = "Đã lưu cấu hình Smart Output Router thành công!";
    }

    [RelayCommand]
    public void OpenBaseFolderInExplorer()
    {
        try
        {
            if (!Directory.Exists(BaseDirectory))
            {
                Directory.CreateDirectory(BaseDirectory);
            }
            Process.Start("explorer.exe", BaseDirectory);
        }
        catch (Exception ex)
        {
            StatusMessage = $"Không thể mở thư mục: {ex.Message}";
        }
    }

    [RelayCommand]
    public async Task SimulatePackageAsync()
    {
        IsPackagingSimulating = true;
        StatusMessage = "Đang mô phỏng đóng gói Self-Contained Bundle...";

        try
        {
            await Task.Delay(350); // Mô phỏng thực thi

            var sampleContext = new PathContext(
                BaseDir: BaseDirectory,
                Platform: "TikTok",
                Author: "review_phim_hay",
                Title: "Bi_Mat_Ngoi_Nha_Co_Tap_01",
                Genre: "Phim",
                Resolution: "1080p_Vertical",
                Lang: "vi",
                CompletionDate: DateTime.Now
            );

            string resolvedDir = SmartPathRouter.ResolveBundleDirectory(PatternTemplate, in sampleContext);

            LastPackagedResultSummary = $"Đã tạo Bundle: {resolvedDir}\n" +
                $"• Final Dubbed: Bi_Mat_Ngoi_Nha_Co_Tap_01_Dubbed.mp4\n" +
                $"• Subtitles: subtitles_vi.srt, subtitles_vi.ass\n" +
                $"• Thumbnail: cover_3d.jpg\n" +
                $"• Metadata: metadata.json, script_director.json\n" +
                $"• Atomic MFT Move: < 4.2ms (Zero-Copy Instant Rename)\n" +
                $"• SQLite WAL Index: Đã cập nhật & phát thông điệp AssetBundlePackagedMessage.";

            StatusMessage = "Đóng gói mô phỏng thành công!";
        }
        finally
        {
            IsPackagingSimulating = false;
        }
    }
}
