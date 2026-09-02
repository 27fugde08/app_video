/**
 * CreatorOS PRO_V40 - Central Utilities & Helper Library (utils/index.js)
 * ==============================================================================
 * Điểm tập trung xuất khẩu (Central Export) chứa toàn bộ các hàm tiện ích hỗ trợ:
 * 1. Định dạng Thời gian & Chuỗi.
 * 2. Đọc / Ghi Tệp JSON & Quản lý Thư mục An toàn.
 * 3. Mã hóa, Băm (Hash) & Tạo ID Duy nhất.
 * 4. Chuẩn hóa Tên Tệp & Văn bản Tiếng Việt.
 * 5. Tích hợp Hằng số Actions và Hệ thống Mã Lỗi Toàn cục.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Export Hằng số Actions & Mã Lỗi
export {
  ACTIONS,
  JOB_ACTIONS,
  MEDIA_ACTIONS,
  CRAWLER_ACTIONS,
  PUBLISH_ACTIONS,
  SESSION_ACTIONS,
  AI_ACTIONS,
  SYSTEM_ACTIONS
} from './Action.js';

export {
  ERROR_CODES,
  getErrorMessage,
  createAppError
} from './error-code.js';

// ============================================================================
// 1. TIỆN ÍCH THỜI GIAN (TIME & DATE HELPERS)
// ============================================================================

/**
 * Tạm dừng tiến trình theo khoảng thời gian chỉ định (ms)
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Định dạng Date/Timestamp thành chuỗi dạng YYYY-MM-DD HH:mm:ss
 */
export function formatDate(dateVal = new Date(), formatPattern = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return formatPattern
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Chuyển số giây thành chuỗi thời lượng video (VD: 125s -> "02:05" hoặc 3665s -> "01:01:05")
 */
export function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const sec = Math.floor(totalSeconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Chuyển Timestamp thành thời gian tương đối (VD: "2 phút trước", "1 giờ trước")
 */
export function getRelativeTime(timestamp, lang = 'vi') {
  const now = Date.now();
  const diffSec = Math.floor((now - new Date(timestamp).getTime()) / 1000);

  if (diffSec < 60) return lang === 'vi' ? 'vừa xong' : 'just now';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return lang === 'vi' ? `${mins} phút trước` : `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return lang === 'vi' ? `${hours} giờ trước` : `${hours}h ago`;
  }
  const days = Math.floor(diffSec / 86400);
  return lang === 'vi' ? `${days} ngày trước` : `${days}d ago`;
}

// ============================================================================
// 2. TIỆN ÍCH ĐỌC/GHI FILE JSON & THƯ MỤC (FILE SYSTEM HELPERS)
// ============================================================================

/**
 * Tự động tạo thư mục nếu chưa tồn tại
 */
export function ensureDirExists(dirPath) {
  if (!dirPath) return false;
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (err) {
    console.error(`[UTIL_FILE_ERROR] Không thể tạo thư mục [${dirPath}]:`, err.message);
    return false;
  }
}

/**
 * Đọc file JSON an toàn, trả về defaultValue nếu gặp lỗi hoặc file không tồn tại
 */
export function readJsonFile(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.warn(`[UTIL_JSON_READ_WARN] Lỗi đọc JSON file [${filePath}]:`, err.message);
    return defaultValue;
  }
}

/**
 * Ghi dữ liệu ra file JSON an toàn (Tự động tạo thư mục cha nếu thiếu)
 */
export function writeJsonFile(filePath, data, pretty = true) {
  try {
    ensureDirExists(path.dirname(filePath));
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (err) {
    console.error(`[UTIL_JSON_WRITE_ERROR] Lỗi ghi JSON file [${filePath}]:`, err.message);
    return false;
  }
}

/**
 * Lấy kích thước tệp và định dạng dạng MB/KB
 */
export function getFileSizeFormatted(filePath) {
  try {
    if (!fs.existsSync(filePath)) return '0 B';
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } catch (_) {
    return '0 B';
  }
}

// ============================================================================
// 3. TIỆN ÍCH MÃ HÓA, HASH & TẠO ID (CRYPTO & IDENTIFIER HELPERS)
// ============================================================================

/**
 * Băm chuỗi MD5
 */
export function md5(text) {
  return crypto.createHash('md5').update(String(text)).digest('hex');
}

/**
 * Băm chuỗi SHA256
 */
export function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

/**
 * Tạo ID ngẫu nhiên có tiền tố (VD: job_1709320000_a1b2)
 */
export function generateId(prefix = 'id') {
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${Date.now()}_${rand}`;
}

/**
 * Tạo chuỗi ngẫu nhiên ký tự chữ và số
 */
export function randomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Mã hóa chuỗi văn bản bằng AES-256-CBC
 */
export function encryptText(plainText, secretKey) {
  if (!plainText) return '';
  const key = crypto.scryptSync(secretKey || 'CreatorOS_Secret_Key_v40', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Giải mã chuỗi văn bản AES-256-CBC
 */
export function decryptText(encryptedHex, secretKey) {
  if (!encryptedHex || !encryptedHex.includes(':')) return '';
  try {
    const [ivHex, encryptedText] = encryptedHex.split(':');
    const key = crypto.scryptSync(secretKey || 'CreatorOS_Secret_Key_v40', 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (_) {
    return '';
  }
}

// ============================================================================
// 4. CHUẨN HÓA & XỬ LÝ CHUỖI VĂN BẢN (STRING SANITIZATION HELPERS)
// ============================================================================

/**
 * Tối ưu tên file, xóa các ký tự cấm của hệ điều hành Windows/Linux
 */
export function sanitizeFileName(fileName) {
  if (!fileName) return `file_${Date.now()}`;
  return String(fileName)
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Chuyển chuỗi Tiếng Việt có dấu thành Slug không dấu (VD: "Tự động hóa CreatorOS" -> "tu-dong-hoa-creatoros")
 */
export function slugify(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Cắt ngắn văn bản dài kèm dấu ba chấm
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Loại bỏ thẻ HTML thừa ra khỏi chuỗi
 */
export function cleanHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>?/gm, '').trim();
}

// Export mặc định nhóm toàn bộ helper
export default {
  sleep,
  formatDate,
  formatDuration,
  getRelativeTime,
  ensureDirExists,
  readJsonFile,
  writeJsonFile,
  getFileSizeFormatted,
  md5,
  sha256,
  generateId,
  randomString,
  encryptText,
  decryptText,
  sanitizeFileName,
  slugify,
  truncateText,
  cleanHtml
};
