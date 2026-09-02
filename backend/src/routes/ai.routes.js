import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';

const router = Router();

// Viral copywriting & hashtag generation
router.post('/generate-copy', aiController.generateCopy);

// Transcription & audio summary
router.post('/transcribe-summary', aiController.transcribeSummary);

export default router;
