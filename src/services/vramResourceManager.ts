import { SemaphoreSlim } from '../features/downloader/services/SemaphoreSlim';
import { sysLogger } from '../utils/logger';

export interface VRAMUsageStatus {
  totalVramMb: number;
  allocatedVramMb: number;
  freeVramMb: number;
  isGpuAvailable: boolean;
  activeAiTasksCount: number;
}

/**
 * CreatorOS VRAM & GPU Resource Manager
 * Protects NVIDIA GPUs (e.g., GTX 1660 Super 6GB) from CUDA Out-Of-Memory (OOM) crashes
 * by serializing heavy AI tasks (Demucs Audio Separation, Piper TTS, Whisper AI)
 * using a single-slot Semaphore Mutex and invoking cleanup callbacks.
 */
export class VRAMResourceManager {
  private static instance: VRAMResourceManager;
  // Strictly allow max 1 heavy AI GPU task at a time to prevent VRAM overflow
  private gpuMutex: SemaphoreSlim = new SemaphoreSlim(1);
  private activeTaskName: string | null = null;
  private activeTaskStartTime: number = 0;

  private constructor() {}

  public static getInstance(): VRAMResourceManager {
    if (!VRAMResourceManager.instance) {
      VRAMResourceManager.instance = new VRAMResourceManager();
    }
    return VRAMResourceManager.instance;
  }

  /**
   * Acquire GPU VRAM lock, execute heavy AI function, then release lock & clear cache
   */
  public async executeAITask<T>(
    taskName: string,
    taskFn: () => Promise<T>,
    onWaitMessage?: (waitMsg: string) => void
  ): Promise<T> {
    if (this.gpuMutex.availableSlots === 0) {
      const waitMsg = `[GPU Guard] Card đồ họa đang bận xử lý "${this.activeTaskName}". Tác vụ "${taskName}" đang xếp hàng chờ giải phóng VRAM...`;
      sysLogger.warn('VRAMResourceManager', 'QueueWait', waitMsg);
      if (onWaitMessage) onWaitMessage(waitMsg);
    }

    await this.gpuMutex.waitAsync();
    this.activeTaskName = taskName;
    this.activeTaskStartTime = Date.now();

    sysLogger.info('VRAMResourceManager', 'LockAcquired', `Đã cấp phát bộ nhớ GPU cho: ${taskName}`);

    try {
      const result = await taskFn();
      return result;
    } finally {
      this.activeTaskName = null;
      this.activeTaskStartTime = 0;
      this.gpuMutex.release();
      this.clearCudaMemoryCache();
      sysLogger.info('VRAMResourceManager', 'LockReleased', `Đã giải phóng VRAM GPU sau tác vụ: ${taskName}`);
    }
  }

  /**
   * Trigger explicit CUDA VRAM cleanup request
   */
  public clearCudaMemoryCache(): void {
    if (typeof global !== 'undefined' && (global as any).gc) {
      try {
        (global as any).gc();
      } catch {
        // Ignored if gc flag is disabled
      }
    }
  }

  /**
   * Get current status of GPU AI queue
   */
  public getGpuStatus(): { isBusy: boolean; activeTask: string | null; elapsedSec: number } {
    const isBusy = this.gpuMutex.availableSlots === 0;
    const elapsedSec = isBusy ? Math.round((Date.now() - this.activeTaskStartTime) / 1000) : 0;
    return {
      isBusy,
      activeTask: this.activeTaskName,
      elapsedSec
    };
  }
}

export const vramResourceManager = VRAMResourceManager.getInstance();
