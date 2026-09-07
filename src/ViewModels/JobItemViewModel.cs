// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: JobItemViewModel.cs
// Target: C# .NET 9 (WPF MVVM Job Item with Observable Properties)
// ==============================================================================

using System;
using System.Diagnostics;
using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CreatorOS.Core.Contracts;

namespace CreatorOS.Desktop.Wpf.ViewModels;

/// <summary>
/// JobItemViewModel: Biểu diễn một tác vụ render/download trong danh sách UI WPF ảo hóa.
/// </summary>
public sealed partial class JobItemViewModel : ObservableObject
{
    public string Id { get; }

    [ObservableProperty]
    private string _title = string.Empty;

    [ObservableProperty]
    private JobType _type = JobType.FullPipelineExport;

    [ObservableProperty]
    private JobStatus _status = JobStatus.Queued;

    [ObservableProperty]
    private double _progress;

    [ObservableProperty]
    private double _fps;

    [ObservableProperty]
    private double _speedRatio;

    [ObservableProperty]
    private string _etaString = "--:--";

    [ObservableProperty]
    private string _statusText = "Đang chờ...";

    [ObservableProperty]
    private string? _outputPath;

    [ObservableProperty]
    private string? _errorMessage;

    public DateTime QueuedAt { get; } = DateTime.UtcNow;

    public JobItemViewModel(string id, string title, JobType type)
    {
        Id = id;
        _title = title;
        _type = type;
    }

    public static JobItemViewModel FromModel(JobItem item)
    {
        return new JobItemViewModel(item.Id, item.Title, item.Type)
        {
            Status = item.Status,
            Progress = item.Progress,
            StatusText = item.StatusMessage,
            OutputPath = item.OutputPath,
            ErrorMessage = item.ErrorMessage
        };
    }

    [RelayCommand]
    private void OpenExportFolder()
    {
        if (string.IsNullOrWhiteSpace(OutputPath)) return;

        try
        {
            if (File.Exists(OutputPath))
            {
                Process.Start("explorer.exe", $"/select,\"{OutputPath}\"");
            }
            else if (Directory.Exists(OutputPath))
            {
                Process.Start("explorer.exe", $"\"{OutputPath}\"");
            }
        }
        catch { }
    }
}
