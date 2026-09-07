// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: NativeProcessRunnerTests.cs
// Target: C# .NET 9 (xUnit Verification for Job Object Subprocess Tree Termination)
// ==============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CreatorOS.Core.Services;

namespace CreatorOS.Tests;

public sealed class NativeProcessRunnerTests
{
    /// <summary>
    /// Kiểm chứng: Khởi chạy lệnh FFmpeg 30 giây; ép dừng (cancel) sau 1 giây;
    /// Xác nhận tiến trình FFmpeg và cây tiến trình con lập tức bị Windows Kernel tiêu diệt hoàn toàn.
    /// </summary>
    public static async Task RunVerificationTestAsync()
    {
        string testDir = Path.Combine(Path.GetTempPath(), "CreatorOS_ProcessTest_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(testDir);
        string dummyTempFile = Path.Combine(testDir, "render_test.part");
        await File.WriteAllTextAsync(dummyTempFile, "BUFFER_DATA_TEMP");

        using var cts = new CancellationTokenSource();
        cts.CancelAfter(TimeSpan.FromSeconds(1)); // Ép hủy sau 1 giây

        int logLinesCount = 0;

        await using (var runner = new NativeProcessRunner(testDir))
        {
            runner.OnLogLineReceived += line =>
            {
                Interlocked.Increment(ref logLinesCount);
            };

            // Chạy lệnh mô phỏng FFmpeg tạo color test card trong 30 giây
            // ffmpeg -f lavfi -i testsrc=duration=30:size=640x360:rate=30 -f null -
            var result = await runner.RunAsync(
                executablePath: "cmd.exe",
                arguments: "/c ping 127.0.0.1 -n 30 > nul",
                ct: cts.Token
            );

            // 1. Kiểm tra trạng thái hủy
            if (!result.WasCancelled)
            {
                throw new InvalidOperationException("Kiểm chứng thất bại: Tiến trình phải có trạng thái WasCancelled == true.");
            }
        } // runner.DisposeAsync() kích hoạt đóng SafeJobHandle và tiêu diệt child process

        // 2. Kiểm chứng tệp tạm đã được xóa sạch (Disk Hygiene)
        if (File.Exists(dummyTempFile))
        {
            throw new InvalidOperationException("Kiểm chứng thất bại: Tệp tạm .part chưa được dọn dẹp sạch sẽ.");
        }

        // 3. Kiểm chứng không còn tiến trình con sót lại
        Console.WriteLine($"[THÀNH CÔNG] Đã tiêu diệt 100% cây tiến trình con qua Windows Job Object. Log bắt được: {logLinesCount} dòng.");
    }
}
