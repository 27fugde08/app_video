// Highlight Tool Types
export interface HighlightItem {
  id: string;
  startTime: string;
  endTime: string;
  hookTitle: string;
  viralScore: number;
  voiceScript: string;
  brollSuggestion: string;
  caption: string;
}

export interface HighlightResult {
  highlights: HighlightItem[];
  summary: string;
  retentionAdvice: string;
}

// Review Tool Types
export interface ReviewAct {
  actName: string;
  duration: string;
  content: string;
  visualPrompt: string;
}

export interface ReviewResult {
  title: string;
  language: string;
  hook: string;
  acts: ReviewAct[];
  verdict: {
    rating: string;
    pros: string[];
    cons: string[];
    targetAudience: string;
  };
  callToAction: string;
}

// Translate Video Types
export interface TranslationSegment {
  id: number;
  timeStart: string;
  timeEnd: string;
  original: string;
  translated: string;
  voiceEmotion: string;
  subtitleStyled: string;
}

export interface TranslationResult {
  sourceLang: string;
  targetLang: string;
  segments: TranslationSegment[];
  srtOutput: string;
}

// Semi-Content Editor Types
export interface SemiContentResult {
  projectTitle: string;
  splitLayout: {
    topVideo: string;
    bottomVideo: string;
    ratio: string;
  };
  audioModifications: {
    pitchShift: string;
    speedFactor: string;
    bgm: string;
    sfxCues: Array<{ time: string; sfx: string }>;
  };
  visualFilters: {
    colorLUT: string;
    grainLevel: string;
    borderFrame: string;
    mirrorHorizontal: boolean;
  };
  fairUseScore: number;
  voiceScript: string;
  renderChecklist: string[];
}

// SEO & Thumbnail Types
export interface ViralTitle {
  title: string;
  ctrEstimate: string;
  hookType: string;
}

export interface ThumbnailIdea {
  concept: string;
  textOverlay: string;
  focalPoint: string;
  promptForAIImage: string;
}

export interface SeoResult {
  viralTitles: ViralTitle[];
  optimizedDescription: string;
  rankedTags: string[];
  thumbnailIdeas: ThumbnailIdea[];
}

// AI Comic Types
export interface CharacterDNA {
  name: string;
  gender: string;
  appearance: string;
  seedPromptKey: string;
  consistentSeed: number;
}

export interface ComicPanel {
  panelNumber: number;
  sceneDescription: string;
  dialogue: string;
  soundEffect: string;
  visualPrompt: string;
}

export interface ComicStoryResult {
  characterDNA: CharacterDNA;
  storyTitle: string;
  panels: ComicPanel[];
}

// Channel Audit Types
export interface ChannelAuditResult {
  channelName: string;
  healthScore: number;
  retentionAnalysis: {
    dropOffPoint: string;
    avgWatchPercentage: string;
    idealDuration: string;
  };
  monetizationRPM: {
    estimatedRPM: string;
    rpmVN: string;
    potentialMonthlyRevenue: string;
  };
  strengths: string[];
  bottlenecks: string[];
  actionRoadmap30Days: Array<{ week: string; task: string }>;
}

// FB Automation Types
export interface FbMatrixSlot {
  slot: string;
  time: string;
  target: string;
}

export interface FbAutomationResult {
  title?: string;
  niche?: string;
  postCaption: string;
  firstCommentLink: string;
  fbAntiCopyrightMeasures: string[];
  scheduledTimes: string[];
  matrixSchedule?: FbMatrixSlot[];
  hashtags: string[];
  generatedMd5?: string;
  outputFile?: string;
  aspectRatio?: string;
}

// Local AI Lip-Sync Types
export interface LipSyncEngineInfo {
  engine: string;
  model_name: string;
  active_provider: "TensorrtExecutionProvider" | "CUDAExecutionProvider" | "CPUExecutionProvider";
  supported_providers: string[];
  is_cuda_available: boolean;
  is_tensorrt_available: boolean;
  target_fps: number;
  inference_batch_size: number;
  face_crop_size: string;
  features: string[];
}

export interface LipSyncProcessResult {
  output_video: string;
  source_video: string;
  source_audio: string;
  provider_used: string;
  metrics: {
    total_frames_processed: number;
    video_duration_sec: number;
    inference_fps: number;
    total_execution_time_sec: number;
    sync_confidence_score: number;
    vram_peak_mb: number;
    face_landmarks_detected: number;
  };
  message: string;
}
