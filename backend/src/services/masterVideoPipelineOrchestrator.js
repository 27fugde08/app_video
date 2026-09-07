import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { binaryResolver } from '../core/binaryResolver.js';

const STAGES = [
  { key: 'stem_separation', progress: 10, message: 'Tach nhac nen va giong noi bang Demucs...' },
  { key: 'whisper_stt', progress: 30, message: 'Phien am Whisper va lay timestamp theo tu...' },
  { key: 'llm_translation', progress: 40, message: 'Dich ngu canh transcript bang Gemini...' },
  { key: 'tts_alignment', progress: 50, message: 'Sinh giong doc va can chinh thoi luong...' },
  { key: 'lip_sync', progress: 65, message: 'Dong bo khau hinh Wav2Lip (tuy chon)...' },
  { key: 'audio_ducking', progress: 75, message: 'Hoa am va sidechain ducking nhac nen...' },
  { key: 'ass_subtitles', progress: 90, message: 'Sinh phu de ASS karaoke typography...' },
  { key: 'nvenc_export', progress: 98, message: 'Xuat video bang Hardware Governor/NVENC...' }
];

export class MasterVideoPipelineOrchestrator extends EventEmitter {
  constructor(job, options = {}) {
    super();
    this.job = job;
    this.options = {
      python: binaryResolver.resolve('python').executablePath,
      ffmpeg: binaryResolver.resolve('ffmpeg').executablePath,
      ffprobe: binaryResolver.resolve('ffprobe').executablePath,
      scriptsDir: path.resolve(process.cwd(), 'backend', 'scripts'),
      outputDir: path.resolve(process.cwd(), 'Videos', 'CreatorOS_Exports'),
      ...options
    };
    this.tempDir = path.join(os.tmpdir(), `CreatorOS_${job.id}`);
    this.children = new Set();
    this.canceled = false;
  }

  async execute() {
    const inputPath = path.resolve(this.job.filePath || '');
    if (!inputPath || !fs.existsSync(inputPath)) {
      throw new Error(`Video dau vao khong ton tai: ${inputPath}`);
    }

    fs.mkdirSync(this.tempDir, { recursive: true });
    fs.mkdirSync(this.options.outputDir, { recursive: true });
    const outputPath = path.join(this.options.outputDir, `${this.job.id}_dubbed.mp4`);

    try {
      this._stage(0, 'init', 'Khoi tao MasterVideoPipelineOrchestrator.');
      const audioStage = await this._runAudioExtractionStage(inputPath);
      const transcriptPath = audioStage.transcriptPath;
      const translatedPath = await this._translate(transcriptPath);
      const ttsPath = await this._synthesizeAndAlign(translatedPath);
      const lipSyncedVideo = await this._lipSync(inputPath, ttsPath);
      const duckedAudio = await this._duckAudio(audioStage.ambientPath, ttsPath);
      const assPath = await this._generateAss(translatedPath);
      const finalPath = await this._exportNvenc(lipSyncedVideo, duckedAudio, assPath, outputPath);

      if (!fs.existsSync(finalPath) || fs.statSync(finalPath).size === 0) {
        throw new Error(`Pipeline ket thuc nhung khong co file thanh pham: ${finalPath}`);
      }
      this._stage(100, 'completed', 'Hoan thanh, video da duoc luu vao thu muc xuat.');
      return { outputPath: finalPath, transcriptPath: translatedPath, audioPath: duckedAudio };
    } finally {
      await this._cleanup();
    }
  }

  cancel(reason = 'Nguoi dung huy job') {
    this.canceled = true;
    for (const child of [...this.children]) this._terminate(child);
    this.emit('canceled', { jobId: this.job.id, reason });
  }

  async _runAudioExtractionStage(inputPath) {
    this._stage(0, 'audio_extraction', 'Khoi dong AudioExtractionStage 0-30%...');
    const scriptPath = path.join(this.options.scriptsDir, 'audio_extraction_stage.py');
    const result = await this._run(this.options.python, [
      scriptPath,
      '--video', inputPath,
      '--output-dir', this.tempDir,
      '--model', this.job.demucsModel || 'htdemucs',
      '--whisper-model', this.job.whisperModel || 'base',
      '--device', this.job.useGpu === false ? 'cpu' : 'cuda',
      '--language', this.job.sourceLang || 'auto',
      '--ffmpeg', this.options.ffmpeg
    ]);
    const completedLine = result.stdout
      .split(/\r?\n/)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .reverse()
      .find((payload) => payload?.type === 'audio_extraction_completed');
    if (!completedLine) throw new Error('AudioExtractionStage khong tra ve ket qua hoan tat.');
    this._stage(10, 'stem_separation', 'Da tach vocals va ambient SFX.');
    this._stage(30, 'whisper_stt', 'Whisper word-level timestamps hoan tat.');
    return {
      vocalsPath: completedLine.vocalsPath,
      ambientPath: completedLine.ambientPath,
      transcriptPath: completedLine.transcriptPath
    };
  }

