// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: NotificationActivationHandler.cs
// Target: C# .NET 9 WPF (WinRT Toast Notification Activation & Safe Shell Dispatcher)
// ==============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows;

namespace CreatorOS.Core.Services;

/// <summary>
/// Bộ xử lý kích hoạt tương tác người dùng từ Windows Toast Notification.
/// - Phân tích tham số action bằng ReadOnlySpan&lt;char&gt; (Zero-Allocation).
/// - Thực thi lệnh Shell mở thư mục bôi đen file (/select), mở video mặc định, sao chép Clipboard (STA Thread).
/// </summary>
public static class NotificationActivationHandler
{
    public const string ActionOpenFolder = "open_folder";
    public const string ActionPlayVideo = "play_video";
    public const string ActionCopyPath = "copy_path";

    /// <summary>
    /// Xử lý chuỗi đối số kích hoạt từ WinRT Toast (Action Button hoặc Body Click).
    /// Chuỗi có định dạng: action=open_folder&amp;path=D:\Output\Video.mp4
    /// </summary>
    public static void HandleActivation(string? arguments)
    {
        if (string.IsNullOrWhiteSpace(arguments))
        {
            return;
        }

        try
        {
            ReadOnlySpan<char> span = arguments.AsSpan();
            ReadOnlySpan<char> action = default;
            ReadOnlySpan<char> rawPath = default;

            // Phân tích tham số chuỗi Zero-Allocation
            int start = 0;
            while (start < span.Length)
            {
                int nextAmp = span[start..].IndexOf('&');
                ReadOnlySpan<char> segment = nextAmp >= 0 ? span.Slice(start, nextAmp) : span[start..];

                int eqIndex = segment.IndexOf('=');
                if (eqIndex > 0)
                {
                    ReadOnlySpan<char> key = segment[..eqIndex];
                    ReadOnlySpan<char> value = segment[(eqIndex + 1)..];

                    if (key.Equals("action".AsSpan(), StringComparison.OrdinalIgnoreCase))
                    {
                        action = value;
                    }
                    else if (key.Equals("path".AsSpan(), StringComparison.OrdinalIgnoreCase))
                    {
                        rawPath = value;
                    }
                }

                if (nextAmp < 0) break;
                start += nextAmp + 1;
            }

            if (action.IsEmpty) return;

            string path = rawPath.IsEmpty ? string.Empty : Uri.UnescapeDataString(rawPath.ToString());

            if (action.Equals(ActionOpenFolder.AsSpan(), StringComparison.OrdinalIgnoreCase))
            {
                OpenFolderAndSelectFile(path);
            }
            else if (action.Equals(ActionPlayVideo.AsSpan(), StringComparison.OrdinalIgnoreCase))
            {
                PlayVideoFile(path);
            }
            else if (action.Equals(ActionCopyPath.AsSpan(), StringComparison.OrdinalIgnoreCase))
            {
                CopyPathToClipboard(path);
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[NotificationActivationHandler] Error handling toast action: {ex.Message}");
        }
    }

    /// <summary>
    /// Mở Windows Explorer và tự động bôi đen (Highlight / Select) tệp tin đích.
    /// </summary>
    public static void OpenFolderAndSelectFile(string targetPath)
    {
        if (string.IsNullOrWhiteSpace(targetPath)) return;

        try
        {
            if (File.Exists(targetPath))
            {
                // Mở Explorer với cờ /select để bôi đen file đích
                Process.Start(new ProcessStartInfo
                {
                    FileName = "explorer.exe",
                    Arguments = $"/select,\"{targetPath}\"",
                    UseShellExecute = true
                });
            }
            else if (Directory.Exists(targetPath))
            {
                // Mở trực tiếp thư mục nếu đường dẫn là thư mục
                Process.Start(new ProcessStartInfo
                {
                    FileName = "explorer.exe",
                    Arguments = $"\"{targetPath}\"",
                    UseShellExecute = true
                });
            }
            else
            {
                // Nếu tệp chưa tồn tại, mở thư mục cha nếu có
                string? parentDir = Path.GetDirectoryName(targetPath);
                if (!string.IsNullOrEmpty(parentDir) && Directory.Exists(parentDir))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "explorer.exe",
                        Arguments = $"\"{parentDir}\"",
                        UseShellExecute = true
                    });
                }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[NotificationActivationHandler] Failed to open explorer for '{targetPath}': {ex.Message}");
        }
    }

    /// <summary>
    /// Phát video trực tiếp bằng trình phát đa phương tiện mặc định của Windows.
    /// </summary>
    public static void PlayVideoFile(string videoPath)
    {
        if (string.IsNullOrWhiteSpace(videoPath) || !File.Exists(videoPath)) return;

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = videoPath,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[NotificationActivationHandler] Failed to play video '{videoPath}': {ex.Message}");
        }
    }

    /// <summary>
    /// Sao chép đường dẫn tệp vào Windows Clipboard trên Single-Thread Apartment (STA).
    /// </summary>
    public static void CopyPathToClipboard(string textToCopy)
    {
        if (string.IsNullOrWhiteSpace(textToCopy)) return;

        try
        {
            // Kiểm tra Dispatcher của ứng dụng WPF
            if (Application.Current != null && Application.Current.Dispatcher != null)
            {
                Application.Current.Dispatcher.InvokeAsync(() =>
                {
                    try
                    {
                        Clipboard.SetText(textToCopy);
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[NotificationActivationHandler] Clipboard error on Dispatcher: {ex.Message}");
                    }
                });
                return;
            }

            // Fallback: Chạy trên luồng STA độc lập nếu ứng dụng chạy ngoài WPF Context
            var staThread = new Thread(() =>
            {
                try
                {
                    Clipboard.SetText(textToCopy);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[NotificationActivationHandler] Clipboard error on STA Thread: {ex.Message}");
                }
            });
            staThread.SetApartmentState(ApartmentState.STA);
            staThread.IsBackground = true;
            staThread.Start();
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[NotificationActivationHandler] Failed to copy to clipboard: {ex.Message}");
        }
    }
}
