/**
 * CreatorOS - Standalone Demucs Runner Service (demucs_runner.exe)
 * ==============================================================================
 * Dịch vụ Node.js / TypeScript wrapper thực thi tiến trình con 'demucs_runner.exe'
 * dùng để bóc tách âm thanh nguồn (Vocals vs BGM / No-Vocals) trực tiếp mà không cần
 * phụ thuộc vào môi trường Python hệ thống.
 *
 * Tính năng chính:
 * 1. Tự động tìm đường dẫn 'demucs_runner.exe' ở Dev Mode lẫn Production (app.asar.unpacked).
 * 2. Truyền tham số dòng lệnh động (-i, -o, -m, --device, --two-stems, v.v.).
 * 3. Lắng nghe luồng Stdout / Stderr thời gian thực để parse % tiến độ bóc tách.
 * 4. Tích hợp AbortController để dừng/hủy tiến trình lập tức khi người dùng yêu cầu.
 * 5. Bắt lỗi hết VRAM GPU (CUDA out of memory) & tự động gợi ý hạ xuống CPU mode.
 */

import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { sysLogger } from '../utils/logger';

export interface DemucsRunOptions {
  /** Đường dẫn file âm thanh/video đầu vào (.mp4, .wav, .mp3, .m4a, ...) */
  inputPath: string;
  /** Thư mục đích lưu trữ các file đã bóc tách (vocals.wav, no_vocals.wav) */
  outputDir: string;
  /** Tên mô hình Demucs (mặc định: 'htdemucs') */
  model?: 'htdemucs' | 'htdemucs_ft' | 'mdx_extra' | string;
  /** Thiết bị tính toán GPU/CPU (mặc định: 'cuda') */
  device?: 'cuda' | 'cpu';
  /** Bóc tách 2 stem (mặc định: 'vocals') */
  twoStems?: 'vocals' | 'drums' | 'bass' | 'other' | string;
  /** Số lượt ngẫu nhiên hóa shifts (mặc định: 1) */
  shifts?: number;
  /** Tỷ lệ chồng lấp overlap (mặc định: 0.25) */
  overlap?: number;
  /** AbortSignal từ AbortController để gửi tín hiệu hủy tiến trình */
  signal?: AbortSignal;
  /** Callback cập nhật phần trăm tiến độ (0 - 100%) */
  onProgress?: (percent: number, statusText: string) => void;
  /** Callback nhận dòng log thời gian thực từ stdout/stderr */
  onLog?: (line: string, isError: boolean) => void;
}

export interface DemucsRunResult {
  success: boolean;
  vocalsPath?: string;
  noVocalsPath?: string;
  outputDir: string;
  exitCode: number | null;
  error?: string;
  isOomError?: boolean;
}

class DemucsRunnerService {
  private isPackaged: boolean;

  constructor() {
    this.isPackaged =
      process.env.NODE_ENV === 'production' ||
      Boolean((process as any).resourcesPath && !(process as any).defaultApp);
  }

  /**
   * Tự động xác định đường dẫn file thực thi 'demucs_runner.exe'
   */
  public getExecutablePath(): string {
    const exeName = process.platform === 'win32' ? 'demucs_runner.exe' : 'demucs_runner';
    const subPath = path.join('PythonScripts', 'dubbing', 'demucs_runner', exeName);

    if (this.isPackaged) {
      const resourcesPath = (process as any).resourcesPath || process.cwd();
      const prodPath = path.join(resourcesPath, 'app.asar.unpacked', subPath);
      if (fs.existsSync(prodPath)) return prodPath;

      const altPath = path.join(resourcesPath, subPath);
      if (fs.existsSync(altPath)) return altPath;

      return prodPath;
    } else {
      const devPath = path.join(process.cwd(), subPath);
      if (fs.existsSync(devPath)) return devPath;

      // Fallback nếu đặt ở backend/bin/
      const backendBinPath = path.join(process.cwd(), 'backend', 'bin', 'windows', exeName);
      if (fs.existsSync(backendBinPath)) return backendBinPath;

      return devPath;
    }
  }

  /**
   * Kiểm tra xem file thực thi demucs_runner.exe có tồn tại không
   */
  public isBinaryAvailable(): boolean {
    const exePath = this.getExecutablePath();
    return fs.existsSync(exePath);
  }

