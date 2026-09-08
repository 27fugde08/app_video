// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: ServiceContainer.cs
// Target: C# .NET 9 (Unified IoC Container & Dependency Injection Root)
// ==============================================================================

using System;
using Microsoft.Extensions.DependencyInjection;
using CreatorOS.Core.Contracts;
using CreatorOS.Core.Services;
using CreatorOS.Desktop.Wpf.ViewModels;
using CreatorOS.Desktop.Wpf.Views;

namespace CreatorOS.Infrastructure;

/// <summary>
/// ServiceContainer: Cấu hình và quản lý Dependency Injection toàn bộ 14 module hạt nhân của CreatorOS Desktop.
/// Đảm bảo 100% In-Process, Single Source of Truth và vòng đời dịch vụ tối ưu (Singleton vs Transient).
/// </summary>
public static class ServiceContainer
{
    public static IServiceProvider Build()
    {
        var services = new ServiceCollection();
        ConfigureServices(services);
        return services.BuildServiceProvider();
    }

    public static void ConfigureServices(IServiceCollection services)
    {
        // ----------------------------------------------------------------------
        // 1. Core Singletons (Hardware Governor, Master Dispatcher & Databases)
        // ----------------------------------------------------------------------
        services.AddSingleton<SettingsService>();
        services.AddSingleton<HardwareGovernor>();
        services.AddSingleton<MasterJobDispatcher>();
        services.AddSingleton<VideoIndexDatabase>();
        services.AddSingleton<VideoCatalogService>();
        services.AddSingleton<AccountCredentialVault>();
        services.AddSingleton<BackgroundScheduleEngine>();
        services.AddSingleton<PlatformPublishService>();

        services.AddSingleton<IInMemoryJobQueue>(sp =>
        {
            var settings = sp.GetRequiredService<SettingsService>();
            return new InMemoryJobQueue(
                maxConcurrentGpuJobs: settings.Current.MaxConcurrentGpuJobs,
                queueCapacity: 500
            );
        });
        services.AddSingleton<IJobQueue>(sp => (IJobQueue)sp.GetRequiredService<IInMemoryJobQueue>());

        // ----------------------------------------------------------------------
        // 2. Multimedia Processing & AI Engines (Transient / Factory)
        // ----------------------------------------------------------------------
        services.AddTransient<NativeProcessRunner>();
        services.AddTransient<NativeVideoOrchestrator>();
        services.AddTransient<AdaptiveStreamMuxer>();
        services.AddTransient<AudioDuckingEngine>();
        services.AddTransient<AudioStemSeparator>();
        services.AddTransient<AcousticStudioEngine>();
        services.AddTransient<DynamicSubtitleGenerator>();
        services.AddTransient<FastSegmentDownloader>();
        services.AddTransient<NativeDubbingOrchestrator>();
        services.AddTransient<GeminiDirectorClient>();
        services.AddTransient<HighlightExtractor>();
        services.AddTransient<ChannelBatchScanner>();
        services.AddTransient<CdnUrlExtractor>();
        services.AddTransient<AssetBundleDownloader>();
        services.AddTransient<TimelineCompiler>();
        services.AddTransient<SubjectMattingService>();
        services.AddTransient<Wav2LipInferenceService>();
        services.AddTransient<TranslationAndVoiceSync>();
        services.AddTransient<ShieldFilterPipeline>();
        services.AddTransient<Thumbnail3DComposer>();
        services.AddTransient<WindowsAppControlRemediator>();

        // ----------------------------------------------------------------------
        // 3. ViewModels (MVVM Pattern)
        // ----------------------------------------------------------------------
        services.AddSingleton<MainShellViewModel>();
        services.AddSingleton<MainViewModel>();
        services.AddTransient<BatchDownloadViewModel>();
        services.AddTransient<DownloadBatchViewModel>();
        services.AddTransient<TimelineEditorViewModel>();
        services.AddTransient<DubbingViewModel>();
        services.AddTransient<DubbingScriptEditorViewModel>();
        services.AddTransient<LipSyncViewModel>();
        services.AddTransient<ContentIdShieldViewModel>();
        services.AddTransient<ThumbnailSeoViewModel>();
        services.AddTransient<PublisherViewModel>();
        services.AddTransient<VoiceStudioViewModel>();
        services.AddTransient<JobQueueViewModel>();

        // ----------------------------------------------------------------------
        // 4. Views & Shell Navigation
        // ----------------------------------------------------------------------
        services.AddSingleton<MainWindow>();
        services.AddTransient<JobQueueListView>();
        services.AddTransient<BatchDownloadView>();
        services.AddTransient<TimelineEditorView>();
        services.AddTransient<DubbingView>();
        services.AddTransient<DubbingScriptEditorView>();
        services.AddTransient<LipSyncView>();
        services.AddTransient<ContentIdShieldView>();
        services.AddTransient<ThumbnailSeoView>();
        services.AddTransient<PublisherView>();
        services.AddTransient<VoiceStudioView>();
    }
}
