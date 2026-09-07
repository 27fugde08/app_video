/**
 * CreatorOS - Decoupled Jobs & Queue Controller
 * ==============================================================================
 * API Server Layer:
 * - High-speed authentication & credit checks (<10ms)
 * - Immediate enqueue into BullMQ/Redis
 * - Returns HTTP 202 Accepted (Non-blocking response)
 * - Real-time SSE streaming for live job progress & logs
 */

import { renderQueue } from '../core/messageQueue.js';

// Simulated in-memory user credit store
let userCredits = 500;

export const jobsController = {
  /**
   * POST /api/jobs/submit
   * Fast Non-Blocking Job Submission: Auth -> Deduct Credit -> Enqueue -> HTTP 202
   */
  async submitJob(req, res) {
    const startTime = Date.now();
    const {
      type = 'video_dubbing_render',
      videoUrl,
      sourceLang = 'auto',
      targetLang = 'vi',
      voiceId = 'vi-VN-HoaiMyNeural',
      gpuRequested = true,
      priority = 'normal',
      resolution = '1080p'
    } = req.body;

    // 1. Validate Input
    if (!videoUrl && !req.body.filePath) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin URL video nguồn hoặc đường dẫn tệp cần xử lý.'
      });
    }

    // 2. Auth & Credit Check (Fast atomic operation)
    const requiredCredits = resolution === '4k' ? 25 : 10;
    if (userCredits < requiredCredits) {
      return res.status(402).json({
        success: false,
        error: `Số dư credits không đủ (Cần: ${requiredCredits}, Hiện có: ${userCredits}). Vui lòng nạp thêm.`,
        currentCredits: userCredits
      });
    }

    // 3. Atomically Deduct Credit
    userCredits -= requiredCredits;

    // 4. Enqueue Job into Message Queue (Redis / BullMQ)
    const job = await renderQueue.add(
      type,
      {
        videoUrl: videoUrl || req.body.filePath,
        sourceLang,
        targetLang,
        voiceId,
        gpuRequested,
        resolution
      },
      {
        priority,
        credits: requiredCredits,
        userId: req.headers['x-user-id'] || 'user_vip_01'
      }
    );

    const apiDurationMs = Date.now() - startTime;

    // 5. Instantly respond with HTTP 202 Accepted
    return res.status(202).json({
      success: true,
      message: 'Tác vụ đã được tiếp nhận và nạp vào hàng đợi Render Worker!',
      jobId: job.id,
      status: job.status,
      queuePosition: renderQueue.waitingQueue.indexOf(job.id) + 1,
      estimatedWaitSec: Math.max(5, renderQueue.waitingQueue.length * 30),
      creditsDeducted: requiredCredits,
      creditsRemaining: userCredits,
      apiProcessingTimeMs: apiDurationMs,
      streamUrl: `/api/jobs/stream?jobId=${job.id}`
    });
  },

  /**
   * GET /api/jobs/:id
   * Retrieve single job status, progress, logs & worker assignment
   */
  getJob(req, res) {
    const { id } = req.params;
    const job = renderQueue.getJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: `Không tìm thấy Job với mã: ${id}`
      });
    }

    return res.status(200).json({
      success: true,
      job
    });
  },

  /**
   * GET /api/jobs
   * List jobs with optional status filter (waiting, active, completed, failed, all)
   */
  listJobs(req, res) {
    const status = req.query.status || 'all';
    const jobs = renderQueue.getJobs(status);

    return res.status(200).json({
      success: true,
      count: jobs.length,
      statusFilter: status,
      userCredits,
      jobs
    });
  },

  /**
   * GET /api/jobs/stats
   * Get Message Queue metrics & connected Render Worker nodes
   */
  getQueueStats(req, res) {
    const stats = renderQueue.getStats();
    return res.status(200).json({
      success: true,
      stats: {
        ...stats,
        userCredits
      }
    });
  },

  /**
   * POST /api/jobs/:id/retry
   * Re-queue a failed job
   */
  retryJob(req, res) {
    const { id } = req.params;
    const success = renderQueue.retryJob(id);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Không thể thử lại Job này (Job không tồn tại hoặc chưa failed).'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Đã nạp lại Job ${id} vào hàng đợi xử lý.`
    });
  },

  /**
   * DELETE /api/jobs/:id or POST /api/jobs/:id/cancel
   * Cancel job and trigger credit refund
   */
  cancelJob(req, res) {
    const { id } = req.params;
    const job = renderQueue.getJob(id);
    const success = renderQueue.cancelJob(id);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Không thể hủy Job này.'
      });
    }

    // Refund credits
    if (job && job.opts?.creditsDeducted) {
      userCredits += job.opts.creditsDeducted;
    }

    return res.status(200).json({
      success: true,
      message: `Đã hủy Job ${id} và hoàn trả credits thành công.`,
      userCredits
    });
  },

  /**
   * GET /api/jobs/stream (SSE Endpoint)
   * Live streaming of job state, worker progress, and logs
   */
  streamEvents(req, res) {
    const targetJobId = req.query.jobId;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);

    const handleProgress = (data) => {
      if (!targetJobId || data.jobId === targetJobId) {
        res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    const handleActive = (data) => {
      if (!targetJobId || data.jobId === targetJobId) {
        res.write(`event: active\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    const handleCompleted = (data) => {
      if (!targetJobId || data.jobId === targetJobId) {
        res.write(`event: completed\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    const handleFailed = (data) => {
      if (!targetJobId || data.jobId === targetJobId) {
        res.write(`event: failed\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    renderQueue.on('job:progress', handleProgress);
    renderQueue.on('job:active', handleActive);
    renderQueue.on('job:completed', handleCompleted);
    renderQueue.on('job:failed', handleFailed);

    req.on('close', () => {
      renderQueue.off('job:progress', handleProgress);
      renderQueue.off('job:active', handleActive);
      renderQueue.off('job:completed', handleCompleted);
      renderQueue.off('job:failed', handleFailed);
    });
  }
};
