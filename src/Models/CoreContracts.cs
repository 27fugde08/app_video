// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: CoreContracts.cs
// Target: C# .NET 9 (Unified Contracts, Enums, DTOs & Messenger Messages)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Core.Contracts;

#region Platform & Ingestion Enums & Records

public enum PlatformType
{
    Unknown = 0,
    TikTok = 1,
    YouTubePlaylist = 2,
    Douyin = 3,
    Facebook = 4,
    Instagram = 5,
    Kuaishou = 6,
    Bilibili = 7,
    YouTube = 8
}

public enum InputUrlType
{
    Unknown = 0,
    SingleVideo = 1,
    ChannelProfile = 2,
    Playlist = 3
}

public enum DownloadItemStatus
{
    Pending = 0,
    Queued = 1,
    Downloading = 2,
    Muxing = 3,
    Completed = 4,
    Failed = 5,
    Canceled = 6,
    Paused = 7
}

public sealed record ScannedVideoItem(
    string VideoId,
    string Title,
    string Author,
    string DirectDownloadUrlNoWatermark,
    string CoverImageUrl,
    double DurationSeconds,
    long EstimatedSizeBytes,
    DateTime PublishedAtUtc,
    PlatformType Platform
)
{
    public bool IsSelected { get; set; } = true;
    public string DurationFormatted => TimeSpan.FromSeconds(DurationSeconds).ToString(@"mm\:ss");
    public string SizeFormatted => $"{EstimatedSizeBytes / (1024.0 * 1024.0):F1} MB";
}

public sealed record ScannerProgress(
    int TotalDiscovered,
    int TargetCount,
    int CurrentPage,
    double ElapsedSeconds,
    int CurrentDelayMs,
    string CurrentUserAgent,
    string StatusMessage
);

public sealed record ChannelScanResult(
    bool Success,
    PlatformType Platform,
    string ChannelIdOrName,
    IReadOnlyList<ScannedVideoItem> Videos,
    int TotalDiscovered,
    TimeSpan ElapsedTime,
    int RetriesAttempted,
    double AverageScanTimePerVideoSec,
    string? ErrorMessage
);

public sealed class ChannelScannerOptions
{
    public int MaxVideosToFetch { get; set; } = 50;
    public int PageSize { get; set; } = 20;
    public int MaxRetries { get; set; } = 3;
    public int RateLimitCooldownSeconds { get; set; } = 10;
    public int MinDelayBetweenRequestsMs { get; set; } = 500;
    public int MaxDelayBetweenRequestsMs { get; set; } = 1800;
    public int MinJitterDelayMs { get; set; } = 500;
    public int MaxJitterDelayMs { get; set; } = 1500;
}

public sealed record SignedSignatureResult(
    string ABogus,
    string MsToken,
    string OriginalUrl,
    string SignedUrl,
    double GenerationTimeMs,
    bool Success,
    string? ErrorMessage = null
);

public sealed record DouyinVideoPayload(
    string AwemeId,
    string Title,
    string AuthorNickname,
    string VideoDownloadUrl,
    long DurationMs,
    int StatusCode
);

public sealed class VideoMetadataModel
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
    public string VideoUrl { get; set; } = string.Empty;
    public string CoverUrl { get; set; } = string.Empty;
    public string AudioUrl { get; set; } = string.Empty;
    public string SubtitlesRawVtt { get; set; } = string.Empty;
    public double DurationSeconds { get; set; }
    public long LikeCount { get; set; }
    public long ViewCount { get; set; }
    public List<string> Hashtags { get; set; } = new();
}

public enum CoordinatorJobStatus
{
    Queued = 0,
    ResolvingMetadata = 1,
    DownloadingSegments = 2,
    MuxingStreams = 3,
    PackagingBundle = 4,
    Completed = 5,
    Failed = 6,
    Canceled = 7
}

