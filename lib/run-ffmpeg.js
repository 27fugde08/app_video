#!/usr/bin/env node
/**
 * CreatorOS PRO_V40 - FFmpeg Video/Audio Processing Engine (run-ffmpeg.js)
 * ==============================================================================
 * Service thực thi các thao tác xử lý Video/Audio nặng bằng FFmpeg.
 *
 * Yêu cầu kỹ thuật:
 * 1. Hỗ trợ Cắt (Trim), Ghép (Concat), Nén video (Compress) & Tăng tốc phần cứng GPU NVIDIA (NVENC: h264_nvenc / hevc_nvenc).
 * 2. Tự động Trích xuất luồng âm thanh (Extract Audio), Chèn phụ đề (SRT/ASS burn-in), Chuẩn hóa âm lượng (EBU R128 loudnorm).
 * 3. Đọc luồng `stderr` thời gian thực để phân tích Duration & Time, tính toán phần trăm tiến độ (%) và phát sự kiện `progress`.
 * 4. Xử lý ngoại lệ an toàn, hỗ trợ gọi dưới dạng Module import lẫn CLI Worker process.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import EventEmitter from 'events';

/**
 * Chuyển chuỗi thời gian FFmpeg (00:01:23.45) sang tổng số giây (seconds)
 */
export function parseFfmpegTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;

  const hours = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);

  return hours * 3600 + minutes * 60 + seconds;
}

