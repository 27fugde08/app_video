/**
 * CreatorOS Desktop - Local Video Job API Controller
 * ==============================================================================
 * Fast, non-blocking HTTP 202 Controller for Standalone Local Desktop App.
 * Uses native In-Memory Channel (System.Threading.Channels.Channel<RenderJob>)
 * with SemaphoreSlim(2) concurrency control for local NVENC hardware encoding.
 */

import { CreditWebhookService } from '../services/creditWebhook.service.js';
import { renderJobChannel } from '../core/queue/inMemoryChannel.js';
import { LOCAL_STORAGE_CONFIG } from '../config/s3.config.js';

// SSE clients registry
const activeSseClients = new Set();

// Wire In-Memory Channel events to SSE real-time dispatcher
renderJobChannel.on('job:started', (job) => {
  VideoJobController.broadcastSse({ type: 'job:started', jobId: job.id, stage: job.stage });
});

renderJobChannel.on('job:progress', ({ jobId, progress }) => {
  VideoJobController.broadcastSse({ type: 'job:progress', jobId, progress });
});

renderJobChannel.on('job:log', ({ jobId, log }) => {
  VideoJobController.broadcastSse({ type: 'job:log', jobId, log });
});

renderJobChannel.on('job:completed', ({ jobId, result }) => {
  VideoJobController.broadcastSse({ type: 'job:completed', jobId, result });
});

renderJobChannel.on('job:failed', ({ jobId, error }) => {
  VideoJobController.broadcastSse({ type: 'job:failed', jobId, error });
});

export class VideoJobController {
  /**
   * POST /api/v1/jobs/submit
   * Submits a video rendering task to the in-memory Channel
   */
  static async submitJob(req, res) {
    const startTime = Date.now();
    const {
      videoUrl,
      sourceLang = 'auto',
      targetLang = 'vi',
      voiceId = 'vi-VN-HoaiMyNeural',
      aspectRatio = '9:16',
      resolution = '1080p',
      enableNvenc = true,
      priority = 'high',
      userId = 'local_user'
    } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'URL video không được để trống.'
      });
    }

    // Unlimited Local Pro License (Zero cloud billing)
    const license = CreditWebhookService.deductCredits(userId, 0, 'pending');

    const jobId = `local_job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jobPayload = {
      jobId,
      userId,
      videoUrl,
      sourceLang,
      targetLang,
      voiceId,
      aspectRatio,
      resolution,
      enableNvenc,
      priority,
      createdAt: new Date().toISOString()
    };

    // Write to In-Memory Channel (Channel<RenderJob>.Writer.TryWrite)
    const enqueuedJob = renderJobChannel.write(jobPayload);

    const latencyMs = Date.now() - startTime;
    const metrics = renderJobChannel.getMetrics();

    // Fast non-blocking HTTP 202 Accepted response
    return res.status(202).json({
      success: true,
      statusCode: 202,
      message: 'Tác vụ đã được nạp thành công vào In-Memory Channel (System.Threading.Channels.Channel<RenderJob>).',
      jobId,
      status: 'waiting',
      queue: 'in-memory-channel',
      remainingCredits: license.remainingCredits,
      isUnlimited: true,
      outputDirectory: LOCAL_STORAGE_CONFIG.outputDirectory,
      metrics,
      apiProcessingTimeMs: latencyMs,
      streamUrl: `/api/v1/jobs/stream?jobId=${jobId}`
    });
  }

  /**
   * GET /api/v1/jobs/:jobId
   */
  static async getJobStatus(req, res) {
    const { jobId } = req.params;
    const job = renderJobChannel.getJob(jobId);

    if (job) {
      return res.json({
        success: true,
        ...job
      });
    }

    return res.status(404).json({
      success: false,
      error: `Không tìm thấy job ${jobId}`
    });
  }

  /**
   * GET /api/v1/jobs/metrics
   */
  static async getChannelMetrics(req, res) {
    return res.json({
      success: true,
      mode: '100% Standalone Local Desktop',
      queueType: 'System.Threading.Channels.Channel<RenderJob>',
      semaphoreLimit: 2,
      outputDirectory: LOCAL_STORAGE_CONFIG.outputDirectory,
      metrics: renderJobChannel.getMetrics()
    });
  }

  /**
   * GET /api/v1/jobs/stream
   * Server-Sent Events (SSE) Real-time Stream
   */
  static streamProgress(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const client = { res };
    activeSseClients.add(client);

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now(), mode: 'local_in_memory_channel' })}\n\n`);

    req.on('close', () => {
      activeSseClients.delete(client);
    });
  }

  static broadcastSse(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of activeSseClients) {
      try {
        client.res.write(payload);
      } catch {
        activeSseClients.delete(client);
      }
    }
  }
}

