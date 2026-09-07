/**
 * CreatorOS - Decoupled Jobs API Routes
 * Endpoints for job submission, querying, retrying, cancellation, and SSE progress stream.
 */

import express from 'express';
import { jobsController } from '../controllers/jobs.controller.js';

const router = express.Router();

// Real-time Server-Sent Events stream for queue and workers
router.get('/stream', jobsController.streamEvents);

// Queue statistics & worker nodes
router.get('/stats', jobsController.getQueueStats);

// Submit job (Fast Non-blocking HTTP 202)
router.post('/submit', jobsController.submitJob);

// List all jobs (with optional status query)
router.get('/', jobsController.listJobs);

// Single job details
router.get('/:id', jobsController.getJob);

// Retry failed job
router.post('/:id/retry', jobsController.retryJob);

// Cancel waiting or active job
router.post('/:id/cancel', jobsController.cancelJob);
router.delete('/:id', jobsController.cancelJob);

export default router;