public sealed class CoordinatorOptions
{
    public int MaxParallelJobs { get; set; } = 3;
    public int MaxConcurrentDownloads { get; set; } = 3;
    public int MaxRetriesPerJob { get; set; } = 3;
    public string DefaultOutputDirectory { get; set; } = "Downloads";
    public bool AutoPackageBundle { get; set; } = true;
    public bool EnableDirectAudioMuxing { get; set; } = true;
    public bool UseAdaptiveProxy { get; set; } = false;
    public bool AutoMuxDualStreams { get; set; } = true;
    public bool ExtractAssetBundle { get; set; } = true;
    public TimeSpan InitialRetryDelay { get; set; } = TimeSpan.FromSeconds(2);
}

public sealed class CoordinatorProgressReport
{
    public string JobId { get; init; } = string.Empty;
    public CoordinatorJobStatus Status { get; init; } = CoordinatorJobStatus.Queued;
    public double ProgressPercentage { get; init; }
    public double ProgressPercent { get => ProgressPercentage; init => ProgressPercentage = value; }
    public double DownloadSpeedMbps { get; init; }
    public double SpeedMegaBytesPerSec { get => DownloadSpeedMbps; init => DownloadSpeedMbps = value; }
    public long DownloadedBytes { get; init; }
    public long TotalBytes { get; init; }
    public TimeSpan EstimatedTimeRemaining { get; init; }
    public string StatusMessage { get; init; } = string.Empty;
    public string? OutputFilePath { get; init; }

    public CoordinatorProgressReport() { }

    public CoordinatorProgressReport(
        string JobId,
        CoordinatorJobStatus Status,
        double ProgressPercent,
        double SpeedMegaBytesPerSec,
        long DownloadedBytes,
        long TotalBytes,
        TimeSpan EstimatedTimeRemaining,
        string StatusMessage,
        string? OutputFilePath = null)
    {
        this.JobId = JobId;
        this.Status = Status;
        this.ProgressPercentage = ProgressPercent;
        this.DownloadSpeedMbps = SpeedMegaBytesPerSec;
        this.DownloadedBytes = DownloadedBytes;
        this.TotalBytes = TotalBytes;
        this.EstimatedTimeRemaining = EstimatedTimeRemaining;
        this.StatusMessage = StatusMessage;
        this.OutputFilePath = OutputFilePath;
    }
}

#endregion

#region Subtitles & Text Contracts

public sealed class WordTimestamp
{
    public string Word { get; set; } = string.Empty;
    public double Start { get; set; }
    public double End { get; set; }
    public double Probability { get; set; } = 1.0;
    public int DurationCentiseconds => (int)Math.Round((End - Start) * 100.0);
}

public sealed class SubtitleWordChunk
{
    private double? _start;
    private double? _end;
    public List<WordTimestamp> Words { get; set; } = new();
    public double Start { get => _start ?? (Words.Count > 0 ? Words[0].Start : 0); set => _start = value; }
    public double End { get => _end ?? (Words.Count > 0 ? Words[^1].End : 0); set => _end = value; }
    public double StartSeconds { get => Start; set => Start = value; }
    public double EndSeconds { get => End; set => End = value; }
    public string Text { get => string.Join(" ", Words.ConvertAll(w => w.Word)); set { } }
    public string FullText { get => Text; set { } }
    public int CharacterCount => Text.Length;
}

public enum SubtitleRenderMode
{
    Classic = 0,
    KaraokeFill = 1,
    BouncingPopWord = 2,
    HybridKaraokePop = 3,
    ProgressiveKaraoke = 4
}

public sealed class SubtitleStyleOptions
{
    public string FontName { get; set; } = "Montserrat ExtraBold";
    public int FontSize { get; set; } = 64;
    public string PrimaryColour { get; set; } = "&H00FFFFFF&";
    public string HighlightColour { get; set; } = "&H0000FFFF&";
    public string OutlineColour { get; set; } = "&H00000000&";
    public string BackColour { get; set; } = "&H80000000&";
    public string ShadowColour { get; set; } = "&H80000000&";
    public int OutlineWidth { get; set; } = 4;
    public int ShadowDepth { get; set; } = 2;
    public int MarginVertical { get; set; } = 40;
    public int Alignment { get; set; } = 2;
    public int PlayResX { get; set; } = 1920;
    public int PlayResY { get; set; } = 1080;
    public int MinWordsPerChunk { get; set; } = 3;
    public int MaxWordsPerChunk { get; set; } = 5;
    public int MaxCharactersPerLine { get; set; } = 20;
    public int PopScalePercent { get; set; } = 115;
    public SubtitleRenderMode RenderMode { get; set; } = SubtitleRenderMode.BouncingPopWord;
}

