#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS AI Dubbing Engine - Piper TTS Engine Integration
===========================================================
Tích hợp và điều khiển công cụ Piper Text-to-Speech (Neural Fast TTS).

Tác dụng:
1. Chuyển đổi văn bản đa ngôn ngữ thành giọng nói tức thì với độ trễ siêu thấp.
2. Tự động hỗ trợ mô hình giọng đọc `.onnx` & `.onnx.json`.
3. Điều chỉnh tốc độ (length scale) và khoảng lặng (pause/silence) cho trùng khớp khớp miệng video.
"""

import os
import sys
import json
import argparse
import subprocess
import logging
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [PiperTTSEngine] %(message)s"
)
logger = logging.getLogger("PiperTTSEngine")


class PiperTTSEngine:
    """Wrapper điều khiển tiến trình Piper Neural TTS"""

    def __init__(self, piper_binary_path: str = "piper", default_model_path: Optional[str] = None):
        self.piper_binary = piper_binary_path
        self.default_model = default_model_path

    def generate_speech(
        self,
        text: str,
        output_wav_path: str,
        model_path: Optional[str] = None,
        length_scale: float = 1.0,
        noise_scale: float = 0.667,
        noise_w: float = 0.8
    ) -> dict:
        """
        Tổng hợp giọng nói từ văn bản thông qua Piper TTS CLI
        
        :param text: Đoạn văn bản cần đọc
        :param output_wav_path: Đường dẫn tệp .wav đầu ra
        :param model_path: Đường dẫn tệp mô hình giọng đọc (.onnx)
        :param length_scale: Hệ số tốc độ đọc (<1.0 = đọc nhanh hơn, >1.0 = đọc chậm hơn)
        :param noise_scale: Hệ số biến thiên âm thanh
        :param noise_w: Hệ số phong cách phát âm
        :return: Dict kết quả thực thi
        """
        target_model = model_path or self.default_model
        if not target_model or not os.path.exists(target_model):
            logger.error(f"Không tìm thấy mô hình Piper ONNX: {target_model}")
            return {"success": False, "error": f"Model file not found: {target_model}"}

        os.makedirs(os.path.dirname(os.path.abspath(output_wav_path)), exist_ok=True)

        cmd = [
            self.piper_binary,
            "--model", target_model,
            "--output_file", output_wav_path,
            "--length_scale", str(length_scale),
            "--noise_scale", str(noise_scale),
            "--noise_w", str(noise_w)
        ]

        logger.info(f"Bắt đầu sinh giọng đọc Piper TTS ({len(text)} ký tự) -> {output_wav_path}")

        try:
            # Truyền đoạn văn bản vào stdin của Piper CLI
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8"
            )

            stdout, stderr = process.communicate(input=text)

            if process.returncode != 0:
                logger.error(f"Piper TTS thất bại (code {process.returncode}): {stderr}")
                return {"success": False, "error": stderr}

            if not os.path.exists(output_wav_path) or os.path.getsize(output_wav_path) == 0:
                logger.error("Tệp WAV đầu ra không được tạo hoặc có dung lượng 0 byte.")
                return {"success": False, "error": "Generated WAV is empty or missing"}

            logger.info(f"Tổng hợp giọng đọc thành công: {output_wav_path}")
            return {
                "success": True,
                "output_wav": output_wav_path,
                "text_length": len(text)
            }

        except Exception as e:
            logger.exception(f"Ngoại lệ khi gọi Piper TTS: {str(e)}")
            return {"success": False, "error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CreatorOS Piper TTS Integration CLI")
    parser.add_argument("-t", "--text", required=True, help="Văn bản cần tổng hợp thành giọng nói")
    parser.add_argument("-o", "--output", required=True, help="Tệp WAV đầu ra")
    parser.add_argument("-m", "--model", required=True, help="Đường dẫn file Piper model (.onnx)")
    parser.add_argument("--speed", type=float, default=1.0, help="Tốc độ đọc (length_scale)")

    args = parser.parse_args()
    engine = PiperTTSEngine()
    res = engine.generate_speech(args.text, args.output, model_path=args.model, length_scale=args.speed)
    print(json.dumps(res, ensure_ascii=False, indent=2))