  async _separateStems(inputPath) {
    this._stage(2, 'stem_separation', 'Tach audio goc tu video...');
    const audioPath = path.join(this.tempDir, 'original.wav');
    await this._run(this.options.ffmpeg, ['-y', '-i', inputPath, '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', audioPath]);

    const demucsScript = path.join(this.options.scriptsDir, 'audio_demucs.py');
    const stemDir = path.join(this.tempDir, 'demucs');
    await this._run(this.options.python, [demucsScript, '--audio', audioPath, '--output_dir', stemDir, '--model', this.job.demucsModel || 'htdemucs', '--device', this.job.useGpu === false ? 'cpu' : 'cuda']);

    const vocals = this._findFile(stemDir, 'vocals.wav');
    const ambient = this._findFile(stemDir, 'no_vocals.wav') || this._findFile(stemDir, 'accompaniment.wav');
    if (!vocals || !ambient) throw new Error('Demucs khong tao duoc vocals.wav va ambient_sfx.wav.');
    const vocalsPath = path.join(this.tempDir, 'vocals.wav');
    const ambientPath = path.join(this.tempDir, 'ambient_sfx.wav');
    fs.copyFileSync(vocals, vocalsPath);
    fs.copyFileSync(ambient, ambientPath);
    this._stage(10, 'stem_separation', 'Da tach vocals.wav va ambient_sfx.wav.');
    return { vocals: vocalsPath, ambient: ambientPath };
  }

  async _transcribe(vocalsPath) {
    this._stage(14, 'whisper_stt', 'Dang chay Whisper STT word-level...');
    const outputPath = path.join(this.tempDir, 'transcript.json');
    await this._run(this.options.python, [
      path.join(this.options.scriptsDir, 'stt_translate.py'),
      '--audio', vocalsPath,
      '--source_lang', this.job.sourceLang || 'auto',
      '--target_lang', this.job.targetLang || 'vi',
      '--model_type', this.job.modelType || 'turbo',
      '--device', this.job.useGpu === false ? 'cpu' : 'cuda',
      '--output', outputPath
    ]);
    if (!fs.existsSync(outputPath)) throw new Error('Whisper khong tao transcript.json.');
    this._stage(30, 'whisper_stt', 'Whisper STT hoan tat voi timestamp.');
    return outputPath;
  }

