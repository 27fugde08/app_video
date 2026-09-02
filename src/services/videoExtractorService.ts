/**
 * CreatorOS - Automated Video Metadata Extractor Service (TikTok & Douyin)
 * ==============================================================================
 * Dịch vụ TypeScript wrapper điều khiển module bóc tách video tự động cho TikTok & Douyin.
 *
 * Tính năng chính:
 * 1. Gọi script Python `tiktok_douyin_extractor.py` chạy ngầm.
 * 2. Trích xuất metadata hoàn chỉnh: Tiêu đề, Tác giả, Ảnh bìa high-res, Link Stream No-Watermark HD,
 *    Thống kê tương tác (Likes, Views, Shares), Nhạc nền.
 * 3. Tự động giải mã link ngắn (v.douyin.com, vt.tiktok.com) và vượt cản trở Anti-Bot.
 * 4. Tự động chuyển đổi kết quả thành Payload chuẩn hóa và đẩy trực tiếp vào Async Job Queue (`asyncJobQueueManager`).
 */

import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import EventEmitter from 'events';
import { asyncJobQueueManager } from './asyncJobQueueManager';
import { sysLogger } from '../utils/logger';

export interface TikTokDouyinAuthor {
  id: string;
  nickname: string;
  avatar?: string;
}

export interface TikTokDouyinMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface TikTokDouyinVideoMetadata {
  source: string;
  videoId: string;
  title: string;
  description: string;
  author: TikTokDouyinAuthor;
  coverImage: string;
  directStreamUrl: string;
  audioStreamUrl?: string;
  durationSec: number;
  metrics: TikTokDouyinMetrics;
  hashtags: string[];
  width: number;
  height: number;
}

export interface DownloadQueuePayload {
  taskId: string;
  platform: 'tiktok' | 'douyin' | string;
  url: string;
  originalUrl: string;
  outputFilename: string;
  title: string;
  coverImage: string;
  headers: Record<string, string>;
  metadata: TikTokDouyinVideoMetadata;
}

export interface ExtractorResult {
  success: boolean;
  platform: string;
  rawUrl: string;
  resolvedUrl: string;
  metadata?: TikTokDouyinVideoMetadata;
  downloadPayload?: DownloadQueuePayload;
  error?: string;
}

export interface ExtractionBatchResult {
  total: number;
  items: ExtractorResult[];
}

export interface ExtractOptions {
  proxy?: string;
  onStatusUpdate?: (statusMessage: string) => void;
}

export class VideoExtractorService extends EventEmitter {
  private scriptPath: string;

  constructor() {
    super();
    // Đường dẫn tới python script bóc tách
    this.scriptPath = path.resolve(process.cwd(), 'backend', 'scripts', 'tiktok_douyin_extractor.py');
  }

  /**
   * Bóc tách Metadata của một URL TikTok / Douyin duy nhất
   */
  public async extractUrl(url: string, options: ExtractOptions = {}): Promise<ExtractorResult> {
    sysLogger.info('VideoExtractorService', 'ExtractSingle', `Bắt đầu bóc tách URL: ${url}`);
    
    if (options.onStatusUpdate) {
      options.onStatusUpdate(`Đang gửi yêu cầu bóc tách URL: ${url}`);
    }

    const args: string[] = [this.scriptPath, '--url', url];
    if (options.proxy) {
      args.push('--proxy', options.proxy);
    }

    const rawOutput = await this.runPythonExtractor(args, options.onStatusUpdate);
    const parsedData = this.parseExtractorOutput(rawOutput);

    if (parsedData && parsedData.success !== undefined) {
      return parsedData as ExtractorResult;
    }

    if (parsedData && parsedData.items && parsedData.items.length > 0) {
      return parsedData.items[0];
    }

    return {
      success: false,
      platform: 'unknown',
      rawUrl: url,
      resolvedUrl: url,
      error: 'Không thể parse dữ liệu JSON từ bộ xuất dữ liệu Python.'
    };
  }

