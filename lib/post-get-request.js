/**
 * CreatorOS PRO_V40 - System-wide HTTP/HTTPS Network Request Engine (lib/post-get-request.js)
 * ==============================================================================
 * Universal Wrapper cho các phương thức GET, POST, PUT, DELETE, DOWNLOAD dùng chung toàn hệ thống.
 * Hỗ trợ tự động retry exponential backoff, timeout controller, cookie session persistence, 
 * và parse JSON/Form-Data an toàn.
 */

import fs from 'fs';
import path from 'path';

export const DEFAULT_USER_AGENT = 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export class HttpRequestEngine {
  constructor(options = {}) {
    this.defaultHeaders = options.headers || {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
    };
    this.timeoutMs = options.timeoutMs || 30000; // 30s default
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
    this.cookies = new Map(); // Global session cookie jar
  }

  /**
   * Set Session Cookie dạng chuỗi "name=value; name2=value2"
   */
  setCookies(cookieString) {
    if (!cookieString) return;
    const pairs = cookieString.split(';');
    for (const p of pairs) {
      const parts = p.trim().split('=');
      if (parts.length >= 2) {
        this.cookies.set(parts[0].trim(), parts.slice(1).join('=').trim());
      }
    }
  }

  /**
   * Lấy chuỗi Cookie header "key=val; key2=val2"
   */
  getCookieHeader() {
    const list = [];
    for (const [key, val] of this.cookies.entries()) {
      list.push(`${key}=${val}`);
    }
    return list.join('; ');
  }

  /**
   * Append query string vào URL
   */
  buildUrl(baseUrl, queryParams = {}) {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return baseUrl;
    }
    const urlObj = new URL(baseUrl);
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    }
    return urlObj.toString();
  }

  /**
   * Thực thi HTTP Request tổng quát với Abort Signal Timeout và Exponential Retry
   */
  async request(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const query = options.query || options.params || {};
    const fullUrl = this.buildUrl(url, query);

    const headers = { ...this.defaultHeaders, ...(options.headers || {}) };
    
    // Nạp Cookies nếu có
    const cookieStr = this.getCookieHeader();
    if (cookieStr && !headers['Cookie'] && !headers['cookie']) {
      headers['Cookie'] = cookieStr;
    }

    let body = options.body;
    if (options.json) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.json);
    } else if (options.formData && typeof options.formData === 'object' && !(options.formData instanceof FormData)) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      body = new URLSearchParams(options.formData).toString();
    }

    const retries = options.maxRetries !== undefined ? options.maxRetries : this.maxRetries;
    const timeout = options.timeoutMs || this.timeoutMs;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        if (attempt > 0) {
          const backoff = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
          console.warn(`[HTTP_RETRY] [${method}] ${fullUrl} - Thử lại lần ${attempt}/${retries} sau ${Math.round(backoff)}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
        }

        const response = await fetch(fullUrl, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : body,
          signal: controller.signal,
          redirect: options.redirect || 'follow'
        });

        clearTimeout(timeoutId);

        // Lưu Cookie mới nhận từ Set-Cookie header nếu có
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          this.setCookies(setCookie);
        }

        const contentType = response.headers.get('content-type') || '';
        let data;

        if (options.responseType === 'buffer' || options.responseType === 'arraybuffer') {
          const ab = await response.arrayBuffer();
          data = Buffer.from(ab);
        } else if (contentType.includes('application/json') || options.responseType === 'json') {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch (_) {
            data = text;
          }
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          const errorMsg = typeof data === 'object' ? JSON.stringify(data) : String(data).substring(0, 300);
          throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorMsg}`);
        }

        return {
          ok: true,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data
        };

      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        const isAbort = err.name === 'AbortError';
        if (isAbort) {
          lastError = new Error(`Request timeout (${timeout}ms) cho URL: ${fullUrl}`);
        }
      }
    }

    throw new Error(`[HTTP_REQUEST_ERROR] Thất bại sau ${retries + 1} lần thử. Detail: ${lastError.message}`);
  }

  /**
   * Phương thức GET tiện ích
   */
  async get(url, queryParams = {}, options = {}) {
    return await this.request(url, { ...options, method: 'GET', query: queryParams });
  }

  /**
   * Phương thức POST tiện ích (Hỗ trợ JSON hoặc Form Data)
   */
  async post(url, bodyData = {}, options = {}) {
    const isJson = options.isJson !== undefined ? options.isJson : true;
    const reqOpts = { ...options, method: 'POST' };

    if (isJson && typeof bodyData === 'object' && !(bodyData instanceof FormData)) {
      reqOpts.json = bodyData;
    } else if (typeof bodyData === 'object' && !(bodyData instanceof FormData)) {
      reqOpts.formData = bodyData;
    } else {
      reqOpts.body = bodyData;
    }

    return await this.request(url, reqOpts);
  }

  /**
   * Phương thức Download Tệp về đĩa cứng với Báo cáo tiến độ
   */
  async downloadFile(fileUrl, outputPath, options = {}) {
    console.log(`[HTTP_DOWNLOAD] Đang tải tệp từ ${fileUrl} -> ${outputPath}`);
    const tempPath = `${outputPath}.tmp_${Date.now()}`;

    const res = await fetch(fileUrl, {
      headers: { ...this.defaultHeaders, ...(options.headers || {}) }
    });

    if (!res.ok) {
      throw new Error(`Download HTTP Status ${res.status}: ${res.statusText}`);
    }

    const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
    let downloadedBytes = 0;

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileStream = fs.createWriteStream(tempPath);
    const reader = res.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      downloadedBytes += value.length;
      fileStream.write(Buffer.from(value));

      if (options.onProgress && totalBytes > 0) {
        const pct = Math.round((downloadedBytes / totalBytes) * 100);
        options.onProgress(pct, downloadedBytes, totalBytes);
      }
    }

    fileStream.end();
    await new Promise((resolve) => fileStream.on('finish', resolve));

    // Đổi tên từ temp sang chính thức
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    fs.renameSync(tempPath, outputPath);

    console.log(`[HTTP_DOWNLOAD] ✅ Đã tải thành công (${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB): ${outputPath}`);
    return {
      success: true,
      outputPath,
      bytesDownloaded: downloadedBytes
    };
  }
}

export const httpRequestEngine = new HttpRequestEngine();

// Convenience wrappers cho import trực tiếp
export const httpGet = (url, query, opts) => httpRequestEngine.get(url, query, opts);
export const httpPost = (url, body, opts) => httpRequestEngine.post(url, body, opts);
export const httpDownload = (url, outPath, opts) => httpRequestEngine.downloadFile(url, outPath, opts);

export default httpRequestEngine;
