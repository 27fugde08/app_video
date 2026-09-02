#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS AI Dubbing Engine - Demucs Audio Source Separator Runner
===================================================================
Script bóc tách âm thanh nguồn (Vocals vs Background Music/Accomp)
sử dụng mô hình Demucs (htdemucs / htdemucs_ft).

Tác dụng:
1. Tách giọng nói gốc (Vocals) để làm dữ liệu mẫu cho AI Clone/Lip-Sync.
2. Tách nhạc nền (Background Music/BGM) & tiếng động (SFX) để trộn lại vào video đã lồng tiếng.
"""

import os
import sys
import argparse
import subprocess
import logging

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [DemucsRunner] %(message)s"
)
logger = logging.getLogger("DemucsRunner")


def run_demucs_separation(
    input_audio_path: str,
    output_dir: str,
    model_name: str = "htdemucs",
    shifts: int = 1,
    overlap: float = 0.25,
    two_stems: str = "vocals",
    device: str = "cuda"
) -> dict:
    """
    Khởi chạy tiến trình tách nhạc nền và giọng nói qua Demucs CLI
    
    :param input_audio_path: Đường dẫn tệp âm thanh/video đầu vào (.wav, .mp3, .mp4)
    :param output_dir: Thư mục chứa tệp kết quả sau khi bóc tách
    :param model_name: Mô hình Demucs (htdemucs, htdemucs_ft, mdx_extra)
    :param shifts: Số lần ngẫu nhiên hóa shifts để nâng cao chất lượng tách
    :param overlap: Tỉ lệ chồng lấp giữa các segment
    :param two_stems: Tách 2 phần ("vocals" -> Vocals & No_Vocals) hoặc 4 phần (vocals, drums, bass, other)
    :param device: 'cuda' (GPU) hoặc 'cpu'
    :return: Dictionary chứa đường dẫn các tệp đã tách thành công
    """
    if not os.path.exists(input_audio_path):
        logger.error(f"Tệp đầu vào không tồn tại: {input_audio_path}")
        return {"success": False, "error": f"Input file not found: {input_audio_path}"}

    os.makedirs(output_dir, exist_ok=True)
    logger.info(f"Đang bắt đầu bóc tách âm thanh: {input_audio_path} sử dụng mô hình {model_name}")

    # Xây dựng câu lệnh Demucs CLI
    cmd = [
        sys.executable, "-m", "demucs.separate",
        "-n", model_name,
        "-o", output_dir,
        "--shifts", str(shifts),
        "--overlap", str(overlap)
    ]

    if two_stems:
        cmd.extend(["--two-stems", two_stems])

    if device == "cpu":
        cmd.extend(["-d", "cpu"])

    cmd.append(input_audio_path)

    try:
        logger.info(f"Thực thi câu lệnh: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate()

        if process.returncode != 0:
            logger.error(f"Demucs thất bại với exit code {process.returncode}:\n{stderr}")
            return {"success": False, "error": stderr}

        filename_no_ext = os.path.splitext(os.path.basename(input_audio_path))[0]
        result_dir = os.path.join(output_dir, model_name, filename_no_ext)

        vocals_path = os.path.join(result_dir, "vocals.wav")
        no_vocals_path = os.path.join(result_dir, "no_vocals.wav")

        logger.info(f"Bóc tách thành công!\n- Vocals: {vocals_path}\n- No-Vocals (BGM): {no_vocals_path}")

        return {
            "success": True,
            "vocals_path": vocals_path,
            "no_vocals_path": no_vocals_path,
            "output_dir": result_dir
        }

    except Exception as e:
        logger.exception(f"Lỗi ngoại lệ trong quá trình chạy Demucs: {str(e)}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CreatorOS Demucs Audio Separator CLI")
    parser.add_argument("-i", "--input", required=True, help="Đường dẫn tệp âm thanh đầu vào")
    parser.add_argument("-o", "--output", required=True, help="Thư mục đầu ra")
    parser.add_argument("-m", "--model", default="htdemucs", help="Tên mô hình Demucs (htdemucs, htdemucs_ft)")
    parser.add_argument("--device", default="cuda", choices=["cuda", "cpu"], help="Thiết bị tính toán")

    args = parser.parse_args()
    res = run_demucs_separation(args.input, args.output, model_name=args.model, device=args.device)
    print(res)
