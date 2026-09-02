#!/usr/bin/env node
/**
 * CreatorOS PRO_V40 - Douyin No-Watermark Video Scanner & Metadata Extractor (lib/scan-video-douyin.js)
 * ==============================================================================
 * Module chuyên quét trích xuất link video Douyin (TikTok Trung Quốc) chất lượng cao 1080p/2K
 * không có logo (No-Watermark) và bóc tách đầy đủ metadata (Tiêu đề, tác giả, chỉ số tương tác, ảnh bìa HD).
 */

import fs from 'fs';
import path from 'path';

export class DouyinVideoScanner {
  constructor(options = {}) {
    this.userAgent = options.userAgent || 
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
    this.cookieHeader = options.cookieHeader || process.env.DOUYIN_COOKIE || '';
  }

  /**
   * Trích xuất URL Douyin từ văn bản chia sẻ
   * Ví dụ: "7.88 04/23 lvh:/ 复制打开抖音，看看【Douyin Creator】的作品... https://v.douyin.com/iLxxx/"
   */
  extractDouyinUrl(inputText) {
    if (!inputText) return null;
    const urlRegex = /(https?:\/\/(?:v|www|m)\.douyin\.com\/[^\s]+)/gi;
    const match = inputText.match(urlRegex);
    if (match && match[0]) {
      return match[0].split('?')[0].replace(/[;,.]*$/, '');
    }
    return null;
  }

