/**
 * CreatorOS - High-Performance NVIDIA NVENC (h264_nvenc) FFmpeg Service
 * ======================================================================
 * - Prevents OS buffer deadlocks via non-blocking asynchronous stderr line reading
 * - Supports CancellationToken / AbortSignal for complete process tree extermination (SIGKILL / Process Tree Kill)
 * - Real-time progress reporting via IProgress<string> and IProgress<number> callbacks
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CancellationToken } from './CancellationToken';

export interface NvencEncodingConfig {
  inputPath: string;
  outputPath: string;
  ffmpegPath?: string;
  preset?: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7';
  cqValue?: number;
  bitrateKbps?: number;
  customFilter?: string;
  audioBitrate?: string;
  overwrite?: boolean;
}

export interface NvencEncodingResult {
  success: boolean;
  outputPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  exitCode: number;
  error?: string;
}

export type ProgressLogCallback = (logLine: string) => void;
export type ProgressPercentageCallback = (percent: number) => void;

export class FFmpegNvencService {
  private static DURATION_REGEX = /Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/;
  private static TIME_REGEX = /time=(\d{2}):(\d{2}):(\d{2}\.\d+)/;

  /**
   * Executes hardware-accelerated NVENC video encoding with deadlock protection and process tree kill support.
   */
  public async encodeAsync(
    config: NvencEncodingConfig,
    onLog?: ProgressLogCallback,
    onProgressPercent?: ProgressPercentageCallback,
    token?: CancellationToken
  ): Promise<NvencEncodingResult> {
    if (!fs.existsSync(config.inputPath)) {
      throw new Error(`[FFmpeg NVENC] Input file does not exist: ${config.inputPath}`);
    }

    const outputDir = path.dirname(config.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const ffmpegBin = config.ffmpegPath || 'ffmpeg';
    const args = this.buildNvencArguments(config);

    onLog?.(`[FFmpeg NVENC Engine] Executing hardware-accelerated render:`);
    onLog?.(`[FFmpeg Bin] ${ffmpegBin}`);
    onLog?.(`[FFmpeg Args] ${args.join(' ')}`);

    const startTime = Date.now();
    let totalDurationSec = 0;
    const errorLogs: string[] = [];

    return new Promise<NvencEncodingResult>((resolve, reject) => {
      let child: ChildProcess | null = null;

      try {
        child = spawn(ffmpegBin, args, {
          windowsHide: true,
          detached: false
        });
      } catch (err: any) {
        onLog?.(`[FFmpeg Error] Failed to spawn process: ${err.message}`);
        return resolve({
          success: false,
          outputPath: config.outputPath,
          durationSeconds: 0,
          fileSizeBytes: 0,
          exitCode: -1,
          error: err.message
        });
      }

      // Handle CancellationToken Abort / Process Tree Extermination
      let tokenUnsub: (() => void) | null = null;
      if (token) {
        tokenUnsub = token.onCancellationRequested((reason) => {
          if (child && !child.killed) {
            onLog?.(`[FFmpeg NVENC] Received Cancellation Signal (${reason}). Exterminating process tree...`);
            
            try {
              child.stdin?.write('q\n');
            } catch {
              // Ignored
            }

            setTimeout(() => {
              if (child && !child.killed) {
                try {
                  child.kill('SIGKILL');
                } catch {
                  // Process already dead
                }
              }
            }, 300);
          }
        });
      }

      // 1. ASYNCHRONOUS NON-BLOCKING STDERR STREAM READING (PREVENTS DEADLOCK)
      let stderrBuffer = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString('utf8');
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Dispatch real-time log line
          onLog?.(trimmed);
          errorLogs.push(trimmed);

          // Parse total video duration
          if (totalDurationSec === 0) {
            const durMatch = FFmpegNvencService.DURATION_REGEX.exec(trimmed);
            if (durMatch) {
              const h = parseInt(durMatch[1], 10);
              const m = parseInt(durMatch[2], 10);
              const s = parseFloat(durMatch[3]);
              totalDurationSec = h * 3600 + m * 60 + s;
            }
          }

          // Parse render progress timestamp & report percentage
          if (totalDurationSec > 0 && onProgressPercent) {
            const timeMatch = FFmpegNvencService.TIME_REGEX.exec(trimmed);
            if (timeMatch) {
              const h = parseInt(timeMatch[1], 10);
              const m = parseInt(timeMatch[2], 10);
              const s = parseFloat(timeMatch[3]);
              const currentSec = h * 3600 + m * 60 + s;
              const pct = Math.min(100, Math.max(0, (currentSec / totalDurationSec) * 100));
              onProgressPercent(Math.round(pct * 10) / 10);
            }
          }
        }
      });

      // Also drain stdout asynchronously
      child.stdout?.on('data', () => {});

      child.on('error', (err) => {
        if (tokenUnsub) tokenUnsub();
        onLog?.(`[FFmpeg NVENC Process Error] ${err.message}`);
        this.cleanupPartialFile(config.outputPath);
        reject(err);
      });

      child.on('close', (code) => {
        if (tokenUnsub) tokenUnsub();
        const elapsedSec = (Date.now() - startTime) / 1000;

        if (token?.isCancellationRequested) {
          this.cleanupPartialFile(config.outputPath);
          onLog?.('[FFmpeg NVENC] Operation cancelled by user. Cleaned up partial files.');
          return reject(new Error(token.reason || 'Tác vụ đã bị hủy bởi người dùng.'));
        }

        const isSuccess = code === 0 && fs.existsSync(config.outputPath);
        const fileSize = isSuccess ? fs.statSync(config.outputPath).size : 0;

        if (isSuccess) {
          onProgressPercent?.(100);
          onLog?.(`[FFmpeg NVENC Success] Rendering finished in ${elapsedSec.toFixed(2)}s. File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
        } else {
          onLog?.(`[FFmpeg NVENC Error] Process exited with code ${code}`);
          this.cleanupPartialFile(config.outputPath);
        }

        resolve({
          success: isSuccess,
          outputPath: config.outputPath,
          durationSeconds: elapsedSec,
          fileSizeBytes: fileSize,
          exitCode: code ?? -1,
          error: isSuccess ? undefined : errorLogs.slice(-10).join('\n')
        });
      });
    });
  }

  private buildNvencArguments(config: NvencEncodingConfig): string[] {
    const args: string[] = [];

    if (config.overwrite !== false) {
      args.push('-y');
    }

    // Hardware acceleration CUDA flags
    args.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda');

    // Input file
    args.push('-i', config.inputPath);

    // Filter string
    if (config.customFilter) {
      args.push('-vf', config.customFilter);
    }

    // NVENC Encoder settings
    args.push(
      '-c:v', 'h264_nvenc',
      '-preset', config.preset || 'p7',
      '-rc', 'vbr',
      '-cq', String(config.cqValue ?? 19),
      '-b:v', `${config.bitrateKbps || 8000}k`,
      '-maxrate:v', '15000k',
      '-bufsize:v', '30000k',
      '-spatial-aq', '1',
      '-temporal-aq', '1',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', config.audioBitrate || '192k',
      config.outputPath
    );

    return args;
  }

  private cleanupPartialFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignored
    }
  }
}

export const ffmpegNvencService = new FFmpegNvencService();
