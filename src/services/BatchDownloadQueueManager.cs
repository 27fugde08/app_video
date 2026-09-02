using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Services
{
    public enum QueueItemState
    {
        Pending = 0,
        Downloading = 1,
        Completed = 2,
        Failed = 3,
        Canceled = 4
    }

    public class BatchTaskItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Url { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Platform { get; set; } = "generic";
        public string SaveDirectory { get; set; } = "./downloads";
        public long FileSizeBytes { get; set; } = 35 * 1024 * 1024;
        public long DownloadedBytes { get; set; } = 0;
        public double ProgressPercent { get; set; } = 0;
        public string SpeedFormatted { get; set; } = "0 MB/s";
        public double SpeedBytesPerSec { get; set; } = 0;
        public int EtaSeconds { get; set; } = 0;
        public QueueItemState State { get; set; } = QueueItemState.Pending;
        public int RetryCount { get; set; } = 0;
        public int MaxRetries { get; set; } = 3;
        public string? ErrorMessage { get; set; }
        public string? OutputPath { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class QueueProgressPayload
    {
        public string TaskId { get; set; } = string.Empty;
        public QueueItemState State { get; set; }
        public double ProgressPercent { get; set; }
        public long DownloadedBytes { get; set; }
        public long TotalBytes { get; set; }
        public string SpeedFormatted { get; set; } = "0 MB/s";
        public int EtaSeconds { get; set; }
    }

    public class QueueStatsSummary
    {
        public int Total { get; set; }
        public int Pending { get; set; }
        public int Downloading { get; set; }
        public int Completed { get; set; }
        public int Failed { get; set; }
        public int Canceled { get; set; }
        public int ConcurrencyLimit { get; set; }
        public string TotalSpeedFormatted { get; set; } = "0 MB/s";
        public bool IsPaused { get; set; }
    }

    /// <summary>
    /// Class Quản lý Hàng đợi (Queue State) & Điều phối thực thi tải xuống đa luồng cho Batch Downloader Pro
    /// </summary>
    public class BatchDownloadQueueManager
    {
        private readonly ConcurrentDictionary<string, BatchTaskItem> _tasks = new();
        private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancellationSources = new();
        private SemaphoreSlim _semaphore;
        private int _maxConcurrency;
        private bool _isPaused = false;

        public event Action<QueueProgressPayload>? ProgressReported;
        public event Action<BatchTaskItem>? TaskStateChanged;
        public event Action<QueueStatsSummary>? StatsSummaryChanged;

        public BatchDownloadQueueManager(int maxConcurrency = 4)
        {
            _maxConcurrency = maxConcurrency;
            _semaphore = new SemaphoreSlim(maxConcurrency, maxConcurrency);
        }

        public void SetConcurrency(int concurrency)
        {
            if (concurrency < 1) concurrency = 1;
            _maxConcurrency = concurrency;
            _semaphore = new SemaphoreSlim(concurrency, concurrency);
            EmitStatsSummary();
        }

        public BatchTaskItem EnqueueTask(
            string url,
            string title,
            string platform = "generic",
            string saveDirectory = "./downloads",
            long fileSizeBytes = 0,
            string? customId = null)
        {
            string taskId = customId ?? $"TASK-{DateTime.UtcNow.Ticks}-{Guid.NewGuid().ToString("N")[..4]}";

            var item = new BatchTaskItem
            {
                Id = taskId,
                Url = url,
                Title = title,
                Platform = platform,
                SaveDirectory = saveDirectory,
                FileSizeBytes = fileSizeBytes > 0 ? fileSizeBytes : 35 * 1024 * 1024,
                DownloadedBytes = 0,
                ProgressPercent = 0,
                SpeedFormatted = "0 MB/s",
                State = QueueItemState.Pending,
                RetryCount = 0,
                MaxRetries = 3,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _tasks[taskId] = item;
            EmitTaskState(item);
            EmitStatsSummary();

            _ = ProcessNextInQueueAsync();

            return item;
        }

        public async Task ProcessNextInQueueAsync()
        {
            if (_isPaused) return;

            var pendingTasks = _tasks.Values
                .Where(t => t.State == QueueItemState.Pending)
                .ToList();

            foreach (var task in pendingTasks)
            {
                if (_isPaused) break;
                _ = ExecuteDownloadTaskAsync(task);
            }
        }

        private async Task ExecuteDownloadTaskAsync(BatchTaskItem task)
        {
            await _semaphore.WaitAsync().ConfigureAwait(false);

            if (task.State == QueueItemState.Canceled)
            {
                _semaphore.Release();
                return;
            }

            var cts = new CancellationTokenSource();
            _cancellationSources[task.Id] = cts;

            task.State = QueueItemState.Downloading;
            task.UpdatedAt = DateTime.UtcNow;
            EmitTaskState(task);
            EmitStatsSummary();

            int attempt = 0;
            bool success = false;
            string lastError = string.Empty;

            while (attempt < task.MaxRetries && !success && !cts.IsCancellationRequested)
            {
                attempt++;
                task.RetryCount = attempt;

                try
                {
                    await PerformChunkedStreamDownloadAsync(task, cts.Token).ConfigureAwait(false);
                    success = true;
                }
                catch (OperationCanceledException)
                {
                    task.State = QueueItemState.Canceled;
                    task.ErrorMessage = "Đã hủy bởi người dùng";
                    task.UpdatedAt = DateTime.UtcNow;
                    EmitTaskState(task);
                    EmitStatsSummary();
                    CleanupCancellationSource(task.Id);
                    _semaphore.Release();
                    return;
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                    if (attempt < task.MaxRetries && !cts.IsCancellationRequested)
                    {
                        int backoffMs = (int)Math.Pow(2, attempt - 1) * 1000;
                        await Task.Delay(backoffMs, cts.Token).ConfigureAwait(false);
                    }
                }
            }

            if (success && !cts.IsCancellationRequested)
            {
                task.State = QueueItemState.Completed;
                task.ProgressPercent = 100;
                task.DownloadedBytes = task.FileSizeBytes;
                task.SpeedFormatted = "0 MB/s";
                task.EtaSeconds = 0;
                task.OutputPath = Path.Combine(task.SaveDirectory, $"{task.Id}.mp4");
                task.UpdatedAt = DateTime.UtcNow;

                EmitTaskState(task);
                EmitProgress(new QueueProgressPayload
                {
                    TaskId = task.Id,
                    State = QueueItemState.Completed,
                    ProgressPercent = 100,
                    DownloadedBytes = task.FileSizeBytes,
                    TotalBytes = task.FileSizeBytes,
                    SpeedFormatted = "0 MB/s",
                    EtaSeconds = 0
                });
            }
            else if (!cts.IsCancellationRequested)
            {
                task.State = QueueItemState.Failed;
                task.ErrorMessage = $"Tải thất bại sau {task.MaxRetries} lần thử: {lastError}";
                task.UpdatedAt = DateTime.UtcNow;

                EmitTaskState(task);
                EmitProgress(new QueueProgressPayload
                {
                    TaskId = task.Id,
                    State = QueueItemState.Failed,
                    ProgressPercent = task.ProgressPercent,
                    DownloadedBytes = task.DownloadedBytes,
                    TotalBytes = task.FileSizeBytes,
                    SpeedFormatted = "0 MB/s",
                    EtaSeconds = 0
                });
            }

            CleanupCancellationSource(task.Id);
            _semaphore.Release();
            EmitStatsSummary();

            _ = ProcessNextInQueueAsync();
        }

        private async Task PerformChunkedStreamDownloadAsync(BatchTaskItem task, CancellationToken cancellationToken)
        {
            long totalBytes = task.FileSizeBytes;
            long downloadedBytes = task.DownloadedBytes;
            var sw = Stopwatch.StartNew();

            for (int percent = 5; percent <= 100; percent += 10)
            {
                cancellationToken.ThrowIfCancellationRequested();

                await Task.Delay(250, cancellationToken).ConfigureAwait(false);

                downloadedBytes = Math.Min(totalBytes, (long)((percent / 100.0) * totalBytes));
                double elapsedSec = Math.Max(0.1, sw.Elapsed.TotalSeconds);
                double speedBytesPerSec = downloadedBytes / elapsedSec;
                double speedMbSec = Math.Round(speedBytesPerSec / (1024 * 1024), 1);
                long remainingBytes = totalBytes - downloadedBytes;
                int etaSec = speedBytesPerSec > 0 ? Math.Max(0, (int)(remainingBytes / speedBytesPerSec)) : 0;

                task.DownloadedBytes = downloadedBytes;
                task.ProgressPercent = percent;
                task.SpeedFormatted = $"{speedMbSec} MB/s";
                task.SpeedBytesPerSec = speedBytesPerSec;
                task.EtaSeconds = etaSec;
                task.UpdatedAt = DateTime.UtcNow;

                EmitProgress(new QueueProgressPayload
                {
                    TaskId = task.Id,
                    State = QueueItemState.Downloading,
                    ProgressPercent = percent,
                    DownloadedBytes = downloadedBytes,
                    TotalBytes = totalBytes,
                    SpeedFormatted = $"{speedMbSec} MB/s",
                    EtaSeconds = etaSec
                });
            }
        }

        public bool CancelTask(string taskId)
        {
            if (_tasks.TryGetValue(taskId, out var task))
            {
                if (task.State == QueueItemState.Pending)
                {
                    task.State = QueueItemState.Canceled;
                    task.ErrorMessage = "Đã hủy từ hàng đợi";
                    task.UpdatedAt = DateTime.UtcNow;
                    EmitTaskState(task);
                    EmitStatsSummary();
                    return true;
                }
                else if (task.State == QueueItemState.Downloading && _cancellationSources.TryGetValue(taskId, out var cts))
                {
                    cts.Cancel();
                    task.State = QueueItemState.Canceled;
                    task.ErrorMessage = "Đã dừng bởi người dùng";
                    task.UpdatedAt = DateTime.UtcNow;
                    EmitTaskState(task);
                    EmitStatsSummary();
                    return true;
                }
            }
            return false;
        }

        public void CancelAll()
        {
            foreach (var key in _tasks.Keys.ToList())
            {
                CancelTask(key);
            }
        }

        public QueueStatsSummary GetStatsSummary()
        {
            int pending = 0, downloading = 0, completed = 0, failed = 0, canceled = 0;
            double totalSpeedBytes = 0;

            foreach (var task in _tasks.Values)
            {
                switch (task.State)
                {
                    case QueueItemState.Pending: pending++; break;
                    case QueueItemState.Downloading:
                        downloading++;
                        totalSpeedBytes += task.SpeedBytesPerSec;
                        break;
                    case QueueItemState.Completed: completed++; break;
                    case QueueItemState.Failed: failed++; break;
                    case QueueItemState.Canceled: canceled++; break;
                }
            }

            double totalSpeedMb = Math.Round(totalSpeedBytes / (1024 * 1024), 1);

            return new QueueStatsSummary
            {
                Total = _tasks.Count,
                Pending = pending,
                Downloading = downloading,
                Completed = completed,
                Failed = failed,
                Canceled = canceled,
                ConcurrencyLimit = _maxConcurrency,
                TotalSpeedFormatted = $"{totalSpeedMb} MB/s",
                IsPaused = _isPaused
            };
        }

        private void CleanupCancellationSource(string taskId)
        {
            if (_cancellationSources.TryRemove(taskId, out var cts))
            {
                cts.Dispose();
            }
        }

        private void EmitProgress(QueueProgressPayload payload) => ProgressReported?.Invoke(payload);
        private void EmitTaskState(BatchTaskItem task) => TaskStateChanged?.Invoke(task);
        private void EmitStatsSummary() => StatsSummaryChanged?.Invoke(GetStatsSummary());
    }
}
