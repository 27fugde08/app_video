/**
 * CreatorOS Desktop - 100% Local File Storage & Explorer Service
 * ==============================================================================
 * Replaces Cloudflare R2 / AWS S3 uploads with direct local disk writes.
 * Target directory: Environment.GetFolderPath(SpecialFolder.MyVideos)/CreatorOS
 * Features:
 * - Deterministic file copy from temp workspace to user Videos folder
 * - Automatic Windows Explorer launch (`explorer.exe /select,"<filePath>"`)
 * - Zero cloud upload latency or external network requirement
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { LOCAL_STORAGE_CONFIG } from '../config/s3.config.js';

export class S3StorageService {
  /**
   * Saves a rendered video file directly into the local Videos/CreatorOS directory
   * @param {string} localFilePath Source file in temporary scratch workspace
   * @param {string} destinationKey Desired filename or relative identifier
   * @param {string} [contentType='video/mp4']
   * @returns {Promise<{ s3Key: string, publicUrl: string, localFilePath: string, sizeBytes: number }>}
   */
  static async uploadFileStream(localFilePath, destinationKey, contentType = 'video/mp4') {
    const stat = await fsPromises.stat(localFilePath);
    const targetDir = LOCAL_STORAGE_CONFIG.outputDirectory;

    // Ensure output directory exists (e.g. C:\Users\<User>\Videos\CreatorOS)
    await fsPromises.mkdir(targetDir, { recursive: true });

    // Clean output filename
    const cleanFileName = path.basename(destinationKey).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalDestPath = path.join(targetDir, cleanFileName);

    // Copy or stream file directly on local filesystem
    await fsPromises.copyFile(localFilePath, finalDestPath);
    console.log(`[LocalStorage] 💾 Đã lưu video hoàn chỉnh vào ổ cứng: ${finalDestPath} (${(stat.size / 1024).toFixed(1)} KB)`);

    // Auto-open explorer if configured
    if (LOCAL_STORAGE_CONFIG.autoOpenExplorer) {
      this.openInExplorer(finalDestPath);
    }

    return {
      s3Key: cleanFileName,
      publicUrl: `file://${finalDestPath.replace(/\\/g, '/')}`,
      localFilePath: finalDestPath,
      sizeBytes: stat.size
    };
  }

  /**
   * Generates a local file:// URL or local path representation
   * @param {string} s3Key
   * @returns {Promise<string>}
   */
  static async getPresignedDownloadUrl(s3Key) {
    const finalPath = path.isAbsolute(s3Key)
      ? s3Key
      : path.join(LOCAL_STORAGE_CONFIG.outputDirectory, s3Key);
    return `file://${finalPath.replace(/\\/g, '/')}`;
  }

  /**
   * Opens the folder in Windows File Explorer (or macOS/Linux desktop file manager)
   * and highlights the newly rendered video file.
   * @param {string} filePath Absolute path to the video file
   */
  static openInExplorer(filePath) {
    try {
      if (process.platform === 'win32') {
        exec(`explorer.exe /select,"${filePath}"`, (err) => {
          if (err) console.warn(`[LocalStorage] Không thể mở Explorer: ${err.message}`);
          else console.log(`[LocalStorage] 📂 Đã mở Windows Explorer tới: ${filePath}`);
        });
      } else if (process.platform === 'darwin') {
        exec(`open -R "${filePath}"`);
      } else {
        exec(`xdg-open "${path.dirname(filePath)}"`);
      }
    } catch (err) {
      console.warn(`[LocalStorage] Lỗi kích hoạt explorer: ${err.message}`);
    }
  }

  /**
   * Deletes a local file if requested
   * @param {string} s3Key
   */
  static async deleteObject(s3Key) {
    try {
      const finalPath = path.isAbsolute(s3Key)
        ? s3Key
        : path.join(LOCAL_STORAGE_CONFIG.outputDirectory, s3Key);
      await fsPromises.rm(finalPath, { force: true });
      console.log(`[LocalStorage] 🗑️ Đã xóa file: ${finalPath}`);
    } catch {
      // ignore
    }
  }
}

