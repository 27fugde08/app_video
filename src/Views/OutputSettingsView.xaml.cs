// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: OutputSettingsView.xaml.cs
// Target: C# .NET 9 WPF View Code-Behind
// ==============================================================================

using System.Windows.Controls;
using CreatorOS.Desktop.Wpf.ViewModels;

namespace CreatorOS.Desktop.Wpf.Views;

public partial class OutputSettingsView : UserControl
{
    public OutputSettingsView()
    {
        InitializeComponent();
        DataContext = new OutputSettingsViewModel();
    }
}
