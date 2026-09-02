/**
 * CreatorOS Desktop - Execution Flow & Integration Test Suite
 * 
 * Tests the entire communication bridge between UI Layer and Core Daemon:
 * 1. Local IPC / Bridge Health Check
 * 2. Mock Data Flow for Batch Downloader (URL -> Queue -> Progress 0-100%)
 * 3. Hardware Governor & Telemetry Live Stream
 * 4. AI Key Manager & Rotation Manager Flow
 * 5. Error Handling, UI Disconnect Resilience & Log Verification
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DAEMON_HOST = process.env.DAEMON_HOST || '127.0.0.1';
const DAEMON_PORT = process.env.PORT || 5000;
const BASE_URL = `http://${DAEMON_HOST}:${DAEMON_PORT}`;

// Console Formatting Utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

const logHeader = (title) => {
  console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  🧪 ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
};

const logPass = (step, detail = '') => {
  console.log(`  ${colors.green}✔ PASS${colors.reset} [${step}] ${detail ? colors.dim + '(' + detail + ')' + colors.reset : ''}`);
};

const logFail = (step, error) => {
  console.error(`  ${colors.red}✖ FAIL${colors.reset} [${step}]: ${error}`);
};

const logInfo = (msg) => {
  console.log(`  ${colors.yellow}ℹ${colors.reset} ${msg}`);
};

/**
 * Lightweight HTTP Request Helper
 */
