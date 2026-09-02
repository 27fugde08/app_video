/**
 * CreatorOS - High-Performance Job Queue & Worker Concurrency Manager
 * 
 * Manages background download jobs, concurrency throttling (rate-limiting per CPU/RAM),
 * priority scheduling, retry handling, and real-time event broadcasting.
 */

import { EventEmitter } from 'node:events';
import { DownloadWorker } from '../workers/download.worker.js';

export const JobStatus = Object.freeze({
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
  PAUSED: 'paused'
});

export class QueueManager extends EventEmitter {
  /**
   * @param {object} options
   * @param {number} [options.concurrency=3] - Maximum parallel workers (default: 3)
   * @param {number} [options.maxRetries=2] - Maximum retry attempts upon failure
   * @param {boolean} [options.autoStart=true] - Automatically start processing when jobs added
   */
  constructor(options = {}) {
    super();

    this.concurrency = options.concurrency || 3;
    this.maxRetries = options.maxRetries || 2;
    this.autoStart = options.autoStart ?? true;
    this.isPaused = false;

    /** @type {Map<string, object>} Master repository of all jobs by ID */
    this.jobs = new Map();

    /** @type {Array<string>} FIFO pending queue containing job IDs */
    this.pendingQueue = [];

    /** @type {Map<string, DownloadWorker>} Active worker instances keyed by jobId */
    this.activeWorkers = new Map();

    this._jobCounter = 1000;
  }

  /**
   * Generate a unique sequential Job ID
   * @returns {string} e.g. "JOB-1001-kx89a"
   */
  generateJobId() {
    return `JOB-${++this._jobCounter}-${Date.now().toString(36).slice(-5)}`;
  }

  /**
   * Push a new job into the queue
   * @param {object} jobData - Raw payload (url, platform, config, priority, etc.)
   * @returns {object} The created Job Descriptor
   */
  addJob(jobData) {
    const jobId = jobData.id || this.generateJobId();

    const job = {
      id: jobId,
      url: jobData.url || '',
      platform: jobData.platform || 'unknown',
      title: jobData.title || `Task ${jobId}`,
      author: jobData.author || '@creator',
      sizeMb: jobData.sizeMb || 25,
      format: jobData.format || '1080p Full HD',
      config: jobData.config || {},
      priority: jobData.priority || 'normal', // 'high' | 'normal' | 'low'
      status: JobStatus.PENDING,
      progress: 0,
      speed: '0 MB/s',
      etaSeconds: 0,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null
    };

    this.jobs.set(jobId, job);

    // High priority jobs go to front of queue
    if (job.priority === 'high') {
      this.pendingQueue.unshift(jobId);
    } else {
      this.pendingQueue.push(jobId);
    }

    this.emit('job:added', { job, queueLength: this.pendingQueue.length });

    if (this.autoStart && !this.isPaused) {
      this._processNext();
    }

    return job;
  }

  /**
   * Push multiple jobs in a single batch
   * @param {Array<object>} jobList
   * @returns {Array<object>} List of added job descriptors
   */
  addBatch(jobList) {
    if (!Array.isArray(jobList)) return [];
    const added = jobList.map(item => this.addJob(item));
    this.emit('queue:batch_added', { count: added.length, totalQueued: this.pendingQueue.length });
    return added;
  }

  /**
   * Internal scheduler loop - checks concurrency slots and dispatches workers
   * @private
   */
  _processNext() {
    if (this.isPaused) return;

    // Dispatch workers until active count reaches maximum concurrency limit
    while (this.activeWorkers.size < this.concurrency && this.pendingQueue.length > 0) {
      const jobId = this.pendingQueue.shift();
      const job = this.jobs.get(jobId);

      if (!job || job.status === JobStatus.CANCELED) {
        continue;
      }

      this._dispatchWorker(job);
    }

    if (this.activeWorkers.size === 0 && this.pendingQueue.length === 0) {
      this.emit('queue:drained', { timestamp: new Date().toISOString() });
    }
  }

