/**
 * CreatorOS Desktop - IPC Architecture Contract & Data Types
 * Defines the structured bridge between the UI Layer (Renderer) and Core Daemon (Background Process).
 */

export type PlatformId = 'tiktok' | 'douyin' | 'facebook' | 'youtube' | 'instagram' | 'unknown';

export type JobPriority = 'high' | 'normal' | 'low';

export type JobStatus = 'pending' | 'queued' | 'running' | 'downloading' | 'transcoding' | 'completed' | 'failed' | 'canceled';

export interface IPCRequest<T = any> {
  id: string;
  channel: string;
  payload: T;
  timestamp: string;
}

export interface IPCResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface JobDescriptor {
  id: string;
  url: string;
  platform: PlatformId;
  title: string;
  author: string;
  format: string;
  sizeMb: number;
  progress: number;
  speed: string;
  etaSeconds: number;
  status: JobStatus;
  outputPath?: string;
  audioPath?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface QueueMetrics {
  concurrency: number;
  isPaused: boolean;
  total: number;
  active: number;
  pending: number;
  completed: number;
  failed: number;
  canceled: number;
}

export interface HardwareTelemetryData {
  cpu: number;
  ram: {
    total: number;
    used: number;
    percent: number;
  };
  gpus: Array<{
    name: string;
    vramTotal: number;
    vramUsed: number;
    vramPercent: number;
    utilization: number;
    temperature: number;
  }>;
  vramAlert: {
    triggered: boolean;
    gpuName: string;
    percent: number;
    threshold: number;
  } | null;
  diskFreeGb: number;
  activeThreads: number;
  connectedWs: boolean;
}
