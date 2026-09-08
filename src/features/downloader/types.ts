export type SupportedPlatformId =
  | "tiktok"
  | "douyin"
  | "facebook"
  | "youtube"
  | "instagram"
  | "kuaishou"
  | "xiaohongshu"
  | "threads"
  | "twitter"
  | "bilibili"
  | "all"
  | "unknown";

export type DownloadStatus = "queued" | "fetching" | "downloading" | "extracting_audio" | "completed" | "error" | "cancelled" | "paused";

export interface VideoDownloadItem {
  id: string;
  url: string;
  platform: SupportedPlatformId;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
  durationSec: number;
  resolution: string;
  fileSize: string;
  fileSizeBytes: number;
  progress: number;
  status: DownloadStatus;
  speed: string;
  eta: string;
  hasWatermarkRemoved: boolean;
  hasAudioExtracted: boolean;
  filePath?: string;
  audioPath?: string;
  previewUrl?: string;
  error?: string;
  views?: number;
  likes?: number;
  activeChunks?: number;
  createdAt: string;
}

export interface DownloaderConfig {
  saveDirectory: string;
  cookieHeader: string;
  proxyServer: string;
  concurrency: number;
  chunksPerFile?: number;
  speedLimitMbps?: number; // 0 = Unlimited
  namingPattern?: string; // e.g. "{index}_{title}_{platform}"
  skipExisting?: boolean;
  downloadThumbnail?: boolean;
  removeWatermark: boolean;
  extractMp3: boolean;
  extractSubtitles: boolean;
  gpuAcceleration: boolean;
  preferredQuality: "4k" | "1080p" | "720p" | "original";
  autoOrganizeByAuthor: boolean;
  format: "mp4" | "mp3" | "both";
  antiBanJitter?: boolean;
}

export interface DownloaderLogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "nvenc";
  message: string;
}

export interface BatchStats {
  total: number;
  completed: number;
  downloading: number;
  queued: number;
  failed: number;
  totalDownloadedMb: number;
  aggregateSpeedMb?: number;
}
