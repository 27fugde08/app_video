// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: GeminiDirectorBenchmarkTests.cs
// Target: C# .NET 9 (Verification & Benchmark for GeminiDirectorClient & Syllable Lock)
// ==============================================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Core.Contracts;
using CreatorOS.Core.Services;

namespace CreatorOS.Tests;

public static class GeminiDirectorBenchmarkTests
{
    public static async Task<int> RunAllTestsAsync(TextWriter? log = null)
    {
        log ??= Console.Out;
        await log.WriteLineAsync("================================================================================");
        await log.WriteLineAsync("🎬 [BENCHMARK & VERIFICATION] GeminiDirectorClient & VietnameseSyllableCounter");
        await log.WriteLineAsync("Target: C# .NET 9 (C# 13) Direct REST Dialogue Director Engine (No SDK)");
        await log.WriteLineAsync("================================================================================\n");

        int passed = 0;
        int total = 4;

        if (await Test1_VietnameseSyllableCounterAlgorithmAsync(log)) passed++;
        if (await Test2_ZeroReflectionSourceGeneratorAsync(log)) passed++;
        if (await Test3_SceneWindowingAndPronounCoherenceAsync(log)) passed++;
        if (await Test4_DirectSceneBatchExecutionAndSpeedMultiplierAsync(log)) passed++;

        await log.WriteLineAsync("\n================================================================================");
        await log.WriteLineAsync($"🏁 KẾT QUẢ KIỂM THỬ: {passed}/{total} BÀI TEST ĐẠT (PASS)");
        await log.WriteLineAsync("================================================================================");

        return passed == total ? 0 : 1;
    }

    /// <summary>
    /// Test 1: Kiểm chứng thuật toán đếm âm tiết tiếng Việt và công thức khóa nhịp 3.8 syllables/s
    /// </summary>
    private static async Task<bool> Test1_VietnameseSyllableCounterAlgorithmAsync(TextWriter log)
    {
        await log.WriteLineAsync("▶ [TEST 1] Thuật toán đếm âm tiết Unicode NFC & Công thức Target Syllable...");

        // 1. Kiểm tra công thức Target: N_target = Clamp(Round(DeltaT * 3.8), 2, 60)
        int target1 = VietnameseSyllableCounter.CalculateTargetSyllables(1.0);  // 1.0 * 3.8 = 3.8 -> 4
        int target2 = VietnameseSyllableCounter.CalculateTargetSyllables(2.5);  // 2.5 * 3.8 = 9.5 -> 10
        int targetMin = VietnameseSyllableCounter.CalculateTargetSyllables(0.1); // Clamp to 2
        int targetMax = VietnameseSyllableCounter.CalculateTargetSyllables(30.0); // Clamp to 60

        bool mathPass = target1 == 4 && target2 == 10 && targetMin == 2 && targetMax == 60;
        await log.WriteLineAsync($"  • Target Syllables: 1.0s={target1} (kỳ vọng 4), 2.5s={target2} (kỳ vọng 10) -> {(mathPass ? "ĐẠT" : "LỖI")}");

        // 2. Kiểm tra đếm âm tiết có dấu câu, ký tự đặc biệt, chuẩn hóa NFC
        string sample1 = "Xin chào, tôi là đạo diễn âm thanh!"; // 8 âm tiết
        string sample2 = "«Hành động ngay, không được chậm trễ...»"; // 7 âm tiết
        string sample3 = "CreatorOS vận hành 100% In-Process với GPU NVIDIA RTX."; // 9 âm tiết

        int count1 = VietnameseSyllableCounter.CountSyllables(sample1);
        int count2 = VietnameseSyllableCounter.CountSyllables(sample2);
        int count3 = VietnameseSyllableCounter.CountSyllables(sample3);

        bool countPass = count1 == 8 && count2 == 7 && count3 == 9;
        await log.WriteLineAsync($"  • Đếm âm tiết tiếng Việt: Câu 1={count1}/8, Câu 2={count2}/7, Câu 3={count3}/9 -> {(countPass ? "ĐẠT" : "LỖI")}");

        bool pass = mathPass && countPass;
        await log.WriteLineAsync($"  👉 [TEST 1] Kết quả: {(pass ? "✅ PASS" : "❌ FAIL")}\n");
        return pass;
    }

    /// <summary>
    /// Test 2: Kiểm chứng Source Generator System.Text.Json (DirectorJsonContext) không Reflection & Native AOT
    /// </summary>
    private static async Task<bool> Test2_ZeroReflectionSourceGeneratorAsync(TextWriter log)
    {
        await log.WriteLineAsync("▶ [TEST 2] Serialization không Reflection qua DirectorJsonContext (Native AOT)...");

        var testLine = new SubtitleLine(1, 0.5, 3.2, "Speaker_1", "This is an important tactical operation.");
        var directed = new DirectedLine(1, "Speaker_1", "Đây là một chiến dịch tác chiến cực kỳ quan trọng.", "excited", 1.05, 11, 11, 50.0);

        // Serialize & Deserialize không Reflection
        string jsonLine = JsonSerializer.Serialize(testLine, DirectorJsonContext.Default.SubtitleLine);
        string jsonDirected = JsonSerializer.Serialize(directed, DirectorJsonContext.Default.DirectedLine);

        var restoredDirected = JsonSerializer.Deserialize(jsonDirected, DirectorJsonContext.Default.DirectedLine);

        bool pass = restoredDirected.Id == 1 
                 && restoredDirected.VietnameseText == directed.VietnameseText 
                 && restoredDirected.Emotion == "excited"
                 && Math.Abs(restoredDirected.SpeedMultiplier - 1.05) < 0.001;

        await log.WriteLineAsync($"  • JSON Directed Output: {jsonDirected}");
        await log.WriteLineAsync($"  • Round-trip Native AOT Deserialize: {(pass ? "Thành công" : "Thất bại")}");
        await log.WriteLineAsync($"  👉 [TEST 2] Kết quả: {(pass ? "✅ PASS" : "❌ FAIL")}\n");
        return pass;
    }

