# 🎬 CreatorOS PRO_V40

> **CreatorOS PRO_V40** là nền tảng máy trạm (Desktop Workstation) toàn diện cho sáng tạo nội dung tự động hóa, sản xuất video ngắn đa nền tảng (TikTok, YouTube Shorts, Facebook Reels, Douyin) với kiến trúc hybrid kết hợp **.NET 9 / C# 12 WPF**, **Python AI Pipelines** (Demucs, Whisper, Wav2Lip, Gemini 2.5 Flash), **FFmpeg Hardware Acceleration** và cơ sở dữ liệu **SQLite WAL**.

---

## 🌟 Tính Năng Cốt Lõi

- 📥 **Batch Downloader Pro**: Tải video hàng loạt đa luồng kiểm soát qua `SemaphoreSlim` và `SocketsHttpHandler` chống cạn kiệt socket.
- ⚡ **FFmpeg NVENC Hardware Acceleration**: Cắt ghép, mã hóa video siêu tốc bằng GPU NVIDIA với cấu hình VBR/CQ và Spatial/Temporal AQ.
- 🎙️ **Vocal & Speech Isolation (Meta Demucs)**: Tách giọng nói và nhạc nền chuyên nghiệp trên CUDA GPU với cơ chế thu hồi VRAM.
- 📝 **Whisper STT & Auto Hardsub**: Nhận diện giọng nói, tạo phụ đề tự động tiếng Việt và nhúng sub cứng bằng GPU.
- 🎭 **AI Lip-Sync & Face Enhancement**: Đồng bộ khẩu hình và phục hồi nét mặt nhân vật bằng AI Wav2Lip/SadTalker.
- 🛡️ **Anti-Detection Mutator**: Vi biến đổi quang học, dịch tempo âm thanh, xóa metadata và tiêm padding byte thay đổi 100% mã băm MD5/SHA-256 chống quét Content ID.
- 🤖 **Gemini 2.5 Flash Metadata Engine**: Tự động sinh tiêu đề Viral Hooks, mô tả SEO và Hashtags xu hướng với Structured Output.
- 🌐 **Multi-Account & Proxy Rotation**: Quản lý phiên đăng nhập (`storage_state.json`), kiểm tra ping proxy và xoay vòng Round-Robin không khóa.
- 📅 **Scheduled Auto-Posting**: Lập lịch đăng tải tự động với cơ chế Exponential Backoff Retry và chụp ảnh màn hình lỗi tự động.
- 🔐 **Secure Config (Windows DPAPI)**: Mã hóa thông tin nhạy cảm cấp hệ điều hành và ghi file nguyên tử chống hỏng dữ liệu.

---

## 🚀 Khởi Chạy Nhanh (Quick Start)

### Yêu Cầu Hệ Thống:
- **Hệ điều hành**: Windows 10 / 11 (64-bit).
- **.NET SDK**: .NET 9.0 SDK hoặc mới hơn.
- **Python**: Python 3.10+ (đã tích chọn *Add python.exe to PATH*).
- **GPU (Khuyến nghị)**: NVIDIA Card (GTX 1650, RTX 3050 trở lên) có driver CUDA.

### Khởi Chạy Tự Động:
Chỉ cần nhấp đúp vào tệp:
```cmd
run-creatoros.bat
```
Hoặc chạy lệnh PowerShell:
```powershell
.\run-creatoros.ps1
```

---

## 📚 Tài Liệu Kỹ Thuật Chi Tiết

- 📖 [Tài Liệu Toàn Diện Hệ Thống (CREATOROS_DOCUMENTATION.md)](CREATOROS_DOCUMENTATION.md)
- 🏗️ [Thiết Kế Kiến Trúc Desktop (DESKTOP_ARCHITECTURE.md)](DESKTOP_ARCHITECTURE.md)
- 📦 [Hướng Dẫn Build & Đóng Gói Windows (BUILD_WINDOWS_APP.md)](BUILD_WINDOWS_APP.md)
- 🧪 [Hướng Dẫn Kiểm Thử (TESTING_GUIDE.md)](TESTING_GUIDE.md)

---
*Phát triển bởi CreatorOS PRO_V40 Engineering Team.*
