import { Router } from 'express';
import { downloaderController } from '../controllers/downloader.controller.js';

const router = Router();

/**
 * 1. Bắt đầu tác vụ tải hàng loạt (POST /start hoặc POST /download)
 * Tiếp nhận danh sách URLs / itemIds, tạo jobId và đẩy vào hàng đợi
 */
router.post('/start', downloaderController.startBatchDownload);
router.post('/download', downloaderController.startBatchDownload);

/**
 * 2. Lấy trạng thái hàng đợi và danh sách các jobs (GET /status)
 */
router.get('/status', downloaderController.getStatus);

/**
 * 3. Hủy hoặc xóa một Job cụ thể khỏi hàng đợi (DELETE /job/:id hoặc POST /cancel/:id)
 */
router.delete('/job/:id', downloaderController.deleteJob);
router.post('/cancel/:id', downloaderController.deleteJob);

/**
 * 4. Quét danh sách URL để trích xuất metadata (POST /scan)
 */
router.post('/scan', downloaderController.scanUrls);

/**
 * 5. Mở tệp/thư mục trực tiếp trên hệ điều hành máy tính (POST /open-file & POST /open-folder)
 */
router.post('/open-file', downloaderController.openFile);
router.post('/open-folder', downloaderController.openFile);

export default router;
