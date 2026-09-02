# 🧪 CreatorOS Desktop - Hướng dẫn Kiểm thử Tích hợp (Integration & Flow Test Guide)

Tài liệu này cung cấp hướng dẫn đầy đủ cách kiểm thử luồng chạy (**Execution Flow Test**) và tích hợp giữa **UI Layer (Electron / React)** và **Core Daemon (Node.js Background Service)** của ứng dụng CreatorOS Desktop.

---

## 1. Tổng quan Kiến trúc Giao tiếp (Bridge Architecture)

```text
┌──────────────────────────────────────────────┐
│          UI LAYER (ELECTRON / REACT)         │
│  - Gửi lệnh: ipcClient.invoke(endpoint, body)│
│  - Lắng nghe: EventSource('/api/events')     │
└──────────────────────▲───────────────────────┘
                       │ (HTTP REST & SSE Events)
┌──────────────────────▼───────────────────────┐
│        CORE DAEMON (LOCAL BACKGROUND)        │
│  - Port: 5000 (127.0.0.1:5000)               │
│  - Job Queue & Hardware Telemetry (NVENC/VRAM)│
│  - AES-256-GCM AI Key Vault & Rotation       │
│  - File Logger: ./logs/daemon.log            │
└──────────────────────────────────────────────┘
```

---

## 2. Cách chạy Kịch bản Kiểm thử Tự động (Automated Test Runner)

Kịch bản kiểm thử tự động đã được tích hợp sẵn trong file `backend/test/test-daemon-flow.js`.

### Bước 1: Khởi động Core Daemon (Terminal 1)
```bash
cd backend
npm start
```
*Daemon sẽ lắng nghe tại `http://127.0.0.1:5000`.*

### Bước 2: Chạy Kịch bản Kiểm thử Luồng (Terminal 2)
```bash
cd backend
npm run test:flow
```

### Kịch bản tự động sẽ kiểm tra lần lượt:
1. **Local IPC / Bridge Health Check**: Xác thực endpoint `/api/health` và `/api/status`.
2. **Hardware Governor & Telemetry**: Kiểm tra chỉ số thời gian thực CPU, RAM, VRAM, NVENC.
3. **Mock Data Flow cho Batch Downloader**: Đẩy URL vào hàng đợi, tạo Job ID và lắng nghe sự kiện tiến trình SSE (0% ➔ 100%).
4. **AI Key Manager & Rotation Dispatcher**: Thêm Key mã hóa, kiểm tra kết nối API probe, thử thuật toán xoay vòng Round-Robin và dọn dẹp dữ liệu kiểm thử.
5. **Khả năng Chống Crash & Ghi Log**: Kiểm tra log cục bộ tại `./logs/daemon.log`.

---

## 3. Kiểm thử Thủ công Bằng Lệnh (cURL / PowerShell)

Nếu bạn muốn kiểm tra từng tính năng độc lập từ dòng lệnh:

### 3.1. Kiểm tra Sức khỏe IPC Daemon (Health Check)
```bash
# cURL
curl http://127.0.0.1:5000/api/health

# PowerShell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -Method Get
```

### 3.2. Kiểm tra Luồng Telemetry Phần cứng
```bash
# cURL
curl http://127.0.0.1:5000/api/telemetry/hardware

# PowerShell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/telemetry/hardware" -Method Get
```

### 3.3. Mô phỏng Đẩy Tác vụ Tải Video Hàng Loạt (Batch Download)
```bash
# cURL
curl -X POST http://127.0.0.1:5000/api/downloader/download-batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://www.tiktok.com/@creator/video/7329182391283"],
    "platform": "auto",
    "preset": "best_1080p",
    "removeWatermark": true
  }'
```

### 3.4. Kiểm tra Lắng nghe Luồng Tiến trình SSE (Real-time Event Stream)
```bash
# cURL
curl -N http://127.0.0.1:5000/api/events
```

### 3.5. Kiểm tra AI Key Vault & Xoay Vòng Key
```bash
# Lấy danh sách key đã che giấu (Masked)
curl http://127.0.0.1:5000/api/ai-keys/list

# Thử cấp phát 1 key tối ưu (Round-robin)
curl -X POST http://127.0.0.1:5000/api/ai-keys/acquire-key \
  -H "Content-Type: application/json" \
  -d '{"platform": "Gemini"}'
```

---

## 4. Kiểm tra Xử lý Lỗi & Nhật ký Hệ thống (Error Logging)

Khi có sự cố kết nối giữa UI Layer và Core Daemon:
- Daemon tự động bẫy ngoại lệ và không bị dừng đột ngột (Crash-Safe).
- Tệp log được ghi trực tiếp tại:
  - `backend/logs/daemon.log` (Nhật ký hoạt động chung và IPC bridge)
  - `backend/logs/errors.log` (Nhật ký lỗi chi tiết kèm stack trace)

Bạn có thể đọc nhật ký qua API:
```bash
curl http://127.0.0.1:5000/api/logs?count=20
```
