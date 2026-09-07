// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DownloadBatchViewModel.cs
// Target: C# .NET 9 (WPF Batch Downloader ViewModel with MVVM & Throttling)
// ==============================================================================

using System;
using System.Collections.Concurrent;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Contracts;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

public readonly record struct DownloadProgressSnapshot(
    string VideoId,
    double ProgressPercentage,
    long BytesDownloaded,
    long TotalBytes,
    string SpeedFormatted,
    string StatusText
);

/// <summary>
/// DownloadBatchViewModel: Quản lý hàng loạt tác vụ quét kênh, tải video đa luồng và xuất Asset Bundle.
/// Tích hợp cơ chế điều tiết nhịp 100ms bảo đảm 60 FPS mượt mà trên WPF.
/// </summary>
public sealed partial class DownloadBatchViewModel : ObservableObject, IAsyncDisposable, IDisposable
{
    private readonly ChannelBatchScanner _scanner;
    private readonly AssetBundleDownloader _downloader;
    private readonly IJobQueue _jobQueue;

    private readonly ConcurrentQueue<DownloadProgressSnapshot> _progressQueue = new();
    private readonly CancellationTokenSource _throttlerCts = new();
    private readonly Task _throttlerTask;
    private CancellationTokenSource? _scanCts;
    private bool _disposed;

    public ObservableCollection<ScannedVideoItem> DiscoveredVideos { get; } = new();
    public ObservableCollection<DownloadItemViewModel> DownloadQueue { get; } = new();

    [ObservableProperty]
    private string _channelUrlInput = string.Empty;

    [ObservableProperty]
    private bool _isScanning;

    [ObservableProperty]
    private bool _isDownloadingAll;

    [ObservableProperty]
    private int _scannedCount;

    [ObservableProperty]
    private int _completedCount;

    [ObservableProperty]
    private double _batchProgress;

    [ObservableProperty]
    private string _statusMessage = "Nhập URL kênh Douyin, TikTok hoặc Playlist YouTube để bắt đầu.";

    public DownloadBatchViewModel(
        ChannelBatchScanner scanner,
        AssetBundleDownloader downloader,
        IJobQueue jobQueue)
    {
        _scanner = scanner;
        _downloader = downloader;
        _jobQueue = jobQueue;

        _throttlerTask = Task.Run(RunThrottlerLoopAsync);
    }

    [RelayCommand]
    private async Task StartScanAsync()
    {
        if (string.IsNullOrWhiteSpace(ChannelUrlInput))
        {
            StatusMessage = "Vui lòng nhập đường dẫn URL hợp lệ.";
            return;
        }

        IsScanning = true;
        StatusMessage = "Đang quét danh sách video...";
        DiscoveredVideos.Clear();
        ScannedCount = 0;

        _scanCts = new CancellationTokenSource();

        try
        {
            var options = new ChannelScannerOptions
            {
                MaxVideosToFetch = 50,
                PageSize = 20,
                MinJitterDelayMs = 500,
                MaxJitterDelayMs = 1500
            };

            var progress = new Progress<ScannerProgress>(p =>
            {
                StatusMessage = $"Đã tìm thấy {p.TotalDiscovered} video (Trang {p.CurrentPage})...";
            });

            var result = await _scanner.ScanChannelAsync(ChannelUrlInput, options, progress, _scanCts.Token);

            if (result.Success)
            {
                foreach (var video in result.Videos)
                {
                    DiscoveredVideos.Add(video);
                }
                ScannedCount = DiscoveredVideos.Count;
                StatusMessage = $"Quét thành công {ScannedCount} video không logo trong {result.ElapsedTime.TotalSeconds:F1}s.";
            }
            else
            {
                StatusMessage = $"Lỗi quét: {result.ErrorMessage}";
            }
        }
        catch (OperationCanceledException)
        {
            StatusMessage = "Đã dừng quét kênh.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Lỗi ngoại lệ: {ex.Message}";
        }
        finally
        {
            IsScanning = false;
            _scanCts?.Dispose();
            _scanCts = null;
        }
    }

    [RelayCommand]
    private void CancelScan()
    {
        _scanCts?.Cancel();
    }

