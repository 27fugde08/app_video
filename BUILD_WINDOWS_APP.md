# ====================================================================
# HƯỚNG DẪN BUILD ỨNG DỤNG WINDOWS DESKTOP (.EXE) - CREATOROS
# ====================================================================

Tài liệu này hướng dẫn bạn đóng gói dự án **CreatorOS Desktop** thành tệp thực thi Windows **`.exe`** độc lập (bao gồm cả bản cài đặt Setup Wizard và bản Portable chạy ngay).

---
## 🎯 KẾT QUẢ ĐẦU RA SAU KHI BUILD
Thư mục `/release/` sẽ chứa các tệp thực thi Windows:
1. **`CreatorOS Desktop Setup 1.0.0.exe`**: Bộ cài đặt chuẩn Windows (NSIS Wizard, tự tạo Shortcut Desktop & Start Menu).
2. **`CreatorOS Desktop 1.0.0.exe`**: Bản Portable chạy ngay không cần cài đặt.

---
## 🛠️ YÊU CẦU TRƯỚC KHI BUILD (TRÊN MÁY TÍNH CÁ NHÂN)
1. **Hệ điều hành**: Windows 10 hoặc Windows 11 (64-bit).
2. **Node.js**: Phiên bản `v18.0.0` trở lên (`v20+ LTS` khuyến nghị).
3. **VS Code hoặc Terminal Windows** (CMD / PowerShell).

---
## 🚀 CÁCH 1: BUILD NHANH 1-CLICK BẰNG FILE SCRIPT `.BAT` (KHUYẾN NGHỊ)

1. Mở thư mục dự án trên máy tính.
2. Nhấp đúp chuột vào file: **`build-windows.bat`**.
3. Script sẽ tự động:
   - Cài đặt các gói `electron` và `electron-builder`.
   - Build giao diện Frontend bằng `vite build`.
   - Đóng gói toàn bộ mã nguồn Frontend + Backend Daemon thành file `.exe` trong thư mục `/release/`.

---
## 💻 CÁCH 2: BUILD BẰNG DÒNG LỆNH (TERMINAL / CMD)

Mở Terminal tại thư mục gốc của dự án và chạy lần lượt các lệnh sau:

### Bước 1: Cài đặt công cụ đóng gói Electron
```bash
npm install
npm install --save-dev electron electron-builder
```

### Bước 2: Build giao diện Frontend
```bash
npm run build
```
*(Lệnh này sẽ tạo thư mục `dist/` chứa giao diện web tối ưu hóa cao)*

### Bước 3: Đóng gói tệp thực thi Windows `.exe`
```bash
npx electron-builder --win --x64
```

Sau khi chạy xong, mở thư mục **`release`** trong dự án để nhận tệp `CreatorOS Desktop Setup 1.0.0.exe`!

---
## ⚙️ CƠ CHẾ VẬN HÀNH KHI CHẠY FILE `.EXE` TRÊN WINDOWS
- **Giao diện Frameless Obsidian**: Khi mở file `.exe`, Electron khởi tạo cửa sổ chuẩn Desktop với thanh tiêu đề tùy chỉnh (Minimize, Maximize, Close tích hợp âm thanh Haptic).
- **Auto-spawn Backend Daemon**: Electron tự động khởi chạy tiến trình con chạy file `backend/src/server.js` tại cổng cục bộ `5000` (không làm hiện cửa sổ đen cmd phiền phức).
- **Auto-kill Daemon**: Khi người dùng đóng ứng dụng (nút X), Electron sẽ tự động giải phóng toàn bộ tiến trình con ngầm để không chiếm dụng RAM/CPU của máy tính.
- **Tương thích Binaries**: Khi người dùng đặt các file `ffmpeg.exe` hoặc `yt-dlp.exe` vào `backend/bin/`, ứng dụng sẽ tự động nhận diện và tận dụng bộ mã hóa phần cứng GPU (NVIDIA NVENC).
