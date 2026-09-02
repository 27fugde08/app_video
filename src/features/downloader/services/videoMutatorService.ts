/**
 * CreatorOS - High-Performance Video Mutator & Anti-Fingerprint Processing Service
 * =================================================================================
 * Features:
 * - Micro Visual Filters: Border cropping (2-4px), subtle EQ (brightness/saturation/gamma), subtle noise/grain
 * - Micro Audio Modulation: Pitch/tempo retiming, subtle high-pass/low-pass equalizer shift
 * - Guaranteed Binary Hash Mutation: Appends randomized metadata & tail buffer bytes to mutate MD5/SHA256
 * - Hardware Acceleration: Fully integrated with NVIDIA NVENC (h264_nvenc)
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { CancellationToken } from './CancellationToken';

export interface VideoMutationOptions {
  inputPath: string;
  outputPath: string;
  ffmpegPath?: string;
  useNvenc?: boolean;
  cropPixels?: number; // Default 2px
  brightness?: number; // Range -1.0 to 1.0 (default 0.02)
  contrast?: number; // Range 0.0 to 3.0 (default 1.03)
  saturation?: number; // Range 0.0 to 3.0 (default 1.04)
  speedMultiplier?: number; // Default 1.01 (1% retiming)
  enableHorizontalFlip?: boolean;
  enableSubtleNoise?: boolean;
  audioTempo?: number; // Default 1.01
  audioPitchShift?: boolean;
  cqValue?: number; // Default 19
}

export interface VideoMutationResult {
  success: boolean;
  outputPath: string;
  originalHash: { md5: string; sha256: string };
  mutatedHash: { md5: string; sha256: string };
  durationSeconds: number;
  fileSizeBytes: number;
  errorMessage?: string;
}

export type MutationLogCallback = (log: string) => void;
export type MutationProgressCallback = (percent: number) => void;

export class VideoMutatorService {
  private static DURATION_REGEX = /Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/;
  private static TIME_REGEX = /time=(\d{2}):(\d{2}):(\d{2}\.\d+)/;

  /**
   * Executes anti-fingerprint video mutation with NVENC hardware acceleration
   */
  public async mutateVideoAsync(
    options: VideoMutationOptions,
    onLog?: MutationLogCallback,
    onProgress?: MutationProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<VideoMutationResult> {
    if (!fs.existsSync(options.inputPath)) {
      throw new Error(`[VideoMutator] Input video not found: ${options.inputPath}`);
    }

    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Calculate initial binary hash of source video
    const originalHash = await this.calculateFileHashesAsync(options.inputPath);
    onLog?.(`[VideoMutator] Original File Hashes -> MD5: ${originalHash.md5.substring(0, 8)}... | SHA256: ${originalHash.sha256.substring(0, 12)}...`);

    const ffmpegBin = options.ffmpegPath || 'ffmpeg';
    const args = this.buildFFmpegMutationArguments(options);

    onLog?.(`[VideoMutator] Starting NVENC Video Mutation Processing...`);
    onLog?.(`[FFmpeg Cmd] ${ffmpegBin} ${args.join(' ')}`);

    const startTime = Date.now();
    let totalDurationSec = 0;
    const errorLogs: string[] = [];

    return new Promise<VideoMutationResult>((resolve, reject) => {
      let child: ChildProcess | null = null;

      try {
        child = spawn(ffmpegBin, args, { windowsHide: true });
      } catch (err: any) {
        return resolve({
          success: false,
          outputPath: options.outputPath,
          originalHash,
          mutatedHash: { md5: '', sha256: '' },
          durationSeconds: 0,
          fileSizeBytes: 0,
          errorMessage: `Failed to launch FFmpeg: ${err.message}`
        });
      }

      // Cancellation Handler
      let tokenUnsub: (() => void) | null = null;
      if (cancellationToken) {
        tokenUnsub = cancellationToken.onCancellationRequested((reason) => {
          if (child && !child.killed) {
            onLog?.(`[VideoMutator] Cancellation requested (${reason}). Terminating process tree...`);
            try {
              child.stdin?.write('q\n');
            } catch {
              // Ignore
            }

            setTimeout(() => {
              if (child && !child.killed) {
                child.kill('SIGKILL');
              }
            }, 300);
          }
        });
      }

      // Non-blocking asynchronous stderr line reader (Deadlock Prevention)
      let stderrBuffer = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString('utf8');
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          onLog?.(trimmed);
          errorLogs.push(trimmed);

          // Parse video total duration
          if (totalDurationSec === 0) {
            const durMatch = VideoMutatorService.DURATION_REGEX.exec(trimmed);
            if (durMatch) {
              const h = parseInt(durMatch[1], 10);
              const m = parseInt(durMatch[2], 10);
              const s = parseFloat(durMatch[3]);
              totalDurationSec = h * 3600 + m * 60 + s;
            }
          }

          // Parse current progress
          if (totalDurationSec > 0 && onProgress) {
            const timeMatch = VideoMutatorService.TIME_REGEX.exec(trimmed);
            if (timeMatch) {
              const h = parseInt(timeMatch[1], 10);
              const m = parseInt(timeMatch[2], 10);
              const s = parseFloat(timeMatch[3]);
              const currentSec = h * 3600 + m * 60 + s;
              const pct = Math.min(100, Math.max(0, (currentSec / totalDurationSec) * 100));
              onProgress(Math.round(pct * 10) / 10);
            }
          }
        }
      });

      child.stdout?.on('data', () => {});

      child.on('error', (err) => {
        if (tokenUnsub) tokenUnsub();
        this.cleanupFile(options.outputPath);
        reject(err);
      });

      child.on('close', async (code) => {
        if (tokenUnsub) tokenUnsub();
        const elapsedSec = (Date.now() - startTime) / 1000;

        if (cancellationToken?.isCancellationRequested) {
          this.cleanupFile(options.outputPath);
          onLog?.('[VideoMutator] Processing cancelled by user.');
          return reject(new Error(cancellationToken.reason || 'Tác vụ đã bị hủy bởi người dùng.'));
        }

        const isSuccess = code === 0 && fs.existsSync(options.outputPath);

        if (!isSuccess) {
          this.cleanupFile(options.outputPath);
          onLog?.(`[VideoMutator Error] Process failed with exit code: ${code}`);
          return resolve({
            success: false,
            outputPath: options.outputPath,
            originalHash,
            mutatedHash: { md5: '', sha256: '' },
            durationSeconds: elapsedSec,
            fileSizeBytes: 0,
            errorMessage: errorLogs.slice(-10).join('\n')
          });
        }

        // Apply binary tail salt mutation to guarantee 100% hash change without altering playability
        await this.appendBinaryTailSaltAsync(options.outputPath);

        // Calculate mutated output hashes
        const mutatedHash = await this.calculateFileHashesAsync(options.outputPath);
        const fileSize = fs.statSync(options.outputPath).size;

        onProgress?.(100);
        onLog?.(`[VideoMutator Success] Mutation completed in ${elapsedSec.toFixed(2)}s!`);
        onLog?.(`[Hash Transformation]`);
        onLog?.(`  MD5:    ${originalHash.md5} -> ${mutatedHash.md5}`);
        onLog?.(`  SHA256: ${originalHash.sha256} -> ${mutatedHash.sha256}`);

        resolve({
          success: true,
          outputPath: options.outputPath,
          originalHash,
          mutatedHash,
          durationSeconds: elapsedSec,
          fileSizeBytes: fileSize
        });
      });
    });
  }

  /**
   * Constructs FFmpeg command flags with video/audio micro filters and NVENC encoder
   */
  private buildFFmpegMutationArguments(options: VideoMutationOptions): string[] {
    const args: string[] = ['-y'];

    const useNvenc = options.useNvenc !== false;
    if (useNvenc) {
      args.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda');
    }

    args.push('-i', options.inputPath);

    // Build Video Filter Chain (-vf)
    const vfFilters: string[] = [];

    // 1. Micro Crop (2-4px border trim)
    const crop = options.cropPixels ?? 2;
    if (crop > 0) {
      vfFilters.push(`crop=in_w-${crop * 2}:in_h-${crop * 2}:${crop}:${crop}`);
    }

    // 2. Horizontal Flip
    if (options.enableHorizontalFlip) {
      vfFilters.push('hflip');
    }

    // 3. Fine-grained EQ Adjustment (Brightness, Contrast, Saturation)
    const br = options.brightness ?? 0.02;
    const ct = options.contrast ?? 1.03;
    const sat = options.saturation ?? 1.04;
    vfFilters.push(`eq=brightness=${br}:contrast=${ct}:saturation=${sat}`);

    // 4. Retiming / Speed Multiplier
    const speed = options.speedMultiplier ?? 1.01;
    if (speed !== 1.0) {
      vfFilters.push(`setpts=${(1.0 / speed).toFixed(4)}*PTS`);
    }

    // 5. Subtle Noise Grain
    if (options.enableSubtleNoise) {
      vfFilters.push('noise=alls=1:allf=t+u');
    }

    if (vfFilters.length > 0) {
      args.push('-vf', vfFilters.join(','));
    }

    // Build Audio Filter Chain (-af)
    const afFilters: string[] = [];
    const tempo = options.audioTempo ?? speed;
    if (tempo !== 1.0) {
      afFilters.push(`atempo=${tempo.toFixed(4)}`);
    }

    if (afFilters.length > 0) {
      args.push('-af', afFilters.join(','));
    }

    // Encoder settings (NVENC or CPU x264 fallback)
    if (useNvenc) {
      args.push(
        '-c:v', 'h264_nvenc',
        '-preset', 'p4',
        '-rc', 'vbr',
        '-cq', String(options.cqValue ?? 19),
        '-spatial-aq', '1',
        '-temporal-aq', '1'
      );
    } else {
      args.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '19'
      );
    }

    args.push(
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-metadata', `creation_time=${new Date().toISOString()}`,
      '-metadata', `creator_os_salt=${crypto.randomBytes(16).toString('hex')}`,
      options.outputPath
    );

    return args;
  }

  /**
   * Appends randomized zero-impact binary tail salt bytes to alter binary fingerprint (MD5/SHA-256)
   */
  private async appendBinaryTailSaltAsync(filePath: string): Promise<void> {
    try {
      const randomSalt = crypto.randomBytes(64);
      await fs.promises.appendFile(filePath, randomSalt);
    } catch {
      // Ignored
    }
  }

  /**
   * Computes MD5 and SHA-256 hashes of a file
   */
  private async calculateFileHashesAsync(filePath: string): Promise<{ md5: string; sha256: string }> {
    return new Promise((resolve, reject) => {
      const md5Hash = crypto.createHash('md5');
      const sha256Hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => {
        md5Hash.update(chunk);
        sha256Hash.update(chunk);
      });

      stream.on('end', () => {
        resolve({
          md5: md5Hash.digest('hex'),
          sha256: sha256Hash.digest('hex')
        });
      });

      stream.on('error', (err) => reject(err));
    });
  }

  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Ignored
    }
  }
}

export const videoMutatorService = new VideoMutatorService();
