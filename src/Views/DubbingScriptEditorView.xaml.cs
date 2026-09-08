// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DubbingScriptEditorView.xaml.cs
// Target: C# .NET 9 WPF Code-Behind (Event Routing, Shortcuts & D3D Sync)
// ==============================================================================

using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using CreatorOS.Desktop.Wpf.ViewModels;

namespace CreatorOS.Desktop.Wpf.Views;

/// <summary>
/// Interaction logic for DubbingScriptEditorView.xaml
/// </summary>
public partial class DubbingScriptEditorView : UserControl
{
    public DubbingScriptEditorView()
    {
        InitializeComponent();
        
        // Thiết lập DataContext mặc định nếu chưa được gán bởi DI container
        if (DataContext == null)
        {
            DataContext = new DubbingScriptEditorViewModel();
        }

        Loaded += (_, _) =>
        {
            Focus();
        };
    }

    /// <summary>
    /// Nhấp đúp chuột vào bất kỳ dòng thoại nào: Trình phát D3DVideoCanvas tự động nhảy đến đúng StartSec.
    /// </summary>
    private void OnRowMouseDoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (sender is DataGridRow row && row.Item is DubbingScriptItemViewModel item)
        {
            if (DataContext is DubbingScriptEditorViewModel vm)
            {
                vm.SeekAndLoopSegmentCommand.Execute(item);
            }
        }
    }

    /// <summary>
    /// Hỗ trợ phím tắt Space (Tạm dừng/Phát) và Tab (Nghe thử TTS câu hiện tại).
    /// </summary>
    protected override void OnPreviewKeyDown(KeyEventArgs e)
    {
        base.OnPreviewKeyDown(e);

        if (DataContext is DubbingScriptEditorViewModel vm)
        {
            // Phím Space: Tạm dừng / Phát video (chỉ kích hoạt khi không đang gõ text trong TextBox)
            if (e.Key == Key.Space && !(Keyboard.FocusedElement is TextBox))
            {
                vm.ToggleVideoPlayPauseCommand.Execute(null);
                e.Handled = true;
            }
            // Phím Tab: Nghe thử câu hiện tại (khi focus ở ngoài TextBox nhập thoại)
            else if (e.Key == Key.Tab && !(Keyboard.FocusedElement is TextBox))
            {
                if (vm.SelectedItem != null)
                {
                    vm.PreviewTtsCommand.Execute(vm.SelectedItem);
                    e.Handled = true;
                }
            }
        }
    }
}
