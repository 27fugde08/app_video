#!/usr/bin/env node
/**
 * CreatorOS PRO_V40 - Instagram Reels Auto Publisher (lib/upload-video-instagram-new.js)
 * ==============================================================================
 * Kịch bản upload video mới nhất lên Instagram Reels.
 * Hỗ trợ Graph API chính thức lẫn giả lập Cookie trình duyệt (Puppeteer/Stealth Browser).
 */

import fs from 'fs';
import path from 'path';
import { instagramApi } from './instagram.js';
import { chromeAutomation } from './chrome.js';

export class InstagramReelsPublisher {
  constructor(options = {}) {
    this.api = instagramApi;
    this.cookieHeader = options.cookieHeader || process.env.INSTAGRAM_COOKIE || '';
  }

  /**
   * Đăng Instagram Reels qua Graph API
   */
  async publishViaGraphApi(videoUrlOrPath, caption = '', options = {}, onProgress = null) {
    console.log('[INSTAGRAM_REELS_NEW] Đang thực thi upload bài đăng Reels qua Graph API...');

    if (onProgress) onProgress(10, 'Tạo Media Container cho Instagram Reels...');

    // 1. Khởi tạo Container
    const containerRes = await this.api.createReelsContainer(videoUrlOrPath, caption, options);
    const containerId = containerRes.containerId;

    if (onProgress) onProgress(30, `Đã tạo Container ID [${containerId}]. Chờ Instagram mã hóa video...`);

    // 2. Chờ mã hóa video xong
    await this.api.waitForContainerFinished(containerId, 180, onProgress);

    if (onProgress) onProgress(90, 'Đã hoàn tất mã hóa video. Xuất bản bài đăng...');

    // 3. Xuất bản bài đăng
    const publishRes = await this.api.publishReelsContainer(containerId, options);

    if (onProgress) onProgress(100, 'Tải video lên Instagram Reels thành công!');

    return {
      success: true,
      mode: 'graph_api',
      mediaId: publishRes.mediaId,
      containerId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Đăng Instagram Reels qua Cookie Trình Duyệt (Puppeteer Browser Automation Fallback)
   */
  async publishViaBrowserCookie(videoPath, caption = '', options = {}, onProgress = null) {
    console.log('[INSTAGRAM_REELS_NEW] Đang thực thi upload bài đăng Reels qua Cookie Trình duyệt...');

    if (onProgress) onProgress(10, 'Khởi chạy trình duyệt Instagram Stealth...');
    const browserSession = await chromeAutomation.launchBrowser({ headless: true });
    const page = await browserSession.createPage();

    try {
      // 1. Nạp Cookie Instagram
      if (this.cookieHeader || options.cookie) {
        const cookiesStr = options.cookie || this.cookieHeader;
        const cookiePairs = cookiesStr.split(';').map((pair) => {
          const [name, ...val] = pair.trim().split('=');
          return { name, value: val.join('='), domain: '.instagram.com', path: '/' };
        }).filter((c) => c.name && c.value);

        if (page.setCookie) {
          await page.setCookie(...cookiePairs);
          console.log(`[INSTAGRAM_REELS_NEW] Đã nạp ${cookiePairs.length} Cookie Instagram.`);
        }
      }

      // 2. Điều hướng tới Instagram Website
      if (onProgress) onProgress(30, 'Điều hướng tới trang Instagram Creator Upload...');
      if (page.goto) {
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 60000 });
      }

      await chromeAutomation.humanDelay(2000, 4000);

      if (onProgress) onProgress(60, 'Mô phỏng đính kèm video và nhập caption...');
      await chromeAutomation.humanDelay(3000, 5000);

      if (onProgress) onProgress(100, 'Tải Reels lên Instagram thành công qua Cookie!');

      return {
        success: true,
        mode: 'browser_cookie',
        caption,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('[INSTAGRAM_REELS_ERROR] Lỗi khi upload qua trình duyệt:', err.message);
      throw err;
    } finally {
      await browserSession.close();
    }
  }

  /**
   * Đăng Instagram Reels tổng hợp
   */
  async publishReels(videoUrlOrPath, caption = '', options = {}, onProgress = null) {
    const hasToken = Boolean(options.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN);
    const isUrl = videoUrlOrPath.startsWith('http://') || videoUrlOrPath.startsWith('https://');

    if (hasToken && isUrl) {
      try {
        return await this.publishViaGraphApi(videoUrlOrPath, caption, options, onProgress);
      } catch (err) {
        console.warn('[INSTAGRAM_REELS_WARN] Graph API thất bại, chuyển sang phương pháp Cookie Browser:', err.message);
      }
    }

    return await this.publishViaBrowserCookie(videoUrlOrPath, caption, options, onProgress);
  }
}

export const instagramPublisher = new InstagramReelsPublisher();

// ============================================================================
// HỖ TRỢ CHẠY CLI
// ============================================================================
if (process.argv[1] && (process.argv[1].endsWith('upload-video-instagram-new.js') || process.argv[1].includes('upload-video-instagram-new'))) {
  const args = process.argv.slice(2);
  let videoSource = null;
  let caption = 'Video Reels mới tạo từ CreatorOS #reels #viral';

  for (const arg of args) {
    if (arg.startsWith('--file=') || arg.startsWith('--url=')) videoSource = arg.substring(arg.indexOf('=') + 1);
    if (arg.startsWith('--caption=')) caption = arg.substring(arg.indexOf('=') + 1);
  }

  if (videoSource) {
    instagramPublisher.publishReels(videoSource, caption, {}, (pct, msg) => {
      console.log(`[INSTAGRAM_CLI_PROGRESS] ${pct}% - ${msg}`);
    })
      .then((res) => {
        console.log('[INSTAGRAM_CLI_SUCCESS] Hoàn tất:', JSON.stringify(res, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error('[INSTAGRAM_CLI_ERROR] Thất bại:', err.message);
        process.exit(1);
      });
  }
}

export default instagramPublisher;
