/**
 * CreatorOS Desktop - Windows Local System Logger Service
 * 
 * Provides crash-safe local file logging for Windows Desktop environment:
 * - Writes structured logs to `./logs/daemon.log` and `./logs/errors.log`
 * - Handles client disconnections without process crashing
 * - Traps unhandled rejections and exceptions gracefully
 */

import fs from 'node:fs';
import path from 'node:path';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const DAEMON_LOG_FILE = path.join(LOGS_DIR, 'daemon.log');
const ERROR_LOG_FILE = path.join(LOGS_DIR, 'errors.log');

export class LocalLoggerService {
  constructor() {
    this._ensureLogsDirectory();
    this._setupProcessCrashProtection();
  }

  _ensureLogsDirectory() {
    try {
      if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('[Logger] Failed to create logs directory:', err.message);
    }
  }

  _formatLogMessage(level, context, message, meta = null) {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Payload: ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaString}\n`;
  }

  _appendToFile(filePath, content) {
    try {
      this._ensureLogsDirectory();
      fs.appendFileSync(filePath, content, 'utf8');
    } catch (err) {
      console.error(`[Logger] Failed writing to log file ${filePath}:`, err.message);
    }
  }

  /**
   * Log informational message
   * @param {string} context 
   * @param {string} message 
   * @param {object} [meta] 
   */
  info(context, message, meta = null) {
    const logLine = this._formatLogMessage('INFO', context, message, meta);
    process.stdout.write(`\x1b[36m${logLine}\x1b[0m`);
    this._appendToFile(DAEMON_LOG_FILE, logLine);
  }

  /**
   * Log warning message
   * @param {string} context 
   * @param {string} message 
   * @param {object} [meta] 
   */
  warn(context, message, meta = null) {
    const logLine = this._formatLogMessage('WARN', context, message, meta);
    process.stdout.write(`\x1b[33m${logLine}\x1b[0m`);
    this._appendToFile(DAEMON_LOG_FILE, logLine);
  }

  /**
   * Log error message and write to both daemon.log and errors.log
   * @param {string} context 
   * @param {string} message 
   * @param {Error|object} [errorObj] 
   */
  error(context, message, errorObj = null) {
    const meta = errorObj instanceof Error 
      ? { message: errorObj.message, stack: errorObj.stack }
      : errorObj;

    const logLine = this._formatLogMessage('ERROR', context, message, meta);
    process.stderr.write(`\x1b[31m${logLine}\x1b[0m`);
    this._appendToFile(DAEMON_LOG_FILE, logLine);
    this._appendToFile(ERROR_LOG_FILE, logLine);
  }

  /**
   * Log client disconnection or IPC channel disruption
   * @param {string} clientId 
   * @param {string} reason 
   */
  clientDisconnect(clientId, reason = 'Remote client closed socket unexpectedly') {
    this.warn('IPC_BRIDGE', `UI Renderer disconnected [${clientId}]: ${reason}`, {
      reconnectionAllowed: true,
      timestamp: Date.now()
    });
  }

  /**
   * Global protection against sudden daemon crashes on unhandled errors
   * @private
   */
  _setupProcessCrashProtection() {
    process.on('uncaughtException', (err) => {
      this.error('FATAL_UNCAUGHT_EXCEPTION', `Đã chặn lỗi crash tiến trình: ${err.message}`, err);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.error('UNHANDLED_PROMISE_REJECTION', `Đã chặn lỗi promise chưa xử lý: ${reason}`, { reason });
    });
  }

  /**
   * Retrieve recent log lines for UI inspection
   * @param {number} [linesCount=100] 
   * @returns {Array<string>}
   */
  getRecentLogs(linesCount = 100) {
    try {
      if (!fs.existsSync(DAEMON_LOG_FILE)) return [];
      const content = fs.readFileSync(DAEMON_LOG_FILE, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      return lines.slice(-linesCount);
    } catch {
      return [];
    }
  }
}

export const logger = new LocalLoggerService();
export default logger;
