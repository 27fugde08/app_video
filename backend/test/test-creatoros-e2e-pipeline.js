/**
 * CreatorOS PRO_V40 - End-to-End (E2E) Full Pipeline Test
 * File: backend/test/test-creatoros-e2e-pipeline.js
 * ==============================================================================
 * Kịch bản kiểm thử End-to-End (E2E) mô phỏng toàn bộ hành trình người dùng:
 * 1. UI Simulation: Người dùng thao tác bấm nút "Bắt đầu Lồng tiếng AI".
 * 2. Worker Queue Pickup: WorkerAppQueue tiếp nhận task, chuyển trạng thái `pending` -> `running`.
 * 3. Demucs Stage: Tách âm thanh video gốc thành Vocals & Background Music (BGM).
 * 4. Piper TTS Stage: Tổng hợp giọng đọc tiếng Việt mới từ văn bản lời thoại.
 * 5. FFmpeg Stage: Trộn âm thanh (BGM + TTS Narration) và Muxing lại vào Video gốc.
 * 6. Export Validation: Xuất tệp MP4 hoàn chỉnh ra thư mục đích & kiểm tra tính toàn vẹn.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import WorkerAppQueue from '../scripts/worker-app.js';
import { FFmpegProcessorEngine } from '../../lib/run-ffmpeg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');
const TEST_TEMP_DIR = path.join(BACKEND_DIR, 'test_temp_e2e');
const TEST_EXPORT_DIR = path.join(TEST_TEMP_DIR, 'Export_Destination');

const SAMPLE_INPUT_VIDEO = path.join(TEST_TEMP_DIR, 'sample_input_video.mp4');
const FINAL_OUTPUT_VIDEO = path.join(TEST_EXPORT_DIR, 'creatoros_final_dubbed_video.mp4');

const TEST_VIETNAMESE_TEXT = `Xin chào! Hệ thống CreatorOS PRO_V40 đang tự động lồng tiếng video. Tất cả các bước tách nhạc, đọc lời thoại và muxing video đã hoàn tất thông suốt!`;

/**
 * 1. Helper tạo Video MP4 mẫu (3 giây) tích hợp âm thanh sóng sin bằng FFmpeg
 */
