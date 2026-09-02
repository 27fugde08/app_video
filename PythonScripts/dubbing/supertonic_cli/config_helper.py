#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS AI Dubbing Engine - Supertonic TTS Input Parameters Helper
=====================================================================
Chuẩn hóa các tham số đầu vào cho công cụ tổng hợp giọng nói AI nâng cao Supertonic.

Tác dụng:
1. Chuẩn hóa giọng đọc (Voice Profile / Expressive Pitch / Emotion level).
2. Tối ưu hóa tham số phần cứng GPU CUDA NVENC / CPU Fallback.
3. Đồng bộ tốc độ nói (Speaking Speed) và âm sắc giọng đọc theo từng ngữ cảnh video.
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SupertonicConfigHelper] %(message)s"
)
logger = logging.getLogger("SupertonicConfigHelper")


# Cấu hình mặc định cho Supertonic TTS Engine
DEFAULT_SUPERTONIC_PARAMS: Dict[str, Any] = {
    "engine_name": "supertonic_v1",
    "voice_profile": "vi_female_expressive",
    "pitch_shift": 0.0,            # Điều chỉnh độ cao giọng nói (-5.0 đến +5.0 semitones)
    "speed_ratio": 1.0,            # Tốc độ đọc (0.8 = đọc chậm, 1.2 = đọc nhanh)
    "emotion_style": "neutral",    # 'neutral', 'energetic', 'calm', 'dramatic'
    "expressiveness": 0.85,        # Mức độ cảm xúc
    "use_gpu": True,               # Tự động dùng GPU CUDA nếu khả dụng
    "cuda_device_id": 0,
    "batch_size": 4                # Xử lý đa luồng câu văn bản
}


class SupertonicConfigHelper:
    """Helper quản lý cấu hình cho Supertonic TTS Engine"""

    @staticmethod
    def build_inference_config(
        voice_profile: str = "vi_female_expressive",
        speed: float = 1.0,
        pitch: float = 0.0,
        emotion: str = "neutral",
        use_gpu: bool = True
    ) -> Dict[str, Any]:
        """
        Xây dựng Dictionary tham số truyền trực tiếp cho Supertonic Inference API
        """
        params = DEFAULT_SUPERTONIC_PARAMS.copy()
        params.update({
            "voice_profile": voice_profile,
            "speed_ratio": max(0.5, min(2.0, speed)),
            "pitch_shift": max(-12.0, min(12.0, pitch)),
            "emotion_style": emotion,
            "use_gpu": use_gpu
        })

        logger.info(f"Đã khởi tạo tham số Supertonic: Voice={voice_profile}, Speed={speed}, GPU={use_gpu}")
        return params

    @staticmethod
    def export_config_to_file(config: Dict[str, Any], output_path: str) -> bool:
        """
        Xuất tham số ra file .json phục vụ CLI subprocess
        """
        try:
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Thất bại khi ghi file cấu hình Supertonic: {str(e)}")
            return False


if __name__ == "__main__":
    st_cfg = SupertonicConfigHelper.build_inference_config(
        voice_profile="vi_male_narrator",
        speed=1.1,
        emotion="energetic"
    )
    print("Supertonic Config:")
    print(json.dumps(st_cfg, indent=2))