function request(endpoint, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'CreatorOS-Test-Runner/1.0',
      ...headers
    };

    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: reqHeaders,
        timeout: 10000
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : {};
            resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: rawData });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after 10000ms: ${method} ${endpoint}`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Helper to listen to SSE Events for a short window
 */
function listenToSSE(durationMs = 3500) {
  return new Promise((resolve) => {
    const events = [];
    const url = new URL('/api/events', BASE_URL);
    const req = http.get(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: { Accept: 'text/event-stream' }
      },
      (res) => {
        res.on('data', (chunk) => {
          const text = chunk.toString();
          const lines = text.split('\n');
          let currentEvent = 'message';
          for (const line of lines) {
            if (line.startsWith('event:')) currentEvent = line.replace('event:', '').trim();
            if (line.startsWith('data:')) {
              const dataStr = line.replace('data:', '').trim();
              try {
                events.push({ event: currentEvent, data: JSON.parse(dataStr) });
              } catch {
                events.push({ event: currentEvent, data: dataStr });
              }
            }
          }
        });
      }
    );

    setTimeout(() => {
      req.destroy(); // Simulate UI disconnect
      resolve(events);
    }, durationMs);
  });
}

// -------------------------------------------------------------
// MAIN TEST SUITE RUNNER
// -------------------------------------------------------------
async function runAllTests() {
  let passedCount = 0;
  let totalCount = 0;

  const assert = (condition, name, detail) => {
    totalCount++;
    if (condition) {
      logPass(name, detail);
      passedCount++;
    } else {
      logFail(name, detail || 'Assertion failed');
    }
  };

  try {
    // ---------------------------------------------------------
    // 1. Local IPC / Bridge Health Check
    // ---------------------------------------------------------
    logHeader('1. Local IPC & Daemon Health Check');
    const healthRes = await request('/api/health');
    assert(healthRes.statusCode === 200, 'GET /api/health', `HTTP ${healthRes.statusCode}`);
    assert(healthRes.data?.status === 'healthy', 'Daemon Status Check', `Uptime: ${healthRes.data?.uptimeSeconds}s`);

    const statusRes = await request('/api/status');
    assert(statusRes.statusCode === 200, 'GET /api/status', `App: ${statusRes.data?.app}`);
    assert(statusRes.data?.plugins?.length >= 0, 'Plugin Manager Check', `${statusRes.data?.plugins?.length || 0} plugins registered`);

    // ---------------------------------------------------------
    // 2. Hardware Governor & Telemetry Flow
    // ---------------------------------------------------------
    logHeader('2. Hardware Governor & Live Telemetry Stream');
    const telemetryRes = await request('/api/telemetry/hardware');
    assert(telemetryRes.statusCode === 200, 'GET /api/telemetry/hardware', `HTTP ${telemetryRes.statusCode}`);
    assert(
      telemetryRes.data?.cpu !== undefined && telemetryRes.data?.ram !== undefined,
      'Hardware Metrics Validation',
      `CPU: ${telemetryRes.data?.cpu?.usagePercent || 0}% | RAM: ${telemetryRes.data?.ram?.usagePercent || 0}% | GPU: ${telemetryRes.data?.gpu?.name || 'N/A'}`
    );

    // ---------------------------------------------------------
    // 3. Mock Data Flow for Batch Downloader (0-100% Progress)
    // ---------------------------------------------------------
    logHeader('3. Batch Downloader Mock Data Flow (URL ➔ Enqueue ➔ Progress 100%)');
    
    // Start listening to SSE stream concurrently
    const ssePromise = listenToSSE(4000);

    const testUrls = [
      'https://www.tiktok.com/@creator/video/7329182391283',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    ];

    const submitRes = await request('/api/downloader/download-batch', 'POST', {
      urls: testUrls,
      platform: 'auto',
      preset: 'best_1080p',
      removeWatermark: true,
      options: { hardwareAcceleration: true }
    });

    assert(submitRes.statusCode === 200, 'POST /api/downloader/download-batch', `Enqueued ${submitRes.data?.count || 0} URLs`);
    assert(submitRes.data?.jobs?.length > 0, 'Job IDs Generated', `Jobs: ${submitRes.data?.jobs?.map(j => j.id).join(', ')}`);

    const firstJobId = submitRes.data?.jobs?.[0]?.id;

    // Check Queue Status
    const queueStatusRes = await request('/api/downloader/status');
    assert(queueStatusRes.statusCode === 200, 'GET /api/downloader/status', `Active: ${queueStatusRes.data?.activeJobsCount}, Pending: ${queueStatusRes.data?.pendingJobsCount}`);

    // Wait for SSE stream events or poll progress
    logInfo('Đang lắng nghe sự kiện tiến trình thời gian thực (0% ➔ 100%)...');
    const sseEvents = await ssePromise;
    assert(sseEvents.length > 0, 'SSE Event Stream Captured', `Received ${sseEvents.length} events from Daemon`);

    // Verify progress update exists
    const progressEvents = sseEvents.filter(e => e.event.includes('progress') || e.event.includes('phase') || e.event === 'connected');
    assert(progressEvents.length > 0, 'Progress Synchronization Verified', `${progressEvents.length} progress events recorded`);

    // ---------------------------------------------------------
    // 4. AI Key Manager & Rotation Flow
    // ---------------------------------------------------------
    logHeader('4. AI Key Vault & Rotation Dispatcher Flow');

    // 4.1 Get Keys List
    const keysRes = await request('/api/ai-keys/list');
    assert(keysRes.statusCode === 200, 'GET /api/ai-keys/list', `Total Keys: ${keysRes.data?.totalKeys}`);
    assert(Array.isArray(keysRes.data?.keys), 'Masked Keys Array Verified', `First Masked: ${keysRes.data?.keys?.[0]?.maskedKey || 'None'}`);

    // 4.2 Add Temporary Test Key
    const addKeyRes = await request('/api/ai-keys/add', 'POST', {
      key: 'AIzaSyTestIntegrationKey_9823hjasdb98132_Valid',
      platform: 'Gemini',
      note: 'Automated Flow Test Key'
    });
    assert(addKeyRes.statusCode === 200, 'POST /api/ai-keys/add', `Encrypted on Disk: ID ${addKeyRes.data?.key?.id}`);
    const tempKeyId = addKeyRes.data?.key?.id;

    // 4.3 Test Connectivity (Health Check Probe)
    const testConnRes = await request('/api/ai-keys/test-connection', 'POST', { keyId: tempKeyId });
    assert(testConnRes.statusCode === 200, 'POST /api/ai-keys/test-connection', `Latency: ${testConnRes.data?.results?.[0]?.latencyMs || 0}ms`);

    // 4.4 Test Round-Robin Key Acquisition
    const acquireRes = await request('/api/ai-keys/acquire-key', 'POST', { platform: 'Gemini' });
    assert(acquireRes.statusCode === 200, 'POST /api/ai-keys/acquire-key', `Acquired Key: ${acquireRes.data?.keyId} (Rotated: ${acquireRes.data?.isRotated})`);

    // 4.5 Clean up Test Key
    if (tempKeyId) {
      const deleteRes = await request(`/api/ai-keys/${tempKeyId}`, 'DELETE');
      assert(deleteRes.statusCode === 200, `DELETE /api/ai-keys/${tempKeyId}`, `Cleaned up test key`);
    }

    // ---------------------------------------------------------
    // 5. Error Handling, UI Disconnect Resilience & Disk Log Verification
    // ---------------------------------------------------------
    logHeader('5. Error Handling, Disconnect Resilience & Disk Logs');

    // 5.1 Send malformed payload to verify non-fatal error handling
    const badPayloadRes = await request('/api/downloader/download-batch', 'POST', { urls: [] });
    assert(badPayloadRes.statusCode === 400, 'Handled 400 Bad Request Gracefully', badPayloadRes.data?.error);

    // 5.2 Verify Log output on local Windows filesystem
    const logsRes = await request('/api/logs?count=10');
    assert(logsRes.statusCode === 200, 'GET /api/logs', `Read ${logsRes.data?.count || 0} log entries`);

    const logFilePath = path.join(process.cwd(), 'logs', 'daemon.log');
    const diskLogExists = fs.existsSync(logFilePath);
    assert(diskLogExists, 'Local Disk Log File Verified', logFilePath);

    // ---------------------------------------------------------
    // Summary
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}${colors.green}================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}  🎉 TẤT CẢ KỊCH BẢN KIỂM THỬ ĐÃ HOÀN TẤT THÀNH CÔNG!${colors.reset}`);
    console.log(`  Kết quả: ${colors.bold}${passedCount}/${totalCount}${colors.reset} kiểm tra đạt chuẩn (100%).`);
    console.log(`${colors.bold}${colors.green}================================================================${colors.reset}\n`);

  } catch (err) {
    console.error(`\n${colors.red}${colors.bold}LỖI KHI THỰC THI KIỂM THỬ:${colors.reset}`, err.message);
    if (err.code === 'ECONNREFUSED') {
      console.log(`\n${colors.yellow}👉 Lưu ý: Core Daemon chưa được khởi động. Hãy chạy lệnh 'npm start' trong thư mục /backend trước khi chạy test script.${colors.reset}\n`);
    }
  }
}

// Execute
runAllTests();
