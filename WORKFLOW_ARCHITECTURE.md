# CreatorOS Desktop - Workflow Architecture (Simple Tikdown V2 Integration)

Tài liệu này chuẩn hóa luồng xử lý (Workflow Pipeline) được bóc tách từ **Simple Tikdown V2** và tích hợp vào **CreatorOS Desktop** (.NET 9 C# 13 WPF).

---

## 1. Tổng Quan Kiến Trúc Portable Toolchain (`tools/`)
Toàn bộ các tác vụ nặng (Tải luồng HTTP/3, tách giọng nói Demucs, nhận diện Whisper, chuẩn hóa tiếng Việt, tổng hợp TTS Piper/Kokoro) được cô lập bên trong các gói portable dưới thư mục `tools/`:
```text
CreatorOS.Desktop/
└── tools/
    ├── ffmpeg/             # ffmpeg.exe & ffprobe.exe (NVENC & libass hardware acceleration)
    └── multitool/          # Python CLI runtime & ctranslate2, vietnormalizer, paddle, librosa
        ├── _internal/
        └── multitool_cli.exe
```

---

## 2. Luồng Xử Lý 1: Batch Downloader Pro (Tải Hàng Loạt Đa Nguồn)
Dựa trên kiến trúc Token Bucket & HTTP/3 Range của Simple Tikdown V2:
1. **Ingestion & CdnUrlExtractor**: Tiếp nhận danh sách URL (TikTok, Douyin, YouTube, Douyin/Kuaishou).
2. **Smart Proxy & Cookie Policy**: Tự động quản lý cookie/session ẩn danh để vượt qua tường lửa chống crawl.
3. **FastSegmentDownloader & AdaptiveStreamMuxer**: Chia nhỏ file thành nhiều segment chạy đa luồng (`SemaphoreSlim`), tải song song với tốc độ tối đa băng thông.
4. **Hardware Governor**: Quản lý tài nguyên CPU/RAM/VRAM, tự động giảm tốc nếu quá tải hoặc chuyển tiếp trực tiếp (handoff) sang Studio Lồng Tiếng.

---

## 3. Luồng Xử Lý 2: Dịch & Lồng Tiếng AI (Dubbing Studio Pipeline)
Quy trình 4 chặng tự động hóa hoàn toàn, kết hợp giữa `tools/multitool/` và Gemini API:
1. **Chặng 1: Audio Stem Separation (Demucs)**:
   - Tách rời nhạc nền (Accompaniment) và giọng nói gốc (Vocals) bằng Demucs runner.
2. **Chặng 2: Speech-to-Text & Subtitle Alignment (Faster-Whisper)**:
   - Chạy `ctranslate2`Faster-Whisper trích xuất phụ đề gốc chuẩn xác đến từng mili-giây.
3. **Chặng 3: Contextual Translation & Vietnamese Normalization (`vietnormalizer`)**:
   - Gemini Director Client dịch ngữ cảnh sang tiếng Việt (Văn phong nói tự nhiên, không dịch thô cứng).
   - Bộ `vietnormalizer` chuẩn hóa số, viết tắt, dấu câu tối ưu cho công cụ tổng hợp giọng nói.
4. **Chặng 4: Voice Cloning / TTS & 1-Pass NVENC Muxing**:
   - Tổng hợp giọng đọc qua RVC / Piper / Kokoro ONNX GPU.
   - FFmpeg thực hiện 1-Pass `-filter_complex` ghép phụ đề ASS (`subtitles=vi.ass`) và trộn âm lượng (Audio Ducking) xuất bản phẩm MP4 hoàn thiện.
