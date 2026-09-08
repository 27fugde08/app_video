// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: DirectorContracts.cs
// Target: C# .NET 9 (C# 13) Native AOT & Zero-Reflection Director Contracts
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CreatorOS.Core.Contracts;

/// <summary>
/// Đại diện cho một câu phụ đề gốc từ Whisper kèm mốc thời gian chính xác.
/// </summary>
public readonly record struct SubtitleLine(
    int Id,
    double StartSec,
    double EndSec,
    string SpeakerId,
    string OriginalText
)
{
    public double DurationSec => Math.Max(0.05, EndSec - StartSec);
}

/// <summary>
/// Đại diện cho câu thoại tiếng Việt đã qua khâu "Đạo diễn hội thoại":
/// chuẩn hóa xưng hô, khóa âm tiết, gán cảm xúc và hệ số tốc độ đọc.
/// </summary>
public readonly record struct DirectedLine(
    int Id,
    string SpeakerId,
    string VietnameseText,
    string Emotion,
    double SpeedMultiplier,
    int TargetSyllables,
    int ActualSyllables,
    double PauseBeforeMs
);

/// <summary>
/// Bối cảnh phân cảnh và quan hệ nhân vật để cố định đại từ xưng hô xuyên suốt.
/// </summary>
public sealed record SceneContext(
    string Setting,
    string Tone,
    Dictionary<string, string> CharacterRelationships
)
{
    public static SceneContext Default => new(
        Setting: "Phim hành động / kịch tính hiện đại",
        Tone: "Chân thực, tự nhiên, kịch tính",
        CharacterRelationships: new Dictionary<string, string>
        {
            ["Speaker_1"] = "Nhân vật chính (tôi / anh)",
            ["Speaker_2"] = "Bạn đồng hành (cậu / em)",
            ["Default"] = "tôi - bạn"
        }
    );
}

#region Gemini REST Direct API DTOs (Zero-Reflection & Native AOT)

public sealed class GeminiPart
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public sealed class GeminiContent
{
    [JsonPropertyName("role")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Role { get; set; }

    [JsonPropertyName("parts")]
    public List<GeminiPart> Parts { get; set; } = new();
}

public sealed class GeminiGenerationConfig
{
    [JsonPropertyName("temperature")]
    public double Temperature { get; set; } = 0.2;

    [JsonPropertyName("responseMimeType")]
    public string ResponseMimeType { get; set; } = "application/json";
}

public sealed class GeminiSystemInstruction
{
    [JsonPropertyName("parts")]
    public List<GeminiPart> Parts { get; set; } = new();
}

public sealed class GeminiApiRequest
{
    [JsonPropertyName("system_instruction")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public GeminiSystemInstruction? SystemInstruction { get; set; }

    [JsonPropertyName("contents")]
    public List<GeminiContent> Contents { get; set; } = new();

    [JsonPropertyName("generationConfig")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public GeminiGenerationConfig? GenerationConfig { get; set; }
}

public sealed class GeminiCandidate
{
    [JsonPropertyName("content")]
    public GeminiContent? Content { get; set; }

    [JsonPropertyName("finishReason")]
    public string? FinishReason { get; set; }
}

public sealed class GeminiApiResponse
{
    [JsonPropertyName("candidates")]
    public List<GeminiCandidate>? Candidates { get; set; }
}

/// <summary>
/// Định dạng JSON mà Gemini trả về cho từng câu chỉ đạo hội thoại
/// </summary>
public sealed class GeminiDirectedItemDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("speaker_id")]
    public string SpeakerId { get; set; } = string.Empty;

    [JsonPropertyName("vietnamese_text")]
    public string VietnameseText { get; set; } = string.Empty;

    [JsonPropertyName("emotion")]
    public string Emotion { get; set; } = "calm";

    [JsonPropertyName("speed_multiplier")]
    public double SpeedMultiplier { get; set; } = 1.0;

    [JsonPropertyName("pause_before_ms")]
    public double PauseBeforeMs { get; set; } = 0.0;
}

/// <summary>
/// Source Generator JsonSerializerContext cho Gemini Director:
/// Bảo đảm Zero-Allocation từ Reflection và tương thích 100% Native AOT trên .NET 9.
/// </summary>
[JsonSourceGenerationOptions(
    WriteIndented = false,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    PropertyNamingPolicy = JsonKnownNamingPolicy.Unspecified)]
[JsonSerializable(typeof(SubtitleLine))]
[JsonSerializable(typeof(List<SubtitleLine>))]
[JsonSerializable(typeof(DirectedLine))]
[JsonSerializable(typeof(List<DirectedLine>))]
[JsonSerializable(typeof(SceneContext))]
[JsonSerializable(typeof(GeminiApiRequest))]
[JsonSerializable(typeof(GeminiApiResponse))]
[JsonSerializable(typeof(GeminiDirectedItemDto))]
[JsonSerializable(typeof(List<GeminiDirectedItemDto>))]
[JsonSerializable(typeof(Dictionary<string, string>))]
public partial class DirectorJsonContext : JsonSerializerContext
{
}

#endregion
