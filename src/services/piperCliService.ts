/**
 * CreatorOS - Standalone Piper Neural TTS Service Wrapper (piper_cli.exe)
 * ==============================================================================
 * Dịch vụ Node.js / TypeScript wrapper điều khiển tệp thực thi 'piper_cli.exe' / 'piper.exe'
 * tổng hợp giọng nói AI tốc độ cao (Fast Neural TTS) phục vụ module Lồng Tiếng Video.
 *
 * Tính năng chính:
 * 1. Tự động định vị file thực thi 'piper_cli.exe' ở môi trường Dev & Production (app.asar.unpacked).
 * 2. Truyền văn bản qua luồng STDIN (`child_process.spawn`) để tránh giới hạn ký tự dòng lệnh Windows.
 * 3. Quản lý thư mục chứa các mô hình giọng đọc đa ngôn ngữ (.onnx & .onnx.json).
 * 4. Hỗ trợ tùy chỉnh tốc độ đọc (`length_scale`), biến thiên âm sắc (`noise_scale`), speaker ID.
 * 5. Tích hợp AbortController để dừng tiến trình lập tức khi người dùng yêu cầu.
 * 6. Trả về Promise xử lý bất đồng bộ an toàn với đầy đủ log chi tiết.
 */

import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { sysLogger } from '../utils/logger';

export interface PiperVoiceProfile {
  /** Mã ngôn ngữ (e.g., 'vi_VN', 'en_US', 'ja_JP', 'zh_CN') */
  languageCode: string;
  /** Tên giọng đọc (e.g., 'nam_mien_nam', 'nu_mien_bac', 'lessac') */
  voiceName: string;
  /** Chất lượng giọng ('low', 'medium', 'high') */
  quality: 'low' | 'medium' | 'high';
  /** Đường dẫn tệp .onnx */
  modelPath: string;
  /** Đường dẫn tệp cấu hình .onnx.json */
  configPath: string;
  /** Speaker ID (nếu mô hình hỗ trợ nhiều speaker) */
  speakerId?: number;
}

export interface PiperSynthesizeOptions {
  /** Đoạn văn bản cần chuyển thành giọng nói */
  text: string;
  /** Đường dẫn tệp .wav kết quả xuất ra */
  outputWavPath: string;
  /** Đường dẫn tệp mô hình giọng đọc (.onnx) hoặc mã ngôn ngữ/tên giọng */
  modelPath: string;
  /** Đường dẫn tệp .onnx.json (tùy chọn) */
  configPath?: string;
  /** Speaker ID cho multi-speaker models (mặc định: undefined) */
  speakerId?: number;
  /** Hệ số tốc độ đọc (<1.0: đọc nhanh hơn, >1.0: đọc chậm hơn, mặc định: 1.0) */
  lengthScale?: number;
  /** Hệ số biến thiên âm thanh noise_scale (mặc định: 0.667) */
  noiseScale?: number;
  /** Hệ số phong cách phát âm noise_w (mặc định: 0.8) */
  noiseW?: number;
  /** AbortSignal từ AbortController để dừng tiến trình */
  signal?: AbortSignal;
  /** Callback nhận dòng log stdout/stderr */
  onLog?: (line: string, isError: boolean) => void;
}

export interface PiperSynthesizeResult {
  success: boolean;
  outputWavPath: string;
  textLength: number;
  durationMs?: number;
  exitCode: number | null;
  error?: string;
}

class PiperCliService {
  private isPackaged: boolean;
  private defaultModelsDir: string;

  constructor() {
    this.isPackaged =
      process.env.NODE_ENV === 'production' ||
      Boolean((process as any).resourcesPath && !(process as any).defaultApp);

    this.defaultModelsDir = this.resolveModelsDirectory();
  }

  /**
   * Tự động xác định đường dẫn file thực thi 'piper_cli.exe' / 'piper.exe'
   */
  public getExecutablePath(): string {
    const exeName = process.platform === 'win32' ? 'piper_cli.exe' : 'piper_cli';
    const altExeName = process.platform === 'win32' ? 'piper.exe' : 'piper';

    const subPath = path.join('PythonScripts', 'dubbing', 'piper_cli', exeName);
    const altSubPath = path.join('PythonScripts', 'dubbing', 'piper_cli', altExeName);

    if (this.isPackaged) {
      const resourcesPath = (process as any).resourcesPath || process.cwd();
      const prodPath = path.join(resourcesPath, 'app.asar.unpacked', subPath);
      if (fs.existsSync(prodPath)) return prodPath;

      const prodAltPath = path.join(resourcesPath, 'app.asar.unpacked', altSubPath);
      if (fs.existsSync(prodAltPath)) return prodAltPath;

      return prodPath;
    } else {
      const devPath = path.join(process.cwd(), subPath);
      if (fs.existsSync(devPath)) return devPath;

      const devAltPath = path.join(process.cwd(), altSubPath);
      if (fs.existsSync(devAltPath)) return devAltPath;

      // Fallback backend bin
      const backendBin = path.join(process.cwd(), 'backend', 'bin', 'windows', exeName);
      if (fs.existsSync(backendBin)) return backendBin;

      return devPath;
    }
  }

