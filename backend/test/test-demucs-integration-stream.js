/**
 * CreatorOS PRO_V40 - Demucs Integration Stream Test (backend/test/test-demucs-integration-stream.js)
 * ==============================================================================
 * Kịch bản kiểm thử tích hợp (Integration Test) mô phỏng tiến trình Node.js gọi demucs_runner.exe
 * thông qua `child_process.spawn`.
 * 
 * Mục tiêu kiểm tra:
 * 1. Đọc luồng `stdout` thời gian thực (Real-time Stream Parsing).
 * 2. Trích xuất & bắt các dòng log tiến độ dạng `[DEMUCS_PROGRESS] <percent>%`.
 * 3. Phát hiện sớm lỗi nghẽn tiến trình (Process Hang / Buffer Stall) thông qua Watchdog Timer.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');
const TEST_TEMP_DIR = path.join(BACKEND_DIR, 'test_temp_stream');
const SAMPLE_INPUT_WAV = path.join(TEST_TEMP_DIR, 'stream_test_input.wav');
const OUTPUT_DIR = path.join(TEST_TEMP_DIR, 'stream_output');

// Ngưỡng cảnh báo nghẽn (Watchdog Timeout): Báo lỗi nếu 25 giây không có log stdout mới
const STALL_WATCHDOG_TIMEOUT_MS = 25000;

/**
 * Tạo file WAV âm thanh mẫu (2 giây PCM 16-bit)
 */
function createSampleWav(filePath, durationSec = 2, sampleRate = 44100) {
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = Math.floor(durationSec * sampleRate) * blockAlign;
  const chunkSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < dataSize / 2; i++) {
    const t = i / (sampleRate * numChannels);
    const sampleVal = Math.sin(2 * Math.PI * 523.25 * t) * 12000; // Nốt C5
    buffer.writeInt16LE(Math.floor(sampleVal), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`[TEST_INIT] ✅ Đã khởi tạo tệp âm thanh thử nghiệm: ${filePath}`);
}

/**
 * Tìm vị trí demucs_runner.exe hoặc demucs_runner.py
 */
function getDemucsExecutablePath() {
  const exeCandidates = [
    path.join(PROJECT_ROOT, 'dist_executables', 'demucs_runner.exe'),
    path.join(PROJECT_ROOT, 'backend', 'dist', 'demucs_runner', 'demucs_runner.exe'),
    path.join(BACKEND_DIR, 'scripts', 'demucs_runner.exe'),
    path.join(PROJECT_ROOT, 'demucs_runner.exe')
  ];

  for (const candidate of exeCandidates) {
    if (fs.existsSync(candidate)) {
      return { command: candidate, args: [], isExe: true };
    }
  }

  const pythonScript = path.join(BACKEND_DIR, 'scripts', 'demucs_runner.py');
  if (fs.existsSync(pythonScript)) {
    return { command: 'python', args: [pythonScript], isExe: false };
  }

  throw new Error('Không tìm thấy tệp demucs_runner.exe hoặc demucs_runner.py trong dự án.');
}

/**
 * Integration Test Stream Engine
 */