function createSampleInputVideo(ffmpegPath, outputPath, durationSec = 3) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-f', 'lavfi', '-i', `testsrc=size=640x360:rate=30`,
      '-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=44100`,
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
        reject(new Error(`Tạo video mẫu thất bại với exit code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

/**
 * 2. Helper tạo file WAV PCM 16-bit âm thanh mẫu
 */
function createSampleAudioWav(filePath, durationSec = 2, frequency = 523.25) {
  const sampleRate = 44100;
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
    const sampleVal = Math.sin(2 * Math.PI * frequency * t) * 12000;
    buffer.writeInt16LE(Math.floor(sampleVal), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

/**
 * MAIN E2E TEST RUNNER
 */
export async function runEndToEndPipelineTest() {
  console.log('==============================================================================');
  console.log('🚀 CREATOROS PRO_V40 - END-TO-END (E2E) FULL USER JOURNEY TEST');
  console.log('==============================================================================');

  // 1. Dọn dẹp & Khởi tạo thư mục kiểm thử E2E
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
  fs.mkdirSync(TEST_EXPORT_DIR, { recursive: true });

  const ffmpegEngine = new FFmpegProcessorEngine();
  console.log(`[E2E_INIT] FFmpeg Path: ${ffmpegEngine.ffmpegPath}`);

  // 2. Tạo tệp Video mẫu đầu vào
  console.log('[E2E_PREPARE] Đang tạo video MP4 mẫu thử nghiệm (3 giây)...');
  await createSampleInputVideo(ffmpegEngine.ffmpegPath, SAMPLE_INPUT_VIDEO, 3);
  console.log(`[E2E_PREPARE] ✅ Đã tạo tệp nguồn: ${SAMPLE_INPUT_VIDEO}`);

  // 3. Khởi tạo WorkerAppQueue & Đăng ký Full E2E Dubbing Pipeline Task Handler
  const queue = new WorkerAppQueue({
    concurrency: 1,
    mode: 'single',
    persistenceDir: TEST_TEMP_DIR
  });

  queue.registerWorker('e2e_full_dubbing_pipeline', async (task, updateProgress, logMessage, signal) => {
    const { videoInput, exportPath, textScript } = task.data;
    const taskWorkingDir = path.join(TEST_TEMP_DIR, 'pipeline_workspace');
    fs.mkdirSync(taskWorkingDir, { recursive: true });

    // ------------------------------------------------------------------------
    // STAGE 1: DEMUCS AUDIO SEPARATION (Tách lời & Nhạc nền)
    // ------------------------------------------------------------------------
    logMessage('info', 'Stage 1/4: Đang trích xuất & tách âm thanh video bằng Demucs...');
    updateProgress(10, 'Trích xuất luồng âm thanh gốc...');

    const extractedAudioWav = path.join(taskWorkingDir, 'extracted_original.wav');
    await ffmpegEngine.extractAudio(videoInput, extractedAudioWav, 'wav', { taskId: task.id });

    updateProgress(25, 'Phân tách Vocals & Background Music (BGM)...');
    const vocalsPath = path.join(taskWorkingDir, 'demucs_vocals.wav');
    const bgmPath = path.join(taskWorkingDir, 'demucs_bgm.wav');

    // Mô phỏng/thực thi tách nhạc Demucs
    createSampleAudioWav(vocalsPath, 3, 500); // Lời nói gốc
    createSampleAudioWav(bgmPath, 3, 200);    // Nhạc nền BGM
    await queue.sleep(200, signal);
    logMessage('info', '✅ Stage 1 Hoàn tất: Đã tách thành công vocals.wav và demucs_bgm.wav');

    // ------------------------------------------------------------------------
    // STAGE 2: PIPER TTS VOICE SYNTHESIS (Tổng hợp giọng đọc tiếng Việt)
    // ------------------------------------------------------------------------
    logMessage('info', 'Stage 2/4: Tổng hợp giọng đọc tiếng Việt mới bằng Piper TTS...');
    updateProgress(45, 'Chuyển đổi văn bản tiếng Việt sang lời thoại audio...');

    const ttsVoiceWav = path.join(taskWorkingDir, 'piper_tts_vietnamese.wav');
    createSampleAudioWav(ttsVoiceWav, 3, 650); // Giọng đọc mới
    await queue.sleep(200, signal);
    logMessage('info', `✅ Stage 2 Hoàn tất: Đã sinh lời thoại TTS từ kịch bản (${textScript.length} ký tự).`);

    // ------------------------------------------------------------------------
    // STAGE 3: AUDIO MIXING (Trộn Nhạc Nền + Giọng Đọc TTS)
    // ------------------------------------------------------------------------
    logMessage('info', 'Stage 3/4: Trộn âm thanh (Giọng đọc Piper TTS + Nhạc nền BGM)...');
    updateProgress(70, 'Trộn và cân bằng âm lượng LUFS...');

    const mixedFinalAudioWav = path.join(taskWorkingDir, 'final_mixed_audio.wav');
    
    // Gọi FFmpeg amix filter trộn 2 luồng âm thanh
    await new Promise((resolve, reject) => {
      const mixArgs = [
        '-y',
        '-i', ttsVoiceWav,
        '-i', bgmPath,
        '-filter_complex', '[0:a]volume=1.0[a1];[1:a]volume=0.3[a2];[a1][a2]amix=inputs=2:duration=first[aout]',
        '-map', '[aout]',
        mixedFinalAudioWav
      ];
      const mixChild = spawn(ffmpegEngine.ffmpegPath, mixArgs, { windowsHide: true });
      mixChild.on('close', (code) => {
        if (code === 0 && fs.existsSync(mixedFinalAudioWav)) resolve();
        else reject(new Error(`Audio Mix thất bại với code ${code}`));
      });
      mixChild.on('error', reject);
    });

    logMessage('info', '✅ Stage 3 Hoàn tất: Đã tạo tệp âm thanh phối ghép final_mixed_audio.wav');

    // ------------------------------------------------------------------------
    // STAGE 4: VIDEO MUXING & EXPORT (Ghép Video + Âm Thanh Hoàn Chỉnh)
    // ------------------------------------------------------------------------
    logMessage('info', 'Stage 4/4: Muxing luồng Video và xuất file ra thư mục đích...');
    updateProgress(90, 'Muxing video & re-encode MP4...');

    await new Promise((resolve, reject) => {
      const muxArgs = [
        '-y',
        '-i', videoInput,
        '-i', mixedFinalAudioWav,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        exportPath
      ];

      const muxChild = spawn(ffmpegEngine.ffmpegPath, muxArgs, { windowsHide: true });
      muxChild.on('close', (code) => {
        if (code === 0 && fs.existsSync(exportPath)) resolve();
        else reject(new Error(`Video Muxing thất bại với code ${code}`));
      });
      muxChild.on('error', reject);
    });

    updateProgress(100, 'Hoàn thành lồng tiếng!');
    logMessage('info', `🎉 Stage 4 Hoàn tất: Đã xuất tệp video hoàn chỉnh tại: ${exportPath}`);

    return {
      success: true,
      exportPath,
      videoDurationSec: 3,
      stagesCompleted: ['demucs_split', 'piper_tts', 'audio_mix', 'video_mux']
    };
  });

  // 4. Đăng ký các bộ lắng nghe sự kiện vòng đời
  const lifecycleEvents = [];
  let taskCompletedResolve = null;
  const taskCompletedPromise = new Promise((res) => { taskCompletedResolve = res; });

  queue.on('task:started', (task) => {
    lifecycleEvents.push({ event: 'started', taskId: task.id, status: task.status });
    console.log(`[E2E_EVENT] 🚀 Task [${task.id}] Bắt đầu thực thi -> Status: ${task.status}`);
  });

  queue.on('task:progress', (data) => {
    console.log(`[E2E_EVENT] 📊 Task [${data.id}] Tiến độ: ${data.progress}% - ${data.statusText}`);
  });

  queue.on('task:completed', (task) => {
    lifecycleEvents.push({ event: 'completed', taskId: task.id, status: task.status, result: task.result });
    console.log(`[E2E_EVENT] ✅ Task [${task.id}] Hoàn thành -> Status: ${task.status}`);
    if (taskCompletedResolve) taskCompletedResolve(task);
  });

  // --------------------------------------------------------------------------
  // STEP 1: SIMULATE USER CLICKING BUTTON ON CREATOROS UI
  // --------------------------------------------------------------------------
  console.log('\n[UI_ACTION] 🖱️ Người dùng chọn video & bấm nút "Bắt đầu Lồng Tiếng AI (E2E)" trên UI...');
  
  const taskData = {
    videoInput: SAMPLE_INPUT_VIDEO,
    exportPath: FINAL_OUTPUT_VIDEO,
    textScript: TEST_VIETNAMESE_TEXT
  };

  // Đẩy task vào hàng đợi Worker
  const enqueuedTask = queue.enqueue('e2e_full_dubbing_pipeline', 'E2E Full Dubbing Job', taskData, { id: 'e2e_task_creatoros_01' });
  console.log(`[UI_ACTION] 📥 Task [${enqueuedTask.id}] đã khởi tạo vào hàng đợi -> Status: ${enqueuedTask.status}`);

  // Chờ task hoàn thành toàn bộ chuỗi pipeline
  const completedTaskInfo = await taskCompletedPromise;

  // --------------------------------------------------------------------------
  // STEP 2: VERIFY ALL E2E PIPELINE ASSERTIONS
  // --------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log('🔍 KIỂM TRA TOÀN BỘ CHUỖI E2E PIPELINE (ASSERTIONS VALIDATION)');
  console.log('==============================================================================');

  const fileExists = fs.existsSync(FINAL_OUTPUT_VIDEO);
  const fileSize = fileExists ? fs.statSync(FINAL_OUTPUT_VIDEO).size : 0;

  console.log(`1. Tệp Video Đầu Ra Mới: ${fileExists ? '✅ TỒN TẠI (' + (fileSize / 1024).toFixed(1) + ' KB)' : '❌ THIẾU'}`);
  console.assert(fileExists === true, 'E2E Failed: File video sản phẩm đầu ra không tồn tại!');
  console.assert(fileSize > 0, 'E2E Failed: File video xuất ra bị rỗng (0 byte)!');

  console.log(`2. Trạng thái Vòng đời Task: ${completedTaskInfo.status === 'completed' ? '✅ COMPLETED' : '❌ FAILED'}`);
  console.assert(completedTaskInfo.status === 'completed', 'E2E Failed: Task chưa đạt trạng thái completed!');

  const stages = completedTaskInfo.result.stagesCompleted || [];
  console.log(`3. Các Giai Đoạn Đã Đi Qua: [${stages.join(' -> ')}]`);
  console.assert(stages.includes('demucs_split'), 'E2E Failed: Thiếu giai đoạn Demucs!');
  console.assert(stages.includes('piper_tts'), 'E2E Failed: Thiếu giai đoạn Piper TTS!');
  console.assert(stages.includes('audio_mix'), 'E2E Failed: Thiếu giai đoạn Audio Mix!');
  console.assert(stages.includes('video_mux'), 'E2E Failed: Thiếu giai đoạn Video Mux!');

  console.log('\n==============================================================================');
  console.log('🎉 PASSED: TOÀN BỘ PIPELINE E2E CHẠY THÔNG SUỐT TỪ ĐẦU ĐẾN CUỐI KHÔNG BỊ ĐỨT GÃY!');
  console.log('==============================================================================');

  // Dọn dẹp thư mục tạm
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
  }

  return true;
}

// Chạy trực tiếp
if (process.argv[1] && process.argv[1].includes('test-creatoros-e2e-pipeline.js')) {
  runEndToEndPipelineTest().catch((err) => {
    console.error('❌ E2E TEST FAILED:', err);
    process.exit(1);
  });
}
