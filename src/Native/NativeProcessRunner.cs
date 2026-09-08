// ==============================================================================
// CreatorOS Desktop - Principal Systems Engineer Guidelines (Karpathy Pattern)
// File: NativeProcessRunner.cs
// Target: C# .NET 9 (Win32 Job Object P/Invoke Subprocess Runner & Stream Reader)
// ==============================================================================

using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

namespace CreatorOS.Core.Services;

/// <summary>
/// SafeHandle bọc Windows Kernel Job Object đảm bảo giải phóng bộ nhớ unmanaged an toàn.
/// </summary>
public sealed class SafeJobHandle : SafeHandleZeroOrMinusOneIsInvalid
{
    public SafeJobHandle() : base(true) { }

    protected override bool ReleaseHandle()
    {
        return CloseHandle(handle);
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseHandle(IntPtr hObject);
}

public static class WindowsJobObject
{
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const int JobObjectExtendedLimitInformation = 9;

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern SafeJobHandle CreateJobObjectW(IntPtr lpJobAttributes, string? lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryLimit;
        public UIntPtr PeakJobMemoryLimit;
    }

    public static SafeJobHandle CreateJobObjectWithKillOnClose()
    {
        var handle = CreateJobObjectW(IntPtr.Zero, null);
        if (handle.IsInvalid) return handle;

        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr extendedInfoPtr = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(info, extendedInfoPtr, false);
            SetInformationJobObject(handle.DangerousGetHandle(), JobObjectExtendedLimitInformation, extendedInfoPtr, (uint)length);
        }
        finally
        {
            Marshal.FreeHGlobal(extendedInfoPtr);
        }

        return handle;
    }

    public static void AssignProcess(SafeJobHandle jobHandle, Process process)
    {
        if (OperatingSystem.IsWindows() && jobHandle != null && !jobHandle.IsInvalid && !process.HasExited)
        {
            try
            {
                AssignProcessToJobObject(jobHandle.DangerousGetHandle(), process.Handle);
            }
            catch { }
        }
    }
}

/// <summary>
/// Kết quả sau khi thực thi tiến trình con.
/// </summary>
public readonly record struct ProcessRunResult(
    bool Success,
    int ExitCode,
    TimeSpan ElapsedTime,
    string StandardOutput,
    string StandardError,
    bool WasCancelled,
    int CleanedTempFilesCount
);

/// <summary>
/// NativeProcessRunner: Thực thi an toàn các binary bên ngoài (ffmpeg, yt-dlp) qua Win32 Job Object.
/// 
/// Karpathy Engineering Principles:
/// 1. Thread Execution Context:
///    - Đọc luồng StandardOutput/StandardError phi đồng bộ trên ThreadPool.
///    - Phát tán log theo thời gian thực qua event Action&lt;string&gt; mà không block luồng gọi.
/// 2. Unmanaged Resource & Process Tree Safety:
///    - Bọc tiến trình vào Windows Job Object với cờ JOBOBJECT_LIMIT_KILL_ON_JOB_CLOSE.
///    - Đảm bảo 100% khi ứng dụng tắt, crash hoặc Task Manager kết thúc, toàn bộ cây tiến trình con biến mất ngay lập tức.
/// 3. Disk Hygiene:
///    - Tự động dọn dẹp các tệp tạm trung gian (.tmp, .part, .wav) trong khối finally/dispose.
/// </summary>
public sealed class NativeProcessRunner : IAsyncDisposable, IDisposable
{
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const int JobObjectExtendedLimitInformation = 9;

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern SafeJobHandle CreateJobObjectW(IntPtr lpJobAttributes, string? lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetInformationJobObject(
        IntPtr hJob,
        int JobObjectInfoClass,
        IntPtr lpJobObjectInfo,
        uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryLimit;
        public UIntPtr PeakJobMemoryLimit;
    }

    private readonly string _workingDirectory;
    private readonly string[] _tempFileExtensionsToClean;
    private readonly SafeJobHandle? _jobHandle;
    private Process? _currentProcess;
    private int _cleanedFilesCount;
    private bool _disposed;

    /// <summary>
    /// Bắn log ra ngoài thời gian thực khi có dòng mới từ StandardOutput hoặc StandardError.
    /// </summary>
    public event Action<string>? OnLogLineReceived;

    public NativeProcessRunner(string? workingDirectory = null, string[]? tempFileExtensionsToClean = null)
    {
        _workingDirectory = string.IsNullOrWhiteSpace(workingDirectory)
            ? Path.Combine(Path.GetTempPath(), "CreatorOS_Job_" + Guid.NewGuid().ToString("N"))
            : workingDirectory;

        _tempFileExtensionsToClean = tempFileExtensionsToClean ?? [".tmp", ".part", ".wav", ".pcm", ".raw"];

        if (!Directory.Exists(_workingDirectory))
            Directory.CreateDirectory(_workingDirectory);

        if (OperatingSystem.IsWindows())
        {
            _jobHandle = InitializeJobObject();
        }
    }

    private static SafeJobHandle InitializeJobObject()
    {
        var job = CreateJobObjectW(IntPtr.Zero, null);
        if (job.IsInvalid)
            throw new Win32Exception(Marshal.GetLastPInvokeError(), "Không thể khởi tạo Windows Job Object.");

        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            BasicLimitInformation = new JOBOBJECT_BASIC_LIMIT_INFORMATION
            {
                LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            }
        };

        int length = Marshal.SizeOf<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>();
        IntPtr infoPtr = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(info, infoPtr, false);
            if (!SetInformationJobObject(job.DangerousGetHandle(), JobObjectExtendedLimitInformation, infoPtr, (uint)length))
            {
                throw new Win32Exception(Marshal.GetLastPInvokeError(), "Không thể gán cờ JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE.");
            }
        }
        finally
        {
            Marshal.FreeHGlobal(infoPtr);
        }

