/**
 * CreatorOS - Self-Contained Binary Tools Manager
 * ==============================================================================
 * Quản lý tự chứa và thực thi các công cụ nhị phân bên ngoài (ffmpeg, ffprobe, yt-dlp)
 * tự động nhận diện môi trường Development vs Production (app.asar.unpacked).
 *
 * Tác dụng:
 * 1. Không phụ thuộc vào biến môi trường PATH của hệ điều hành Windows/macOS.
 * 2. Tự động chuyển đổi đường dẫn giữa Dev Mode và Production Build.
 * 3. Kiểm tra tính tồn tại (Health Check) trước khi gọi child_process tránh lỗi ENOENT.
 * 4. Cung cấp helper thực thi an toàn với các tùy chọn timeout, stdout/stderr & cancellation.
 */

import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { sysLogger } from '../utils/logger';

export type BinaryName = 'ffmpeg' | 'ffprobe' | 'yt-dlp' | string;

export interface BinaryInfo {
  name: BinaryName;
  path: string;
  exists: boolean;
  version?: string;
}

export interface BinaryHealthReport {
  isHealthy: boolean;
  binaries: Record<BinaryName, BinaryInfo>;
  basePath: string;
  isPackaged: boolean;
  platform: string;
}

export interface ExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onProgress?: (progressPercent: number) => void;
}

export interface ExecuteResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

class BinaryManagerService {
  private platform: string;
  private isPackaged: boolean;
  private binaryCache: Map<string, string> = new Map();

  constructor() {
    this.platform = process.platform;
    // Kiểm tra xem Electron đang chạy ở bản đóng gói (packaged app.asar) hay dev
    this.isPackaged =
      process.env.NODE_ENV === 'production' ||
      Boolean((process as any).resourcesPath && !(process as any).defaultApp);
  }

  /**
   * Lấy định dạng tên file tương ứng với OS (Thêm đuôi .exe cho Windows)
   */
  public getExecutableFileName(binaryName: BinaryName): string {
    const isWindows = this.platform === 'win32';
    const hasExtension = binaryName.endsWith('.exe');

    if (isWindows && !hasExtension) {
      return `${binaryName}.exe`;
    }
    return binaryName;
  }

  /**
   * Tự động nhận diện và tính toán đường dẫn thư mục chứa các tệp nhị phân
   */
  public getBinaryDirectory(): string {
    const platformFolder = this.platform === 'win32' ? 'windows' : this.platform === 'darwin' ? 'mac' : 'linux';

    if (this.isPackaged) {
      // Môi trường Production Build (Electron Builder)
      // Các file binary được giải nén ra app.asar.unpacked thông qua extraUnpacked
      const resourcesPath = (process as any).resourcesPath || process.cwd();

      // Priority 1: app.asar.unpacked/backend/bin/<platform>
      const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked', 'backend', 'bin', platformFolder);
      if (fs.existsSync(unpackedPath)) {
        return unpackedPath;
      }

      // Priority 2: resourcesPath/bin/<platform>
      const rootResourcesBin = path.join(resourcesPath, 'bin', platformFolder);
      if (fs.existsSync(rootResourcesBin)) {
        return rootResourcesBin;
      }

      // Priority 3: Fallback resources path root
      return path.join(resourcesPath, 'app.asar.unpacked', 'bin');
    } else {
      // Môi trường Development Mode
      const cwd = process.cwd();

      // Priority 1: <root>/backend/bin/<platform>
      const devBackendBin = path.join(cwd, 'backend', 'bin', platformFolder);
      if (fs.existsSync(devBackendBin)) {
        return devBackendBin;
      }

      // Priority 2: <root>/bin/<platform>
      const devBin = path.join(cwd, 'bin', platformFolder);
      if (fs.existsSync(devBin)) {
        return devBin;
      }

      // Priority 3: Fallback dev root bin
      return path.join(cwd, 'backend', 'bin');
    }
  }

  /**
   * Trả về đường dẫn tuyệt đối chuẩn xác của một file nhị phân (ffmpeg, ffprobe, yt-dlp)
   */
  public getBinaryPath(binaryName: BinaryName): string {
    const fileName = this.getExecutableFileName(binaryName);

    // Kiểm tra cache nếu đã xác định đường dẫn trước đó
    if (this.binaryCache.has(fileName)) {
      return this.binaryCache.get(fileName)!;
    }

    const baseDir = this.getBinaryDirectory();
    const fullPath = path.join(baseDir, fileName);

    // Lưu vào cache
    this.binaryCache.set(fileName, fullPath);
    return fullPath;
  }

  /**
   * Kiểm tra xem tệp thực thi có tồn tại trên đĩa cứng hay không (Tránh lỗi ENOENT)
   */
  public exists(binaryName: BinaryName): boolean {
    const targetPath = this.getBinaryPath(binaryName);
    return fs.existsSync(targetPath);
  }

