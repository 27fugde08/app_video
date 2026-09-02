/**
 * CreatorOS Desktop - Vault Controller
 * 
 * Handles HTTP/IPC requests for:
 * - Local storage catalog overview & metrics aggregation
 * - Deep media inspection with FFprobe sidecar binary
 * - Folder categorization, batch moving and grouping
 * - Safe file deletion on Windows storage
 * - Multi-format catalog export (JSON / CSV / TXT)
 */

import { vaultService } from '../services/vault.service.js';
import { broadcastEvent } from '../server.js';

export const vaultController = {
  /**
   * 1. Get Overview of Local Vault (Folders, Files, and Storage Metrics)
   * GET /api/vault/overview
   */
  async getOverview(req, res) {
    try {
      const { path: customPath } = req.query;
      const data = await vaultService.scanVault(customPath);

      return res.status(200).json(data);
    } catch (error) {
      console.error('[VaultController] getOverview error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi quét danh mục kho lưu trữ cục bộ.'
      });
    }
  },

  /**
   * 2. Probe Media Metadata via FFprobe Sidecar Binary
   * POST /api/vault/probe
   * Body: { filePath: string }
   */
  async probeMedia(req, res) {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp đường dẫn filePath của video.'
        });
      }

      const meta = await vaultService.probeMediaWithFFprobe(filePath);
      return res.status(200).json(meta);
    } catch (error) {
      console.error('[VaultController] probeMedia error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi trích xuất thông số media bằng FFprobe.'
      });
    }
  },

  /**
   * 3. Group / Move Selected Videos into a Subfolder
   * POST /api/vault/group
   * Body: { videoPaths: string[], targetFolderName: string }
   */
  async groupItems(req, res) {
    try {
      const { videoPaths = [], targetFolderName = 'New_Group' } = req.body;

      if (!Array.isArray(videoPaths) || videoPaths.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Danh sách videoPaths không được để trống.'
        });
      }

      const result = await vaultService.groupVideos(videoPaths, targetFolderName);

      // Broadcast update to desktop UI
      broadcastEvent('vault_updated', {
        action: 'group_created',
        targetFolder: targetFolderName,
        count: result.movedCount
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('[VaultController] groupItems error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi gộp nhóm tệp tin trong kho.'
      });
    }
  },

  /**
   * 4. Batch Delete Video Files or Groups Safely from Disk
   * DELETE /api/vault/items (or POST /api/vault/delete)
   * Body: { filePaths: string[] }
   */
  async deleteItems(req, res) {
    try {
      const { filePaths = [] } = req.body;

      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Danh sách filePaths cần xóa không được để trống.'
        });
      }

      const result = await vaultService.deleteVideos(filePaths);

      broadcastEvent('vault_updated', {
        action: 'items_deleted',
        count: result.deletedCount
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('[VaultController] deleteItems error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi xóa tệp tin khỏi ổ cứng.'
      });
    }
  },

  /**
   * 5. Export Vault Catalog to Downloadable File
   * POST /api/vault/export
   * Body: { items: any[], format: 'json' | 'csv' | 'txt' }
   */
  async exportCatalog(req, res) {
    try {
      const { items = [], format = 'json' } = req.body;

      const exportResult = vaultService.exportCatalog(items, format);

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);

      return res.status(200).send(exportResult.content);
    } catch (error) {
      console.error('[VaultController] exportCatalog error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lỗi khi xuất danh mục catalog kho video.'
      });
    }
  }
};
