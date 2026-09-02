/**
 * CreatorOS PRO_V40 - Instagram Session & Graph API Engine (lib/instagram.js)
 * ==============================================================================
 * Thư viện quản lý phiên làm việc, tương tác Instagram Graph API & Session Cookie.
 * Hỗ trợ tạo Container Media, kiểm tra trạng thái Render, và Xuất bản Reels.
 */

import fs from 'fs';
import path from 'path';

export class InstagramApiManager {
  constructor(options = {}) {
    this.accessToken = options.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.igAccountId = options.igAccountId || process.env.INSTAGRAM_ACCOUNT_ID || '';
    this.apiVersion = options.apiVersion || 'v19.0';
    this.cookieHeader = options.cookieHeader || process.env.INSTAGRAM_COOKIE || '';
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Fetch dữ liệu với cơ chế Auto-Retry
   */
  async fetchWithRetry(url, fetchOptions, retryCount = 0) {
    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
      return await response.json();
    } catch (err) {
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
        console.warn(`[INSTAGRAM_RETRY] Lần ${retryCount + 1}/${this.maxRetries} sau ${Math.round(delay)}ms. Lỗi: ${err.message}`);
        await new Promise((res) => setTimeout(res, delay));
        return this.fetchWithRetry(url, fetchOptions, retryCount + 1);
      }
      throw err;
    }
  }

  /**
   * 1. Tạo Media Container cho Instagram Reels qua Graph API
   */
  async createReelsContainer(videoUrl, caption = '', options = {}) {
    const token = options.accessToken || this.accessToken;
    const accountId = options.igAccountId || this.igAccountId;

    if (!token || !accountId) {
      throw new Error('Chưa cấu hình INSTAGRAM_ACCESS_TOKEN hoặc INSTAGRAM_ACCOUNT_ID.');
    }

    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${accountId}/media`;

    const params = new URLSearchParams({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption,
      access_token: token
    });

    if (options.coverUrl) {
      params.append('cover_url', options.coverUrl);
    }
    if (options.shareToFeed) {
      params.append('share_to_feed', 'true');
    }

    console.log(`[INSTAGRAM_API] Khởi tạo Reels Container trên tài khoản [${accountId}]...`);
    const data = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: params
    });

    if (!data.id) {
      throw new Error(`Không thể tạo Instagram Media Container: ${JSON.stringify(data)}`);
    }

    return {
      containerId: data.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 2. Kiểm tra trạng thái mã hóa (Encoding Status) của Media Container
   */
  async checkContainerStatus(containerId, options = {}) {
    const token = options.accessToken || this.accessToken;
    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${containerId}?fields=status_code,status&access_token=${token}`;

    const data = await this.fetchWithRetry(endpoint, { method: 'GET' });

    return {
      containerId,
      statusCode: data.status_code, // EXPIRED, ERROR, FINISHED, IN_PROGRESS
      status: data.status,
      isFinished: data.status_code === 'FINISHED',
      isError: data.status_code === 'ERROR' || data.status_code === 'EXPIRED'
    };
  }

  /**
   * 3. Chờ cho đến khi Media Container mã hóa xong (Polling with Timeout)
   */
  async waitForContainerFinished(containerId, maxWaitSec = 180, onProgress = null) {
    const startTime = Date.now();
    let attempt = 0;

    console.log(`[INSTAGRAM_API] Đang chờ Instagram xử lý mã hóa Container [${containerId}]...`);

    while ((Date.now() - startTime) / 1000 < maxWaitSec) {
      attempt++;
      const statusObj = await this.checkContainerStatus(containerId);

      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      console.log(`[INSTAGRAM_API] Polling lần ${attempt} (${elapsedSec}s): Status = ${statusObj.statusCode}`);

      if (onProgress) {
        const pct = Math.min(95, 40 + Math.round((elapsedSec / maxWaitSec) * 55));
        onProgress(pct, `Instagram đang mã hóa video (${statusObj.statusCode})...`);
      }

      if (statusObj.isFinished) {
        return true;
      }
      if (statusObj.isError) {
        throw new Error(`Instagram mã hóa video thất bại. Trạng thái: ${statusObj.statusCode}`);
      }

      // Chờ 6 giây trước lần poll tiếp theo
      await new Promise((res) => setTimeout(res, 6000));
    }

    throw new Error(`Hết thời gian chờ (${maxWaitSec}s) xử lý video trên Instagram.`);
  }

  /**
   * 4. Đăng chính thức Media Container (Publish Reels)
   */
  async publishReelsContainer(containerId, options = {}) {
    const token = options.accessToken || this.accessToken;
    const accountId = options.igAccountId || this.igAccountId;

    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${accountId}/media_publish`;

    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: token
    });

    console.log(`[INSTAGRAM_API] Xuất bản bài đăng Instagram Reels [Container: ${containerId}]...`);
    const data = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: params
    });

    if (!data.id) {
      throw new Error(`Xuất bản bài đăng Reels thất bại: ${JSON.stringify(data)}`);
    }

    return {
      success: true,
      mediaId: data.id,
      timestamp: new Date().toISOString()
    };
  }
}

export const instagramApi = new InstagramApiManager();
export default instagramApi;