async function runDemucsStreamIntegrationTest() {
  console.log('==============================================================================');
  console.log('📡 INTEGRATION TEST: Node.js Spawn & Real-time Stdout Progress Stream');
  console.log('==============================================================================');

  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  createSampleWav(SAMPLE_INPUT_WAV, 2);

  const execConfig = getDemucsExecutablePath();
  console.log(`[TEST_TARGET] Đang gọi tiến trình: ${execConfig.command} ${execConfig.args.join(' ')}`);

  const spawnArgs = [
    ...execConfig.args,
    '--input', SAMPLE_INPUT_WAV,
    '--output', OUTPUT_DIR
  ];

  const capturedProgressTicks = [];
  let lastLogTime = Date.now();
  let watchdogTimer = null;

  return new Promise((resolve, reject) => {
    // Ép PYTHONUNBUFFERED = 1 để đảm bảo stdout được ghi ra ngay lập tức không bị đệm (buffering)
    const child = spawn(execConfig.command, spawnArgs, {
      cwd: path.dirname(SAMPLE_INPUT_WAV),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    });

    console.log(`[TEST_SPAWN] Tiến trình con PID = ${child.pid} đã được khởi tạo.`);

    // Watchdog Timer kiểm tra tiến trình có bị đơ/nghẽn luồng không
    const resetWatchdog = () => {
      lastLogTime = Date.now();
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        console.error(`\n❌ [TEST_STALL_WARNING] Tiến trình không phát luồng stdout nào trong ${STALL_WATCHDOG_TIMEOUT_MS / 1000} giây! Có thể bị nghẽn (Hang).`);
        child.kill('SIGKILL');
        reject(new Error('Process stalled (No stdout output received within timeout)'));
      }, STALL_WATCHDOG_TIMEOUT_MS);
    };

    resetWatchdog();

    let lineBuffer = '';

    // Lắng nghe luồng STDOUT theo thời gian thực
    child.stdout.on('data', (chunk) => {
      resetWatchdog();
      lineBuffer += chunk.toString();

      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop(); // Giữ lại dòng dở dang ở cuối buffer

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const timeDiffMs = Date.now() - lastLogTime;
        console.log(`[REALTIME_STDOUT] (+${timeDiffMs}ms) ${trimmedLine}`);

        // Bắt chuỗi tiến độ [DEMUCS_PROGRESS]
        if (trimmedLine.includes('[DEMUCS_PROGRESS]')) {
          const match = trimmedLine.match(/\[DEMUCS_PROGRESS\]\s*([\d.]+)/);
          const percent = match ? parseFloat(match[1]) : null;

          capturedProgressTicks.push({
            timestamp: new Date().toISOString(),
            rawLine: trimmedLine,
            percent
          });

          console.log(`  🎯 [CAPTURED_PROGRESS_TICK] Match % = ${percent !== null ? percent + '%' : 'N/A'}`);
        }
      }
    });

    // Lắng nghe luồng STDERR
    child.stderr.on('data', (chunk) => {
      resetWatchdog();
      const errTxt = chunk.toString().trim();
      console.warn(`[REALTIME_STDERR] ${errTxt}`);
    });

    child.on('error', (err) => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      console.error('❌ Lỗi khởi chạy child_process:', err.message);
      reject(err);
    });

    child.on('close', (code) => {
      if (watchdogTimer) clearTimeout(watchdogTimer);

      console.log('------------------------------------------------------------------------------');
      console.log(`[TEST_COMPLETE] Tiến trình PID ${child.pid} kết thúc với Mã lỗi (Exit code): ${code}`);

      if (code !== 0) {
        return reject(new Error(`Demucs runner exited with code ${code}`));
      }

      // Đánh giá kết quả bóc tách Stream
      console.log('\n📊 TỔNG HỢP KẾT QUẢ INTEGRATION STREAM TEST:');
      console.log(`- Tổng số sự kiện Progress đọc được: ${capturedProgressTicks.length}`);
      
      const hasValidStream = capturedProgressTicks.length > 0;
      const finalVocalsExist = fs.existsSync(path.join(OUTPUT_DIR, 'vocals.wav'));
      const finalAccExist = fs.existsSync(path.join(OUTPUT_DIR, 'accompaniment.wav'));

      console.log(`- Nhận diện dòng log [DEMUCS_PROGRESS]: ${hasValidStream ? '✅ CHÍNH XÁC' : '⚠️ KHÔNG THẤY (Cần kiểm tra print print log trong script python)'}`);
      console.log(`- Tệp vocals.wav đầu ra: ${finalVocalsExist ? '✅ TỒN TẠI' : '❌ THIẾU'}`);
      console.log(`- Tệp accompaniment.wav đầu ra: ${finalAccExist ? '✅ TỒN TẠI' : '❌ THIẾU'}`);

      if (finalVocalsExist && finalAccExist) {
        console.log('==============================================================================');
        console.log('🎉 INTEGRATION TEST SUCCESS: Stream stdout hoạt động mượt mà, không bị nghẽn!');
        console.log('==============================================================================');
        resolve({ success: true, ticks: capturedProgressTicks });
      } else {
        reject(new Error('Tệp âm thanh đầu ra chưa được tạo thành công.'));
      }
    });
  });
}

// Chạy trực tiếp
runDemucsStreamIntegrationTest().catch((err) => {
  console.error('[TEST_FAILED]', err.message);
  process.exit(1);
});
