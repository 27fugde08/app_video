# TÀI LIỆU THIẾT KẾ KIẾN TRÚC DESKTOP APPLICATION - CREATOROS

---

## 🏛️ TỔNG QUAN KIẾN TRÚC ĐA TẦNG (MULTI-LAYER DESKTOP ARCHITECTURE)

Hệ thống được tái cấu trúc toàn diện từ mô hình web app đơn lẻ sang **Mô hình Kiến trúc Ứng dụng Desktop Windows Phân Tách 3 Tầng**:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 1. UI LAYER (RENDERER)                                  │
│  - React 19 + Tailwind CSS + Frameless Obsidian Design                                  │
│  - Window Controls (Minimize, Maximize, Close with Audio Haptics)                       │
│  - Batch Downloader Pro (Table, Search, Filter, Multi-select, Export)                   │
│  - Telemetry Dashboard Bar (Real-time CPU/RAM/VRAM & NVENC GPU Gauges)                  │
│  - Custom Hooks (useBatchDownloader, useTelemetry, useQueue)                            │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼ (IPC Protocol / Transport)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         2. DESKTOP IPC BRIDGE & TRANSPORT LAYER                         │
│  - Native Electron IPC Bridge (Preload.cjs -> contextBridge)                            │
│  - Core IPC Client (src/core/ipc/ipcClient.ts)                                          │
│  - Bi-directional Real-time SSE Stream (GET /api/events)                                │
│  - Graceful Fallback / Isolated Offline Simulation Engine                               │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼ (Local Loopback http://127.0.0.1:5000)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     3. CORE DAEMON / BACKGROUND PROCESS (BACKEND)                       │
│  - Independent Node.js Process (Auto-spawned & Monitored by Electron)                   │
│  - QueueManager (Multi-worker Concurrency Limiter, Priority Scheduler)                  │
│  - DownloadWorker Pool (Non-blocking Abortable Execution Chunks)                        │
│  - PluginLoader (On-demand Lazy loading of FFmpeg NVENC & Python FastCrawl)             │
│  - Child Process Spawner (ffmpeg.exe, ffprobe.exe, yt-dlp.exe)                          │
│  - Hardware Telemetry Diagnostician (CPU utilization, GPU VRAM, Disk Storage)           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. UI LAYER (GIAO DIỆN / RENDERER)
* **Trách nhiệm**: Đảm nhận toàn bộ việc hiển thị trực quan, tương tác người dùng, quản lý trạng thái hiển thị của các module (Batch Downloader Pro, Telemetry, Post Scheduler, Video Studio).
* **Nguyên tắc Single Responsibility**:
  - Không nhúng mã gọi child_process hoặc các tiến trình nhị phân nặng trực tiếp vào UI.
  - Sử dụng các React Hook (`useBatchDownloader`, `useTelemetry`) để tách biệt giữa Presentation và Data Fetching.
* **Giao tiếp**: Mọi yêu cầu tính toán, quét link, tải video đều được ủy quyền thông qua `ipcClient`.

---

## 2. IPC BRIDGE & LOCAL API CLIENT (`/src/core/ipc/`)
* **`ipcClient.ts`**: Cung cấp interface thống nhất cho toàn bộ Frontend:
  - `invoke(endpoint, method, body)`: Gửi lệnh và nhận kết quả bất đồng bộ.
  - `on(event, callback)`: Lắng nghe các sự kiện luồng thời gian thực (`job_started`, `download_progress`, `job_completed`, `hardware_tick`).
  - `sendWindowControl(action)`: Điều khiển thu nhỏ, phóng to, đóng cửa sổ ứng dụng Windows.
* **`types.ts`**: Đặc tả kiểu dữ liệu nghiêm ngặt cho Job, Queue Metrics, và Hardware Telemetry.

---

## 3. CORE DAEMON / BACKGROUND PROCESS (`/backend/src/`)
* **Trách nhiệm**: Tiến trình ngầm độc lập chạy trên máy trạm Windows, không làm đơ giao diện người dùng.
* **Mô-đun cốt lõi**:
  1. **`queueManager.js`**: Hàng đợi công việc đa luồng, kiểm soát số luồng song song (`concurrency: 3 - 32`), điều phối độ ưu tiên và tự động thử lại khi lỗi mạng.
  2. **`download.worker.js`**: Worker bất đồng bộ quản lý 4 giai đoạn tải (`resolving` -> `downloading` -> `transcoding` -> `finalizing`), hỗ trợ ngắt tức thì (`AbortController` & `kill signal`).
  3. **`pluginLoader.js`**: Nạp trễ (Lazy-load) các thư viện nặng (FFmpeg NVENC, Python) khi có yêu cầu thực tế, giúp ứng dụng khởi động tức thì dưới 0.5s và chiếm <30MB RAM ban đầu.
  4. **`downloader.controller.js`**: Điều phối tiếp nhận URL, sinh `jobId`, và đẩy vào `QueueManager`.
  5. **`telemetry.controller.js`**: Đọc cảm biến phần cứng (CPU, RAM, VRAM GPU, dung lượng ổ đĩa) và giải phóng bộ nhớ (Garbage Collector).

---

## 4. QUY TRÌNH ĐÓNG GÓI & VẬN HÀNH WINDOWS (.EXE)
1. **Khởi động**: Electron `main.cjs` khởi tạo cửa sổ frameless obsidian, đồng thời tự động kích hoạt `backend/src/server.js` chạy nền tại cổng `5000`.
2. **Thực thi**: Người dùng thao tác trên giao diện -> `ipcClient` gửi yêu cầu xuống Core Daemon -> Worker kích hoạt `ffmpeg.exe` / `yt-dlp.exe` xử lý -> SSE đẩy tiến độ 0-100% về UI.
3. **Thoát**: Khi đóng ứng dụng, Electron tự động gửi tín hiệu `SIGTERM` dọn sạch toàn bộ tiến trình ngầm, không để lại tiến trình rác trên Windows Task Manager.
