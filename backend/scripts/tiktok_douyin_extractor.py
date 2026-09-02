#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS PRO_V40 - TikTok & Douyin Automated Video Scanner & Extractor Engine
================================================================================
Script bóc tách thông tin & trích xuất metadata video không watermark từ TikTok và Douyin.

Tính năng chính:
1. Tự động giải mã link ngắn (Short URLs: v.douyin.com, vt.tiktok.com, vm.tiktok.com).
2. Trích xuất Metadata đa nguồn: yt-dlp API kết hợp Underground Web APIs (TikWM, Douyin Aweme API).
3. Lấy link stream video HD trực tiếp KHÔNG WATERMARK (No-Watermark Direct Stream URL),
   ảnh bìa chất lượng cao (Cover/Thumbnail Image), tác giả, thống kê (likes, shares, views), nhạc nền.
4. Cơ chế chống cản trở & Anti-Bot: Tự động xoay xở User-Agent giả lập di động, Cookie Session,
   vượt rào cản Redirect, hỗ trợ HTTP/SOCKS5 Proxy.
5. Chuẩn hóa dữ liệu đầu ra JSON payload sẵn sàng đẩy trực tiếp vào Hàng đợi Tải xuống (Download Queue).
"""

import os
import sys
import re
import json
import time
import argparse
import urllib.request
import urllib.parse
import ssl
import logging
from typing import Dict, List, Optional, Any, Tuple

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [VideoExtractor] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("VideoExtractor")

# Kiểm tra thư viện yt-dlp
YTDLP_AVAILABLE = False
try:
    import yt_dlp
    YTDLP_AVAILABLE = True
except ImportError:
    YTDLP_AVAILABLE = False


def print_status(message: str) -> None:
    """In thông tin trạng thái định dạng cho Node.js đọc"""
    print(f"[EXTRACT_STATUS] {message}", flush=True)


class TikTokDouyinExtractor:
    """Class bóc tách thông tin video TikTok và Douyin chuyên sâu"""

    DEFAULT_USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36"
    ]

    DOUYIN_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Referer": "https://www.douyin.com/"
    }

    TIKTOK_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        "Referer": "https://www.tiktok.com/"
    }

    def __init__(self, proxy: Optional[str] = None, timeout: int = 15):
        self.proxy = proxy
        self.timeout = timeout
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE

    def resolve_short_url(self, raw_url: str) -> str:
        """
        Giải mã các liên kết ngắn (Short links) về URL gốc hoàn chỉnh:
        - Douyin: v.douyin.com/xxx
        - TikTok: vt.tiktok.com/xxx, vm.tiktok.com/xxx
        """
        raw_url = raw_url.strip()
        if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
            raw_url = "https://" + raw_url

        # Trích xuất URL nếu nằm trong văn bản chia sẻ (ví dụ: "Check out this video: https://vt.tiktok.com/xyz")
        url_match = re.search(r"https?://[^\s]+", raw_url)
        if url_match:
            raw_url = url_match.group(0)

        # Nếu là short url, theo dõi HTTP Redirection
        short_domains = ["v.douyin.com", "vt.tiktok.com", "vm.tiktok.com", "m.tiktok.com"]
        parsed = urllib.parse.urlparse(raw_url)

        if any(domain in parsed.netloc for domain in short_domains):
            try:
                print_status(f"Đang mở rộng link ngắn: {raw_url}")
                req = urllib.request.Request(
                    raw_url,
                    headers={"User-Agent": self.DEFAULT_USER_AGENTS[0]}
                )

                handler = urllib.request.HTTPRedirectHandler()
                opener = urllib.request.build_opener(handler)
                if self.proxy:
                    proxy_handler = urllib.request.ProxyHandler({'http': self.proxy, 'https': self.proxy})
                    opener = urllib.request.build_opener(handler, proxy_handler)

                with opener.open(req, timeout=self.timeout) as response:
                    resolved = response.geturl()
                    logger.info(f"Đã giải mã short URL '{raw_url}' -> '{resolved}'")
                    return resolved
            except Exception as e:
                logger.warning(f"Không thể giải mã short URL qua Redirect Handler ({e}), trả về URL ban đầu.")

        return raw_url

    def detect_platform(self, url: str) -> str:
        """Nhận diện nền tảng từ URL"""
        url_lower = url.lower()
        if "douyin.com" in url_lower or "iesdouyin.com" in url_lower:
            return "douyin"
        elif "tiktok.com" in url_lower:
            return "tiktok"
        return "unknown"

    def extract_douyin_item_id(self, url: str) -> Optional[str]:
        """Trích xuất ID video Douyin từ URL"""
        # Dạng /video/7123456789012345678 hoặc item_ids=7123456789012345678
        match = re.search(r"/video/(\d+)", url)
        if match:
            return match.group(1)
        match = re.search(r"modal_id=(\d+)", url)
        if match:
            return match.group(1)
        match = re.search(r"item_ids=(\d+)", url)
        if match:
            return match.group(1)
        match = re.search(r"(\d{18,20})", url)
        if match:
            return match.group(1)
        return None

    def extract_tiktok_item_id(self, url: str) -> Optional[str]:
        """Trích xuất ID video TikTok từ URL"""
        match = re.search(r"/video/(\d+)", url)
        if match:
            return match.group(1)
        match = re.search(r"/v/(\d+)", url)
        if match:
            return match.group(1)
        match = re.search(r"(\d{18,20})", url)
        if match:
            return match.group(1)
        return None

    async def _extract_with_ytdlp(self, url: str) -> Optional[Dict[str, Any]]:
        """Bóc tách metadata sử dụng thư viện yt-dlp"""
        if not YTDLP_AVAILABLE:
            return None

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'noplaylist': True,
            'proxy': self.proxy if self.proxy else None,
            'http_headers': self.TIKTOK_HEADERS,
            'socket_timeout': self.timeout
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    return None

                # Lấy link direct stream
                stream_url = info.get('url')
                if not stream_url and info.get('requested_formats'):
                    stream_url = info['requested_formats'][0].get('url')

                # Chuẩn hóa link no-watermark nếu là Douyin
                if stream_url and "douyin" in url.lower():
                    stream_url = stream_url.replace("/playwm/", "/play/")

                thumbnails = info.get('thumbnails', [])
                cover_image = thumbnails[-1].get('url') if thumbnails else info.get('thumbnail', '')

                return {
                    "source": "yt-dlp",
                    "videoId": info.get('id', ''),
                    "title": info.get('title', '') or info.get('description', 'Untitled Video'),
                    "description": info.get('description', ''),
                    "author": {
                        "id": info.get('uploader_id', ''),
                        "nickname": info.get('uploader', 'Unknown Author'),
                        "avatar": ""
                    },
                    "coverImage": cover_image,
                    "directStreamUrl": stream_url,
                    "audioStreamUrl": info.get('audio_url', ''),
                    "durationSec": info.get('duration', 0),
                    "metrics": {
                        "likes": info.get('like_count', 0),
                        "comments": info.get('comment_count', 0),
                        "shares": info.get('repost_count', 0),
                        "views": info.get('view_count', 0)
                    },
                    "hashtags": info.get('tags', []),
                    "width": info.get('width', 1080),
                    "height": info.get('height', 1920)
                }
        except Exception as e:
            logger.warning(f"yt-dlp extraction failed for '{url}': {e}")
            return None

    def _extract_douyin_api_fallback(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Bóc tách Douyin qua Underground Aweme ItemInfo Web API"""
        print_status(f"Thực hiện Bóc Tách Douyin Underground API (ID: {item_id})...")
        api_url = f"https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids={item_id}"

        try:
            req = urllib.request.Request(api_url, headers=self.DOUYIN_HEADERS)
            if self.proxy:
                proxy_handler = urllib.request.ProxyHandler({'http': self.proxy, 'https': self.proxy})
                opener = urllib.request.build_opener(proxy_handler)
            else:
                opener = urllib.request.build_opener()

            with opener.open(req, timeout=self.timeout, context=self.ssl_context) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            item_list = data.get("item_list", [])
            if not item_list:
                return None

            item = item_list[0]
            desc = item.get("desc", f"Douyin_Video_{item_id}")

            # Lấy cover image
            video_data = item.get("video", {})
            cover_list = video_data.get("cover", {}).get("url_list", [])
            dynamic_cover = video_data.get("dynamic_cover", {}).get("url_list", [])
            cover_image = cover_list[0] if cover_list else (dynamic_cover[0] if dynamic_cover else "")

            # Trích xuất No-Watermark Stream URL bằng cách đổi 'playwm' thành 'play'
            play_addr = video_data.get("play_addr", {}).get("url_list", [])
            raw_stream_url = play_addr[0] if play_addr else ""
            no_watermark_stream_url = raw_stream_url.replace("/playwm/", "/play/") if raw_stream_url else ""

            # Thống kê & tác giả
            author_data = item.get("author", {})
            stats = item.get("statistics", {})

            return {
                "source": "douyin_underground_api",
                "videoId": item_id,
                "title": desc,
                "description": desc,
                "author": {
                    "id": author_data.get("uid", ""),
                    "nickname": author_data.get("nickname", "Douyin User"),
                    "avatar": author_data.get("avatar_thumb", {}).get("url_list", [""])[0]
                },
                "coverImage": cover_image,
                "directStreamUrl": no_watermark_stream_url,
                "audioStreamUrl": item.get("music", {}).get("play_url", {}).get("url_list", [""])[0],
                "durationSec": int(video_data.get("duration", 0) / 1000) if video_data.get("duration") else 0,
                "metrics": {
                    "likes": stats.get("digg_count", 0),
                    "comments": stats.get("comment_count", 0),
                    "shares": stats.get("share_count", 0),
                    "views": stats.get("play_count", 0)
                },
                "hashtags": [tag.get("cha_name") for tag in item.get("cha_list", []) if tag.get("cha_name")],
                "width": video_data.get("width", 1080),
                "height": video_data.get("height", 1920)
            }
        except Exception as e:
            logger.error(f"Lỗi khi gọi Douyin Underground API: {e}")
            return None

    def _extract_tiktok_api_fallback(self, url: str) -> Optional[Dict[str, Any]]:
        """Bóc tách TikTok qua Underground TikWM Third-Party Web API"""
        print_status(f"Thực hiện Bóc Tách TikTok Underground TikWM API...")
        api_url = "https://www.tikwm.com/api/"

        try:
            params = urllib.parse.urlencode({"url": url, "count": 12, "cursor": 0, "web": 1})
            full_url = f"{api_url}?{params}"

            req = urllib.request.Request(full_url, headers=self.TIKTOK_HEADERS)
            if self.proxy:
                proxy_handler = urllib.request.ProxyHandler({'http': self.proxy, 'https': self.proxy})
                opener = urllib.request.build_opener(proxy_handler)
            else:
                opener = urllib.request.build_opener()

            with opener.open(req, timeout=self.timeout, context=self.ssl_context) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            if data.get("code") != 0 or "data" not in data:
                return None

            v_data = data["data"]
            title = v_data.get("title") or f"TikTok_Video_{v_data.get('id', 'item')}"

            # TikWM trả về field 'play' là No-Watermark direct stream URL
            no_watermark_stream_url = v_data.get("play")
            if no_watermark_stream_url and not no_watermark_stream_url.startswith("http"):
                no_watermark_stream_url = "https://www.tikwm.com" + no_watermark_stream_url

            author_data = v_data.get("author", {})

            return {
                "source": "tikwm_underground_api",
                "videoId": str(v_data.get("id", "")),
                "title": title,
                "description": title,
                "author": {
                    "id": author_data.get("id", ""),
                    "nickname": author_data.get("nickname", author_data.get("unique_id", "TikTok Creator")),
                    "avatar": author_data.get("avatar", "")
                },
                "coverImage": v_data.get("cover") or v_data.get("origin_cover", ""),
                "directStreamUrl": no_watermark_stream_url,
                "audioStreamUrl": v_data.get("music", ""),
                "durationSec": v_data.get("duration", 0),
                "metrics": {
                    "likes": v_data.get("digg_count", 0),
                    "comments": v_data.get("comment_count", 0),
                    "shares": v_data.get("share_count", 0),
                    "views": v_data.get("play_count", 0)
                },
                "hashtags": re.findall(r"#(\w+)", title),
                "width": 1080,
                "height": 1920
            }
        except Exception as e:
            logger.error(f"Lỗi khi gọi TikWM API fallback: {e}")
            return None

    def process_url(self, raw_url: str) -> Dict[str, Any]:
        """
        Hàm xử lý chính: Nhận URL gốc -> Giải mã URL -> Bóc tách Metadata -> Chuẩn hóa Payload
        """
        resolved_url = self.resolve_short_url(raw_url)
        platform = self.detect_platform(resolved_url)

        print_status(f"Nền tảng phát hiện: [{platform.upper()}] cho URL: {resolved_url}")

        result_meta: Optional[Dict[str, Any]] = None

        # 1. Thử dùng yt-dlp trước nếu có
        if YTDLP_AVAILABLE:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            result_meta = loop.run_until_complete(self._extract_with_ytdlp(resolved_url))

        # 2. Nếu yt-dlp thất bại hoặc thiếu thông tin -> Sử dụng Underground Fallback APIs
        if not result_meta or not result_meta.get("directStreamUrl"):
            if platform == "douyin":
                item_id = self.extract_douyin_item_id(resolved_url)
                if item_id:
                    result_meta = self._extract_douyin_api_fallback(item_id)
            elif platform == "tiktok":
                result_meta = self._extract_tiktok_api_fallback(resolved_url)

        # 3. Kết cấu dữ liệu thất bại nếu không lấy được stream URL
        if not result_meta or not result_meta.get("directStreamUrl"):
            return {
                "success": False,
                "platform": platform,
                "rawUrl": raw_url,
                "resolvedUrl": resolved_url,
                "error": "Không thể trích xuất link stream video không watermark từ nguồn này."
            }

        # 4. Chuẩn hóa Payload đầu ra hoàn chỉnh sẵn sàng cho Hàng Đợi Tải Xuống (Download Queue)
        sanitized_title = re.sub(r'[\\/*?:"<>|]', "", result_meta["title"]).strip()
        if len(sanitized_title) > 80:
            sanitized_title = sanitized_title[:80] + "..."

        file_name = f"[{platform.upper()}]_{result_meta['videoId']}_{sanitized_title}.mp4"

        download_payload = {
            "taskId": f"dl_{platform}_{result_meta['videoId']}_{int(time.time())}",
            "platform": platform,
            "url": result_meta["directStreamUrl"],
            "originalUrl": raw_url,
            "outputFilename": file_name,
            "title": result_meta["title"],
            "coverImage": result_meta["coverImage"],
            "headers": self.DOUYIN_HEADERS if platform == "douyin" else self.TIKTOK_HEADERS,
            "metadata": result_meta
        }

        return {
            "success": True,
            "platform": platform,
            "rawUrl": raw_url,
            "resolvedUrl": resolved_url,
            "metadata": result_meta,
            "downloadPayload": download_payload
        }


