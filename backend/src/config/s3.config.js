/**
 * CreatorOS Desktop - Local Storage Configuration
 * ==============================================================================
 * 100% Standalone Local Storage.
 * Default path: Environment.GetFolderPath(SpecialFolder.MyVideos)/CreatorOS
 * Zero cloud dependency - saves files directly to user's PC.
 */

import os from 'os';
import path from 'path';

// Default Windows / macOS / Linux Videos folder
const DEFAULT_VIDEOS_DIR = process.platform === 'win32'
  ? path.join(process.env.USERPROFILE || os.homedir(), 'Videos', 'CreatorOS')
  : path.join(os.homedir(), 'Videos', 'CreatorOS');

export const LOCAL_STORAGE_CONFIG = {
  outputDirectory: process.env.CREATOROS_OUTPUT_DIR || DEFAULT_VIDEOS_DIR,
  isLocalOnly: true,
  autoOpenExplorer: true
};

// Backwards-compatible stub
export const R2_CONFIG = {
  bucketName: 'local-disk',
  publicDomain: 'file://local',
  isConfigured: false
};

