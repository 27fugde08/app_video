/**
 * CreatorOS PRO_V40 - Chrome Automation & Browser Control Engine (lib/chrome.js)
 * ==============================================================================
 * Quản lý khởi chạy Puppeteer/Playwright headless/headful, cấu hình profile ẩn danh,
 * tự động nạp proxy xoay vòng, và giả lập hành vi người dùng thật (human-like behavior).
 */

import fs from 'fs';
import path from 'path';

// Danh sách User-Agents phổ biến thực tế để ngẫu nhiên hóa
const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
];

export class ChromeAutomationManager {
  constructor(options = {}) {
    this.headless = options.headless !== undefined ? options.headless : true;
    this.userDataDir = options.userDataDir || path.join(process.cwd(), 'Vault', 'BrowserProfiles', 'default_profile');
    this.proxyServer = options.proxyServer || null;
    this.stealth = options.stealth !== undefined ? options.stealth : true;
    this.activeBrowsers = new Map();
    
    // Tự động tạo thư mục lưu Profile nếu chưa có
    try {
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }
    } catch (_) {}
  }

  /**
   * Khởi chạy trình duyệt Puppeteer hoặc Playwright an toàn
   */
  async launchBrowser(customConfig = {}) {
    const isHeadless = customConfig.headless !== undefined ? customConfig.headless : this.headless;
    const profileDir = customConfig.userDataDir || this.userDataDir;
    const proxy = customConfig.proxyServer || this.proxyServer;

    console.log(`[CHROME_LIB] Khởi chạy trình duyệt (Headless: ${isHeadless}, Profile: ${profileDir})`);

    // Thu thập tham số Chrome Flags chống phát hiện bot
    const chromeArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1280,800',
      '--start-maximized',
      `--user-data-dir=${profileDir}`
    ];

    if (proxy) {
      chromeArgs.push(`--proxy-server=${proxy}`);
      console.log(`[CHROME_LIB] Đã nạp Proxy xoay vòng: ${proxy}`);
    }

    // Thử nạp puppeteer-extra / puppeteer hoặc playwright động
    let puppeteer;
    try {
      const pExtra = await import('puppeteer-extra');
      const StealthPlugin = await import('puppeteer-extra-plugin-stealth');
      pExtra.default.use(StealthPlugin.default());
      puppeteer = pExtra.default;
      console.log('[CHROME_LIB] Đã nạp thành công Puppeteer Stealth Plugin.');
    } catch (_) {
      try {
        puppeteer = (await import('puppeteer')).default;
      } catch (_) {
        console.warn('[CHROME_LIB_WARN] Puppeteer/Playwright chưa được cài đặt. Khởi tạo Mock Browser Controller.');
        return this.createMockBrowserController();
      }
    }

    try {
      const browser = await puppeteer.launch({
        headless: isHeadless ? 'new' : false,
        args: chromeArgs,
        defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
        ignoreHTTPSErrors: true
      });

      const browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      this.activeBrowsers.set(browserId, browser);

      return {
        id: browserId,
        browser,
        createPage: () => this.createPage(browser),
        close: async () => {
          await browser.close();
          this.activeBrowsers.delete(browserId);
          console.log(`[CHROME_LIB] Đã đóng trình duyệt [${browserId}]`);
        }
      };
    } catch (err) {
      console.error('[CHROME_LIB_ERROR] Lỗi khởi chạy trình duyệt thực:', err.message);
      return this.createMockBrowserController();
    }
  }

  /**
   * Khởi tạo Page và tiêm các tập lệnh giả lập môi trường người dùng thật
   */
  async createPage(browserInstance) {
    let page;
    if (browserInstance.newPage) {
      page = await browserInstance.newPage();
    } else {
      page = browserInstance; // Fallback mock page
    }

    // Ngẫu nhiên hóa User-Agent
    const randomUA = DEFAULT_USER_AGENTS[Math.floor(Math.random() * DEFAULT_USER_AGENTS.length)];
    if (page.setUserAgent) {
      await page.setUserAgent(randomUA);
    }

    // Xóa cờ navigator.webdriver
    if (page.evaluateOnNewDocument) {
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        window.chrome = { runtime: {} };
      });
    }

    return page;
  }

  /**
   * Giả lập gõ phím như người thật (Human-like Typing)
   * Có độ trễ ngẫu nhiên giữa các ký tự và tạm dừng tự nhiên
   */
  async humanType(page, selector, text, options = {}) {
    const minDelay = options.minDelay || 35;
    const maxDelay = options.maxDelay || 120;

    console.log(`[HUMAN_BEHAVIOR] Gõ chữ tự nhiên vào [${selector}]: "${text.substring(0, 30)}..."`);

    if (!page || !page.type) {
      // Mock delay
      await this.humanDelay(text.length * 50);
      return;
    }

    try {
      await page.focus(selector);
      for (const char of text) {
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
        await page.type(selector, char, { delay });

        // Tự động tạm dừng ngẫu nhiên khi gặp dấu câu hoặc dấu cách
        if ([' ', '.', ',', '!', '?'].includes(char) && Math.random() < 0.3) {
          await this.humanDelay(150, 450);
        }
      }
    } catch (err) {
      console.warn(`[CHROME_LIB_WARN] Lỗi khi gõ chữ tự nhiên vào selector [${selector}]:`, err.message);
    }
  }

  /**
   * Giả lập di chuyển chuột mịn như người thật (Human-like Mouse Movement)
   */
  async humanMouseMove(page, targetX, targetY, steps = 15) {
    if (!page || !page.mouse) {
      await this.humanDelay(200);
      return;
    }

    try {
      const startX = Math.floor(Math.random() * 500) + 100;
      const startY = Math.floor(Math.random() * 400) + 100;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        // Đường cong Bezier giả lập tay người di chuột
        const currentX = startX + (targetX - startX) * progress + Math.sin(progress * Math.PI) * 15;
        const currentY = startY + (targetY - startY) * progress + Math.cos(progress * Math.PI) * 10;

        await page.mouse.move(currentX, currentY);
        await this.humanDelay(10, 30);
      }
    } catch (_) {}
  }

  /**
   * Giả lập cuộn trang tự nhiên (Human-like Scroll)
   */
  async humanScroll(page, distancePx = 800, passes = 4) {
    console.log(`[HUMAN_BEHAVIOR] Cuộn trang tự nhiên (${distancePx}px, ${passes} lượt)...`);
    if (!page || !page.evaluate) {
      await this.humanDelay(1000);
      return;
    }

    try {
      for (let i = 0; i < passes; i++) {
        const stepPx = Math.floor(distancePx / passes) + Math.floor(Math.random() * 40 - 20);
        await page.evaluate((scrollAmount) => {
          window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }, stepPx);

        // Chờ ngẫu nhiên giữa các lần cuộn
        await this.humanDelay(400, 1200);
      }
    } catch (err) {
      console.warn('[CHROME_LIB_WARN] Lỗi cuộn trang:', err.message);
    }
  }

  /**
   * Tạm dừng ngẫu nhiên giữa minMs và maxMs
   */
  async humanDelay(minMs = 800, maxMs = 2500) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Tạo Mock Browser Controller dự phòng nếu môi trường không có Puppeteer/Chromium
   */
  createMockBrowserController() {
    return {
      id: `mock_browser_${Date.now()}`,
      isMock: true,
      createPage: async () => ({
        goto: async (url) => console.log(`[MOCK_BROWSER] Điều hướng tới URL: ${url}`),
        setUserAgent: async () => {},
        type: async (sel, text) => console.log(`[MOCK_BROWSER] Gõ chữ [${sel}]: ${text}`),
        click: async (sel) => console.log(`[MOCK_BROWSER] Click element: ${sel}`),
        evaluate: async (fn) => null,
        close: async () => console.log('[MOCK_BROWSER] Đóng trang Mock.')
      }),
      close: async () => console.log('[MOCK_BROWSER] Đóng Mock Browser.')
    };
  }
}

export const chromeAutomation = new ChromeAutomationManager();
export default chromeAutomation;
