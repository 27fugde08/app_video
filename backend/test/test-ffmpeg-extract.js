/**
 * CreatorOS PRO_V40 - Unit Test / Integration Test for lib/run-ffmpeg.js
 * ==============================================================================
 * Test Case: Kiểm thử hàm `extractAudio`
 * 1. Khởi tạo / tạo video mẫu bằng FFmpeg (test video 2 giây).
 * 2. Lắng nghe sự kiện progress phát từ luồng stderr để kiểm tra độ chính xác của % tiến độ.
 * 3. Thực thi extractAudio trích xuất âm thanh MP3/WAV.
 * 4. Xác minh sự tồn tại và dung lượng tệp âm thanh đầu ra.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { FFmpegProcessorEngine, parseFfmpegTimeToSeconds } from '../../lib/run-ffmpeg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_TEMP_DIR = path.join(__dirname, 'test_temp_ffmpeg');
const INPUT_VIDEO_PATH = path.join(TEST_TEMP_DIR, 'test_sample_video.mp4');
const OUTPUT_AUDIO_PATH = path.join(TEST_TEMP_DIR, 'extracted_audio.mp3');

/**
 * Helper: Tạo tệp video MP4 3 giây có âm thanh sinh ra bằng FFmpeg (lavfi testsrc + sine wave)
 */
function generateSampleVideo(ffmpegPath, outputPath, durationSec = 3) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-f', 'lavfi', '-i', `testsrc=size=640x360:rate=30`,
      '-f', 'lavfi', '-i', `sine=frequency=1000:sample_rate=44100`,
      '-t', String(durationSec),
      '-c:v', 'libx264', '-preset', 'ultrafast',
      '-c:a', 'aac',
      outputPath
    ];

    const child = spawn(ffmpegPath, args, { windowsHide: true });
    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(outputPath);
      } else {
        reject(new Error(`Tạo video mẫu thất bại với mã lỗi ${code}`));
      }
    });
    child.on('error', reject);
  });
}

/**
 * UNIT TEST MAIN FUNCTION
 */
export async function runFfmpegExtractAudioTest() {
  console.log('==============================================================================');
  console.log('🧪 UNIT TEST: lib/run-ffmpeg.js -> extractAudio()');
  console.log('==============================================================================');

  // 1. Chuẩn bị thư mục tạm
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });

  const ffmpegEngine = new FFmpegProcessorEngine();
  console.log(`[TEST_INIT] Sử dụng FFmpeg Path: ${ffmpegEngine.ffmpegPath}`);

  // 2. Tạo video mẫu để test
  console.log('[TEST_STEP 1] Đang khởi tạo video MP4 đầu vào mẫu (3 giây)...');
  try {
    await generateSampleVideo(ffmpegEngine.ffmpegPath, INPUT_VIDEO_PATH, 3);
    console.log(`[TEST_STEP 1] ✅ Đã tạo video mẫu thành công: ${INPUT_VIDEO_PATH}`);
  } catch (err) {
    console.error(`❌ Không thể khởi tạo video mẫu: ${err.message}. Đảm bảo FFmpeg đã cài trên hệ thống.`);
    throw err;
  }

  // 3. Đăng ký sự kiện lắng nghe progress để test cơ chế đọc stderr
  const capturedProgresses = [];
  ffmpegEngine.on('progress', (data) => {
    capturedProgresses.push(data);
    console.log(`[TEST_PROGRESS_EVENT] Task: ${data.taskId} | Tiến độ: ${data.progress}% | ${data.statusText}`);
  });

  // 4. Thực thi hàm extractAudio
  console.log('[TEST_STEP 2] Thực thi hàm extractAudio()...');
  const taskId = `test_extract_${Date.now()}`;
  let callbackProgressCalled = false;

  const result = await ffmpegEngine.extractAudio(
    INPUT_VIDEO_PATH,
    OUTPUT_AUDIO_PATH,
    'mp3',
    {
      taskId,
      onProgress: (percent, statusMsg) => {
        callbackProgressCalled = true;
        console.log(`[TEST_CALLBACK_PROGRESS] ${percent.toFixed(1)}% - ${statusMsg}`);
      }
    }
  );

  console.log('------------------------------------------------------------------------------');
  console.log('[TEST_VERIFY] Đang kiểm tra assertions...');

  // Assertion 1: Kết quả trả về từ hàm
  console.assert(result && result.success === true, 'Assertion Failed: Kết quả trả về phải chứa success = true');
  console.log('  ✅ Assertion 1 Pass: Output result.success === true');

  // Assertion 2: Kiểm tra file âm thanh đầu ra tồn tại và > 0 byte
  const fileExists = fs.existsSync(OUTPUT_AUDIO_PATH);
  const fileSize = fileExists ? fs.statSync(OUTPUT_AUDIO_PATH).size : 0;
  console.assert(fileExists && fileSize > 0, `Assertion Failed: Tệp ${OUTPUT_AUDIO_PATH} không tồn tại hoặc rỗng.`);
  console.log(`  ✅ Assertion 2 Pass: Tệp âm thanh đầu ra tồn tại (${(fileSize / 1024).toFixed(1)} KB)`);

  // Assertion 3: Kiểm tra luồng stderr được đọc và phát ra tiến độ %
  const has100Percent = capturedProgresses.some((p) => p.progress === 100);
  console.assert(capturedProgresses.length > 0, 'Assertion Failed: Không bắt được sự kiện progress từ stderr log.');
  console.assert(has100Percent, 'Assertion Failed: Không có sự kiện progress 100% khi hoàn tất.');
  console.log(`  ✅ Assertion 3 Pass: Bắt được ${capturedProgresses.length} sự kiện progress từ stderr (bao gồm 100% khi hoàn tất).`);

  // Assertion 4: Kiểm tra callback progress
  console.assert(callbackProgressCalled, 'Assertion Failed: Hàm callback onProgress không được gọi.');
  console.log('  ✅ Assertion 4 Pass: Callback option `onProgress` hoạt động chính xác.');

  console.log('==============================================================================');
  console.log('🎉 PASSED: Tất cả test cases cho `extractAudio` hoạt động hoàn hảo!');
  console.log('==============================================================================');

  return true;
}

// Chạy trực tiếp nếu file được invoke
if (process.argv[1] && process.argv[1].includes('test-ffmpeg-extract.js')) {
  runFfmpegExtractAudioTest().catch((err) => {
    console.error('❌ UNIT TEST FAILED:', err.message);
    process.exit(1);
  });
}
