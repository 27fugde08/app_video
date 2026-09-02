/**
 * CreatorOS PRO_V40 - Facebook Resumable Chunked File Uploader (lib/uploadFileFb.js)
 * ==============================================================================
 * Module xử lý tải tệp video dung lượng lớn lên Facebook (Page / Reels / Group)
 * theo chuẩn Resumable Upload API (Start -> Transfer Chunks -> Finish).
 */

import fs from 'fs';
import path from 'path';

export class FacebookFileUploader {
  constructor(options = {}) {
    this.accessToken = options.accessToken || process.env.FB_ACCESS_TOKEN || '';
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB mỗi chunk
    this.maxRetries = options.maxRetries || 3;
    this.apiVersion = options.apiVersion || 'v19.0';
  }

  /**
   * Thực hiện fetch với cơ chế tự động thử lại (Auto-Retry Exponential Backoff)
   */
  async fetchWithRetry(url, fetchOptions, retryCount = 0) {
    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return await response.json();
    } catch (err) {
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
        console.warn(`[FB_UPLOAD_RETRY] Thử lại lần ${retryCount + 1}/${this.maxRetries} sau ${Math.round(delay)}ms. Lỗi: ${err.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, fetchOptions, retryCount + 1);
      }
      throw err;
    }
  }

  /**
   * 1. Bước START: Khởi tạo phiên upload tệp video lên Facebook Graph API
   */
  async startUploadSession(targetId, fileSize, isReels = false, tokenOverride = null) {
    const token = tokenOverride || this.accessToken;
    if (!token) throw new Error('Facebook Access Token không hợp lệ hoặc bị thiếu.');

    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${targetId}/videos`;
    
    const params = new URLSearchParams({
      upload_phase: 'start',
      file_size: fileSize.toString(),
      access_token: token
    });

    if (isReels) {
      params.append('media_type', 'REELS');
    }

    console.log(`[FB_UPLOAD] [1/3 START] Khởi tạo phiên upload (Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);
    const data = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: params
    });

    if (!data.upload_session_id || !data.video_id) {
      throw new Error(`Khởi tạo phiên upload FB thất bại: ${JSON.stringify(data)}`);
    }

    return {
      uploadSessionId: data.upload_session_id,
      videoId: data.video_id,
      startOffset: parseInt(data.start_offset || '0', 10),
      endOffset: parseInt(data.end_offset || '0', 10)
    };
  }

  /**
   * 2. Bước TRANSFER: Tải từng Chunk dữ liệu tệp video
   */
  async transferChunk(targetId, uploadSessionId, startOffset, chunkBuffer, tokenOverride = null) {
    const token = tokenOverride || this.accessToken;
    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${targetId}/videos`;

    const formData = new FormData();
    formData.append('upload_phase', 'transfer');
    formData.append('upload_session_id', uploadSessionId);
    formData.append('start_offset', startOffset.toString());
    formData.append('access_token', token);

    // Chuyển Buffer thành Blob/File
    const blob = new Blob([chunkBuffer], { type: 'video/mp4' });
    formData.append('video_file_chunk', blob, 'chunk.mp4');

    const data = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: formData
    });

    return {
      startOffset: parseInt(data.start_offset || '0', 10),
      endOffset: parseInt(data.end_offset || '0', 10)
    };
  }

  /**
   * 3. Bước FINISH: Hoàn tất phiên upload và thiết lập Metadata (Tiêu đề, mô tả)
   */
  async finishUploadSession(targetId, uploadSessionId, videoId, metadata = {}, tokenOverride = null) {
    const token = tokenOverride || this.accessToken;
    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${targetId}/videos`;

    const params = new URLSearchParams({
      upload_phase: 'finish',
      upload_session_id: uploadSessionId,
      access_token: token
    });

    if (metadata.title) params.append('title', metadata.title);
    if (metadata.description) params.append('description', metadata.description);
    if (metadata.isReels) params.append('video_state', 'PUBLISHED');

    console.log(`[FB_UPLOAD] [3/3 FINISH] Xử lý hoàn tất video ID: ${videoId}...`);
    const data = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: params
    });

    return {
      success: Boolean(data.success || data.id || videoId),
      videoId: data.id || videoId,
      raw: data
    };
  }

  /**
   * Quy trình Upload Resumable đầy đủ với Báo cáo Tiến độ Real-time
   */
  async uploadVideoFile(filePath, targetId, metadata = {}, onProgress = null) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File video không tồn tại tại đường dẫn: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const isReels = Boolean(metadata.isReels);

    // Step 1: Start
    const session = await this.startUploadSession(targetId, fileSize, isReels, metadata.accessToken);
    const { uploadSessionId, videoId } = session;

    // Step 2: Transfer Chunks
    let currentOffset = session.startOffset;
    const fileFd = fs.openSync(filePath, 'r');

    try {
      while (currentOffset < fileSize) {
        const bytesToRead = Math.min(this.chunkSize, fileSize - currentOffset);
        const buffer = Buffer.alloc(bytesToRead);
        fs.readSync(fileFd, buffer, 0, bytesToRead, currentOffset);

        console.log(`[FB_UPLOAD] [2/3 TRANSFER] Chunk: ${currentOffset} -> ${currentOffset + bytesToRead} / ${fileSize} bytes`);
        const result = await this.transferChunk(targetId, uploadSessionId, currentOffset, buffer, metadata.accessToken);

        currentOffset = result.endOffset > currentOffset ? result.endOffset : currentOffset + bytesToRead;

        const percent = Math.min(99, Math.round((currentOffset / fileSize) * 100));
        if (onProgress) {
          onProgress(percent, `Đã tải ${percent}% (${(currentOffset / (1024 * 1024)).toFixed(1)}MB / ${(fileSize / (1024 * 1024)).toFixed(1)}MB)`);
        }
      }
    } finally {
      fs.closeSync(fileFd);
    }

    // Step 3: Finish
    const finishRes = await this.finishUploadSession(targetId, uploadSessionId, videoId, metadata, metadata.accessToken);
    if (onProgress) {
      onProgress(100, 'Tải video lên Facebook thành công!');
    }

    return finishRes;
  }
}

export const facebookFileUploader = new FacebookFileUploader();
export default facebookFileUploader;
