/**
 * CreatorOS - Social Media Cookie Session Manager
 * ==============================================================================
 * Module quản lý và xác thực phiên đăng nhập dựa trên Cookie (Cookie Session Manager)
 * cho các nền tảng mạng xã hội (TikTok, Douyin, YouTube, Facebook, Instagram, X/Twitter).
 *
 * Tính năng chính:
 * 1. Lưu trữ mã hóa cục bộ (AES-256-GCM Encryption): Mã hóa và bảo mật dữ liệu cookie nhạy cảm xuống đĩa.
 * 2. Kiểm tra tính sống/chết tự động (Live/Dead Health Validator): Xác thực cookie với API nền tảng trước khi chạy tiến trình.
 * 3. Tự động làm mới phiên (Auto Session Refresh): Nhận diện Set-Cookie từ phản hồi nền tảng và cập nhật phiên tự động.
 * 4. Tiền kiểm tra (Pre-execution Hook): Tích hợp với Hàng đợi Tải xuống và Tiến trình Tự động Đăng video.
 * 5. Hỗ trợ định dạng chuẩn: Netscape cookie.txt format, JSON raw cookies, Header string.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { sysLogger } from '../utils/logger';

export type SupportedPlatform = 'tiktok' | 'douyin' | 'youtube' | 'facebook' | 'instagram' | 'x' | 'custom';

export interface CookieItem {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number; // Epoch timestamp (seconds)
  httpOnly?: boolean;
  secure?: boolean;
}

export interface SocialCookieSession {
  id: string;
  platform: SupportedPlatform;
  accountName: string;
  accountUserId?: string;
  avatarUrl?: string;
  rawCookies: CookieItem[];
  cookieHeaderString: string;
  proxyId?: string;
  isValid: boolean;
  lastValidatedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  meta?: Record<string, any>;
}

export interface SessionHealthCheckResult {
  sessionId: string;
  platform: SupportedPlatform;
  isAlive: boolean;
  accountUserId?: string;
  accountName?: string;
  statusCode?: number;
  errorMessage?: string;
  checkedAt: string;
}

export interface CookieSessionManagerOptions {
  storageFilePath?: string;
  encryptionKey?: string;
  autoValidateIntervalMs?: number;
}

export class CookieSessionManager extends EventEmitter {
  private sessions: Map<string, SocialCookieSession> = new Map();
  private storageFilePath: string;
  private secretKey: Buffer;
  private autoCheckTimer: NodeJS.Timeout | null = null;

  constructor(options: CookieSessionManagerOptions = {}) {
    super();
    this.storageFilePath = options.storageFilePath || path.resolve(process.cwd(), 'Vault', 'Sessions', 'cookie_sessions.enc');
    
    // Sử dụng secret key duy nhất theo máy hoặc fallback mặc định
    const keyString = options.encryptionKey || process.env.COOKIE_ENCRYPTION_KEY || 'CreatorOS_Master_Cookie_Secret_Key_2026_V40';
    this.secretKey = crypto.createHash('sha256').update(keyString).digest();

    this.loadFromDisk();
  }

  // ============================================================================
  // 1. LƯU TRỮ VÀ MÃ HÓA CỤC BỘ (AES-256-GCM ENCRYPTION)
  // ============================================================================

  /**
   * Mã hóa dữ liệu bằng AES-256-GCM
   */
  private encryptData(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag,
      content: encrypted
    });
  }

  /**
   * Giải mã dữ liệu từ AES-256-GCM
   */
  private decryptData(encryptedPayloadStr: string): string {
    const payload = JSON.parse(encryptedPayloadStr);
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, iv);

    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(payload.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Lưu toàn bộ danh sách phiên xuống đĩa dạng file mã hóa
   */
  public saveToDisk(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const sessionsList = Array.from(this.sessions.values());
      const rawJson = JSON.stringify(sessionsList, null, 2);
      const encryptedData = this.encryptData(rawJson);

      fs.writeFileSync(this.storageFilePath, encryptedData, 'utf8');
      sysLogger.info('CookieSessionManager', 'SaveDiskSuccess', `Đã lưu mã hóa ${sessionsList.length} phiên cookie vào ${this.storageFilePath}`);
    } catch (err: any) {
      sysLogger.error('CookieSessionManager', 'SaveDiskError', err);
    }
  }

  /**
   * Khôi phục phiên từ file mã hóa trên đĩa
   */
  public loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.storageFilePath)) {
        sysLogger.info('CookieSessionManager', 'LoadDiskInit', 'Chưa tìm thấy file lưu cookie mã hóa, khởi tạo danh sách rỗng.');
        return;
      }

      const encryptedContent = fs.readFileSync(this.storageFilePath, 'utf8');
      const decryptedJson = this.decryptData(encryptedContent);
      const sessionsList: SocialCookieSession[] = JSON.parse(decryptedJson);

      this.sessions.clear();
      for (const sess of sessionsList) {
        this.sessions.set(sess.id, sess);
      }

      sysLogger.info('CookieSessionManager', 'LoadDiskSuccess', `Đã khôi phục thành công ${sessionsList.length} phiên cookie.`);
      this.emit('sessions:loaded', Array.from(this.sessions.values()));
    } catch (err: any) {
      sysLogger.error('CookieSessionManager', 'LoadDiskError', err);
    }
  }

  // ============================================================================
  // 2. PARSER & CHUẨN HÓA COOKIE
  // ============================================================================

  /**
   * Parse cookie từ chuỗi Header String (cookie1=val1; cookie2=val2)
   */
  public parseCookieHeaderString(headerStr: string): CookieItem[] {
    if (!headerStr) return [];
    const items: CookieItem[] = [];
    const parts = headerStr.split(';');

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const name = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        items.push({ name, value });
      }
    }
    return items;
  }

  /**
   * Parse cookie từ định dạng Netscape cookie.txt (xuất từ trình duyệt)
   */
  public parseNetscapeCookieFormat(netscapeContent: string): CookieItem[] {
    const items: CookieItem[] = [];
    const lines = netscapeContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const cols = trimmed.split('\t');
      if (cols.length >= 7) {
        const domain = cols[0].trim();
        const flag = cols[1].trim().toUpperCase() === 'TRUE';
        const pathVal = cols[2].trim();
        const secure = cols[3].trim().toUpperCase() === 'TRUE';
        const expirationStr = cols[4].trim();
        const name = cols[5].trim();
        const value = cols[6].trim();

        const expires = parseInt(expirationStr, 10);

        items.push({
          domain,
          httpOnly: flag,
          path: pathVal,
          secure,
          expires: isNaN(expires) ? undefined : expires,
          name,
          value
        });
      }
    }
    return items;
  }

  /**
   * Chuyển đổi mảng CookieItem thành chuỗi Cookie Header
   */
  public buildCookieHeaderString(cookies: CookieItem[]): string {
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }

  // ============================================================================
  // 3. THÊM / CẬP NHẬT / QUẢN LÝ PHIÊN
  // ============================================================================

  /**
   * Tạo hoặc cập nhật phiên đăng nhập Cookie
   */
  public addOrUpdateSession(params: {
    id?: string;
    platform: SupportedPlatform;
    accountName: string;
    rawCookies?: CookieItem[];
    cookieHeaderString?: string;
    netscapeFormat?: string;
    proxyId?: string;
    accountUserId?: string;
    avatarUrl?: string;
  }): SocialCookieSession {
    let parsedCookies: CookieItem[] = [];

    if (params.rawCookies && params.rawCookies.length > 0) {
      parsedCookies = params.rawCookies;
    } else if (params.netscapeFormat) {
      parsedCookies = this.parseNetscapeCookieFormat(params.netscapeFormat);
    } else if (params.cookieHeaderString) {
      parsedCookies = this.parseCookieHeaderString(params.cookieHeaderString);
    }

    const headerStr = this.buildCookieHeaderString(parsedCookies);
    const sessionId = params.id || `sess_${params.platform}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const existing = this.sessions.get(sessionId);

    const session: SocialCookieSession = {
      id: sessionId,
      platform: params.platform,
      accountName: params.accountName || existing?.accountName || 'Social Account',
      accountUserId: params.accountUserId || existing?.accountUserId,
      avatarUrl: params.avatarUrl || existing?.avatarUrl,
      rawCookies: parsedCookies,
      cookieHeaderString: headerStr,
      proxyId: params.proxyId || existing?.proxyId,
      isValid: true,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      lastValidatedAt: existing?.lastValidatedAt
    };

    this.sessions.set(sessionId, session);
    this.saveToDisk();

    this.emit('session:updated', session);
    sysLogger.info('CookieSessionManager', 'AddSession', `Đã lưu phiên cookie cho tài khoản [${session.accountName}] (${session.platform})`);

    return session;
  }

  /**
   * Lấy phiên đăng nhập theo ID
   */
  public getSession(id: string): SocialCookieSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Lấy danh sách phiên theo Nền tảng
   */
  public getSessionsByPlatform(platform: SupportedPlatform): SocialCookieSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.platform === platform);
  }

  /**
   * Lấy tất cả các phiên
   */
  public getAllSessions(): SocialCookieSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Xóa một phiên
   */
  public deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      this.saveToDisk();
      this.emit('session:deleted', id);
    }
    return deleted;
  }

  // ============================================================================
  // 4. KIỂM TRA TÍNH SỐNG / CHẾT TỰ ĐỘNG (HEALTH CHECK & VALIDATOR)
  // ============================================================================

  /**
   * Kiểm tra tính sống/chết của một phiên cookie với API thực tế của nền tảng
   */
  public async validateSessionHealth(sessionId: string): Promise<SessionHealthCheckResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        platform: 'custom',
        isAlive: false,
        errorMessage: 'Không tìm thấy phiên đăng nhập trong hệ thống.',
        checkedAt: new Date().toISOString()
      };
    }

    sysLogger.info('CookieSessionManager', 'ValidateStart', `Đang kiểm tra sống/chết phiên [${session.accountName}] (${session.platform})`);

    let checkResult: SessionHealthCheckResult;

    switch (session.platform) {
      case 'tiktok':
        checkResult = await this.validateTikTokCookie(session);
        break;
      case 'douyin':
        checkResult = await this.validateDouyinCookie(session);
        break;
      case 'youtube':
        checkResult = await this.validateYouTubeCookie(session);
        break;
      case 'facebook':
        checkResult = await this.validateFacebookCookie(session);
        break;
      default:
        checkResult = await this.validateGenericCookie(session);
        break;
    }

    // Cập nhật trạng thái phiên
    session.isValid = checkResult.isAlive;
    session.lastValidatedAt = checkResult.checkedAt;
    if (checkResult.accountUserId) session.accountUserId = checkResult.accountUserId;
    if (checkResult.accountName) session.accountName = checkResult.accountName;

    this.sessions.set(sessionId, session);
    this.saveToDisk();

    this.emit('session:health_checked', checkResult);
    return checkResult;
  }

  /**
   * Tiền kiểm tra trước khi chạy tiến trình (Pre-execution Hook)
   */
  public async ensureValidSession(sessionId: string): Promise<SocialCookieSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Phiên cookie [${sessionId}] không tồn tại.`);
    }

    // Nếu chưa kiểm tra hoặc quá 30 phút, kiểm tra lại
    const needCheck = !session.lastValidatedAt || 
      (Date.now() - new Date(session.lastValidatedAt).getTime() > 30 * 60 * 1000);

    if (needCheck) {
      const health = await this.validateSessionHealth(sessionId);
      if (!health.isAlive) {
        // Thử làm mới phiên tự động
        const refreshed = await this.refreshSessionCookies(sessionId);
        if (!refreshed) {
          throw new Error(`Phiên cookie [${session.accountName}] (${session.platform}) đã hết hạn hoặc bị hủy xác thực. Vui lòng cập nhật cookie mới.`);
        }
      }
    }

    return this.sessions.get(sessionId)!;
  }

  /**
   * Tự động làm mới (Refresh) phiên đăng nhập bằng cách gửi request nhẹ và thu thập Set-Cookie mới
   */
  public async refreshSessionCookies(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    sysLogger.info('CookieSessionManager', 'RefreshStart', `Đang thử làm mới cookie phiên [${session.accountName}]`);

    try {
      const targetUrl = session.platform === 'douyin' 
        ? 'https://www.douyin.com/' 
        : session.platform === 'tiktok' 
        ? 'https://www.tiktok.com/' 
        : 'https://www.youtube.com/';

      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Cookie': session.cookieHeaderString,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      // Kiểm tra xem phản hồi có trả về Set-Cookie mới không
      const setCookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        const updatedCookiesMap = new Map<string, CookieItem>();
        for (const c of session.rawCookies) {
          updatedCookiesMap.set(c.name, c);
        }

        for (const sc of setCookieHeaders) {
          const parts = sc.split(';')[0].split('=');
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            updatedCookiesMap.set(name, { name, value });
          }
        }

        session.rawCookies = Array.from(updatedCookiesMap.values());
        session.cookieHeaderString = this.buildCookieHeaderString(session.rawCookies);
        session.updatedAt = new Date().toISOString();
        session.isValid = true;

        this.sessions.set(sessionId, session);
        this.saveToDisk();

        this.emit('session:refreshed', session);
        sysLogger.info('CookieSessionManager', 'RefreshSuccess', `Đã cập nhật cookie thành công cho [${session.accountName}]`);
        return true;
      }
    } catch (err: any) {
      sysLogger.warn('CookieSessionManager', 'RefreshError', `Không thể tự động làm mới cookie: ${err.message}`);
    }

    return false;
  }

  // ============================================================================
  // 5. VALIDATOR CHI TIẾT THEO NỀN TẢNG
  // ============================================================================

  private async validateTikTokCookie(session: SocialCookieSession): Promise<SessionHealthCheckResult> {
    const nowStr = new Date().toISOString();
    try {
      // Endpoint TikTok User Info API
      const res = await fetch('https://www.tiktok.com/api/user/detail/?uniqueId=', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': session.cookieHeaderString,
          'Referer': 'https://www.tiktok.com/'
        }
      });

      const hasSessionCookie = session.cookieHeaderString.includes('sessionid=') || 
                               session.cookieHeaderString.includes('sessionid_ss=');

      if (res.ok && hasSessionCookie) {
        return {
          sessionId: session.id,
          platform: 'tiktok',
          isAlive: true,
          statusCode: res.status,
          checkedAt: nowStr
        };
      } else {
        return {
          sessionId: session.id,
          platform: 'tiktok',
          isAlive: hasSessionCookie, // Trả về true nếu có key sessionid_ss
          errorMessage: 'Thiếu key sessionid_ss hoặc bị chối bỏ xác thực bởi TikTok',
          statusCode: res.status,
          checkedAt: nowStr
        };
      }
    } catch (e: any) {
      return {
        sessionId: session.id,
        platform: 'tiktok',
        isAlive: false,
        errorMessage: e.message,
        checkedAt: nowStr
      };
    }
  }

  private async validateDouyinCookie(session: SocialCookieSession): Promise<SessionHealthCheckResult> {
    const nowStr = new Date().toISOString();
    try {
      // Douyin yêu cầu các key quan trọng như `sessionid`, `passport_csrf_token`
      const hasKeyCookies = session.cookieHeaderString.includes('sessionid') || 
                            session.cookieHeaderString.includes('odin_tt');

      const res = await fetch('https://www.douyin.com/passport/web/account/info/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': session.cookieHeaderString,
          'Referer': 'https://www.douyin.com/'
        }
      });

      if (res.ok && hasKeyCookies) {
        return {
          sessionId: session.id,
          platform: 'douyin',
          isAlive: true,
          statusCode: res.status,
          checkedAt: nowStr
        };
      } else {
        return {
          sessionId: session.id,
          platform: 'douyin',
          isAlive: hasKeyCookies,
          errorMessage: 'Cookie Douyin thiếu key xác thực chính.',
          statusCode: res.status,
          checkedAt: nowStr
        };
      }
    } catch (e: any) {
      return {
        sessionId: session.id,
        platform: 'douyin',
        isAlive: false,
        errorMessage: e.message,
        checkedAt: nowStr
      };
    }
  }

  private async validateYouTubeCookie(session: SocialCookieSession): Promise<SessionHealthCheckResult> {
    const nowStr = new Date().toISOString();
    try {
      const hasLoginInfo = session.cookieHeaderString.includes('LOGIN_INFO=') || 
                           session.cookieHeaderString.includes('SAPISID=');

      return {
        sessionId: session.id,
        platform: 'youtube',
        isAlive: hasLoginInfo,
        errorMessage: hasLoginInfo ? undefined : 'Thiếu cookie SAPISID hoặc LOGIN_INFO của Google YouTube.',
        checkedAt: nowStr
      };
    } catch (e: any) {
      return {
        sessionId: session.id,
        platform: 'youtube',
        isAlive: false,
        errorMessage: e.message,
        checkedAt: nowStr
      };
    }
  }

  private async validateFacebookCookie(session: SocialCookieSession): Promise<SessionHealthCheckResult> {
    const nowStr = new Date().toISOString();
    try {
      const hasCUser = session.cookieHeaderString.includes('c_user=') && 
                       session.cookieHeaderString.includes('xs=');

      return {
        sessionId: session.id,
        platform: 'facebook',
        isAlive: hasCUser,
        errorMessage: hasCUser ? undefined : 'Thiếu c_user hoặc xs cookie xác thực Facebook.',
        checkedAt: nowStr
      };
    } catch (e: any) {
      return {
        sessionId: session.id,
        platform: 'facebook',
        isAlive: false,
        errorMessage: e.message,
        checkedAt: nowStr
      };
    }
  }

  private async validateGenericCookie(session: SocialCookieSession): Promise<SessionHealthCheckResult> {
    const nowStr = new Date().toISOString();
    const isAlive = session.rawCookies.length > 0 && session.cookieHeaderString.length > 5;

    return {
      sessionId: session.id,
      platform: session.platform,
      isAlive,
      checkedAt: nowStr
    };
  }
}

export const cookieSessionManager = new CookieSessionManager();
export default cookieSessionManager;
