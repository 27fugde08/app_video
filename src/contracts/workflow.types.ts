import { HardwareTelemetryStats } from "./system.types";

export type PipelinePriority = "HIGH" | "NORMAL" | "LOW";

export interface PipelineStepNode {
  id: string;
  name: string;
  description: string;
  module: "ingestion" | "nostrike_edit" | "ai_highlight_review" | "local_voice_dub" | "fb_reels_dispatch" | "custom";
  status: "idle" | "running" | "completed" | "failed" | "skipped";
  iconName: string;
  estimatedVramMb: number;
  gpuAccelerated: boolean;
}

export interface PipelineJobItem {
  id: string;
  title: string;
  priority: PipelinePriority;
  status: "queued" | "running" | "paused" | "completed" | "failed";
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: string[];
  artifacts?: Record<string, any>;
  checkpointSaved: boolean;
  hardwareSnapshot?: HardwareTelemetryStats | null;
  logs?: string[];
  progress: number;
  createdAt: number;
  updatedAt?: number;
}

// Agentic Self-Healing & Vector RAG Types
export interface HealingIncidentItem {
  id: string;
  pipeline_id: string;
  task_type: string;
  error_category: string;
  error_raw_snippet?: string;
  root_cause_analysis: string;
  suggested_action: string;
  fallback_parameters?: Record<string, any>;
  fallback_parameters_json?: string;
  retry_count: number;
  resolved: number | boolean;
  created_at: number;
  resolved_at?: number | null;
}

export interface RagDocumentItem {
  doc_id: string;
  title: string;
  source_type: string;
  total_chunks: number;
  created_at: number;
}

export interface RagSearchResultItem {
  chunk_id: string;
  doc_id: string;
  start_time: string;
  end_time: string;
  text: string;
  similarity: number;
  similarity_percent: number;
  viral_score: number;
  emotional_tag: string;
}

export interface QcReport {
  qc_passed: boolean;
  qc_score: number;
  status: "APPROVED" | "REQUIRES_ATTENTION" | "REJECTED";
  total_clips: number;
  estimated_duration_sec: number;
  fair_use_ratio: number;
  narrative_arc: string;
  issues: string[];
  recommendations: string[];
  fixes_applied: string[];
  timestamp: number;
}

// Visual Workflow Builder (DAG) Types
export type WorkflowNodeType =
  | "ingest_video"
  | "demucs_stem"
  | "nostrike_nvenc"
  | "voice_local"
  | "lipsync_onnx"
  | "lan_distributed"
  | "chunk_splitter"
  | "ai_recap"
  | "qc_validation"
  | "fb_dispatch";

export interface WorkflowNodePort {
  id: string;
  name: string;
  type: "video" | "audio" | "text" | "json" | "any";
}

export interface WorkflowNodeData {
  id: string;
  type: WorkflowNodeType;
  title: string;
  label: string;
  x: number;
  y: number;
  status?: "IDLE" | "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress?: number;
  params: Record<string, any>;
  inputs: WorkflowNodePort[];
  outputs: WorkflowNodePort[];
  outputArtifacts?: Record<string, any>;
  errorMessage?: string;
}

export interface WorkflowEdgeData {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  animated?: boolean;
}

export interface WorkflowDAG {
  workflow_id: string;
  title: string;
  description?: string;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
  created_at: number;
  updated_at: number;
}

export interface WorkflowExecutionPlan {
  workflow_id: string;
  stages: Array<{
    stage_index: number;
    parallel_nodes: string[];
  }>;
  total_nodes: number;
  execution_order: string[];
}

// User Presets & Blueprints Types
export type PresetCategory = "nostrike" | "voice" | "script" | "workflow" | "qc" | "general" | "social" | "recap";

export interface UserPresetItem {
  id: string;
  name: string;
  category: PresetCategory;
  description: string;
  config: Record<string, any>;
  tags: string[];
  is_favorite: boolean;
  created_at: number;
  updated_at: number;
}

export interface BlueprintExportPackage {
  format: "creatoros-blueprint-v1";
  version: string;
  exported_at: number;
  metadata: {
    title: string;
    author: string;
    description: string;
    category: string;
    tags: string[];
  };
  preset_data: Record<string, any>;
  signature: string;
}

// Local LLM Agent Types
export interface LocalLlmStatus {
  version: string;
  model_name: string;
  backend: string;
  gpu_layers_offloaded: number;
  context_window: number;
  is_loaded: boolean;
  supported_models: Array<{
    id: string;
    name: string;
    vram_mb: number;
    recommended: boolean;
  }>;
}

export interface LlmDagResult {
  success: boolean;
  workflow_id: string;
  dag: {
    workflow_id: string;
    name: string;
    description: string;
    intent_detected: string;
    confidence_score: number;
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      config: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      sourceNodeId: string;
      targetNodeId: string;
    }>;
    metadata?: Record<string, any>;
  };
  summary: string;
}

// Master-Worker LAN Cluster Rendering Types
export interface LanWorkerItem {
  worker_id: string;
  hostname: string;
  ip_address: string;
  port: number;
  gpu_name: string;
  vram_total_mb: number;
  vram_free_mb: number;
  vram_percent: number;
  status: "IDLE" | "RENDERING" | "BUSY" | "OFFLINE";
  speed_factor: number;
  is_alive: boolean;
  active_chunks: string[];
}

export interface LanClusterStatus {
  cluster_version: string;
  master_node: {
    hostname: string;
    ip: string;
    port: number;
  };
  total_nodes: number;
  active_nodes: number;
  total_vram_mb: number;
  free_vram_mb: number;
  cluster_vram_percent: number;
  workers: LanWorkerItem[];
}

export interface LanRenderChunk {
  chunk_id: string;
  index: number;
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  assigned_worker_id: string;
  assigned_worker_name: string;
  assigned_worker_ip: string;
  status: "READY" | "RENDERING" | "COMPLETED" | "FAILED";
  progress_percent: number;
  output_filename: string;
}

export interface LanJobPlan {
  job_id: string;
  source_video: string;
  total_duration_sec: number;
  total_chunks: number;
  workers_allocated: number;
  estimated_render_time_sec: number;
  speedup_vs_single_node: string;
  chunks: LanRenderChunk[];
  final_output_path: string;
}

// Phone Farm Types
export interface PhoneDevice {
  id: string;
  name: string;
  brand: string;
  androidVersion: string;
  battery: number;
  status: "online" | "syncing" | "idle" | "farming";
  currentTask: string;
  ipProxy: string;
  screenImage: string;
  appsInstalled: string[];
}
