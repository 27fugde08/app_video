// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: InMemoryJobQueue.cs
// Target: C# .NET 9 (In-Process Channel<RenderJobTask> Queue & SemaphoreSlim Throttling)
// ==============================================================================

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.Messaging;
using CreatorOS.Core.Contracts;

namespace CreatorOS.Core.Services;

public interface IInMemoryJobQueue : IAsyncDisposable, IDisposable
{
    ValueTask<bool> EnqueueAsync(RenderJobTask task, CancellationToken ct = default);
    bool TryCancelTask(string taskId);
    IReadOnlyList<RenderJobTask> GetAllTasks();
    RenderJobTask? GetTask(string taskId);
}

/// <summary>
/// InMemoryJobQueue: Hàng đợi tác vụ in-process hiệu năng cao thay thế Redis/BullMQ/Celery.
/// 
/// Karpathy Engineering Principles:
/// 1. Thread Execution Context:
///    - Worker tiêu thụ các tác vụ qua Channel.Reader.ReadAllAsync(ct) trên background ThreadPool.
///    - Không gây nghẽn UI Dispatcher.
/// 2. Điều Tiết Tải Phần Cứng (Hardware Throttling):
///    - Dùng SemaphoreSlim(2, 2) hoặc (3, 3) để khống chế nghiêm ngặt tối đa 2-3 tác vụ GPU NVENC đồng thời.
///    - Tránh bão hòa bộ nhớ VRAM và quá nhiệt GPU.
/// 3. In-Process Event Bus & Zero Memory Leaks:
///    - Gửi RenderTaskStatusChangedMessage và RenderTaskProgressMessage qua WeakReferenceMessenger.
///    - Quản lý tài nguyên unmanaged và hủy tác vụ deterministic qua CancellationTokenSource per task.
/// </summary>
public sealed class InMemoryJobQueue : IInMemoryJobQueue, IJobQueue
{
    private readonly Channel<RenderJobTask> _channel;
    private readonly SemaphoreSlim _hardwareThrottleSemaphore;
    private readonly ConcurrentDictionary<string, RenderJobTask> _tasks = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _taskCts = new();
    private readonly CancellationTokenSource _queueCts = new();
    private readonly Task _consumerWorkerTask;
    private bool _disposed;

    public InMemoryJobQueue(int maxConcurrentGpuJobs = 2, int queueCapacity = 200)
    {
        // Khống chế tối đa 2-3 tác vụ GPU đồng thời
        int concurrencyLimit = Math.Clamp(maxConcurrentGpuJobs, 1, 3);
        _hardwareThrottleSemaphore = new SemaphoreSlim(concurrencyLimit, concurrencyLimit);

        var channelOptions = new BoundedChannelOptions(queueCapacity)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleWriter = false,
            SingleReader = true
        };

