declare global {
  interface Window {
    electronAPI: any;
    api: any;
  }
}

export type ActiveTab =
  | "orchestrator"
  | "workflow"
  | "presets"
  | "workflow-builder"
  | "blueprint-presets"
  | "lan-cluster"
  | "lipsync"
  | "highlight"
  | "review"
  | "translate"
  | "semi-edit"
  | "voice-local"
  | "seo-suite"
  | "batch-downloader"
  | "ai-comic"
  | "phone-farm"
  | "fb-suite"
  | "dashboard"
  | "api-docs"
  | "user-guide"
  | "csharp-wpf"
  | "decoupled-queue";

export type BackendConnectionStatus = "connected" | "connecting" | "polling" | "disconnected" | "simulation";

export interface BackendSyncConfig {
  enabled: boolean;
  wsUrl: string;
  httpUrl: string;
  pollIntervalMs: number;
  autoReconnect: boolean;
}

export interface HardwareTelemetryStats {
  gpu_name: string;
  vram_total_mb: number;
  vram_used_mb: number;
  vram_percent: number;
  gpu_util_percent: number;
  gpu_temp_c?: number;
  nvenc_sessions?: number;
  ram_total_mb: number;
  ram_used_mb: number;
  ram_percent: number;
  nvme_cache_mb: number;
  throttling_active: boolean;
  nvme_speed_status?: string;
}

export type LicenseTier = "COMMUNITY" | "PRO_V48" | "ENTERPRISE" | "LIFETIME_STUDIO";

export interface HardwareFingerprint {
  machine_guid: string;
  cpu_model: string;
  disk_serial_hash: string;
  mac_hash: string;
  fingerprint_code: string;
  os_platform: string;
  generated_at: number;
}

export interface LicenseStatus {
  is_activated: boolean;
  tier: LicenseTier;
  license_key: string;
  fingerprint_bound: string;
  owner_name: string;
  issued_at: number;
  expires_at: number; // 0 for lifetime
  max_nvenc_streams: number;
  features: {
    unlimited_dag: boolean;
    demucs_gpu_isolation: boolean;
    local_voice_cloning: boolean;
    no_strike_matrix: boolean;
    batch_fb_phone_farm: boolean;
    ota_priority_updates: boolean;
  };
}

export interface OtaUpdateMetadata {
  current_version: string;
  latest_version: string;
  has_update: boolean;
  release_date: string;
  release_name: string;
  release_notes: string[];
  download_url: string;
  package_size_mb: number;
  sha256_checksum: string;
  mandatory: boolean;
}

export interface OtaDownloadProgress {
  status: "IDLE" | "CHECKING" | "DOWNLOADING" | "VERIFYING_SHA256" | "READY_TO_RESTART" | "FAILED";
  percent: number;
  downloaded_mb?: number;
  total_mb?: number;
  downloaded_bytes?: number;
  total_bytes?: number;
  speed_mbps: number;
  eta_seconds: number;
  error?: string;
}

export interface WsBridgeStatus {
  status: "connected" | "disconnected" | "reconnecting";
  protocol: string;
  version: string;
  channels: string[];
  latency_ms: number;
  active_connections: number;
}
