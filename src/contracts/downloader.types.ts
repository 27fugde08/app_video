export interface DownloadQueueItem {
  id: string;
  url: string;
  platform: "tiktok" | "youtube" | "douyin" | "facebook" | "instagram" | "kuaishou" | "bilibili" | "unknown";
  title: string;
  author?: string;
  likes?: string | number;
  views?: string | number;
  thumbnail: string;
  duration: string;
  resolution: string;
  fileSize: string;
  progress: number;
  status: "pending" | "downloading" | "completed" | "error";
  speed: string;
  errorCount?: number;
  retryAttempts?: number;
  errorLogs?: string[];
  videoId?: string;
  filePath?: string;
}