  /**
   * Khởi chạy tiến trình bóc tách âm thanh qua Standalone demucs_runner.exe
   */
  public async executeDemucs(options: DemucsRunOptions): Promise<DemucsRunResult> {
    const exePath = this.getExecutablePath();
    const {
      inputPath,
      outputDir,
      model = 'htdemucs',
      device = 'cuda',
      twoStems = 'vocals',
      shifts = 1,
      overlap = 0.25,
      signal,
      onProgress,
      onLog
    } = options;

    // 1. Kiểm tra sự tồn tại của file thực thi
    if (!fs.existsSync(exePath)) {
      const err = `[DemucsRunner] Không tìm thấy file thực thi 'demucs_runner.exe' tại đường dẫn: ${exePath}`;
      sysLogger.error('DemucsRunnerService', 'CheckBinary', new Error(err), { exePath });
      return {
        success: false,
        outputDir,
        exitCode: -1,
        error: err
      };
    }

    // 2. Kiểm tra file đầu vào
    if (!fs.existsSync(inputPath)) {
      const err = `[DemucsRunner] Tệp đầu vào không tồn tại: ${inputPath}`;
      sysLogger.error('DemucsRunnerService', 'CheckInput', new Error(err), { inputPath });
      return {
        success: false,
        outputDir,
        exitCode: -1,
        error: err
      };
    }

    // Tự động tạo thư mục đầu ra
    fs.mkdirSync(outputDir, { recursive: true });

    // 3. Xây dựng danh sách tham số CLI
    const args: string[] = [
      '-i', inputPath,
      '-o', outputDir,
      '-m', model,
      '--device', device,
      '--shifts', String(shifts),
      '--overlap', String(overlap)
    ];

    if (twoStems) {
      args.push('--two-stems', twoStems);
    }

    sysLogger.info('DemucsRunnerService', 'Spawn', `Đang gọi ${exePath}`, { args });

    return new Promise<DemucsRunResult>((resolve) => {
      let child: ChildProcess | null = null;
      let stdoutAcc = '';
      let stderrAcc = '';
      let isSettled = false;
      let isOom = false;

      try {
        child = spawn(exePath, args, {
          cwd: path.dirname(exePath),
          windowsHide: true,
          env: { ...process.env }
        });
      } catch (spawnError: any) {
        sysLogger.error('DemucsRunnerService', 'SpawnError', spawnError);
        return resolve({
          success: false,
          outputDir,
          exitCode: -1,
          error: `Khởi chạy tiến trình thất bại: ${spawnError.message}`
        });
      }

      // 4. Xử lý khi người dùng ấn Hủy (AbortController Signal)
      if (signal) {
        if (signal.aborted) {
          this.killChildProcess(child);
          return resolve({
            success: false,
            outputDir,
            exitCode: -143,
            error: 'Thao tác đã bị hủy bởi người dùng.'
          });
        }

        signal.addEventListener('abort', () => {
          sysLogger.warn('DemucsRunnerService', 'AbortSignal', 'Tín hiệu hủy được kích hoạt từ giao diện UI');
          if (!isSettled && child) {
            isSettled = true;
            this.killChildProcess(child);
            if (onProgress) onProgress(0, 'Đã hủy tác vụ bóc tách.');
            resolve({
              success: false,
              outputDir,
              exitCode: -143,
              error: 'Tác vụ lồng tiếng/tách nhạc đã bị hủy.'
            });
          }
        });
      }

      // 5. Lắng nghe Stdout thời gian thực
      child.stdout?.on('data', (chunk: Buffer) => {
        const str = chunk.toString('utf-8');
        stdoutAcc += str;

        const lines = str.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines) {
          if (onLog) onLog(line, false);
          this.parseProgressFromLog(line, onProgress);
        }
      });

      // 6. Lắng nghe Stderr thời gian thực
      child.stderr?.on('data', (chunk: Buffer) => {
        const str = chunk.toString('utf-8');
        stderrAcc += str;

        // Bắt lỗi VRAM / CUDA Out of Memory
        if (
          str.includes('CUDA out of memory') ||
          str.includes('OutOfMemoryError') ||
          str.includes('MemoryError')
        ) {
          isOom = true;
        }

        const lines = str.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines) {
          if (onLog) onLog(line, true);
          this.parseProgressFromLog(line, onProgress);
        }
      });

      // 7. Bắt lỗi tiến trình con
      child.on('error', (err: Error) => {
        if (!isSettled) {
          isSettled = true;
          sysLogger.error('DemucsRunnerService', 'ChildError', err);
          resolve({
            success: false,
            outputDir,
            exitCode: -1,
            error: `Lỗi tiến trình: ${err.message}`
          });
        }
      });

      // 8. Tiến trình kết thúc
      child.on('close', (code: number | null) => {
        if (isSettled) return;
        isSettled = true;

        const isSuccess = code === 0;

        if (isOom) {
          const oomMsg =
            'Lỗi tràn bộ nhớ GPU (CUDA Out of Memory). Vui lòng chuyển cấu hình sang thiết bị "cpu" hoặc đóng các ứng dụng GPU khác.';
          sysLogger.error('DemucsRunnerService', 'VRAM_OOM', new Error(oomMsg));
          return resolve({
            success: false,
            outputDir,
            exitCode: code,
            error: oomMsg,
            isOomError: true
          });
        }

        if (isSuccess) {
          // Tính toán đường dẫn file kết quả
          const filenameNoExt = path.basename(inputPath, path.extname(inputPath));
          const resultFolder = path.join(outputDir, model, filenameNoExt);
          const vocalsPath = path.join(resultFolder, 'vocals.wav');
          const noVocalsPath = path.join(resultFolder, 'no_vocals.wav');

          if (onProgress) onProgress(100, 'Bóc tách nhạc nền & giọng nói thành công!');

          sysLogger.info('DemucsRunnerService', 'Complete', 'Hoàn tất bóc tách âm thanh', {
            vocalsPath,
            noVocalsPath
          });

          resolve({
            success: true,
            vocalsPath: fs.existsSync(vocalsPath) ? vocalsPath : undefined,
            noVocalsPath: fs.existsSync(noVocalsPath) ? noVocalsPath : undefined,
            outputDir: resultFolder,
            exitCode: code
          });
        } else {
          const lastStderr = stderrAcc.split('\n').slice(-10).join('\n') || 'Mã lỗi không xác định từ EXE';
          sysLogger.warn('DemucsRunnerService', 'FailedExit', `Thất bại với mã thoát ${code}`, {
            lastStderr
          });

          resolve({
            success: false,
            outputDir,
            exitCode: code,
            error: `Bóc tách thất bại (Exit code ${code}): ${lastStderr}`
          });
        }
      });
    });
  }

  /**
   * Parse phần trăm tiến độ từ log xuất ra của Demucs CLI / PyInstaller stdout
   */
  private parseProgressFromLog(
    line: string,
    onProgress?: (percent: number, statusText: string) => void
  ): void {
    if (!onProgress) return;

    // Pattern 1: Tải/xử lý phần trăm 45%
    const percentMatch = line.match(/(\d{1,3})%/);
    if (percentMatch) {
      const pct = parseInt(percentMatch[1], 10);
      if (!isNaN(pct) && pct >= 0 && pct <= 100) {
        onProgress(pct, `Đang bóc tách âm thanh (${pct}%)...`);
        return;
      }
    }

    // Pattern 2: Demucs progress bars "Separating track"
    if (line.includes('Separating track') || line.includes('Separating')) {
      onProgress(30, 'Đang tiến hành phân tách các dải âm thanh...');
    } else if (line.includes('Writing track') || line.includes('Saving')) {
      onProgress(85, 'Đang xuất tệp Vocals & Background Music...');
    } else if (line.includes('Bắt đầu bóc tách') || line.includes('Starting')) {
      onProgress(10, 'Đang tải mô hình AI vào GPU/VRAM...');
    }
  }

  /**
   * Tiêu diệt tiến trình con an toàn trên Windows và Linux/macOS
   */
  private killChildProcess(child: ChildProcess | null): void {
    if (!child || child.killed) return;

    try {
      if (process.platform === 'win32' && child.pid) {
        // Dùng taskkill /F /T /PID để ngắt cả cây tiến trình con của PyInstaller EXE
        spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { windowsHide: true });
      } else {
        child.kill('SIGKILL');
      }
    } catch (e) {
      console.error('Lỗi khi hủy tiến trình demucs_runner:', e);
    }
  }
}

export const demucsRunnerService = new DemucsRunnerService();
export default demucsRunnerService;