  /**
   * Instantiates and runs a DownloadWorker for a given job
   * @private
   * @param {object} job
   */
  _dispatchWorker(job) {
    job.status = JobStatus.RUNNING;
    job.startedAt = new Date().toISOString();

    const worker = new DownloadWorker(job);
    this.activeWorkers.set(job.id, worker);

    this.emit('job:started', {
      jobId: job.id,
      job,
      activeCount: this.activeWorkers.size,
      pendingCount: this.pendingQueue.length
    });

    // Progress updates from worker
    worker.on('progress', (progressData) => {
      job.progress = progressData.progress;
      job.speed = progressData.speed;
      job.etaSeconds = progressData.etaSeconds;
      job.phase = progressData.phase;

      this.emit('job:progress', {
        jobId: job.id,
        progress: job.progress,
        speed: job.speed,
        etaSeconds: job.etaSeconds,
        phase: job.phase,
        job
      });
    });

    // Phase notifications
    worker.on('phase', (phaseData) => {
      this.emit('job:phase', phaseData);
    });

    // Worker completion
    worker.on('completed', (result) => {
      job.status = JobStatus.COMPLETED;
      job.progress = 100;
      job.speed = 'Done';
      job.completedAt = result.completedAt;
      job.outputPath = result.outputPath;
      job.audioPath = result.audioPath;

      this.activeWorkers.delete(job.id);
      this.emit('job:completed', { jobId: job.id, result, job });

      // Trigger next slot
      this._processNext();
    });

    // Worker failure handling + automatic retry logic
    worker.on('failed', async (failData) => {
      this.activeWorkers.delete(job.id);

      if (job.retryCount < this.maxRetries && !worker.isCanceled) {
        job.retryCount++;
        job.status = JobStatus.PENDING;
        this.pendingQueue.push(job.id);
        console.warn(`[QueueManager] Job ${job.id} failed. Retrying (${job.retryCount}/${this.maxRetries})...`);
        this.emit('job:retry', { jobId: job.id, attempt: job.retryCount, error: failData.error });
      } else {
        job.status = JobStatus.FAILED;
        job.error = failData.error;
        this.emit('job:failed', { jobId: job.id, error: failData.error, job });
      }

      this._processNext();
    });

    // Worker canceled
    worker.on('canceled', () => {
      this.activeWorkers.delete(job.id);
      job.status = JobStatus.CANCELED;
      this.emit('job:canceled', { jobId: job.id, job });
      this._processNext();
    });

    // Start worker execution asynchronously (non-blocking)
    worker.execute().catch((err) => {
      // Errors handled via 'failed' / 'canceled' events
    });
  }

  /**
   * Cancel an active or pending job by ID
   * @param {string} jobId
   * @returns {boolean}
   */
  cancelJob(jobId) {
    // If worker is running, signal it to stop
    if (this.activeWorkers.has(jobId)) {
      const worker = this.activeWorkers.get(jobId);
      worker.cancel();
      return true;
    }

    // If still in pending queue, remove it
    const queueIndex = this.pendingQueue.indexOf(jobId);
    if (queueIndex !== -1) {
      this.pendingQueue.splice(queueIndex, 1);
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = JobStatus.CANCELED;
        this.emit('job:canceled', { jobId, job });
      }
      return true;
    }

    return false;
  }

  /**
   * Pause queue processing (running workers will finish, no new ones will start)
   */
  pause() {
    this.isPaused = true;
    this.emit('queue:paused', { activeCount: this.activeWorkers.size });
  }

  /**
   * Resume queue processing
   */
  resume() {
    this.isPaused = false;
    this.emit('queue:resumed', { pendingCount: this.pendingQueue.length });
    this._processNext();
  }

  /**
   * Clear all pending jobs from the queue
   */
  clearPending() {
    const clearedCount = this.pendingQueue.length;
    for (const id of this.pendingQueue) {
      const job = this.jobs.get(id);
      if (job) job.status = JobStatus.CANCELED;
    }
    this.pendingQueue = [];
    this.emit('queue:cleared', { clearedCount });
    return clearedCount;
  }

  /**
   * Dynamically update the concurrency limit
   * @param {number} newLimit
   */
  setConcurrency(newLimit) {
    const parsed = parseInt(newLimit, 10);
    if (parsed >= 1 && parsed <= 32) {
      const prev = this.concurrency;
      this.concurrency = parsed;
      this.emit('queue:concurrency_changed', { previous: prev, current: this.concurrency });
      this._processNext();
      return true;
    }
    return false;
  }

  /**
   * Get job by ID
   * @param {string} jobId
   * @returns {object|null}
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get list of all jobs with optional status filter
   * @param {string} [filterStatus]
   * @returns {Array<object>}
   */
  getAllJobs(filterStatus) {
    const list = Array.from(this.jobs.values());
    if (filterStatus) {
      return list.filter(j => j.status === filterStatus);
    }
    return list;
  }

  /**
   * Return comprehensive queue metrics
   */
  getStats() {
    const all = Array.from(this.jobs.values());
    return {
      concurrency: this.concurrency,
      isPaused: this.isPaused,
      total: all.length,
      active: this.activeWorkers.size,
      pending: this.pendingQueue.length,
      completed: all.filter(j => j.status === JobStatus.COMPLETED).length,
      failed: all.filter(j => j.status === JobStatus.FAILED).length,
      canceled: all.filter(j => j.status === JobStatus.CANCELED).length
    };
  }
}

// Export singleton queue manager instance
export const downloadQueue = new QueueManager({
  concurrency: 3,
  maxRetries: 2,
  autoStart: true
});
