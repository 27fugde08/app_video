/**
 * CreatorOS - Batch Downloader Pro: Smart Proxy & Cookie Dynamic Policy Engine
 * ==============================================================================
 * Technical Features:
 * 1. Conditional Policy Evaluation:
 *    - Direct high-speed download if queue size <= threshold (default 5) AND platform is not strict (Douyin/TikTok).
 *    - Automatic Proxy & Cookie activation if queue size > 5 OR platform is strict/anti-bot heavy.
 * 2. Dynamic yt-dlp Options Builder:
 *    - Generates dynamic yt-dlp arguments (proxy, cookies file/string, headers, retry flags).
 * 3. Auto-Fallback on Ban (HTTP 403 Forbidden / 429 Too Many Requests):
 *    - Automatically catches platform rate-limit/ban errors, assigns rotated proxy & cookie session, and retries seamlessly.
 */

import { ProxyNode, defaultProxyPool, accountSessionManager, SocialPlatform } from '../../../services/ProxyAccountManager';

export interface DynamicProxyCookiePolicy {
  shouldUseProxy: boolean;
  shouldUseCookie: boolean;
  assignedProxy?: ProxyNode;
  cookieFilePath?: string;
  cookieHeader?: string;
  reason: string;
}

export interface YtDlpOptions {
  proxy?: string;
  cookiefile?: string;
  http_headers?: Record<string, string>;
  user_agent?: string;
  format?: string;
  outtmpl?: string;
  nocheckcertificate?: boolean;
  quiet?: boolean;
  no_warnings?: boolean;
  retries?: number;
  socket_timeout?: number;
  [key: string]: any;
}

export interface SmartDownloadOptions {
  queueLength: number;
  platform: string;
  url: string;
  saveDirectory?: string;
  customThreshold?: number;
  forceProxyCookie?: boolean;
  accountId?: string;
}

export class SmartProxyCookiePolicyService {
  private safeQueueThreshold: number;
  private strictPlatforms: Set<string>;

  constructor(safeQueueThreshold: number = 5) {
    this.safeQueueThreshold = safeQueueThreshold;
    // Platforms that strictly enforce anti-bot / rate-limits and require cookies/proxy
    this.strictPlatforms = new Set(['douyin', 'tiktok', 'instagram']);
  }

  /**
   * 1. Conditional Policy Evaluation
   * Evaluates if Proxy and Cookie should be used based on queue depth & platform restrictions
   */
  public evaluateDownloadPolicy(
    queueLength: number,
    platform: string,
    accountId?: string,
    forceProxyCookie: boolean = false
  ): DynamicProxyCookiePolicy {
    const normPlatform = platform.toLowerCase().trim();
    const isStrictPlatform = this.strictPlatforms.has(normPlatform);
    const exceedsThreshold = queueLength > this.safeQueueThreshold;

    if (forceProxyCookie || exceedsThreshold || isStrictPlatform) {
      let reason = '';
      if (forceProxyCookie) {
        reason = 'Cấu hình bắt buộc sử dụng Proxy & Cookie (Force Flag)';
      } else if (isStrictPlatform) {
        reason = `Nền tảng khắt khe (${normPlatform.toUpperCase()}) - Bắt buộc dùng Proxy & Cookie phòng ngừa Ban IP`;
      } else {
        reason = `Tải số lượng lớn (${queueLength} video > ngưỡng an toàn ${this.safeQueueThreshold}) - Kích hoạt Proxy & Cookie`;
      }

      // Fetch healthy rotated proxy node
      const proxy = defaultProxyPool.getNextHealthyProxy() || undefined;

      // Fetch isolated account session cookies if account ID is provided
      let cookieHeader: string | undefined = undefined;
      if (accountId) {
        const session = accountSessionManager.getSession(accountId);
        if (session && Object.keys(session.cookies).length > 0) {
          cookieHeader = Object.entries(session.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
        }
      }

      return {
        shouldUseProxy: true,
        shouldUseCookie: true,
        assignedProxy: proxy,
        cookieFilePath: `./cookies/${normPlatform}_cookie.txt`,
        cookieHeader,
        reason
      };
    }

    // Default fast direct download
    return {
      shouldUseProxy: false,
      shouldUseCookie: false,
      reason: `Tải trực tiếp tốc độ cao (Tổng link ${queueLength} <= ${this.safeQueueThreshold}, nền tảng không khắt khe)`
    };
  }

  /**
   * 2. Tích hợp yt-dlp Options
   * Builds dynamic configuration parameters object for yt-dlp
   */
  public buildYtDlpOptions(
    policy: DynamicProxyCookiePolicy,
    saveDirectory: string = './downloads',
    customFilenameTemplate?: string
  ): YtDlpOptions {
    const options: YtDlpOptions = {
      outtmpl: `${saveDirectory}/${customFilenameTemplate || '%(title)s [%(id)s].%(ext)s'}`,
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      nocheckcertificate: true,
      no_warnings: true,
      retries: 3,
      socket_timeout: 15,
      http_headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8'
      }
    };

    // Attach Proxy if policy dictates
    if (policy.shouldUseProxy && policy.assignedProxy) {
      const p = policy.assignedProxy;
      const auth = p.username && p.password ? `${encodeURIComponent(p.username)}:${encodeURIComponent(p.password)}@` : '';
      options.proxy = `${p.protocol}://${auth}${p.host}:${p.port}`;
    }

    // Attach Cookie File / Header if policy dictates
    if (policy.shouldUseCookie) {
      if (policy.cookieFilePath) {
        options.cookiefile = policy.cookieFilePath;
      }
      if (policy.cookieHeader && options.http_headers) {
        options.http_headers['Cookie'] = policy.cookieHeader;
      }
    }

    return options;
  }

