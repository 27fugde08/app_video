#!/usr/bin/env node
/**
 * CreatorOS PRO_V40 - FFmpeg Video/Audio Processing Script (backend/scripts/run-ffmpeg.js)
 * Alias bridge to lib/run-ffmpeg.js
 */

export * from '../../lib/run-ffmpeg.js';
import { ffmpegProcessor } from '../../lib/run-ffmpeg.js';

export default ffmpegProcessor;
