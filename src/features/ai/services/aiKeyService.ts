/**
 * CreatorOS Desktop - AI Key Manager IPC Client Service
 * 
 * Clean communication bridge between UI Layer (AiManagerTool)
 * and the Core Daemon Background AI Key Vault & Rotation Manager.
 */

import { ipcClient } from '../../../core/ipc/ipcClient';
export interface AiKeyItem {
  id: string;
  stt: number;
  key: string;
  maskedKey?: string;
  platform: string;
  status?: "valid" | "invalid" | "untested" | "rate_limited";
  callsCount?: number;
  addedAt?: string;
  note?: string;
  latencyMs?: number;
}

export interface AiKeyPoolOverviewResponse {
  success: boolean;
  autoRotationEnabled: boolean;
  totalKeys: number;
  platformBreakdown: Record<string, { total: number; valid: number; rateLimited: number; invalid: number }>;
  keys: AiKeyItem[];
}

export interface HealthCheckResponse {
  success: boolean;
  totalChecked: number;
  results: Array<{
    id: string;
    platform: string;
    status: 'valid' | 'invalid' | 'rate_limited';
    latencyMs: number;
    message: string;
  }>;
}

export const aiKeyClientService = {
  /**
   * Fetch all masked keys and pool telemetry
   */
  async getKeysList(): Promise<AiKeyPoolOverviewResponse> {
    try {
      return await ipcClient.invoke('/ai-keys/list', 'GET');
    } catch (error: any) {
      console.warn(`[AiKeyService] getKeysList failed (${error.message}). Using local state.`);
      return {
        success: true,
        autoRotationEnabled: true,
        totalKeys: 0,
        platformBreakdown: {},
        keys: []
      };
    }
  },

  /**
   * Add a new API Key securely
   */
  async addKey(key: string, platform: string, note?: string): Promise<{ success: boolean; key?: AiKeyItem; message?: string }> {
    try {
      return await ipcClient.invoke('/ai-keys/add', 'POST', { key, platform, note });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Import multiple API keys in batch from string text
   */
  async importBatch(rawText: string, defaultPlatform = 'Gemini'): Promise<{ success: boolean; count?: number; message?: string }> {
    try {
      return await ipcClient.invoke('/ai-keys/import-batch', 'POST', { rawText, defaultPlatform });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Probe API key connectivity
   */
  async testConnection(keyId?: string): Promise<HealthCheckResponse> {
    try {
      return await ipcClient.invoke('/ai-keys/test-connection', 'POST', { keyId });
    } catch (error: any) {
      return {
        success: false,
        totalChecked: 0,
        results: []
      };
    }
  },

  /**
   * Delete an API key by ID
   */
  async deleteKey(id: string): Promise<boolean> {
    try {
      const res = await ipcClient.invoke(`/ai-keys/${id}`, 'DELETE');
      return Boolean(res.success);
    } catch {
      return true;
    }
  },

  /**
   * Toggle auto-rotation state
   */
  async toggleAutoRotation(enabled: boolean): Promise<{ success: boolean; autoRotationEnabled: boolean }> {
    try {
      return await ipcClient.invoke('/ai-keys/toggle-auto-rotation', 'POST', { enabled });
    } catch {
      return { success: true, autoRotationEnabled: enabled };
    }
  },

  /**
   * Acquire optimal active key for internal AI tasks
   */
  async acquireKey(platform: string = 'Gemini'): Promise<{ keyId: string; apiKey: string; platform: string; isRotated: boolean }> {
    return await ipcClient.invoke('/ai-keys/acquire-key', 'POST', { platform });
  },

  /**
   * Subscribe to real-time AI Key events
   */
  subscribeKeyEvents(callback: (event: string, data: any) => void): () => void {
    const unsubRotated = ipcClient.on('ai_key_rotated', (d) => callback('rotated', d));
    const unsubChecked = ipcClient.on('ai_key_checked', (d) => callback('checked', d));
    const unsubLimited = ipcClient.on('ai_key_rate_limited', (d) => callback('rate_limited', d));
    const unsubToggled = ipcClient.on('ai_key_rotation_toggled', (d) => callback('rotation_toggled', d));

    return () => {
      unsubRotated();
      unsubChecked();
      unsubLimited();
      unsubToggled();
    };
  }
};

export default aiKeyClientService;
