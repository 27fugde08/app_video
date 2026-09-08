// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: BatchDownloadView.xaml.cs
// Target: C# .NET 9 WPF Code-Behind (Event Routing & Deterministic Action Handling)
// ==============================================================================

using System.Windows;
using System.Windows.Controls;
using CreatorOS.Desktop.Wpf.ViewModels;

namespace CreatorOS.Desktop.Wpf.Views;

public partial class BatchDownloadView : UserControl
{
    public BatchDownloadView()
    {
        InitializeComponent();
    }

    private void OnToggleItemPauseClick(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement { DataContext: DownloadTaskItemViewModel item })
        {
            item.TogglePause();
        }
    }

    private void OnOpenFolderClick(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement { DataContext: DownloadTaskItemViewModel item })
        {
            item.OpenContainingFolder();
        }
    }

    private void OnCancelItemClick(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement { DataContext: DownloadTaskItemViewModel item })
        {
            item.Cancel();
        }
    }
}
