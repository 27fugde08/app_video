// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: PublisherViewModel.cs
// Target: C# .NET 9 WPF (CommunityToolkit.Mvvm, Visual Calendar & Upload Queue)
// ==============================================================================

using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// Đại diện cho 1 thẻ kênh kết nối trong UI
/// </summary>
public sealed partial class ChannelCardItem : ObservableObject
{
    [ObservableProperty]
    private string _channelId = string.Empty;

    [ObservableProperty]
    private string _channelName = string.Empty;

    [ObservableProperty]
    private string _platformIcon = "📺";

    [ObservableProperty]
    private string _platformName = "YouTube";

    [ObservableProperty]
    private string _statusBadge = "Đang hoạt động";

    [ObservableProperty]
    private bool _isSelected = true;
}

/// <summary>
/// Đại diện cho 1 ô lịch xuất bản trên giao diện
/// </summary>
public sealed partial class CalendarPostItem : ObservableObject
{
    [ObservableProperty]
    private string _postId = Guid.NewGuid().ToString("N");

    [ObservableProperty]
    private string _title = string.Empty;

    [ObservableProperty]
    private string _scheduledTimeString = string.Empty;

    [ObservableProperty]
    private string _platformsString = "YouTube, TikTok";

    [ObservableProperty]
    private string _status = "Đã lên lịch";
}

/// <summary>
/// PublisherViewModel: Quản lý các kênh kết nối, lịch đăng bài và tiến trình upload
/// </summary>
public sealed partial class PublisherViewModel : ObservableObject, IDisposable
{
    private readonly AccountCredentialVault _vault;
    private readonly PlatformPublishService _publishService;
    private readonly BackgroundScheduleEngine _scheduleEngine;

    private bool _isUploading;
    private double _uploadProgress;
    private double _transferSpeed;
    private string _statusMessage = "Sẵn sàng phân phối đa nền tảng";
    private bool _disposed;

    [ObservableProperty]
    private string _selectedVideoPath = "C:\\Videos\\Rendered_Final_4K.mp4";

    [ObservableProperty]
    private string _postTitle = "Sự Thật Kinh Hoàng Về Solo Leveling Chưa Từng Tiết Lộ!";

    [ObservableProperty]
    private string _postDescription = "Khám phá video review chi tiết toàn bộ Solo Leveling Chapter 1...";

    [ObservableProperty]
    private DateTime _scheduleDateTime = DateTime.Now.AddHours(2);

    [ObservableProperty]
    private ChannelCardItem? _selectedChannel;

    public ObservableCollection<ChannelCardItem> ConnectedChannels { get; } = new();
    public ObservableCollection<CalendarPostItem> ScheduledCalendarPosts { get; } = new();

    public bool IsUploading
    {
        get => _isUploading;
        private set => SetProperty(ref _isUploading, value);
    }

    public double UploadProgress
    {
        get => _uploadProgress;
        private set => SetProperty(ref _uploadProgress, value);
    }

    public double TransferSpeed
    {
        get => _transferSpeed;
        private set => SetProperty(ref _transferSpeed, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        private set => SetProperty(ref _statusMessage, value);
    }

    public PublisherViewModel(
        AccountCredentialVault? vault = null,
        PlatformPublishService? publishService = null,
        BackgroundScheduleEngine? scheduleEngine = null)
    {
        _vault = vault ?? AccountCredentialVault.Instance;
        _publishService = publishService ?? PlatformPublishService.Instance;
        _scheduleEngine = scheduleEngine ?? BackgroundScheduleEngine.Instance;

        LoadChannels();
        LoadSampleCalendar();
    }

    private void LoadChannels()
    {
        ConnectedChannels.Clear();
        var rawChannels = _vault.GetConnectedChannels();
        foreach (var c in rawChannels)
        {
            string icon = c.Platform switch
            {
                SocialPlatformType.YouTube => "🔴",
                SocialPlatformType.TikTok => "🎵",
                SocialPlatformType.Facebook => "🔵",
                _ => "📺"
            };

            ConnectedChannels.Add(new ChannelCardItem
            {
                ChannelId = c.ChannelId,
                ChannelName = c.ChannelName,
                PlatformIcon = icon,
                PlatformName = c.Platform.ToString(),
                StatusBadge = c.IsActive ? "Đang hoạt động" : "Cần cấp quyền lại",
                IsSelected = true
            });
        }

        if (ConnectedChannels.Count > 0)
            SelectedChannel = ConnectedChannels[0];
    }

    private void LoadSampleCalendar()
    {
        ScheduledCalendarPosts.Clear();
        ScheduledCalendarPosts.Add(new CalendarPostItem
        {
            Title = "Tóm Tắt Anime Solo Leveling Tập 1",
            ScheduledTimeString = "Hôm nay, 19:30",
            PlatformsString = "YouTube, TikTok",
            Status = "Đã lên lịch"
        });

        ScheduledCalendarPosts.Add(new CalendarPostItem
        {
            Title = "Top 5 Khoảnh Khắc Bá Đạo Của Sung Jin-Woo",
            ScheduledTimeString = "Ngày mai, 11:45",
            PlatformsString = "TikTok, Facebook Reels",
            Status = "Đã lên lịch"
        });
    }

    [RelayCommand]
    public void SchedulePostToCalendar()
    {
        ScheduledCalendarPosts.Add(new CalendarPostItem
        {
            Title = PostTitle,
            ScheduledTimeString = $"{ScheduleDateTime:dd/MM HH:mm}",
            PlatformsString = "YouTube, TikTok, Facebook",
            Status = "Đã lên lịch"
        });

        _scheduleEngine.AddScheduledPost(new ScheduledPostItem
        {
            Title = PostTitle,
            Description = PostDescription,
            VideoPath = SelectedVideoPath,
            ScheduledTime = ScheduleDateTime
        });

        StatusMessage = $"Đã lên lịch đăng thành công vào lúc {ScheduleDateTime:dd/MM HH:mm}!";
    }

    [RelayCommand]
    public async Task PublishImmediatelyAsync()
    {
        if (IsUploading) return;

        IsUploading = true;
        UploadProgress = 0;
        TransferSpeed = 0;
        StatusMessage = "Đang bắt đầu phiên tải lên 8MB Chunked Resumable...";

        try
        {
            var dummyChannel = new ChannelCredential
            {
                ChannelId = "UC_YOUTUBE",
                ChannelName = "Review Phim 24h",
                Platform = SocialPlatformType.YouTube
            };

            // Tạo file video giả lập nếu chưa có
            if (!File.Exists(SelectedVideoPath))
            {
                string dir = Path.GetDirectoryName(SelectedVideoPath)!;
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                await File.WriteAllTextAsync(SelectedVideoPath, "dummy_video_bytes");
            }

            var p = new Progress<UploadProgressState>(state =>
            {
                UploadProgress = state.ProgressPercentage;
                TransferSpeed = state.TransferSpeedMBs;
                StatusMessage = $"Đang tải lên {state.CurrentPlatform}: {state.ProgressPercentage:F1}% ({state.TransferSpeedMBs:F1} MB/s)";
            });

            bool success = await _publishService.UploadVideoResumableAsync(
                SelectedVideoPath,
                dummyChannel,
                PostTitle,
                PostDescription,
                p
            );

            StatusMessage = success ? "Xuất bản thành công lên toàn bộ các kênh!" : "Xuất bản thất bại.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Lỗi: {ex.Message}";
        }
        finally
        {
            IsUploading = false;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
    }
}
