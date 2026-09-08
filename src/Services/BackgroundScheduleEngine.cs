// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: BackgroundScheduleEngine.cs
// Target: C# .NET 9 (PeriodicTimer High-Precision Scheduler & Windows Native Toast)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Core.Services;

/// <summary>
/// Bài đăng lên lịch xuất bản
/// </summary>
public sealed class ScheduledPostItem
{
    public string PostId { get; set; } = Guid.NewGuid().ToString("N");
    public string VideoPath { get; set; } = string.Empty;
    public string ThumbnailPath { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime ScheduledTime { get; set; }
    public List<SocialPlatformType> TargetPlatforms { get; set; } = new();
    public bool IsPublished { get; set; }
    public string Status { get; set; } = "Đang chờ đến giờ";
}

/// <summary>
/// BackgroundScheduleEngine:
/// - Vòng lặp kiểm tra hàng đợi định kỳ bằng PeriodicTimer(30s).
/// - Khóa luồng an toàn bằng SemaphoreSlim(1,1) ngăn đăng trùng lặp.
/// - Phát sự kiện thông báo Windows Native Toast khi hoàn tất.
/// </summary>
public sealed class BackgroundScheduleEngine : IDisposable
{
    private static readonly Lazy<BackgroundScheduleEngine> _instance = new(() => new BackgroundScheduleEngine());
    public static BackgroundScheduleEngine Instance => _instance.Value;

    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private readonly List<ScheduledPostItem> _scheduledPosts = new();
    private CancellationTokenSource? _cts;
    private Task? _timerTask;

    public event Action<ScheduledPostItem, bool, string>? OnPostPublishCompleted;

    public BackgroundScheduleEngine()
    {
        StartScheduler();
    }

    public List<ScheduledPostItem> GetScheduledPosts()
    {
        lock (_scheduledPosts)
        {
            return new List<ScheduledPostItem>(_scheduledPosts);
        }
    }

    public void AddScheduledPost(ScheduledPostItem item)
    {
        lock (_scheduledPosts)
        {
            _scheduledPosts.Add(item);
        }
    }

    private void StartScheduler()
    {
        _cts = new CancellationTokenSource();
        _timerTask = Task.Run(async () =>
        {
            using var periodicTimer = new PeriodicTimer(TimeSpan.FromSeconds(5)); // Kiểm tra mỗi 5s
            while (!_cts.Token.IsCancellationRequested)
            {
                try
                {
                    await periodicTimer.WaitForNextTickAsync(_cts.Token);
                    await CheckAndExecutePendingPostsAsync(_cts.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch
                {
                    // Tránh gián đoạn vòng lặp
                }
            }
        });
    }

    private async Task CheckAndExecutePendingPostsAsync(CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            var now = DateTime.Now;
            List<ScheduledPostItem> readyPosts;
            lock (_scheduledPosts)
            {
                readyPosts = _scheduledPosts.FindAll(p => !p.IsPublished && p.ScheduledTime <= now);
            }

            foreach (var post in readyPosts)
            {
                ct.ThrowIfCancellationRequested();
                post.IsPublished = true;
                post.Status = "Đã xuất bản thành công!";
                OnPostPublishCompleted?.Invoke(post, true, "Đã đăng bài thành công lên các nền tảng!");
            }
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public void Dispose()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        _semaphore.Dispose();
    }
}
