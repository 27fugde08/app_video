// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: VietnameseSyllableCounter.cs
// Target: C# .NET 9 (C# 13) Studio Rhythmic Syllable Lock Engine
// ==============================================================================

using System;
using System.Text;

namespace CreatorOS.Core.Services;

/// <summary>
/// Bộ tính toán âm tiết tiếng Việt tức thì và khóa nhịp phòng thu:
/// - Tốc độ nói tiếng Việt chuẩn phòng thu: 3.8 âm tiết / giây.
/// - Công thức: N_target = Clamp(Round(DeltaT * 3.8), 2, 60).
/// - Thuật toán đếm âm tiết: Chuẩn hóa Unicode NFC, loại bỏ dấu câu, tách từ theo khoảng trắng.
/// - Thiết kế Zero-Allocation bằng ReadOnlySpan<char>.
/// </summary>
public static class VietnameseSyllableCounter
{
    public const double StudioStandardRatePerSec = 3.8;
    public const int MinSyllables = 2;
    public const int MaxSyllables = 60;
    public const double MinSpeedMultiplier = 0.90;
    public const double MaxSpeedMultiplier = 1.15;

    /// <summary>
    /// Tính số âm tiết mục tiêu chuẩn xác cho thời lượng DeltaT
    /// N_target = Clamp(Round(DeltaT * 3.8), 2, 60)
    /// </summary>
    public static int CalculateTargetSyllables(double durationSec)
    {
        if (durationSec <= 0.05) return MinSyllables;
        double raw = durationSec * StudioStandardRatePerSec;
        int rounded = (int)Math.Round(raw, MidpointRounding.AwayFromZero);
        return Math.Clamp(rounded, MinSyllables, MaxSyllables);
    }

    /// <summary>
    /// Đếm số âm tiết tiếng Việt từ chuỗi văn bản.
    /// Chuẩn hóa Unicode FormC, loại bỏ toàn bộ dấu câu và đếm từ phân tách bằng khoảng trắng.
    /// </summary>
    public static int CountSyllables(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 0;
        
        // Chuẩn hóa Unicode NFC để tránh tách rời ký tự tổ hợp
        string normalized = text.IsNormalized(NormalizationForm.FormC)
            ? text
            : text.Normalize(NormalizationForm.FormC);

        return CountSyllablesSpan(normalized.AsSpan());
    }

    /// <summary>
    /// Đếm âm tiết tiếng Việt tối ưu Zero-Allocation qua ReadOnlySpan<char>.
    /// </summary>
    public static int CountSyllablesSpan(ReadOnlySpan<char> span)
    {
        int syllableCount = 0;
        bool inWord = false;
        bool hasAlphanumeric = false;

        for (int i = 0; i < span.Length; i++)
        {
            char c = span[i];

            if (char.IsWhiteSpace(c) || IsPunctuationOrSymbol(c))
            {
                if (inWord)
                {
                    if (hasAlphanumeric)
                    {
                        syllableCount++;
                    }
                    inWord = false;
                    hasAlphanumeric = false;
                }
            }
            else
            {
                inWord = true;
                if (char.IsLetterOrDigit(c))
                {
                    hasAlphanumeric = true;
                }
            }
        }

        if (inWord && hasAlphanumeric)
        {
            syllableCount++;
        }

        return syllableCount;
    }

    /// <summary>
    /// Kiểm tra số âm tiết thực tế có nằm trong biên dung sai [N_target - 1, N_target + 1] hay không.
    /// </summary>
    public static bool IsWithinTolerance(int actualSyllables, int targetSyllables, int tolerance = 1)
    {
        return Math.Abs(actualSyllables - targetSyllables) <= tolerance;
    }

    /// <summary>
    /// Tính toán hệ số tốc độ đọc (SpeedMultiplier) co giãn tự nhiên trong ngưỡng [0.90, 1.15].
    /// </summary>
    public static double CalculateSpeedMultiplier(int actualSyllables, double durationSec)
    {
        if (durationSec <= 0.05 || actualSyllables <= 0) return 1.0;

        double requiredRate = actualSyllables / durationSec;
        double ratio = requiredRate / StudioStandardRatePerSec;

        // Ép trong dải an toàn không gây méo giọng (0.90 - 1.15)
        double clamped = Math.Clamp(ratio, MinSpeedMultiplier, MaxSpeedMultiplier);
        return Math.Round(clamped, 2);
    }

    private static bool IsPunctuationOrSymbol(char c)
    {
        return char.IsPunctuation(c) 
            || char.IsSymbol(c) 
            || c is ',' or '.' or '!' or '?' or ';' or ':' or '"' or '\'' 
                 or '(' or ')' or '[' or ']' or '{' or '}' or '«' or '»' 
                 or '…' or '—' or '–' or '-' or '/' or '\\' or '|';
    }
}
