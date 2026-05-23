import { Router } from 'express';
import { deleteTranscript } from '../controllers/transcripts.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.delete('/:id', deleteTranscript);
export default router;
