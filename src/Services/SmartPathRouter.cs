// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: SmartPathRouter.cs
// Target: C# .NET 9 (Zero-Allocation Token Pattern Router & Windows NTFS Sanitizer)
// ==============================================================================

using System;
using System.IO;
using System.Text;
using System.Buffers;
using CreatorOS.Core.Infrastructure;

namespace CreatorOS.Core.Services;

/// <summary>
/// Ngữ cảnh siêu dữ liệu đầu vào để giải quyết mẫu đường dẫn động.
/// </summary>
public readonly record struct PathContext(
    string BaseDir,
    string Platform,
    string Author,
    string Title,
    string Genre,
    string Resolution,
    string Lang,
    DateTime CompletionDate
);

/// <summary>
/// SmartPathRouter: Động cơ định tuyến mẫu biểu thức động (Token Pattern Engine).
/// - Xử lý cú pháp {BaseDir}\{Platform}\{Date:yyyy-MM}\{Author}\{Resolution}\{Title}.
/// - Tối ưu hiệu năng qua ReadOnlySpan&lt;char&gt; và zero-allocation string parsing.
/// - Tự động làm sạch ký tự cấm NTFS (\ / : * ? " &lt; &gt; |) và hỗ trợ Windows Long Path (\\?\).
/// </summary>
public static class SmartPathRouter
{
    private const int MaxWindowsPathLength = 250;
    private const int MaxSafeTitleLength = 100;
    private static readonly SearchValues<char> InvalidNtfsChars = SearchValues.Create(Path.GetInvalidFileNameChars());

    /// <summary>
    /// Mẫu định tuyến mặc định của CreatorOS.
    /// </summary>
    public const string DefaultPattern = @"{BaseDir}\{Platform}\{Date:yyyy-MM}\{Author}\{Resolution}\{Title}";

    /// <summary>
    /// Giải quyết mẫu đường dẫn thư mục đầu ra dựa trên ngữ cảnh video.
    /// </summary>
    public static string ResolveBundleDirectory(string pattern, in PathContext context)
    {
        if (string.IsNullOrWhiteSpace(pattern))
        {
            pattern = DefaultPattern;
        }

        string baseDir = string.IsNullOrWhiteSpace(context.BaseDir) 
            ? AppPaths.OutputDirectory 
            : context.BaseDir;

        var sb = new StringBuilder(pattern.Length + 64);
        ReadOnlySpan<char> span = pattern.AsSpan();

        int i = 0;
        while (i < span.Length)
        {
            if (span[i] == '{')
            {
                int closeIndex = span[i..].IndexOf('}');
                if (closeIndex > 0)
                {
                    ReadOnlySpan<char> token = span.Slice(i + 1, closeIndex - 1);
                    AppendResolvedToken(sb, token, in context, baseDir);
                    i += closeIndex + 1;
                    continue;
                }
            }

            sb.Append(span[i]);
            i++;
        }

        string rawPath = sb.ToString();
        return NormalizeAndSanitizePath(rawPath);
    }

    /// <summary>
    /// Tạo đường dẫn đầy đủ cho file thành phẩm bên trong Bundle.
    /// </summary>
    public static string ResolveBundleFilePath(string bundleDir, string sanitizedTitle, string suffixWithExtension)
    {
        string fileName = $"{sanitizedTitle}_{suffixWithExtension}";
        string fullPath = Path.Combine(bundleDir, fileName);
        return EnsureLongPathPrefix(fullPath);
    }

