/**
 * CreatorOS PRO_V40 - Facebook Specialized HTTP & GraphQL API Engine (lib/fb-request.js)
 * ==============================================================================
 * Xây dựng các hàm gọi API chuyên biệt cho Facebook (Graph API v19.0 & Internal GraphQL/AJAX).
 * Quản lý tự động Session, Cookie, Headers chuẩn Facebook web/mobile, và chữ ký Security Proof.
 */

import { httpRequestEngine } from './post-get-request.js';
import { fbInitDataExtractor, calculateJazoest } from './get-facebook-init-data.js';

export class FacebookRequestClient {
  constructor(options = {}) {
    this.http = httpRequestEngine;
    this.cookieHeader = options.cookieHeader || process.env.FB_COOKIE || '';
    this.accessToken = options.accessToken || process.env.FB_ACCESS_TOKEN || '';
    this.apiVersion = options.apiVersion || 'v19.0';
    this.initData = null; // Stored fb_dtsg, jazoest, etc.
  }

  /**
   * Đảm bảo đã có dữ liệu khởi tạo (fb_dtsg, jazoest, c_user)
   */
  async ensureInitData(cookieOverride = null) {
    const cookie = cookieOverride || this.cookieHeader;
    if (!cookie) {
      throw new Error('[FB_REQUEST] Không có Facebook Cookie để khởi tạo phiên.');
    }

    if (!this.initData || cookieOverride) {
      console.log('[FB_REQUEST] Nạp và trích xuất dữ liệu khởi tạo Facebook (fb_dtsg)...');
      this.initData = await fbInitDataExtractor.fetchInitDataFromCookie(cookie);
    }
    return this.initData;
  }

  /**
   * Lấy Header chuẩn cho các request giả lập trình duyệt Facebook
   */
  getFacebookBrowserHeaders(cookieOverride = null) {
    const cookie = cookieOverride || this.cookieHeader;
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cookie': cookie,
      'Origin': 'https://www.facebook.com',
      'Referer': 'https://www.facebook.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-FB-Friendly-Name': 'ComposerPublishMutation'
    };
  }

  /**
   * 1. Gửi request tới Facebook Graph API chính thức (GET / POST)
   */
  async graphApiRequest(endpointPath, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const token = options.accessToken || this.accessToken;

    if (!token) {
      throw new Error('[FB_REQUEST] Chưa cấu hình FB_ACCESS_TOKEN cho Graph API.');
    }

    const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    const url = `https://graph.facebook.com/${this.apiVersion}${cleanPath}`;

    const query = {
      access_token: token,
      ...(options.query || {})
    };

    console.log(`[FB_REQUEST] [GRAPH_API] [${method}] ${url}`);

    if (method === 'GET') {
      const res = await this.http.get(url, query, options);
      return res.data;
    } else {
      const body = {
        access_token: token,
        ...(options.body || {})
      };
      const res = await this.http.post(url, body, { ...options, isJson: false });
      return res.data;
    }
  }

  /**
   * 2. Gửi request ngầm GraphQL / AJAX nội bộ của Facebook (Dùng fb_dtsg & Cookie)
   */
  async internalFormRequest(endpointUrl, formPayload = {}, options = {}) {
    const cookie = options.cookie || this.cookieHeader;
    const initData = await this.ensureInitData(cookie);

    const fullPayload = {
      fb_dtsg: initData.fb_dtsg,
      jazoest: initData.jazoest || calculateJazoest(initData.fb_dtsg),
      __user: initData.userId,
      __a: '1',
      __req: '1',
      __rev: initData.rev || '1012000000',
      __spin_r: initData.spin_r || '1012000000',
      __spin_b: initData.spin_b || 'trunk',
      __spin_t: initData.spin_t || Math.floor(Date.now() / 1000).toString(),
      ...formPayload
    };

    if (initData.lsd) {
      fullPayload.lsd = initData.lsd;
    }

    const headers = this.getFacebookBrowserHeaders(cookie);

    console.log(`[FB_REQUEST] [INTERNAL_AJAX] Gửi payload tới: ${endpointUrl}`);
    const res = await this.http.post(endpointUrl, fullPayload, {
      headers,
      isJson: false // URL Encoded form data
    });

    let rawData = res.data;
    // Xóa tiền tố bảo mật Facebook `for (;;);` nếu có
    if (typeof rawData === 'string') {
      if (rawData.startsWith('for (;;);')) {
        rawData = rawData.substring('for (;;);'.length);
      }
      try {
        return JSON.parse(rawData);
      } catch (_) {
        return rawData;
      }
    }

    return rawData;
  }

  /**
   * 3. Gửi GraphQL Query / Mutation nội bộ qua endpoint `/api/graphql/`
   */
  async internalGraphQLQuery(docId, variables = {}, options = {}) {
    const endpoint = 'https://www.facebook.com/api/graphql/';
    const payload = {
      doc_id: docId,
      variables: JSON.stringify(variables)
    };

    return await this.internalFormRequest(endpoint, payload, options);
  }
}

export const fbRequestClient = new FacebookRequestClient();

export default fbRequestClient;
