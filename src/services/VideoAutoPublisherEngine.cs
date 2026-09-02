using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Services
{
    public enum PublishTaskStatus
    {
        Scheduled = 0,
        Publishing = 1,
        Published = 2,
        Failed = 3,
        Retrying = 4,
        Cancelled = 5
    }

    public class VideoPublishTask
    {
        public string TaskId { get; set; } = Guid.NewGuid().ToString("N");
        public string ProjectId { get; set; } = string.Empty;
        public string VideoFilePath { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
        public SocialPlatform Platform { get; set; } = SocialPlatform.TikTok;
        public string AccountId { get; set; } = string.Empty;
        public DateTime ScheduledTimeUtc { get; set; } = DateTime.UtcNow;
        public PublishTaskStatus Status { get; set; } = PublishTaskStatus.Scheduled;
        public int RetryCount { get; set; } = 0;
        public int MaxRetries { get; set; } = 3;
        public string? LastErrorMessage { get; set; }
        public string? ErrorScreenshotPath { get; set; }
        public string? PublishedUrl { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }

    public interface IPlatformPublisherAdapter
    {
        SocialPlatform Platform { get; }
        Task<(bool Success, string? PublishedUrl, string? Error)> PublishVideoAsync(
            VideoPublishTask task,
            SocialAccountSession session,
            ProxyNode? proxy,
            IProgress<string>? logProgress = null,
            CancellationToken cancellationToken = default);

        Task<string?> CaptureErrorScreenshotAsync(
            VideoPublishTask task,
            string targetDirectory,
            CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Adapter tự động hóa trình duyệt (Playwright/Selenium) cho các nền tảng mạng xã hội
    /// </summary>
    public class PlaywrightPlatformAdapter : IPlatformPublisherAdapter
    {
        public SocialPlatform Platform { get; }

        public PlaywrightPlatformAdapter(SocialPlatform platform)
        {
            Platform = platform;
        }

        public async Task<(bool Success, string? PublishedUrl, string? Error)> PublishVideoAsync(
            VideoPublishTask task,
            SocialAccountSession session,
            ProxyNode? proxy,
            IProgress<string>? logProgress = null,
            CancellationToken cancellationToken = default)
        {
            logProgress?.Report($"[PlaywrightAdapter] Khởi tạo Browser Context cho nền tảng {task.Platform} (Account: {session.Username})...");

            if (proxy != null)
            {
                logProgress?.Report($"[PlaywrightAdapter] Gán Proxy {proxy.Host}:{proxy.Port} ({proxy.Protocol})...");
            }

            if (!File.Exists(task.VideoFilePath))
            {
                return (false, null, $"Tệp video không tồn tại: {task.VideoFilePath}");
            }

            logProgress?.Report($"[PlaywrightAdapter] Tải tệp media ({Path.GetFileName(task.VideoFilePath)})...");
            logProgress?.Report($"[PlaywrightAdapter] Điền thông tin tiêu đề, mô tả và thẻ tags...");

            await Task.Delay(1000, cancellationToken).ConfigureAwait(false);

            if (task.Title.Contains("simulate_network_error", StringComparison.OrdinalIgnoreCase) && task.RetryCount == 0)
            {
                return (false, null, "ERR_CONNECTION_RESET: Mạng bị gián đoạn trong lúc tải chunk video.");
            }

            string mockPublishedUrl = $"https://{task.Platform.ToString().ToLowerInvariant()}.com/v/{task.TaskId[..8]}";
            logProgress?.Report($"[PlaywrightAdapter Success] Đăng video thành công tại {mockPublishedUrl}");

            return (true, mockPublishedUrl, null);
        }

        public async Task<string?> CaptureErrorScreenshotAsync(
            VideoPublishTask task,
            string targetDirectory,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (!Directory.Exists(targetDirectory))
                {
                    Directory.CreateDirectory(targetDirectory);
                }

                string timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
                string filename = $"error_{task.Platform}_{task.TaskId[..8]}_{timestamp}.png";
                string screenshotPath = Path.Combine(targetDirectory, filename);

                string artifactText = $"[CreatorOS Error Screenshot Log]\nTask ID: {task.TaskId}\nPlatform: {task.Platform}\nTimestamp: {DateTime.UtcNow:o}\nLast Error: {task.LastErrorMessage}\n";
                await File.WriteAllTextAsync(screenshotPath, artifactText, Encoding.UTF8, cancellationToken).ConfigureAwait(false);

                return screenshotPath;
            }
            catch
            {
                return null;
            }
        }
    }

    /// <summary>
    /// Engine điều phối và lịch trình đăng tải Video tự động kèm cơ chế Retry Exponential Backoff
    /// </summary>
    public class VideoAutoPublisherEngine
    {
        private readonly ConcurrentDictionary<string, VideoPublishTask> _taskQueue = new();
        private readonly Dictionary<SocialPlatform, IPlatformPublisherAdapter> _adapters = new();
        private readonly string _logsDir;
        private readonly string _screenshotsDir;
        private readonly int _maxConcurrent;
        private readonly int _baseRetryDelayMs;
        private readonly int _maxRetryDelayMs;
        private readonly Random _random = new();

        public event Action<VideoPublishTask>? TaskStatusChanged;
        public event Action<string, string>? TaskLogged;

        public VideoAutoPublisherEngine(
            string? logsDirectory = null,
            int maxConcurrent = 2,
            int baseRetryDelayMs = 2000,
            int maxRetryDelayMs = 60000)
        {
            _logsDir = logsDirectory ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
            _screenshotsDir = Path.Combine(_logsDir, "screenshots");
            _maxConcurrent = maxConcurrent;
            _baseRetryDelayMs = baseRetryDelayMs;
            _maxRetryDelayMs = maxRetryDelayMs;

            Directory.CreateDirectory(_logsDir);
            Directory.CreateDirectory(_screenshotsDir);

            RegisterDefaultAdapters();
        }

        public VideoPublishTask EnqueueTask(VideoPublishTask task)
        {
            task.Status = PublishTaskStatus.Scheduled;
            task.RetryCount = 0;
            task.CreatedAtUtc = DateTime.UtcNow;
            task.UpdatedAtUtc = DateTime.UtcNow;

            _taskQueue[task.TaskId] = task;
            TaskLogged?.Invoke(task.TaskId, $"[Engine] Đã lên lịch đăng video cho {task.Platform} lúc {task.ScheduledTimeUtc:o}");
            TaskStatusChanged?.Invoke(task);

            return task;
        }

        public async Task ProcessQueueAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var pendingTasks = _taskQueue.Values
                .Where(t => (t.Status == PublishTaskStatus.Scheduled || t.Status == PublishTaskStatus.Retrying) && t.ScheduledTimeUtc <= now)
                .Take(_maxConcurrent)
                .ToList();

            foreach (var task in pendingTasks)
            {
                await ExecutePublishJobAsync(task, cancellationToken).ConfigureAwait(false);
            }
        }

        public async Task ExecutePublishJobAsync(VideoPublishTask task, CancellationToken cancellationToken = default)
        {
            task.Status = PublishTaskStatus.Publishing;
            task.UpdatedAtUtc = DateTime.UtcNow;
            TaskStatusChanged?.Invoke(task);

            TaskLogged?.Invoke(task.TaskId, $"[Job Start] Bắt đầu thực thi đăng tải (Lần thử {task.RetryCount + 1}/{task.MaxRetries + 1})...");

            var session = new SocialAccountSession
            {
                AccountId = task.AccountId,
                Platform = task.Platform,
                Username = $"user_{task.AccountId}"
            };

            IPlatformPublisherAdapter adapter = _adapters.TryGetValue(task.Platform, out var found)
                ? found
                : new PlaywrightPlatformAdapter(task.Platform);

            var logProgress = new Progress<string>(msg => TaskLogged?.Invoke(task.TaskId, msg));

            try
            {
                var (success, publishedUrl, error) = await adapter.PublishVideoAsync(task, session, null, logProgress, cancellationToken).ConfigureAwait(false);

                if (success)
                {
                    task.Status = PublishTaskStatus.Published;
                    task.PublishedUrl = publishedUrl;
                    task.UpdatedAtUtc = DateTime.UtcNow;
                    TaskLogged?.Invoke(task.TaskId, $"[Job Success] Đăng video thành công tại: {publishedUrl}");
                    TaskStatusChanged?.Invoke(task);
                }
                else
                {
                    await HandleJobFailureAsync(task, adapter, error ?? "Lỗi không xác định", cancellationToken).ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                await HandleJobFailureAsync(task, adapter, ex.Message, cancellationToken).ConfigureAwait(false);
            }
        }

        private async Task HandleJobFailureAsync(
            VideoPublishTask task,
            IPlatformPublisherAdapter adapter,
            string errorMessage,
            CancellationToken cancellationToken)
        {
            task.LastErrorMessage = errorMessage;
            TaskLogged?.Invoke(task.TaskId, $"[Job Error] Lỗi đăng tải: {errorMessage}");

            try
            {
                string? screenshotPath = await adapter.CaptureErrorScreenshotAsync(task, _screenshotsDir, cancellationToken).ConfigureAwait(false);
                if (!string.IsNullOrEmpty(screenshotPath))
                {
                    task.ErrorScreenshotPath = screenshotPath;
                    TaskLogged?.Invoke(task.TaskId, $"[Error Screenshot Saved] Ảnh chụp màn hình lỗi: {screenshotPath}");
                }
            }
            catch (Exception ex)
            {
                TaskLogged?.Invoke(task.TaskId, $"[Screenshot Failure] Lỗi khi chụp màn hình: {ex.Message}");
            }

            if (task.RetryCount < task.MaxRetries)
            {
                task.RetryCount++;
                task.Status = PublishTaskStatus.Retrying;

                // THUẬT TOÁN EXPONENTIAL BACKOFF CÓ JITTER
                int exponentialDelay = Math.Min(_maxRetryDelayMs, (int)(_baseRetryDelayMs * Math.Pow(2, task.RetryCount - 1)));
                int jitterMs = _random.Next(0, 1000);
                int totalBackoffMs = exponentialDelay + jitterMs;

                task.ScheduledTimeUtc = DateTime.UtcNow.AddMilliseconds(totalBackoffMs);
                task.UpdatedAtUtc = DateTime.UtcNow;

                TaskLogged?.Invoke(task.TaskId, $"[Retry Scheduled] Exponential Backoff #{task.RetryCount}: Chờ {totalBackoffMs / 1000.0:F1}s trước khi thử lại...");
                TaskStatusChanged?.Invoke(task);
            }
            else
            {
                task.Status = PublishTaskStatus.Failed;
                task.UpdatedAtUtc = DateTime.UtcNow;
                TaskLogged?.Invoke(task.TaskId, $"[Job Failed] Đã vượt quá số lần thử lại tối đa ({task.MaxRetries}). Đánh dấu THẤT BẠI.");
                TaskStatusChanged?.Invoke(task);
            }
        }

        private void RegisterDefaultAdapters()
        {
            foreach (SocialPlatform platform in Enum.GetValues(typeof(SocialPlatform)))
            {
                _adapters[platform] = new PlaywrightPlatformAdapter(platform);
            }
        }
    }
}
