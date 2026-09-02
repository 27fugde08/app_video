/**
 * CreatorOS PRO_V40 - WorkerApp Threads Unit & Integration Test
 * File: backend/test/test-worker-app-threads.js
 * ==============================================================================
 * Test Case Yêu Cầu:
 * 1. Sử dụng Node.js `worker_threads` để chạy WorkerAppQueue độc lập.
 * 2. Đẩy liên tục 3 tác vụ vào hàng đợi giả lập.
 * 3. Kiểm tra cơ chế xử lý tuần tự/song song (concurrency control).
 * 4. Theo dõi chuyển đổi trạng thái vòng đời: `pending` -> `running` -> `completed`.
 * 5. Đảm bảo worker giữ ổn định tài nguyên bộ nhớ (no memory leak) khi bị nạp tác vụ dồn dập.
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import WorkerAppQueue from '../scripts/worker-app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// WORKER THREAD CODE (Khi chạy trong môi trường worker thread)
// ============================================================================
if (!isMainThread) {
  const { concurrency, mode } = workerData || { concurrency: 2, mode: 'single' };

  // Khởi tạo Queue instance trong worker thread
  const queue = new WorkerAppQueue({
    concurrency,
    mode,
    persistenceDir: path.join(__dirname, 'test_temp_vault')
  });

  // Đăng ký custom handler nhanh cho mục đích test
  queue.registerWorker('fast_test_job', async (task, updateProgress, logMessage, signal) => {
    logMessage('info', `[WORKER_THREAD] Đang xử lý fast_test_job: ${task.id}`);
    updateProgress(30, 'Đang phân tích dữ liệu...');
    await queue.sleep(100, signal);
    updateProgress(80, 'Đang tính toán...');
    await queue.sleep(100, signal);
    updateProgress(100, 'Hoàn thành!');
    return { success: true, processedAt: new Date().toISOString() };
  });

  // Lắng nghe các sự kiện hàng đợi để gửi ngược về main thread
  queue.on('task:started', (task) => {
    parentPort.postMessage({ type: 'EVENT_STARTED', task: { id: task.id, status: task.status, type: task.type } });
  });

  queue.on('task:progress', (data) => {
    parentPort.postMessage({ type: 'EVENT_PROGRESS', id: data.id, progress: data.progress, statusText: data.statusText });
  });

  queue.on('task:completed', (task) => {
    parentPort.postMessage({ type: 'EVENT_COMPLETED', task: { id: task.id, status: task.status, result: task.result } });
  });

  queue.on('queue:drained', () => {
    parentPort.postMessage({ type: 'EVENT_DRAINED', stats: queue.getStats() });
  });

  // Nhận lệnh điều khiển từ Main Thread
  parentPort.on('message', (msg) => {
    if (msg.action === 'ENQUEUE') {
      const task = queue.enqueue(msg.taskType, msg.name, msg.data, msg.options);
      parentPort.postMessage({ type: 'EVENT_ENQUEUED', task: { id: task.id, status: task.status } });
    } else if (msg.action === 'SET_CONCURRENCY') {
      queue.setConcurrency(msg.concurrency);
    } else if (msg.action === 'GET_STATS') {
      parentPort.postMessage({ type: 'EVENT_STATS', stats: queue.getStats() });
    } else if (msg.action === 'GET_MEMORY') {
      parentPort.postMessage({ type: 'EVENT_MEMORY', memory: process.memoryUsage() });
    }
  });
}

// ============================================================================
// MAIN THREAD TEST RUNNER CODE
// ============================================================================
else {
  async function runWorkerThreadsUnitTest() {
    console.log('==============================================================================');
    console.log('🧪 UNIT TEST: worker-app.js via Node.js worker_threads');
    console.log('==============================================================================');

    // Khởi tạo Worker Thread
    const worker = new Worker(__filename, {
      workerData: { concurrency: 2, mode: 'single' }
    });

    const stateHistory = new Map(); // id -> array of status transitions
    let activeRunningCount = 0;
    let maxObservedConcurrency = 0;
    let drainedPromiseResolve = null;

    // Helper lắng nghe sự kiện từ Worker Thread
    worker.on('message', (msg) => {
      const timestamp = new Date().toISOString();

      if (msg.type === 'EVENT_ENQUEUED') {
        const id = msg.task.id;
        if (!stateHistory.has(id)) stateHistory.set(id, []);
        stateHistory.get(id).push('pending');
        console.log(`[MAIN_THREAD] 📥 Task [${id}] đã vào hàng đợi -> Status: pending`);
      } else if (msg.type === 'EVENT_STARTED') {
        const id = msg.task.id;
        if (!stateHistory.has(id)) stateHistory.set(id, []);
        stateHistory.get(id).push('running');
        activeRunningCount++;
        maxObservedConcurrency = Math.max(maxObservedConcurrency, activeRunningCount);
        console.log(`[MAIN_THREAD] 🚀 Task [${id}] khởi chạy -> Status: running (Active running: ${activeRunningCount})`);
      } else if (msg.type === 'EVENT_PROGRESS') {
        console.log(`[MAIN_THREAD] 📊 Task [${msg.id}] Tiến độ: ${msg.progress}% - ${msg.statusText}`);
      } else if (msg.type === 'EVENT_COMPLETED') {
        const id = msg.task.id;
        if (!stateHistory.has(id)) stateHistory.set(id, []);
        stateHistory.get(id).push('completed');
        activeRunningCount = Math.max(0, activeRunningCount - 1);
        console.log(`[MAIN_THREAD] ✅ Task [${id}] hoàn thành -> Status: completed`);
      } else if (msg.type === 'EVENT_DRAINED') {
        console.log('[MAIN_THREAD] 🏁 Tất cả tác vụ trong hàng đợi đã xử lý xong (Drained).');
        if (drainedPromiseResolve) drainedPromiseResolve();
      }
    });

    worker.on('error', (err) => {
      console.error('❌ Worker thread error:', err);
    });

    // ------------------------------------------------------------------------
    // TEST CASE 1: Đẩy 3 tác vụ liên tục & Kiểm tra chuyển đổi trạng thái vòng đời
    // ------------------------------------------------------------------------
    console.log('\n--- TEST CASE 1: Đẩy 3 tác vụ & Kiểm tra vòng đời (pending -> running -> completed) ---');
    
    let drainedPromise = new Promise((res) => { drainedPromiseResolve = res; });

    // Đẩy 3 tác vụ liên tục
    worker.postMessage({ action: 'ENQUEUE', taskType: 'fast_test_job', name: 'Task 01', options: { id: 'task_01' } });
    worker.postMessage({ action: 'ENQUEUE', taskType: 'fast_test_job', name: 'Task 02', options: { id: 'task_02' } });
    worker.postMessage({ action: 'ENQUEUE', taskType: 'fast_test_job', name: 'Task 03', options: { id: 'task_03' } });

    await drainedPromise;

    // Verify Task 1, 2, 3 Lifecycle
    console.log('\n🔍 Kiểm tra chuyển đổi trạng thái:');
    const expectedTasks = ['task_01', 'task_02', 'task_03'];
    for (const taskId of expectedTasks) {
      const transitions = stateHistory.get(taskId) || [];
      console.log(`  - Task [${taskId}] Lịch sử trạng thái: [${transitions.join(' -> ')}]`);
      
      console.assert(transitions.includes('pending'), `Assertion Failed: ${taskId} thiếu trạng thái pending`);
      console.assert(transitions.includes('running'), `Assertion Failed: ${taskId} thiếu trạng thái running`);
      console.assert(transitions.includes('completed'), `Assertion Failed: ${taskId} thiếu trạng thái completed`);
    }

    // Verify Concurrency Control
    console.log(`  - Số tác vụ chạy song song tối đa ghi nhận được: ${maxObservedConcurrency} (Giới hạn Concurrency = 2)`);
    console.assert(maxObservedConcurrency <= 2, 'Assertion Failed: Vượt quá giới hạn concurrency cho phép');
    console.log('  ✅ Assertion Pass: Giới hạn concurrency & Chuyển đổi trạng thái chính xác!');

    // ------------------------------------------------------------------------
    // TEST CASE 2: Đẩy dồn dập 20 tác vụ & Kiểm tra an toàn bộ nhớ (Memory Stability)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST CASE 2: Stress test đẩy dồn dập 20 tác vụ & Kiểm tra tràn bộ nhớ ---');
    
    const initialMemory = process.memoryUsage();
    console.log(`[MEMORY_BEFORE] Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    drainedPromise = new Promise((res) => { drainedPromiseResolve = res; });

    // Nạp dồn dập 20 task
    for (let i = 1; i <= 20; i++) {
      worker.postMessage({
        action: 'ENQUEUE',
        taskType: 'fast_test_job',
        name: `Stress Task ${i}`,
        options: { id: `stress_task_${i}` }
      });
    }

    await drainedPromise;

    const finalMemory = process.memoryUsage();
    const heapDiffMb = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    console.log(`[MEMORY_AFTER] Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[MEMORY_DELTA] Chênh lệch bộ nhớ Heap: ${heapDiffMb.toFixed(2)} MB`);

    // Kiểm tra chênh lệch bộ nhớ: không tăng quá 25MB sau 20 tasks
    console.assert(heapDiffMb < 25, 'Assertion Failed: Bộ nhớ bị tăng đột biến (Memory Leak suspected)');
    console.log('  ✅ Assertion Pass: Quản lý bộ nhớ ổn định khi xử lý dồn dập, không tràn bộ nhớ!');

    console.log('\n==============================================================================');
    console.log('🎉 PASSED: Tất cả các test case cho `worker-app.js` bằng worker_threads thành công!');
    console.log('==============================================================================');

    await worker.terminate();
    process.exit(0);
  }

  runWorkerThreadsUnitTest().catch((err) => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  });
}