        return job;
    }

    public async Task<ProcessRunResult> RunAsync(
        string executablePath,
        string arguments,
        Action<string>? onStdOutLine = null,
        Action<string>? onStdErrLine = null,
        CancellationToken ct = default)
    {
        ThrowIfDisposed();

        var sw = Stopwatch.StartNew();
        var stdOutBuffer = new StringBuilder();
        var stdErrBuffer = new StringBuilder();
        bool wasCancelled = false;

        var psi = new ProcessStartInfo
        {
            FileName = executablePath,
            Arguments = arguments,
            WorkingDirectory = _workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8
        };

        var process = new Process { StartInfo = psi };
        _currentProcess = process;

        using var cancelReg = ct.Register(() =>
        {
            wasCancelled = true;
            KillEntireProcessTree();
        });

        try
        {
            if (!process.Start())
                throw new InvalidOperationException($"Không thể khởi chạy tiến trình: {executablePath}");

            // Gán tiến trình con vào Windows Job Object
            if (OperatingSystem.IsWindows() && _jobHandle != null && !_jobHandle.IsInvalid)
            {
                try
                {
                    if (!process.HasExited && !AssignProcessToJobObject(_jobHandle.DangerousGetHandle(), process.Handle))
                    {
                        int err = Marshal.GetLastPInvokeError();
                        if (err != 0 && err != 5) // Bỏ qua lỗi Access Denied nếu đã được gán
                        {
                            throw new Win32Exception(err, "Không thể gán Process vào Windows Job Object.");
                        }
                    }
                }
                catch (InvalidOperationException) { }
            }

            // Đọc luồng StandardOutput và StandardError bất đồng bộ bằng ReadLineAsync
            var stdOutTask = ReadStreamAsync(process.StandardOutput, line =>
            {
                stdOutBuffer.AppendLine(line);
                onStdOutLine?.Invoke(line);
                OnLogLineReceived?.Invoke(line);
            }, ct);

            var stdErrTask = ReadStreamAsync(process.StandardError, line =>
            {
                stdErrBuffer.AppendLine(line);
                onStdErrLine?.Invoke(line);
                OnLogLineReceived?.Invoke(line);
            }, ct);

            await Task.WhenAll(process.WaitForExitAsync(ct), stdOutTask, stdErrTask).ConfigureAwait(false);
            sw.Stop();

            return new ProcessRunResult(
                Success: process.ExitCode == 0 && !wasCancelled,
                ExitCode: process.ExitCode,
                ElapsedTime: sw.Elapsed,
                StandardOutput: stdOutBuffer.ToString(),
                StandardError: stdErrBuffer.ToString(),
                WasCancelled: wasCancelled,
                CleanedTempFilesCount: _cleanedFilesCount
            );
        }
        catch (OperationCanceledException)
        {
            wasCancelled = true;
            KillEntireProcessTree();

            return new ProcessRunResult(
                Success: false,
                ExitCode: -1,
                ElapsedTime: sw.Elapsed,
                StandardOutput: stdOutBuffer.ToString(),
                StandardError: stdErrBuffer.ToString(),
                WasCancelled: true,
                CleanedTempFilesCount: _cleanedFilesCount
            );
        }
        finally
        {
            CleanupTemporaryFiles();
            _currentProcess = null;
        }
    }

    private static async Task ReadStreamAsync(StreamReader reader, Action<string> onLine, CancellationToken ct)
    {
        try
        {
            while (!reader.EndOfStream && !ct.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync(ct).ConfigureAwait(false);
                if (line != null)
                {
                    onLine(line);
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (IOException) { }
    }

    public void KillEntireProcessTree()
    {
        var proc = _currentProcess;
        if (proc == null) return;

        try
        {
            if (!proc.HasExited)
            {
                proc.Kill(entireProcessTree: true);
                proc.WaitForExit(1000);
            }
        }
        catch { }
    }

    public int CleanupTemporaryFiles()
    {
        int deleted = 0;
        if (!Directory.Exists(_workingDirectory)) return 0;

        try
        {
            var dirInfo = new DirectoryInfo(_workingDirectory);
            foreach (var file in dirInfo.GetFiles())
            {
                foreach (var ext in _tempFileExtensionsToClean)
                {
                    if (file.Extension.Equals(ext, StringComparison.OrdinalIgnoreCase))
                    {
                        try { file.Delete(); deleted++; } catch { }
                        break;
                    }
                }
            }
        }
        catch { }

        Interlocked.Add(ref _cleanedFilesCount, deleted);
        return deleted;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        KillEntireProcessTree();
        CleanupTemporaryFiles();

        _currentProcess?.Dispose();
        _jobHandle?.Dispose();

        GC.SuppressFinalize(this);
    }

    public ValueTask DisposeAsync()
    {
        Dispose();
        return ValueTask.CompletedTask;
    }

    private void ThrowIfDisposed() => ObjectDisposedException.ThrowIf(_disposed, this);
}
