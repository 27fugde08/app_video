// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: MultiRoleVoiceSynthesizer.cs
// Target: C# .NET 9 (Multi-Role Voice Dispatcher & Cinematic SFX Insertion)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Core.Services;

/// <summary>
/// Cấu hình giọng đọc cho từng vai nhân vật trong truyện tranh
/// </summary>
public sealed class RoleVoiceProfile
{
    public string RoleKey { get; set; } = "Narrator";
    public string RoleDisplayName { get; set; } = "Người Dẫn Truyện";
    public string VoiceModel { get; set; } = "vi-VN-HoaiMyNeural";
    public double SpeechRate { get; set; } = 1.05;
    public double Pitch { get; set; } = 1.0;
}

/// <summary>
/// MultiRoleVoiceSynthesizer:
/// - Phân loại vai nhân vật (Narrator, MainCharacter, Villain, SideCharacter).
/// - Ánh xạ giọng đọc tương ứng và chèn hiệu ứng âm thanh SFX (SwordSlash, Thunder, Footsteps).
/// </summary>
public sealed class MultiRoleVoiceSynthesizer
{
    private static readonly Lazy<MultiRoleVoiceSynthesizer> _instance = new(() => new MultiRoleVoiceSynthesizer());
    public static MultiRoleVoiceSynthesizer Instance => _instance.Value;

    private readonly Dictionary<string, RoleVoiceProfile> _profiles = new(StringComparer.OrdinalIgnoreCase);

    public MultiRoleVoiceSynthesizer()
    {
        InitializeDefaultProfiles();
    }

    private void InitializeDefaultProfiles()
    {
        _profiles["Narrator"] = new RoleVoiceProfile
        {
            RoleKey = "Narrator",
            RoleDisplayName = "Người Dẫn Truyện (Trầm Ấm)",
            VoiceModel = "vi-VN-NamMinhNeural",
            SpeechRate = 1.05,
            Pitch = 1.0
        };

        _profiles["MainCharacter"] = new RoleVoiceProfile
        {
            RoleKey = "MainCharacter",
            RoleDisplayName = "Nam Chính (Mạnh Mẽ / Khí Phách)",
            VoiceModel = "vi-VN-ChristopherNeural",
            SpeechRate = 1.10,
            Pitch = 1.05
        };

        _profiles["Heroine"] = new RoleVoiceProfile
        {
            RoleKey = "Heroine",
            RoleDisplayName = "Nữ Chính (Trong Trẻo / Dịu Dàng)",
            VoiceModel = "vi-VN-HoaiMyNeural",
            SpeechRate = 1.0,
            Pitch = 1.0
        };

        _profiles["Villain"] = new RoleVoiceProfile
        {
            RoleKey = "Villain",
            RoleDisplayName = "Nhân Vật Phản Diện (Lạnh Lùng / Độc Đoán)",
            VoiceModel = "vi-VN-NamMinhNeural",
            SpeechRate = 0.95,
            Pitch = 0.85
        };
    }

    public IReadOnlyCollection<RoleVoiceProfile> GetAllProfiles() => _profiles.Values;

    public RoleVoiceProfile GetProfile(string roleKey)
    {
        if (_profiles.TryGetValue(roleKey, out var p))
            return p;
        return _profiles["Narrator"];
    }

    /// <summary>
    /// Gợi ý âm thanh hiệu ứng (SFX) dựa trên từ khóa trong câu thoại
    /// </summary>
    public string DetectSuggestedSfx(string dialogueText)
    {
        if (string.IsNullOrWhiteSpace(dialogueText)) return "None";

        string lower = dialogueText.ToLowerInvariant();
        if (lower.Contains("kiếm") || lower.Contains("chém") || lower.Contains("vung"))
            return "SwordSlash.wav";
        if (lower.Contains("sấm") || lower.Contains("sét") || lower.Contains("nổ"))
            return "ThunderStrike.wav";
        if (lower.Contains("bước") || lower.Contains("chạy") || lower.Contains("tiến"))
            return "Footsteps.wav";
        if (lower.Contains("cổng") || lower.Contains("vỡ") || lower.Contains("sập"))
            return "DestructionImpact.wav";

        return "None";
    }
}