public sealed class WhisperSegment
{
    public int Id { get; set; }
    public double Start { get; set; }
    public double End { get; set; }
    public string Text { get; set; } = string.Empty;
}

public sealed class InternalTranscriptCue
{
    public int Id { get; set; }
    public double OriginalStart { get; set; }
    public double OriginalEnd { get; set; }
    public double Start { get => OriginalStart; set => OriginalStart = value; }
    public double End { get => OriginalEnd; set => OriginalEnd = value; }
    public string OriginalText { get; set; } = string.Empty;
    public string TranslatedText { get; set; } = string.Empty;
    public string Text { get => OriginalText; set => OriginalText = value; }

    public InternalTranscriptCue() { }

    public InternalTranscriptCue(int id, double start, double end, string originalText, string translatedText = "")
    {
        Id = id;
        OriginalStart = start;
        OriginalEnd = end;
        OriginalText = originalText;
        TranslatedText = translatedText;
    }
}

#endregion

#region Audio, VAD & DSP Contracts

public enum AudioChunkType
{
    Speech = 0,
    Silence = 1
}

public sealed class AudioChunk
{
    public AudioChunkType Type { get; set; }
    public double Start { get; set; }
    public double End { get; set; }
    public double StartSeconds { get => Start; set => Start = value; }
    public double EndSeconds { get => End; set => End = value; }
    public double OriginalDuration => End - Start;
    public double TargetDuration { get; set; }
    public double SpeedRatio { get; set; } = 1.0;
}

public sealed class NonlinearAlignmentPlan
{
    public double SourceDuration { get; set; }
    public double TargetDuration { get; set; }
    public double TotalOriginalSpeech { get; set; }
    public double TotalOriginalSilence { get; set; }
    public double TotalTargetSpeech { get; set; }
    public double TotalTargetSilence { get; set; }
    public double SpeechSpeedRatioR { get; set; }
    public bool IsWithinSafeSpeechRange { get; set; }
    public string? WarningMessage { get; set; }
    public List<AudioChunk> Chunks { get; set; } = new();
}

public sealed record TimeStretchPlan(
    double OriginalDurationT1,
    double VoiceDurationT2,
    double RawRatio,
    double EffectiveTempo,
    double SilencePaddingSeconds,
    bool RequiredPaddingCorrection,
    string StrategyDescription
)
{
    public double OriginalDuration => OriginalDurationT1;
    public double DesiredDuration => VoiceDurationT2;
    public double TimeStretchRatio => EffectiveTempo;
    public string FfmpegAtempoFilter => $"atempo={EffectiveTempo:F3}";
}

public sealed record AlignmentResult(
    bool Success,
    string OutputFilePath,
    double MeasuredDurationSeconds,
    double ExpectedDurationSeconds,
    double ToleranceErrorSeconds,
    NonlinearAlignmentPlan Plan,
    string FfmpegFilterComplex,
    string? ErrorMessage = null
);

public sealed class DuckingOptions
{
    public double ThresholdDb { get; set; } = -24.0;
    public double Ratio { get; set; } = 4.0;
    public double CompressionRatio { get => Ratio; set => Ratio = value; }
    public double AttackMs { get; set; } = 20.0;
    public double ReleaseMs { get; set; } = 250.0;
    public double HoldMs { get; set; } = 100.0;
    public double DetectionThreshold { get; set; } = 0.08;
    public double MinTempoThreshold { get; set; } = 0.70;
    public double MaxTempoThreshold { get; set; } = 1.50;
    public double DuckedBgmVolumeLevel { get; set; } = 0.25;
    public double TargetBgmAttenuationDb { get; set; } = -12.0;
    public double SilenceNoiseThresholdDb { get; set; } = -32.0;
}

