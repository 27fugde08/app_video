// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: App.xaml.cs
// Target: C# .NET 9 (WPF Composition Root & Dependency Injection Configuration)
// ==============================================================================

using System;
using System.IO;
using System.Windows;
using Microsoft.Extensions.DependencyInjection;
using CreatorOS.Core.Contracts;
using CreatorOS.Core.Services;
using CreatorOS.Desktop.Wpf.ViewModels;
using CreatorOS.Desktop.Wpf.Views;

namespace CreatorOS.Desktop.Wpf;

/// <summary>
/// App.xaml.cs: Điểm khởi tạo cấu hình Dependency Injection (IoC Container) nội bộ cho CreatorOS Desktop.
/// 100% In-Process, Standalone WPF Desktop App, không chứa bất kỳ kết nối mạng ngoài hay Message Broker nào.
/// </summary>
public partial class App : Application
{
    private static IServiceProvider? _serviceProvider;

    public static IServiceProvider Services => _serviceProvider 
        ?? throw new InvalidOperationException("IoC Container chưa được khởi tạo.");

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var services = new ServiceCollection();
        ConfigureServices(services);

        _serviceProvider = services.BuildServiceProvider();

        // Khởi tạo và hiển thị MainWindow từ IoC Container
        var mainWindow = _serviceProvider.GetRequiredService<MainWindow>();
        mainWindow.Show();
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        // ----------------------------------------------------------------------
        // 1. Core Services, In-Memory Queue & Native Engines (Singleton)
        // ----------------------------------------------------------------------
        services.AddSingleton<SettingsService>();
        
        services.AddSingleton<IInMemoryJobQueue>(sp =>
        {
            var settings = sp.GetRequiredService<SettingsService>();
            return new InMemoryJobQueue(
                maxConcurrentGpuJobs: settings.Current.MaxConcurrentGpuJobs,
                queueCapacity: 200
            );
        });

        // Đăng ký NativeProcessRunner dạng Transient/Factory để mỗi Job có ngữ cảnh Process cô lập
        services.AddTransient<NativeProcessRunner>();

        // Native Multimedia Processing Engines
        services.AddSingleton<HardwareGovernor>();
        services.AddSingleton<NativeVideoOrchestrator>();
        services.AddSingleton<AdaptiveStreamMuxer>();
        services.AddSingleton<AudioDuckingEngine>();
        services.AddSingleton<AudioStemSeparator>();
        services.AddSingleton<DynamicSubtitleGenerator>();
        services.AddSingleton<HighlightExtractor>();
        services.AddSingleton<ChannelBatchScanner>();
        services.AddSingleton<AssetBundleDownloader>();
        services.AddSingleton<WindowsAppControlRemediator>();

        // ----------------------------------------------------------------------
        // 2. ViewModels (MVVM Pattern)
        // ----------------------------------------------------------------------
        services.AddSingleton<MainViewModel>();
        services.AddSingleton<DownloadBatchViewModel>();

        // ----------------------------------------------------------------------
        // 3. Views & Windows
        // ----------------------------------------------------------------------
        services.AddSingleton<MainWindow>();
        services.AddTransient<JobQueueListView>();
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        if (_serviceProvider is IAsyncDisposable asyncDisposable)
        {
            await asyncDisposable.DisposeAsync().ConfigureAwait(false);
        }
        else if (_serviceProvider is IDisposable disposable)
        {
            disposable.Dispose();
        }

        base.OnExit(e);
    }
}
