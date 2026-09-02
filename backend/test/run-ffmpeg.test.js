import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { FFmpegProcessorEngine, parseFfmpegTimeToSeconds } from '../lib/run-ffmpeg.js';

describe('FFmpegProcessorEngine - extractAudio() Unit Test', () => {
  const TEST_TEMP_DIR = path.join(__dirname, 'temp_test_ffmpeg');
  const INPUT_VIDEO_PATH = path.join(TEST_TEMP_DIR, 'sample.mp4');
  const OUTPUT_AUDIO_PATH = path.join(TEST_TEMP_DIR, 'output.mp3');
  let ffmpegEngine;

  beforeAll((done) => {
    if (!fs.existsSync(TEST_TEMP_DIR)) {
      fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
    }
    ffmpegEngine = new FFmpegProcessorEngine();

    // Tạo video 2 giây làm dữ liệu mẫu
    const child = spawn(ffmpegEngine.ffmpegPath, [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      '-t', '2',
      '-c:v', 'libx264', '-preset', 'ultrafast',
      '-c:a', 'aac',
      INPUT_VIDEO_PATH
    ]);

    child.on('close', (code) => {
      if (code === 0) done();
      else done(new Error(`Tạo video mẫu thất bại với mã lỗi ${code}`));
    });
  }, 15000);

  afterAll(() => {
    if (fs.existsSync(TEST_TEMP_DIR)) {
      fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
    }
  });

  test('Tách âm thanh từ video và đọc chính xác phần trăm tiến độ từ stderr', async () => {
    const progressEvents = [];
    const progressCallbackMock = jest.fn();

    ffmpegEngine.on('progress', (data) => {
      progressEvents.push(data);
    });

    const result = await ffmpegEngine.extractAudio(
      INPUT_VIDEO_PATH,
      OUTPUT_AUDIO_PATH,
      'mp3',
      {
        taskId: 'jest_test_task',
        onProgress: progressCallbackMock
      }
    );

    // 1. Kiểm tra kết quả trả về
    expect(result).toBeDefined();
    expect(result.success).toBe(true);

    // 2. Kiểm tra tệp âm thanh đầu ra có tồn tại và dung lượng > 0 byte
    expect(fs.existsSync(OUTPUT_AUDIO_PATH)).toBe(true);
    const stats = fs.statSync(OUTPUT_AUDIO_PATH);
    expect(stats.size).toBeGreaterThan(0);

    // 3. Kiểm tra cơ chế đọc stderr và phát tiến độ (%)
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents.some(e => e.progress === 100)).toBe(true);

    // 4. Kiểm tra callback
    expect(progressCallbackMock).toHaveBeenCalled();
  }, 20000);

  test('Hàm parseFfmpegTimeToSeconds chuyển đổi định dạng time=hh:mm:ss.ms chính xác', () => {
    expect(parseFfmpegTimeToSeconds('00:01:30.50')).toBe(90.5);
    expect(parseFfmpegTimeToSeconds('01:00:00.00')).toBe(3600);
    expect(parseFfmpegTimeToSeconds('00:00:00.00')).toBe(0);
  });
});