    /// <summary>
    /// Phân tích và điền giá trị cho từng Token biểu thức.
    /// </summary>
    private static void AppendResolvedToken(
        StringBuilder sb, 
        ReadOnlySpan<char> token, 
        in PathContext context, 
        string baseDir)
    {
        if (token.Equals("BaseDir".AsSpan(), StringComparison.OrdinalIgnoreCase))
        {
            sb.Append(baseDir.TrimEnd('\\', '/'));
        }
        else if (token.Equals("Platform".AsSpan(), StringComparison.OrdinalIgnoreCase))
        {
            sb.Append(SanitizeSegment(string.IsNullOrWhiteSpace(context.Platform) ? "General" : context.Platform));
        }
        else if (token.StartsWith("Date".AsSpan(), StringComparison.OrdinalIgnoreCase))
        {
            // Hỗ trợ {Date:yyyy-MM}, {Date:yyyy-MM-dd}, v.v.
            int colonIndex = token.IndexOf(':');
            string format = colonIndex > 0 
                ? token[(colonIndex + 1)..].ToString() 
                : "yyyy-MM";

            string dateStr = context.CompletionDate == default 
                ? DateTime.Now.ToString(format) 
                : context.CompletionDate.ToString(format);

            sb.Append(SanitizeSegment(dateStr));
        }
        else if (token.Equals("Author".AsSpan(), StringComparison.OrdinalIgnoreCase))
        {
            sb.Append(SanitizeSegment(string.IsNullOrWhiteSpace(context.Author) ? "Unknown_Author" : context.Author));
        }
        else if (token.Equals("Title".AsSpan(), StringComparison.OrdinalIgnoreCase))
        {
            sb.Append(SanitizeSegment(string.IsNullOrWhiteSpace(context.Title) ? "Untitled_Video" : context.Title, MaxSafeTitleLength));
        }
        else if (token.Equals("Genre".AsSpan(), StringComparison.OrdinalIgnoreCase))
        {
            sb.Append(SanitizeSegment(string.IsNullOrWhiteSpace(context.Genre) ? "General" : context.Genre));
        }
        else if (token.Equals("Resolution".AsSpan(), StringComparison.OrdinalIgnoreCase))
        {
            sb.Append(SanitizeSegment(string.IsNullOrWhiteSpace(context.Resolution) ? "1080p" : context.Resolution));
        }
        else if (token.Equals("Lang".AsSpan(), StringComparison.OrdinalIgnoreCase))
        {
            sb.Append(SanitizeSegment(string.IsNullOrWhiteSpace(context.Lang) ? "vi" : context.Lang));
        }
        else
        {
            // Token không xác định -> giữ nguyên nội dung
            sb.Append('{').Append(token).Append('}');
        }
    }

    /// <summary>
    /// Làm sạch từng phân đoạn đường dẫn, loại bỏ ký tự cấm NTFS và giới hạn độ dài.
    /// </summary>
    public static string SanitizeSegment(ReadOnlySpan<char> input, int maxLength = 80)
    {
        if (input.IsEmpty) return "Unknown";

        // Cắt bớt nếu dài quá mức
        if (input.Length > maxLength)
        {
            input = input[..maxLength];
        }

        Span<char> buffer = stackalloc char[input.Length];
        input.CopyTo(buffer);

        for (int i = 0; i < buffer.Length; i++)
        {
            char c = buffer[i];
            if (c is '\\' or '/' or ':' or '*' or '?' or '"' or '<' or '>' or '|' or '\t' or '\r' or '\n' or (char)0)
            {
                buffer[i] = '_';
            }
        }

        var result = new string(buffer).Trim(' ', '.');
        return string.IsNullOrWhiteSpace(result) ? "Segment" : result;
    }

    /// <summary>
    /// Chuẩn hóa toàn bộ đường dẫn và xử lý dấu gạch chéo Windows.
    /// </summary>
    public static string NormalizeAndSanitizePath(string fullPath)
    {
        if (string.IsNullOrWhiteSpace(fullPath)) return AppPaths.OutputDirectory;

        string normalized = fullPath.Replace('/', '\\');
        
        // Loại bỏ các dấu gạch chéo kép liên tiếp (ngoại trừ root như D:\ hoặc \\?\)
        while (normalized.Contains(@"\\") && !normalized.StartsWith(@"\\?\") && !normalized.StartsWith(@"\\"))
        {
            normalized = normalized.Replace(@"\\", @"\");
        }

        return EnsureLongPathPrefix(normalized);
    }

    /// <summary>
    /// Tự động gắn tiền tố \\?\ cho đường dẫn tuyệt đối khi vượt quá MAX_PATH (260 ký tự).
    /// </summary>
    public static string EnsureLongPathPrefix(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return path;

        // Nếu đã có prefix hoặc là đường dẫn mạng UNC
        if (path.StartsWith(@"\\?\") || path.StartsWith(@"\\.\"))
        {
            return path;
        }

        // Chỉ gắn tiền tố nếu là đường dẫn tuyệt đối có ký tự ổ đĩa (e.g., D:\) và vượt ngưỡng an toàn
        if (path.Length >= MaxWindowsPathLength && Path.IsPathRooted(path) && path.Length >= 3 && path[1] == ':' && path[2] == '\\')
        {
            return @"\\?\" + path;
        }

        return path;
    }

    /// <summary>
    /// Trả về bản xem trước (Live Preview) mô phỏng với dữ liệu giả lập thực tế.
    /// </summary>
    public static string GenerateLivePreview(string pattern, string? customBaseDir = null)
    {
        var sampleContext = new PathContext(
            BaseDir: customBaseDir ?? @"D:\CreatorOS\Dubbed_Output",
            Platform: "TikTok",
            Author: "review_phim_hay",
            Title: "Bi_Mat_Ngoi_Nha_Co_Tap_01",
            Genre: "Phim",
            Resolution: "1080p_Vertical",
            Lang: "vi",
            CompletionDate: DateTime.Now
        );

        return ResolveBundleDirectory(pattern, in sampleContext);
    }
}
