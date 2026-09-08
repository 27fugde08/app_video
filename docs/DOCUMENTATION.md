# CreatorOS Desktop - Technical Architecture & Systems Reference

> **Principal Systems Architect & Lead C# .NET Engineer Reference**  
> **Target Runtime:** .NET 9 (`net9.0-windows`), C# 13, Direct3D 11, FFmpeg NVENC, Windows x64.  
> **Design Philosophy:** 100% Standalone Windows Native Desktop Application (Zero Localhost HTTP, Zero Cloud Dependencies, Zero Web Wrappers).

---

## 1. High-Level Native Architecture

CreatorOS Desktop operates entirely in-process within the .NET 9 CLR and local Win32 subprocesses, structured in 4 distinct native layers:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             WPF UI LAYER (60 FPS)                                │
│   XAML Views • CommunityToolkit.Mvvm • D3DImage Video Viewport (Zero-Copy)       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ WeakReferenceMessenger / Channels
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                    CORE IN-PROCESS ORCHESTRATION LAYER                           │
│   InMemoryJobQueue (System.Threading.Channels) • HardwareGovernor (DXGI VRAM)    │
│   NativeVideoOrchestrator • BatchDownloadCoordinator • AudioDuckingEngine        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Win32 P/Invoke & Process Interop
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                       OS EXECUTION & SECURITY LAYER                              │
│   Windows Job Object (JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE) • SafeJobHandle        │
│   AppPaths (Known Folders) • WindowsAppControlRemediator (Zone.Identifier)       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Direct Hardware Acceleration
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                         LOCAL HARDWARE & NATIVE BINARIES                         │
│   NVIDIA NVENC (h264_nvenc) • Direct3D 11 Interop • ffmpeg.exe • yt-dlp.exe      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Zero-Orphan Process Management (Win32 Job Objects)

When executing child CLI utilities (`ffmpeg.exe`, `yt-dlp.exe`, `whisper-cli.exe`), standard .NET `Process.Kill()` fails to terminate grandchild subprocesses if the parent application crashes or is closed via Task Manager.

CreatorOS Desktop uses Win32 **Windows Job Objects** via P/Invoke to enforce kernel-level lifecycle bounds:

```csharp
[StructLayout(LayoutKind.Sequential)]
public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
{
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit;
    public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryLimit;
    public UIntPtr PeakJobMemoryLimit;
}

public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
```

1. **Job Creation**: `CreateJobObjectW(IntPtr.Zero, null)` allocates an unmanaged Job Object handle wrapped inside `SafeJobHandle` (`SafeHandleZeroOrMinusOneIsInvalid`).
2. **Limit Assignment**: `SetInformationJobObject` configures `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`.
3. **Process Association**: `AssignProcessToJobObject(hJob, hProcess)` attaches the child process immediately after spawn with `CREATE_SUSPENDED` or normal creation.
4. **Kernel Guarantee**: When CreatorOS Desktop terminates (normally or abnormally), the OS Kernel automatically and instantly terminates all attached child and grandchild subprocesses.

---

## 3. Hardware Governor & In-Memory Concurrency

### Hardware Governor (`HardwareGovernor.cs`)
- Queries the physical graphics adapter via DXGI / Direct3D 11 to check **Dedicated Video Memory (VRAM)**.
- Dynamically selects optimal encoder:
  - `EncoderMode.NvidiaNvenc` (`h264_nvenc`, `hevc_nvenc`) if NVIDIA GPU with $\ge 4\text{GB}$ VRAM is detected.
  - `EncoderMode.AmdAmf` (`h264_amf`) for AMD Radeon.
  - `EncoderMode.IntelQsv` (`h264_qsv`) for Intel Arc / UHD.
  - `EncoderMode.CpuSoftware` (`libx264 ultrafast`) fallback.
- Enforces an in-process hardware lease semaphore (`SemaphoreSlim(2, 2)`) to prevent VRAM exhaustion and GPU driver crashes from parallel encodes.

### In-Memory Job Queue (`InMemoryJobQueue.cs`)
- Built on `System.Threading.Channels.Channel<RenderJobTask>.CreateBounded<RenderJobTask>(500)`.
- Eliminates external message brokers (Redis, RabbitMQ).
- Multi-producer, single-consumer processing model with asynchronous enumeration (`IAsyncEnumerable<T>`).
- UI Throttling: Background logs are buffered and dispatched to WPF at $\sim 100\text{ms}$ ticks via `PeriodicTimer`, sustaining a stable 60 FPS even under 2,000 log events/second.

---

## 4. End-to-End 8-Stage Video Production Pipeline

```text
[Stage 1: Extract/Download] ──► [Stage 2: Stem Separation (Demucs)]
                                             │
┌────────────────────────────────────────────┴───────────────────────────────────────┐
│                                                                                    │
▼                                                                                    ▼
[Stage 3: Whisper STT (Word-level)]                             [Stage 4: Vocal Alignment]
          │                                                                  │
          ▼                                                                  ▼
[Stage 5: Neural Translation] ──► [Stage 6: Time-Stretching] ──► [Stage 7: Sidechain Ducking]
                                                                             │
                                                                             ▼
                                                                [Stage 8: NVENC Final Export]
```

1. **Stage 1 - Video Extraction**: `yt-dlp` extracts raw streams with zero watermark directly to `AppPaths.Temp/{jobId}/source.mp4`.
2. **Stage 2 - Neural Audio Stem Separation**: Demucs splits audio into `vocals.wav` and `accompaniment.wav` (BGM).
3. **Stage 3 - Speech Recognition (STT)**: `faster-whisper` performs transcription generating precise word-level timestamps (`start_ms`, `end_ms`).
4. **Stage 4 - Alignment & VAD**: Silero VAD detects speech boundaries and eliminates background noise hallucinations.
5. **Stage 5 - Neural Translation**: Generates context-aware translated text preserving pacing markers.
6. **Stage 6 - Audio Time-Stretching**: Dynamic `atempo` / phase vocoder scaling ensures translated voice tracks match original speaker timing without pitch distortion.
7. **Stage 7 - Sidechain Audio Ducking**: Sidechain compressor applies $-15\text{dB}$ attenuation to BGM whenever vocal energy is detected (Attack: 10ms, Release: 250ms).
8. **Stage 8 - GPU NVENC Multiplexing**: FFmpeg compiles the final video with styled karaoke subtitle overlays (`.ass`) and NVENC VBR encoding to `Videos/CreatorOS/`.

---

## 5. Windows Known Folders & Storage Hygiene

CreatorOS Desktop uses native Windows folder structures via `Environment.GetFolderPath`:

| Mục đích | Đường dẫn thực tế trên Windows | Cơ chế dọn dẹp |
| :--- | :--- | :--- |
| **Output Thành phẩm** | `Environment.SpecialFolder.MyVideos/CreatorOS` | Lưu trữ lâu dài của người dùng. |
| **Cấu hình Ứng dụng** | `Environment.SpecialFolder.ApplicationData/CreatorOS/config.json` | Tự động ghi atomical JSON khi thay đổi cài đặt. |
| **Cache & Thư mục tạm** | `Environment.SpecialFolder.LocalApplicationData/CreatorOS/Temp/{jobId}` | Xóa sạch $100\%$ trong khối `try-finally` ngay khi kết thúc tác vụ. |
