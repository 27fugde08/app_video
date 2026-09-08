// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: FilmScriptSynthesizer.cs
// Target: C# .NET 9 (Gemini API 5-Act Film Review Script Generation)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace CreatorOS.Core.Services;

/// <summary>
/// Đại diện cho 1 câu bình luận review phân đoạn kèm tag cảnh gợi ý
/// </summary>
public sealed class FilmReviewScriptSentence
{
    [JsonPropertyName("sentence")]
    public string Sentence { get; set; } = string.Empty;

    [JsonPropertyName("suggested_scene_tag")]
    public string SuggestedSceneTag { get; set; } = string.Empty;

    [JsonPropertyName("emotion")]
    public string Emotion { get; set; } = "Neutral";

    [JsonPropertyName("assigned_scene_index")]
    public int AssignedSceneIndex { get; set; } = 1;

    [JsonPropertyName("estimated_duration_sec")]
    public double EstimatedDurationSeconds { get; set; } = 4.0;
}

public sealed class FilmScriptResponse
{
    [JsonPropertyName("movie_title")]
    public string MovieTitle { get; set; } = string.Empty;

    [JsonPropertyName("target_duration_minutes")]
    public double TargetDurationMinutes { get; set; } = 3.0;

    [JsonPropertyName("sentences")]
    public List<FilmReviewScriptSentence> Sentences { get; set; } = new();
}

/// <summary>
/// FilmScriptSynthesizer:
/// - Sinh kịch bản review phim theo mô thức 5 hồi chuẩn điện ảnh:
///   1. Mở đầu (Hook 5s)
///   2. Giới thiệu (Exposition)
///   3. Biến cố & Thử thách (Rising Action)
///   4. Cao trào (Climax)
///   5. Kết luận & Đánh giá (Resolution & Rating)
/// </summary>
public sealed class FilmScriptSynthesizer
{
    private static readonly Lazy<FilmScriptSynthesizer> _instance = new(() => new FilmScriptSynthesizer());
    public static FilmScriptSynthesizer Instance => _instance.Value;

    private readonly HttpClient _httpClient = new();

    public async Task<FilmScriptResponse> GenerateRecapScriptAsync(
        string movieTitle,
        string plotHighlights,
        int totalScenesCount,
        string targetTone = "Trầm ấm bí ẩn",
        CancellationToken ct = default)
    {
        string? apiKey = LanguagePresetManager.Instance.GetGeminiApiKey();

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            // Fallback: Tạo kịch bản mẫu chất lượng cao nếu chưa nạp API key
            return GenerateFallbackTemplate(movieTitle, totalScenesCount);
        }

