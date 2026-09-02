import { Router } from 'express';
import { dubbingController } from '../controllers/dubbing.controller.js';

const router = Router();

/**
 * 1. Khởi chạy tiến trình lồng tiếng video AI hàng loạt (POST /start)
 */
router.post('/start', dubbingController.startDubbing);

/**
 * 2. Lấy thông tin trạng thái hàng đợi và tiến độ các tác vụ lồng tiếng (GET /status)
 */
router.get('/status', dubbingController.getStatus);

/**
 * 3. Hủy tác vụ lồng tiếng đang chạy hoặc đang chờ (DELETE /job/:id hoặc POST /cancel/:id)
 */
router.delete('/job/:id', dubbingController.cancelJob);
router.post('/cancel/:id', dubbingController.cancelJob);

/**
 * 4. Lấy danh mục giọng đọc, ngôn ngữ và cấu hình mô hình AI (GET /presets)
 */
router.get('/presets', dubbingController.getPresets);

export default router;
