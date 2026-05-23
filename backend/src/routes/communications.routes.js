import { Router } from 'express';
import { deleteCommunication } from '../controllers/communications.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.delete('/:id', deleteCommunication);
export default router;
