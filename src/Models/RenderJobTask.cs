// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: RenderJobTask.cs
// Target: C# .NET 9 (Render Task Definitions & Messenger Contract)
// ==============================================================================

using System;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Core.Contracts;

/// <summary>
/// Đại diện cho một tác vụ Render / Multimedia xử lý nội bộ trong hệ thống.
/// </summary>
public sealed class RenderJobTask
{
    public string Id { get; init; } = Guid.NewGuid().ToString("N");
    public string Title { get; init; } = string.Empty;
    public JobType Type { get; init; } = JobType.FullPipelineExport;
    public JobStatus Status { get; set; } = JobStatus.Queued;
    public double Progress { get; set; }
    public string StatusMessage { get; set; } = "Đang chờ trong hàng đợi...";
    public DateTime QueuedAt { get; init; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? OutputPath { get; set; }
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Payload thực thi công việc bất đồng bộ (nhận IProgress và CancellationToken).
    /// </summary>
    public Func<IProgress<double>, CancellationToken, Task<string>>? ExecutionWorkload { get; init; }
}

/// <summary>
/// Sự kiện gửi qua WeakReferenceMessenger khi trạng thái RenderJobTask thay đổi.
/// </summary>
public sealed record RenderTaskStatusChangedMessage(RenderJobTask Task);

/// <summary>
/// Sự kiện gửi qua WeakReferenceMessenger khi tiến trình của RenderJobTask cập nhật.
/// </summary>
public sealed record RenderTaskProgressMessage(string TaskId, double Progress, string StatusMessage);