def main():
    parser = argparse.ArgumentParser(
        description="CreatorOS TikTok & Douyin Video Metadata Scanner & Extractor",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument("--url", type=str, help="URL video TikTok hoặc Douyin cần bóc tách")
    parser.add_argument("--file", type=str, help="Đường dẫn tệp chứa danh sách URL (mỗi URL 1 dòng)")
    parser.add_argument("--proxy", type=str, default=None, help="Proxy HTTP/SOCKS5 (ví dụ: http://127.0.0.1:7890)")
    parser.add_argument("--output", type=str, default=None, help="Đường dẫn tệp xuất kết quả JSON")

    args = parser.parse_args()

    extractor = TikTokDouyinExtractor(proxy=args.proxy)
    results: List[Dict[str, Any]] = []

    if args.url:
        res = extractor.process_url(args.url)
        results.append(res)
    elif args.file and os.path.exists(args.file):
        with open(args.file, "r", encoding="utf-8") as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]

        print_status(f"Bắt đầu quét danh sách {len(urls)} video...")
        for idx, u in enumerate(urls, 1):
            print_status(f"Đang bóc tách [{idx}/{len(urls)}]: {u}")
            res = extractor.process_url(u)
            results.append(res)
    else:
        # Nếu chạy không có tham số, in mẫu thử nghiệm ví dụ
        parser.print_help()
        sys.exit(0)

    output_data = results[0] if (len(results) == 1 and args.url) else {"total": len(results), "items": results}
    json_output = json.dumps(output_data, ensure_ascii=False, indent=2)

    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(json_output)
        print_status(f"Đã lưu kết quả bóc tách metadata vào: {args.output}")

    # In JSON kết quả ra STDOUT cho tiến trình Node.js đọc
    print("\n[EXTRACT_RESULT_START]")
    print(json_output)
    print("[EXTRACT_RESULT_END]")


if __name__ == "__main__":
    main()