  /**
   * Đường dẫn thư mục lưu trữ các mô hình giọng đọc AI Piper (.onnx)
   */
  public resolveModelsDirectory(): string {
    const subDir = path.join('PythonScripts', 'dubbing', 'models', 'piper');

    if (this.isPackaged) {
      const resourcesPath = (process as any).resourcesPath || process.cwd();
      return path.join(resourcesPath, 'app.asar.unpacked', subDir);
    } else {
      return path.join(process.cwd(), subDir);
    }
  }

  /**
   * Kiểm tra xem tệp thực thi Piper CLI có sẵn sàng hay không
   */
  public isBinaryAvailable(): boolean {
    const exePath = this.getExecutablePath();
    return fs.existsSync(exePath);
  }

  /**
   * Quét và lấy danh sách các mô hình giọng đọc ONNX khả dụng trong thư mục models
   */
  public getAvailableVoiceModels(): PiperVoiceProfile[] {
    const modelsDir = this.resolveModelsDirectory();
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
      return [];
    }

    const profiles: PiperVoiceProfile[] = [];
    const files = fs.readdirSync(modelsDir);

    for (const file of files) {
      if (file.endsWith('.onnx') && !file.endsWith('.onnx.json')) {
        const modelPath = path.join(modelsDir, file);
        const configPath = `${modelPath}.json`;

        // Parse tên file dạng: vi_VN-nam_mien_nam-medium.onnx
        const parts = file.replace('.onnx', '').split('-');
        const langCode = parts[0] || 'vi_VN';
        const voiceName = parts[1] || 'default';
        const qualityRaw = parts[2] || 'medium';
        const quality = ['low', 'medium', 'high'].includes(qualityRaw)
          ? (qualityRaw as 'low' | 'medium' | 'high')
          : 'medium';

        profiles.push({
          languageCode: langCode,
          voiceName,
          quality,
          modelPath,
          configPath: fs.existsSync(configPath) ? configPath : ''
        });
      }
    }