public sealed record AudioDuckingResult(
    bool Success,
    int ExitCode,
    string FilterComplexGraph,
    string FfmpegArguments,
    TimeStretchPlan StretchPlan,
    string OutputFilePath,
    double ExpectedDurationSeconds,
    string? ErrorMessage = null
)
{
    public double DurationSeconds => ExpectedDurationSeconds;
    public TimeSpan ElapsedTime => TimeSpan.Zero;
}

public sealed class AudioStemSeparatorOptions
{
    public string ModelName { get; set; } = "htdemucs_ft";
    public int Shifts { get; set; } = 1;
    public bool Overlap { get; set; } = true;
    public int CpuThreads { get; set; } = 4;
    public int SampleRate { get; set; } = 44100;
    public int Channels { get; set; } = 2;
    public string FfmpegPath { get; set; } = "ffmpeg";
    public int NFft { get; set; } = 2048;
    public int HopLength { get; set; } = 512;
    public int ChunkLengthSeconds { get; set; } = 30;
    public double ChunkDurationSeconds { get => ChunkLengthSeconds; set => ChunkLengthSeconds = (int)value; }
    public double OverlapDurationSeconds { get; set; } = 2.0;
}

public sealed record StemSeparationProgress(
    int CurrentChunkIndex,
    int TotalChunks,
    double CurrentTimeSeconds,
    double TotalDurationSeconds,
    double PercentComplete,
    double PeakMemoryMb,
    string StatusMessage
);

public sealed class StemSeparationResult
{
    public bool Success { get; init; }
    public string VocalsPath { get; init; } = string.Empty;
    public string InstrumentalSfxPath { get; init; } = string.Empty;
    public string BgmSfxPath => InstrumentalSfxPath;
    public double DurationSeconds { get; init; }
    public long VocalsFileSize { get; init; }
    public long InstrumentalFileSize { get; init; }
    public double PeakRamUsageMb { get; init; }
    public TimeSpan ElapsedProcessingTime { get; init; }
    public string? ErrorMessage { get; init; }

    public StemSeparationResult() { }

    public StemSeparationResult(
        bool Success,
        string VocalsPath,
        string InstrumentalSfxPath,
        double DurationSeconds,
        long VocalsFileSize,
        long InstrumentalFileSize,
        double PeakRamUsageMb,
        TimeSpan ElapsedProcessingTime,
        string? ErrorMessage = null)
    {
        this.Success = Success;
        this.VocalsPath = VocalsPath;
        this.InstrumentalSfxPath = InstrumentalSfxPath;
        this.DurationSeconds = DurationSeconds;
        this.VocalsFileSize = VocalsFileSize;
        this.InstrumentalFileSize = InstrumentalFileSize;
        this.PeakRamUsageMb = PeakRamUsageMb;
        this.ElapsedProcessingTime = ElapsedProcessingTime;
        this.ErrorMessage = ErrorMessage;
    }

    public StemSeparationResult(
        string VocalsPath,
        string InstrumentalSfxPath,
        double DurationSeconds,
        bool Success = true)
    {
        this.Success = Success;
        this.VocalsPath = VocalsPath;
        this.InstrumentalSfxPath = InstrumentalSfxPath;
        this.DurationSeconds = DurationSeconds;
    }
}

public sealed class VoiceSyncOptions
{
    public string FfmpegPath { get; set; } = "ffmpeg";
    public string OutputDirectory { get; set; } = "Temp";
    public string TargetLanguage { get; set; } = "vi";
    public string SourceLanguage { get; set; } = "auto";
    public string GeminiApiKey { get; set; } = string.Empty;
    public string VoiceModel { get; set; } = "adam";
    public string VoiceId { get => VoiceModel; set => VoiceModel = value; }
    public double SpeedRate { get; set; } = 1.0;
    public double PitchShift { get; set; } = 0.0;
    public bool EnableTimeStretch { get; set; } = true;
    public bool EnableSidechainDucking { get; set; } = true;
    public string TtsEngine { get; set; } = "edge-tts";
    public string EdgeVoiceName { get; set; } = "vi-VN-HoaiMyNeural";
    public int SampleRate { get; set; } = 44100;
}