        _channel = Channel.CreateBounded<RenderJobTask>(channelOptions);
        _consumerWorkerTask = Task.Run(ProcessQueueWorkerLoopAsync);
    }

    public async ValueTask<bool> EnqueueAsync(RenderJobTask task, CancellationToken ct = default)
    {
        ThrowIfDisposed();
        ArgumentNullException.ThrowIfNull(task);

        task.Status = JobStatus.Queued;
        task.Progress = 0.0;
        task.StatusMessage = "Đang chờ trong hàng đợi...";

        _tasks[task.Id] = task;
        _taskCts[task.Id] = CancellationTokenSource.CreateLinkedTokenSource(ct, _queueCts.Token);

        // Phát thông điệp trạng thái qua WeakReferenceMessenger
        WeakReferenceMessenger.Default.Send(new RenderTaskStatusChangedMessage(task));

        await _channel.Writer.WriteAsync(task, ct).ConfigureAwait(false);
        return true;
    }

    public bool TryCancelTask(string taskId)
    {
        if (_taskCts.TryGetValue(taskId, out var cts))
        {
            cts.Cancel();

            if (_tasks.TryGetValue(taskId, out var task) && task.Status == JobStatus.Queued)
            {
                task.Status = JobStatus.Cancelled;
                task.StatusMessage = "Đã hủy tác vụ.";
                WeakReferenceMessenger.Default.Send(new RenderTaskStatusChangedMessage(task));
            }
            return true;
        }
        return false;
    }

    public IReadOnlyList<RenderJobTask> GetAllTasks()
    {
        return _tasks.Values.ToArray();
    }

    public RenderJobTask? GetTask(string taskId)
    {
        return _tasks.GetValueOrDefault(taskId);
    }

    private async Task ProcessQueueWorkerLoopAsync()
    {
        var token = _queueCts.Token;

        try
        {
            // Đọc liên tục các tác vụ qua ReadAllAsync()
            await foreach (var task in _channel.Reader.ReadAllAsync(token).ConfigureAwait(false))
            {
                if (token.IsCancellationRequested) break;

                // Điều tiết tải phần cứng: Chờ slot GPU trống từ SemaphoreSlim
                await _hardwareThrottleSemaphore.WaitAsync(token).ConfigureAwait(false);

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ExecuteTaskPayloadAsync(task).ConfigureAwait(false);
                    }
                    finally
                    {
                        _hardwareThrottleSemaphore.Release();
                    }
                }, token);
            }
        }
        catch (OperationCanceledException)
        {
            // Consumer worker kết thúc an toàn
        }
    }

    private async Task ExecuteTaskPayloadAsync(RenderJobTask task)
    {
        if (!_taskCts.TryGetValue(task.Id, out var taskCts) || taskCts.IsCancellationRequested)
        {
            task.Status = JobStatus.Cancelled;
            task.StatusMessage = "Tác vụ đã bị hủy.";
            WeakReferenceMessenger.Default.Send(new RenderTaskStatusChangedMessage(task));
            return;
        }

        task.Status = JobStatus.Processing;
        task.StartedAt = DateTime.UtcNow;
        task.StatusMessage = "Đang xử lý...";
        WeakReferenceMessenger.Default.Send(new RenderTaskStatusChangedMessage(task));

        var progressReporter = new Progress<double>(pct =>
        {
            task.Progress = Math.Clamp(pct, 0.0, 100.0);
            WeakReferenceMessenger.Default.Send(new RenderTaskProgressMessage(task.Id, task.Progress, task.StatusMessage));
        });

        try
        {
            if (task.ExecutionWorkload != null)
            {
                var outputPath = await task.ExecutionWorkload(progressReporter, taskCts.Token).ConfigureAwait(false);
                task.OutputPath = outputPath;
            }

            task.Status = JobStatus.Completed;
            task.Progress = 100.0;
            task.StatusMessage = "Hoàn tất thành công.";
            task.CompletedAt = DateTime.UtcNow;
        }
        catch (OperationCanceledException)
        {
            task.Status = JobStatus.Cancelled;
            task.StatusMessage = "Đã dừng bởi người dùng.";
            task.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            task.Status = JobStatus.Failed;
            task.ErrorMessage = ex.Message;
            task.StatusMessage = $"Lỗi: {ex.Message}";
            task.CompletedAt = DateTime.UtcNow;
        }
        finally
        {
            _taskCts.TryRemove(task.Id, out var cts);
            cts?.Dispose();
            WeakReferenceMessenger.Default.Send(new RenderTaskStatusChangedMessage(task));
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _queueCts.Cancel();
        _channel.Writer.TryComplete();

        foreach (var cts in _taskCts.Values)
        {
            try { cts.Cancel(); cts.Dispose(); } catch { }
        }
        _taskCts.Clear();

        _hardwareThrottleSemaphore.Dispose();
        _queueCts.Dispose();
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        _queueCts.Cancel();
        _channel.Writer.TryComplete();

        try
        {
            await _consumerWorkerTask.ConfigureAwait(false);
        }
        catch { }

        Dispose();
    }

    private void ThrowIfDisposed() => ObjectDisposedException.ThrowIf(_disposed, this);
}
