import { Router } from 'express';
import { exportAllApplications } from '../controllers/export.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/all-applications/pdf', exportAllApplications);
export default router;