public sealed record VoiceSyncProgress(
    double Percentage,
    string Stage,
    int ProcessedSegments,
    int TotalSegments,
    string CurrentSentence,
    double CurrentDriftSeconds,
    string StatusMessage
);

public sealed class SyncedSegmentResult
{
    public int Id { get; set; }
    public double OriginalStart { get; set; }
    public double OriginalEnd { get; set; }
    public double TargetDuration { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public string TranslatedText { get; set; } = string.Empty;
    public int OriginalSyllableCount { get; set; }
    public int TranslatedSyllableCount { get; set; }
    public double RawTtsDuration { get; set; }
    public double AlignedDuration { get; set; }
    public double SpeedRatioR { get; set; }
    public bool SilenceCompressed { get; set; }
    public string RawAudioPath { get; set; } = string.Empty;
    public string AlignedAudioPath { get; set; } = string.Empty;

    public SyncedSegmentResult() { }

    public SyncedSegmentResult(
        int Id,
        double OriginalStart,
        double OriginalEnd,
        double TargetDuration,
        string OriginalText,
        string TranslatedText,
        int OriginalSyllableCount,
        int TranslatedSyllableCount,
        double RawTtsDuration,
        double AlignedDuration,
        double SpeedRatioR,
        bool SilenceCompressed,
        string RawAudioPath,
        string AlignedAudioPath)
    {
        this.Id = Id;
        this.OriginalStart = OriginalStart;
        this.OriginalEnd = OriginalEnd;
        this.TargetDuration = TargetDuration;
        this.OriginalText = OriginalText;
        this.TranslatedText = TranslatedText;
        this.OriginalSyllableCount = OriginalSyllableCount;
        this.TranslatedSyllableCount = TranslatedSyllableCount;
        this.RawTtsDuration = RawTtsDuration;
        this.AlignedDuration = AlignedDuration;
        this.SpeedRatioR = SpeedRatioR;
        this.SilenceCompressed = SilenceCompressed;
        this.RawAudioPath = RawAudioPath;
        this.AlignedAudioPath = AlignedAudioPath;
    }
}

public sealed record VoiceSyncResult(
    bool Success,
    string FinalAudioFilePath,
    double OriginalTotalDuration,
    double FinalAudioDuration,
    double TotalTimeDriftSeconds,
    bool IsWithinTolerance,
    IReadOnlyList<SyncedSegmentResult> Segments,
    TimeSpan ElapsedProcessingTime,
    string? ErrorMessage = null
);

#endregion

#region Stream Muxing & Proxies

public enum ProxyProtocol
{
    Http = 0,
    Https = 1,
    Socks5 = 2
}

public enum ProxyCircuitState
{
    Healthy = 0,
    Warning = 1,
    Isolated = 2,
    Dead = 3
}

public sealed class MuxingProgress
{
    public double CurrentTimeSeconds { get; set; }
    public double TotalDurationSeconds { get; set; }
    public double Percent { get; set; }
    public double SpeedFactor { get; set; }
    public string StatusMessage { get; set; } = string.Empty;

    public double ProcessedSeconds => CurrentTimeSeconds;
    public double TotalSeconds => TotalDurationSeconds;
    public double ProgressPercentage => Percent;
    public double MuxingFps => SpeedFactor;
    public string StatusDescription => StatusMessage;

    public MuxingProgress() { }

