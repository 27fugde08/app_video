/**
 * CreatorOS Desktop - Native In-Memory Channel & Concurrency Semaphore
 * ==============================================================================
 * Pattern: Mirrors C# .NET 9 `System.Threading.Channels.Channel<RenderJob>`
 * and `System.Threading.SemaphoreSlim(2, 2)`.
 * 
 * Guarantees:
 * - 100% In-Process, Zero-Dependency (No Redis, No External Broker)
 * - Maximum 2-3 concurrent hardware NVENC rendering tasks to prevent GPU VRAM crashes
 * - Thread-safe FIFO queueing with non-blocking producer and async background consumer
 */

import { EventEmitter } from 'events';
import { executeVideoJob } from '../../workers/videoProcessorWorker.js';

/**
 * Lightweight in-memory Semaphore (matching C# SemaphoreSlim)
 */
export class SemaphoreSlim {
  constructor(initialCount = 2, maxCount = 2) {
    this.currentCount = initialCount;
    this.maxCount = maxCount;
    this.waitQueue = [];
  }

  async waitAsync() {
    if (this.currentCount > 0) {
      this.currentCount--;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release() {
    if (this.waitQueue.length > 0) {
      const nextResolver = this.waitQueue.shift();
      nextResolver();
    } else {
      if (this.currentCount < this.maxCount) {
        this.currentCount++;
      }
    }
  }

  get availableCount() {
    return this.currentCount;
  }
}

/**
 * In-Memory Channel Queue matching System.Threading.Channels.Channel<RenderJob>
 */
export class RenderJobChannel extends EventEmitter {
  constructor(maxConcurrentNvenc = 2) {
    super();
    this.semaphore = new SemaphoreSlim(maxConcurrentNvenc, maxConcurrentNvenc);
    this.queue = [];
    this.activeJobs = new Map();
    this.historyJobs = new Map();
    this.isProcessing = false;
    this.maxConcurrent = maxConcurrentNvenc;

    console.log(`[InMemoryChannel] 🟢 Khởi tạo System.Threading.Channels.Channel<RenderJob> (SemaphoreSlim Concurrency: ${maxConcurrentNvenc})`);
    this.startBackgroundConsumerLoop();
  }

  /**
   * Channel.Writer.TryWrite(job)
   * Enqueues job instantly with O(1) in-memory latency (< 1ms)
   */
  write(jobPayload) {
    const jobRecord = {
      id: jobPayload.jobId,
      status: 'waiting', // waiting | active | completed | failed
      progress: 0,
      stage: 'Queued in Channel',
      data: jobPayload,
      logs: [`[${new Date().toLocaleTimeString()}] Đã thêm vào Channel Queue`],
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      result: null,
      error: null
    };

    this.queue.push(jobRecord);
    this.activeJobs.set(jobRecord.id, jobRecord);
    this.emit('job:enqueued', jobRecord);

    // Notify background reader loop
    this.emit('item:available');
    return jobRecord;
  }

  /**
   * Channel.Reader background consumer loop
   */
  async startBackgroundConsumerLoop() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      if (this.queue.length === 0) {
        // Wait for next item to be written to the channel
        await new Promise((resolve) => this.once('item:available', resolve));
      }

      const jobRecord = this.queue.shift();
      if (!jobRecord) continue;

      // Acquire Semaphore slot for hardware NVENC processing
      await this.semaphore.waitAsync();

      // Launch processing on background worker thread
      this.dispatchWorkerTask(jobRecord)
        .catch((err) => {
          console.error(`[InMemoryChannel] Lỗi ngoài ý muốn: ${err.message}`);
        })
        .finally(() => {
          // Deterministic release of GPU slot
          this.semaphore.release();
        });
    }
  }

  /**
   * Executes job with progress and error boundaries
   */
  async dispatchWorkerTask(jobRecord) {
    jobRecord.status = 'active';
    jobRecord.startedAt = Date.now();
    jobRecord.stage = 'Executing on Local NVENC';
    this.emit('job:started', jobRecord);

    const jobAdapter = {
      id: jobRecord.id,
      data: jobRecord.data,
      updateProgress: async (p) => {
        jobRecord.progress = p;
        this.emit('job:progress', { jobId: jobRecord.id, progress: p });
      },
      log: (msg) => {
        const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
        jobRecord.logs.push(line);
        this.emit('job:log', { jobId: jobRecord.id, log: line });
      }
    };

    try {
      const result = await executeVideoJob(jobAdapter);
      jobRecord.status = 'completed';
      jobRecord.progress = 100;
      jobRecord.finishedAt = Date.now();
      jobRecord.result = result;
      this.historyJobs.set(jobRecord.id, jobRecord);
      this.emit('job:completed', { jobId: jobRecord.id, result });
      console.log(`[InMemoryChannel] ✅ Job #${jobRecord.id} hoàn thành thành công trong ${((jobRecord.finishedAt - jobRecord.startedAt) / 1000).toFixed(1)}s!`);
    } catch (err) {
      jobRecord.status = 'failed';
      jobRecord.finishedAt = Date.now();
      jobRecord.error = err.message;
      this.historyJobs.set(jobRecord.id, jobRecord);
      this.emit('job:failed', { jobId: jobRecord.id, error: err.message });
      console.error(`[InMemoryChannel] ❌ Job #${jobRecord.id} thất bại: ${err.message}`);
    }
  }

  getJob(jobId) {
    return this.activeJobs.get(jobId) || this.historyJobs.get(jobId) || null;
  }

  getMetrics() {
    return {
      queueLength: this.queue.length,
      activeCount: this.maxConcurrent - this.semaphore.availableCount,
      maxConcurrency: this.maxConcurrent,
      completedCount: this.historyJobs.size,
      availableGpuSlots: this.semaphore.availableCount
    };
  }
}

// Global Singleton instance for local in-process channel
export const renderJobChannel = new RenderJobChannel(2);
