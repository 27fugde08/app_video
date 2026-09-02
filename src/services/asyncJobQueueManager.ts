/**
 * CreatorOS - Asynchronous Job Queue Manager (worker-app architecture)
 * ==============================================================================
 * Module Node.js / TypeScript quản lý hàng đợi công việc bất đồng bộ đa tiến trình.
 *
 * Tính năng chính:
 * 1. Chạy song song tối đa N tác vụ (Concurrency Control - setConcurrency(n)).
 * 2. Theo dõi trạng thái Task: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'paused'.
 * 3. Tự động lưu state xuống ổ đĩa (JSON File Persistence) để khôi phục khi restart app.
 * 4. Phát sự kiện thời gian thực qua EventEmitter ('task:added', 'task:progress', 'task:success', 'task:failed', 'queue:drained', ...).
 * 5. Hỗ trợ retry tự động khi gặp sự cố, hủy tác vụ qua AbortController, ưu tiên theo Priority.
 */

import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { sysLogger } from '../utils/logger';

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'paused';

export interface JobTask<TData = any, TResult = any> {
  id: string;
  type: string;
  name: string;
  data: TData;
  status: TaskStatus;
  progress: number; // 0 đến 100
  statusText?: string;
  result?: TResult;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  priority: number; // Giá trị càng cao càng được ưu tiên chạy trước
}

export interface EnqueueOptions<TData = any> {
  type: string;
  name: string;
  data: TData;
  maxRetries?: number;
  priority?: number;
}

export type JobWorkerHandler<TData = any, TResult = any> = (
  task: JobTask<TData, TResult>,
  updateProgress: (progress: number, statusText?: string) => void,
  signal: AbortSignal
) => Promise<TResult>;

export interface QueueStats {
  total: number;
  pending: number;
  running: number;
  success: number;
  failed: number;
  cancelled: number;
  concurrency: number;
  isPaused: boolean;
}

export class AsyncJobQueueManager extends EventEmitter {
  private tasks: Map<string, JobTask> = new Map();
  private workers: Map<string, JobWorkerHandler> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  private concurrency: number = 3;
  private activeCount: number = 0;
  private isPaused: boolean = false;
  private persistencePath: string;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor(persistencePath?: string, defaultConcurrency: number = 3) {
    super();
    this.concurrency = Math.max(1, defaultConcurrency);

    // Xác định đường dẫn lưu trữ file state
    if (persistencePath) {
      this.persistencePath = persistencePath;
    } else {
      const isPackaged = process.env.NODE_ENV === 'production';
      const baseDir = isPackaged
        ? path.join((process as any).resourcesPath || process.cwd(), 'data')
        : path.join(process.cwd(), 'Vault', 'State');
      this.persistencePath = path.join(baseDir, 'job_queue_state.json');
    }

    // Tự động khôi phục state từ đĩa nếu có
    this.loadStateFromDisk();
  }

  /**
   * Đăng ký hàm worker handler cho một loại tác vụ (Task Type)
   */
  public registerWorker<TData = any, TResult = any>(
    type: string,
    handler: JobWorkerHandler<TData, TResult>
  ): void {
    this.workers.set(type, handler as JobWorkerHandler);
    sysLogger.info('AsyncJobQueueManager', 'RegisterWorker', `Đã đăng ký worker handler cho loại tác vụ: [${type}]`);
  }

  /**
   * Thay đổi số lượng tác vụ xử lý song song tối đa (N)
   */
  public setConcurrency(n: number): void {
    if (n < 1) return;
    this.concurrency = n;
    sysLogger.info('AsyncJobQueueManager', 'SetConcurrency', `Cập nhật giới hạn xử lý song song: ${n} workers`);
    this.emit('queue:config_changed', { concurrency: this.concurrency });
    this.processNext();
  }

  /**
   * Thêm một công việc mới vào hàng đợi
   */
  public enqueue<TData = any, TResult = any>(options: EnqueueOptions<TData>): JobTask<TData, TResult> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const task: JobTask<TData, TResult> = {
      id,
      type: options.type,
      name: options.name,
      data: options.data,
      status: 'pending',
      progress: 0,
      statusText: 'Đang chờ xử lý trong hàng đợi...',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: options.maxRetries ?? 2,
      priority: options.priority ?? 0
    };

    this.tasks.set(id, task);
    sysLogger.info('AsyncJobQueueManager', 'Enqueue', `Đã thêm task mới [${task.id}] - ${task.name}`);

    this.emit('task:added', task);
    this.emitStateChange();
    this.scheduleSave();

    // Kích hoạt chu kỳ xử lý hàng đợi
    this.processNext();

