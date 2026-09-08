// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: JobQueueViewModel.cs
// Target: C# .NET 9 (WPF MVVM Job Queue with 100ms PeriodicTimer Dispatcher Throttling)
// ==============================================================================

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using CreatorOS.Core.Contracts;
using CreatorOS.Core.Services;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// Snapshot tiến độ gọn nhẹ, zero-allocation struct cho hàng đợi log tần số cao.
/// </summary>
public readonly record struct JobProgressInfo(
    string JobId,
    double ProgressPercentage,
    double CurrentFps,
    string StatusText,
    string EtaFormatted
);

/// <summary>
/// JobQueueViewModel: Quản lý danh sách hàng đợi tác vụ render và download.
/// 
/// Karpathy Engineering Principles:
/// 1. Thread Execution Context:
///    - Background worker đẩy log tần suất cao (&gt;2.000 events/giây) vào ConcurrentQueue.
///    - PeriodicTimer chu kỳ 100ms chỉ tổng hợp snapshot mới nhất và gọi Dispatcher 1 lần duy nhất.
///    - Không bao giờ block hay tăng tải trên WPF Dispatcher (UI Thread CPU &lt; 2%).
/// 2. Simplicity First (MVVM):
///    - Kế thừa ObservableObject, sử dụng [ObservableProperty] và [RelayCommand].
///    - Quản lý danh sách tác vụ qua ObservableCollection&lt;JobItemViewModel&gt;.
/// 3. In-Process Event Messenger:
///    - Đăng ký nhận RenderTaskStatusChangedMessage và RenderTaskProgressMessage không gây rò rỉ bộ nhớ.
/// </summary>
public sealed partial class JobQueueViewModel : ObservableObject, 
    IRecipient<RenderTaskStatusChangedMessage>, 
    IRecipient<RenderTaskProgressMessage>, 
    IAsyncDisposable, 
    IDisposable
{
    private readonly IInMemoryJobQueue _jobQueue;
    private readonly ConcurrentQueue<JobProgressInfo> _logBuffer = new();
    private readonly CancellationTokenSource _throttlerCts = new();
    private readonly Task _throttlerLoopTask;
    private bool _disposed;

    public ObservableCollection<JobItemViewModel> TaskList { get; } = new();

    [ObservableProperty]
    private JobItemViewModel? _selectedTask;

    [ObservableProperty]
    private int _queuedCount;

    [ObservableProperty]
    private int _processingCount;

    [ObservableProperty]
    private int _completedCount;

    [ObservableProperty]
    private double _totalProgress;

    [ObservableProperty]
    private string _queueStatusText = "Hàng đợi sẵn sàng (60 FPS Native Engine)";

    public JobQueueViewModel()
        : this(new InMemoryJobQueue())
    {
    }

    public JobQueueViewModel(IInMemoryJobQueue jobQueue)
    {
        _jobQueue = jobQueue;

        // Đăng ký nhận message nội bộ qua WeakReferenceMessenger
        WeakReferenceMessenger.Default.Register<RenderTaskStatusChangedMessage>(this);
        WeakReferenceMessenger.Default.Register<RenderTaskProgressMessage>(this);

        // Khởi động luồng điều tiết (Throttler Loop) nhịp 100ms
        _throttlerLoopTask = Task.Run(RunDispatcherThrottlerLoopAsync);

        // Đồng bộ danh sách ban đầu nếu có
        LoadInitialTasks();
    }

    private void LoadInitialTasks()
    {
        var existing = _jobQueue.GetAllTasks();
        foreach (var task in existing)
        {
            TaskList.Add(new JobItemViewModel(task.Id, task.Title, task.Type)
            {
                Status = task.Status,
                Progress = task.Progress,
                StatusText = task.StatusMessage,
                OutputPath = task.OutputPath,
                ErrorMessage = task.ErrorMessage
            });
        }
        RecalculateTaskMetrics();
    }

    public void Receive(RenderTaskStatusChangedMessage message)
    {
        var task = message.Task;
        Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var item = TaskList.FirstOrDefault(t => t.Id == task.Id);
            if (item == null)
            {
                TaskList.Insert(0, new JobItemViewModel(task.Id, task.Title, task.Type)
                {
                    Status = task.Status,
                    Progress = task.Progress,
                    StatusText = task.StatusMessage,
                    OutputPath = task.OutputPath,
                    ErrorMessage = task.ErrorMessage
                });
            }
            else
            {
                item.Status = task.Status;
                item.Progress = task.Progress;
                item.StatusText = task.StatusMessage;
                item.OutputPath = task.OutputPath;
                item.ErrorMessage = task.ErrorMessage;
            }

            RecalculateTaskMetrics();
        }, System.Windows.Threading.DispatcherPriority.Normal);
    }

    public void Receive(RenderTaskProgressMessage message)
    {
        // Nhận log tần suất cao: CHỈ enqueue vào buffer, TUYỆT ĐỐI KHÔNG gọi Dispatcher ở đây
        _logBuffer.Enqueue(new JobProgressInfo(
            JobId: message.TaskId,
            ProgressPercentage: message.Progress,
            CurrentFps: 0.0,
            StatusText: message.StatusMessage,
            EtaFormatted: "--:--"
        ));
    }

    /// <summary>
    /// Cho phép các worker khác trực tiếp nạp log vào bộ đệm điều tiết.
    /// </summary>
    public void PushProgressLog(JobProgressInfo log)
    {
        _logBuffer.Enqueue(log);
    }

    private async Task RunDispatcherThrottlerLoopAsync()
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(100));
        var token = _throttlerCts.Token;

        try
        {
            while (await timer.WaitForNextTickAsync(token).ConfigureAwait(false))
            {
                if (_logBuffer.IsEmpty) continue;

                // Rút toàn bộ buffer và chỉ lưu snapshot mới nhất của mỗi JobId
                var latestMap = new Dictionary<string, JobProgressInfo>();
                while (_logBuffer.TryDequeue(out var log))
                {
                    latestMap[log.JobId] = log;
                }

                if (latestMap.Count == 0) continue;

                // Dispatcher Invoke 1 lần duy nhất cho toàn bộ danh sách mỗi 100ms
                await Application.Current.Dispatcher.InvokeAsync(() =>
                {
                    foreach (var (jobId, log) in latestMap)
                    {
                        var taskVm = TaskList.FirstOrDefault(t => t.Id == jobId);
                        if (taskVm != null)
                        {
                            taskVm.Progress = log.ProgressPercentage;
                            taskVm.Fps = log.CurrentFps;
                            taskVm.StatusText = log.StatusText;
                            taskVm.EtaString = log.EtaFormatted;
                        }
                    }

                    RecalculateTaskMetrics();
                }, System.Windows.Threading.DispatcherPriority.Background);
            }
        }
        catch (OperationCanceledException) { }
    }

    private void RecalculateTaskMetrics()
    {
        QueuedCount = TaskList.Count(t => t.Status == JobStatus.Queued);
        ProcessingCount = TaskList.Count(t => t.Status == JobStatus.Processing);
        CompletedCount = TaskList.Count(t => t.Status == JobStatus.Completed);

        if (TaskList.Count > 0)
        {
            TotalProgress = Math.Round(TaskList.Average(t => t.Progress), 1);
        }
        else
        {
            TotalProgress = 0.0;
        }
    }

    [RelayCommand]
    private void CancelJob(JobItemViewModel? taskVm)
    {
        if (taskVm == null) return;
        _jobQueue.TryCancelTask(taskVm.Id);
    }

    [RelayCommand]
    private async Task RetryJobAsync(JobItemViewModel? taskVm)
    {
        if (taskVm == null) return;
        var existing = _jobQueue.GetTask(taskVm.Id);
        if (existing != null && (existing.Status == JobStatus.Cancelled || existing.Status == JobStatus.Failed))
        {
            await _jobQueue.EnqueueAsync(existing);
        }
    }

    [RelayCommand]
    private void OpenOutputFolder(JobItemViewModel? taskVm)
    {
        var targetPath = taskVm?.OutputPath;
        if (string.IsNullOrWhiteSpace(targetPath))
        {
            targetPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "CreatorOS", "Exports");
        }

        try
        {
            if (File.Exists(targetPath))
            {
                Process.Start("explorer.exe", $"/select,\"{targetPath}\"");
            }
            else
            {
                if (!Directory.Exists(targetPath)) Directory.CreateDirectory(targetPath);
                Process.Start("explorer.exe", targetPath);
            }
        }
        catch { }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _throttlerCts.Cancel();
        _throttlerCts.Dispose();
        WeakReferenceMessenger.Default.UnregisterAll(this);
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        _throttlerCts.Cancel();
        try
        {
            await _throttlerLoopTask.ConfigureAwait(false);
        }
        catch { }

        Dispose();
    }
}