  /**
   * Builds command-line flags array for yt-dlp child_process execution
   */
  public buildYtDlpCliArgs(options: YtDlpOptions): string[] {
    const args: string[] = [];

    if (options.outtmpl) args.push('-o', options.outtmpl);
    if (options.format) args.push('-f', options.format);
    if (options.proxy) args.push('--proxy', options.proxy);
    if (options.cookiefile) args.push('--cookies', options.cookiefile);
    if (options.nocheckcertificate) args.push('--no-check-certificates');
    if (options.socket_timeout) args.push('--socket-timeout', String(options.socket_timeout));
    if (options.retries) args.push('--retries', String(options.retries));

    if (options.http_headers) {
      for (const [key, value] of Object.entries(options.http_headers)) {
        args.push('--add-header', `${key}:${value}`);
      }
    }

    return args;
  }

  /**
   * 3. Auto-Fallback on Ban (403 Forbidden / 429 Too Many Requests)
   * Executes a download task with dynamic fallback to Proxy + Cookie if direct attempt gets blocked
   */
  public async executeWithSmartFallback<T>(
    params: SmartDownloadOptions,
    downloadExecutor: (ytDlpOpts: YtDlpOptions, isFallback: boolean) => Promise<T>,
    onLog?: (msg: string) => void
  ): Promise<T> {
    // Initial policy evaluation
    let policy = this.evaluateDownloadPolicy(
      params.queueLength,
      params.platform,
      params.accountId,
      params.forceProxyCookie
    );

    onLog?.(`[Policy Decision] ${policy.reason}`);
    let ytDlpOpts = this.buildYtDlpOptions(policy, params.saveDirectory);

    try {
      // First attempt with calculated policy
      return await downloadExecutor(ytDlpOpts, false);
    } catch (err: any) {
      const errorMsg = String(err?.message || err || '');
      const isRateLimitOrBan =
        errorMsg.includes('403') ||
        errorMsg.includes('429') ||
        errorMsg.toLowerCase().includes('forbidden') ||
        errorMsg.toLowerCase().includes('too many requests') ||
        errorMsg.toLowerCase().includes('ip ban') ||
        errorMsg.toLowerCase().includes('captcha');

      // If direct attempt failed due to 403 / 429, perform Auto-Fallback to Proxy + Cookie
      if (isRateLimitOrBan && !policy.shouldUseProxy) {
        onLog?.(`⚠️ [Auto-Fallback Triggered] Phát hiện lỗi Ban IP / 403 / 429 khi tải trực tiếp!`);
        onLog?.(`🔄 [Auto-Fallback] Đang kích hoạt Proxy xoay vòng & Nạp Cookie để thử lại...`);

        // Force policy to use Proxy + Cookie
        policy = this.evaluateDownloadPolicy(
          params.queueLength,
          params.platform,
          params.accountId,
          true // Force proxy + cookie
        );

        ytDlpOpts = this.buildYtDlpOptions(policy, params.saveDirectory);

        if (policy.assignedProxy) {
          onLog?.(`🛡️ [Fallback Proxy] Gán Proxy thành công: ${policy.assignedProxy.host}:${policy.assignedProxy.port}`);
        }

        // Retry with Proxy & Cookie attached
        return await downloadExecutor(ytDlpOpts, true);
      }

      // Re-throw if error is unhandled or already using proxy
      throw err;
    }
  }
}

export const defaultSmartProxyCookiePolicyService = new SmartProxyCookiePolicyService(5);