    return task;
  }

  /**
   * Tạm dừng việc khởi chạy các tác vụ mới trong hàng đợi
   */
  public pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      sysLogger.info('AsyncJobQueueManager', 'Pause', 'Đã tạm dừng hàng đợi Job Queue.');
      this.emit('queue:paused');
      this.emitStateChange();
    }
  }

  /**
   * Tiếp tục chạy hàng đợi
   */
  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      sysLogger.info('AsyncJobQueueManager', 'Resume', 'Tiếp tục vận hành hàng đợi Job Queue.');
      this.emit('queue:resumed');
      this.emitStateChange();
      this.processNext();
    }
  }

  /**
   * Hủy một tác vụ đang chạy hoặc đang chờ
   */
  public cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.status === 'success' || task.status === 'failed' || task.status === 'cancelled') {
      return false;
    }

    // Nếu đang chạy -> gửi tín hiệu abort
    if (task.status === 'running') {
      const controller = this.abortControllers.get(id);
      if (controller) {
        controller.abort();
        this.abortControllers.delete(id);
      }
    }

    task.status = 'cancelled';
    task.statusText = 'Đã hủy tác vụ bởi người dùng.';
    task.completedAt = new Date().toISOString();

    sysLogger.warn('AsyncJobQueueManager', 'CancelTask', `Đã hủy tác vụ [${id}] - ${task.name}`);

    this.emit('task:cancelled', task);
    this.emitStateChange();
    this.scheduleSave();

    return true;
  }

  /**
   * Chạy lại một tác vụ đã thất bại hoặc bị hủy
   */
  public retryTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.status === 'running') return false;

    task.status = 'pending';
    task.progress = 0;
    task.statusText = 'Đang chờ chạy lại...';
    task.error = undefined;
    task.startedAt = undefined;
    task.completedAt = undefined;

    sysLogger.info('AsyncJobQueueManager', 'RetryTask', `Thực hiện chạy lại tác vụ [${id}] - ${task.name}`);

    this.emit('task:retried', task);
    this.emitStateChange();
    this.scheduleSave();

    this.processNext();
    return true;
  }

  /**
   * Xóa các tác vụ đã hoàn tất (success/failed/cancelled) khỏi bộ nhớ
   */
  public clearCompleted(): number {
    let clearedCount = 0;
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'success' || task.status === 'failed' || task.status === 'cancelled') {
        this.tasks.delete(id);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      sysLogger.info('AsyncJobQueueManager', 'ClearCompleted', `Đã dọn dẹp ${clearedCount} tác vụ hoàn thành.`);
      this.emitStateChange();
      this.scheduleSave();
    }

    return clearedCount;
  }

  /**
   * Lấy danh sách tất cả các tác vụ
   */
  public getTasks(): JobTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Lấy thông tin một tác vụ cụ thể theo ID
   */
  public getTask(id: string): JobTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Lấy thống kê số lượng các trạng thái trong hàng đợi
   */
  public getStats(): QueueStats {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      running: tasks.filter((t) => t.status === 'running').length,
      success: tasks.filter((t) => t.status === 'success').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
      concurrency: this.concurrency,
      isPaused: this.isPaused
    };
  }

  /**
   * Vòng lặp điều phối chính (Scheduler Loop) kiểm tra và khởi chạy các task
   */
  private processNext(): void {
    if (this.isPaused) return;
    if (this.activeCount >= this.concurrency) return;

    // Lấy danh sách các task đang 'pending', sắp xếp theo độ ưu tiên (priority giảm dần) và thời gian tạo
    const pendingTasks = Array.from(this.tasks.values())
      .filter((t) => t.status === 'pending')
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    if (pendingTasks.length === 0) {
      if (this.activeCount === 0) {
        this.emit('queue:drained');
      }
      return;
    }

    // Chọn số lượng task có thể khởi chạy dựa trên capacity còn lại
    const availableSlots = this.concurrency - this.activeCount;
    const tasksToRun = pendingTasks.slice(0, availableSlots);

    for (const task of tasksToRun) {
      this.runTask(task);
    }
  }

  /**
   * Xử lý thực thi một task cụ thể
   */
  private async runTask(task: JobTask): Promise<void> {
    const handler = this.workers.get(task.type);
    if (!handler) {
      task.status = 'failed';
      task.error = `Không tìm thấy worker handler cho loại tác vụ: [${task.type}]`;
      task.completedAt = new Date().toISOString();
      sysLogger.error('AsyncJobQueueManager', 'RunTask', new Error(task.error), { taskId: task.id });

      this.emit('task:failed', { task, error: task.error });
      this.emitStateChange();
      this.scheduleSave();
      return;
    }

    this.activeCount++;
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    task.statusText = 'Đang xử lý...';

    const abortController = new AbortController();
    this.abortControllers.set(task.id, abortController);

    sysLogger.info('AsyncJobQueueManager', 'TaskStart', `Khởi chạy tác vụ [${task.id}] (${task.type}) - ${task.name}`);
    this.emit('task:started', task);
    this.emitStateChange();
    this.scheduleSave();

    // Callback cập nhật tiến độ từ worker
    const updateProgress = (progress: number, statusText?: string) => {
      if (task.status !== 'running') return;
      task.progress = Math.max(0, Math.min(100, progress));
      if (statusText) task.statusText = statusText;

      this.emit('task:progress', {
        id: task.id,
        progress: task.progress,
        statusText: task.statusText,
        task
      });
      this.scheduleSave();
    };

    try {
      const result = await handler(task, updateProgress, abortController.signal);

      // Nếu trong lúc chạy tác vụ bị hủy
      if ((task.status as TaskStatus) === 'cancelled' || abortController.signal.aborted) {
        return;
      }

      task.status = 'success';
      task.progress = 100;
      task.statusText = 'Hoàn tất xuất sắc!';
      task.result = result;
      task.completedAt = new Date().toISOString();

      sysLogger.info('AsyncJobQueueManager', 'TaskSuccess', `Tác vụ [${task.id}] hoàn thành thành công.`);
      this.emit('task:success', task);
    } catch (err: any) {
      if ((task.status as TaskStatus) === 'cancelled' || abortController.signal.aborted) {
        return;
      }

      const errMsg = err?.message || String(err) || 'Lỗi không xác định khi thực thi tác vụ';
      sysLogger.error('AsyncJobQueueManager', 'TaskError', err, { taskId: task.id });

      // Kiểm tra tính năng tự động Thử lại (Auto Retry)
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'pending';
        task.progress = 0;
        task.statusText = `Tác vụ bị lỗi (${errMsg}). Tự động thử lại lượt ${task.retryCount}/${task.maxRetries}...`;

        sysLogger.warn(
          'AsyncJobQueueManager',
          'TaskAutoRetry',
          `Lần thử lại ${task.retryCount}/${task.maxRetries} cho tác vụ [${task.id}]`
        );
        this.emit('task:retrying', { task, attempt: task.retryCount, error: errMsg });
      } else {
        task.status = 'failed';
        task.error = errMsg;
        task.statusText = `Thất bại: ${errMsg}`;
        task.completedAt = new Date().toISOString();

        this.emit('task:failed', { task, error: errMsg });
      }
    } finally {
      this.activeCount--;
      this.abortControllers.delete(task.id);

      this.emitStateChange();
      this.scheduleSave();

      // Tiếp tục lấy task mới trong hàng đợi
      this.processNext();
    }
  }

  /**
   * Phát sự kiện thay đổi trạng thái tổng quan hàng đợi
   */
  private emitStateChange(): void {
    this.emit('queue:state_changed', this.getStats());
  }

  /**
   * Lên lịch lưu state xuống ổ đĩa (Debounced Save)
   */
  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.saveStateToDisk();
    }, 500);
  }

  /**
   * Ghi toàn bộ trạng thái Job Queue ra tệp JSON trên đĩa
   */
  private saveStateToDisk(): void {
    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tasksToSave = Array.from(this.tasks.values()).map((t) => {
        // Chuyển các task 'running' thành 'pending' nếu app bị crash/tắt đột ngột
        if (t.status === 'running') {
          return { ...t, status: 'pending' as TaskStatus, statusText: 'Khôi phục từ phiên làm việc trước...' };
        }
        return t;
      });

      const data = {
        updatedAt: new Date().toISOString(),
        concurrency: this.concurrency,
        isPaused: this.isPaused,
        tasks: tasksToSave
      };

      fs.writeFileSync(this.persistencePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      sysLogger.error('AsyncJobQueueManager', 'SaveStateDisk', err, { path: this.persistencePath });
    }
  }

  /**
   * Nạp trạng thái Job Queue từ đĩa khi khởi động
   */
  private loadStateFromDisk(): void {
    try {
      if (!fs.existsSync(this.persistencePath)) return;

      const raw = fs.readFileSync(this.persistencePath, 'utf-8');
      if (!raw || raw.trim().length === 0) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tasks)) {
        this.concurrency = parsed.concurrency || this.concurrency;
        this.isPaused = Boolean(parsed.isPaused);

        for (const t of parsed.tasks) {
          if (t && t.id) {
            // Khôi phục tác vụ đang chạy thành pending
            if (t.status === 'running') {
              t.status = 'pending';
              t.statusText = 'Chờ xử lý tiếp sau khi khởi động lại...';
            }
            this.tasks.set(t.id, t);
          }
        }

        sysLogger.info(
          'AsyncJobQueueManager',
          'LoadStateDisk',
          `Đã khôi phục ${this.tasks.size} tác vụ từ đĩa [${this.persistencePath}]`
        );
      }
    } catch (err: any) {
      sysLogger.error('AsyncJobQueueManager', 'LoadStateDiskError', err, { path: this.persistencePath });
    }
  }
}

// Instance Singleton mặc định
export const asyncJobQueueManager = new AsyncJobQueueManager();
export default asyncJobQueueManager;
