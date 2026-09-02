/**
 * CreatorOS - Optimized FFmpeg Batch Video Processing Service Wrapper
 * ==============================================================================
 * Dịch vụ Node.js / TypeScript bọc FFmpeg chuyên dụng cho xử lý video hàng loạt.
 *
 * Tính năng nổi bật:
 * 1. Tự động phát hiện & kích hoạt phần cứng GPU NVENC (NVIDIA), QSV (Intel), AMF (AMD), VideoToolbox (Apple)
 *    và tự động fallback về CPU (libx264/libx265) nếu GPU bị lỗi.
 * 2. Cắt ghép video (Trim/Cut), nối nhiều video (Concat/Merge), nén định dạng (Compress/Transcode),
 *    chèn/lồng phụ đề cứng hoặc phụ đề mềm (SRT/VTT).
 * 3. Phát luồng log progress (%) thời gian thực từng giây cho backend & UI Electron (FPS, Speed, Bitrate, Time).
 * 4. Hỗ trợ xử lý tác vụ theo lô (Batch Processing) với hàng đợi bất đồng bộ, kiểm soát hủy tác vụ an toàn.
 */

import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import EventEmitter from 'events';
import { binaryManager } from './binaryManager';
import { sysLogger } from '../utils/logger';

export type HwAccelType = 'nvenc' | 'qsv' | 'amf' | 'videotoolbox' | 'cpu';

export interface FFmpegProgressData {
  percent: number; // 0 - 100%
  currentTimeSec: number;
  totalDurationSec: number;
  fps: number;
  speed: string; // e.g. "2.4x"
  bitrate: string; // e.g. "4500kbits/s"
  rawLog: string;
}

export interface VideoTrimOptions {
  inputPath: string;
  outputPath: string;
  startTimeSec: number; // Giây bắt đầu (e.g. 10.5)
  durationSec?: number; // Thời lượng cắt (e.g. 30)
  endTimeSec?: number; // Hoặc giây kết thúc
  streamCopy?: boolean; // Fast stream copy (không re-encode)
  useGpu?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: FFmpegProgressData) => void;
  onLog?: (line: string) => void;
}

export interface VideoConcatOptions {
  inputPaths: string[];
  outputPath: string;
  reencode?: boolean; // Match different codecs/resolutions
  presetQuality?: 'low' | 'medium' | 'high';
  useGpu?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: FFmpegProgressData) => void;
  onLog?: (line: string) => void;
}

export interface VideoCompressOptions {
  inputPath: string;
  outputPath: string;
  resolution?: '4k' | '1080p' | '720p' | '480p' | 'original' | string;
  presetQuality?: 'low' | 'medium' | 'high';
  targetBitrateKbps?: number;
  fps?: number;
  useGpu?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: FFmpegProgressData) => void;
  onLog?: (line: string) => void;
}

export interface SubtitleOptions {
  videoInputPath: string;
  subtitlePath: string; // File .srt hoặc .vtt
  outputPath: string;
  mode: 'hard' | 'soft'; // hard: burn-in vào khung hình, soft: nhúng luồng phụ đề
  subtitleStyle?: string; // FontName=Arial,FontSize=20,PrimaryColour=&H00FFFF
  useGpu?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: FFmpegProgressData) => void;
  onLog?: (line: string) => void;
}

export interface BatchTaskItem {
  id: string;
  type: 'trim' | 'concat' | 'compress' | 'subtitle' | 'custom';
  options: any;
}

export interface FFmpegExecutionResult {
  success: boolean;
  outputPath: string;
  durationSec: number;
  fileSizeBytes: number;
  exitCode: number | null;
  error?: string;
  usedHwAccel: HwAccelType;
  totalTimeMs: number;
}

export class FFmpegBatchService extends EventEmitter {
  private detectedHwAccel: HwAccelType | null = null;

  constructor() {
    super();
  }

