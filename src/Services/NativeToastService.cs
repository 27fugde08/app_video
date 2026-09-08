// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: NativeToastService.cs
// Target: C# .NET 9 WPF (Native WinRT Toast Notifications & Rich Hero Preview)
// ==============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Security;
using System.Text;
using System.Threading.Tasks;
using Windows.Data.Xml.Dom;
using Windows.UI.Notifications;

namespace CreatorOS.Core.Services;

/// <summary>
/// Dữ liệu đầu vào cho yêu cầu hiển thị thông báo WinRT Toast thành phẩm.
/// </summary>
public sealed class ToastNotificationRequest
{
    public required string Title { get; set; }
    public string FormattedDuration { get; set; } = "00:00";
    public string Resolution { get; set; } = "1080p";
    public long FileSizeBytes { get; set; }
    public double ProcessingElapsedMs { get; set; }
    public required string FinalVideoPath { get; set; }
    public required string BundleDirectory { get; set; }
    public string? Thumbnail3DPath { get; set; }
    public string? Tag { get; set; }
    public string Group { get; set; } = "CreatorOS_Dubbing";
}

/// <summary>
/// Dịch vụ thông báo hệ thống Native WinRT Toast Notification cho Windows 10/11.
/// - Không phụ thuộc thư viện UWP bên thứ 3 cồng kềnh, sử dụng trực tiếp Windows.UI.Notifications.
/// - Tự động gắn ảnh Hero Preview 3D và 3 nút hành động tương tác 1-Click.
/// - Kháng lỗi Focus Assist, không gây chặn luồng xử lý chính.
/// </summary>
public static class NativeToastService
{
    public const string AppUserModelId = "CreatorOS.Desktop.Studio";
    private static bool _isInitialized = false;

    /// <summary>
    /// Hiển thị thông báo Toast hoàn thành video bất đồng bộ (Non-blocking background dispatch).
    /// </summary>
    public static Task ShowSuccessToastAsync(ToastNotificationRequest request)
    {
        return Task.Run(() =>
        {
            try
            {
                EnsureInitialized();

                // Tạo nội dung thông số ngắn gọn
                string sizeMb = (request.FileSizeBytes / (1024.0 * 1024.0)).ToString("F1");
                string elapsedSec = (request.ProcessingElapsedMs / 1000.0).ToString("F1");
                string details = $"Thời lượng: {request.FormattedDuration} | {request.Resolution} | {sizeMb} MB | Xử lý trong: {elapsedSec}s";

                // Xây dựng WinRT Toast XML Template
                string toastXml = BuildRichToastXml(
                    title: $"✔ Lồng tiếng hoàn tất: {request.Title}",
                    details: details,
                    finalVideoPath: request.FinalVideoPath,
                    bundleDir: request.BundleDirectory,
                    thumbnailPath: request.Thumbnail3DPath
                );

                var xmlDoc = new XmlDocument();
                xmlDoc.LoadXml(toastXml);

                var toast = new ToastNotification(xmlDoc)
                {
                    Tag = string.IsNullOrWhiteSpace(request.Tag) ? Guid.NewGuid().ToString("N") : request.Tag,
                    Group = request.Group,
                    ExpirationTime = DateTimeOffset.Now.AddHours(24) // Tự động dọn dẹp sau 24h
                };

                // Lắng nghe sự kiện người dùng nhấp vào nút hành động hoặc thân thông báo
                toast.Activated += (sender, args) =>
                {
                    if (args is ToastActivatedEventArgs activatedArgs)
                    {
                        NotificationActivationHandler.HandleActivation(activatedArgs.Arguments);
                    }
                };

                toast.Dismissed += (sender, args) =>
                {
                    Debug.WriteLine($"[NativeToastService] Toast dismissed: Reason = {args.Reason}");
                };

                toast.Failed += (sender, args) =>
                {
                    Debug.WriteLine($"[NativeToastService] Toast failed: ErrorCode = {args.ErrorCode}");
                };

                // Gửi thông báo đến Windows Notification Service
                var notifier = ToastNotificationManager.CreateToastNotifier(AppUserModelId);
                notifier.Show(toast);

                Debug.WriteLine($"[NativeToastService] Toast sent successfully for '{request.Title}'. Tag: {toast.Tag}");
            }
            catch (Exception ex)
            {
                // Kháng lỗi Focus Assist / Windows Notification Permissions tắt
                Debug.WriteLine($"[NativeToastService] Warning: Could not show Windows Toast: {ex.Message}");
            }
        });
    }

