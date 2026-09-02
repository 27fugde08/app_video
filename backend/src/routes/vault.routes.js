import { Router } from 'express';
import { vaultController } from '../controllers/vault.controller.js';

const router = Router();

/**
 * 1. Lấy toàn bộ tổng quan kho lưu trữ, các nhóm thư mục và dung lượng (GET /overview)
 */
router.get('/overview', vaultController.getOverview);

/**
 * 2. Trích xuất thông số media chuyên sâu bằng FFprobe Sidecar Binary (POST /probe)
 */
router.post('/probe', vaultController.probeMedia);

/**
 * 3. Gộp nhóm video hoặc di chuyển vào thư mục phân loại mới (POST /group)
 */
router.post('/group', vaultController.groupItems);

/**
 * 4. Xóa hàng loạt tệp video hoặc thư mục an toàn khỏi ổ đĩa (DELETE /items hoặc POST /delete)
 */
router.delete('/items', vaultController.deleteItems);
router.post('/delete', vaultController.deleteItems);

/**
 * 5. Xuất danh mục kho lưu trữ ra JSON, CSV, hoặc TXT (POST /export)
 */
router.post('/export', vaultController.exportCatalog);

export default router;
