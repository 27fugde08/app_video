/**
 * CreatorOS PRO_V40 - Zalo Creator & OA Session API Engine (lib/zalo.js)
 * ==============================================================================
 * Module quản lý phiên làm việc và API kết nối tới hệ thống Zalo Official Account (OA)
 * và Zalo Creator Studio (creator.zalo.me / open.zalo.me).
 */

import fs from 'fs';
import path from 'path';

export class ZaloApiManager {
  constructor(options = {}) {
    this.accessToken = options.accessToken || process.env.ZALO_ACCESS_TOKEN || '';
    this.cookieHeader = options.cookieHeader || process.env.ZALO_COOKIE || '';
    this.oaId = options.oaId || process.env.ZALO_OA_ID || '';
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
        console.warn(`[ZALO_RETRY] Lần ${retryCount + 1}/${this.maxRetries} sau ${Math.round(delay)}ms. Lỗi: ${err.message}`);
        await new Promise((res) => setTimeout(res, delay));
        return this.fetchWithRetry(url, fetchOptions, retryCount + 1);
      }
      throw err;
    }
  }

  /**
   * 1. Kiểm tra trạng thái phiên đăng nhập Zalo OA / Token
   */
  async checkSessionStatus() {
    if (!this.accessToken) {
      return { authenticated: false, reason: 'Chưa cấu hình ZALO_ACCESS_TOKEN' };
    }

    try {
      const endpoint = `https://openapi.zalo.me/v2.0/oa/getoa?access_token=${this.accessToken}`;
      const data = await this.fetchWithRetry(endpoint, { method: 'GET' });

      if (data.error === 0) {
        return { authenticated: true, oaInfo: data.data };
      }
      return { authenticated: false, reason: data.message || 'Token hết hạn' };
    } catch (err) {
      return { authenticated: false, reason: err.message };
    }
  }

  /**
   * 2. Upload Video Media lên Zalo Official Account qua Open API
   */
  async uploadMediaVideo(filePath, options = {}, onProgress = null) {
    const token = options.accessToken || this.accessToken;
    if (!token) throw new Error('Cần có Zalo Open API Access Token để upload media.');

    if (!fs.existsSync(filePath)) {
      throw new Error(`File video không tồn tại tại: ${filePath}`);
    }

    const endpoint = `https://openapi.zalo.me/v2.0/oa/upload/video?access_token=${token}`;
    const stats = fs.statSync(filePath);

    if (onProgress) onProgress(20, `Đang chuẩn bị file video Zalo (${(stats.size / (1024 * 1024)).toFixed(2)} MB)...`);

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'video/mp4' });

    const formData = new FormData();
    formData.append('file', blob, path.basename(filePath));

    if (onProgress) onProgress(50, 'Đang gửi dữ liệu video lên server Zalo...');

    const data = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: formData
    });

    if (data.error !== 0 || !data.data) {
      throw new Error(`Upload video Zalo thất bại: ${data.message || JSON.stringify(data)}`);
    }

    if (onProgress) onProgress(100, 'Tải video lên Zalo Open API thành công!');

    return {
      success: true,
      videoId: data.data.token || data.data.video_id,
      raw: data.data
    };
  }
}

export const zaloApi = new ZaloApiManager();
export default zaloApi;
