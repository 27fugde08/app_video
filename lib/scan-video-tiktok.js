#!/usr/bin/env node
/**
 * CreatorOS PRO_V40 - TikTok No-Watermark Video Scanner & Metadata Extractor (lib/scan-video-tiktok.js)
 * ==============================================================================
 * Module chuyên trích xuất link video TikTok chất lượng cao không logo (No-Watermark 1080p/2K)
 * và bóc tách toàn bộ metadata (Tiêu đề, tác giả, chỉ số tương tác, nhạc nền, ảnh bìa).
 */

import fs from 'fs';
import path from 'path';

export class TikTokVideoScanner {
  constructor(options = {}) {
    this.userAgent = options.userAgent || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    this.cookieHeader = options.cookieHeader || process.env.TIKTOK_COOKIE || '';
  }

  /**
   * Trích xuất URL TikTok từ văn bản hoặc chuỗi chia sẻ bất kỳ
   */
  extractTikTokUrl(inputText) {
    if (!inputText) return null;
    const urlRegex = /(https?:\/\/(?:vt|vm|www|m)\.tiktok\.com\/[^\s]+)/gi;
    const match = inputText.match(urlRegex);
    if (match && match[0]) {
      // Làm sạch ký tự lạ ở cuối
      return match[0].split('?')[0].replace(/[;,.]*$/, '');
    }
    return null;
  }

