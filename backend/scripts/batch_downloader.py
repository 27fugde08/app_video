#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS - High-Performance Async Batch Media Downloader
=========================================================
Module backend độc lập xử lý tải hàng loạt đa luồng cho CreatorOS.

Đặc điểm kỹ thuật:
1. Thuật toán Concurrency Control: `asyncio.Semaphore(5)` giới hạn tối đa 5 luồng tải đồng thời.
2. Bóc tách No-Watermark Link: Tự động xử lý URL Douyin, TikTok, YouTube, Facebook Reels.
3. Kỹ thuật Chunked Streaming: Đọc stream HTTP và ghi trực tiếp từng chunk xuống đĩa cứng (Disk I/O buffer 64KB), không nạp toàn bộ file vào RAM.
4. Automatic Retry Mechanism: Tự động thử lại tối đa 3 lần với Exponential Backoff khi gặp lỗi mạng/timeout.
5. Real-time Progress IPC: Báo cáo % tiến độ, tốc độ (MB/s), bytes đã nạp qua stdout JSON streamer.
"""

import os
import sys
import json
import re
import asyncio
import time
import argparse
import urllib.parse
from typing import Dict, List, Optional, Any
import urllib.request
import ssl

# Check yt-dlp availability
YTDLP_AVAILABLE = False
try:
    import yt_dlp
    YTDLP_AVAILABLE = True
except ImportError:
    YTDLP_AVAILABLE = False


class WatermarkLinkExtractor:
    """
    Trích xuất trực tiếp link media không watermark từ các nền tảng phổ biến:
    Douyin, TikTok, YouTube, Facebook Reels.
    """
    
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        "Referer": "https://www.tiktok.com/"
    }

    @staticmethod
    def detect_platform(url: str) -> str:
        url_lower = url.lower()
        if "douyin.com" in url_lower or "iesdouyin.com" in url_lower:
            return "douyin"
        elif "tiktok.com" in url_lower or "vt.tiktok.com" in url_lower:
            return "tiktok"
        elif "youtube.com" in url_lower or "youtu.be" in url_lower:
            return "youtube"
        elif "facebook.com" in url_lower or "fb.watch" in url_lower or "fb.com" in url_lower:
            return "facebook"
        return "generic"

    @classmethod
    def clean_douyin_url(cls, raw_url: str) -> str:
        """
        Bóc tách link không watermark Douyin bằng cách thay thế đường dẫn 'playwm' thành 'play'
        """
        cleaned = raw_url.replace("/playwm/", "/play/")
        if "watermark=1" in cleaned:
            cleaned = cleaned.replace("watermark=1", "watermark=0")
        return cleaned

    @classmethod
    async def extract_direct_url(cls, url: str, proxy: Optional[str] = None) -> Dict[str, Any]:
        """
        Sử dụng yt-dlp API kết hợp Custom Rules để bóc tách Direct Stream URL không watermark.
        """
        platform = cls.detect_platform(url)
        title = f"video_{int(time.time())}"
        direct_url = url
        file_ext = "mp4"

        if YTDLP_AVAILABLE:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'noplaylist': True,
                'proxy': proxy if proxy else None,
                'http_headers': cls.HEADERS
            }

            def _extract_ydl():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    return info

            try:
                loop = asyncio.get_running_loop()
                info = await loop.run_in_executor(None, _extract_ydl)
                if info:
                    title = info.get('title') or title
                    file_ext = info.get('ext') or 'mp4'
                    direct_url = info.get('url') or url

                    # Douyin / TikTok watermark strip fallback logic
                    if platform in ['douyin', 'tiktok'] and 'formats' in info:
                        for fmt in info['formats']:
                            fmt_url = fmt.get('url', '')
                            if 'playwm' not in fmt_url and ('video' in fmt.get('vcodec', '') or fmt.get('height')):
                                direct_url = fmt_url
                                break
                    
                    if platform == 'douyin':
                        direct_url = cls.clean_douyin_url(direct_url)

            except Exception as e:
                # Fallback url parsing
                direct_url = url

        return {
            "platform": platform,
            "title": title,
            "ext": file_ext,
            "direct_url": direct_url
        }


class ChunkedAsyncDownloader:
    """
    Dịch vụ tải xuống đa luồng an toàn:
    - SemaphoreSlim concurrency limiter (mặc định 5 luồng)
    - Ghi stream dạng chunk (64KB buffer) trực tiếp xuống đĩa cứng
    - Exponential Backoff Automatic Retry (tối đa 3 lần khi ngắt kết nối)
    """

    def __init__(self, max_concurrency: int = 5, max_retries: int = 3, chunk_size: int = 65536):
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.max_retries = max_retries
        self.chunk_size = chunk_size  # 64 KB buffer

    def _emit_json(self, payload: Dict[str, Any]):
        """
        Báo cáo sự kiện JSON qua stdout theo thời gian thực cho Node.js parent process tiêu thụ.
        """
        print(json.dumps(payload, ensure_ascii=False), flush=True)

    async def download_file_with_retry(
        self,
        item_id: str,
        target_url: str,
        output_filepath: str,
        title: str = "Media File"
    ) -> bool:
        """
        Thực hiện tải 1 file với cơ chế Retry 3 lần và ghi chunk trực tiếp xuống ổ cứng.
        """
        async with self.semaphore:
            attempt = 0
            success = False
            last_error = ""

            while attempt < self.max_retries and not success:
                attempt += 1
                backoff_delay = 2 ** (attempt - 1)  # 1s, 2s, 4s

                self._emit_json({
                    "type": "log",
                    "jobId": item_id,
                    "level": "info",
                    "message": f"[Luồng {item_id}] Thử nghiệm lần {attempt}/{self.max_retries} - Bắt đầu stream dữ liệu..."
                })

                try:
                    success = await self._stream_to_disk(item_id, target_url, output_filepath, title)
                    if success:
                        self._emit_json({
                            "type": "completed",
                            "jobId": item_id,
                            "title": title,
                            "outputPath": output_filepath,
                            "message": f"Tải thành công file: {output_filepath}"
                        })
                        return True
                except Exception as err:
                    last_error = str(err)
                    self._emit_json({
                        "type": "log",
                        "jobId": item_id,
                        "level": "warning",
                        "message": f"[Lỗi mạng lần {attempt}] {last_error}. Thử lại sau {backoff_delay}s..."
                    })
                    
                    if attempt < self.max_retries:
                        await asyncio.sleep(backoff_delay)

            # Fail after max retries
            self._emit_json({
                "type": "error",
                "jobId": item_id,
                "title": title,
                "error": f"Tải thất bại sau {self.max_retries} lần thử: {last_error}"
            })
            
            # Clean up partial incomplete file
            if os.path.exists(output_filepath + ".tmp"):
                try:
                    os.remove(output_filepath + ".tmp")
                except Exception:
                    pass

            return False

    async def _stream_to_disk(
        self,
        item_id: str,
        url: str,
        output_filepath: str,
        title: str
    ) -> bool:
        """
        Đọc HTTP stream và ghi đĩa trực tiếp bằng Chunked Buffer.
        Tránh nạp toàn bộ dữ liệu dung lượng lớn vào bộ nhớ RAM.
        """
        tmp_filepath = output_filepath + ".tmp"
        
        # Configure SSL context
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "*/*"
        }

        def _do_stream_request():
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                total_size = int(resp.headers.get('Content-Length', 0))
                downloaded = 0
                start_time = time.time()
                last_emit = start_time

                os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
                with open(tmp_filepath, 'wb') as out_f:
                    while True:
                        chunk = resp.read(self.chunk_size)
                        if not chunk:
                            break
                        out_f.write(chunk)
                        downloaded += len(chunk)

                        now = time.time()
                        # Emit progress event every 300ms
                        if now - last_emit > 0.3 or (total_size > 0 and downloaded == total_size):
                            last_emit = now
                            elapsed = max(0.001, now - start_time)
                            speed_mb = round((downloaded / (1024 * 1024)) / elapsed, 2)
                            progress_pct = round((downloaded / total_size * 100), 1) if total_size > 0 else 50.0

                            self._emit_json({
                                "type": "progress",
                                "jobId": item_id,
                                "progress": progress_pct,
                                "downloadedBytes": downloaded,
                                "totalBytes": total_size,
                                "speedMb": speed_mb,
                                "speed": f"{speed_mb} MB/s",
                                "etaSeconds": max(0, int((total_size - downloaded) / (speed_mb * 1024 * 1024 + 1))) if total_size > 0 else 0
                            })

                # Atomic rename after download completion
                if os.path.exists(output_filepath):
                    os.remove(output_filepath)
                os.rename(tmp_filepath, output_filepath)
                return True

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _do_stream_request)

    async def batch_download(
        self,
        download_jobs: List[Dict[str, Any]],
        output_dir: str
    ) -> List[bool]:
        """
        Khởi chạy đồng thời danh sách tác vụ tải (Max 5 luồng Semaphore)
        """
        os.makedirs(output_dir, exist_ok=True)
        tasks = []

        self._emit_json({
            "type": "log",
            "level": "info",
            "message": f"[Batch Engine] Bắt đầu tải hàng loạt {len(download_jobs)} video (Max 5 luồng Semaphore)..."
        })

        for idx, job in enumerate(download_jobs):
            job_id = job.get("id", f"job_{idx+1}")
            raw_url = job.get("url", "")
            custom_name = job.get("name")

            # Extract Direct Link & Clean Watermark
            extracted = await WatermarkLinkExtractor.extract_direct_url(raw_url)
            clean_title = custom_name or extracted["title"] or f"video_{job_id}"
            
            # Sanitize filename
            safe_filename = re.sub(r'[\\/*?:"<>|]', '_', clean_title)[:80]
            out_path = os.path.join(output_dir, f"{safe_filename}.{extracted['ext']}")

            tasks.append(
                self.download_file_with_retry(
                    item_id=job_id,
                    target_url=extracted["direct_url"],
                    output_filepath=out_path,
                    title=clean_title
                )
            )

        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_count = sum(1 for r in results if r is True)
        self._emit_json({
            "type": "batch_completed",
            "total": len(download_jobs),
            "successful": successful_count,
            "failed": len(download_jobs) - successful_count,
            "message": f"Hoàn tất tải {successful_count}/{len(download_jobs)} tác vụ."
        })

        return [r is True for r in results]


async def main_async():
    parser = argparse.ArgumentParser(description="CreatorOS Async Batch Downloader Engine")
    parser.add_argument("--json_jobs", help="Chuỗi JSON danh sách tác vụ tải [{'id':'1', 'url':'...'}]")
    parser.add_argument("--urls_file", help="Đường dẫn file txt chứa danh sách URL (mỗi dòng 1 URL)")
    parser.add_argument("--output_dir", default="./downloads", help="Thư mục lưu video thành phẩm")
    parser.add_argument("--concurrency", type=int, default=5, help="Số luồng tải đồng thời tối đa (Default: 5)")
    parser.add_argument("--retries", type=int, default=3, help="Số lần retry khi mất kết nối (Default: 3)")

    args = parser.parse_args()

    jobs = []
    if args.json_jobs:
        try:
            jobs = json.loads(args.json_jobs)
        except Exception as e:
            print(json.dumps({"type": "error", "error": f"Lỗi parse JSON jobs: {e}"}), flush=True)
            sys.exit(1)
    elif args.urls_file and os.path.exists(args.urls_file):
        with open(args.urls_file, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip() and not line.startswith("#")]
            for idx, u in enumerate(lines):
                jobs.append({"id": f"dl_{idx+1}", "url": u})

    if not jobs:
        # Demo / Test sample execution
        jobs = [
            {"id": "demo_1", "url": "https://www.douyin.com/share/video/12345678"},
            {"id": "demo_2", "url": "https://www.tiktok.com/@user/video/87654321"}
        ]

    downloader = ChunkedAsyncDownloader(
        max_concurrency=args.concurrency,
        max_retries=args.retries
    )

    await downloader.batch_download(jobs, args.output_dir)


if __name__ == "__main__":
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        print(json.dumps({"type": "log", "level": "warning", "message": "Tiến trình bị ngắt bởi người dùng."}), flush=True)
        sys.exit(0)
