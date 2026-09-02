/**
 * CreatorOS Desktop - AI Key Controller
 * 
 * Handles IPC/HTTP requests for AI Key Vault & Rotation Dispatcher:
 * - Secure Key Storage & Masked Presentation
 * - Real-time Provider Connection Probing
 * - Intelligent Round-Robin & Failover Key Dispatch
 * - Batch Import & Deletion
 */

import { keyVaultService } from '../services/keyVault.service.js';
import { keyRotationManager } from '../core/keyRotation.manager.js';
import { broadcastEvent } from '../server.js';

// Hook Rotation & Health Events into Realtime SSE Stream
keyRotationManager.on('key:rotated', (data) => broadcastEvent('ai_key_rotated', data));
keyRotationManager.on('key:checked', (data) => broadcastEvent('ai_key_checked', data));
keyRotationManager.on('key:rate_limited', (data) => broadcastEvent('ai_key_rate_limited', data));
keyRotationManager.on('rotation:toggled', (data) => broadcastEvent('ai_key_rotation_toggled', data));

export const aiKeyController = {
  /**
   * 1. Get Key List & Pool Overview
   * GET /api/ai-keys/list
   */
  async getKeysList(req, res) {
    try {
      const overview = await keyRotationManager.getPoolOverview();
      return res.status(200).json({
        success: true,
        ...overview
      });
    } catch (error) {
      console.error('[AiKeyController] getKeysList error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Không thể tải danh sách khóa AI.'
      });
    }
  },

  /**
   * 2. Add a new API Key (Encrypted on Disk)
   * POST /api/ai-keys/add
   * Body: { key: string, platform: string, note?: string }
   */
  async addKey(req, res) {
    try {
      const { key, platform = 'Gemini', note = '' } = req.body;

      if (!key || key.trim().length < 8) {
        return res.status(400).json({
          success: false,
          error: 'API Key không hợp lệ hoặc quá ngắn.'
        });
      }

      const newRecord = await keyVaultService.addKey({ key, platform, note });

      // Run immediate background probe
      keyRotationManager.runHealthCheck(newRecord.id).catch(() => {});

      broadcastEvent('ai_key_added', {
        id: newRecord.id,
        platform: newRecord.platform,
        maskedKey: keyVaultService.maskKey(key)
      });

      return res.status(200).json({
        success: true,
        message: `Đã lưu và mã hóa an toàn khóa ${platform} vào hệ thống tệp cục bộ.`,
        key: {
          id: newRecord.id,
          stt: newRecord.stt,
          platform: newRecord.platform,
          maskedKey: keyVaultService.maskKey(key),
          status: newRecord.status,
          addedAt: newRecord.addedAt,
          note: newRecord.note
        }
      });
    } catch (error) {
      console.error('[AiKeyController] addKey error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi thêm khóa AI mới.'
      });
    }
  },

  /**
   * 3. Batch Import Multiple Keys
   * POST /api/ai-keys/import-batch
   * Body: { rawText: string, defaultPlatform?: string }
   */
  async importBatch(req, res) {
    try {
      const { rawText = '', defaultPlatform = 'Gemini' } = req.body;
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

      if (lines.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp danh sách khóa API cần nạp.'
        });
      }

      const addedRecords = [];
      for (const line of lines) {
        // Detect platform by prefix
        let platform = defaultPlatform;
        if (line.startsWith('AIzaSy') || line.startsWith('AQ.')) platform = 'Gemini';
        else if (line.startsWith('sk-proj') || line.startsWith('sk-')) platform = 'OpenAI';
        else if (line.startsWith('sk-ant')) platform = 'Claude';

        const record = await keyVaultService.addKey({ key: line, platform });
        addedRecords.push(record);
      }

      // Trigger asynchronous batch probe
      keyRotationManager.runHealthCheck().catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Đã nhập và mã hóa thành công ${addedRecords.length} khóa API.`,
        count: addedRecords.length
      });
    } catch (error) {
      console.error('[AiKeyController] importBatch error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi nhập hàng loạt khóa AI.'
      });
    }
  },

  /**
   * 4. Test Key Connectivity (Health Check)
   * POST /api/ai-keys/test-connection
   * Body: { keyId?: string }
   */
  async testConnection(req, res) {
    try {
      const { keyId } = req.body;
      const checkResult = await keyRotationManager.runHealthCheck(keyId);

      return res.status(200).json({
        success: true,
        message: `Đã hoàn tất kiểm tra kết nối (${checkResult.totalChecked} khóa).`,
        ...checkResult
      });
    } catch (error) {
      console.error('[AiKeyController] testConnection error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi kiểm tra kết nối API.'
      });
    }
  },

  /**
   * 5. Delete an API Key
   * DELETE /api/ai-keys/:id
   */
  async deleteKey(req, res) {
    try {
      const { id } = req.params;
      const success = await keyVaultService.removeKey(id);

      if (success) {
        broadcastEvent('ai_key_deleted', { id });
        return res.status(200).json({
          success: true,
          message: `Đã xóa khóa [${id}] khỏi bộ nhớ mã hóa.`
        });
      }

      return res.status(404).json({
        success: false,
        error: `Không tìm thấy khóa '${id}'.`
      });
    } catch (error) {
      console.error('[AiKeyController] deleteKey error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi xóa khóa AI.'
      });
    }
  },

  /**
   * 6. Toggle Auto-Rotation Mode
   * POST /api/ai-keys/toggle-auto-rotation
   * Body: { enabled: boolean }
   */
  async toggleAutoRotation(req, res) {
    try {
      const { enabled } = req.body;
      const state = keyRotationManager.setAutoRotation(enabled);

      return res.status(200).json({
        success: true,
        message: `Chế độ Tự Động Xoay Vòng Key: ${state ? 'ĐÃ BẬT' : 'ĐÃ TẮT'}.`,
        autoRotationEnabled: state
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * 7. Acquire Key for internal AI module requests (with auto-rotation & failover)
   * POST /api/ai-keys/acquire-key
   * Body: { platform: string }
   */
  async acquireKey(req, res) {
    try {
      const { platform = 'Gemini' } = req.body;
      const acquired = await keyRotationManager.acquireKey(platform);

      return res.status(200).json({
        success: true,
        ...acquired
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * 8. Report Rate Limit on a Key (triggers immediate cooldown & failover)
   * POST /api/ai-keys/report-rate-limit
   * Body: { keyId: string, cooldownSeconds?: number }
   */
  async reportRateLimit(req, res) {
    try {
      const { keyId, cooldownSeconds = 60 } = req.body;
      keyRotationManager.reportRateLimit(keyId, cooldownSeconds);

      return res.status(200).json({
        success: true,
        message: `Đã cách ly key ${keyId} trong ${cooldownSeconds}s để tránh rate-limit.`
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};

export default aiKeyController;
