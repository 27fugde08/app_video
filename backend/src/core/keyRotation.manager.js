/**
 * CreatorOS Desktop - AI Key Pool & Rotation Manager
 * 
 * Intelligent Round-Robin & Failover Key Dispatcher:
 * - Prevents Rate-Limit (429 HTTP errors) across concurrent AI tasks
 * - Automatically isolates unhealthy/exhausted keys with temporary cooldowns
 * - Tracks usage telemetry (calls count, latency, error count, last used)
 * - Supports seamless failover: if Key A returns 429, Key B is immediately assigned
 */

import { EventEmitter } from 'node:events';
import { keyVaultService } from '../services/keyVault.service.js';
import { keyHealthCheckService } from '../services/keyHealthCheck.service.js';

export class KeyRotationManager extends EventEmitter {
  constructor() {
    super();
    this.platformPointers = new Map(); // platform -> current index for Round-Robin
    this.autoRotationEnabled = true;
    this.cooldownMap = new Map(); // keyId -> cooldownUntil (timestamp)
    this.keyStats = new Map(); // keyId -> { callsCount, errorsCount, lastUsedAt }
  }

  /**
   * Acquire the best available active key for a given platform
   * @param {string} platform - 'Gemini' | 'OpenAI' | 'Claude'
   * @returns {Promise<{ keyId: string, apiKey: string, platform: string, isRotated: boolean }>}
   */
  async acquireKey(platform = 'Gemini') {
    const allKeys = await keyVaultService.loadKeys();
    const cleanPlatform = platform.toLowerCase();

    // Filter active and non-cooldown keys for this platform
    const platformKeys = allKeys.filter((k) => {
      const matchPlat = (k.platform || '').toLowerCase().includes(cleanPlatform);
      const isHealthy = k.status !== 'invalid';
      const notInCooldown = !this._isKeyInCooldown(k.id);
      return matchPlat && isHealthy && notInCooldown;
    });

    if (platformKeys.length === 0) {
      // Fallback: try any valid key for this platform even in cooldown
      const fallbackKeys = allKeys.filter((k) =>
        (k.platform || '').toLowerCase().includes(cleanPlatform) && k.status !== 'invalid'
      );

      if (fallbackKeys.length === 0) {
        throw new Error(`[KeyRotationManager] Không có API Key hợp lệ nào cho nền tảng "${platform}". Vui lòng thêm Key mới trong phần Quản Lý AI.`);
      }

      const selected = fallbackKeys[0];
      this._recordKeyUsage(selected.id);
      return {
        keyId: selected.id,
        apiKey: selected.rawKey || selected.key,
        platform: selected.platform,
        isRotated: false,
        warning: 'Key đang trong thời gian hồi phục Rate-limit.'
      };
    }

    // Select Key using Round-Robin pointer
    let pointer = this.platformPointers.get(cleanPlatform) || 0;
    if (pointer >= platformKeys.length) pointer = 0;

    const selectedKey = platformKeys[pointer];

    // Increment pointer for next rotation
    if (this.autoRotationEnabled) {
      this.platformPointers.set(cleanPlatform, (pointer + 1) % platformKeys.length);
    }

    this._recordKeyUsage(selectedKey.id);
    this.emit('key:rotated', {
      keyId: selectedKey.id,
      platform: selectedKey.platform,
      pointerIndex: pointer,
      totalKeys: platformKeys.length
    });

    return {
      keyId: selectedKey.id,
      apiKey: selectedKey.rawKey || selectedKey.key,
      platform: selectedKey.platform,
      isRotated: true,
      callsCount: (this.keyStats.get(selectedKey.id)?.callsCount || 0)
    };
  }

