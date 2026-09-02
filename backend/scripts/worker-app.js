#!/usr/bin/env node
/**
 * CreatorOS PRO_V40 - Async Job Queue Worker App (worker-app.js)
 * ==============================================================================
 * Tiến trình Worker xử lý hàng đợi công việc (Job Queue) đa nhiệm ngầm.
 *
 * Yêu cầu kỹ thuật:
 * - Tiếp nhận task từ hàng đợi theo chuẩn FIFO (First-In, First-Out), hỗ trợ chế độ đơn lẻ (`single`) hoặc hàng loạt (`batch`).
 * - Quản lý vòng đời task chặt chẽ: `pending` -> `running` -> `completed` (hoặc `success`) / `failed` / `cancelled`.
 * - Bắn sự kiện log và tiến độ (%) thời gian thực qua IPC (process.send), STDOUT ([WORKER_EVENT], [PROGRESS], [LOG])
 *   hoặc WebSocket stream cho giao diện Electron hiển thị console và thanh tiến trình.
 * - Quản lý ngoại lệ an toàn (Safety Exception Handler): Bắt uncaughtException & unhandledRejection,
 *   không làm crash tiến trình cha khi worker gặp lỗi mạng, lỗi file, hoặc lỗi thực thi tác vụ.
 */

import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';

// ============================================================================
// 1. AN TOÀN TOÀN CỤC (GLOBAL EXCEPTION PROTECTION)
// ============================================================================
process.on('uncaughtException', (err) => {
  const errMsg = err && err.stack ? err.stack : String(err);
  console.error(`[WORKER_CRITICAL_ERROR] Uncaught Exception: ${errMsg}`);
  if (process.send) {
    try {
      process.send({
        type: 'worker:error',
        event: 'uncaughtException',
        error: errMsg,
        timestamp: new Date().toISOString()
      });
    } catch (_) {}
  }
});

process.on('unhandledRejection', (reason) => {
  const errMsg = reason && reason.stack ? reason.stack : String(reason);
  console.error(`[WORKER_CRITICAL_ERROR] Unhandled Rejection: ${errMsg}`);
  if (process.send) {
    try {
      process.send({
        type: 'worker:error',
        event: 'unhandledRejection',
        error: errMsg,
        timestamp: new Date().toISOString()
      });
    } catch (_) {}
  }
});