    public MuxingProgress(
        double CurrentTimeSeconds,
        double TotalDurationSeconds,
        double Percent,
        double SpeedFactor,
        string StatusMessage)
    {
        this.CurrentTimeSeconds = CurrentTimeSeconds;
        this.TotalDurationSeconds = TotalDurationSeconds;
        this.Percent = Percent;
        this.SpeedFactor = SpeedFactor;
        this.StatusMessage = StatusMessage;
    }
}

public sealed record MuxingResult(
    bool Success,
    string OutputFilePath,
    long FinalFileSizeBytes,
    TimeSpan ElapsedTime,
    bool VideoReencoded,
    bool AudioReencoded,
    string? ErrorMessage = null
);

public sealed record StreamCodecProfile(
    string VideoCodec,
    string AudioCodec,
    double DurationSeconds,
    bool CanCopyAudioDirectly,
    bool CanCopyVideoDirectly
);

public enum AssetType
{
    Video = 0,
    Cover = 1,
    Audio = 2,
    Metadata = 3,
    Subtitles = 4
}

public sealed record SubAssetDownloadProgress(
    AssetType AssetType,
    string FileName,
    long DownloadedBytes,
    long TotalBytes,
    double Percentage,
    bool IsCompleted,
    string? Error = null
)
{
    public long BytesDownloaded => DownloadedBytes;
    public double ProgressPercentage => Percentage;
}

public sealed class AssetBundleProgress
{
    public string BundleId { get; set; } = string.Empty;
    public string TargetDir { get; set; } = string.Empty;
    public int CompletedAssetsCount { get; set; }
    public int TotalAssetsCount { get; set; }
    public long TotalBytesDownloaded { get; set; }
    public double OverallPercentage { get; set; }
    public IReadOnlyList<SubAssetDownloadProgress> SubProgresses { get; set; } = new List<SubAssetDownloadProgress>();
    public string StatusMessage { get; set; } = string.Empty;

    public AssetBundleProgress() { }

    public AssetBundleProgress(
        string BundleId,
        double OverallPercentage,
        IReadOnlyDictionary<AssetType, SubAssetDownloadProgress> subDict,
        string StatusMessage)
    {
        this.BundleId = BundleId;
        this.OverallPercentage = OverallPercentage;
        this.StatusMessage = StatusMessage;
        if (subDict != null)
        {
            this.SubProgresses = subDict.Values.ToList();
            this.TotalBytesDownloaded = subDict.Values.Sum(s => s.DownloadedBytes);
            this.CompletedAssetsCount = subDict.Values.Count(s => s.IsCompleted);
            this.TotalAssetsCount = subDict.Count;
        }
    }

    public AssetBundleProgress(
        string bundleId,
        string targetDir,
        int completedAssetsCount,
        int totalAssetsCount,
        long totalBytesDownloaded,
        double overallPercentage,
        IReadOnlyList<SubAssetDownloadProgress> subProgresses)
    {
        this.BundleId = bundleId;
        this.TargetDir = targetDir;
        this.CompletedAssetsCount = completedAssetsCount;
        this.TotalAssetsCount = totalAssetsCount;
        this.TotalBytesDownloaded = totalBytesDownloaded;
        this.OverallPercentage = overallPercentage;
        this.SubProgresses = subProgresses;
        this.StatusMessage = $"Đang tải: {completedAssetsCount}/{totalAssetsCount} ({overallPercentage:F0}%)";
    }
}

public sealed class AssetBundleResult
{
    public bool Success { get; set; }
    public bool IsSuccess { get => Success; set => Success = value; }
    public string OutputDirectory { get; set; } = string.Empty;
    public string BundleDirectoryPath { get => OutputDirectory; set => OutputDirectory = value; }
    public string? VideoFilePath { get; set; }
    public string FinalVideoPath { get => VideoFilePath ?? string.Empty; set => VideoFilePath = value; }
    public string? CoverFilePath { get; set; }
    public string? ThumbnailPath { get => CoverFilePath; set => CoverFilePath = value; }
    public string? AudioFilePath { get; set; }
    public string? MetadataFilePath { get; set; }
    public string? SubtitlesFilePath { get; set; }
    public long TotalSizeInBytes { get; set; }
    public long TotalBundleSizeBytes { get => TotalSizeInBytes; set => TotalSizeInBytes = value; }
    public int TotalFilesCount { get; set; }
    public double ElapsedTimeMs { get; set; }
    public double ElapsedMilliseconds { get => ElapsedTimeMs; set => ElapsedTimeMs = value; }
    public bool UsedAtomicMftMove { get; set; }
    public string? ErrorMessage { get; set; }
    public List<string> SavedFiles { get; set; } = new();
    public List<string> PackagedFiles { get => SavedFiles; set => SavedFiles = value; }