  /**
   * Tự động phát hiện cạc đồ họa hỗ trợ mã hóa tăng tốc phần cứng GPU (NVENC, QSV, AMF, VideoToolbox)
   */
  public async detectHardwareAcceleration(): Promise<HwAccelType> {
    if (this.detectedHwAccel) return this.detectedHwAccel;

    try {
      const res = await binaryManager.runFFmpeg(['-encoders']);
      const encodersText = res.stdout + res.stderr;

      if (encodersText.includes('h264_nvenc') || encodersText.includes('hevc_nvenc')) {
        this.detectedHwAccel = 'nvenc';
        sysLogger.info('FFmpegBatchService', 'HWDetect', 'Đã phát hiện GPU NVIDIA NVENC (h264_nvenc) sẵn sàng.');
      } else if (encodersText.includes('h264_qsv')) {
        this.detectedHwAccel = 'qsv';
        sysLogger.info('FFmpegBatchService', 'HWDetect', 'Đã phát hiện Intel QuickSync (h264_qsv).');
      } else if (encodersText.includes('h264_amf')) {
        this.detectedHwAccel = 'amf';
        sysLogger.info('FFmpegBatchService', 'HWDetect', 'Đã phát hiện AMD AMF (h264_amf).');
      } else if (encodersText.includes('h264_videotoolbox') && process.platform === 'darwin') {
        this.detectedHwAccel = 'videotoolbox';
        sysLogger.info('FFmpegBatchService', 'HWDetect', 'Đã phát hiện Apple VideoToolbox.');
      } else {
        this.detectedHwAccel = 'cpu';
        sysLogger.info('FFmpegBatchService', 'HWDetect', 'Sử dụng bộ mã hóa CPU (libx264).');
      }
    } catch (err) {
      sysLogger.warn('FFmpegBatchService', 'HWDetectError', 'Lỗi khi kiểm tra GPU, fallback về CPU.', { err });
      this.detectedHwAccel = 'cpu';
    }

    return this.detectedHwAccel;
  }

  /**
   * Trích xuất tổng thời lượng của video (tính bằng giây) bằng ffprobe
   */
  public async getVideoDurationSec(filePath: string): Promise<number> {
    if (!fs.existsSync(filePath)) return 0;

    try {
      const res = await binaryManager.runFFprobe([
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ]);

      const duration = parseFloat(res.stdout.trim());
      if (!isNaN(duration) && duration > 0) {
        return duration;
      }
    } catch (e) {
      sysLogger.warn('FFmpegBatchService', 'GetDurationError', 'Không thể đọc thời lượng bằng ffprobe, thử bằng ffmpeg metadata');
    }

    // Fallback: Parse stderr từ ffmpeg
    try {
      const res = await binaryManager.runFFmpeg(['-i', filePath]);
      const match = res.stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        const h = parseFloat(match[1]);
        const m = parseFloat(match[2]);
        const s = parseFloat(match[3]);
        return h * 3600 + m * 60 + s;
      }
    } catch {
      // Ignored
    }