  /**
   * Bóc tách hàng loạt danh sách các URL TikTok / Douyin
   */
  public async extractBatch(urls: string[], options: ExtractOptions = {}): Promise<ExtractionBatchResult> {
    if (!urls || urls.length === 0) {
      return { total: 0, items: [] };
    }

    sysLogger.info('VideoExtractorService', 'ExtractBatch', `Bắt đầu bóc tách danh sách ${urls.length} URL`);

    // Ghi tạm danh sách URL vào file tạm
    const tempDir = path.resolve(process.cwd(), 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempListFile = path.join(tempDir, `extract_urls_${Date.now()}.txt`);

    try {
      fs.writeFileSync(tempListFile, urls.join('\n'), 'utf-8');

      const args: string[] = [this.scriptPath, '--file', tempListFile];
      if (options.proxy) {
        args.push('--proxy', options.proxy);
      }

      const rawOutput = await this.runPythonExtractor(args, options.onStatusUpdate);
      const parsedData = this.parseExtractorOutput(rawOutput);

      // Dọn dẹp file tạm
      if (fs.existsSync(tempListFile)) fs.unlinkSync(tempListFile);

      if (parsedData && Array.isArray(parsedData.items)) {
        return parsedData as ExtractionBatchResult;
      } else if (parsedData && parsedData.success !== undefined) {
        return { total: 1, items: [parsedData as ExtractorResult] };
      }

      return { total: 0, items: [] };
    } catch (err: any) {
      if (fs.existsSync(tempListFile)) fs.unlinkSync(tempListFile);
      sysLogger.error('VideoExtractorService', 'ExtractBatchError', err);
      throw err;
    }
  }

  /**
   * Đẩy trực tiếp danh sách kết quả bóc tách vào Hàng đợi Tải xuống Async (`asyncJobQueueManager`)
   */
  public enqueueToDownloadQueue(
    extractedItems: ExtractorResult[],
    outputDirectory: string = 'Vault/Downloads'
  ): string[] {
    const enqueuedTaskIds: string[] = [];

    for (const item of extractedItems) {
      if (item.success && item.downloadPayload) {
        const payload = item.downloadPayload;
        const targetPath = path.join(outputDirectory, payload.outputFilename);

        const task = asyncJobQueueManager.enqueue({
          type: 'video_download',
          name: `[Tải Video ${payload.platform.toUpperCase()}] ${payload.title}`,
          data: {
            url: payload.url,
            originalUrl: payload.originalUrl,
            outputPath: targetPath,
            headers: payload.headers,
            metadata: payload.metadata,
            coverImage: payload.coverImage
          },
          priority: 5,
          maxRetries: 3
        });

        enqueuedTaskIds.push(task.id);
      }
    }

    sysLogger.info(
      'VideoExtractorService',
      'EnqueueQueue',
      `Đã thêm ${enqueuedTaskIds.length} tác vụ tải xuống vào hàng đợi.`
    );

    return enqueuedTaskIds;
  }

  /**
   * Thực thi tiến trình Python script
   */
  private runPythonExtractor(
    args: string[],
    onStatusUpdate?: (msg: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ưu tiên python3 hoặc python
      const pythonBinary = process.platform === 'win32' ? 'python' : 'python3';

      sysLogger.info('VideoExtractorService', 'SpawnPython', `Chạy ${pythonBinary} ${args.join(' ')}`);

      const child = spawn(pythonBinary, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (chunk) => {
        const str = chunk.toString('utf-8');
        stdoutData += str;

        // Bắt log trạng thái từ script
        const lines = str.split('\n');
        for (const line of lines) {
          if (line.startsWith('[EXTRACT_STATUS]') && onStatusUpdate) {
            const statusMsg = line.replace('[EXTRACT_STATUS]', '').trim();
            onStatusUpdate(statusMsg);
          }
        }
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString('utf-8');
      });

      child.on('close', (code) => {
        if (code === 0 || stdoutData.includes('[EXTRACT_RESULT_START]')) {
          resolve(stdoutData);
        } else {
          const err = new Error(`Python script kết thúc với mã lỗi ${code}: ${stderrData}`);
          sysLogger.error('VideoExtractorService', 'PythonError', err);
          reject(err);
        }
      });

      child.on('error', (err) => {
        sysLogger.error('VideoExtractorService', 'SpawnError', err);
        reject(err);
      });
    });
  }

  /**
   * Bóc tách khối JSON nằm giữa thẻ [EXTRACT_RESULT_START] và [EXTRACT_RESULT_END]
   */
  private parseExtractorOutput(rawStdout: string): any {
    try {
      const startTag = '[EXTRACT_RESULT_START]';
      const endTag = '[EXTRACT_RESULT_END]';

      const startIndex = rawStdout.indexOf(startTag);
      const endIndex = rawStdout.indexOf(endTag);

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const jsonText = rawStdout.substring(startIndex + startTag.length, endIndex).trim();
        return JSON.parse(jsonText);
      }

      // Thử parse toàn bộ stdout nếu không có tag
      return JSON.parse(rawStdout.trim());
    } catch (e) {
      sysLogger.warn('VideoExtractorService', 'ParseOutputWarn', 'Không thể parse JSON từ stdout, trả về null', { error: e });
      return null;
    }
  }
}

export const videoExtractorService = new VideoExtractorService();
export default videoExtractorService;