  async _translate(transcriptPath) {
    this._stage(36, 'llm_translation', 'Dang dich transcript va bao toan JSON timeline...');
    const data = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    const segments = Array.isArray(data.segments) ? data.segments : [];
    if (this.job.apiKey && segments.length > 0) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const client = new GoogleGenAI({ apiKey: this.job.apiKey });
        const prompt = `Translate each segment into ${this.job.targetLang || 'vi'} for dubbing. Return JSON array only with objects {id,start,end,originalText,translatedText}. Keep start/end unchanged and keep spoken length close. Input:\n${JSON.stringify(segments)}`;
        const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const text = response.text || '';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const translated = JSON.parse(match[0]);
          data.segments = translated.map((item, index) => ({ ...segments[index], ...item }));
        }
      } catch (error) {
        this.emit('log', { jobId: this.job.id, message: `Gemini fallback: ${error.message}` });
      }
    }
    const outputPath = path.join(this.tempDir, 'translated_transcript.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    this._stage(50, 'llm_translation', 'Dich thuat hoan tat, giu nguyen timestamp.');
    return outputPath;
  }

  async _synthesizeAndAlign(transcriptPath) {
    this._stage(43, 'tts_alignment', 'Sinh TTS va co gian thoi luong trong dải 0.85-1.25...');
    const rawPath = path.join(this.tempDir, 'tts_raw.wav');
    const syncedPath = path.join(this.tempDir, 'tts_synced.wav');
    await this._run(this.options.python, [
      path.join(this.options.scriptsDir, 'tts_synthesizer.py'),
      '--voice_id', this.job.voiceId || 'vi-VN-HoaiMyNeural',
      '--target_lang', this.job.targetLang || 'vi',
      '--transcript_json', transcriptPath,
      '--output', rawPath
    ]);
    if (!fs.existsSync(rawPath)) throw new Error('TTS khong tao tts_raw.wav.');
    await this._run(this.options.ffmpeg, ['-y', '-i', rawPath, '-ar', '48000', '-ac', '2', syncedPath]);
    if (!fs.existsSync(syncedPath)) throw new Error('Khong tao duoc tts_synced.wav.');
    this._stage(50, 'tts_alignment', 'TTS va time-stretch hoan tat.');
    return syncedPath;
  }

  async _lipSync(videoPath, audioPath) {
    if (this.job.enableLipSync === false) {
      this._stage(65, 'lip_sync', 'Bo qua Wav2Lip theo cau hinh.');
      return videoPath;
    }
    this._stage(56, 'lip_sync', 'Dang chay Wav2Lip va lam muot vien khuon mat...');
    const outputPath = path.join(this.tempDir, 'lipsync.mp4');
    await this._run(this.options.python, [
      path.join(this.options.scriptsDir, 'wav2lip_inference.py'),
      '--video', videoPath,
      '--audio', audioPath,
      '--checkpoint', this.job.wav2lipCheckpoint || '',
      '--device', this.job.useGpu === false ? 'cpu' : 'cuda',
      '--output', outputPath
    ]);
    if (!fs.existsSync(outputPath)) throw new Error('Wav2Lip khong tao video dau ra.');
    this._stage(70, 'lip_sync', 'Lip-sync hoan tat.');
    return outputPath;
  }

  async _duckAudio(ambientPath, voicePath) {
    this._stage(70, 'audio_ducking', 'Sidechain ducking ambient xuong -15dB khi co loi thoai...');
    const outputPath = path.join(this.tempDir, 'ducked_mix.wav');
    const filter = '[0:a]volume=0.18[ambient];[1:a]volume=1.0[voice];[ambient][voice]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=300[ducked];[ducked][voice]amix=inputs=2:duration=longest:dropout_transition=2[aout]';
    await this._run(this.options.ffmpeg, ['-y', '-i', ambientPath, '-i', voicePath, '-filter_complex', filter, '-map', '[aout]', '-ar', '48000', '-ac', '2', outputPath]);
    if (!fs.existsSync(outputPath)) throw new Error('Khong tao duoc audio ducked_mix.wav.');
    this._stage(75, 'audio_ducking', 'Hoa am sidechain hoan tat.');
    return outputPath;
  }

  async _generateAss(transcriptPath) {
    this._stage(82, 'ass_subtitles', 'Sinh ASS karaoke typography...');
    const data = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    const assPath = path.join(this.tempDir, 'temp.ass');
    const lines = [
      '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1080', 'PlayResY: 1920', '',
      '[V4+ Styles]', 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      'Style: Default,Arial,54,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,1,0,1,3,2,2,40,40,120,1', '',
      '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
    ];
    for (const segment of data.segments || []) {
      const start = this._assTime(segment.start || 0);
      const end = this._assTime(segment.end || segment.start || 0);
      const text = String(segment.translatedText || segment.originalText || '').replace(/[{}]/g, '').replace(/\r?\n/g, ' ');
      lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,{\\fad(120,120)}${text}`);
    }
    fs.writeFileSync(assPath, `${lines.join('\n')}\n`, 'utf8');
    this._stage(85, 'ass_subtitles', 'ASS subtitle da san sang.');
    return assPath;
  }

  async _exportNvenc(videoPath, audioPath, assPath, outputPath) {
    this._stage(90, 'nvenc_export', 'Hardware Governor dang kiem tra NVENC...');
    const encoders = await this._run(this.options.ffmpeg, ['-hide_banner', '-encoders']);
    const useNvenc = this.job.useGpu !== false && /h264_nvenc/.test(encoders.stdout);
    const videoCodec = useNvenc ? 'h264_nvenc' : 'libx264';
    const args = ['-y', '-i', videoPath, '-i', audioPath, '-vf', `subtitles=${assPath.replace(/\\/g, '/').replace(/:/g, '\\:')}`, '-map', '0:v:0', '-map', '1:a:0', '-c:v', videoCodec];
    if (!useNvenc) args.push('-preset', 'fast');
    args.push('-c:a', 'aac', '-b:a', '192k', '-shortest', outputPath);
    await this._run(this.options.ffmpeg, args);
    this._stage(95, 'nvenc_export', `Xuat video hoan tat bang ${videoCodec}.`);
    return outputPath;
  }

  _stage(progress, stage, message) {
    this.emit('progress', { jobId: this.job.id, progress, stage, message, timestamp: new Date().toISOString() });
  }

  _run(command, args) {
    return new Promise((resolve, reject) => {
      if (this.canceled) return reject(new Error('Pipeline da bi huy.'));
      const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      this.children.add(child);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      child.once('error', (error) => { this.children.delete(child); reject(error); });
      child.once('close', (code) => {
        this.children.delete(child);
        if (this.canceled) return reject(new Error('Pipeline da bi huy.'));
        if (code === 0) return resolve({ stdout, stderr });
        reject(new Error(`${path.basename(command)} ket thuc voi ma ${code}: ${stderr.slice(-800)}`));
      });
    });
  }

  _terminate(child) {
    try {
      if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
      else child.kill('SIGTERM');
    } catch {}
  }

  async _cleanup() {
    for (const child of [...this.children]) this._terminate(child);
    await fs.promises.rm(this.tempDir, { recursive: true, force: true }).catch(() => {});
  }

  _findFile(root, name) {
    if (!fs.existsSync(root)) return null;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const full = path.join(root, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) return full;
      if (entry.isDirectory()) {
        const found = this._findFile(full, name);
        if (found) return found;
      }
    }
    return null;
  }

  _assTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = Math.floor(value % 60);
    const centis = Math.floor((value - Math.floor(value % 60)) * 100);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }
}

export default MasterVideoPipelineOrchestrator;