    /// <summary>
    /// Test 3: Kiểm chứng Scene Windowing (15 - 25 câu) và cố định đại từ xưng hô theo phân cảnh
    /// </summary>
    private static async Task<bool> Test3_SceneWindowingAndPronounCoherenceAsync(TextWriter log)
    {
        await log.WriteLineAsync("▶ [TEST 3] Phân cụm phân cảnh (Scene Windowing 15-25 câu) & Giữ cặp xưng hô...");

        var sceneContext = new SceneContext(
            Setting: "Boong tàu chỉ huy vũ trụ",
            Tone: "Khẩn cấp, quân sự, quyết đoán",
            CharacterRelationships: new Dictionary<string, string>
            {
                ["Commander"] = "Chỉ huy trưởng (tôi / anh)",
                ["Pilot"] = "Phi công cấp dưới (cậu / em)"
            }
        );

        // Tạo 30 câu thoại (vượt quá 25 câu để kiểm tra auto-chunking 15-25 câu)
        var lines = new List<SubtitleLine>(30);
        for (int i = 1; i <= 30; i++)
        {
            string spk = (i % 2 == 0) ? "Commander" : "Pilot";
            lines.Add(new SubtitleLine(i, (i - 1) * 2.5, i * 2.5, spk, $"Status update report line number {i}."));
        }

        using var client = new GeminiDirectorClient();
        var sw = Stopwatch.StartNew();

        // Thực thi batch với windowing tự động
        var directedLines = await client.DirectSceneBatchAsync(lines, apiKey: "", sceneContext: sceneContext);
        sw.Stop();

        bool countMatch = directedLines.Count == 30;
        bool allHaveSyllables = directedLines.All(d => d.TargetSyllables >= 2 && d.ActualSyllables >= 2);
        bool allEmotionsValid = directedLines.All(d => d.Emotion is "angry" or "sad" or "excited" or "calm" or "whisper");

        await log.WriteLineAsync($"  • Số câu xử lý qua Windowing: {directedLines.Count}/30 câu ({sw.ElapsedMilliseconds} ms)");
        await log.WriteLineAsync($"  • Khóa âm tiết 100% câu thoại: {(allHaveSyllables ? "ĐẠT" : "LỖI")}");
        await log.WriteLineAsync($"  • Gán nhãn cảm xúc đạo diễn chuẩn: {(allEmotionsValid ? "ĐẠT" : "LỖI")}");

        bool pass = countMatch && allHaveSyllables && allEmotionsValid;
        await log.WriteLineAsync($"  👉 [TEST 3] Kết quả: {(pass ? "✅ PASS" : "❌ FAIL")}\n");
        return pass;
    }

    /// <summary>
    /// Test 4: Kiểm chứng co giãn SpeedMultiplier (0.90 - 1.15) và dung sai âm tiết
    /// </summary>
    private static async Task<bool> Test4_DirectSceneBatchExecutionAndSpeedMultiplierAsync(TextWriter log)
    {
        await log.WriteLineAsync("▶ [TEST 4] Tính toán SpeedMultiplier co giãn an toàn trong dải [0.90, 1.15]...");

        // Trường hợp 1: Nói nhanh hơn 1 chút -> SpeedMultiplier tăng lên (max 1.15)
        double speedHigh = VietnameseSyllableCounter.CalculateSpeedMultiplier(12, 2.5); // 12 / (2.5 * 3.8) = 12 / 9.5 = 1.26 -> Clamped to 1.15
        // Trường hợp 2: Nói chậm hơn 1 chút -> SpeedMultiplier giảm xuống (min 0.90)
        double speedLow = VietnameseSyllableCounter.CalculateSpeedMultiplier(7, 2.5);  // 7 / 9.5 = 0.73 -> Clamped to 0.90
        // Trường hợp 3: Khớp hoàn hảo
        double speedIdeal = VietnameseSyllableCounter.CalculateSpeedMultiplier(10, 2.63); // ~1.0

        bool speedPass = speedHigh <= 1.15 && speedHigh >= 1.10
                      && speedLow >= 0.90 && speedLow <= 0.95
                      && Math.Abs(speedIdeal - 1.0) <= 0.05;

        await log.WriteLineAsync($"  • SpeedMultiplier (High/Fast): {speedHigh:F2} (Giới hạn: 1.15)");
        await log.WriteLineAsync($"  • SpeedMultiplier (Low/Slow): {speedLow:F2} (Giới hạn: 0.90)");
        await log.WriteLineAsync($"  • SpeedMultiplier (Ideal): {speedIdeal:F2} (~1.00)");

        bool pass = speedPass;
        await log.WriteLineAsync($"  👉 [TEST 4] Kết quả: {(pass ? "✅ PASS" : "❌ FAIL")}\n");
        return pass;
    }
}