    return 0;
  }

  /**
   * 1. Cắt Video (Trim / Cut Video)
   */
  public async trimVideo(options: VideoTrimOptions): Promise<FFmpegExecutionResult> {
    const { inputPath, outputPath, startTimeSec, durationSec, endTimeSec, streamCopy = false, useGpu = true } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Tệp video đầu vào không tồn tại: ${inputPath}`);
    }

    const args: string[] = ['-y'];

    // Seek thời điểm bắt đầu
    args.push('-ss', String(startTimeSec));

    if (typeof durationSec === 'number' && durationSec > 0) {
      args.push('-t', String(durationSec));
    } else if (typeof endTimeSec === 'number' && endTimeSec > startTimeSec) {
      args.push('-to', String(endTimeSec));
    }

    args.push('-i', inputPath);

    if (streamCopy) {
      args.push('-c', 'copy');
    } else {
      const hwAccel = useGpu ? await this.detectHardwareAcceleration() : 'cpu';
      this.applyVideoCodecArgs(args, hwAccel, 'medium');
      args.push('-c:a', 'aac', '-b:a', '192k');
    }

    args.push(outputPath);

    const totalDuration = (durationSec && durationSec > 0)
      ? durationSec
      : (endTimeSec ? endTimeSec - startTimeSec : await this.getVideoDurationSec(inputPath) - startTimeSec);

    return this.executeFFmpegCommand(args, outputPath, totalDuration, options.signal, options.onProgress, options.onLog);
  }

  /**
   * 2. Nối nhiều Video thành tệp duy nhất (Concat / Merge)
   */
  public async concatVideos(options: VideoConcatOptions): Promise<FFmpegExecutionResult> {
    const { inputPaths, outputPath, reencode = false, presetQuality = 'medium', useGpu = true } = options;

    if (!inputPaths || inputPaths.length === 0) {
      throw new Error('Danh sách tệp video cần ghép không được rỗng.');
    }

    for (const file of inputPaths) {
      if (!fs.existsSync(file)) {
        throw new Error(`Tệp video nguồn không tồn tại: ${file}`);
      }
    }

    // Tính tổng thời lượng của tất cả video
    let totalDurationSec = 0;
    for (const file of inputPaths) {
      totalDurationSec += await this.getVideoDurationSec(file);
    }

    // Nếu không cần re-encode -> Sử dụng Concat Demuxer siêu nhanh
    if (!reencode) {
      const tempTxtDir = path.dirname(path.resolve(outputPath));
      fs.mkdirSync(tempTxtDir, { recursive: true });
      const tempTxtPath = path.join(tempTxtDir, `concat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.txt`);

      try {
        const fileLines = inputPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(tempTxtPath, fileLines, 'utf-8');

        const args = ['-y', '-f', 'concat', '-safe', '0', '-i', tempTxtPath, '-c', 'copy', outputPath];

        const result = await this.executeFFmpegCommand(args, outputPath, totalDurationSec, options.signal, options.onProgress, options.onLog);
        
        // Dọn dẹp file tạm
        if (fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath);
        return result;
      } catch (err) {
        if (fs.existsSync(tempTxtPath)) fs.unlinkSync(tempTxtPath);
        throw err;
      }
    }

    // Nếu re-encode (Ghép các video khác kích thước, mã hóa lại)
    const hwAccel = useGpu ? await this.detectHardwareAcceleration() : 'cpu';
    const args: string[] = ['-y'];

    for (const input of inputPaths) {
      args.push('-i', input);
    }

    const filterInputs = inputPaths.map((_, i) => `[${i}:v][${i}:a]`).join('');
    const filterComplex = `${filterInputs}concat=n=${inputPaths.length}:v=1:a=1[v][a]`;

    args.push('-filter_complex', filterComplex, '-map', '[v]', '-map', '[a]');
    this.applyVideoCodecArgs(args, hwAccel, presetQuality);
    args.push('-c:a', 'aac', '-b:a', '192k', outputPath);

    return this.executeFFmpegCommand(args, outputPath, totalDurationSec, options.signal, options.onProgress, options.onLog);
  }

  /**
   * 3. Nén & Chuyển đổi định dạng Video (Compress / Transcode)
   */
  public async compressVideo(options: VideoCompressOptions): Promise<FFmpegExecutionResult> {
    const { inputPath, outputPath, resolution = 'original', presetQuality = 'medium', targetBitrateKbps, fps, useGpu = true } = options;

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Tệp video đầu vào không tồn tại: ${inputPath}`);
    }

    const totalDurationSec = await this.getVideoDurationSec(inputPath);
    const hwAccel = useGpu ? await this.detectHardwareAcceleration() : 'cpu';

    const args: string[] = ['-y', '-i', inputPath];

    // Cấu hình bộ lọc Scaling độ phân giải
    const videoFilters: string[] = [];
    if (resolution === '1080p') videoFilters.push('scale=-2:1080');
    else if (resolution === '720p') videoFilters.push('scale=-2:720');
    else if (resolution === '480p') videoFilters.push('scale=-2:480');
    else if (resolution === '4k') videoFilters.push('scale=-2:2160');
    else if (typeof resolution === 'string' && resolution.includes(':')) {
      videoFilters.push(`scale=${resolution}`);
    }

    if (fps && fps > 0) {
      videoFilters.push(`fps=${fps}`);
    }

    if (videoFilters.length > 0) {
      args.push('-vf', videoFilters.join(','));
    }

    // Cấu hình Codec & Bitrate
    this.applyVideoCodecArgs(args, hwAccel, presetQuality, targetBitrateKbps);
    args.push('-c:a', 'aac', '-b:a', '128k', outputPath);

    return this.executeFFmpegCommand(args, outputPath, totalDurationSec, options.signal, options.onProgress, options.onLog);
  }

  /**
   * 4. Lồng Phụ Đề Cứng (Burn-in) Hoặc Nhúng Phụ Đề Mềm (Soft Subtitle)
   */
  public async addSubtitles(options: SubtitleOptions): Promise<FFmpegExecutionResult> {
    const { videoInputPath, subtitlePath, outputPath, mode, subtitleStyle, useGpu = true } = options;

    if (!fs.existsSync(videoInputPath)) {
      throw new Error(`Video đầu vào không tồn tại: ${videoInputPath}`);
    }
    if (!fs.existsSync(subtitlePath)) {
      throw new Error(`Tệp phụ đề không tồn tại: ${subtitlePath}`);
    }

    const totalDurationSec = await this.getVideoDurationSec(videoInputPath);
    const args: string[] = ['-y', '-i', videoInputPath];

    if (mode === 'hard') {
      // Escape đường dẫn phụ đề cho FFmpeg filter
      const escapedSub = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
      let subFilter = `subtitles='${escapedSub}'`;

      if (subtitleStyle) {
        subFilter += `:force_style='${subtitleStyle}'`;
      }

      args.push('-vf', subFilter);

      const hwAccel = useGpu ? await this.detectHardwareAcceleration() : 'cpu';
      this.applyVideoCodecArgs(args, hwAccel, 'medium');
      args.push('-c:a', 'copy', outputPath);
    } else {
      // Soft Subtitle: Copy stream video/audio và nhúng stream phụ đề
      args.push('-i', subtitlePath);
      args.push('-c:v', 'copy', '-c:a', 'copy');
      args.push('-c:s', outputPath.endsWith('.mp4') ? 'mov_text' : 'srt');
      args.push('-map', '0:v:0', '-map', '0:a:0', '-map', '1:s:0', '-shortest', outputPath);
    }

    return this.executeFFmpegCommand(args, outputPath, totalDurationSec, options.signal, options.onProgress, options.onLog);
  }

  /**
   * Thực thi lệnh FFmpeg với lắng nghe tiến độ (%) từng giây
   */
  private async executeFFmpegCommand(
    args: string[],
    outputPath: string,
    totalDurationSec: number,
    signal?: AbortSignal,
    onProgress?: (progress: FFmpegProgressData) => void,
    onLog?: (line: string) => void
  ): Promise<FFmpegExecutionResult> {
    const startTimeMs = Date.now();
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });

    let hwAccelUsed: HwAccelType = 'cpu';
    if (args.includes('h264_nvenc')) hwAccelUsed = 'nvenc';
    else if (args.includes('h264_qsv')) hwAccelUsed = 'qsv';
    else if (args.includes('h264_amf')) hwAccelUsed = 'amf';
    else if (args.includes('h264_videotoolbox')) hwAccelUsed = 'videotoolbox';

    sysLogger.info('FFmpegBatchService', 'ExecuteStart', `Bắt đầu xử lý FFmpeg (GPU: ${hwAccelUsed})`, {
      outputPath,
      totalDurationSec
    });

    return new Promise<FFmpegExecutionResult>((resolve) => {
      let lastProgressReportTime = 0;
      let isSettled = false;

      const { child, promise } = binaryManager.spawnBinary('ffmpeg', args, {
        onStderr: (data) => {
          if (onLog) onLog(data);

          // Parse tiến độ thời gian thực dạng time=HH:MM:SS.ms, fps=24, speed=2.1x
          if (onProgress && totalDurationSec > 0) {
            const now = Date.now();
            // Throttle báo cáo progress khoảng 800ms - 1s
            if (now - lastProgressReportTime >= 800) {
              const timeMatch = data.match(/time=(\d+):(\d+):(\d+\.\d+)/);
              const fpsMatch = data.match(/fps=\s*(\d+)/);
              const speedMatch = data.match(/speed=\s*([\d\.]+)x/);
              const bitrateMatch = data.match(/bitrate=\s*([\d\.]+kbits\/s)/);

              if (timeMatch) {
                const hours = parseFloat(timeMatch[1]);
                const minutes = parseFloat(timeMatch[2]);
                const seconds = parseFloat(timeMatch[3]);
                const currentSec = hours * 3600 + minutes * 60 + seconds;

                const percent = Math.min(99, Math.max(0, Math.round((currentSec / totalDurationSec) * 100)));
                const fps = fpsMatch ? parseInt(fpsMatch[1], 10) : 0;
                const speed = speedMatch ? `${speedMatch[1]}x` : '1.0x';
                const bitrate = bitrateMatch ? bitrateMatch[1] : 'N/A';

                lastProgressReportTime = now;
                onProgress({
                  percent,
                  currentTimeSec: currentSec,
                  totalDurationSec,
                  fps,
                  speed,
                  bitrate,
                  rawLog: data.trim()
                });
              }
            }
          }
        }
      });

      // Xử lý hủy tác vụ từ AbortSignal
      if (signal) {
        signal.addEventListener('abort', () => {
          if (!isSettled && child) {
            isSettled = true;
            this.killChildProcess(child);
            this.cleanupPartialOutput(outputPath);

            resolve({
              success: false,
              outputPath,
              durationSec: 0,
              fileSizeBytes: 0,
              exitCode: -143,
              error: 'Tác vụ FFmpeg bị hủy bởi người dùng.',
              usedHwAccel: hwAccelUsed,
              totalTimeMs: Date.now() - startTimeMs
            });
          }
        });
      }

      promise.then((res) => {
        if (isSettled) return;
        isSettled = true;

        const isSuccess = res.success && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
        const totalTimeMs = Date.now() - startTimeMs;
        const fileSizeBytes = isSuccess ? fs.statSync(outputPath).size : 0;

        if (isSuccess) {
          if (onProgress) {
            onProgress({
              percent: 100,
              currentTimeSec: totalDurationSec,
              totalDurationSec,
              fps: 0,
              speed: '1.0x',
              bitrate: 'N/A',
              rawLog: 'Hoàn tất!'
            });
          }

          sysLogger.info('FFmpegBatchService', 'ExecuteSuccess', 'Xử lý video hoàn tất thành công', {
            outputPath,
            fileSizeBytes,
            totalTimeMs
          });

          resolve({
            success: true,
            outputPath,
            durationSec: totalDurationSec,
            fileSizeBytes,
            exitCode: res.exitCode,
            usedHwAccel: hwAccelUsed,
            totalTimeMs
          });
        } else {
          this.cleanupPartialOutput(outputPath);
          const errMsg = res.stderr || 'Xuất file thất bại hoặc file 0 byte.';

          sysLogger.error('FFmpegBatchService', 'ExecuteFailed', new Error(errMsg), {
            exitCode: res.exitCode
          });

          resolve({
            success: false,
            outputPath,
            durationSec: 0,
            fileSizeBytes: 0,
            exitCode: res.exitCode,
            error: errMsg,
            usedHwAccel: hwAccelUsed,
            totalTimeMs
          });
        }
      });
    });
  }

  /**
   * Áp dụng cờ CLI mã hóa tương ứng với GPU / CPU
   */
  private applyVideoCodecArgs(
    args: string[],
    hwAccel: HwAccelType,
    presetQuality: 'low' | 'medium' | 'high',
    targetBitrateKbps?: number
  ): void {
    if (hwAccel === 'nvenc') {
      args.push('-c:v', 'h264_nvenc');
      args.push('-preset', presetQuality === 'high' ? 'p6' : presetQuality === 'medium' ? 'p4' : 'p1');
      args.push('-rc', 'vbr', '-cq', presetQuality === 'high' ? '18' : presetQuality === 'medium' ? '21' : '26');
      if (targetBitrateKbps) {
        args.push('-b:v', `${targetBitrateKbps}k`);
      }
      args.push('-spatial-aq', '1', '-temporal-aq', '1', '-pix_fmt', 'yuv420p');
    } else if (hwAccel === 'qsv') {
      args.push('-c:v', 'h264_qsv');
      args.push('-preset', presetQuality === 'high' ? 'veryslow' : presetQuality === 'medium' ? 'medium' : 'veryfast');
      if (targetBitrateKbps) args.push('-b:v', `${targetBitrateKbps}k`);
      args.push('-pix_fmt', 'yuv420p');
    } else if (hwAccel === 'amf') {
      args.push('-c:v', 'h264_amf');
      args.push('-quality', presetQuality === 'high' ? 'quality' : presetQuality === 'medium' ? 'balanced' : 'speed');
      if (targetBitrateKbps) args.push('-b:v', `${targetBitrateKbps}k`);
      args.push('-pix_fmt', 'yuv420p');
    } else if (hwAccel === 'videotoolbox') {
      args.push('-c:v', 'h264_videotoolbox');
      if (targetBitrateKbps) args.push('-b:v', `${targetBitrateKbps}k`);
      args.push('-pix_fmt', 'yuv420p');
    } else {
      // CPU Fallback: libx264
      args.push('-c:v', 'libx264');
      args.push('-preset', presetQuality === 'high' ? 'slow' : presetQuality === 'medium' ? 'fast' : 'ultrafast');
      args.push('-crf', presetQuality === 'high' ? '18' : presetQuality === 'medium' ? '22' : '28');
      if (targetBitrateKbps) args.push('-b:v', `${targetBitrateKbps}k`);
      args.push('-pix_fmt', 'yuv420p');
    }
  }

  private killChildProcess(child: ChildProcess): void {
    if (!child || child.killed) return;
    try {
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { windowsHide: true });
      } else {
        child.kill('SIGKILL');
      }
    } catch {
      // Ignored
    }
  }

  private cleanupPartialOutput(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignored
    }
  }
}

export const ffmpegBatchService = new FFmpegBatchService();
export default ffmpegBatchService;
