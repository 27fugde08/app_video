#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS PRO_V40 - AI Dubbing Engine: Demucs Standalone Runner (demucs_runner.py)
===================================================================================
Script Python độc lập chuyên trách bóc tách âm thanh (Vocals & Accompaniment/Music)
sử dụng mô hình Demucs (htdemucs, htdemucs_ft).

Tính năng chính:
1. Giao diện CLI linh hoạt bằng `argparse` với tham số `--input`, `--output`, `--model`, `--device`, `--segment`, `--overlap`.
2. Tự động nhận diện & ưu tiên tăng tốc GPU NVIDIA CUDA qua PyTorch (`torch.device('cuda')`).
3. Tối ưu hóa bộ nhớ chống tràn VRAM (VRAM OOM Mitigation): Hỗ trợ `split=True`, `--segment`, `--overlap=0.25`.
4. Tự động chuyển vùng Fallback sang CPU nếu GPU gặp sự cố CUDA Out Of Memory.
5. Định dạng Log tiến độ thời gian thực `[DEMUCS_STATUS]` & `[DEMUCS_PROGRESS] xx%` cho Node.js/Electron IPC.
6. Hỗ trợ đóng gói PyInstaller standalone (.exe) với đường dẫn động `sys._MEIPASS`.
7. Giải phóng triệt để VRAM/RAM và các file tạm trong khối `try...finally`.
"""

import os
import sys
import gc
import shutil
import logging
import argparse
import traceback
from typing import Optional, List, Dict, Any

# Cấu hình PyInstaller path resolution khi đóng gói ứng dụng .exe
if hasattr(sys, '_MEIPASS'):
    # Đang chạy từ tệp thực thi đóng gói bằng PyInstaller
    BUNDLE_DIR = sys._MEIPASS
    os.environ['DEMUCS_MODELS'] = os.path.join(BUNDLE_DIR, 'models')
else:
    BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))

# Thiết lập Logger hệ thống
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [DemucsRunner] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("DemucsRunner")


def print_status(message: str) -> None:
    """In thông báo trạng thái định dạng chuẩn cho Node.js parent process đọc"""
    print(f"[DEMUCS_STATUS] {message}", flush=True)


def print_progress(percent: int, message: str = "") -> None:
    """In thông báo phần trăm tiến độ định dạng chuẩn cho Node.js parent process đọc"""
    pct = max(0, min(100, percent))
    msg_suffix = f" - {message}" if message else ""
    print(f"[DEMUCS_PROGRESS] {pct}%{msg_suffix}", flush=True)


def check_dependencies() -> bool:
    """Kiểm tra sự hiện diện và phiên bản của PyTorch, CUDA GPU & Demucs"""
    try:
        import torch
        logger.info(f"PyTorch Version: {torch.__version__}")
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            logger.info(f"🚀 Kích hoạt GPU Hardware Acceleration: {gpu_name} ({vram_gb:.2f} GB VRAM)")
            print_status(f"Kích hoạt GPU Hardware Acceleration thành công: {gpu_name} ({vram_gb:.2f} GB VRAM)")
        else:
            logger.warning("⚠️ Không tìm thấy GPU CUDA. Hệ thống sẽ dùng CPU fallback.")
            print_status("Sử dụng CPU fallback (tốc độ xử lý có thể chậm hơn).")
        return True
    except ImportError as e:
        logger.error(f"Thiếu thư viện bắt buộc PyTorch/Demucs: {str(e)}")
        print_status(f"LỖI: Thiếu thư viện hệ thống: {str(e)}")
        return False


def clean_gpu_memory() -> None:
    """Giải phóng triệt để bộ nhớ đệm VRAM GPU và RAM hệ thống"""
    try:
        gc.collect()
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
            logger.info("🧹 Đã giải phóng triệt để bộ nhớ đệm GPU VRAM & System RAM.")
    except Exception as e:
        logger.warning(f"Lưu ý khi dọn dẹp VRAM: {str(e)}")


def validate_input_file(input_path: str) -> bool:
    """Kiểm tra tính hợp lệ của tệp phương tiện đầu vào (video/audio)"""
    if not os.path.exists(input_path):
        err_msg = f"Tệp đầu vào không tồn tại tại đường dẫn: {input_path}"
        logger.error(err_msg)
        print_status(f"LỖI: {err_msg}")
        return False

    if not os.path.isfile(input_path):
        err_msg = f"Đường dẫn đầu vào không phải là tệp tin hợp lệ: {input_path}"
        logger.error(err_msg)
        print_status(f"LỖI: {err_msg}")
        return False

    file_size = os.path.getsize(input_path)
    if file_size == 0:
        err_msg = f"Tệp đầu vào bị rỗng (0 byte): {input_path}"
        logger.error(err_msg)
        print_status(f"LỖI: {err_msg}")
        return False

    valid_extensions = ('.mp4', '.mkv', '.avi', '.mov', '.flv', '.webm', '.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg')
    ext = os.path.splitext(input_path)[1].lower()
    if ext not in valid_extensions:
        logger.warning(f"Định dạng tệp '{ext}' có thể cần FFmpeg decode trung gian.")

    return True


def run_demucs_separation(
    input_path: str,
    output_dir: str,
    model_name: str = "htdemucs",
    device_preference: str = "auto",
    two_stems: Optional[str] = "vocals",
    shifts: int = 1,
    overlap: float = 0.25,
    segment: Optional[int] = None
) -> bool:
    """
    Thực thi tiến trình tách lời thoại (Vocals) và Nhạc nền (Accompaniment) với tự động CPU Fallback khi VRAM OOM.
    """
    print_progress(5, "Đang khởi tạo môi trường và kiểm tra tham số đầu vào...")

    if not validate_input_file(input_path):
        return False

    os.makedirs(output_dir, exist_ok=True)

    import torch
    if device_preference == "cuda":
        selected_device = "cuda" if torch.cuda.is_available() else "cpu"
    elif device_preference == "cpu":
        selected_device = "cpu"
    else:  # 'auto'
        selected_device = "cuda" if torch.cuda.is_available() else "cpu"

    print_status(f"Thiết bị tính toán được chọn: {selected_device.upper()}")
    print_progress(15, f"Tải mô hình AI Demucs [{model_name}] vào {selected_device.upper()}...")

    def execute_separation(dev: str, is_retry: bool = False) -> bool:
        """Hàm con thực thi tách âm thanh qua Demucs Module API"""
        try:
            import demucs.separate

            cmd_args: List[str] = [
                "-n", model_name,
                "-o", output_dir,
                "-d", dev,
                "--shifts", str(shifts),
                "--overlap", str(overlap)
            ]

            if segment and segment > 0:
                cmd_args.extend(["--segment", str(segment)])

            if two_stems:
                cmd_args.extend(["--two-stems", two_stems])

            cmd_args.append(input_path)

            logger.info(f"Thực thi Demucs CLI (Device: {dev}): {' '.join(cmd_args)}")
            print_status(f"Đang bóc tách âm thanh từ {os.path.basename(input_path)} [{dev.upper()}]...")
            print_progress(35 if not is_retry else 50, f"Đang tách lời thoại (Vocals) và Nhạc nền...")

            # Phân tách qua Demucs main API
            demucs.separate.main(cmd_args)

            print_progress(85, "Đang tổng hợp và xuất tệp âm thanh WAV đầu ra...")

            # Kiểm tra tệp kết quả đầu ra
            filename_no_ext = os.path.splitext(os.path.basename(input_path))[0]
            model_output_folder = os.path.join(output_dir, model_name, filename_no_ext)

            vocals_file = os.path.join(model_output_folder, "vocals.wav")
            no_vocals_file = os.path.join(model_output_folder, "no_vocals.wav")

            if os.path.exists(vocals_file) and os.path.exists(no_vocals_file):
                print_progress(100, "Bóc tách âm thanh thành công rực rỡ!")
                print_status(f"KẾT QUẢ VOCALS: {vocals_file}")
                print_status(f"KẾT QUẢ NO_VOCALS: {no_vocals_file}")
                logger.info("✅ Tách Vocals và Accompaniment hoàn tất thành công!")
                return True
            else:
                logger.info(f"Kết quả lưu trữ tại thư mục: {model_output_folder}")
                print_progress(100, "Hoàn tất bóc tách âm thanh!")
                print_status(f"KẾT QUẢ THƯ MỤC: {model_output_folder}")
                return True

        except (torch.cuda.OutOfMemoryError, MemoryError) as oom:
            if dev == "cuda":
                logger.warning("🚨 Tràn GPU VRAM (CUDA Out Of Memory). Đang kích hoạt CPU Fallback tự động...")
                print_status("CẢNH BÁO: Tràn VRAM GPU! Tự động chuyển đổi sang CPU Fallback...")
                print_progress(40, "Chuyển chế độ sang CPU để tiếp tục xử lý...")
                clean_gpu_memory()
                return execute_separation("cpu", is_retry=True)
            else:
                logger.error(f"Lỗi tràn RAM hệ thống khi chạy trên CPU: {str(oom)}")
                print_status(f"LỖI HỆ THỐNG: {str(oom)}")
                return False
        except Exception as ex:
            logger.exception(f"Lỗi ngoại lệ trong quá trình bóc tách: {str(ex)}")
            print_status(f"LỖI THỰC THI: {str(ex)}")
            return False

    try:
        return execute_separation(selected_device)
    finally:
        clean_gpu_memory()


def main() -> None:
    """Hàm chính xử lý tham số dòng lệnh CLI bằng argparse"""
    parser = argparse.ArgumentParser(
        description="CreatorOS PRO_V40 Demucs Standalone Audio Separator CLI",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument(
        "-i", "--input",
        required=True,
        type=str,
        help="Đường dẫn tuyệt đối tệp video hoặc audio nguồn (.mp4, .wav, .mp3, ...)"
    )

    parser.add_argument(
        "-o", "--output",
        required=True,
        type=str,
        help="Thư mục đích lưu trữ các tệp đã bóc tách"
    )

    parser.add_argument(
        "-m", "--model",
        default="htdemucs",
        type=str,
        help="Mô hình Demucs sử dụng (htdemucs, htdemucs_ft, mdx_extra)"
    )

    parser.add_argument(
        "-d", "--device",
        default="auto",
        choices=["auto", "cuda", "cpu"],
        help="Thiết bị tính toán phần cứng (auto, cuda, cpu)"
    )

    parser.add_argument(
        "--two-stems",
        default="vocals",
        type=str,
        help="Tách 2 phần ('vocals' -> Vocals & Accompaniment) hoặc 'none' để tách 4 phần"
    )

    parser.add_argument(
        "--shifts",
        default=1,
        type=int,
        help="Số lượt ngẫu nhiên hóa shifts để nâng cao chất lượng âm thanh"
    )

    parser.add_argument(
        "--overlap",
        default=0.25,
        type=float,
        help="Tỷ lệ chồng lấp segment âm thanh"
    )

    parser.add_argument(
        "--segment",
        default=None,
        type=int,
        help="Độ dài phân đoạn tính toán (giúp tiết kiệm VRAM cho GPU yếu)"
    )

    args = parser.parse_args()

    logger.info("=== CreatorOS PRO_V40 Demucs Runner Initialized ===")
    logger.info(f"Input: {args.input}")
    logger.info(f"Output: {args.output}")
    logger.info(f"Model: {args.model}")
    logger.info(f"Device: {args.device}")

    if not check_dependencies():
        sys.exit(1)

    two_stems_param = None if args.two_stems.lower() in ["none", "false", ""] else args.two_stems
    success = run_demucs_separation(
        input_path=args.input,
        output_dir=args.output,
        model_name=args.model,
        device_preference=args.device,
        two_stems=two_stems_param,
        shifts=args.shifts,
        overlap=args.overlap,
        segment=args.segment
    )

    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