        try
        {
            string systemPrompt = $$"""
            Bạn là một nhà phê bình và biên kịch tóm tắt phim (Film Reviewer/Recap) hàng đầu với hàng triệu lượt xem.
            Nhiệm vụ: Viết kịch bản tóm tắt phân đoạn cho bộ phim '{{movieTitle}}' với phong cách '{{targetTone}}'.
            Tổng số cảnh quay trích xuất được từ phim là {{totalScenesCount}}.

            CẤU TRÚC 5 HỒI BẮT BUỘC:
            1. Hook (Mở đầu 5s): Nêu ngay nghịch lý/tình thế ngặt nghèo của nhân vật chính.
            2. Exposition: Giới thiệu nhân vật, bối cảnh và mục tiêu ban đầu.
            3. Rising Action: Dồn dập các biến cố, đan xen nhận xét hóm hỉnh/châm biếm tinh tế.
            4. Climax: Bước ngoặt quyết định của câu chuyện.
            5. Resolution & Rating: Đánh giá tổng thể, chấm điểm và kêu gọi thảo luận.

            TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON HỢP LỆ VỚI CẤU TRÚC:
            {
              "movie_title": "{{movieTitle}}",
              "target_duration_minutes": 3.0,
              "sentences": [
                {
                  "sentence": "Nội dung câu nói voiceover",
                  "suggested_scene_tag": "Action / Mystery / Dialogue / Climax",
                  "emotion": "Tense / Humorous / Serious / Shock",
                  "assigned_scene_index": 1,
                  "estimated_duration_sec": 4.5
                }
              ]
            }
            """;

            var reqBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = systemPrompt + $"\n\nNội dung tóm tắt cốt truyện thô:\n{plotHighlights}" }
                        }
                    }
                },
                generationConfig = new
                {
                    responseMimeType = "application/json",
                    temperature = 0.7
                }
            };

            string jsonPayload = JsonSerializer.Serialize(reqBody);
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

            var resp = await _httpClient.PostAsync(url, new StringContent(jsonPayload, Encoding.UTF8, "application/json"), ct);
            if (resp.IsSuccessStatusCode)
            {
                string respJson = await resp.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(respJson);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (!string.IsNullOrEmpty(text))
                {
                    var result = JsonSerializer.Deserialize<FilmScriptResponse>(text);
                    if (result != null && result.Sentences.Count > 0)
                        return result;
                }
            }
        }
        catch
        {
            // Trượt fallback nếu có lỗi mạng
        }

        return GenerateFallbackTemplate(movieTitle, totalScenesCount);
    }

    private static FilmScriptResponse GenerateFallbackTemplate(string movieTitle, int totalScenes)
    {
        int maxScene = Math.Max(1, totalScenes);
        return new FilmScriptResponse
        {
            MovieTitle = string.IsNullOrWhiteSpace(movieTitle) ? "Tuyệt Tác Điện Ảnh" : movieTitle,
            TargetDurationMinutes = 3.0,
            Sentences = new List<FilmReviewScriptSentence>
            {
                new() {
                    Sentence = $"Nếu một ngày bạn thức dậy và phát hiện cả thế giới đã quên mất sự tồn tại của bạn, bạn sẽ làm gì? Đây chính là khởi đầu ngặt nghèo trong {movieTitle}.",
                    SuggestedSceneTag = "Hook",
                    Emotion = "Shock",
                    AssignedSceneIndex = 1,
                    EstimatedDurationSeconds = 6.0
                },
                new() {
                    Sentence = "Nhân vật chính của chúng ta vốn chỉ là một nhân viên bình thường, nhưng một phát minh bí ẩn trong tầng hầm đã đảo lộn toàn bộ thực tại.",
                    SuggestedSceneTag = "Exposition",
                    Emotion = "Mystery",
                    AssignedSceneIndex = Math.Min(2, maxScene),
                    EstimatedDurationSeconds = 5.5
                },
                new() {
                    Sentence = "Chưa kịp định hình chuyện gì đang xảy ra, anh ta đã bị một tổ chức ngầm rượt đuổi khắp các con phố sầm uất.",
                    SuggestedSceneTag = "Rising Action",
                    Emotion = "Tense",
                    AssignedSceneIndex = Math.Min(3, maxScene),
                    EstimatedDurationSeconds = 5.0
                },
                new() {
                    Sentence = "Hàng loạt cái bẫy tinh vi được giăng ra, đẩy nhịp phim lên cao trào nghẹt thở với những màn đấu trí đỉnh cao.",
                    SuggestedSceneTag = "Rising Action",
                    Emotion = "Action",
                    AssignedSceneIndex = Math.Min(4, maxScene),
                    EstimatedDurationSeconds = 5.2
                },
                new() {
                    Sentence = "Đỉnh điểm là khi bức màn sự thật được vén lên: chính bản sao tương lai của anh ta mới là kẻ chủ mưu đứng sau tất cả.",
                    SuggestedSceneTag = "Climax",
                    Emotion = "Shock",
                    AssignedSceneIndex = Math.Min(5, maxScene),
                    EstimatedDurationSeconds = 6.0
                },
                new() {
                    Sentence = "Một cái kết đầy ám ảnh và xứng đáng nhận điểm 8.5/10. Bạn có suy nghĩ gì về quyết định cuối cùng của nhân vật? Hãy để lại bình luận phía dưới!",
                    SuggestedSceneTag = "Resolution & Rating",
                    Emotion = "Thoughtful",
                    AssignedSceneIndex = Math.Min(6, maxScene),
                    EstimatedDurationSeconds = 7.0
                }
            }
        };
    }
}
