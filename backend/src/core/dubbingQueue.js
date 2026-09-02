/**
 * CreatorOS Desktop - AI Dubbing Queue Manager
 * 
 * Central scheduler and event coordinator for video dubbing workflows:
 * - Controls concurrent GPU/CPU worker allocations to avoid VRAM exhaustion
 * - Manages priority queue (High, Normal, Low)
 * - Emits real-time SSE telemetry ticks to Desktop UI Layer
 */

import { EventEmitter } from 'node:events';
import { DubbingWorker } from '../workers/dubbing.worker.js';

export const DubbingJobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled'
};

export class DubbingQueueManager extends EventEmitter {
  /**
   * @param {number} [concurrency=2] - Default max 2 concurrent AI GPU jobs to protect VRAM
   */
  constructor(concurrency = 2) {
    super();
    this.concurrency = concurrency;
    this.jobs = new Map();
    this.activeWorkers = new Map();
    this.isPaused = false;
    this._jobCounter = 1000;
  }

  /**
   * Generate sequential Unique Dubbing Job ID
   */
  generateJobId() {
    this._jobCounter++;
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return `DUB-${this._jobCounter}-${randomSuffix}`;
  }

  /**
   * Add a new dubbing job into the Queue
   * @param {object} jobParams
   */
  addJob(jobParams) {
    const id = jobParams.id || this.generateJobId();

    const job = {
      id,
      filePath: jobParams.filePath || '',
      title: jobParams.title || 'Video AI Dubbing Task',
      sourceLang: jobParams.sourceLang || 'auto',
      targetLang: jobParams.targetLang || 'vi',
      voiceId: jobParams.voiceId || 'vi-VN-HoaiMyNeural',
      modelType: jobParams.modelType || 'turbo',
      useGpu: jobParams.useGpu !== false,
      enableLipSync: jobParams.enableLipSync !== false,
      priority: jobParams.priority || 'normal',
      status: DubbingJobStatus.PENDING,
      progress: 0,
      phase: 'queued',
      phaseMessage: 'Đang xếp hàng đợi GPU...',
      outputPath: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    this.jobs.set(id, job);
    this.emit('job:added', { job });

    // Try processing next job
    setImmediate(() => this._processNext());

    return job;
  }

  /**
   * Internal scheduler: Polls pending jobs and executes worker
   * @private
   */
  async _processNext() {
    if (this.isPaused) return;
    if (this.activeWorkers.size >= this.concurrency) return;

    // Find next pending job sorted by priority
    const priorityWeight = { high: 3, normal: 2, low: 1 };
    const pendingJobs = Array.from(this.jobs.values())
      .filter((j) => j.status === DubbingJobStatus.PENDING)
      .sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));

    if (pendingJobs.length === 0) {
      if (this.activeWorkers.size === 0) {
        this.emit('queue:drained', { timestamp: new Date().toISOString() });
      }
      return;
    }

    const nextJob = pendingJobs[0];
    nextJob.status = DubbingJobStatus.PROCESSING;
    nextJob.startedAt = new Date().toISOString();

    const worker = new DubbingWorker(nextJob);
    this.activeWorkers.set(nextJob.id, worker);

    this.emit('job:started', { jobId: nextJob.id, job: nextJob });

    // Wire up worker events
    worker.on('phase', (data) => {
      nextJob.phase = data.phase;
      nextJob.phaseMessage = data.message;
      this.emit('job:phase', data);
    });

    worker.on('progress', (data) => {
      nextJob.progress = data.progress;
      this.emit('job:progress', data);
    });

    worker.on('completed', (data) => {
      nextJob.status = DubbingJobStatus.COMPLETED;
      nextJob.progress = 100;
      nextJob.outputPath = data.outputPath;
      nextJob.completedAt = data.completedAt;
      this.activeWorkers.delete(nextJob.id);
      this.emit('job:completed', data);
      setImmediate(() => this._processNext());
    });

    worker.on('failed', (data) => {
      nextJob.status = DubbingJobStatus.FAILED;
      nextJob.error = data.error;
      this.activeWorkers.delete(nextJob.id);
      this.emit('job:failed', data);
      setImmediate(() => this._processNext());
    });

    worker.on('canceled', (data) => {
      nextJob.status = DubbingJobStatus.CANCELED;
      this.activeWorkers.delete(nextJob.id);
      this.emit('job:canceled', data);
      setImmediate(() => this._processNext());
    });

    // Fire worker execution
    worker.execute().catch(() => {
      // Handled via worker 'failed' event
    });
  }

  /**
   * Cancel an active or pending job by ID
   * @param {string} jobId 
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const activeWorker = this.activeWorkers.get(jobId);
    if (activeWorker) {
      activeWorker.cancel();
      this.activeWorkers.delete(jobId);
    }

    job.status = DubbingJobStatus.CANCELED;
    this.emit('job:canceled', { jobId });
    setImmediate(() => this._processNext());
    return true;
  }

  /**
   * Return real-time stats
   */
  getStats() {
    const all = Array.from(this.jobs.values());
    return {
      concurrency: this.concurrency,
      active: this.activeWorkers.size,
      pending: all.filter(j => j.status === DubbingJobStatus.PENDING).length,
      completed: all.filter(j => j.status === DubbingJobStatus.COMPLETED).length,
      failed: all.filter(j => j.status === DubbingJobStatus.FAILED).length,
      canceled: all.filter(j => j.status === DubbingJobStatus.CANCELED).length,
      total: all.length
    };
  }

  /**
   * Return all jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Update concurrency limit
   */
  setConcurrency(newLimit) {
    this.concurrency = Math.max(1, Math.min(8, parseInt(newLimit, 10) || 2));
    setImmediate(() => this._processNext());
  }
}

export const dubbingQueue = new DubbingQueueManager(2);
export default dubbingQueue;
