import { Router } from 'express';
import { parseJob, listJobs, getJob, deleteJob } from '../controllers/jobs.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.post('/parse', parseJob);
router.get('/', listJobs);
router.get('/:id', getJob);
router.delete('/:id', deleteJob);
export default router;
