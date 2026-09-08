// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: SettingsService.cs
// Target: C# .NET 9 (Local JSON Settings Service for Offline-First Desktop App)
// ==============================================================================

using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Core.Infrastructure;

namespace CreatorOS.Core.Services;

/// <summary>
/// Cấu hình lưu trữ cục bộ của CreatorOS Desktop.
/// </summary>
public sealed class AppConfigModel
{
    public int MaxConcurrentGpuJobs { get; set; } = 2;
    public string DefaultExportDirectory { get; set; } = string.Empty;
    public bool EnableHardwareAcceleration { get; set; } = true;
    public string PreferredAudioLanguage { get; set; } = "vi";
    public string WhisperModel { get; set; } = "ggml-base.bin";

    // Smart Output Router & Asset Packager Configuration
    public string OutputPatternTemplate { get; set; } = @"{BaseDir}\{Platform}\{Date:yyyy-MM}\{Author}\{Resolution}\{Title}";
    public bool DeleteOriginalAfterPackaging { get; set; } = false;
    public bool PurgeIntermediateStems { get; set; } = true;
    public int FileCollisionMode { get; set; } = 0; // 0: AutoIncrement, 1: Overwrite, 2: Skip
}

/// <summary>
/// SettingsService: Quản lý đọc/ghi cấu hình người dùng vào %AppData%/CreatorOS/config.json.
/// </summary>
public sealed class SettingsService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private readonly SemaphoreSlim _fileLock = new(1, 1);
    private AppConfigModel _currentConfig = new();

    public AppConfigModel Current => _currentConfig;

    public SettingsService()
    {
        LoadSettings();
    }

    public void LoadSettings()
    {
        try
        {
            var configPath = AppPaths.ConfigFilePath;
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                _currentConfig = JsonSerializer.Deserialize<AppConfigModel>(json, JsonOptions) ?? new AppConfigModel();
            }
            else
            {
                _currentConfig = new AppConfigModel
                {
                    DefaultExportDirectory = AppPaths.ExportsDirectory
                };
                SaveSettings();
            }
        }
        catch
        {
            _currentConfig = new AppConfigModel { DefaultExportDirectory = AppPaths.ExportsDirectory };
        }
    }

    public void SaveSettings()
    {
        _fileLock.Wait();
        try
        {
            var configPath = AppPaths.ConfigFilePath;
            var json = JsonSerializer.Serialize(_currentConfig, JsonOptions);
            File.WriteAllText(configPath, json);
        }
        catch { }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task SaveSettingsAsync(CancellationToken ct = default)
    {
        await _fileLock.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            var configPath = AppPaths.ConfigFilePath;
            var json = JsonSerializer.Serialize(_currentConfig, JsonOptions);
            await File.WriteAllTextAsync(configPath, json, ct).ConfigureAwait(false);
        }
        catch { }
        finally
        {
            _fileLock.Release();
        }
    }
}
