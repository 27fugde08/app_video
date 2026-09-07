/**
 * CreatorOS Video SaaS - Video Job Routes (/api/v1/jobs)
 * ==============================================================================
 */

import { Router } from 'express';
import { VideoJobController } from '../controllers/videoJob.controller.js';

const router = Router();

// Submit job to queue (HTTP 202)
router.post('/submit', VideoJobController.submitJob);

// Realtime progress stream (SSE)
router.get('/stream', VideoJobController.streamProgress);

// Channel & concurrency metrics
router.get('/metrics/summary', VideoJobController.getChannelMetrics);

// Check single job status & retrieve local download link
router.get('/:jobId', VideoJobController.getJobStatus);

export default router;
