# Hướng Dẫn Chạy & Phát Triển Dự Án: CreatorOS Desktop (.NET 9 WPF C# 13)

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường, xây dựng và vận hành ứng dụng **CreatorOS Desktop** trên hệ điều hành Windows.

---

## 1. Yêu Cầu Hệ Thống Trước Khi Bắt Đầu
- **Hệ điều hành:** Windows 10 hoặc Windows 11 (64-bit).
- **SDK:** Cài đặt [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0) trở lên.
- **IDE Khuyên Dùng:** Visual Studio 2022 (v17.11+) với workload **.NET Desktop Development** hoặc Visual Studio Code kèm C# Dev Kit.
- **Card đồ họa (GPU):** NVIDIA GTX 1660 Super (6GB VRAM) hoặc cao hơn để kích hoạt phần cứng CUDA / NVENC.

---

## 2. Cấu Trúc Thư Mục Giải Pháp (Pipeline-First MVVM)
```text
CreatorOS.Desktop/
├── Models/             # DTOs, Records (DubbingTaskContext, ScriptSegment, AppSettings)
├── ViewModels/         # Presentation Logic (MainViewModel, BatchDownloadViewModel, DubbingViewModel)
├── Views/              # XAML UserControls (BatchDownloadView, DubbingView, SettingsView, Controls)
├── Services/           # Ingestion, Pipeline Conveyor, Audio (Demucs, Whisper, RVC, TTS), Render (FFmpeg)
├── Converters/         # WPF Value Converters
└── Resources/          # Styles, Brushes, Icons
```

---

## 3. Các Bước Cài Đặt & Chạy Ứng Dụng

### Bước 1: Clone hoặc Mở Dự Án
Mở terminal (PowerShell / Command Prompt) tại thư mục gốc của dự án hoặc mở file giải pháp `.sln` / thư mục trong Visual Studio 2022.

### Bước 2: Khôi Phục Gói NuGet (Restore Dependencies)
Chạy lệnh sau để khôi phục các thư viện .NET 9:
```powershell
dotnet restore
```

### Bước 3: Tải Ngầm Tài Nguyên RVC Adam (Tùy chọn tự động hoặc thủ công)
Hệ thống tích hợp sẵn script tự động tải các mô hình RVC (`adam.pth`, `adam.index`, `rmvpe.pt`) vào thư mục `%LocalAppData%\CreatorOS\models\rvc\`. 
Bạn có thể chạy script PowerShell chuẩn bị sẵn:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\download_adam_rvc.ps1
```

### Bước 4: Biên Dịch & Chạy Dự Án
- **Từ dòng lệnh:**
  ```powershell
  dotnet build
  dotnet run --project CreatorOS.Desktop.csproj
  ```
- **Từ Visual Studio 2022:**
  Nhấn phím `F5` hoặc nút **Start** để khởi chạy ứng dụng ở chế độ Debug/Release.

---

## 4. Hướng Dẫn Sử Dụng Nhanh Các Modul Chính
1. **Batch Downloader Pro:** Dán danh sách URL video/audio, công cụ tự động quét và phân tách luồng, sau đó chuyển tiếp (handoff) sang module lồng tiếng chỉ với 1 cú click.
2. **Dịch & Lồng Tiếng AI (Dubbing Studio):** Chọn preset giọng **"🔥 Adam US (Trầm khàn - RVC Clone Tiếng Việt)"**, hệ thống tự động chạy Pipeline 3 chặng: `TTS Tiếng Việt` $\rightarrow$ `RVC Adam Voice Clone` $\rightarrow$ `WSOLA Time-Stretching` khớp nhịp tuyệt đối.
3. **Cài Đặt & Bản Quyền:** Quản lý khóa Gemini API Vault, tùy chỉnh gia tốc phần cứng DXGI/NVENC và đường dẫn thư mục xuất bản phẩm.