  /**
   * Trích xuất Video ID từ URL chuẩn (/video/7123456789012345678)
   */
  extractVideoId(url) {
    if (!url) return null;
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Giải mã link ngắn (vt.tiktok.com / vm.tiktok.com) thành link gốc
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
   * Quét và trích xuất dữ liệu video TikTok không watermark
   */
  async scanVideo(inputUrlOrText) {
    const rawUrl = this.extractTikTokUrl(inputUrlOrText) || inputUrlOrText;
    if (!rawUrl || !rawUrl.includes('tiktok.com')) {
      throw new Error('Đường dẫn TikTok không hợp lệ.');
    }

    console.log(`[TIKTOK_SCANNER] Bắt đầu quét video TikTok: ${rawUrl}`);

    // Giải mã short URL nếu cần
    let fullUrl = rawUrl;
    if (rawUrl.includes('vt.tiktok.com') || rawUrl.includes('vm.tiktok.com')) {
      fullUrl = await this.resolveShortUrl(rawUrl);
      console.log(`[TIKTOK_SCANNER] Đã giải mã short URL -> ${fullUrl}`);
    }

    const videoId = this.extractVideoId(fullUrl);

    // Phương pháp 1: Gọi API dự phòng TikWM (Rất ổn định cho No-Watermark 1080p)
    try {
      const tikwmData = await this.scanViaTikWM(fullUrl);
      if (tikwmData && tikwmData.success) {
        return tikwmData;
      }
    } catch (e) {
      console.warn('[TIKTOK_SCANNER_WARN] Phương pháp TikWM thất bại, chuyển sang Web API:', e.message);
    }

    // Phương pháp 2: Gọi trực tiếp Web Detail API của TikTok
    if (videoId) {
      try {
        const webApiData = await this.scanViaTikTokWebApi(videoId);
        if (webApiData && webApiData.success) {
          return webApiData;
        }
      } catch (e) {
        console.warn('[TIKTOK_SCANNER_WARN] Phương pháp Web Detail API thất bại:', e.message);
      }
    }

    // Phương pháp 3: Bóc tách HTML Page (__UNIVERSAL_DATA_FOR_REHYDRATION__)
    try {
      return await this.scanViaHtmlScraping(fullUrl);
    } catch (e) {
      throw new Error(`Không thể trích xuất dữ liệu video TikTok không watermark: ${e.message}`);
    }
  }

  /**
   * Phương pháp 1: TikWM Public API Engine
   */
  async scanViaTikWM(videoUrl) {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`;
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`TikWM API HTTP error status: ${res.status}`);
    const json = await res.json();

    if (json.code !== 0 || !json.data) {
      throw new Error(json.msg || 'Không lấy được dữ liệu từ TikWM API.');
    }

    const data = json.data;
    const noWmUrl = data.hdplay ? `https://www.tikwm.com${data.hdplay}` : (data.play ? `https://www.tikwm.com${data.play}` : '');

    return {
      success: true,
      platform: 'tiktok',
      videoId: data.id || this.extractVideoId(videoUrl) || `tt_${Date.now()}`,
      title: data.title || 'Video TikTok',
      author: {
        nickname: data.author ? data.author.nickname : 'TikTok Creator',
        username: data.author ? data.author.unique_id : 'user',
        avatar: data.author ? data.author.avatar : ''
      },
      stats: {
        likes: data.digg_count || 0,
        comments: data.comment_count || 0,
        shares: data.share_count || 0,
        views: data.play_count || 0
      },
      media: {
        noWatermarkUrl: noWmUrl || (data.play ? `https://www.tikwm.com${data.play}` : ''),
        watermarkUrl: data.wmplay ? `https://www.tikwm.com${data.wmplay}` : '',
        coverUrl: data.cover ? `https://www.tikwm.com${data.cover}` : '',
        dynamicCoverUrl: data.dynamic_cover ? `https://www.tikwm.com${data.dynamic_cover}` : '',
        musicUrl: data.music ? `https://www.tikwm.com${data.music}` : '',
        quality: data.hdplay ? '1080p HD (No Watermark)' : '720p HD (No Watermark)',
        durationSec: data.duration || 0
      },
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Phương pháp 2: TikTok Official Web Detail API
   */
  async scanViaTikTokWebApi(videoId) {
    const apiUrl = `https://www.tiktok.com/api/item/detail/?itemId=${videoId}`;
    const headers = {
      'User-Agent': this.userAgent,
      'Referer': 'https://www.tiktok.com/',
      'Accept': 'application/json'
    };
    if (this.cookieHeader) headers['Cookie'] = this.cookieHeader;

    const res = await fetch(apiUrl, { headers });
    if (!res.ok) throw new Error(`TikTok Web API HTTP error: ${res.status}`);

    const json = await res.json();
    const item = json.itemInfo ? json.itemInfo.itemStruct : null;
    if (!item) throw new Error('Không tìm thấy itemStruct trong dữ liệu TikTok Web API.');

    const video = item.video || {};
    const author = item.author || {};
    const stats = item.stats || {};

    // Tạo link không watermark từ playAddr
    const playAddr = video.playAddr || (video.downloadAddr ? video.downloadAddr : '');

    return {
      success: true,
      platform: 'tiktok',
      videoId: item.id || videoId,
      title: item.desc || 'Video TikTok',
      author: {
        nickname: author.nickname || 'TikTok User',
        username: author.uniqueId || 'user',
        avatar: author.avatarLarger || author.avatarThumb || ''
      },
      stats: {
        likes: stats.diggCount || 0,
        comments: stats.commentCount || 0,
        shares: stats.shareCount || 0,
        views: stats.playCount || 0
      },
      media: {
        noWatermarkUrl: playAddr,
        watermarkUrl: video.downloadAddr || playAddr,
        coverUrl: video.cover || video.originCover || '',
        dynamicCoverUrl: video.dynamicCover || '',
        musicUrl: item.music ? item.music.playUrl : '',
        quality: '1080p HD No-Watermark',
        durationSec: video.duration || 0
      },
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Phương pháp 3: Direct HTML Scraping
   */
  async scanViaHtmlScraping(videoUrl) {
    const res = await fetch(videoUrl, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const html = await res.text();
    const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);

    if (!match || !match[1]) {
      throw new Error('Không thể phân tích dữ liệu HTML Rehydration của TikTok.');
    }

    const jsonData = JSON.parse(match[1]);
    const defaultData = jsonData.__DEFAULT_SCOPE__ || {};
    const itemDetail = defaultData['webapp.video-detail'] || {};
    const item = itemDetail.itemInfo ? itemDetail.itemInfo.itemStruct : null;

    if (!item) throw new Error('Không tìm thấy thông tin video trong HTML Data.');

    return {
      success: true,
      platform: 'tiktok',
      videoId: item.id,
      title: item.desc || 'TikTok Video',
      author: {
        nickname: item.author.nickname,
        username: item.author.uniqueId,
        avatar: item.author.avatarLarger
      },
      stats: {
        likes: item.stats.diggCount || 0,
        comments: item.stats.commentCount || 0,
        shares: item.stats.shareCount || 0,
        views: item.stats.playCount || 0
      },
      media: {
        noWatermarkUrl: item.video.playAddr,
        watermarkUrl: item.video.downloadAddr || item.video.playAddr,
        coverUrl: item.video.cover,
        quality: 'HD No-Watermark',
        durationSec: item.video.duration || 0
      },
      extractedAt: new Date().toISOString()
    };
  }
}

export const tikTokScanner = new TikTokVideoScanner();

// ============================================================================
// HỖ TRỢ CHẠY CLI
// ============================================================================
if (process.argv[1] && (process.argv[1].endsWith('scan-video-tiktok.js') || process.argv[1].includes('scan-video-tiktok'))) {
  const args = process.argv.slice(2);
  let targetUrl = null;

  for (const arg of args) {
    if (arg.startsWith('--url=')) {
      targetUrl = arg.substring(arg.indexOf('=') + 1);
    }
  }

  if (targetUrl) {
    tikTokScanner.scanVideo(targetUrl)
      .then((res) => {
        console.log('[TIKTOK_SUCCESS] Trích xuất thành công:');
        console.log(JSON.stringify(res, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error('[TIKTOK_ERROR] Thất bại:', err.message);
        process.exit(1);
      });
  }
}

export default tikTokScanner;