    return profiles;
  }

  /**
   * Tổng hợp giọng nói AI bằng cách truyền văn bản qua STDIN vào Piper CLI
   */
  public async synthesizeSpeech(options: PiperSynthesizeOptions): Promise<PiperSynthesizeResult> {
    const startTime = Date.now();
    const exePath = this.getExecutablePath();

    const {
      text,
      outputWavPath,
      modelPath,
      configPath,
      speakerId,
      lengthScale = 1.0,
      noiseScale = 0.667,
      noiseW = 0.8,
      signal,
      onLog
    } = options;

    // 1. Kiểm tra văn bản đầu vào
    if (!text || text.trim().length === 0) {
      const err = 'Văn bản đầu vào không được để rỗng.';
      sysLogger.error('PiperCliService', 'EmptyText', new Error(err));
      return {
        success: false,
        outputWavPath,
        textLength: 0,
        exitCode: -1,
        error: err
      };
    }

    // 2. Kiểm tra sự tồn tại của file thực thi piper_cli.exe
    if (!fs.existsSync(exePath)) {
      const err = `Không tìm thấy công cụ Piper TTS tại: ${exePath}`;
      sysLogger.error('PiperCliService', 'BinaryNotFound', new Error(err), { exePath });
      return {
        success: false,
        outputWavPath,
        textLength: text.length,
        exitCode: -1,
        error: err
      };
    }

    // 3. Kiểm tra file model ONNX
    let resolvedModelPath = modelPath;
    if (!fs.existsSync(resolvedModelPath)) {
      // Thử tìm trong thư mục models mặc định
      const inDefaultDir = path.join(this.defaultModelsDir, path.basename(modelPath));
      if (fs.existsSync(inDefaultDir)) {
        resolvedModelPath = inDefaultDir;
      } else {
        const err = `Không tìm thấy tệp mô hình giọng đọc (.onnx): ${modelPath}`;
        sysLogger.error('PiperCliService', 'ModelNotFound', new Error(err), { modelPath });
        return {
          success: false,
          outputWavPath,
          textLength: text.length,
          exitCode: -1,
          error: err
        };
      }
    }

    // Tự động tạo thư mục chứa file WAV đầu ra
    fs.mkdirSync(path.dirname(path.resolve(outputWavPath)), { recursive: true });

    // 4. Xây dựng danh sách tham số dòng lệnh Piper CLI
    const args: string[] = [
      '--model', resolvedModelPath,
      '--output_file', outputWavPath,
      '--length_scale', String(lengthScale),
      '--noise_scale', String(noiseScale),
      '--noise_w', String(noiseW)
    ];

    if (configPath && fs.existsSync(configPath)) {
      args.push('--config', configPath);
    }

    if (typeof speakerId === 'number') {
      args.push('--speaker', String(speakerId));
    }

    sysLogger.info('PiperCliService', 'SynthesizeStart', `Đang sinh giọng đọc cho ${text.length} ký tự`, {
      outputWavPath,
      modelPath: resolvedModelPath,
      lengthScale
    });

    return new Promise<PiperSynthesizeResult>((resolve) => {
      let child: ChildProcess | null = null;
      let stderrAcc = '';
      let isSettled = false;

      try {
        child = spawn(exePath, args, {
          cwd: path.dirname(exePath),
          windowsHide: true,
          env: { ...process.env }
        });
      } catch (spawnErr: any) {
        sysLogger.error('PiperCliService', 'SpawnError', spawnErr);
        return resolve({
          success: false,
          outputWavPath,
          textLength: text.length,
          exitCode: -1,
          error: `Không thể khởi chạy Piper CLI: ${spawnErr.message}`
        });
      }

      // Handle AbortSignal cancel request
      if (signal) {
        if (signal.aborted) {
          this.killProcess(child);
          return resolve({
            success: false,
            outputWavPath,
            textLength: text.length,
            exitCode: -143,
            error: 'Thao tác tạo giọng đọc bị hủy bởi người dùng.'
          });
        }

        signal.addEventListener('abort', () => {
          if (!isSettled && child) {
            isSettled = true;
            this.killProcess(child);
            sysLogger.warn('PiperCliService', 'Aborted', 'Tác vụ Piper TTS bị hủy bởi người dùng.');
            resolve({
              success: false,
              outputWavPath,
              textLength: text.length,
              exitCode: -143,
              error: 'Tác vụ tạo giọng đọc bị hủy.'
            });
          }
        });
      }

      // Write text into stdin of Piper CLI
      if (child.stdin) {
        child.stdin.setDefaultEncoding('utf-8');
        child.stdin.write(text);
        child.stdin.end();
      }

      child.stdout?.on('data', (chunk: Buffer) => {
        const str = chunk.toString('utf-8');
        if (onLog) onLog(str, false);
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        const str = chunk.toString('utf-8');
        stderrAcc += str;
        if (onLog) onLog(str, true);
      });

      child.on('error', (err: Error) => {
        if (!isSettled) {
          isSettled = true;
          sysLogger.error('PiperCliService', 'ChildError', err);
          resolve({
            success: false,
            outputWavPath,
            textLength: text.length,
            exitCode: -1,
            error: `Lỗi tiến trình Piper: ${err.message}`
          });
        }
      });

      child.on('close', (code: number | null) => {
        if (isSettled) return;
        isSettled = true;

        const durationMs = Date.now() - startTime;
        const isSuccess = code === 0 && fs.existsSync(outputWavPath) && fs.statSync(outputWavPath).size > 0;

        if (isSuccess) {
          sysLogger.info('PiperCliService', 'SynthesizeSuccess', 'Hoàn tất sinh giọng đọc', {
            outputWavPath,
            fileSize: fs.statSync(outputWavPath).size,
            durationMs
          });

          resolve({
            success: true,
            outputWavPath,
            textLength: text.length,
            durationMs,
            exitCode: code
          });
        } else {
          const errDetail = stderrAcc.trim() || 'Tệp WAV đầu ra bị thiếu hoặc 0 byte.';
          sysLogger.error('PiperCliService', 'SynthesizeFailed', new Error(errDetail), {
            code,
            stderrAcc
          });

          resolve({
            success: false,
            outputWavPath,
            textLength: text.length,
            durationMs,
            exitCode: code,
            error: `Tạo giọng đọc thất bại (Mã ${code}): ${errDetail}`
          });
        }
      });
    });
  }

  private killProcess(child: ChildProcess | null): void {
    if (!child || child.killed) return;
    try {
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { windowsHide: true });
      } else {
        child.kill('SIGKILL');
      }
    } catch (e) {
      console.error('Lỗi khi dừng Piper process:', e);
    }
  }
}

export const piperCliService = new PiperCliService();
export default piperCliService;