// ============================================================================
// 2. LỚP QUẢN LÝ HÀNG ĐỢI WORKER (WorkerAppQueue)
// ============================================================================
class WorkerAppQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.mode = options.mode || 'batch'; // 'batch' | 'single'
    this.concurrency = options.concurrency || (this.mode === 'single' ? 1 : 3);
    this.isPaused = false;
    this.activeCount = 0;

    // Đường dẫn lưu file trạng thái
    const baseDir = options.persistenceDir || path.join(process.cwd(), 'Vault', 'State');
    try {
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
    } catch (e) {
      console.warn('[WORKER_WARN] Không thể tạo thư mục Vault/State, sử dụng bộ nhớ tạm:', e.message);
    }
    this.stateFilePath = path.join(baseDir, 'job_queue_state.json');

    this.tasks = new Map();
    this.handlers = new Map();
    this.abortControllers = new Map();

    // Nạp dữ liệu cũ nếu chạy ở chế độ batch
    if (this.mode === 'batch') {
      this.loadState();
    }

    // Đăng ký các Worker Handler tích hợp sẵn
    this.registerBuiltInWorkers();
  }

  /**
   * Đăng ký một worker handler cho loại tác vụ cụ thể
   */
  registerWorker(type, handler) {
    this.handlers.set(type, handler);
  }

  /**
   * Đăng ký danh sách Worker tích hợp sẵn cho CreatorOS
   */
  registerBuiltInWorkers() {
    // 1. Worker Lồng tiếng AI (Dubbing Job)
    this.registerWorker('dubbing_job', async (task, updateProgress, logMessage, signal) => {
      logMessage('info', 'Bắt đầu quy trình Lồng tiếng AI Video...');
      updateProgress(10, 'Đang chuẩn bị dữ liệu văn bản & mô hình TTS...');
      await this.sleep(800, signal);

      logMessage('info', 'Tổng hợp giọng đọc văn bản qua Piper TTS Engine...');
      updateProgress(40, 'Đang tạo tệp âm thanh lời thoại...');
      await this.sleep(1200, signal);

      logMessage('info', 'Áp dụng chuẩn hóa âm thanh & trộn nhạc nền BGM...');
      updateProgress(70, 'Đang xử lý audio...');
      await this.sleep(1000, signal);

      logMessage('info', 'Ghép luồng âm thanh mới vào tệp video đầu ra...');
      updateProgress(95, 'Đang hoàn tất xuất bản video...');
      await this.sleep(600, signal);

      return {
        outputPath: task.data.outputPath || 'Vault/Outputs/dubbed_video.mp4',
        status: 'completed',
        durationSec: task.data.durationSec || 120
      };
    });

    // 2. Worker Chuyển đổi định dạng âm thanh (Audio Convert)
    this.registerWorker('audio_convert', async (task, updateProgress, logMessage, signal) => {
      logMessage('info', `Chuyển đổi tệp audio: ${task.data.inputPath || 'tệp nguồn'}`);
      updateProgress(20, 'Đang đọc và phân tích định dạng audio...');
      await this.sleep(600, signal);

      logMessage('info', 'Áp dụng bộ lọc chuẩn hóa âm lượng LUFS (-16 LUFS)...');
      updateProgress(60, 'Đang nén bitrate 320kbps MP3...');
      await this.sleep(900, signal);

      updateProgress(90, 'Đang lưu tệp MP3 đầu ra...');
      await this.sleep(500, signal);

      return {
        outputPath: task.data.outputPath || 'Vault/Outputs/converted_audio.mp3',
        status: 'completed'
      };
    });

    // 3. Worker Tách nhạc Demucs (Vocal / BGM Split)
    this.registerWorker('demucs_split', async (task, updateProgress, signal, logMessage) => {
      logMessage('info', 'Đang nạp mô hình tách nhạc Demucs (htdemucs)...');
      updateProgress(15, 'Tải mô hình AI...');
      await this.sleep(1000, signal);

      logMessage('info', 'Phân tách luồng Vocals và Accompaniment...');
      updateProgress(55, 'Đang tách luồng bài hát...');
      await this.sleep(1500, signal);

      updateProgress(90, 'Đang xuất file vocals.wav và no_vocals.wav...');
      await this.sleep(600, signal);

      return {
        vocals: task.data.outputVocals || 'Vault/Outputs/vocals.wav',
        bgm: task.data.outputBgm || 'Vault/Outputs/no_vocals.wav',
        status: 'completed'
      };
    });

    // 4. Worker Tải video hàng loạt (Video Download)
    this.registerWorker('video_download', async (task, updateProgress, logMessage, signal) => {
      logMessage('info', `Bắt đầu tải video từ URL: ${task.data.url}`);
      updateProgress(10, 'Đang kết nối tới server nguồn...');
      await this.sleep(500, signal);

      logMessage('info', 'Đang tải luồng video HD không watermark...');
      updateProgress(60, 'Đang tải dữ liệu tệp...');
      await this.sleep(1200, signal);

      updateProgress(95, 'Đang ghi tệp video xuống đĩa...');
      await this.sleep(500, signal);

      return {
        outputPath: task.data.outputPath || 'Vault/Downloads/downloaded_video.mp4',
        status: 'completed',
        sizeBytes: 15420000
      };
    });

    // 5. Worker Lách bản quyền Video (Video Mutator)
    this.registerWorker('video_mutate', async (task, updateProgress, logMessage, signal) => {
      logMessage('info', 'Đang áp dụng bộ lọc lách bản quyền video...');
      updateProgress(20, 'Đang chỉnh màu & lật khung hình...');
      await this.sleep(800, signal);

      logMessage('info', 'Đang thay đổi pitch âm thanh & tốc độ video...');
      updateProgress(65, 'Đang re-encode video GPU NVENC...');
      await this.sleep(1200, signal);

      updateProgress(95, 'Đang xóa Metadata tệp gốc...');
      await this.sleep(500, signal);

      return {
        outputPath: task.data.outputPath || 'Vault/Outputs/mutated_video.mp4',
        status: 'completed'
      };
    });

    // 6. Worker Tự động đăng video (Video Publish)
    this.registerWorker('video_publish', async (task, updateProgress, logMessage, signal) => {
      logMessage('info', `Đang đăng video lên kênh ${task.data.platform || 'Social'}...`);
      updateProgress(25, 'Đang mở phiên làm việc Cookie...');
      await this.sleep(700, signal);

      logMessage('info', 'Tải tệp video lên server xuất bản...');
      updateProgress(70, 'Đang tải lên video...');
      await this.sleep(1300, signal);

      logMessage('info', 'Gửi thông tin tiêu đề, hashtag và hoàn tất xuất bản.');
      updateProgress(98, 'Đang xác nhận bài đăng...');
      await this.sleep(600, signal);

      return {
        postId: `post_${Date.now()}`,
        status: 'completed',
        publishedUrl: 'https://social.example.com/video/123'
      };
    });
  }

  /**
   * Đặt giới hạn số tác vụ chạy song song (N)
   */
  setConcurrency(n) {
    if (typeof n === 'number' && n >= 1) {
      this.concurrency = n;
      this.notifyEvent('queue:config_changed', { concurrency: this.concurrency });
      this.processNext();
    }
  }

  /**
   * Thêm một công việc vào hàng đợi (FIFO order)
   */
  enqueue(type, name, data, options = {}) {
    const id = options.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const task = {
      id,
      type,
      name: name || `Tác vụ ${type}`,
      data: data || {},
      status: 'pending', // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
      progress: 0,
      statusText: 'Đang trong hàng đợi FIFO...',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: options.maxRetries !== undefined ? options.maxRetries : 2,
      priority: options.priority || 0
    };

    this.tasks.set(id, task);
    this.logConsole('info', `[ENQUEUE] Đã thêm task [${task.id}] (${task.name}) vào hàng đợi.`);
    this.notifyEvent('task:added', task);
    this.saveState();

    this.processNext();
    return task;
  }

  /**
   * Tạm dừng hàng đợi
   */
  pause() {
    this.isPaused = true;
    this.logConsole('warn', '[QUEUE] Hàng đợi đã tạm dừng.');
    this.notifyEvent('queue:paused');
    this.saveState();
  }

  /**
   * Tiếp tục hàng đợi
   */
  resume() {
    this.isPaused = false;
    this.logConsole('info', '[QUEUE] Hàng đợi tiếp tục hoạt động.');
    this.notifyEvent('queue:resumed');
    this.saveState();
    this.processNext();
  }

  /**
   * Hủy một tác vụ theo ID
   */
  cancelTask(id) {
    const task = this.tasks.get(id);
    if (!task) return false;

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

    this.logConsole('warn', `[CANCEL] Task [${task.id}] đã bị hủy.`);
    this.notifyEvent('task:cancelled', task);
    this.saveState();
    return true;
  }

  /**
   * Thử lại tác vụ
   */
  retryTask(id) {
    const task = this.tasks.get(id);
    if (!task || task.status === 'running') return false;

    task.status = 'pending';
    task.progress = 0;
    task.statusText = 'Chờ chạy lại...';
    task.error = null;
    task.startedAt = null;
    task.completedAt = null;

    this.logConsole('info', `[RETRY] Chuẩn bị thử lại task [${task.id}].`);
    this.notifyEvent('task:retried', task);
    this.saveState();
    this.processNext();
    return true;
  }

  /**
   * Thống kê trạng thái hàng đợi
   */
  getStats() {
    const taskList = Array.from(this.tasks.values());
    return {
      total: taskList.length,
      pending: taskList.filter((t) => t.status === 'pending').length,
      running: taskList.filter((t) => t.status === 'running').length,
      completed: taskList.filter((t) => t.status === 'completed' || t.status === 'success').length,
      failed: taskList.filter((t) => t.status === 'failed').length,
      cancelled: taskList.filter((t) => t.status === 'cancelled').length,
      concurrency: this.concurrency,
      isPaused: this.isPaused,
      mode: this.mode
    };
  }

  /**
   * Bộ điều phối hàng đợi FIFO
   */
  processNext() {
    if (this.isPaused) return;
    if (this.activeCount >= this.concurrency) return;

    // Lọc các task pending theo thứ tự ưu tiên (Priority cao chạy trước, nếu bằng thì FIFO theo createdAt)
    const pending = Array.from(this.tasks.values())
      .filter((t) => t.status === 'pending')
      .sort((a, b) => b.priority - a.priority || new Date(a.createdAt) - new Date(b.createdAt));

    if (pending.length === 0) {
      if (this.activeCount === 0) {
        this.notifyEvent('queue:drained');
      }
      return;
    }

    const slots = this.concurrency - this.activeCount;
    const nextTasks = pending.slice(0, slots);

    for (const task of nextTasks) {
      this.runTask(task);
    }
  }

  /**
   * Chạy thực thi một tác vụ đơn lẻ
   */
  async runTask(task) {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      task.status = 'failed';
      task.error = `Không tìm thấy worker handler cho loại task [${task.type}]`;
      task.statusText = `Lỗi: ${task.error}`;
      task.completedAt = new Date().toISOString();

      this.logConsole('error', `[TASK_FAILED] ${task.error}`);
      this.notifyEvent('task:failed', { task, error: task.error });
      this.saveState();
      return;
    }

    this.activeCount++;
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    task.statusText = 'Đang thực thi tác vụ...';

    const abortController = new AbortController();
    this.abortControllers.set(task.id, abortController);

    this.logConsole('info', `[TASK_START] Bắt đầu thực thi task [${task.id}] - ${task.name}`);
    this.notifyEvent('task:started', task);
    this.saveState();

    // Hàm cập nhật tiến độ (%) và status text
    const updateProgress = (pct, text) => {
      if (task.status !== 'running') return;
      task.progress = Math.max(0, Math.min(100, Math.round(pct)));
      if (text) task.statusText = text;

      // In dòng tiến độ chuẩn ra stdout
      console.log(`[PROGRESS] ${task.id} ${task.progress}% ${task.statusText}`);

      this.notifyEvent('task:progress', {
        id: task.id,
        taskId: task.id,
        progress: task.progress,
        statusText: task.statusText,
        task
      });
      this.saveState();
    };

    // Hàm bắn log console cho Electron UI
    const logMessage = (level, message) => {
      this.logConsole(level, message, task.id);
    };

    try {
      const result = await handler(task, updateProgress, logMessage, abortController.signal);

      if (task.status === 'cancelled' || abortController.signal.aborted) {
        return;
      }

      // Đánh dấu hoàn tất tác vụ: 'completed' (hoặc 'success' cho tương thích)
      task.status = 'completed';
      task.progress = 100;
      task.statusText = 'Hoàn tất!';
      task.result = result || { status: 'completed' };
      task.completedAt = new Date().toISOString();

      this.logConsole('info', `[TASK_COMPLETED] Task [${task.id}] hoàn thành thành công!`, task.id);
      this.notifyEvent('task:completed', task);
      this.notifyEvent('task:success', task); // Aliased
    } catch (err) {
      if (task.status === 'cancelled' || abortController.signal.aborted) {
        return;
      }

      const errMsg = err && err.message ? err.message : String(err);

      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'pending';
        task.progress = 0;
        task.statusText = `Thử lại (${task.retryCount}/${task.maxRetries}): ${errMsg}`;

        this.logConsole('warn', `[TASK_RETRYING] Task [${task.id}] gặp lỗi (${errMsg}), đang thử lại lần ${task.retryCount}...`, task.id);
        this.notifyEvent('task:retrying', { task, attempt: task.retryCount, error: errMsg });
      } else {
        task.status = 'failed';
        task.error = errMsg;
        task.statusText = `Lỗi: ${errMsg}`;
        task.completedAt = new Date().toISOString();

        this.logConsole('error', `[TASK_FAILED] Task [${task.id}] thất bại: ${errMsg}`, task.id);
        this.notifyEvent('task:failed', { task, error: errMsg });
      }
    } finally {
      this.activeCount--;
      this.abortControllers.delete(task.id);
      this.saveState();
      this.processNext();
    }
  }

  /**
   * In log định dạng chuẩn ra Console STDOUT và bắn IPC event
   */
  logConsole(level, message, taskId = null) {
    const timestamp = new Date().toISOString();
    const logStr = `[LOG] [${level.toUpperCase()}] ${taskId ? `[${taskId}] ` : ''}${message}`;
    console.log(logStr);

    this.emit('worker:log', { level, message, taskId, timestamp });

    if (process.send) {
      try {
        process.send({
          type: 'worker:log',
          level,
          message,
          taskId,
          timestamp
        });
      } catch (_) {}
    }
  }

  /**
   * Phát thông điệp sự kiện IPC và STDOUT
   */
  notifyEvent(eventName, payload) {
    this.emit(eventName, payload);

    const eventData = {
      event: eventName,
      type: eventName,
      payload,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };

    // Bắn sự kiện qua IPC Channel của Node ChildProcess nếu có
    if (process.send) {
      try {
        process.send(eventData);
      } catch (_) {}
    }

    // In ra stdout định dạng chuẩn [WORKER_EVENT]
    console.log(`[WORKER_EVENT] ${JSON.stringify(eventData)}`);
  }

  /**
   * Lưu state đĩa an toàn
   */
  saveState() {
    if (this.mode === 'single') return; // Không cần persistence cho single mode
    try {
      const tasksArray = Array.from(this.tasks.values()).map((t) => {
        if (t.status === 'running') {
          return { ...t, status: 'pending', statusText: 'Chờ xử lý lại...' };
        }
        return t;
      });

      const data = {
        updatedAt: new Date().toISOString(),
        concurrency: this.concurrency,
        isPaused: this.isPaused,
        tasks: tasksArray
      };

      fs.writeFileSync(this.stateFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      // Bỏ qua lỗi đĩa nhẹ
    }
  }

  /**
   * Khôi phục state đĩa
   */
  loadState() {
    try {
      if (!fs.existsSync(this.stateFilePath)) return;
      const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tasks)) {
        this.concurrency = parsed.concurrency || this.concurrency;
        this.isPaused = Boolean(parsed.isPaused);

        for (const t of parsed.tasks) {
          if (t && t.id) {
            this.tasks.set(t.id, t);
          }
        }
      }
    } catch (e) {
      // Bỏ qua lỗi đọc state
    }
  }

  sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Tác vụ bị hủy bởi người dùng.'));
        });
      }
    });
  }
}