    [RelayCommand]
    private async Task DownloadAllDiscoveredAsync()
    {
        if (DiscoveredVideos.Count == 0) return;

        IsDownloadingAll = true;
        StatusMessage = $"Bắt đầu tải hàng loạt {DiscoveredVideos.Count} video và gom Asset Bundle...";

        var outputBaseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "CreatorOS", "Downloads");
        if (!Directory.Exists(outputBaseDir)) Directory.CreateDirectory(outputBaseDir);

        foreach (var video in DiscoveredVideos)
        {
            var downloadItem = new DownloadItemViewModel(video);
            DownloadQueue.Add(downloadItem);

            var job = new JobItem
            {
                Title = video.Title,
                Type = JobType.DownloadVideo,
                ExecutionPayload = async (progress, ct) =>
                {
                    var videoDir = Path.Combine(outputBaseDir, video.VideoId);
                    
                    var assetProgress = new Progress<AssetBundleProgress>(p =>
                    {
                        progress.Report(p.OverallPercentage);
                        _progressQueue.Enqueue(new DownloadProgressSnapshot(
                            VideoId: video.VideoId,
                            ProgressPercentage: p.OverallPercentage,
                            BytesDownloaded: p.TotalBytesDownloaded,
                            TotalBytes: 0,
                            SpeedFormatted: $"{p.CompletedAssetsCount}/{p.TotalAssetsCount} assets",
                            StatusText: $"Đang tải: {p.OverallPercentage:F0}%"
                        ));
                    });

                    var meta = new VideoMetadataModel
                    {
                        Id = video.VideoId,
                        Title = video.Title,
                        Author = video.Author,
                        VideoUrl = video.DirectDownloadUrlNoWatermark,
                        CoverUrl = video.CoverImageUrl ?? string.Empty,
                        DurationSeconds = video.DurationSeconds
                    };

                    var res = await _downloader.DownloadBundleAsync(meta, videoDir, assetProgress, ct);
                    if (!res.Success) throw new InvalidOperationException(res.ErrorMessage ?? "Lỗi tải bundle");
                    return res.OutputDirectory;
                }
            };

            await _jobQueue.EnqueueAsync(job);
        }

        StatusMessage = $"Đã đưa {DiscoveredVideos.Count} video vào hàng đợi In-Memory.";
        IsDownloadingAll = false;
    }

    [RelayCommand]
    private void OpenOutputFolder()
    {
        var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "CreatorOS", "Downloads");
        try
        {
            if (!Directory.Exists(path)) Directory.CreateDirectory(path);
            Process.Start("explorer.exe", path);
        }
        catch { }
    }

    private async Task RunThrottlerLoopAsync()
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(100));
        var token = _throttlerCts.Token;

        try
        {
            while (await timer.WaitForNextTickAsync(token).ConfigureAwait(false))
            {
                if (_progressQueue.IsEmpty) continue;

                var snapshots = new Dictionary<string, DownloadProgressSnapshot>();
                while (_progressQueue.TryDequeue(out var item))
                {
                    snapshots[item.VideoId] = item;
                }

                if (snapshots.Count == 0) continue;

                await Application.Current.Dispatcher.InvokeAsync(() =>
                {
                    foreach (var (videoId, snapshot) in snapshots)
                    {
                        var item = DownloadQueue.FirstOrDefault(d => d.VideoId == videoId);
                        if (item != null)
                        {
                            item.Progress = snapshot.ProgressPercentage;
                            item.StatusText = snapshot.StatusText;
                            item.Speed = snapshot.SpeedFormatted;
                        }
                    }

                    CompletedCount = DownloadQueue.Count(d => d.Progress >= 100.0);
                    if (DownloadQueue.Count > 0)
                    {
                        BatchProgress = Math.Round(DownloadQueue.Average(d => d.Progress), 1);
                    }
                }, System.Windows.Threading.DispatcherPriority.Background);
            }
        }
        catch (OperationCanceledException) { }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _throttlerCts.Cancel();
        _throttlerCts.Dispose();
        _scanCts?.Dispose();
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        _throttlerCts.Cancel();
        try
        {
            await _throttlerTask.ConfigureAwait(false);
        }
        catch { }

        Dispose();
    }
}