    /// <summary>
    /// Xây dựng chuỗi XML chuẩn WinRT cho Toast Notification (có ảnh Hero và Nút hành động).
    /// </summary>
    private static string BuildRichToastXml(
        string title, 
        string details, 
        string finalVideoPath, 
        string bundleDir, 
        string? thumbnailPath)
    {
        string escapedTitle = SecurityElement.Escape(title) ?? string.Empty;
        string escapedDetails = SecurityElement.Escape(details) ?? string.Empty;
        string launchArg = SecurityElement.Escape($"action={NotificationActivationHandler.ActionOpenFolder}&path={Uri.EscapeDataString(bundleDir)}") ?? string.Empty;

        var sb = new StringBuilder(1024);
        sb.Append($"<toast duration=\"long\" launch=\"{launchArg}\">");
        sb.Append("<visual>");
        sb.Append("<binding template=\"ToastGeneric\">");
        sb.Append($"<text>{escapedTitle}</text>");
        sb.Append($"<text>{escapedDetails}</text>");

        // Nếu có ảnh thumbnail 3D hợp lệ, nhúng vào vị trí Hero Image
        if (!string.IsNullOrEmpty(thumbnailPath) && File.Exists(thumbnailPath))
        {
            string thumbUri = new Uri(Path.GetFullPath(thumbnailPath)).AbsoluteUri;
            sb.Append($"<image placement=\"hero\" src=\"{SecurityElement.Escape(thumbUri)}\" alt=\"Thumbnail 3D Preview\" />");
        }

        sb.Append("</binding>");
        sb.Append("</visual>");

        // 3 Nút Bấm Hành Động 1-Click
        sb.Append("<actions>");
        
        // Nút 1: Mở Thư Mục & Bôi Đen File
        string openFolderArg = SecurityElement.Escape($"action={NotificationActivationHandler.ActionOpenFolder}&path={Uri.EscapeDataString(bundleDir)}") ?? string.Empty;
        sb.Append($"<action content=\"📂 Mở thư mục\" arguments=\"{openFolderArg}\" activationType=\"foreground\" />");

        // Nút 2: Phát Video Ngay
        string playVideoArg = SecurityElement.Escape($"action={NotificationActivationHandler.ActionPlayVideo}&path={Uri.EscapeDataString(finalVideoPath)}") ?? string.Empty;
        sb.Append($"<action content=\"▶ Phát video\" arguments=\"{playVideoArg}\" activationType=\"foreground\" />");

        // Nút 3: Sao Chép Đường Dẫn File
        string copyPathArg = SecurityElement.Escape($"action={NotificationActivationHandler.ActionCopyPath}&path={Uri.EscapeDataString(finalVideoPath)}") ?? string.Empty;
        sb.Append($"<action content=\"📋 Sao chép đường dẫn\" arguments=\"{copyPathArg}\" activationType=\"background\" />");

        sb.Append("</actions>");
        sb.Append("</toast>");

        return sb.ToString();
    }

    /// <summary>
    /// Xóa toàn bộ thông báo cũ trong Action Center thuộc nhóm của CreatorOS.
    /// </summary>
    public static void ClearOldNotifications(string group = "CreatorOS_Dubbing")
    {
        try
        {
            ToastNotificationManager.History.RemoveGroup(group, AppUserModelId);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[NativeToastService] Could not clear notification history: {ex.Message}");
        }
    }

    /// <summary>
    /// Khởi tạo và thiết lập định danh AUMID trong registry / shell nếu cần.
    /// </summary>
    private static void EnsureInitialized()
    {
        if (_isInitialized) return;
        _isInitialized = true;
    }
}