    public AssetBundleResult() { }

    public AssetBundleResult(
        bool Success,
        string OutputDirectory,
        string? VideoFilePath,
        string? CoverFilePath,
        string? AudioFilePath,
        string? MetadataFilePath,
        string? SubtitlesFilePath,
        long TotalSizeInBytes,
        double ElapsedTimeMs,
        List<string> SavedFiles,
        string? ErrorMessage = null)
    {
        this.Success = Success;
        this.OutputDirectory = OutputDirectory;
        this.VideoFilePath = VideoFilePath;
        this.CoverFilePath = CoverFilePath;
        this.AudioFilePath = AudioFilePath;
        this.MetadataFilePath = MetadataFilePath;
        this.SubtitlesFilePath = SubtitlesFilePath;
        this.TotalSizeInBytes = TotalSizeInBytes;
        this.ElapsedTimeMs = ElapsedTimeMs;
        this.SavedFiles = SavedFiles;
        this.ErrorMessage = ErrorMessage;
    }
}

#endregion

#region Hardware Governor & System Contracts

public sealed record GpuMemoryMetrics(
    ulong DedicatedVideoMemoryBytes,
    ulong CurrentVramUsageBytes,
    ulong BudgetBytes,
    double UsagePercent,
    bool ExceedsThreshold
)
{
    public double UsedMb => CurrentVramUsageBytes / (1024.0 * 1024.0);
    public double TotalMb => BudgetBytes / (1024.0 * 1024.0);
}

public enum EncoderMode
{
    CpuSoftware = 0,
    NvidiaNvenc = 1,
    NvencHardware = 1,
    AmdAmf = 2,
    IntelQsv = 3
}

public sealed class EncoderLease : IDisposable, IAsyncDisposable
{
    public int JobId { get; }
    public EncoderMode Mode { get; }
    public bool IsNvencSlot => Mode == EncoderMode.NvencHardware || Mode == EncoderMode.NvidiaNvenc;
    public string FfmpegEncoderFlag => Mode switch
    {
        EncoderMode.NvidiaNvenc => "h264_nvenc",
        EncoderMode.AmdAmf => "h264_amf",
        EncoderMode.IntelQsv => "h264_qsv",
        _ => "libx264"
    };
    public string FfmpegPreset => "p4";

    private readonly SemaphoreSlim? _semaphore;
    private readonly Action? _onDisposed;
    private int _disposed;

    public EncoderLease(int jobId, EncoderMode mode, SemaphoreSlim? semaphore = null, Action? onDisposed = null)
    {
        JobId = jobId;
        Mode = mode;
        _semaphore = semaphore;
        _onDisposed = onDisposed;
    }

    public EncoderLease(int jobId, bool isNvencSlot, Action? onDisposed = null)
        : this(jobId, isNvencSlot ? EncoderMode.NvencHardware : EncoderMode.CpuSoftware, null, onDisposed)
    {
    }

    public static EncoderLease CreateCpuFallback(int jobId, Action? onDisposed = null)
        => new(jobId, EncoderMode.CpuSoftware, null, onDisposed);

    public void Dispose()
    {
        if (Interlocked.Exchange(ref _disposed, 1) == 0)
        {
            _onDisposed?.Invoke();
            _semaphore?.Release();
        }
    }