  /**
   * Health Check: Kiểm tra tình trạng sẵn sàng của toàn bộ các công cụ nhị phân bắt buộc
   */
  public verifyBinaries(requiredBinaries: BinaryName[] = ['ffmpeg', 'ffprobe', 'yt-dlp']): BinaryHealthReport {
    const baseDir = this.getBinaryDirectory();
    const report: BinaryHealthReport = {
      isHealthy: true,
      binaries: {},
      basePath: baseDir,
      isPackaged: this.isPackaged,
      platform: this.platform
    };

    for (const bName of requiredBinaries) {
      const fullPath = this.getBinaryPath(bName);
      const isExist = fs.existsSync(fullPath);

      report.binaries[bName] = {
        name: bName,
        path: fullPath,
        exists: isExist
      };

      if (!isExist) {
        report.isHealthy = false;
        sysLogger.warn(
          'BinaryManager',
          'HealthCheck',
          `Thiếu công cụ nhị phân quan trọng: ${bName} tại ${fullPath}`
        );
      }
    }

    if (report.isHealthy) {
      sysLogger.info(
        'BinaryManager',
        'HealthCheck',
        `Tất cả công cụ binary (${requiredBinaries.join(', ')}) sẵn sàng hoạt động tại: ${baseDir}`
      );
    }

    return report;
  }

  /**
   * Wrapper thực thi tiến trình con (Child Process) an toàn với cơ chế bắt lỗi ENOENT và logging
   */
  public spawnBinary(
    binaryName: BinaryName,
    args: string[] = [],
    options: ExecuteOptions = {}
  ): { child: ChildProcess; promise: Promise<ExecuteResult> } {
    const binaryPath = this.getBinaryPath(binaryName);

    // 1. Kiểm tra Health Check trước khi spawn để tránh nổ lỗi ENOENT crash app
    if (!fs.existsSync(binaryPath)) {
      const errMessage = `[BinaryManager Error] Không tìm thấy file thực thi '${binaryName}' tại đường dẫn: ${binaryPath}. Hãy kiểm tra xem file đã được giải nén đúng thư mục chưa.`;
      sysLogger.error('BinaryManager', 'SpawnCheck', new Error(errMessage), { binaryName, binaryPath, args });

      const failedPromise = Promise.resolve<ExecuteResult>({
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: errMessage,
        error: new Error(errMessage)
      });

      return { child: null as any, promise: failedPromise };
    }

    sysLogger.info('BinaryManager', 'Spawn', `Khởi chạy ${binaryName}`, {
      path: binaryPath,
      argsCount: args.length
    });

    let stdoutData = '';
    let stderrData = '';
    let isFinished = false;

    const child = spawn(binaryPath, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      windowsHide: true
    });

    const promise = new Promise<ExecuteResult>((resolve) => {
      let timeoutTimer: NodeJS.Timeout | null = null;

      if (options.timeoutMs && options.timeoutMs > 0) {
        timeoutTimer = setTimeout(() => {
          if (!isFinished) {
            isFinished = true;
            child.kill('SIGKILL');
            const timeoutErr = new Error(`Lệnh ${binaryName} bị hủy do vượt quá thời gian cho phép (${options.timeoutMs}ms)`);
            sysLogger.error('BinaryManager', 'Timeout', timeoutErr, { binaryName, args });
            resolve({
              success: false,
              exitCode: -143,
              stdout: stdoutData,
              stderr: stderrData + `\n[Timeout Error]: ${timeoutErr.message}`,
              error: timeoutErr
            });
          }
        }, options.timeoutMs);
      }

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8');
        stdoutData += text;
        if (options.onStdout) options.onStdout(text);
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8');
        stderrData += text;
        if (options.onStderr) options.onStderr(text);

        // Parse tiến độ FFmpeg ví dụ "time=00:01:23.45"
        if (options.onProgress && text.includes('time=')) {
          const match = text.match(/time=(\d+):(\d+):(\d+.\d+)/);
          if (match) {
            const hours = parseFloat(match[1]);
            const minutes = parseFloat(match[2]);
            const seconds = parseFloat(match[3]);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            options.onProgress(totalSeconds);
          }
        }
      });

      child.on('error', (err: Error) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (!isFinished) {
          isFinished = true;
          sysLogger.error('BinaryManager', 'ChildProcessError', err, { binaryName, binaryPath });
          resolve({
            success: false,
            exitCode: -1,
            stdout: stdoutData,
            stderr: stderrData + `\n[Process Error]: ${err.message}`,
            error: err
          });
        }
      });

      child.on('close', (code: number | null) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (!isFinished) {
          isFinished = true;
          const success = code === 0;
          if (!success) {
            sysLogger.warn('BinaryManager', 'ProcessExitCode', `${binaryName} kết thúc với exit code: ${code}`, {
              stderr: stderrData.slice(-300)
            });
          }
          resolve({
            success,
            exitCode: code,
            stdout: stdoutData,
            stderr: stderrData
          });
        }
      });
    });

    return { child, promise };
  }

  /**
   * Helper rút gọn để thực thi lệnh bất đồng bộ nhanh
   */
  public async execute(
    binaryName: BinaryName,
    args: string[] = [],
    options: ExecuteOptions = {}
  ): Promise<ExecuteResult> {
    const { promise } = this.spawnBinary(binaryName, args, options);
    return promise;
  }

  /**
   * Helper dành riêng cho FFmpeg
   */
  public async runFFmpeg(args: string[], options?: ExecuteOptions): Promise<ExecuteResult> {
    return this.execute('ffmpeg', args, options);
  }

  /**
   * Helper dành riêng cho FFprobe
   */
  public async runFFprobe(args: string[], options?: ExecuteOptions): Promise<ExecuteResult> {
    return this.execute('ffprobe', args, options);
  }

  /**
   * Helper dành riêng cho yt-dlp
   */
  public async runYtDlp(args: string[], options?: ExecuteOptions): Promise<ExecuteResult> {
    return this.execute('yt-dlp', args, options);
  }
}

export const binaryManager = new BinaryManagerService();
export default binaryManager;
