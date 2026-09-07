export type GlobalTaskType =
  | "download"
  | "video-edit"
  | "translate"
  | "highlight"
  | "voice-synth"
  | "fb-render"
  | "comic-render"
  | "seo-generate";

export type GlobalTaskStatus = "queued" | "processing" | "completed" | "failed" | "paused";

export interface GlobalTaskItem {
  id: string;
  type: GlobalTaskType;
  title: string;
  subtitle?: string;
  sourceUrl?: string;
  thumbnail?: string;
  targetChannel?: string;
  platform?: "tiktok" | "youtube" | "facebook" | "instagram" | "douyin" | "general";
  estimatedDuration?: string;
  resolution?: string;
  viralScore?: number;
  scriptSnippet?: string;
  tags?: string[];
  approved?: boolean;
  approvedAt?: number;
  scheduledTime?: string;
  progress: number; // 0 - 100
  status: GlobalTaskStatus;
  currentStep: string;
  speed?: string;
  eta?: string;
  createdAt: number;
  completedAt?: number;
  logs: Array<{ timestamp: string; message: string }>;
  outputArtifact?: {
    name: string;
    size?: string;
    type?: "video" | "audio" | "srt" | "zip" | "image";
    downloadUrl?: string;
  };
  error?: string;
}

export interface QueueStats {
  total: number;
  processing: number;
  queued: number;
  completed: number;
  failed: number;
  paused: number;
}

export interface QueueSettings {
  autoRemoveCompleted: boolean;
  autoRemoveDelaySeconds: number; // 0 (ngay lập tức), 5, 10, 30, 60, 300
  autoRemoveOnModalClose: boolean;
}

export interface BackendTaskUpdatePayload {
  id: string;
  progress?: number;
  status?: GlobalTaskStatus;
  currentStep?: string;
  speed?: string;
  eta?: string;
  outputArtifact?: GlobalTaskItem["outputArtifact"];
  error?: string;
  log?: { timestamp: string; message: string };
  logs?: Array<{ timestamp: string; message: string }>;
}