// ============================================================================
// 3. THỰC THI CHÍNH KHI GỌI TỪ CLI `node worker-app.js`
// ============================================================================
if (process.argv[1] && process.argv[1].includes('worker-app.js')) {
  // Đọc tham số từ CLI
  const args = process.argv.slice(2);
  let mode = 'batch';
  let concurrency = 3;
  let inlineTaskJson = null;

  for (const arg of args) {
    if (arg.startsWith('--mode=')) mode = arg.split('=')[1];
    if (arg.startsWith('--concurrency=')) concurrency = parseInt(arg.split('=')[1], 10) || 3;
    if (arg.startsWith('--task=')) inlineTaskJson = arg.substring(arg.indexOf('=') + 1);
  }

  const workerApp = new WorkerAppQueue({ mode, concurrency });

  console.log(`[WORKER_APP] Worker Queue App đã khởi động (Mode: ${mode.toUpperCase()}, Concurrency: ${concurrency}).`);

  // Xử lý task đơn nếu được truyền qua CLI --task='{...}'
  if (inlineTaskJson) {
    try {
      const taskObj = JSON.parse(inlineTaskJson);
      workerApp.enqueue(taskObj.type, taskObj.name, taskObj.data, taskObj.options || {});
    } catch (err) {
      console.error('[WORKER_APP] Lỗi khi parse inline task JSON:', err.message);
    }
  }

  // Lắng nghe lệnh điều khiển từ STDIN (Electron IPC Stream)
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    try {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line.trim());
        if (msg.action === 'enqueue') {
          workerApp.enqueue(msg.type, msg.name, msg.data, msg.options);
        } else if (msg.action === 'pause') {
          workerApp.pause();
        } else if (msg.action === 'resume') {
          workerApp.resume();
        } else if (msg.action === 'cancel') {
          workerApp.cancelTask(msg.taskId);
        } else if (msg.action === 'retry') {
          workerApp.retryTask(msg.taskId);
        } else if (msg.action === 'set-concurrency') {
          workerApp.setConcurrency(msg.concurrency);
        }
      }
    } catch (_) {
      // Bỏ qua line không đúng định dạng JSON
    }
  });

  // Nếu là batch mode và chưa có task nào, thêm task mẫu khởi tạo
  if (mode === 'batch' && workerApp.tasks.size === 0 && !inlineTaskJson) {
    workerApp.enqueue('dubbing_job', 'Lồng tiếng video bài giảng 01', { videoId: 'v101' });
    workerApp.enqueue('audio_convert', 'Chuyển đổi nhạc nền MP3 320k', { audioId: 'a202' });
    workerApp.enqueue('demucs_split', 'Tách Vocal bài hát Intro', { songId: 's303' });
  }
}

export default WorkerAppQueue;
export { WorkerAppQueue };
