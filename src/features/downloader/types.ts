export type SupportedPlatformId =
  | "tiktok"
  | "douyin"
  | "facebook"
  | "youtube"
  | "unknown";

export type DownloadStatus = "queued" | "fetching" | "downloading" | "extracting_audio" | "completed" | "error" | "cancelled";

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
  error?: string;
  views?: number;
  likes?: number;
  createdAt: string;
}

export interface DownloaderConfig {
  saveDirectory: string;
  cookieHeader: string;
  proxyServer: string;
  concurrency: number;
  removeWatermark: boolean;
  extractMp3: boolean;
  extractSubtitles: boolean;
  gpuAcceleration: boolean;
  preferredQuality: "4k" | "1080p" | "720p" | "original";
  autoOrganizeByAuthor: boolean;
  format: "mp4" | "mp3" | "both";
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
}
