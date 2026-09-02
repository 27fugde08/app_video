/**
 * CreatorOS - SemaphoreSlim Concurrency Limiter
 * Asynchronous thread/task throttle controlling maximum parallel download executions.
 */

export class SemaphoreSlim {
  private currentCount: number;
  private maxCount: number;
  private queue: Array<() => void> = [];

  constructor(initialCount: number = 3, maxCount: number = 10) {
    this.currentCount = Math.max(1, initialCount);
    this.maxCount = Math.max(1, maxCount);
  }

  /**
   * Current number of available execution slots
   */
  public get availableSlots(): number {
    return this.currentCount;
  }

  /**
   * Total number of waiting tasks in queue
   */
  public get waitingCount(): number {
    return this.queue.length;
  }

  /**
   * Acquire an execution slot asynchronously
   */
  public async waitAsync(): Promise<void> {
    if (this.currentCount > 0) {
      this.currentCount--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release an acquired execution slot and dispatch next waiting task
   */
  public release(): number {
    if (this.queue.length > 0) {
      const nextResolve = this.queue.shift();
      if (nextResolve) {
        // Dispatch next queued item
        setTimeout(nextResolve, 0);
      }
    } else {
      this.currentCount = Math.min(this.maxCount, this.currentCount + 1);
    }
    return this.currentCount;
  }

  /**
   * Dynamically update max concurrency capacity
   */
  public setConcurrency(newConcurrency: number): void {
    const valid = Math.max(1, Math.min(32, newConcurrency));
    const diff = valid - (this.maxCount - this.currentCount);
    this.maxCount = valid;
    
    // If increased slots available, release waiting tasks
    while (this.queue.length > 0 && this.currentCount < this.maxCount) {
      const nextResolve = this.queue.shift();
      if (nextResolve) {
        nextResolve();
      }
    }
  }
}