export class FFmpegProcessorEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.ffmpegPath = options.ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg';
    this.useGpu = options.useGpu !== undefined ? options.useGpu : true;
    this.gpuDetected = false;
    this.checkGpuSupport();
  }

  /**
   * Kiểm tra khả năng hỗ trợ mã hóa GPU NVIDIA NVENC
   */
  async checkGpuSupport() {
    try {
      const child = spawn(this.ffmpegPath, ['-encoders'], { windowsHide: true });
      let output = '';
      child.stdout.on('data', (c) => { output += c.toString(); });
      child.stderr.on('data', (c) => { output += c.toString(); });

      child.on('close', () => {
        if (output.includes('h264_nvenc') || output.includes('hevc_nvenc')) {
          this.gpuDetected = true;
          console.log('[FFMPEG_ENGINE] Đã phát hiện Card màn hình NVIDIA (Hỗ trợ NVENC GPU Acceleration).');
        } else {
          this.gpuDetected = false;
          console.log('[FFMPEG_ENGINE] Không phát hiện NVENC GPU, sẽ sử dụng Bộ mã hóa CPU (libx264/libx265).');
        }
      });
    } catch (_) {
      this.gpuDetected = false;
    }
  }

  /**
   * Lấy encoder video phù hợp (GPU NVENC hoặc CPU libx264)
   */
  getVideoEncoder(codec = 'h264') {
    if (this.useGpu && this.gpuDetected) {
      return codec === 'h265' || codec === 'hevc' ? 'hevc_nvenc' : 'h264_nvenc';
    }
    return codec === 'h265' || codec === 'hevc' ? 'libx265' : 'libx264';
  }

  /**
   * Bắn tiến độ (%) ra STDOUT và IPC
   */
  reportProgress(taskId, percent, statusText, extra = {}) {
    const pct = Math.max(0, Math.min(100, Math.round(percent)));
    const logStr = `[PROGRESS] ${taskId || 'ffmpeg_job'} ${pct}% ${statusText}`;
    console.log(logStr);

    const payload = {
      type: 'ffmpeg:progress',
      taskId,
      progress: pct,
      statusText,
      ...extra,
      timestamp: new Date().toISOString()
    };

    this.emit('progress', payload);

    if (process.send) {
      try {
        process.send(payload);
      } catch (_) {}
    }
  }

  /**
   * In log hệ thống
   */
  logConsole(level, message, taskId = null) {
    const timestamp = new Date().toISOString();
    const logStr = `[LOG] [${level.toUpperCase()}] ${taskId ? `[${taskId}] ` : ''}${message}`;
    console.log(logStr);

    this.emit('log', { level, message, taskId, timestamp });

    if (process.send) {
      try {
        process.send({
          type: 'ffmpeg:log',
          level,
          message,
          taskId,
          timestamp
        });
      } catch (_) {}
    }
  }

  /**
   * Lấy thông số thời lượng (Duration) tệp media bằng FFmpeg/FFprobe
   */
  getMediaDuration(inputPath) {
    return new Promise((resolve) => {
      if (!fs.existsSync(inputPath)) return resolve(0);

      const child = spawn(this.ffmpegPath, ['-i', inputPath], { windowsHide: true });
      let stderrData = '';

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('close', () => {
        const match = stderrData.match(/Duration:\s*(\d+:\d+:\d+(?:\.\d+)?)/);
        if (match) {
          const durationSec = parseFfmpegTimeToSeconds(match[1]);
          resolve(durationSec);
        } else {
          resolve(0);
        }
      });

      child.on('error', () => resolve(0));
    });
  }

  /**
   * Thực thi lệnh FFmpeg cốt lõi và theo dõi luồng stderr theo thời gian thực
   */
  runCommand(args, options = {}) {
    const taskId = options.taskId || `ffmpeg_${Date.now()}`;
    const customDuration = options.durationSec || 0;
    const onProgress = options.onProgress;

    return new Promise((resolve, reject) => {
      this.logConsole('info', `Khởi chạy FFmpeg: ${this.ffmpegPath} ${args.join(' ')}`, taskId);

      const child = spawn(this.ffmpegPath, args, { windowsHide: true });
      let stderrLog = '';
      let totalDurationSec = customDuration;

      // Đọc luồng stderr để bắt Duration & time=...
      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrLog += text;

        // Bắt tổng thời lượng Duration nếu chưa có
        if (totalDurationSec === 0) {
          const durMatch = text.match(/Duration:\s*(\d+:\d+:\d+(?:\.\d+)?)/);
          if (durMatch) {
            totalDurationSec = parseFfmpegTimeToSeconds(durMatch[1]);
            this.logConsole('info', `Đã phát hiện tổng thời lượng video: ${totalDurationSec.toFixed(1)}s`, taskId);
          }
        }

        // Bắt mốc thời gian hiện tại time=hh:mm:ss.ms
        const timeMatch = text.match(/time=\s*(\d+:\d+:\d+(?:\.\d+)?)/);
        if (timeMatch) {
          const currentTimeSec = parseFfmpegTimeToSeconds(timeMatch[1]);
          if (totalDurationSec > 0) {
            const percent = (currentTimeSec / totalDurationSec) * 100;
            const statusMsg = `Đang xử lý media (${currentTimeSec.toFixed(1)}s / ${totalDurationSec.toFixed(1)}s)...`;

            this.reportProgress(taskId, percent, statusMsg, { currentTimeSec, totalDurationSec });
            if (onProgress) onProgress(percent, statusMsg);
          }
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.reportProgress(taskId, 100, 'Xử lý FFmpeg hoàn tất thành công!');
          this.logConsole('info', '✅ Tiến trình FFmpeg hoàn thành thành công.', taskId);
          resolve({ success: true, taskId, code, log: stderrLog });
        } else {
          const err = new Error(`Tiến trình FFmpeg thất bại với mã lỗi exit code ${code}`);
          this.logConsole('error', `❌ ${err.message}`, taskId);
          reject(err);
        }
      });

      child.on('error', (err) => {
        this.logConsole('error', `❌ Lỗi khởi chạy FFmpeg child process: ${err.message}`, taskId);
        reject(err);
      });
    });
  }

  // ============================================================================
  // CÁC THAO TÁC XỬ LÝ MEDIA CHUYÊN DỤNG (FFMPEG OPERATIONS)
  // ============================================================================

  /**
   * 1. CẮT VIDEO (Trim Video)
   */
  async trimVideo(inputPath, outputPath, startTimeSec = 0, durationSec = null, options = {}) {
    const taskId = options.taskId || `trim_${Date.now()}`;
    const videoCodec = options.reencode ? this.getVideoEncoder(options.codec) : 'copy';
    const audioCodec = options.reencode ? 'aac' : 'copy';

    const args = ['-y'];
    if (startTimeSec > 0) {
      args.push('-ss', String(startTimeSec));
    }
    args.push('-i', inputPath);

    if (durationSec && durationSec > 0) {
      args.push('-t', String(durationSec));
    }

    args.push('-c:v', videoCodec, '-c:a', audioCodec, outputPath);

    const totalDur = durationSec || (await this.getMediaDuration(inputPath)) - startTimeSec;
    return await this.runCommand(args, { taskId, durationSec: Math.max(1, totalDur) });
  }

  /**
   * 2. GHÉP CÁC VIDEO (Concat Videos)
   */
  async concatVideos(inputPaths, outputPath, options = {}) {
    const taskId = options.taskId || `concat_${Date.now()}`;
    if (!inputPaths || inputPaths.length === 0) {
      throw new Error('Danh sách video cần ghép rỗng.');
    }

    // Tạo tệp concat list tạm thời
    const tempDir = path.dirname(outputPath);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const listFilePath = path.join(tempDir, `concat_list_${Date.now()}.txt`);

    const listContent = inputPaths
      .map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`)
      .join('\n');

    fs.writeFileSync(listFilePath, listContent, 'utf-8');

    // Tính tổng thời lượng của các video
    let totalDur = 0;
    for (const p of inputPaths) {
      totalDur += await this.getMediaDuration(p);
    }

    const videoCodec = options.reencode ? this.getVideoEncoder(options.codec) : 'copy';
    const audioCodec = options.reencode ? 'aac' : 'copy';

    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFilePath,
      '-c:v', videoCodec,
      '-c:a', audioCodec,
      outputPath
    ];

    try {
      const result = await this.runCommand(args, { taskId, durationSec: totalDur });
      if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
      return result;
    } catch (err) {
      if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
      throw err;
    }
  }

  /**
   * 3. NÉN VIDEO & TĂNG TỐC GPU (Compress Video)
   */
  async compressVideo(inputPath, outputPath, options = {}) {
    const taskId = options.taskId || `compress_${Date.now()}`;
    const targetCrf = options.crf !== undefined ? options.crf : 24; // Lower CRF = higher quality
    const targetScale = options.scale || '1080:-2'; // Scale width 1080, keep aspect ratio
    const videoCodec = this.getVideoEncoder(options.codec || 'h264');

    const totalDur = await this.getMediaDuration(inputPath);

    const args = ['-y', '-i', inputPath];

    if (videoCodec.includes('nvenc')) {
      // Tham số nén GPU NVIDIA NVENC
      args.push('-c:v', videoCodec, '-preset', 'p4', '-cq', String(targetCrf), '-b:v', '0');
    } else {
      // Tham số nén CPU
      args.push('-c:v', videoCodec, '-preset', 'medium', '-crf', String(targetCrf));
    }

    if (targetScale) {
      args.push('-vf', `scale=${targetScale}`);
    }

    args.push('-c:a', 'aac', '-b:a', '128k', outputPath);

    return await this.runCommand(args, { taskId, durationSec: totalDur });
  }

  /**
   * 4. TRÍCH XUẤT LUỒNG ÂM THANH (Extract Audio)
   */
  async extractAudio(inputPath, outputPath, format = 'mp3', options = {}) {
    const taskId = options.taskId || `audio_extract_${Date.now()}`;
    const totalDur = await this.getMediaDuration(inputPath);

    const args = ['-y', '-i', inputPath, '-vn'];

    if (format === 'mp3') {
      args.push('-acodec', 'libmp3lame', '-q:a', '2');
    } else if (format === 'wav') {
      args.push('-acodec', 'pcm_s16le', '-ar', '44100');
    } else if (format === 'aac') {
      args.push('-acodec', 'aac', '-b:a', '192k');
    }

    args.push(outputPath);

    return await this.runCommand(args, { taskId, durationSec: totalDur });
  }

  /**
   * 5. CHÈN PHỤ ĐỀ CỨNG (Burn-in Subtitles .SRT / .ASS)
   */
  async burnSubtitles(inputPath, subtitlePath, outputPath, options = {}) {
    const taskId = options.taskId || `subtitles_${Date.now()}`;
    const totalDur = await this.getMediaDuration(inputPath);
    const videoCodec = this.getVideoEncoder(options.codec);

    // Escape đường dẫn phụ đề cho filter FFmpeg
    const normalizedSubPath = path.resolve(subtitlePath)
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:');

    const subFilter = normalizedSubPath.endsWith('.ass')
      ? `ass='${normalizedSubPath}'`
      : `subtitles='${normalizedSubPath}'`;

    const args = [
      '-y',
      '-i', inputPath,
      '-vf', subFilter,
      '-c:v', videoCodec,
      '-c:a', 'copy',
      outputPath
    ];

    return await this.runCommand(args, { taskId, durationSec: totalDur });
  }

  /**
   * 6. CHUẨN HÓA ÂM LƯỢNG CHUẨN PHÁT SÓNG EBU R128 (Loudness Normalization)
   */
  async normalizeAudio(inputPath, outputPath, options = {}) {
    const taskId = options.taskId || `normalize_${Date.now()}`;
    const targetLufs = options.lufs !== undefined ? options.lufs : -16; // -16 LUFS cho Podcast / Video
    const totalDur = await this.getMediaDuration(inputPath);

    const args = [
      '-y',
      '-i', inputPath,
      '-af', `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`,
      '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '192k',
      outputPath
    ];

    return await this.runCommand(args, { taskId, durationSec: totalDur });
  }
}

export const ffmpegProcessor = new FFmpegProcessorEngine();

// ============================================================================
// HỖ TRỢ CHẠY ĐỘC LẬP TỪ CLI WORKER PROCESS
// ============================================================================
if (process.argv[1] && (process.argv[1].endsWith('run-ffmpeg.js') || process.argv[1].includes('run-ffmpeg'))) {
  const args = process.argv.slice(2);
  let taskPayload = null;

  for (const arg of args) {
    if (arg.startsWith('--task=')) {
      taskPayload = arg.substring(arg.indexOf('=') + 1);
    }
  }

  const runTaskObj = async (taskObj) => {
    const { action, inputPath, outputPath, options = {} } = taskObj.data || taskObj;
    const taskId = taskObj.id || `cli_ffmpeg_${Date.now()}`;

    try {
      if (action === 'trim') {
        await ffmpegProcessor.trimVideo(inputPath, outputPath, options.startTimeSec, options.durationSec, { ...options, taskId });
      } else if (action === 'concat') {
        await ffmpegProcessor.concatVideos(options.inputPaths || [inputPath], outputPath, { ...options, taskId });
      } else if (action === 'compress') {
        await ffmpegProcessor.compressVideo(inputPath, outputPath, { ...options, taskId });
      } else if (action === 'extractAudio') {
        await ffmpegProcessor.extractAudio(inputPath, outputPath, options.format || 'mp3', { ...options, taskId });
      } else if (action === 'burnSubtitles') {
        await ffmpegProcessor.burnSubtitles(inputPath, options.subtitlePath, outputPath, { ...options, taskId });
      } else if (action === 'normalizeAudio') {
        await ffmpegProcessor.normalizeAudio(inputPath, outputPath, { ...options, taskId });
      } else {
        throw new Error(`Hành động FFmpeg không được hỗ trợ: ${action}`);
      }
      process.exit(0);
    } catch (err) {
      console.error(`[FFMPEG_CLI_ERROR] Task [${taskId}] thất bại:`, err.message);
      process.exit(1);
    }
  };

  if (taskPayload) {
    try {
      const taskObj = JSON.parse(taskPayload);
      runTaskObj(taskObj);
    } catch (e) {
      console.error('[FFMPEG_CLI] Lỗi parse JSON payload:', e.message);
      process.exit(1);
    }
  } else {
    let buffer = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c) => { buffer += c; });
    process.stdin.on('end', () => {
      if (!buffer.trim()) process.exit(0);
      try {
        const taskObj = JSON.parse(buffer.trim());
        runTaskObj(taskObj);
      } catch (e) {
        console.error('[FFMPEG_CLI] Lỗi parse STDIN JSON:', e.message);
        process.exit(1);
      }
    });
  }
}

export default ffmpegProcessor;