  /**
   * Report rate limit or error on a specific key to trigger automatic failover
   * @param {string} keyId 
   * @param {number} [cooldownSeconds=60] 
   */
  reportRateLimit(keyId, cooldownSeconds = 60) {
    const cooldownUntil = Date.now() + cooldownSeconds * 1000;
    this.cooldownMap.set(keyId, cooldownUntil);

    const stats = this.keyStats.get(keyId) || { callsCount: 0, errorsCount: 0 };
    stats.errorsCount = (stats.errorsCount || 0) + 1;
    this.keyStats.set(keyId, stats);

    this.emit('key:rate_limited', {
      keyId,
      cooldownSeconds,
      cooldownUntil: new Date(cooldownUntil).toISOString()
    });
  }

  /**
   * Run health check for all keys or specific key in the pool
   * @param {string} [targetKeyId] 
   */
  async runHealthCheck(targetKeyId = null) {
    const allKeys = await keyVaultService.loadKeys();
    const keysToCheck = targetKeyId ? allKeys.filter(k => k.id === targetKeyId) : allKeys;
    const results = [];

    for (const item of keysToCheck) {
      const probe = await keyHealthCheckService.checkKey(item.rawKey || item.key, item.platform);
      item.status = probe.status;
      item.lastTestedAt = new Date().toISOString();
      item.latencyMs = probe.latencyMs;
      item.testMessage = probe.message;

      results.push({
        id: item.id,
        platform: item.platform,
        status: probe.status,
        latencyMs: probe.latencyMs,
        message: probe.message
      });

      this.emit('key:checked', {
        id: item.id,
        status: probe.status,
        latencyMs: probe.latencyMs
      });
    }

    // Persist updated statuses
    await keyVaultService.persistKeys(allKeys);

    return {
      success: true,
      totalChecked: results.length,
      results
    };
  }

  /**
   * Toggle auto-rotation state
   * @param {boolean} enabled 
   */
  setAutoRotation(enabled) {
    this.autoRotationEnabled = Boolean(enabled);
    this.emit('rotation:toggled', { autoRotation: this.autoRotationEnabled });
    return this.autoRotationEnabled;
  }

  /**
   * Get overall key pool stats
   */
  async getPoolOverview() {
    const allKeys = await keyVaultService.loadKeys();
    const platformBreakdown = {};

    for (const k of allKeys) {
      const p = k.platform || 'Other';
      if (!platformBreakdown[p]) {
        platformBreakdown[p] = { total: 0, valid: 0, rateLimited: 0, invalid: 0 };
      }
      platformBreakdown[p].total++;
      if (k.status === 'valid') platformBreakdown[p].valid++;
      else if (k.status === 'rate_limited' || this._isKeyInCooldown(k.id)) platformBreakdown[p].rateLimited++;
      else platformBreakdown[p].invalid++;
    }

    return {
      autoRotationEnabled: this.autoRotationEnabled,
      totalKeys: allKeys.length,
      platformBreakdown,
      keys: allKeys.map((k) => {
        const stats = this.keyStats.get(k.id) || { callsCount: k.callsCount || 0 };
        return {
          id: k.id,
          stt: k.stt,
          platform: k.platform,
          maskedKey: keyVaultService.maskKey(k.rawKey || k.key),
          status: this._isKeyInCooldown(k.id) ? 'rate_limited' : (k.status || 'valid'),
          callsCount: (k.callsCount || 0) + (stats.callsCount || 0),
          addedAt: k.addedAt,
          note: k.note,
          lastTestedAt: k.lastTestedAt,
          latencyMs: k.latencyMs
        };
      })
    };
  }

  // --- Helpers ---

  _isKeyInCooldown(keyId) {
    const cooldown = this.cooldownMap.get(keyId);
    if (!cooldown) return false;
    if (Date.now() > cooldown) {
      this.cooldownMap.delete(keyId);
      return false;
    }
    return true;
  }

  _recordKeyUsage(keyId) {
    const stats = this.keyStats.get(keyId) || { callsCount: 0, errorsCount: 0 };
    stats.callsCount++;
    stats.lastUsedAt = new Date().toISOString();
    this.keyStats.set(keyId, stats);
  }
}

export const keyRotationManager = new KeyRotationManager();
export default keyRotationManager;
