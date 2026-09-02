/**
 * CreatorOS PRO_V40 - Demucs Executable Tester Script (backend/test/test-demucs-runner.js)
 * ==============================================================================
 * Kịch bản kiểm tra tự động file thực thi `demucs_runner.exe` / `demucs_runner.py`.
 * Tự động tạo file audio WAV mẫu, truyền tham số `--input` & `--output`,
 * thực thi tiến trình và xác minh kết quả đầu ra (`vocals.wav` và `accompaniment.wav`).
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đường dẫn làm việc chính
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');
const TEST_TEMP_DIR = path.join(BACKEND_DIR, 'test_temp');
const SAMPLE_INPUT_WAV = path.join(TEST_TEMP_DIR, 'sample_audio.wav');
const OUTPUT_DIR = path.join(TEST_TEMP_DIR, 'demucs_output');

/**
 * 1. Tạo file WAV mẫu 16-bit PCM (chuẩn 1 giây im lặng / sine wave)
 * để làm dữ liệu đầu vào cho Demucs runner
 */
function createDummyWavFile(filePath, durationSec = 1, sampleRate = 44100) {
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = Math.floor(durationSec * sampleRate) * blockAlign;
  const chunkSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Chunk Descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);

  // fmt Sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data Sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Ghi mẫu tín hiệu âm thanh sine wave 440Hz nhẹ
  for (let i = 0; i < dataSize / 2; i++) {
    const t = i / (sampleRate * numChannels);
    const sampleVal = Math.sin(2 * Math.PI * 440 * t) * 10000;
    buffer.writeInt16LE(Math.floor(sampleVal), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`[TEST_PREPARE] ✅ Đã tạo tệp audio PCM mẫu: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

/**
 * 2. Xác định file thực thi Demucs (Thượng tầng ưu tiên .exe đã qua PyInstaller / fallback sang Python script)
 */
function resolveDemucsExecutable() {
  const possiblePaths = [
    path.join(PROJECT_ROOT, 'dist_executables', 'demucs_runner.exe'),
    path.join(PROJECT_ROOT, 'backend', 'dist', 'demucs_runner', 'demucs_runner.exe'),
    path.join(BACKEND_DIR, 'scripts', 'demucs_runner.exe'),
    path.join(PROJECT_ROOT, 'demucs_runner.exe')
  ];

  for (const exePath of possiblePaths) {
    if (fs.existsSync(exePath)) {
      return { type: 'exe', command: exePath, args: [] };
    }
  }

  // Fallback nếu chưa build thành file .exe: Chạy qua Python script trực tiếp
  const pythonScriptPath = path.join(BACKEND_DIR, 'scripts', 'demucs_runner.py');
  if (fs.existsSync(pythonScriptPath)) {
    console.warn(`[TEST_NOTICE] Không tìm thấy demucs_runner.exe, chuyển sang test file script: ${pythonScriptPath}`);
    return { type: 'python', command: 'python', args: [pythonScriptPath] };
  }

  throw new Error('Không tìm thấy file demucs_runner.exe hoặc demucs_runner.py trong dự án.');
}

/**
 * 3. Tiến trình Test chính
 */
async function runDemucsTest() {
  console.log('==============================================================================');
  console.log('🚀 CreatorOS PRO_V40 - Kiểm Tra Tiến Trình Tách Giọng Nói (Demucs Runner)');
  console.log('==============================================================================');

  // Dọn dẹp & Tạo thư mục tạm
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Tạo file audio mẫu
  createDummyWavFile(SAMPLE_INPUT_WAV);

  // 2. Tìm Executable
  const execConfig = resolveDemucsExecutable();
  console.log(`[TEST_EXEC] Đang thực thi: ${execConfig.command} ${execConfig.args.join(' ')}`);

  const spawnArgs = [
    ...execConfig.args,
    '--input', SAMPLE_INPUT_WAV,
    '--output', OUTPUT_DIR
  ];

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const processInstance = spawn(execConfig.command, spawnArgs, {
      cwd: path.dirname(SAMPLE_INPUT_WAV),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let stdoutData = '';
    let stderrData = '';

    processInstance.stdout.on('data', (chunk) => {
      const txt = chunk.toString();
      stdoutData += txt;
      process.stdout.write(`[DEMUCS_STDOUT] ${txt}`);
    });

    processInstance.stderr.on('data', (chunk) => {
      const txt = chunk.toString();
      stderrData += txt;
      process.stderr.write(`[DEMUCS_STDERR] ${txt}`);
    });

    processInstance.on('error', (err) => {
      console.error('❌ Lỗi khởi chạy tiến trình Demucs:', err.message);
      if (err.message.includes('ENOENT')) {
        console.error('👉 Nguyên nhân: Thiếu file thực thi hoặc thiếu DLLs/dependencies hệ thống.');
      }
      reject(err);
    });

    processInstance.on('close', (code) => {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('------------------------------------------------------------------------------');
      console.log(`[TEST_RESULT] Tiến trình kết thúc với Mã Thoát (Exit Code): ${code} (Thời gian: ${durationSec}s)`);

      if (code !== 0) {
        console.error('❌ Lỗi: Demucs runner bị crash hoặc kết thúc không bình thường.');
        if (stderrData.includes('DLL load failed') || stderrData.includes('ImportError')) {
          console.error('👉 PHÁT HIỆN LỖI THIẾU DLL/DEPENDENCY trong thư mục _internal!');
        }
        return reject(new Error(`Demucs runner exited with code ${code}`));
      }

      // 4. Kiểm tra sự tồn tại của các file đầu ra
      const expectedVocals = path.join(OUTPUT_DIR, 'vocals.wav');
      const expectedAccompaniment = path.join(OUTPUT_DIR, 'accompaniment.wav');

      const hasVocals = fs.existsSync(expectedVocals);
      const hasAccompaniment = fs.existsSync(expectedAccompaniment);

      console.log(`- Tệp vocals.wav: ${hasVocals ? '✅ TỒN TẠI (' + (fs.statSync(expectedVocals).size / 1024).toFixed(1) + ' KB)' : '❌ THIẾU'}`);
      console.log(`- Tệp accompaniment.wav: ${hasAccompaniment ? '✅ TỒN TẠI (' + (fs.statSync(expectedAccompaniment).size / 1024).toFixed(1) + ' KB)' : '❌ THIẾU'}`);

      if (hasVocals && hasAccompaniment) {
        console.log('==============================================================================');
        console.log('🎉 KIỂM TRA THÀNH CÔNG! File demucs_runner chạy hoàn hảo và tạo đủ đầu ra.');
        console.log('==============================================================================');
        resolve({ success: true, vocalsPath: expectedVocals, accompanimentPath: expectedAccompaniment });
      } else {
        console.error('❌ KIỂM TRA THẤT BẠI: Thiếu file kết quả đầu ra (vocals.wav hoặc accompaniment.wav).');
        reject(new Error('Missing required output wave files'));
      }
    });
  });
}

// Chạy trực tiếp test nếu script được invoke
runDemucsTest().catch((err) => {
  console.error('[TEST_FATAL]', err.message);
  process.exit(1);
});
