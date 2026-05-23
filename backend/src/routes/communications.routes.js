import { Router } from 'express';
import { deleteCommunication, updateCommunication } from '../controllers/communications.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.patch('/:id', updateCommunication);
router.delete('/:id', deleteCommunication);
export default router;
