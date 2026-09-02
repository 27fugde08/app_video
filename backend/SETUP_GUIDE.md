# ====================================================================
# CREATOROS DESKTOP - SETUP & HEAVY DEPENDENCIES GUIDE (LOCAL ENVIRONMENT)
# ====================================================================

Tài liệu này hướng dẫn cài đặt các thư viện nặng, tệp nhị phân (binaries) 
và môi trường thực thi để vận hành trơn tru phần Backend của Batch Downloader Pro trên máy tính cục bộ (Local Desktop).

---
## 1. YÊU CẦU MÔI TRƯỜNG CƠ BẢN
---
- **Node.js**: Phiên bản `v18.0.0` hoặc mới hơn (`v20+ LTS` khuyến nghị).
- **Redis Server** (Tùy chọn cho BullMQ / Hàng đợi phân tán đa tiến trình):
  * **Windows**: Sử dụng Docker (`docker run -d -p 6379:6379 redis:alpine`) hoặc tải bản Redis Windows Native.
  * **Khởi động**: `redis-server` (Mặc định: `127.0.0.1:6379`).
  * *Lưu ý*: CreatorOS có tích hợp sẵn `QueueManager` nội bộ (In-memory + EventEmitter) cho các máy không cài Redis.

---
## 2. TẢI VÀ ĐẶT CÁC TỆP NHỊ PHÂN NẶNG (BINARIES)
---
Để đảm bảo repository luôn nhẹ và tải về tức thì, các binary nhị phân nặng không commit trực tiếp vào mã nguồn git. Hãy tải và đặt vào đúng vị trí sau:

```text
backend/
└── bin/
    ├── ffmpeg/
    │   ├── ffmpeg.exe        # Binary xử lý video & NVENC hardware acceleration
    │   └── ffprobe.exe       # Binary kiểm tra codec, bitrate & độ phân giải
    └── ytdlp/
        └── yt-dlp.exe        # Binary bóc tách luồng video đa nền tảng
```

### A. Tải FFmpeg & FFprobe:
1. Tải bản Windows build tĩnh (Static build): [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) hoặc [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases).
2. Giải nén và sao chép `ffmpeg.exe` cùng `ffprobe.exe` vào thư mục:
   `/backend/bin/ffmpeg/`

### B. Tải yt-dlp:
1. Tải bản `yt-dlp.exe` phát hành mới nhất từ kho lưu trữ GitHub chính thức: [yt-dlp/yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases).
2. Sao chép tệp `yt-dlp.exe` vào thư mục:
   `/backend/bin/ytdlp/`

---
## 3. CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)
---
Tạo tệp `.env` tại thư mục `/backend/.env` với nội dung:

```env
# Server Network Config
PORT=5000
HOST=0.0.0.0

# Redis Connection (Optional / Distributed Queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Paths to Heavy Binaries
FFMPEG_PATH=./bin/ffmpeg/ffmpeg.exe
FFPROBE_PATH=./bin/ffmpeg/ffprobe.exe
YTDLP_PATH=./bin/ytdlp/yt-dlp.exe

# Storage Vault Export Directory
EXPORT_VAULT_DIR=D:\Downloads\CreatorOS\BatchVault
```

---
## 4. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN TRÊN MÁY CÁ NHÂN (VS CODE)
---

### Bước 1: Khởi động Backend IPC Daemon (Terminal 1)
```bash
cd backend
npm install
npm run dev
```
*(Server backend sẽ lắng nghe tại: `http://localhost:5000`)*

### Bước 2: Khởi động Frontend React Desktop UI (Terminal 2)
Mở một cửa sổ Terminal mới tại thư mục gốc của dự án:
```bash
npm install
# hoặc nếu dùng Bun: bun install

npm run dev
# hoặc: bun run dev
```
*(Giao diện Desktop sẽ mở tại: `http://localhost:3000`)*

---
## 5. KIỂM TRA KẾT NỐI (HEALTHCHECK)
- **Kiểm tra trạng thái Backend**: Truy cập `http://localhost:5000/api/status`
- **Kiểm tra trạng thái Hàng đợi**: `http://localhost:5000/api/downloader/status`
- **Kiểm tra luồng sự kiện SSE**: `http://localhost:5000/api/events`
