import { Router } from 'express';
import { telemetryController } from '../controllers/telemetry.controller.js';

const router = Router();

// Hardware telemetry metrics
router.get('/metrics', telemetryController.getMetrics);

// Core healthcheck
router.get('/health', telemetryController.getHealth);

// Memory Garbage Collection trigger
router.post('/gc', telemetryController.runGarbageCollect);

export default router;
