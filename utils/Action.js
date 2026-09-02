/**
 * CreatorOS PRO_V40 - Worker & State Action Constants (utils/Action.js)
 * ==============================================================================
 * Định nghĩa bộ hằng số hành động (Actions) chuẩn hóa cho hệ thống Job Queue Worker,
 * IPC messaging, State Management và Event Emitter toàn hệ thống CreatorOS.
 */

export const JOB_ACTIONS = {
  SUBMIT: 'job:submit',
  START: 'job:start',
  PROGRESS: 'job:progress',
  PAUSE: 'job:pause',
  RESUME: 'job:resume',
  CANCEL: 'job:cancel',
  COMPLETE: 'job:complete',
  FAIL: 'job:fail',
  RETRY: 'job:retry'
};

export const MEDIA_ACTIONS = {
  DUBBING_PIPELINE: 'media:dubbing_pipeline',
  AUDIO_DEMUCS_SEPARATE: 'media:audio_demucs_separate',
  STT_TRANSLATE: 'media:stt_translate',
  TTS_SYNTHESIZE: 'media:tts_synthesize',
  WAV2LIP_LIP_SYNC: 'media:wav2lip_lip_sync',
  FFMPEG_CONCAT: 'media:ffmpeg_concat',
  FFMPEG_TRIM: 'media:ffmpeg_trim',
  FFMPEG_SUBTITLE: 'media:ffmpeg_subtitle',
  FFMPEG_NORMALIZE: 'media:ffmpeg_normalize',
  ANTI_DETECT_MUTATE: 'media:anti_detect_mutate'
};

export const CRAWLER_ACTIONS = {
  SCAN_TIKTOK: 'crawler:scan_tiktok',
  SCAN_DOUYIN: 'crawler:scan_douyin',
  BATCH_DOWNLOAD: 'crawler:batch_download',
  DOWNLOAD_SINGLE: 'crawler:download_single'
};

export const PUBLISH_ACTIONS = {
  POST_FACEBOOK_REELS: 'publish:facebook_reels',
  POST_FACEBOOK_PAGE: 'publish:facebook_page',
  POST_INSTAGRAM_REELS: 'publish:instagram_reels',
  POST_ZALO_VIDEO: 'publish:zalo_video',
  POST_ZALO_OA: 'publish:zalo_oa',
  BATCH_SCHEDULE_PUBLISH: 'publish:batch_schedule'
};

export const SESSION_ACTIONS = {
  CHECK_STATUS: 'session:check_status',
  REFRESH_TOKEN: 'session:refresh_token',
  VALIDATE_COOKIE: 'session:validate_cookie',
  FETCH_INIT_DATA: 'session:fetch_init_data'
};

export const AI_ACTIONS = {
  GENERATE_TEXT: 'ai:generate_text',
  GENERATE_STREAM: 'ai:generate_stream',
  TRANSLATE_CAPTION: 'ai:translate_caption',
  OPTIMIZE_PROMPT: 'ai:optimize_prompt'
};

export const SYSTEM_ACTIONS = {
  VAULT_SYNC: 'system:vault_sync',
  VAULT_CLEANUP: 'system:vault_cleanup',
  UPDATE_CONFIG: 'system:update_config',
  GET_SYS_INFO: 'system:get_sys_info'
};

export const ACTIONS = {
  JOB: JOB_ACTIONS,
  MEDIA: MEDIA_ACTIONS,
  CRAWLER: CRAWLER_ACTIONS,
  PUBLISH: PUBLISH_ACTIONS,
  SESSION: SESSION_ACTIONS,
  AI: AI_ACTIONS,
  SYSTEM: SYSTEM_ACTIONS
};

export default ACTIONS;
