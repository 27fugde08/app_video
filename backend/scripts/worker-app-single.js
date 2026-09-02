#!/usr/bin/env node
/**
 * CreatorOS PRO_V40 - Single Task Worker Executor (worker-app-single.js)
 * ==============================================================================
 * Tiến trình Worker độc lập chuyên trách xử lý ĐƠN LẺ một tác vụ (Single Task Execution Mode).
 *
 * Tính năng chính:
 * 1. Tiếp nhận duy nhất một tác vụ từ CLI arguments (`--task='...'`, `--file='...'`) hoặc qua luồng STDIN JSON.
 * 2. Theo dõi và quản lý vòng đời task: `pending` -> `running` -> `completed` / `failed`.
 * 3. Bắn log console và tiến độ (%) thời gian thực qua IPC (`process.send`), STDOUT (`[WORKER_EVENT]`, `[PROGRESS]`, `[LOG]`).
 * 4. Xử lý ngoại lệ an toàn tuyệt đối (Catching network, file I/O errors), ngắt tiến trình sạch sẽ mà không làm crash tiến trình cha Electron.
 */

const fs = require('fs');
const path = require('path');
const WorkerAppQueue = require('./worker-app');

// ============================================================================
// 1. AN TOÀN NỔI BẬT (EXCEPTIONAL SAFETY HANDLERS)
// ============================================================================
process.on('uncaughtException', (err) => {
  const errMsg = err && err.stack ? err.stack : String(err);
  console.error(`[SINGLE_WORKER_ERROR] Uncaught Exception: ${errMsg}`);
  if (process.send) {
    try {
      process.send({
        type: 'worker:error',
        event: 'uncaughtException',
        error: errMsg,
        status: 'failed',
        timestamp: new Date().toISOString()
      });
    } catch (_) {}
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const errMsg = reason && reason.stack ? reason.stack : String(reason);
  console.error(`[SINGLE_WORKER_ERROR] Unhandled Rejection: ${errMsg}`);
  if (process.send) {
    try {
      process.send({
        type: 'worker:error',
        event: 'unhandledRejection',
        error: errMsg,
        status: 'failed',
        timestamp: new Date().toISOString()
      });
    } catch (_) {}
  }
  process.exit(1);
});

// ============================================================================
// 2. THỰC THI TASK ĐƠN LẺ
// ============================================================================
async function runSingleWorker() {
  const workerQueue = new WorkerAppQueue({ mode: 'single', concurrency: 1 });

  const args = process.argv.slice(2);
  let taskPayload = null;
  let taskFilePath = null;

  for (const arg of args) {
    if (arg.startsWith('--task=')) {
      taskPayload = arg.substring(arg.indexOf('=') + 1);
    } else if (arg.startsWith('--file=')) {
      taskFilePath = arg.substring(arg.indexOf('=') + 1);
    }
  }

  // 1. Nếu đọc task từ file JSON
  if (!taskPayload && taskFilePath && fs.existsSync(taskFilePath)) {
    try {
      taskPayload = fs.readFileSync(taskFilePath, 'utf-8');
    } catch (e) {
      console.error(`[SINGLE_WORKER] Lỗi khi đọc file task JSON [${taskFilePath}]:`, e.message);
      process.exit(1);
    }
  }

  // 2. Hàm xử lý task khi có payload
  const executeTaskObject = async (taskObj) => {
    if (!taskObj || !taskObj.type) {
      console.error('[SINGLE_WORKER] Payload task không hợp lệ (thiếu field `type`).');
      process.exit(1);
    }

    const taskId = taskObj.id || `single_${Date.now()}`;
    const taskName = taskObj.name || `Single Task [${taskObj.type}]`;
    const taskData = taskObj.data || {};
    const options = taskObj.options || {};

    workerQueue.on('task:completed', (completedTask) => {
      console.log(`[SINGLE_WORKER_SUCCESS] Task [${completedTask.id}] xử lý hoàn tất!`);
      if (process.send) {
        process.send({
          type: 'single:completed',
          task: completedTask,
          result: completedTask.result
        });
      }
      setTimeout(() => process.exit(0), 100);
    });

    workerQueue.on('task:failed', ({ task, error }) => {
      console.error(`[SINGLE_WORKER_FAILED] Task [${task ? task.id : taskId}] thất bại:`, error);
      if (process.send) {
        process.send({
          type: 'single:failed',
          task,
          error
        });
      }
      setTimeout(() => process.exit(1), 100);
    });

    // Enqueue duy nhất 1 task vào hàng đợi single
    workerQueue.enqueue(taskObj.type, taskName, taskData, { ...options, id: taskId });
  };

  // 3. Nếu đã có taskPayload từ CLI
  if (taskPayload) {
    try {
      const taskObj = JSON.parse(taskPayload);
      await executeTaskObject(taskObj);
    } catch (err) {
      console.error('[SINGLE_WORKER] Lỗi parse JSON từ --task argument:', err.message);
      process.exit(1);
    }
    return;
  }

  // 4. Lắng nghe từ STDIN nếu không có CLI argument
  let stdinBuffer = '';
  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', (chunk) => {
    stdinBuffer += chunk;
  });

  process.stdin.on('end', async () => {
    if (!stdinBuffer.trim()) {
      console.log('[SINGLE_WORKER] Không nhận được task từ STDIN hoặc CLI. Khởi chạy task demo mặc định.');
      await executeTaskObject({
        type: 'dubbing_job',
        name: 'Single Worker Demo Dubbing Job',
        data: { videoId: 'demo_single_01' }
      });
      return;
    }

    try {
      const taskObj = JSON.parse(stdinBuffer.trim());
      await executeTaskObject(taskObj);
    } catch (err) {
      console.error('[SINGLE_WORKER] Lỗi khi parse JSON từ STDIN:', err.message);
      process.exit(1);
    }
  });

  // Timeout dự phòng nếu STDIN không đóng
  setTimeout(() => {
    if (stdinBuffer.trim() && !taskPayload) {
      try {
        const taskObj = JSON.parse(stdinBuffer.trim());
        executeTaskObject(taskObj);
      } catch (_) {}
    }
  }, 1000);
}

runSingleWorker();
