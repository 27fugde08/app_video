/**
 * CreatorOS Desktop - Sidecar Binary Resolver
 * 
 * Safely resolves dynamic file paths to external native binaries (.exe)
 * located in local folders according to SETUP_GUIDE.md / SETUP_GUIDE.txt.
 * Does NOT bundle heavy binary files into repository source code.
 */

import path from 'node:path';
import fs from 'node:fs';

export class BinaryResolver {
  constructor() {
    // Priority order: 1. Environment Variable -> 2. Local ./bin folder -> 3. System PATH
    this.binaries = {
      ytdlp: {
        envKey: 'YTDLP_PATH',
        defaultRelPath: path.join('bin', 'ytdlp', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
        fallbackCmd: 'yt-dlp'
      },
      ffmpeg: {
        envKey: 'FFMPEG_PATH',
        defaultRelPath: path.join('bin', 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
        fallbackCmd: 'ffmpeg'
      },
      ffprobe: {
        envKey: 'FFPROBE_PATH',
        defaultRelPath: path.join('bin', 'ffmpeg', process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'),
        fallbackCmd: 'ffprobe'
      },
      python: {
        envKey: 'PYTHON_PATH',
        defaultRelPath: path.join('python_env', process.platform === 'win32' ? 'python.exe' : 'bin/python'),
        fallbackCmd: 'python'
      }
    };
  }

  /**
   * Resolves the executable path for a given sidecar binary.
   * @param {'ytdlp' | 'ffmpeg' | 'ffprobe'} binaryKey 
   * @returns {{ executablePath: string, isLocalSidecar: boolean }}
   */
  resolve(binaryKey) {
    const config = this.binaries[binaryKey];
    if (!config) {
      throw new Error(`[BinaryResolver] Unknown binary key: "${binaryKey}"`);
    }

    // 1. Check if configured via Environment variable
    const envPath = process.env[config.envKey];
    if (envPath) {
      const resolvedEnvPath = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
      if (fs.existsSync(resolvedEnvPath)) {
        return { executablePath: resolvedEnvPath, isLocalSidecar: true };
      }
    }

    // 2. Check local relative directory: ./bin/<tool>/<tool.exe>
    const localPath = path.resolve(process.cwd(), config.defaultRelPath);
    if (fs.existsSync(localPath)) {
      return { executablePath: localPath, isLocalSidecar: true };
    }

    // 3. Fallback to system global PATH command
    return { executablePath: config.fallbackCmd, isLocalSidecar: false };
  }

  /**
   * Diagnostic check of all sidecar tools
   */
  getStatus() {
    const results = {};
    for (const key of Object.keys(this.binaries)) {
      const { executablePath, isLocalSidecar } = this.resolve(key);
      const exists = isLocalSidecar || false;
      results[key] = {
        path: executablePath,
        isLocalSidecar,
        existsLocally: exists
      };
    }
    return results;
  }
}

export const binaryResolver = new BinaryResolver();
export default binaryResolver;
