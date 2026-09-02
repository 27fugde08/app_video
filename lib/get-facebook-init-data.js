/**
 * CreatorOS PRO_V40 - Facebook Session Initialization Data Extractor (lib/get-facebook-init-data.js)
 * ==============================================================================
 * Module chuyên trích xuất dữ liệu khởi tạo phiên Facebook (fb_dtsg, jazoest, c_user, lsd, spin_r, rev).
 * Phục vụ cho các request API ngầm, GraphQL internal, và tự động hóa trình duyệt.
 */

import { httpRequestEngine } from './post-get-request.js';

/**
 * Tính toán tham số `jazoest` từ `fb_dtsg` token
 * (Quy tắc hash Facebook: 2 + sum(ascii_code of each char))
 */
export function calculateJazoest(fbDtsg) {
  if (!fbDtsg) return '2295';
  let sum = 0;
  for (let i = 0; i < fbDtsg.length; i++) {
    sum += fbDtsg.charCodeAt(i);
  }
  return `2${sum}`;
}

/**
 * Trích xuất User ID (c_user) từ chuỗi Cookie
 */
export function extractUserIdFromCookie(cookieStr) {
  if (!cookieStr) return null;
  const match = cookieStr.match(/c_user=(\d+)/);
  return match ? match[1] : null;
}

export class FacebookInitDataExtractor {
  constructor(options = {}) {
    this.http = httpRequestEngine;
  }

  /**
   * Trích xuất các biến khởi tạo (fb_dtsg, c_user, lsd, jazoest, rev) từ nội dung HTML trang Facebook
   */
  extractDataFromHtml(html, cookieHeader = '') {
    if (!html || typeof html !== 'string') {
      return { success: false, reason: 'HTML content rỗng.' };
    }

    // 1. Tìm fb_dtsg bằng các regex phổ biến trong JS bundle Facebook
    let fbDtsg = null;
    const dtsgMatches = [
      html.match(/"DTSGInitialData"[^>]*:[^}]*"token":"([^"]+)"/),
      html.match(/"token":"([^"]+)"[^}]*"DTSGInitialData"/),
      html.match(/name="fb_dtsg" value="([^"]+)"/),
      html.match(/"DTSGInitData",\s*\[\s*\],\s*{\s*"token"\s*:\s*"([^"]+)"/),
      html.match(/["']async_get_token["']\s*:\s*["']([^"']+)["']/)
    ];

    for (const m of dtsgMatches) {
      if (m && m[1]) {
        fbDtsg = m[1];
        break;
      }
    }

    // 2. Tìm LSD Token
    let lsd = null;
    const lsdMatches = [
      html.match(/"LSD"[^>]*:[^}]*"token":"([^"]+)"/),
      html.match(/name="lsd" value="([^"]+)"/),
      html.match(/"token":"([^"]+)"[^}]*"LSD"/)
    ];
    for (const m of lsdMatches) {
      if (m && m[1]) {
        lsd = m[1];
        break;
      }
    }

    // 3. Tìm User ID (c_user / ACTOR_ID)
    let userId = extractUserIdFromCookie(cookieHeader);
    if (!userId) {
      const userMatches = [
        html.match(/"USER_ID":"(\d+)"/),
        html.match(/"actorID":"(\d+)"/),
        html.match(/"ACCOUNT_ID":"(\d+)"/),
        html.match(/"c_user":\s*"(\d+)"/)
      ];
      for (const m of userMatches) {
        if (m && m[1] && m[1] !== '0') {
          userId = m[1];
          break;
        }
      }
    }

    // 4. Tìm các tham số Client Revision (rev, spin_r, spin_b, spin_t)
    let rev = '1012000000';
    const revMatch = html.match(/"client_revision":(\d+)/) || html.match(/"rev":(\d+)/);
    if (revMatch && revMatch[1]) rev = revMatch[1];

    let spinR = rev;
    const spinRMatch = html.match(/"__spin_r":(\d+)/);
    if (spinRMatch && spinRMatch[1]) spinR = spinRMatch[1];

    let spinB = 'trunk';
    const spinBMatch = html.match(/"__spin_b":"([^"]+)"/);
    if (spinBMatch && spinBMatch[1]) spinB = spinBMatch[1];

    let spinT = Math.floor(Date.now() / 1000).toString();
    const spinTMatch = html.match(/"__spin_t":(\d+)/);
    if (spinTMatch && spinTMatch[1]) spinT = spinTMatch[1];

    const jazoest = calculateJazoest(fbDtsg);

    return {
      success: Boolean(fbDtsg || userId),
      fb_dtsg: fbDtsg || '',
      jazoest,
      userId: userId || '',
      lsd: lsd || '',
      spin_r: spinR,
      spin_b: spinB,
      spin_t: spinT,
      rev,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Tự động gửi Request lấy HTML trang Facebook và bóc tách dữ liệu khởi tạo theo Session Cookie
   */
  async fetchInitDataFromCookie(cookieHeader) {
    if (!cookieHeader) {
      throw new Error('Chưa cung cấp Facebook Session Cookie.');
    }

    console.log('[FB_INIT_DATA] Đang tải trang HTML Facebook để trích xuất fb_dtsg & Init Data...');

    const res = await this.http.get('https://www.facebook.com/', {}, {
      headers: {
        'Cookie': cookieHeader,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const parsed = this.extractDataFromHtml(res.data, cookieHeader);

    if (!parsed.fb_dtsg && !parsed.userId) {
      console.warn('[FB_INIT_DATA_WARN] Không tìm thấy fb_dtsg trong trang chủ www.facebook.com, thử tải trang business.facebook.com...');
      const bizRes = await this.http.get('https://business.facebook.com/latest/home', {}, {
        headers: { 'Cookie': cookieHeader }
      });
      return this.extractDataFromHtml(bizRes.data, cookieHeader);
    }

    return parsed;
  }

  /**
   * Trích xuất Init Data trực tiếp từ môi trường Trình duyệt Puppeteer/Playwright Page
   */
  async extractFromPuppeteerPage(page) {
    if (!page || !page.evaluate) {
      throw new Error('Page object không hợp lệ.');
    }

    console.log('[FB_INIT_DATA] Trích xuất Init Data trực tiếp từ Browser Window Context...');

    const pageData = await page.evaluate(() => {
      let fb_dtsg = '';
      let userId = '';

      if (window.DTSGInitialData && window.DTSGInitialData.token) {
        fb_dtsg = window.DTSGInitialData.token;
      } else if (document.querySelector('input[name="fb_dtsg"]')) {
        fb_dtsg = document.querySelector('input[name="fb_dtsg"]').value;
      }

      if (window.Env && window.Env.user) {
        userId = String(window.Env.user);
      }

      const lsd = window.LSD ? window.LSD.token : '';

      return {
        fb_dtsg,
        userId,
        lsd,
        cookie: document.cookie || ''
      };
    });

    const jazoest = calculateJazoest(pageData.fb_dtsg);

    return {
      success: Boolean(pageData.fb_dtsg || pageData.userId),
      fb_dtsg: pageData.fb_dtsg,
      jazoest,
      userId: pageData.userId || extractUserIdFromCookie(pageData.cookie) || '',
      lsd: pageData.lsd,
      cookie: pageData.cookie,
      extractedAt: new Date().toISOString()
    };
  }
}

export const fbInitDataExtractor = new FacebookInitDataExtractor();
export default fbInitDataExtractor;
