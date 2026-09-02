# CreatorOS AI Dubbing Engine - AI Model Weights Directory
================================================================

Thư mục này dùng để lưu trữ các tệp trọng số mô hình AI (Model Checkpoints / Weights / ONNX Files) phục vụ cho hệ thống Lồng tiếng & Tự động hóa Video của CreatorOS.

---

## 📂 Danh Sách Các Tệp Mô Hình Cần Thiết (Required Model Files)

### 1. Mô Hình Tách Âm Thanh (Demucs Audio Source Separation)
- **Vị trí**: `PythonScripts/dubbing/models/demucs/`
- **Tệp cần có**:
  - `htdemucs.pth` hoặc `htdemucs_ft.yaml`
  - `mdx_extra.pth` (Mô hình tách nhạc nền nâng cao)

### 2. Mô Hình Tổng Hợp Giọng Nói Piper (Piper Neural TTS Models)
- **Vị trí**: `PythonScripts/dubbing/models/piper/`
- **Tệp cần có**:
  - `vi_VN-nam_mien_nam-medium.onnx` & `vi_VN-nam_mien_nam-medium.onnx.json` (Giọng Nam Miền Nam)
  - `vi_VN-nu_mien_bac-medium.onnx` & `vi_VN-nu_mien_bac-medium.onnx.json` (Giọng Nữ Miền Bắc)
  - `en_US-lessac-medium.onnx` & `en_US-lessac-medium.onnx.json` (Giọng Tiếng Anh)

### 3. Mô Hình Đồng Bộ Khẩu Hình Môi (Lip-Sync Wav2Lip Models)
- **Vị trí**: `PythonScripts/dubbing/models/wav2lip/`
- **Tệp cần có**:
  - `wav2lip.pth` (Mô hình Wav2Lip chuẩn)
  - `wav2lip_gan.pth` (Mô hình Wav2Lip GAN sắc nét hơn)

### 4. Mô Hình Nhận Dạng Giọng Nói STT (Whisper / Speech-to-Text)
- **Vị trí**: `PythonScripts/dubbing/models/whisper/`
- **Tệp cần có**:
  - `ggml-base.bin` hoặc `ggml-small.bin` (Mô hình Faster-Whisper / GGML C++)

### 5. Mô Hình Supertonic / Kokoro Voice Clone Models
- **Vị trí**: `PythonScripts/dubbing/models/supertonic/`
- **Tệp cần có**:
  - `kokoro-v0_19.pth`
  - `voices.json` (Danh sách mẫu giọng đọc)

---

## 📌 Hướng Dẫn Tải & Cài Đặt

1. **Đường dẫn tải tự động**: 
   Hệ thống CreatorOS có tích hợp tính năng tự động tải weights từ HuggingFace / GitHub Releases khi chạy ứng dụng lần đầu.
2. **Cài đặt thủ công**: 
   Người dùng có thể sao chép trực tiếp các file `.pth`, `.onnx`, `.bin` tương ứng vào đúng các thư mục con liệt kê ở trên.
