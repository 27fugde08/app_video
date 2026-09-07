/**
 * CreatorOS Video SaaS - Scoped Temporary Directory & Disk Hygiene Manager
 * ==============================================================================
 * Strict RAII pattern: Enforces temporary directory allocation per job and
 * guarantees 100% deterministic cleanup inside `finally` blocks.
 * Zero-leakage policy prevents disk saturation (100% disk full / inode depletion).
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const BASE_TEMP_ROOT = path.join(os.tmpdir(), 'creatoros_jobs');

/**
 * Ensures base temporary root exists
 */
export async function ensureBaseTempDir() {
  await fs.mkdir(BASE_TEMP_ROOT, { recursive: true });
}

/**
 * Creates an isolated scratch workspace for a single job
 * @param {string} jobId
 * @returns {Promise<string>} Absolute workspace directory path
 */
export async function createJobWorkspace(jobId) {
  const sanitizedId = String(jobId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const workspacePath = path.join(BASE_TEMP_ROOT, sanitizedId);
  await fs.mkdir(workspacePath, { recursive: true });
  return workspacePath;
}

/**
 * Purges a workspace directory and all its child files
 * @param {string} workspacePath
 */
export async function purgeJobWorkspace(workspacePath) {
  try {
    await fs.rm(workspacePath, { recursive: true, force: true });
    console.log(`[TempCleaner] ✅ Đã dọn sạch hoàn toàn thư mục tạm: ${workspacePath}`);
  } catch (err) {
    console.error(`[TempCleaner] ⚠️ Lỗi dọn dẹp thư mục ${workspacePath}: ${err.message}`);
  }
}

/**
 * Higher-Order Function / Safe Scope (RAII)
 * Executes the worker job logic inside an isolated directory and guarantees cleanup.
 * 
 * @template T
 * @param {string} jobId
 * @param {(workspacePath: string) => Promise<T>} taskRunner
 * @returns {Promise<T>}
 */
export async function withJobWorkspace(jobId, taskRunner) {
  const workspacePath = await createJobWorkspace(jobId);
  try {
    return await taskRunner(workspacePath);
  } finally {
    // Guaranteed execution in finally block regardless of success or crash
    await purgeJobWorkspace(workspacePath);
  }
}

/**
 * Sweeps stale job directories older than maxAgeMs (e.g. from previous hard container crashes)
 * @param {number} [maxAgeMs=3600000] 1 hour default
 */
export async function cleanupStaleWorkspaces(maxAgeMs = 3600000) {
  try {
    await ensureBaseTempDir();
    const entries = await fs.readdir(BASE_TEMP_ROOT, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(BASE_TEMP_ROOT, entry.name);
        try {
          const stats = await fs.stat(dirPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.rm(dirPath, { recursive: true, force: true });
            console.log(`[TempCleaner] 🧹 Đã dọn dẹp thư mục tạm mồ côi: ${dirPath}`);
          }
        } catch {
          // Ignore transient stat errors
        }
      }
    }
  } catch (err) {
    console.warn(`[TempCleaner] Lỗi quét dọn rác nền: ${err.message}`);
  }
}
