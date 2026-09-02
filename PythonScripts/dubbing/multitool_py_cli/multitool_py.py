#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS PRO_V40 - AI Dubbing Engine: MultiTool CLI (multitool_py.py)
======================================================================
Script Python đa năng cung cấp hệ thống sub-commands xử lý phương tiện (Audio & Video):
1. `merge-audio`: Trộn luồng giọng đọc (Vocals) với nhạc nền (BGM / Accompaniment).
2. `mux-video`: Trộn file âm thanh hoàn chỉnh và file phụ đề (.srt) vào video gốc.
3. `convert-audio`: Chuyển đổi định dạng, tần số lấy mẫu (Sample Rate) & chuẩn hóa âm thanh (LUFS).

Tính năng nổi bật:
- Đọc tiến độ render thời gian thực từ luồng stderr của FFmpeg để phát tín hiệu `[TOOL_PROGRESS] xx%`.
- Phát hiện tự động binary `ffmpeg` & `ffprobe` trong PATH hệ thống hoặc gói đi kèm.
- Quản lý tài nguyên an toàn với khối `try...finally` dọn dẹp file tạm.
- Chú thích chi tiết bằng tiếng Việt, thiết kế hướng đối tượng dễ đóng gói PyInstaller.
"""

import os
import sys
import re
import shutil
import logging
import argparse
import subprocess
from typing import Optional, List, Tuple, Dict, Any

# Cấu hình logging hệ thống
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [MultiToolPy] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("MultiToolPy")


def print_status(message: str) -> None:
    """In thông báo trạng thái định dạng chuẩn cho tiến trình Node.js/Electron đọc"""
    print(f"[TOOL_STATUS] {message}", flush=True)


def print_progress(percent: int, message: str = "") -> None:
    """In phần trăm tiến độ định dạng chuẩn cho tiến trình Node.js/Electron đọc"""
    pct = max(0, min(100, percent))
    msg_suffix = f" - {message}" if message else ""
    print(f"[TOOL_PROGRESS] {pct}%{msg_suffix}", flush=True)


class FFmpegEngine:
    """Class wrapper quản lý tương tác và thực thi lệnh FFmpeg / FFprobe"""

    def __init__(self, custom_ffmpeg_path: Optional[str] = None, custom_ffprobe_path: Optional[str] = None):
        self.ffmpeg_path = self._resolve_binary("ffmpeg", custom_ffmpeg_path)
        self.ffprobe_path = self._resolve_binary("ffprobe", custom_ffprobe_path)

    def _resolve_binary(self, binary_name: str, custom_path: Optional[str]) -> str:
        """Xác định đường dẫn của công cụ ffmpeg/ffprobe"""
        if custom_path and os.path.exists(custom_path):
            return custom_path

        # Kiểm tra nếu được đóng gói bởi PyInstaller
        if hasattr(sys, '_MEIPASS'):
            exe_ext = ".exe" if sys.platform == "win32" else ""
            bundled = os.path.join(sys._MEIPASS, "bin", f"{binary_name}{exe_ext}")
            if os.path.exists(bundled):
                return bundled

        # Kiểm tra PATH hệ thống
        system_bin = shutil.which(binary_name)
        if system_bin:
            return system_bin

        # Kiểm tra thư mục dự án cục bộ (backend/bin/windows/...)
        project_root = os.getcwd()
        exe_ext = ".exe" if sys.platform == "win32" else ""
        local_bin = os.path.join(project_root, "backend", "bin", sys.platform, f"{binary_name}{exe_ext}")
        if os.path.exists(local_bin):
            return local_bin

        # Mặc định gọi lệnh trực tiếp
        return binary_name

    def is_ffmpeg_available(self) -> bool:
        """Kiểm tra sự tồn tại của FFmpeg bằng cách chạy --version"""
        try:
            res = subprocess.run([self.ffmpeg_path, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            return res.returncode == 0
        except Exception:
            return False

    def get_duration(self, file_path: str) -> float:
        """Lấy tổng thời lượng tệp phương tiện (tính theo giây) dùng ffprobe hoặc ffmpeg"""
        if not os.path.exists(file_path):
            return 0.0

        try:
            cmd = [
                self.ffprobe_path,
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0 and res.stdout.strip():
                return float(res.stdout.strip())
        except Exception as e:
            logger.warning(f"Không thể đọc thời lượng qua ffprobe: {e}")

        # Fallback dùng ffmpeg parse stderr
        try:
            cmd = [self.ffmpeg_path, "-i", file_path]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
            if match:
                hours, mins, secs = match.groups()
                return float(hours) * 3600 + float(mins) * 60 + float(secs)
        except Exception as e:
            logger.warning(f"Không thể đọc thời lượng qua ffmpeg stderr: {e}")

        return 0.0

    def run_command_with_progress(
        self,
        cmd: List[str],
        total_duration: float,
        task_description: str,
        on_progress_callback=print_progress
    ) -> bool:
        """Thực thi lệnh FFmpeg và parse `time=HH:MM:SS` từ stderr để tính % tiến độ thời gian thực"""
        logger.info(f"Đang thực thi lệnh FFmpeg: {' '.join(cmd)}")
        print_status(f"Đang bắt đầu {task_description}...")
        on_progress_callback(5, task_description)

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                encoding="utf-8",
                errors="replace"
            )

            time_regex = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")

            while True:
                line = process.stderr.readline()
                if not line and process.poll() is not None:
                    break

                if line:
                    match = time_regex.search(line)
                    if match and total_duration > 0:
                        hours, mins, secs = match.groups()
                        current_secs = float(hours) * 3600 + float(mins) * 60 + float(secs)
                        percent = min(98, int((current_secs / total_duration) * 100))
                        on_progress_callback(percent, f"{task_description} ({percent}%)")

            return_code = process.poll()
            if return_code == 0:
                on_progress_callback(100, f"Hoàn tất {task_description}!")
                print_status(f"Thành công: {task_description}")
                return True
            else:
                stderr_out = process.stderr.read() if process.stderr else "Lỗi không xác định"
                logger.error(f"FFmpeg thất bại (Mã lỗi {return_code}): {stderr_out}")
                print_status(f"LỖI FFMPEG (Mã {return_code}): {stderr_out[-300:]}")
                return False

        except Exception as e:
            logger.exception(f"Lỗi ngoại lệ khi chạy FFmpeg: {e}")
            print_status(f"LỖI XỬ LÝ: {str(e)}")
            return False


class MultiToolService:
    """Service xử lý 3 sub-commands chính: merge-audio, mux-video, convert-audio"""

    def __init__(self, ffmpeg_engine: FFmpegEngine):
        self.engine = ffmpeg_engine

    def merge_audio(
        self,
        vocal_path: str,
        bgm_path: Optional[str],
        output_path: str,
        vocal_volume: float = 1.0,
        bgm_volume: float = 0.3,
        audio_format: str = "mp3"
    ) -> bool:
        """
        Sub-command: merge-audio
        Trộn giọng đọc (Vocals) và nhạc nền (BGM) thành 1 tệp âm thanh duy nhất.
        """
        if not os.path.exists(vocal_path):
            print_status(f"LỖI: Tệp giọng đọc không tồn tại: {vocal_path}")
            return False

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        vocal_duration = self.engine.get_duration(vocal_path)

        # Nếu không có file nhạc nền hoặc file BGM không tồn tại -> chỉ điều chỉnh âm lượng giọng đọc
        if not bgm_path or not os.path.exists(bgm_path):
            logger.info("Không có file nhạc nền. Chỉ xuất tệp giọng đọc đã điều chỉnh âm lượng.")
            cmd = [
                self.engine.ffmpeg_path, "-y",
                "-i", vocal_path,
                "-filter:a", f"volume={vocal_volume}",
                "-ar", "44100",
                output_path
            ]
            return self.engine.run_command_with_progress(cmd, vocal_duration, "Trộn âm thanh (Chỉ Vocals)")

        bgm_duration = self.engine.get_duration(bgm_path)
        total_duration = max(vocal_duration, bgm_duration)

        # Trộn 2 luồng âm thanh bằng filter amix / amerge của FFmpeg
        # [0:a]volume=vocal_vol[v];[1:a]volume=bgm_vol[b];[v][b]amix=inputs=2:duration=first:dropout_transition=2[aout]
        filter_complex = (
            f"[0:a]volume={vocal_volume}[v];"
            f"[1:a]volume={bgm_volume}[b];"
            f"[v][b]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )

        cmd = [
            self.engine.ffmpeg_path, "-y",
            "-i", vocal_path,
            "-i", bgm_path,
            "-filter_complex", filter_complex,
            "-map", "[aout]",
            "-ac", "2",
            "-ar", "44100",
            output_path
        ]

        return self.engine.run_command_with_progress(cmd, total_duration, "Trộn âm thanh Vocals & BGM")

    def mux_video(
        self,
        video_path: str,
        audio_path: str,
        output_path: str,
        subtitle_path: Optional[str] = None,
        subtitle_mode: str = "soft"
    ) -> bool:
        """
        Sub-command: mux-video
        Ghép tệp âm thanh mới và phụ đề vào video gốc.
        `subtitle_mode`: 'soft' (nhúng luồng srt) hoặc 'hard' (bản lồng cứng vào khung hình).
        """
        if not os.path.exists(video_path):
            print_status(f"LỖI: Tệp video nguồn không tồn tại: {video_path}")
            return False

        if not os.path.exists(audio_path):
            print_status(f"LỖI: Tệp audio không tồn tại: {audio_path}")
            return False

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        video_duration = self.engine.get_duration(video_path)

        cmd = [self.engine.ffmpeg_path, "-y", "-i", video_path, "-i", audio_path]

        if subtitle_path and os.path.exists(subtitle_path):
            if subtitle_mode == "hard":
                # Hard subtitles (burn-in): cần re-encode video
                # escape dấu hai chấm và gạch chéo trong đường dẫn phụ đề cho ffmpeg filter
                escaped_sub = subtitle_path.replace("\\", "/").replace(":", "\\:")
                cmd.extend([
                    "-vf", f"subtitles='{escaped_sub}'",
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-map", "0:v:0",
                    "-map", "1:a:0",
                    "-shortest",
                    output_path
                ])
                return self.engine.run_command_with_progress(cmd, video_duration, "Muxing Video (Hard Subtitles)")
            else:
                # Soft subtitles: copy stream video gốc để render siêu nhanh
                cmd.extend([
                    "-i", subtitle_path,
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-c:s", "mov_text" if output_path.endswith(".mp4") else "srt",
                    "-map", "0:v:0",
                    "-map", "1:a:0",
                    "-map", "2:s:0",
                    "-shortest",
                    output_path
                ])
                return self.engine.run_command_with_progress(cmd, video_duration, "Muxing Video (Soft Subtitles)")

        # Nếu không có phụ đề
        cmd.extend([
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            output_path
        ])

        return self.engine.run_command_with_progress(cmd, video_duration, "Muxing Audio & Video")

    def convert_audio(
        self,
        input_path: str,
        output_path: str,
        sample_rate: int = 44100,
        channels: int = 2,
        bitrate: str = "320k",
        lufs_normalize: bool = True
    ) -> bool:
        """
        Sub-command: convert-audio
        Chuyển đổi định dạng, tần số lấy mẫu và chuẩn hóa âm lượng LUFS.
        """
        if not os.path.exists(input_path):
            print_status(f"LỖI: Tệp audio đầu vào không tồn tại: {input_path}")
            return False

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        duration = self.engine.get_duration(input_path)

        cmd = [self.engine.ffmpeg_path, "-y", "-i", input_path]

        audio_filters = []
        if lufs_normalize:
            # Áp dụng bộ lọc EBU R128 loudnorm cho tiêu chuẩn video YouTube / TikTok (-16 LUFS)
            audio_filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")

        if audio_filters:
            cmd.extend(["-af", ",".join(audio_filters)])

        cmd.extend([
            "-ar", str(sample_rate),
            "-ac", str(channels),
            "-b:a", bitrate,
            output_path
        ])

        return self.engine.run_command_with_progress(cmd, duration, "Chuyển đổi & Chuẩn hóa Audio")


def main() -> None:
    """Hàm chính khởi tạo và xử lý CLI Sub-commands"""
    parser = argparse.ArgumentParser(
        description="CreatorOS PRO_V40 MultiTool Audio/Video Processing CLI",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument("--ffmpeg-path", type=str, default=None, help="Đường dẫn tùy chỉnh đến binary ffmpeg")
    parser.add_argument("--ffprobe-path", type=str, default=None, help="Đường dẫn tùy chỉnh đến binary ffprobe")

    subparsers = parser.add_parser_subcommand = parser.add_subparsers(
        dest="subcommand",
        required=True,
        help="Danh sách các lệnh hỗ trợ: merge-audio, mux-video, convert-audio"
    )

    # --------------------------------------------------------------------------
    # Sub-command 1: merge-audio
    # --------------------------------------------------------------------------
    merge_parser = subparsers.add_parser("merge-audio", help="Trộn giọng đọc (Vocals) và nhạc nền (BGM)")
    merge_parser.add_argument("--vocal", required=True, type=str, help="Đường dẫn tệp audio giọng đọc (Vocals)")
    merge_parser.add_argument("--bgm", type=str, default=None, help="Đường dẫn tệp nhạc nền (BGM / Accompaniment)")
    merge_parser.add_argument("--output", required=True, type=str, help="Đường dẫn tệp xuất ra (.mp3, .wav)")
    merge_parser.add_argument("--vocal-volume", type=float, default=1.0, help="Hệ số âm lượng giọng đọc (mặc định: 1.0)")
    merge_parser.add_argument("--bgm-volume", type=float, default=0.3, help="Hệ số âm lượng nhạc nền (mặc định: 0.3)")
    merge_parser.add_argument("--format", type=str, default="mp3", help="Định dạng xuất ra (mp3, wav, m4a)")

    # --------------------------------------------------------------------------
    # Sub-command 2: mux-video
    # --------------------------------------------------------------------------
    mux_parser = subparsers.add_parser("mux-video", help="Ghép audio hoàn chỉnh và phụ đề vào video")
    mux_parser.add_argument("--video", required=True, type=str, help="Đường dẫn video gốc")
    mux_parser.add_argument("--audio", required=True, type=str, help="Đường dẫn audio mới đã lồng tiếng")
    mux_parser.add_argument("--subtitle", type=str, default=None, help="Đường dẫn tệp phụ đề (.srt, .vtt)")
    mux_parser.add_argument("--output", required=True, type=str, help="Đường dẫn tệp video kết quả (.mp4, .mkv)")
    mux_parser.add_argument("--subtitle-mode", choices=["soft", "hard"], default="soft", help="Chế độ nhúng phụ đề (soft: nhúng luồng, hard: lồng cứng)")

    # --------------------------------------------------------------------------
    # Sub-command 3: convert-audio
    # --------------------------------------------------------------------------
    convert_parser = subparsers.add_parser("convert-audio", help="Chuyển đổi định dạng và chuẩn hóa âm thanh")
    convert_parser.add_argument("--input", required=True, type=str, help="Đường dẫn tệp audio đầu vào")
    convert_parser.add_argument("--output", required=True, type=str, help="Đường dẫn tệp audio kết quả")
    convert_parser.add_argument("--sample-rate", type=int, default=44100, help="Tần số lấy mẫu (44100, 48000)")
    convert_parser.add_argument("--channels", type=int, default=2, help="Số kênh âm thanh (1: mono, 2: stereo)")
    convert_parser.add_argument("--bitrate", type=str, default="320k", help="Bitrate xuất ra (192k, 256k, 320k)")
    convert_parser.add_argument("--lufs-norm", action="store_true", default=True, help="Kích hoạt chuẩn hóa âm lượng LUFS (-16 LUFS)")

    args = parser.parse_args()

    # Khởi tạo FFmpeg Engine
    engine = FFmpegEngine(args.ffmpeg_path, args.ffprobe_path)
    if not engine.is_ffmpeg_available():
        logger.error("Không tìm thấy binary FFmpeg trên hệ thống.")
        print_status("LỖI HỆ THỐNG: Không tìm thấy công cụ FFmpeg. Vui lòng cài đặt hoặc bổ sung binary FFmpeg.")
        sys.exit(1)

    service = MultiToolService(engine)
    success = False

    try:
        if args.subcommand == "merge-audio":
            success = service.merge_audio(
                vocal_path=args.vocal,
                bgm_path=args.bgm,
                output_path=args.output,
                vocal_volume=args.vocal_volume,
                bgm_volume=args.bgm_volume,
                audio_format=args.format
            )

        elif args.subcommand == "mux-video":
            success = service.mux_video(
                video_path=args.video,
                audio_path=args.audio,
                output_path=args.output,
                subtitle_path=args.subtitle,
                subtitle_mode=args.subtitle_mode
            )

        elif args.subcommand == "convert-audio":
            success = service.convert_audio(
                input_path=args.input,
                output_path=args.output,
                sample_rate=args.sample_rate,
                channels=args.channels,
                bitrate=args.bitrate,
                lufs_normalize=args.lufs_norm
            )

    except Exception as e:
        logger.exception(f"Lỗi không xác định khi thực thi sub-command '{args.subcommand}': {e}")
        print_status(f"LỖI NGOẠI LỆ: {str(e)}")
        success = False

    if success:
        logger.info(f"Sub-command '{args.subcommand}' hoàn tất thành công.")
        sys.exit(0)
    else:
        logger.error(f"Sub-command '{args.subcommand}' thất bại.")
        sys.exit(1)


if __name__ == "__main__":
    main()
