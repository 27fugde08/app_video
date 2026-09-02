#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS AI Dubbing Engine - Audio Parameters Standardization & Config Helper
================================================================================
Thư viện chuẩn hóa tham số cấu hình âm thanh đầu vào/đầu ra cho hệ thống Lồng tiếng.

Tác dụng:
1. Chuẩn hóa định dạng sample rate (22050Hz, 44100Hz, 48000Hz).
2. Tự động kiểm tra và chuyển đổi số kênh (Mono 1ch vs Stereo 2ch).
3. Cân bằng âm lượng (Audio Volume Normalization - LUFS / Peak Normalization).
4. Tạo file cấu hình JSON đồng bộ giữa các module Python và Node.js backend.
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AudioConfigHelper] %(message)s"
)
logger = logging.getLogger("AudioConfigHelper")


# Cấu hình âm thanh chuẩn cho pipeline lồng tiếng CreatorOS
DEFAULT_AUDIO_PROFILE: Dict[str, Any] = {
    "sample_rate": 44100,          # Hertz (44.1kHz standard)
    "channels": 1,                 # Mono cho TTS & Voice Cloning
    "bitrate": "320k",             # Lossless high quality
    "format": "wav",               # Định dạng tệp trung gian
    "target_lufs": -16.0,          # Chuẩn âm lượng video TikTok/YouTube Shorts
    "max_peak_db": -1.0,           # Tránh méo tiếng (Clipping)
    "silence_threshold_db": -40.0, # Ngưỡng cắt khoảng lặng
    "time_stretch_limit": [0.75, 1.35] # Giới hạn co giãn thời gian khớp khẩu hình
}


class AudioConfigHelper:
    """Class hỗ trợ quản lý và chuẩn hóa các tham số âm thanh"""

    @staticmethod
    def get_standardized_config(custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Gộp cấu hình tùy chỉnh của người dùng với cấu hình chuẩn hệ thống
        """
        config = DEFAULT_AUDIO_PROFILE.copy()
        if custom_params:
            config.update(custom_params)

        # Validate sample rate
        valid_sample_rates = [16000, 22050, 24000, 44100, 48000]
        if config["sample_rate"] not in valid_sample_rates:
            logger.warning(
                f"Sample rate {config['sample_rate']}Hz không chuẩn. Tự động chuyển về 44100Hz."
            )
            config["sample_rate"] = 44100

        return config

    @staticmethod
    def save_config_json(config: Dict[str, Any], file_path: str) -> bool:
        """
        Lưu cấu hình ra tệp JSON để các tiến trình khác (FFmpeg / Wav2Lip) đọc lại
        """
        try:
            os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            logger.info(f"Đã lưu tệp cấu hình âm thanh: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Lỗi khi lưu cấu hình JSON: {str(e)}")
            return False

    @staticmethod
    def load_config_json(file_path: str) -> Dict[str, Any]:
        """
        Đọc cấu hình âm thanh từ tệp JSON
        """
        if not os.path.exists(file_path):
            logger.warn(f"Không tìm thấy file cấu hình {file_path}, sử dụng cấu hình mặc định.")
            return DEFAULT_AUDIO_PROFILE.copy()

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return AudioConfigHelper.get_standardized_config(data)
        except Exception as e:
            logger.error(f"Lỗi đọc file cấu hình {file_path}: {str(e)}")
            return DEFAULT_AUDIO_PROFILE.copy()


if __name__ == "__main__":
    cfg = AudioConfigHelper.get_standardized_config({"sample_rate": 48000, "channels": 2})
    print("Cấu hình âm thanh chuẩn hóa:")
    print(json.dumps(cfg, indent=2))
