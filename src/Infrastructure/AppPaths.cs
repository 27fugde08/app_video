// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: AppPaths.cs
// Target: C# .NET 9 (Standardized Windows Known Folders & Path Resolver)
// ==============================================================================

using System;
using System.IO;

namespace CreatorOS.Core.Infrastructure;

/// <summary>
/// AppPaths: Quản lý tập trung toàn bộ đường dẫn thư mục chuẩn trên Windows.
/// Tuân thủ quy tắc vệ sinh ổ đĩa (Disk Hygiene) và phân quyền ứng dụng Windows.
/// </summary>
public static class AppPaths
{
    private static readonly string BaseAppData = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), 
        "CreatorOS");

    private static readonly string BaseLocalAppData = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
        "CreatorOS");

    private static readonly string BaseMyVideos = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), 
        "CreatorOS");

    /// <summary>
    /// Thư mục tạm lưu trữ dữ liệu trung gian: %LocalAppData%/CreatorOS/Temp
    /// </summary>
    public static string TempDirectory => EnsureDirectoryExists(Path.Combine(BaseLocalAppData, "Temp"));

    /// <summary>
    /// Thư mục lưu cấu hình người dùng: %AppData%/CreatorOS
    /// </summary>
    public static string ConfigDirectory => EnsureDirectoryExists(BaseAppData);

    /// <summary>
    /// Đường dẫn tệp cấu hình JSON chính: %AppData%/CreatorOS/config.json
    /// </summary>
    public static string ConfigFilePath => Path.Combine(ConfigDirectory, "config.json");

    /// <summary>
    /// Thư mục lưu video thành phẩm xuất ra: SpecialFolder.MyVideos/CreatorOS
    /// </summary>
    public static string OutputDirectory => EnsureDirectoryExists(BaseMyVideos);

    /// <summary>
    /// Thư mục lưu các video tải về: SpecialFolder.MyVideos/CreatorOS/Downloads
    /// </summary>
    public static string DownloadsDirectory => EnsureDirectoryExists(Path.Combine(BaseMyVideos, "Downloads"));

    /// <summary>
    /// Thư mục lưu video render xuất bản: SpecialFolder.MyVideos/CreatorOS/Exports
    /// </summary>
    public static string ExportsDirectory => EnsureDirectoryExists(Path.Combine(BaseMyVideos, "Exports"));

    /// <summary>
    /// Thư mục chứa các công cụ native nhị phân (ffmpeg, whisper, yt-dlp): AppContext.BaseDirectory/Tools
    /// </summary>
    public static string ToolsDirectory => EnsureDirectoryExists(Path.Combine(AppContext.BaseDirectory, "Tools"));

    /// <summary>
    /// Tạo một thư mục tạm duy nhất cho một tác vụ cụ thể dựa trên JobId.
    /// </summary>
    public static string GetJobTempDirectory(string jobId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(jobId);
        return EnsureDirectoryExists(Path.Combine(TempDirectory, jobId));
    }

    /// <summary>
    /// Lấy đường dẫn tệp thực thi native hoặc fallback tên công cụ trên PATH.
    /// </summary>
    public static string GetNativeToolPath(string toolName)
    {
        var localPath = Path.Combine(ToolsDirectory, toolName);
        if (File.Exists(localPath)) return localPath;

        var nativeRuntimePath = Path.Combine(AppContext.BaseDirectory, "runtimes", "win-x64", "native", toolName);
        if (File.Exists(nativeRuntimePath)) return nativeRuntimePath;

        return toolName;
    }

    /// <summary>
    /// Đảm bảo thư mục tồn tại trên ổ đĩa nếu chưa có.
    /// </summary>
    public static string EnsureDirectoryExists(string path)
    {
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
        return path;
    }
}
