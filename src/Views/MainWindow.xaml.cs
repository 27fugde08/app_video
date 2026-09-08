using System.Windows;
using System.Windows.Input;
using CreatorOS.Desktop.Wpf.ViewModels;

namespace CreatorOS.Desktop.Wpf.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContext = new MainShellViewModel();
    }

    public MainWindow(MainShellViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
    }

    protected override void OnMouseLeftButtonDown(MouseButtonEventArgs e)
    {
        base.OnMouseLeftButtonDown(e);
        // Drag window if click origin is in custom header region (top 44px)
        if (e.GetPosition(this).Y <= 44 && e.ButtonState == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }
}
