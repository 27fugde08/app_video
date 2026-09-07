/**
 * CreatorOS Workflow Preset Service
 * Manages saving, loading, exporting, and quick-applying custom preset configurations
 * for Downloader, Audio Separation (Demucs), AI Dubbing (Piper TTS), and NVENC Render Settings.
 */

export interface DownloaderConfigPreset {
  id: string;
  name: string;
  description: string;
  category: 'downloader' | 'dubbing' | 'full_workflow';
  createdAt: string;
  config: {
    downloadDirectory?: string;
    videoQuality?: string;
    audioExtraction?: boolean;
    proxyUrl?: string;
    nvencEncoder?: 'h264_nvenc' | 'hevc_nvenc' | 'libx264';
    presetSpeed?: 'p1' | 'p4' | 'p7';
    aiVoiceModel?: string;
    aiSpeakerRate?: number;
    bgmVolume?: number;
    vocalVolume?: number;
  };
}

const PRESET_STORAGE_KEY = 'creatoros_workflow_presets_v1';

const DEFAULT_PRESETS: DownloaderConfigPreset[] = [
  {
    id: 'preset-tiktok-reels',
    name: 'TikTok & Reels Full HD (Tải Nhanh GPU)',
    description: 'Cấu hình tải 1080p không logo, mã hóa nhanh NVENC GPU H.264',
    category: 'downloader',
    createdAt: new Date().toISOString(),
    config: {
      downloadDirectory: './downloads/reels_tiktok',
      videoQuality: '1080p',
      audioExtraction: false,
      nvencEncoder: 'h264_nvenc',
      presetSpeed: 'p4'
    }
  },
  {
    id: 'preset-dubbing-ai',
    name: 'Lồng Tiếng AI Chuẩn - Giọng Nam 01',
    description: 'Cấu hình tách âm thanh Demucs v4 + Lồng tiếng Piper Nam Bắc tốc độ 1.05x',
    category: 'dubbing',
    createdAt: new Date().toISOString(),
    config: {
      aiVoiceModel: 'vi_VN-nam-medium',
      aiSpeakerRate: 1.05,
      bgmVolume: 0.15,
      vocalVolume: 1.0,
      nvencEncoder: 'h264_nvenc'
    }
  }
];

class WorkflowPresetService {
  private presets: DownloaderConfigPreset[] = [];

  constructor() {
    this.loadPresetsFromStorage();
  }

  private loadPresetsFromStorage(): void {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (raw) {
        this.presets = JSON.parse(raw);
      } else {
        this.presets = [...DEFAULT_PRESETS];
        this.saveToStorage();
      }
    } catch {
      this.presets = [...DEFAULT_PRESETS];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(this.presets));
    } catch (e) {
      console.error('Failed to save presets to localStorage:', e);
    }
  }

  public getAllPresets(): DownloaderConfigPreset[] {
    return [...this.presets];
  }

  public getPresetsByCategory(category: 'downloader' | 'dubbing' | 'full_workflow'): DownloaderConfigPreset[] {
    return this.presets.filter((p) => p.category === category);
  }

  public savePreset(preset: Omit<DownloaderConfigPreset, 'id' | 'createdAt'>): DownloaderConfigPreset {
    const newPreset: DownloaderConfigPreset = {
      ...preset,
      id: `preset-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.presets.unshift(newPreset);
    this.saveToStorage();
    return newPreset;
  }

  public deletePreset(id: string): boolean {
    const initialLen = this.presets.length;
    this.presets = this.presets.filter((p) => p.id !== id);
    if (this.presets.length !== initialLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public exportPresetsJson(): string {
    return JSON.stringify(this.presets, null, 2);
  }

  public importPresetsJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        this.presets = parsed;
        this.saveToStorage();
        return true;
      }
    } catch {
      // Ignored
    }
    return false;
  }
}

export const workflowPresetService = new WorkflowPresetService();
