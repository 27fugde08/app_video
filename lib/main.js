/**
 * CreatorOS PRO_V40 - Central Infrastructure Controller & Core Orchestrator (lib/main.js)
 * ==============================================================================
 * File điều phối trung tâm của thư mục `lib/`, khởi tạo các dịch vụ nền tảng (Chrome, AI),
 * quản lý biến môi trường toàn cục, và kết nối toàn bộ các hàm tiện ích con cho CreatorOS.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

// 1. Tự động nạp cấu hình biến môi trường .env
dotenv.config();

// 2. Import các module tiện ích con trong /lib
import { chromeAutomation, ChromeAutomationManager } from './chrome.js';
import { aiService } from './ai.js';

// Khởi tạo các thư mục lưu trữ Vault cố định
const ROOT_DIR = process.cwd();
const VAULT_DIR = process.env.VAULT_DIR || path.join(ROOT_DIR, 'Vault');
const VAULT_STATE_DIR = path.join(VAULT_DIR, 'State');
const VAULT_SESSIONS_DIR = path.join(VAULT_DIR, 'Sessions');
const VAULT_OUTPUTS_DIR = path.join(VAULT_DIR, 'Outputs');
const VAULT_DOWNLOADS_DIR = path.join(VAULT_DIR, 'Downloads');

// Đảm bảo cấu trúc thư mục Vault luôn sẵn sàng
[VAULT_DIR, VAULT_STATE_DIR, VAULT_SESSIONS_DIR, VAULT_OUTPUTS_DIR, VAULT_DOWNLOADS_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn(`[LIB_MAIN_WARN] Không thể khởi tạo thư mục Vault [${dir}]:`, err.message);
  }
});

/**
 * Lớp điều phối trung tâm Infrastructure Orchestrator
 */
export class CreatorOSLibController {
  constructor() {
    this.chrome = chromeAutomation;
    this.ai = aiService;
    this.rootDir = ROOT_DIR;
    this.vaultDir = VAULT_DIR;
    this.startTime = new Date().toISOString();
  }

  /**
   * Đọc đường dẫn tương đối trong thư mục Vault
   */
  getVaultPath(...subPaths) {
    return path.join(VAULT_DIR, ...subPaths);
  }

  /**
   * Ghi dữ liệu JSON an toàn xuống Vault State
   */
  writeStateFile(filename, data) {
    try {
      const filePath = path.join(VAULT_STATE_DIR, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[LIB_MAIN_ERROR] Lỗi ghi file state [${filename}]:`, err.message);
      return false;
    }
  }

  /**
   * Đọc dữ liệu JSON an toàn từ Vault State
   */
  readStateFile(filename, defaultValue = null) {
    try {
      const filePath = path.join(VAULT_STATE_DIR, filename);
      if (!fs.existsSync(filePath)) return defaultValue;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (err) {
      console.warn(`[LIB_MAIN_WARN] Lỗi đọc file state [${filename}]:`, err.message);
      return defaultValue;
    }
  }

  /**
   * Lấy thông tin hệ thống và tài nguyên phần cứng (RAM, CPU, Uptime)
   */
  getSystemInfo() {
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;

    return {
      appName: 'CreatorOS Desktop PRO_V40',
      nodeVersion: process.version,
      platform: process.platform,
      arch: os.arch(),
      cpuCores: os.cpus().length,
      memory: {
        totalMb: (totalMemBytes / (1024 * 1024)).toFixed(2),
        freeMb: (freeMemBytes / (1024 * 1024)).toFixed(2),
        usedMb: (usedMemBytes / (1024 * 1024)).toFixed(2),
        percentUsed: Math.round((usedMemBytes / totalMemBytes) * 100)
      },
      uptimeSec: Math.round(process.uptime()),
      startTime: this.startTime
    };
  }

  /**
   * Kiểm tra sức khỏe toàn bộ hạ tầng cốt lõi (Infrastructure Health Check)
   */
  async getInfrastructureHealth() {
    const sysInfo = this.getSystemInfo();
    const isAiReady = this.ai.isConfigured();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      modules: {
        chromeAutomation: {
          status: 'ready',
          activeBrowsersCount: this.chrome.activeBrowsers.size,
          userDataDir: this.chrome.userDataDir
        },
        aiEngine: {
          status: isAiReady ? 'online' : 'fallback_mode',
          provider: 'Google Gemini 3.7 Flash',
          hasApiKey: isAiReady
        },
        vaultStorage: {
          status: fs.existsSync(VAULT_DIR) ? 'online' : 'degraded',
          vaultDir: VAULT_DIR
        }
      },
      system: sysInfo
    };
  }
}

// Xuất bản instance điều phối chính
export const creatorOSController = new CreatorOSLibController();

// Xuất lẻ các tiện ích cốt lõi cho các module khác import trực tiếp
export {
  chromeAutomation,
  ChromeAutomationManager,
  aiService,
  VAULT_DIR,
  VAULT_STATE_DIR,
  VAULT_SESSIONS_DIR,
  VAULT_OUTPUTS_DIR,
  VAULT_DOWNLOADS_DIR
};

export default creatorOSController;
