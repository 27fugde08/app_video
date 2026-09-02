/**
 * CreatorOS - Backend Node.js Binary Manager Service
 * ==============================================================================
 * Quản lý và thực thi các công cụ nhị phân tự chứa (ffmpeg.exe, ffprobe.exe, yt-dlp.exe)
 * cho Express Daemon API và các Python Subprocesses.
 */

import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import logger from './logger.service.js';

export class BinaryManagerService {
  constructor() {
    this.platform = process.platform;
    this.isPackaged =
      process.env.NODE_ENV === 'production' ||
      Boolean(process.resourcesPath && !process.defaultApp);
    this.binaryCache = new Map();
  }

  /**
   * Lấy định dạng tên file tương ứng với OS (Windows .exe)
   * @param {string} binaryName 
   * @returns {string}
   */
  getExecutableFileName(binaryName) {
    const isWindows = this.platform === 'win32';
    const hasExtension = binaryName.endsWith('.exe');
    if (isWindows && !hasExtension) {
      return `${binaryName}.exe`;
    }
    return binaryName;
  }

  /**
   * Tự động nhận diện đường dẫn thư mục lưu trữ các binary
   * @returns {string}
   */
  getBinaryDirectory() {
    const platformFolder = this.platform === 'win32' ? 'windows' : this.platform === 'darwin' ? 'mac' : 'linux';

    if (this.isPackaged) {
      const resourcesPath = process.resourcesPath || process.cwd();
      const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked', 'backend', 'bin', platformFolder);
      if (fs.existsSync(unpackedPath)) return unpackedPath;

      const rootResourcesBin = path.join(resourcesPath, 'bin', platformFolder);
      if (fs.existsSync(rootResourcesBin)) return rootResourcesBin;

      return path.join(resourcesPath, 'app.asar.unpacked', 'bin');
    } else {
      const cwd = process.cwd();
      const devBackendBin = path.join(cwd, 'backend', 'bin', platformFolder);
      if (fs.existsSync(devBackendBin)) return devBackendBin;

      const devBin = path.join(cwd, 'bin', platformFolder);
      if (fs.existsSync(devBin)) return devBin;

      return path.join(cwd, 'backend', 'bin');
    }
  }

  /**
   * Trả về đường dẫn tuyệt đối chính xác của công cụ nhị phân
   * @param {string} binaryName 
   * @returns {string}
   */
  getBinaryPath(binaryName) {
    const fileName = this.getExecutableFileName(binaryName);
    if (this.binaryCache.has(fileName)) {
      return this.binaryCache.get(fileName);
    }
    const baseDir = this.getBinaryDirectory();
    const fullPath = path.join(baseDir, fileName);
    this.binaryCache.set(fileName, fullPath);
    return fullPath;
  }

  /**
   * Kiểm tra tệp thực thi có tồn tại hay không
   * @param {string} binaryName 
   * @returns {boolean}
   */
  exists(binaryName) {
    return fs.existsSync(this.getBinaryPath(binaryName));
  }

  /**
   * Health Check: Kiểm tra tình trạng sẵn sàng của các binary
   * @param {Array<string>} [requiredBinaries=['ffmpeg', 'ffprobe', 'yt-dlp']] 
   * @returns {object}
   */
  verifyBinaries(requiredBinaries = ['ffmpeg', 'ffprobe', 'yt-dlp']) {
    const baseDir = this.getBinaryDirectory();
    const report = {
      isHealthy: true,
      binaries: {},
      basePath: baseDir,
      isPackaged: this.isPackaged,
      platform: this.platform
    };

    for (const name of requiredBinaries) {
      const fullPath = this.getBinaryPath(name);
      const isExist = fs.existsSync(fullPath);

      report.binaries[name] = {
        name,
        path: fullPath,
        exists: isExist
      };

      if (!isExist) {
        report.isHealthy = false;
        logger.warn('BINARY_MANAGER', `Thiếu công cụ nhị phân: ${name} tại ${fullPath}`);
      }
    }

    if (report.isHealthy) {
      logger.info('BINARY_MANAGER', `Tất cả binary (${requiredBinaries.join(', ')}) đã sẵn sàng tại: ${baseDir}`);
    }

    return report;
  }

  /**
   * Thực thi lệnh child process an toàn với kiểm tra ENOENT
   * @param {string} binaryName 
   * @param {Array<string>} [args=[]] 
   * @param {object} [options={}] 
   * @returns {Promise<{success: boolean, exitCode: number, stdout: string, stderr: string, error?: Error}>}
   */
  async execute(binaryName, args = [], options = {}) {
    const binaryPath = this.getBinaryPath(binaryName);

    if (!fs.existsSync(binaryPath)) {
      const errMsg = `[Binary Error] Không tìm thấy binary ${binaryName} tại ${binaryPath}`;
      logger.error('BINARY_EXECUTE', errMsg);
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: errMsg,
        error: new Error(errMsg)
      };
    }

    return new Promise((resolve) => {
      let stdoutData = '';
      let stderrData = '';
      let isDone = false;

      const child = spawn(binaryPath, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        windowsHide: true
      });

      let timer = null;
      if (options.timeoutMs > 0) {
        timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            child.kill('SIGKILL');
            resolve({
              success: false,
              exitCode: -143,
              stdout: stdoutData,
              stderr: stderrData + `\n[Timeout]: Vượt quá ${options.timeoutMs}ms`,
              error: new Error('Timeout')
            });
          }
        }, options.timeoutMs);
      }

      child.stdout?.on('data', (d) => {
        const text = d.toString('utf8');
        stdoutData += text;
        if (options.onStdout) options.onStdout(text);
      });

      child.stderr?.on('data', (d) => {
        const text = d.toString('utf8');
        stderrData += text;
        if (options.onStderr) options.onStderr(text);
      });

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        if (!isDone) {
          isDone = true;
          logger.error('BINARY_EXEC_ERROR', `Lỗi khi chạy ${binaryName}: ${err.message}`, err);
          resolve({
            success: false,
            exitCode: -1,
            stdout: stdoutData,
            stderr: stderrData + `\n${err.message}`,
            error: err
          });
        }
      });

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        if (!isDone) {
          isDone = true;
          resolve({
            success: code === 0,
            exitCode: code,
            stdout: stdoutData,
            stderr: stderrData
          });
        }
      });
    });
  }

  async runFFmpeg(args, options) {
    return this.execute('ffmpeg', args, options);
  }

  async runFFprobe(args, options) {
    return this.execute('ffprobe', args, options);
  }

  async runYtDlp(args, options) {
    return this.execute('yt-dlp', args, options);
  }
}

export const binaryManagerBackend = new BinaryManagerService();
export default binaryManagerBackend;