  /**
   * Trích xuất Aweme ID (Video ID) từ Douyin URL (/video/7123456789012345678)
   */
  extractAwemeId(url) {
    if (!url) return null;
    const match = url.match(/\/video\/(\d+)/) || url.match(/modal_id=(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Giải mã link chia sẻ ngắn (`v.douyin.com/xxx/`) thành URL gốc
   */
  async resolveShortUrl(shortUrl) {
    try {
      const res = await fetch(shortUrl, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      return res.url;
    } catch (_) {
      return shortUrl;
    }
  }

  /**
   * Quét và trích xuất dữ liệu video Douyin không logo
   */
  async scanVideo(inputUrlOrText) {
    const rawUrl = this.extractDouyinUrl(inputUrlOrText) || inputUrlOrText;
    if (!rawUrl || !rawUrl.includes('douyin.com')) {
      throw new Error('Đường dẫn chia sẻ Douyin không hợp lệ.');
    }

    console.log(`[DOUYIN_SCANNER] Bắt đầu quét video Douyin: ${rawUrl}`);

    // 1. Giải mã link ngắn
    let fullUrl = rawUrl;
    if (rawUrl.includes('v.douyin.com')) {
      fullUrl = await this.resolveShortUrl(rawUrl);
      console.log(`[DOUYIN_SCANNER] Đã giải mã short URL Douyin -> ${fullUrl}`);
    }

    const awemeId = this.extractAwemeId(fullUrl);

    // Phương pháp 1: IesDouyin Public API Engine (Hỗ trợ tốt không watermark)
    if (awemeId) {
      try {
        const iesData = await this.scanViaIesDouyinApi(awemeId);
        if (iesData && iesData.success) {
          return iesData;
        }
      } catch (e) {
        console.warn('[DOUYIN_SCANNER_WARN] Phương pháp IesDouyin API thất bại:', e.message);
      }
    }

    // Phương pháp 2: Douyin Web Detail API với Cookie Handshake
    if (awemeId) {
      try {
        const webData = await this.scanViaDouyinWebDetailApi(awemeId);
        if (webData && webData.success) {
          return webData;
        }
      } catch (e) {
        console.warn('[DOUYIN_SCANNER_WARN] Phương pháp Douyin Web Detail API thất bại:', e.message);
      }
    }

    // Phương pháp 3: Third-party Parser API
    try {
      return await this.scanViaThirdPartyApi(fullUrl);
    } catch (e) {
      throw new Error(`Không thể trích xuất dữ liệu video Douyin không logo: ${e.message}`);
    }
  }

  /**
   * Phương pháp 1: IesDouyin Aweme ItemInfo API Engine
   */
  async scanViaIesDouyinApi(awemeId) {
    const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${awemeId}`;
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`IesDouyin API HTTP Error: ${res.status}`);
    const json = await res.json();

    const item = json.item_list && json.item_list[0] ? json.item_list[0] : null;
    if (!item) throw new Error('Không tìm thấy thông tin item_list trong IesDouyin API.');

    const video = item.video || {};
    const author = item.author || {};
    const statistics = item.statistics || {};

    // Mẹo biến đổi URL playwm thành play để lấy video KHÔNG LOGO
    let rawPlayUrl = video.play_addr && video.play_addr.url_list ? video.play_addr.url_list[0] : '';
    let noWatermarkUrl = rawPlayUrl.replace('/playwm/', '/play/');

    // Tự động đảm bảo HTTPS
    if (noWatermarkUrl.startsWith('http://')) {
      noWatermarkUrl = noWatermarkUrl.replace('http://', 'https://');
    }

    const coverUrl = video.cover && video.cover.url_list ? video.cover.url_list[0] : '';

    return {
      success: true,
      platform: 'douyin',
      awemeId: item.aweme_id || awemeId,
      title: item.desc || 'Video Douyin',
      author: {
        nickname: author.nickname || 'Douyin Creator',
        username: author.unique_id || author.short_id || 'douyin_user',
        avatar: author.avatar_thumb ? author.avatar_thumb.url_list[0] : ''
      },
      stats: {
        likes: statistics.digg_count || 0,
        comments: statistics.comment_count || 0,
        shares: statistics.share_count || 0,
        views: statistics.play_count || 0
      },
      media: {
        noWatermarkUrl,
        watermarkUrl: rawPlayUrl,
        coverUrl,
        dynamicCoverUrl: video.dynamic_cover ? video.dynamic_cover.url_list[0] : coverUrl,
        musicUrl: item.music && item.music.play_url ? item.music.play_url.url_list[0] : '',
        quality: '1080p Full HD No-Watermark',
        durationSec: Math.round((video.duration || 0) / 1000)
      },
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Phương pháp 2: Douyin Web Detail API
   */
  async scanViaDouyinWebDetailApi(awemeId) {
    const apiUrl = `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${awemeId}&device_platform=webapp&aid=6383`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.douyin.com/',
      'Accept': 'application/json'
    };
    if (this.cookieHeader) headers['Cookie'] = this.cookieHeader;

    const res = await fetch(apiUrl, { headers });
    if (!res.ok) throw new Error(`Douyin Web Detail API HTTP error: ${res.status}`);

    const json = await res.json();
    const detail = json.aweme_detail;
    if (!detail) throw new Error('Không tìm thấy aweme_detail trong phản hồi Douyin Web API.');

    const video = detail.video || {};
    const author = detail.author || {};
    const stats = detail.statistics || {};

    let noWmUrl = video.play_addr && video.play_addr.url_list ? video.play_addr.url_list[0] : '';
    if (noWmUrl.includes('/playwm/')) {
      noWmUrl = noWmUrl.replace('/playwm/', '/play/');
    }

    return {
      success: true,
      platform: 'douyin',
      awemeId: detail.aweme_id || awemeId,
      title: detail.desc || 'Video Douyin',
      author: {
        nickname: author.nickname,
        username: author.unique_id || author.short_id,
        avatar: author.avatar_thumb ? author.avatar_thumb.url_list[0] : ''
      },
      stats: {
        likes: stats.digg_count || 0,
        comments: stats.comment_count || 0,
        shares: stats.share_count || 0,
        views: stats.play_count || 0
      },
      media: {
        noWatermarkUrl: noWmUrl,
        watermarkUrl: video.play_addr ? video.play_addr.url_list[0] : '',
        coverUrl: video.cover ? video.cover.url_list[0] : '',
        musicUrl: detail.music ? detail.music.play_url.url_list[0] : '',
        quality: '2K/1080p Ultra HD No-Watermark',
        durationSec: Math.round((video.duration || 0) / 1000)
      },
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Phương pháp 3: Public Douyin Parser Engine
   */
  async scanViaThirdPartyApi(douyinUrl) {
    const apiUrl = `https://api.tikwm.com/api/?url=${encodeURIComponent(douyinUrl)}`;
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': this.userAgent }
    });

    if (!res.ok) throw new Error(`ThirdParty Douyin Parser HTTP error: ${res.status}`);
    const json = await res.json();

    if (json.code !== 0 || !json.data) {
      throw new Error(json.msg || 'Không thể bóc tách video Douyin qua Parser.');
    }

    const data = json.data;
    return {
      success: true,
      platform: 'douyin',
      awemeId: data.id || `dy_${Date.now()}`,
      title: data.title || 'Video Douyin HD',
      author: {
        nickname: data.author ? data.author.nickname : 'Douyin Creator',
        username: data.author ? data.author.unique_id : 'douyin_user',
        avatar: data.author ? data.author.avatar : ''
      },
      stats: {
        likes: data.digg_count || 0,
        comments: data.comment_count || 0,
        shares: data.share_count || 0,
        views: data.play_count || 0
      },
      media: {
        noWatermarkUrl: data.hdplay ? `https://api.tikwm.com${data.hdplay}` : (data.play ? `https://api.tikwm.com${data.play}` : ''),
        watermarkUrl: data.wmplay ? `https://api.tikwm.com${data.wmplay}` : '',
        coverUrl: data.cover ? `https://api.tikwm.com${data.cover}` : '',
        musicUrl: data.music ? `https://api.tikwm.com${data.music}` : '',
        quality: '1080p HD No-Watermark',
        durationSec: data.duration || 0
      },
      extractedAt: new Date().toISOString()
    };
  }
}

export const douyinScanner = new DouyinVideoScanner();

// ============================================================================
// HỖ TRỢ CHẠY CLI
// ============================================================================
if (process.argv[1] && (process.argv[1].endsWith('scan-video-douyin.js') || process.argv[1].includes('scan-video-douyin'))) {
  const args = process.argv.slice(2);
  let targetUrl = null;

  for (const arg of args) {
    if (arg.startsWith('--url=')) {
      targetUrl = arg.substring(arg.indexOf('=') + 1);
    }
  }

  if (targetUrl) {
    douyinScanner.scanVideo(targetUrl)
      .then((res) => {
        console.log('[DOUYIN_SUCCESS] Trích xuất thành công:');
        console.log(JSON.stringify(res, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error('[DOUYIN_ERROR] Thất bại:', err.message);
        process.exit(1);
      });
  }
}

export default douyinScanner;
