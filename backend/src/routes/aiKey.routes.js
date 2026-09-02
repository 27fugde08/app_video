import { Router } from 'express';
import { aiKeyController } from '../controllers/aiKey.controller.js';

const router = Router();

/**
 * 1. Lấy danh sách keys đã che giấu và trạng thái pool xoay vòng (GET /list)
 */
router.get('/list', aiKeyController.getKeysList);

/**
 * 2. Thêm khóa API mới và tự động mã hóa vào ổ cứng (POST /add)
 */
router.post('/add', aiKeyController.addKey);

/**
 * 3. Nhập hàng loạt khóa API từ danh sách văn bản (POST /import-batch)
 */
router.post('/import-batch', aiKeyController.importBatch);

/**
 * 4. Kiểm tra trạng thái sống/chết (Health Check) tới nhà cung cấp LLM (POST /test-connection)
 */
router.post('/test-connection', aiKeyController.testConnection);

/**
 * 5. Bật / Tắt chế độ Xoay Vòng Tự Động Round-Robin (POST /toggle-auto-rotation)
 */
router.post('/toggle-auto-rotation', aiKeyController.toggleAutoRotation);

/**
 * 6. Cấp phát Key cho các tác vụ AI nội bộ (POST /acquire-key)
 */
router.post('/acquire-key', aiKeyController.acquireKey);

/**
 * 7. Báo cáo lỗi Rate Limit 429 để chuyển tiếp Failover (POST /report-rate-limit)
 */
router.post('/report-rate-limit', aiKeyController.reportRateLimit);

/**
 * 8. Xóa khóa API khỏi bộ nhớ mã hóa (DELETE /:id)
 */
router.delete('/:id', aiKeyController.deleteKey);

export default router;
