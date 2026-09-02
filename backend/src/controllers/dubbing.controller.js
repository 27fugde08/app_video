/**
 * CreatorOS Desktop - AI Dubbing Controller
 * 
 * Handles endpoints for AI Video Dubbing, queue scheduling,
 * preset catalogs, and SSE real-time telemetry broadcasts.
 */

import { dubbingQueue } from '../core/dubbingQueue.js';
import { broadcastEvent } from '../server.js';

// Wire up Dubbing Queue Events to Desktop SSE Channel
dubbingQueue.on('job:added', (data) => broadcastEvent('dubbing_added', data));
dubbingQueue.on('job:started', (data) => broadcastEvent('dubbing_started', data));
dubbingQueue.on('job:phase', (data) => broadcastEvent('dubbing_phase', data));
dubbingQueue.on('job:progress', (data) => broadcastEvent('dubbing_progress', data));
dubbingQueue.on('job:completed', (data) => broadcastEvent('dubbing_completed', data));
dubbingQueue.on('job:failed', (data) => broadcastEvent('dubbing_failed', data));
dubbingQueue.on('job:canceled', (data) => broadcastEvent('dubbing_canceled', data));
dubbingQueue.on('queue:drained', (data) => broadcastEvent('dubbing_queue_drained', data));

export const dubbingController = {
  /**
   * 1. Start AI Video Dubbing Job(s)
   * POST /api/dubbing/start
   * Accepts:
   * - { videoPaths: string[], sourceLang, targetLang, voiceId, modelType, useGpu, enableLipSync, apiKey, priority }
   * - Or single job: { filePath: string, ... }
   */
  async startDubbing(req, res) {
    try {
      const {
        videoPaths = [],
        filePath = '',
        sourceLang = 'auto',
        targetLang = 'vi',
        voiceId = 'vi-VN-HoaiMyNeural',
        modelType = 'turbo',
        useGpu = true,
        enableLipSync = true,
        apiKey = '',
        priority = 'normal'
      } = req.body;

      const inputPaths = Array.isArray(videoPaths) && videoPaths.length > 0
        ? videoPaths
        : filePath ? [filePath] : [];

      if (inputPaths.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp ít nhất một đường dẫn video để thực hiện lồng tiếng AI.'
        });
      }

      const enqueuedJobs = [];
      for (const vPath of inputPaths) {
        const title = typeof vPath === 'string' ? vPath.split(/[/\\]/).pop() || 'Video Task' : 'AI Video';
        const job = dubbingQueue.addJob({
          filePath: vPath,
          title,
          sourceLang,
          targetLang,
          voiceId,
          modelType,
          useGpu,
          enableLipSync,
          apiKey,
          priority
        });
        enqueuedJobs.push(job);
      }

      return res.status(200).json({
        success: true,
        message: `Đã nạp ${enqueuedJobs.length} tác vụ lồng tiếng AI vào hàng đợi Daemon.`,
        concurrency: dubbingQueue.concurrency,
        enqueuedCount: enqueuedJobs.length,
        jobs: enqueuedJobs
      });
    } catch (error) {
      console.error('[DubbingController] startDubbing error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi khởi chạy tiến trình lồng tiếng AI.'
      });
    }
  },

  /**
   * 2. Get Real-time Dubbing Queue Status
   * GET /api/dubbing/status
   */
  async getStatus(req, res) {
    try {
      const stats = dubbingQueue.getStats();
      const jobs = dubbingQueue.getAllJobs();

      return res.status(200).json({
        success: true,
        stats,
        jobs
      });
    } catch (error) {
      console.error('[DubbingController] getStatus error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Không thể lấy trạng thái hàng đợi lồng tiếng.'
      });
    }
  },

  /**
   * 3. Cancel a Dubbing Job
   * DELETE /api/dubbing/job/:id (or POST /api/dubbing/cancel/:id)
   */
  async cancelJob(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Job ID là bắt buộc.' });
      }

      const canceled = dubbingQueue.cancelJob(id);
      if (canceled) {
        return res.status(200).json({
          success: true,
          message: `Đã hủy tác vụ lồng tiếng [${id}].`,
          jobId: id
        });
      }

      return res.status(404).json({
        success: false,
        error: `Không tìm thấy tác vụ lồng tiếng '${id}'.`
      });
    } catch (error) {
      console.error('[DubbingController] cancelJob error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi hủy tác vụ lồng tiếng.'
      });
    }
  },

  /**
   * 4. Retrieve Available Voice Presets & AI Models
   * GET /api/dubbing/presets
   */
  async getPresets(req, res) {
    return res.status(200).json({
      success: true,
      languages: [
        { code: 'vi', name: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳' },
        { code: 'en', name: 'Tiếng Anh (English)', flag: '🇺🇸' },
        { code: 'zh', name: 'Tiếng Trung (Chinese)', flag: '🇨🇳' },
        { code: 'ja', name: 'Tiếng Nhật (Japanese)', flag: '🇯🇵' },
        { code: 'ko', name: 'Tiếng Hàn (Korean)', flag: '🇰🇷' },
        { code: 'fr', name: 'Tiếng Pháp (French)', flag: '🇫🇷' },
        { code: 'es', name: 'Tiếng Tây Ban Nha (Spanish)', flag: '🇪🇸' }
      ],
      voices: [
        { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My (Nữ - Truyền cảm / Kể chuyện)', lang: 'vi', gender: 'Female' },
        { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh (Nam - Trầm ấm / Tin tức)', lang: 'vi', gender: 'Male' },
        { id: 'vi-VN-ThaoTrangNeural', name: 'Thảo Trang (Nữ - Năng động / Review)', lang: 'vi', gender: 'Female' },
        { id: 'en-US-JennyNeural', name: 'Jenny (Female - Natural US)', lang: 'en', gender: 'Female' },
        { id: 'en-US-GuyNeural', name: 'Guy (Male - Studio Broadcast)', lang: 'en', gender: 'Male' },
        { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (Female - Douyin Trend)', lang: 'zh', gender: 'Female' }
      ],
      models: [
        { id: 'turbo', name: 'Turbo Speed (Whisper Fast + Edge Neural TTS)', speed: '1.2x Realtime', vramRequired: '2GB' },
        { id: 'pro', name: 'Pro Studio (Large-v3 + CosyVoice + Wav2Lip HD)', speed: '0.8x Realtime', vramRequired: '6GB' }
      ],
      hardwareOptions: [
        { id: 'gpu_nvenc', name: 'NVIDIA GPU Acceleration (CUDA + NVENC)', recommended: true },
        { id: 'cpu_software', name: 'CPU Multi-thread (Software Fallback)', recommended: false }
      ]
    });
  }
};

export default dubbingController;
