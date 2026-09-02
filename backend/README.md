# CreatorOS Desktop Local Backend Service (Node.js)

Dịch vụ backend phục vụ IPC / REST API cục bộ (Local Daemon) tốc độ cao cho ứng dụng CreatorOS Desktop.

## 📁 Cấu trúc thư mục (Modular Clean Code)

```text
/backend
├── package.json                          # Cấu hình dependency & script (Node ES Module)
├── README.md                             # Hướng dẫn sử dụng & API Specs
└── src/
    ├── server.js                         # Entry point Express IPC server (cổng 5000) + SSE Events
    ├── core/
    │   ├── pluginLoader.js               # Quản lý Lazy-Loading các binary nặng (FFmpeg, Python, AI)
    │   └── queueManager.js               # Hàng đợi đa luồng, Concurrency Limiter & Event Bus
    ├── workers/
    │   └── download.worker.js            # Worker tiến trình ngầm xử lý tải & chuyển mã non-blocking
    ├── controllers/
    │   ├── downloader.controller.js      # Điều phối quét link, nạp Queue và broadcast tiến trình
    │   ├── telemetry.controller.js       # Giám sát tải CPU, RAM, VRAM & Garbage Collection
    │   └── ai.controller.js              # Tạo tiêu đề viral, hashtag, tóm tắt video
    └── routes/
        ├── downloader.routes.js          # API /api/downloader/*
        ├── telemetry.routes.js           # API /api/telemetry/*
        └── ai.routes.js                  # API /api/ai/*
```

## 🚀 Hướng dẫn cài đặt & Khởi chạy cục bộ

```bash
cd backend
npm install

# Khởi chạy chế độ phát triển (Auto-reload với nodemon)
npm run dev

# Khởi chạy chế độ Production
npm start
```

Mặc định server sẽ lắng nghe tại: `http://127.0.0.1:5000`

---

## ⚡ Kiến trúc Hàng đợi & Worker (Job Queue & Worker Architecture)

### 1. `QueueManager` (`/backend/src/core/queueManager.js`)
- **Quản lý trạng thái vòng đời**: `pending` ➔ `running` ➔ `completed` / `failed` / `canceled`.
- **Kiểm soát luồng song song (Concurrency Throttle)**: Mặc định 3 luồng đồng thời (hỗ trợ điều chỉnh động từ 1 đến 32 luồng qua API `/api/downloader/concurrency` để bảo vệ CPU/VRAM).
- **Hỗ trợ ưu tiên (Priority Scheduling)**: Đẩy các job ưu tiên (`high`) lên đầu hàng đợi.
- **Tạm dừng & Tiếp tục (Pause/Resume)**: Dừng nhận task mới mà không ngắt các worker đang chạy.
- **Cơ chế Retry tự động**: Thử lại tối đa 2 lần khi gặp lỗi mạng tạm thời.

### 2. `DownloadWorker` (`/backend/src/workers/download.worker.js`)
- Xử lý bất đồng bộ hoàn toàn (Non-blocking), chia làm 4 giai đoạn rõ rệt:
  1. **Phase 1: Resolving** - Khởi động anti-bot tunnel & giải mã liên kết.
  2. **Phase 2: Downloading** - Tải stream dữ liệu, tính toán tốc độ `MB/s` và `ETA`.
  3. **Phase 3: Transcoding** - Kích hoạt bộ giải mã FFmpeg NVENC (nếu có yêu cầu tách watermark hoặc xuất MP3).
  4. **Phase 4: Finalizing** - Lưu trữ vào thư mục lưu trữ cục bộ (`D:\BatchVault`).
- Hỗ trợ cơ chế **Hủy ngay lập tức (AbortController / kill signal)** khi người dùng ấn Hủy task.

### 3. Đồng bộ dữ liệu Thời gian thực (SSE Event Stream)
Frontend chỉ cần kết nối tới `GET /api/events` để nhận luồng sự kiện JSON:
- `job_added`, `job_started`, `download_progress`, `job_phase`, `job_completed`, `job_failed`, `job_canceled`, `queue_drained`.

---

## 🔌 Danh sách API Endpoints

### 1. Downloader & Queue (`/api/downloader`)
- `POST /api/downloader/scan`: Quét danh sách URL và trích xuất siêu dữ liệu
- `POST /api/downloader/download`: Đưa các item đã chọn vào hàng đợi QueueManager
- `POST /api/downloader/cancel/:id`: Hủy task đang tải hoặc đang chờ
- `POST /api/downloader/pause`: Tạm dừng hàng đợi
- `POST /api/downloader/resume`: Tiếp tục chạy hàng đợi
- `POST /api/downloader/concurrency`: Đổi số luồng tải đồng thời `{ "concurrency": 4 }`
- `GET  /api/downloader/status`: Lấy thống kê hàng đợi và danh sách chi tiết các jobs

### 2. Telemetry (`/api/telemetry`)
- `GET  /api/telemetry/metrics`: Lấy thông số CPU, RAM, VRAM, NVENC workers, Dung lượng đĩa
- `GET  /api/telemetry/health`: Kiểm tra sức khỏe dịch vụ
- `POST /api/telemetry/gc`: Giải phóng bộ nhớ RAM & dọn cache plugin

### 3. AI Copilot (`/api/ai`)
- `POST /api/ai/generate-copy`: Tạo tiêu đề viral, mô tả và hashtag tối ưu theo nền tảng
- `POST /api/ai/transcribe-summary`: Tóm tắt nội dung video từ audio/phụ đề