    public ValueTask DisposeAsync()
    {
        Dispose();
        return ValueTask.CompletedTask;
    }
}

public sealed class VramExceededWarningEventArgs : EventArgs
{
    public double VramUsagePercent { get; init; }
    public ulong UsedBytes { get; init; }
    public ulong TotalBudgetBytes { get; init; }
    public string Message { get; init; } = string.Empty;
}

public sealed class HighlightOptions
{
    public int MaxHighlightsCount { get; set; } = 5;
    public double MinSegmentDurationSeconds { get; set; } = 15.0;
    public double MaxSegmentDurationSeconds { get; set; } = 60.0;
    public int MinSegmentDurationSec { get => (int)MinSegmentDurationSeconds; set => MinSegmentDurationSeconds = value; }
    public int MaxSegmentDurationSec { get => (int)MaxSegmentDurationSeconds; set => MaxSegmentDurationSeconds = value; }
    public int TargetSegmentDurationSec { get => MaxSegmentDurationSec; set => MaxSegmentDurationSec = value; }
    public int WindowSizeN { get; set; } = 1024;
    public int HopSizeH { get; set; } = 512;
    public int SampleRate { get; set; } = 16000;
    public double SceneThreshold { get; set; } = 0.35;
    public double WeightSTE { get; set; } = 0.50;
    public double WeightSceneCuts { get; set; } = 0.30;
    public double WeightSceneCut { get => WeightSceneCuts; set => WeightSceneCuts = value; }
    public double WeightSpeechDensity { get; set; } = 0.20;
    public double MotionWeight { get; set; } = 0.35;
    public double AudioEnergyWeight { get; set; } = 0.45;
    public double FacePresenceWeight { get; set; } = 0.20;
}

public sealed class HighlightSegment
{
    public string Start { get; set; } = string.Empty;
    public string End { get; set; } = string.Empty;
    public double Score { get; set; }
    public int StartSeconds { get; set; }
    public int EndSeconds { get; set; }
    public string HookTitle { get; set; } = string.Empty;
}

public enum WdacEnforcementStatus
{
    NotEnforced = 0,
    AuditMode = 1,
    EnforcedBlocking = 2
}

public sealed record WdacRemediationResult(
    bool Success,
    bool MotwStripped,
    bool CertificateCreatedAndInstalled,
    bool BinarySigned,
    bool WdacPolicyGenerated,
    bool LibrosaDecoupledFallbackReady,
    string Message,
    IReadOnlyList<string> ActionLogs
);

public sealed record LlvmliteDiagnosticResult(
    string DllPath,
    bool FileExists,
    bool HasMarkOfTheWeb,
    bool IsAuthenticodeSigned,
    string? CertificateSubject,
    string FileSha256,
    long FileSizeBytes,
    WdacEnforcementStatus SystemEnforcementStatus,
    string DiagnosticSummary
);

#endregion

#region Job Queue & Task Contracts

public enum JobType
{
    FullPipelineExport = 0,
    BatchDownload = 1,
    DownloadVideo = 1,
    VoiceCloning = 2,
    LipSyncWav2Lip = 3,
    InpaintingClean = 4,
    SeoMetadata = 5,
    SubtitleBurning = 6
}

public enum JobStatus
{
    Queued = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3,
    Paused = 4,
    Canceled = 5,
    Cancelled = 5
}

public sealed class JobItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public JobType Type { get; set; } = JobType.FullPipelineExport;
    public JobStatus Status { get; set; } = JobStatus.Queued;
    public double Progress { get; set; }
    public string StatusMessage { get; set; } = "Đang chờ...";
    public DateTime QueuedAt { get; set; } = DateTime.UtcNow;
    public string? OutputPath { get; set; }
    public string? ErrorMessage { get; set; }
    public Func<IProgress<double>, CancellationToken, Task<string>>? ExecutionPayload { get; set; }

    public static implicit operator RenderJobTask(JobItem item) => new()
    {
        Id = item.Id,
        Title = item.Title,
        Type = item.Type,
        Status = item.Status,
        Progress = item.Progress,
        StatusMessage = item.StatusMessage,
        QueuedAt = item.QueuedAt,
        OutputPath = item.OutputPath,
        ErrorMessage = item.ErrorMessage,
        ExecutionWorkload = item.ExecutionPayload
    };
}

public interface IJobQueue : CreatorOS.Core.Services.IInMemoryJobQueue
{
}

public sealed record JobStatusChangedMessage(JobItem Job);
public sealed record JobProgressUpdatedMessage(string JobId, double Progress, string StatusMessage);

public sealed record RenderProgress(
    double Percentage,
    double Fps,
    long Frame,
    double SpeedRatio,
    string LastLogLine,
    DateTime Timestamp
);

#endregion
