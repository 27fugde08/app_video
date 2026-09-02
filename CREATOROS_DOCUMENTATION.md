# 🚀 CreatorOS PRO_V40 - Hệ Thống Tự Động Hóa & Sản Xuất Video Đa Nền Tảng

Tài liệu kỹ thuật toàn diện về kiến trúc hệ thống, các module xử lý đa phương tiện (Multimedia Pipeline), tự động hóa AI (Whisper, Demucs, Wav2Lip, Gemini 2.5), tầng Desktop Client (.NET 9 + WPF MVVM / Electron), cơ sở dữ liệu nhúng SQLite WAL và cơ chế bảo mật Windows DPAPI.

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Chi Tiết Các Module C# 12 / .NET 9 Desktop Core](#2-chi-tiết-các-module-c-12--net-9-desktop-core)
3. [Chi Tiết Các Module Tự Động Hóa Python AI](#3-chi-tiết-các-module-tự-động-hóa-python-ai)
4. [Tầng Cơ Sở Dữ Liệu SQLite WAL & Quản Lý Dữ Liệu](#4-tầng-cơ-sở-dữ-liệu-sqlite-wal--quản-lý-dữ-liệu)
5. [Cơ Chế Bảo Mật Thông Tin & Windows DPAPI](#5-cơ-chế-bảo-mật-thông-tin--windows-dpapi)
6. [Tối Ưu Hiệu Năng Đồ Họa & Chống Memory Leak](#6-tối-ưu-hiệu-năng-đồ-họa--chống-memory-leak)
7. [Hướng Dẫn Cài Đặt & Khởi Chạy Tự Động](#7-hướng-dẫn-cài-đặt--khởi-chạy-tự-động)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

CreatorOS PRO_V40 được thiết kế theo mô hình **Kiến Trúc Đa Tầng Hiệu Năng Cao (High-Performance Multi-Layer Architecture)**:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        1. PRESENTATION LAYER (UI / UX)                                 │
│  - WPF .NET 9 MVVM (CommunityToolkit.Mvvm) / React 19 + Frameless Obsidian Theme       │
│  - VirtualizingStackPanel (Recycling Mode), Direct GPU Rendering (144Hz)               │
│  - Live Telemetry Gauges (CPU, RAM, VRAM, NVENC Encoder Utlization)                    │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼ (In-Process / Channels / IPC Stream)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                 2. APPLICATION CORE & PIPELINE CONTROLLER (.NET 9)                     │
│  - LocalQueueWorkerService: Bounded Channel (System.Threading.Channels)                │
│  - BatchDownloaderEngine: SocketsHttpHandler + SemaphoreSlim Concurrency Limiter       │
│  - FFmpegNvencEngine: Async Process Stream Pipe + Hardware Accelerated Transcoder      │
│  - AntiDetectionMutatorService: Micro-optical & Acoustic Mutation + MD5/SHA256 Padding │
│  - AccountProxyManagerService: Session/Fingerprint Isolation + Round-Robin Rotation    │
│  - AutoPostingEngineService: Scheduled Dispatcher + Exponential Backoff Retry + Jitter  │
│  - SecureConfigurationService: Windows DPAPI (ProtectedData) + Atomic File I/O         │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼ (Process Tree Execution / Subprocess Pipes)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      3. AI & MULTIMEDIA WORKER ENGINES                                 │
│  - FFmpeg 7.x + NVIDIA NVENC (h264_nvenc, hevc_nvenc)                                  │
│  - Meta Demucs (PyTorch CUDA Vocal & Instrumental Isolation)                           │
│  - OpenAI Whisper (CUDA FP16 Speech-to-Text & Subtitle Translation)                    │
│  - Wav2Lip / SadTalker (AI Lip-Sync & Face Restoration)                                │
│  - Google GenAI SDK (Gemini 2.5 Flash Structured JSON Output)                          │
│  - Playwright Chromium (Headless Browser Automation + Session State Injection)         │
│  - SQLite 3 (WAL Mode, Single-Writer Semaphore Lock, 32MB Shared Page Cache)           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CHI TIẾT CÁC MODULE C# 12 / .NET 9 DESKTOP CORE

### 2.1. `BatchDownloaderEngine`
- **Mục đích**: Tải xuống video hàng loạt siêu tốc mà không làm cạn kiệt tài nguyên mạng (Socket Exhaustion) và CPU.
- **Tính năng chính**:
  - `SocketsHttpHandler` tùy chỉnh: Thiết lập `PooledConnectionLifetime` và `MaxConnectionsPerServer`.
  - Điều phối Concurrency: `SemaphoreSlim` giới hạn 3–5 kết nối đồng thời.
  - Streaming trực tiếp đĩa cứng: `HttpCompletionOption.ResponseHeadersRead` kết hợp `FileStream(useAsync: true)` theo block 80KB, không nuốt RAM.
  - Throttled Progress Reporting: Điều tiết báo cáo tiến độ về `IProgress<DownloadProgressReport>` mỗi 250ms, chống đơ UI Dispatcher.

### 2.2. `FFmpegNvencEngine`
- **Mục đích**: Mã hóa và render video tận dụng GPU NVIDIA.
- **Tính năng chính**:
  - Khử Deadlock: Đọc bất đồng bộ `process.BeginErrorReadLine()` và sự kiện `ErrorDataReceived`.
  - Cấu hình NVENC chuyên sâu: `-c:v h264_nvenc`, `-preset p4`, `-tune hq`, `-rc vbr`, `-cq 22`, `-spatial-aq 1`, `-temporal-aq 1`, `-movflags +faststart`.
  - Dọn dẹp tiến trình an toàn: `process.Kill(entireProcessTree: true)` khi nhận tín hiệu hủy (`CancellationToken`).

### 2.3. `LocalQueueWorkerService`
- **Mục đích**: Hàng đợi tác vụ bất đồng bộ hiệu năng cao.
- **Tính năng chính**:
  - `System.Threading.Channels` (`BoundedChannel<T>`): Khống chế kích thước hàng đợi, áp dụng cơ chế Backpressure (`BoundedChannelFullMode.Wait`).
  - Vòng lặp `ReadAllAsync()`: Không chiếm dụng CPU khi hàng đợi rảnh rỗi.
  - Quản lý `CancellationTokenSource` độc lập cho từng task.

### 2.4. `AntiDetectionMutatorService`
- **Mục đích**: Biến đổi vi mô phá vỡ thuật toán quét bản quyền tự động (Content ID / pHash).
- **Tính năng chính**:
  - Biến đổi quang học: Cắt xén viền 2–6px, nội suy Lanczos, vi chỉnh gamma, contrast, brightness, saturation (±0.8% - 1.5%).
  - Biến đổi âm học: Dịch chuyển tempo (`atempo=1.003`), resample 48kHz.
  - Đổi mã băm tệp: Tiêm padding byte vô hại ngẫu nhiên vào cuối container MP4, đổi 100% mã băm MD5 và SHA-256.
  - Xóa toàn bộ Metadata gốc (`-map_metadata -1`) và giả lập thiết bị quay thật.

### 2.5. `AccountProxyManagerService`
- **Mục đích**: Quản lý đa tài khoản mạng xã hội và xoay vòng Proxy.
- **Tính năng chính**:
  - Tách biệt `storage_state.json` và `User-Agent` cho từng tài khoản.
  - Kiểm tra độ trễ và liveness của Proxy qua `SocketsHttpHandler`.
  - Thuật toán xoay vòng Round-Robin không khóa qua `Interlocked.Increment`.

### 2.6. `AutoPostingEngineService`
- **Mục đích**: Tự động hóa đăng tải video theo lịch trình.
- **Tính năng chính**:
  - Thuật toán Exponential Backoff kết hợp Random Jitter ($5s \rightarrow 10s \rightarrow 20s + \text{delay ngẫu nhiên}$).
  - Tự động chụp và lưu trữ ảnh chụp màn hình lỗi (`Error Screenshot`) khi xảy ra ngoại lệ.

---

## 3. CHI TIẾT CÁC MODULE TỰ ĐỘNG HÓA PYTHON AI

### 3.1. `PipelineManager` (`scripts/pipeline_manager.py`)
- Hàng đợi tác vụ đa luồng, máy trạng thái FSM (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`).
- Cơ chế tự động dọn dẹp thư mục tạm trong khối `try...finally`.

### 3.2. `VocalSeparator` (`scripts/vocal_separator.py`)
- Tách giọng hát và nhạc nền qua Meta Demucs trên CUDA GPU.
- Chia nhỏ segment âm thanh và gọi `torch.cuda.empty_cache()` + `gc.collect()` thu hồi VRAM ngay khi xong.

### 3.3. `WhisperSubtitleTranscriber` (`scripts/whisper_transcriber.py`)
- Phiên âm giọng nói (STT) bằng OpenAI Whisper FP16 có VAD filter.
- Tự động dịch phụ đề sang tiếng Việt và xuất file `.srt` chuẩn UTF-8.

### 3.4. `GeminiVideoMetadataGenerator` (`scripts/gemini_metadata_generator.py`)
- Tích hợp `google-genai` SDK với mô hình `gemini-2.5-flash`.
- Structured Output (JSON Schema qua Pydantic) đảm bảo 100% cấu trúc đầu ra: Viral Hooks, SEO Description, Trending Hashtags.

### 3.5. `SocialAnalyticsTracker` (`scripts/social_analytics_tracker.py`)
- Trích xuất số liệu tương tác (Views, Likes, Comments, Shares) qua `yt-dlp`.
- Công thức tính Engagement Rate có trọng số:
  $$\text{ER (\%)} = \frac{\text{Likes} + (\text{Comments} \times 2) + (\text{Shares} \times 3)}{\text{Views}} \times 100$$
- Xuất báo cáo hiệu suất tuần bằng Window Function `ROW_NUMBER()` trong SQLite.

---

## 4. TẦNG CƠ SỞ DỮ LIỆU SQLITE WAL & QUẢN LÝ DỮ LIỆU

Module **`SqliteDatabaseService`** sử dụng thư viện `Microsoft.Data.Sqlite` với cấu hình tối ưu chuyên biệt:

```sql
PRAGMA journal_mode = WAL;          -- Ghi nhật ký trước (Đọc/Ghi đồng thời)
PRAGMA synchronous = NORMAL;        -- Giảm số lần flush đĩa, an toàn tuyệt đối với WAL
PRAGMA temp_store = MEMORY;         -- Lưu bảng tạm trên RAM
PRAGMA cache_size = -32000;         -- 32MB Shared Page Cache
PRAGMA busy_timeout = 10000;        -- Timeout tự động retry 10s
```

- **Nguyên tắc Single-Writer / Concurrent Readers**: Tất cả các thao tác ghi (`INSERT`, `UPDATE`, `DELETE`) được bảo vệ bởi `SemaphoreSlim(1,1)`, trong khi các thao tác đọc (`SELECT`) chạy song song không cần khóa, loại bỏ 100% lỗi `database is locked`.

---

## 5. CƠ CHẾ BẢO MẬT THÔNG TIN & WINDOWS DPAPI

Module **`SecureConfigurationService`** kết hợp lớp bảo mật **Windows Data Protection API (`ProtectedData`)**:
- Khóa mã hóa được sinh động từ thông tin xác thực của tài khoản Windows đang đăng nhập (`DataProtectionScope.CurrentUser`) kèm theo chuỗi Salt Entropy bí mật.
- File cấu hình `appsettings.secure.json` lưu trữ an toàn các trường `encrypted_gemini_api_key`, `encrypted_master_password`.
- Cơ chế ghi file nguyên tử (`Atomic Write` qua `.tmp` và `File.Move(..., overwrite: true)`) chống hỏng file khi sập nguồn.

---

## 6. TỐI ƯU HIỆU NĂNG ĐỒ HỌA & CHỐNG MEMORY LEAK

1. **Đóng Băng Bitmap (`Image.Freeze()`)**: Mọi thumbnail được nạp với `BitmapCacheOption.OnLoad`, giải mã đúng `DecodePixelWidth=320` và gọi `.Freeze()` để render trực tiếp qua DirectX GPU VRAM mà không khóa file gốc.
2. **Ảo Hóa Giao Diện (UI Virtualization)**:
   ```xml
   VirtualizingStackPanel.IsVirtualizing="True"
   VirtualizingStackPanel.VirtualizationMode="Recycling"
   VirtualizingStackPanel.ScrollUnit="Pixel"
   ```
3. **Quản Lý Vòng Đời ViewModel (`DisposableViewModelBase`)**: Tự động hủy `CancellationTokenSource` và giải phóng toàn bộ subscriptions khi View bị đóng.

---

## 7. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY TỰ ĐỘNG

Dự án cung cấp bộ kịch bản khởi chạy tự động:

### Cách 1: Khởi chạy nhanh qua Batch File (Khuyến nghị cho Windows)
Nhấp đúp chuột vào file:
```cmd
run-creatoros.bat
```

### Cách 2: Khởi chạy bằng PowerShell
Mở PowerShell tại thư mục dự án và thực thi:
```powershell
.\run-creatoros.ps1
```

Script sẽ tự động:
1. Kiểm tra sự hiện diện của **.NET 9 SDK**, **Python 3.10+**, và **FFmpeg**.
2. Tạo môi trường ảo `py_env` và cài đặt các thư viện từ `requirements.txt`.
3. Biên dịch dự án .NET 9 WPF (`dotnet build`).
4. Khởi chạy ứng dụng và nạp sẵn biến môi trường cần thiết.

---
*Bản quyền tài liệu thuộc về CreatorOS PRO_V40 Architecture Team.*
