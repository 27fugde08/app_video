// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DubbingProgressBridge.cs
// Target: C# .NET 9 WPF (Zero-UI-Jank Progress Dispatcher & Bounded Channel Throttler)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace CreatorOS.Core.Services;

/// <summary>
/// Bản ghi cập nhật trạng thái và tiến độ của một tác vụ lồng tiếng
/// </summary>
public sealed record JobProgressUpdate(
    string JobId,
    string VideoTitle,
    PipelineStage Stage,
    double ProgressPercent,
    string StageBadgeText,
    string BadgeHexColor,
    string BadgeBgHexColor,
    double VramUsagePercent,
    string GpuModeStatus,
    string? LogMessage = null,
    bool IsCompleted = false,
    bool IsFailed = false,
    string? ErrorMessage = null,
    DateTime TimestampUtc = default
)
{
    public DateTime TimestampUtc { get; init; } = TimestampUtc == default ? DateTime.UtcNow : TimestampUtc;
}

/// <summary>
/// Metric phần cứng đồ họa phục vụ hiển thị trên thanh Header
/// </summary>
public sealed record HardwareGpuMetrics(
    double VramUsagePercent,
    double DedicatedMemoryUsedMb,
    double DedicatedMemoryTotalMb,
    string StatusDescription,
    int ActiveNvencEncoders,
    int ActiveInpaintingJobs
);

/// <summary>
/// DubbingProgressBridge: Bộ điều tiết tiến trình tránh nghẽn luồng UI (Dispatcher)
/// - Sử dụng BoundedChannel(10) với chính sách DropOldest để loại bỏ các frame trung gian dư thừa.
/// - Định thời nhịp đập 100ms bằng PeriodicTimer để gom cụm (Batching) các cập nhật.
/// - Đảm bảo giao diện WPF luôn duy trì tốc độ khung hình 60 FPS chuẩn xác, không giật lag khi có hàng chục video chạy song song.
/// </summary>
public sealed class DubbingProgressBridge : IDisposable, IAsyncDisposable
{
    private const int BoundedChannelCapacity = 10;
    private const int DispatchIntervalMs = 100;

    private readonly Channel<JobProgressUpdate> _progressChannel;
    private readonly HardwareGovernor _hardwareGovernor;
    private readonly CancellationTokenSource _cts = new();

    private Task? _dispatchLoopTask;
    private bool _disposed;

    public event Action<IReadOnlyList<JobProgressUpdate>, HardwareGpuMetrics>? BatchUpdatesDispatched;

    public DubbingProgressBridge(HardwareGovernor? hardwareGovernor = null)
    {
        _hardwareGovernor = hardwareGovernor ?? new HardwareGovernor();

        // Khởi tạo Bounded Channel với chính sách DropOldest
        var options = new BoundedChannelOptions(BoundedChannelCapacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        };

        _progressChannel = Channel.CreateBounded<JobProgressUpdate>(options);
    }

    /// <summary>
    /// Bắt đầu vòng lặp gom cụm 100ms
    /// </summary>
    public void Start()
    {
        if (_dispatchLoopTask != null) return;
        _dispatchLoopTask = Task.Run(DispatchLoopAsync);
    }

    /// <summary>
    /// Đẩy 1 cập nhật tiến trình vào kênh Bounded (Non-blocking)
    /// </summary>
    public bool PostProgress(JobProgressUpdate update)
    {
        if (_disposed) return false;
        return _progressChannel.Writer.TryWrite(update);
    }

    /// <summary>
    /// Vòng lặp đọc ngầm tiêu thụ theo nhịp 100ms (PeriodicTimer)
    /// </summary>
    private async Task DispatchLoopAsync()
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(DispatchIntervalMs));
        var batchBuffer = new Dictionary<string, JobProgressUpdate>();

        try
        {
            while (await timer.WaitForNextTickAsync(_cts.Token).ConfigureAwait(false))
            {
                // 1. Hút cạn toàn bộ items đang có trong Bounded Channel
                while (_progressChannel.Reader.TryRead(out var update))
                {
                    // Giữ lại bản ghi mới nhất của từng JobId
                    batchBuffer[update.JobId] = update;
                }

                // 2. Truy vấn chỉ số phần cứng GPU/VRAM tức thời
                var vramMetrics = _hardwareGovernor.QueryGpuMemoryMetrics();
                var gpuStatus = _hardwareGovernor.CanScheduleDualPipeline()
                    ? "VRAM < 75%: Đủ tài nguyên chạy song song Demucs + NVENC"
                    : (vramMetrics.UsagePercent >= HardwareGovernor.VramEmergencyInpaintingThresholdPercent
                        ? "VRAM >= 88%: Cảnh báo! Tự động hạ cấp Inpainting sang FastDelogo"
                        : "VRAM > 75%: Điều tiết tuần tự 1 tác vụ GPU tại một thời điểm");

                var hwMetrics = new HardwareGpuMetrics(
                    VramUsagePercent: vramMetrics.UsagePercent,
                    DedicatedMemoryUsedMb: vramMetrics.UsedMb,
                    DedicatedMemoryTotalMb: vramMetrics.TotalMb,
                    StatusDescription: gpuStatus,
                    ActiveNvencEncoders: _hardwareGovernor.ActiveNvencCount,
                    ActiveInpaintingJobs: 0
                );

                // 3. Nếu có cập nhật hoặc định kỳ mỗi nhịp, phát sự kiện gom cụm
                if (batchBuffer.Count > 0)
                {
                    var items = new List<JobProgressUpdate>(batchBuffer.Values);
                    batchBuffer.Clear();

                    BatchUpdatesDispatched?.Invoke(items, hwMetrics);
                }
                else
                {
                    // Phát cập nhật GPU metrics ngay cả khi không có job mới
                    BatchUpdatesDispatched?.Invoke(Array.Empty<JobProgressUpdate>(), hwMetrics);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Shutdown bình thường
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DubbingProgressBridge Exception] {ex.Message}");
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _cts.Cancel();
        _progressChannel.Writer.TryComplete();
        _cts.Dispose();
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        _cts.Cancel();
        _progressChannel.Writer.TryComplete();

        if (_dispatchLoopTask != null)
        {
            try
            {
                await _dispatchLoopTask.ConfigureAwait(false);
            }
            catch { }
        }

        _cts.Dispose();
        GC.SuppressFinalize(this);
    }
}
