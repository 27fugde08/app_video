// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: LanguagePresetManager.cs
// Target: C# .NET 9 (DPAPI Secured Credential Storage & Multilingual Presets)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace CreatorOS.Core.Services;

/// <summary>
/// Cấu hình preset ngôn ngữ mục tiêu và giọng đọc mẫu
/// </summary>
public sealed class LanguagePreset
{
    public string Code { get; set; } = "VN";
    public string DisplayName { get; set; } = "Tiếng Việt (Vietnam)";
    public string TargetLanguage { get; set; } = "vi";
    public string VoiceModel { get; set; } = "vi-VN-HoaiMyNeural";
    public string ToneOfVoice { get; set; } = "Natural, Engaging, Native Vietnamese Influencer Style";
    public double SpeechRate { get; set; } = 1.0;
    public double Pitch { get; set; } = 1.0;
    public string TranslationPromptTemplate { get; set; } = 
        "Dịch toàn bộ văn bản sau sang {{ TARGET_LANGUAGE }} với phong cách {{ TONE_OF_VOICE }}. Giữ nguyên ngữ cảnh tự nhiên của video viral, câu ngắn gọn dễ khớp nhịp lồng tiếng.";
}

/// <summary>
/// LanguagePresetManager:
/// 1. Cung cấp preset 1-click cho các thị trường: VN, US, CN, JP, KR.
/// 2. Lưu trữ bảo mật GEMINI_API_KEY bằng Windows DPAPI (ProtectedData.Protect).
/// </summary>
public sealed class LanguagePresetManager
{
    private static readonly Lazy<LanguagePresetManager> _instance = new(() => new LanguagePresetManager());
    public static LanguagePresetManager Instance => _instance.Value;

    private readonly Dictionary<string, LanguagePreset> _presets = new(StringComparer.OrdinalIgnoreCase);
    private readonly string _credentialsPath;

    public LanguagePresetManager()
    {
        _credentialsPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "CreatorOS",
            "secure_credentials.dat"
        );

        var dir = Path.GetDirectoryName(_credentialsPath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }

        InitializeDefaultPresets();
    }

    private void InitializeDefaultPresets()
    {
        // 1. VIETNAMESE PRESET
        _presets["VN"] = new LanguagePreset
        {
            Code = "VN",
            DisplayName = "Tiếng Việt (Chuẩn Bản Địa)",
            TargetLanguage = "vi",
            VoiceModel = "vi-VN-HoaiMyNeural",
            ToneOfVoice = "Tự nhiên, dí dỏm, lôi cuốn, đúng phong cách Review/Shorts",
            SpeechRate = 1.05,
            TranslationPromptTemplate = "Bạn là biên dịch viên lồng tiếng video chuyên nghiệp. Dịch transcript sau sang {{ TARGET_LANGUAGE }} với giọng điệu {{ TONE_OF_VOICE }}. Đảm bảo độ dài câu tương đương câu gốc để vừa vặn khẩu hình."
        };

        // 2. US ENGLISH PRESET
        _presets["US"] = new LanguagePreset
        {
            Code = "US",
            DisplayName = "English (US Narrative)",
            TargetLanguage = "en",
            VoiceModel = "en-US-ChristopherNeural",
            ToneOfVoice = "Energetic, clear documentary and storytelling style",
            SpeechRate = 1.0,
            TranslationPromptTemplate = "Translate the following video transcript into natural US English with a {{ TONE_OF_VOICE }} tone. Optimize for rapid voiceover timing."
        };

        // 3. CHINESE (MANDARIN) PRESET
        _presets["CN"] = new LanguagePreset
        {
            Code = "CN",
            DisplayName = "Chinese (Mandarin / Douyin)",
            TargetLanguage = "zh",
            VoiceModel = "zh-CN-YunxiNeural",
            ToneOfVoice = "Popular Douyin narrator tone, punchy and expressive",
            SpeechRate = 1.0,
            TranslationPromptTemplate = "将以下字幕翻译成地道简体中文，符合抖音短视频解说风格，语气生动，节奏紧凑。"
        };

        // 4. JAPANESE PRESET
        _presets["JP"] = new LanguagePreset
        {
            Code = "JP",
            DisplayName = "Japanese (Anime / YouTube)",
            TargetLanguage = "ja",
            VoiceModel = "ja-JP-NanamiNeural",
            ToneOfVoice = "Polite yet engaging VTuber/Creator style",
            SpeechRate = 1.0,
            TranslationPromptTemplate = "以下のテキストを自然な日本語に翻訳してください。テンポが良く、聞き取りやすい表現にしてください。"
        };

        // 5. KOREAN PRESET
        _presets["KR"] = new LanguagePreset
        {
            Code = "KR",
            DisplayName = "Korean (K-Drama / Vlog)",
            TargetLanguage = "ko",
            VoiceModel = "ko-KR-SunHiNeural",
            ToneOfVoice = "Trend-focused Korean Vlog and Review style",
            SpeechRate = 1.0,
            TranslationPromptTemplate = "다음 텍스트를 자연스럽고 생동감 넘치는 한국어로 번역하세요. 쇼츠 영상 더빙에 적합하도록 간결하게 맞춰주세요."
        };
    }

    public IReadOnlyCollection<LanguagePreset> GetAllPresets() => _presets.Values;

    public LanguagePreset GetPreset(string code)
    {
        if (_presets.TryGetValue(code, out var preset))
            return preset;
        return _presets["VN"];
    }

    /// <summary>
    /// Lưu trữ API Key an toàn trong Windows Data Protection API (DPAPI)
    /// </summary>
    public void SaveGeminiApiKeySecurely(string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey)) return;

        try
        {
            byte[] plainBytes = Encoding.UTF8.GetBytes(apiKey);
            byte[] entropy = Encoding.UTF8.GetBytes("CreatorOS_Entropy_Salt_2026");
            byte[] encryptedBytes = ProtectedData.Protect(plainBytes, entropy, DataProtectionScope.CurrentUser);

            File.WriteAllBytes(_credentialsPath, encryptedBytes);
        }
        catch
        {
            // Logging / Error handling
        }
    }

    /// <summary>
    /// Đọc API Key giải mã từ DPAPI
    /// </summary>
    public string? GetGeminiApiKey()
    {
        if (!File.Exists(_credentialsPath))
            return Environment.GetEnvironmentVariable("GEMINI_API_KEY");

        try
        {
            byte[] encryptedBytes = File.ReadAllBytes(_credentialsPath);
            byte[] entropy = Encoding.UTF8.GetBytes("CreatorOS_Entropy_Salt_2026");
            byte[] plainBytes = ProtectedData.Unprotect(encryptedBytes, entropy, DataProtectionScope.CurrentUser);

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch
        {
            return Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        }
    }
}
