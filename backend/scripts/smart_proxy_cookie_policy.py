#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CreatorOS - Smart Proxy & Cookie Dynamic Policy Engine (Backend Python Worker)
================================================================================
Technical Features:
1. Conditional Policy Evaluation:
   - Direct high-speed download if total queue items <= threshold (default 5) AND platform is not strict (Douyin/TikTok).
   - Auto-activates Proxy & Cookie if total queue items > 5 OR target platform is Douyin/TikTok.
2. Dynamic yt-dlp Options Integration:
   - Builds dynamic parameters dictionary for `yt_dlp.YoutubeDL(options)` or CLI args (`--proxy`, `--cookies`, `--add-header`).
3. Auto-Fallback on Ban (HTTP 403 Forbidden / 429 Too Many Requests):
   - Catches 403 / 429 rate limit or IP ban errors during direct downloads and automatically retries with rotated Proxy & Cookie.
"""

import os
import sys
import json
import logging
import time
from typing import Dict, Any, List, Optional, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SmartProxyCookiePolicy")


class DynamicProxyCookiePolicy:
    """Class đại diện cho quyết định chính sách Proxy & Cookie"""

    def __init__(
        self,
        should_use_proxy: bool,
        should_use_cookie: bool,
        proxy_url: Optional[str] = None,
        cookie_file_path: Optional[str] = None,
        cookie_header: Optional[str] = None,
        reason: str = ""
    ):
        self.should_use_proxy = should_use_proxy
        self.should_use_cookie = should_use_cookie
        self.proxy_url = proxy_url
        self.cookie_file_path = cookie_file_path
        self.cookie_header = cookie_header
        self.reason = reason

    def to_dict(self) -> Dict[str, Any]:
        return {
            "should_use_proxy": self.should_use_proxy,
            "should_use_cookie": self.should_use_cookie,
            "proxy_url": self.proxy_url,
            "cookie_file_path": self.cookie_file_path,
            "reason": self.reason
        }


class SmartProxyCookiePolicyManager:
    """
    Quản lý chính sách kích hoạt thông minh Proxy & Cookie cho Batch Downloader Pro
    """

    def __init__(self, safe_queue_threshold: int = 5):
        self.safe_queue_threshold = safe_queue_threshold
        # Các nền tảng khắt khe cần bảo vệ IP chống Ban
        self.strict_platforms = {"douyin", "tiktok", "instagram"}
        # Danh sách proxy dự phòng mẫu
        self.sample_proxy_pool = [
            "http://proxy1.creatoros.net:8080",
            "http://proxy2.creatoros.net:8080",
            "socks5://proxy3.creatoros.net:1080"
        ]
        self._proxy_index = 0

    def evaluate_policy(
        self,
        queue_length: int,
        platform: str,
        account_id: Optional[str] = None,
        force_proxy_cookie: bool = False
    ) -> DynamicProxyCookiePolicy:
        """
        1. Conditional Policy Evaluation (Điều kiện kích hoạt)
        - Đánh giá có nên kích hoạt Proxy/Cookie dựa trên số lượng hàng đợi & nền tảng.
        """
        norm_platform = platform.lower().strip()
        is_strict = norm_platform in self.strict_platforms
        exceeds_threshold = queue_length > self.safe_queue_threshold

        if force_proxy_cookie or exceeds_threshold or is_strict:
            if force_proxy_cookie:
                reason = "Cấu hình cưỡng chế dùng Proxy & Cookie (Force Flag)"
            elif is_strict:
                reason = f"Nền tảng khắt khe ({norm_platform.upper()}) - Bắt buộc nạp Cookie & Proxy xoay vòng"
            else:
                reason = f"Tải số lượng lớn ({queue_length} video > ngưỡng an toàn {self.safe_queue_threshold}) - Kích hoạt Proxy & Cookie"

            # Lấy Proxy xoay vòng
            selected_proxy = self._get_rotated_proxy()
            cookie_file = f"./cookies/{norm_platform}_cookie.txt"

            return DynamicProxyCookiePolicy(
                should_use_proxy=True,
                should_use_cookie=True,
                proxy_url=selected_proxy,
                cookie_file_path=cookie_file,
                reason=reason
            )

        # Ngược lại: Tải trực tiếp không dùng Proxy/Cookie để tối ưu tốc độ
        return DynamicProxyCookiePolicy(
            should_use_proxy=False,
            should_use_cookie=False,
            reason=f"Tải trực tiếp tốc độ cao (Số lượng link {queue_length} <= {self.safe_queue_threshold}, không phải Douyin/TikTok)"
        )

    def build_yt_dlp_options(
        self,
        policy: DynamicProxyCookiePolicy,
        save_directory: str = "./downloads",
        custom_filename: str = "%(title)s [%(id)s].%(ext)s"
    ) -> Dict[str, Any]:
        """
        2. Tích hợp yt-dlp Options
        Xây dựng tham số cấu hình động cho yt-dlp
        """
        options: Dict[str, Any] = {
            "outtmpl": os.path.join(save_directory, custom_filename),
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "nocheckcertificate": True,
            "no_warnings": True,
            "quiet": True,
            "retries": 3,
            "socket_timeout": 15,
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9,vi;q=0.8"
            }
        }

        # Đính kèm Proxy khi điều kiện kích hoạt được đáp ứng
        if policy.should_use_proxy and policy.proxy_url:
            options["proxy"] = policy.proxy_url

        # Đính kèm Cookie File khi điều kiện kích hoạt được đáp ứng
        if policy.should_use_cookie and policy.cookie_file_path:
            if os.path.exists(policy.cookie_file_path):
                options["cookiefile"] = policy.cookie_file_path

        return options

    def execute_with_auto_fallback(
        self,
        url: str,
        platform: str,
        queue_length: int,
        download_fn,
        save_directory: str = "./downloads"
    ) -> Dict[str, Any]:
        """
        3. Cơ chế tự động chuyển đổi khi lỗi (Auto-Fallback on Ban / HTTP 403 / 429)
        - Nếu luồng tải trực tiếp bị lỗi 403 Forbidden hoặc 429 Too Many Requests,
          tiến trình tự động gán Proxy xoay vòng và Cookie để thử lại mà không làm gián đoạn batch.
        """
        # Đánh giá chính sách ban đầu
        policy = self.evaluate_policy(queue_length=queue_length, platform=platform)
        logger.info(f"[SmartPolicy] {policy.reason}")

        yt_opts = self.build_yt_dlp_options(policy, save_directory)

        try:
            # Thử nghiệm lần 1
            return download_fn(url, yt_opts, is_fallback=False)
        except Exception as err:
            err_str = str(err)
            is_ban_or_rate_limit = (
                "403" in err_str or
                "429" in err_str or
                "forbidden" in err_str.lower() or
                "too many requests" in err_str.lower() or
                "captcha" in err_str.lower()
            )

            # Nếu tải trực tiếp bị lỗi Ban IP (403/429), kích hoạt Auto-Fallback ngay lập tức
            if is_ban_or_rate_limit and not policy.should_use_proxy:
                logger.warning("⚠️ [Auto-Fallback] Phát hiện lỗi HTTP 403/429 (Ban IP / Limit) khi tải trực tiếp!")
                logger.info("🔄 [Auto-Fallback] Đang tự động gán Proxy xoay vòng & Nạp Cookie để thử lại...")

                # Kích hoạt bắt buộc Proxy & Cookie
                fallback_policy = self.evaluate_policy(
                    queue_length=queue_length,
                    platform=platform,
                    force_proxy_cookie=True
                )
                fallback_yt_opts = self.build_yt_dlp_options(fallback_policy, save_directory)

                logger.info(f"🛡️ [Fallback Proxy] Gán thành công Proxy: {fallback_policy.proxy_url}")

                # Thử lại với Proxy & Cookie
                return download_fn(url, fallback_yt_opts, is_fallback=True)

            # Re-raise lỗi nếu không thể xử lý
            raise err

    def _get_rotated_proxy(self) -> str:
        """Thuật toán Round-Robin đơn giản chọn Proxy"""
        if not self.sample_proxy_pool:
            return ""
        proxy = self.sample_proxy_pool[self._proxy_index % len(self.sample_proxy_pool)]
        self._proxy_index += 1
        return proxy


if __name__ == "__main__":
    # Demo kiểm thử dịch vụ cấu hình thông minh
    policy_mgr = SmartProxyCookiePolicyManager(safe_queue_threshold=5)

    print("--- Test 1: Single link YouTube (Expected: Direct) ---")
    p1 = policy_mgr.evaluate_policy(queue_length=2, platform="youtube")
    print(f"Decision: UseProxy={p1.should_use_proxy}, Reason={p1.reason}")

    print("\n--- Test 2: Douyin single link (Expected: Proxy+Cookie due to strict platform) ---")
    p2 = policy_mgr.evaluate_policy(queue_length=1, platform="douyin")
    print(f"Decision: UseProxy={p2.should_use_proxy}, ProxyURL={p2.proxy_url}, Reason={p2.reason}")

    print("\n--- Test 3: Large batch (10 links) YouTube (Expected: Proxy+Cookie due to queue size > 5) ---")
    p3 = policy_mgr.evaluate_policy(queue_length=10, platform="youtube")
    print(f"Decision: UseProxy={p3.should_use_proxy}, ProxyURL={p3.proxy_url}, Reason={p3.reason}")

    print("\n--- Test 4: Dynamic yt-dlp Options Generation ---")
    opts = policy_mgr.build_yt_dlp_options(p3, save_directory="./my_videos")
    print("yt-dlp Options:", json.dumps(opts, indent=2))
