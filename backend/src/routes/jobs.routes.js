import { Router } from 'express';
import multer from 'multer';
import { parseJob, parseJobPdf, getJobPdfUrl, listJobs, getJob, updateJob, deleteJob } from '../controllers/jobs.controller.js';
import { authenticate } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);
router.post('/parse', parseJob);
router.post('/parse-pdf', upload.single('pdf'), parseJobPdf);
router.get('/', listJobs);
router.get('/:id', getJob);
router.get('/:id/pdf-url', getJobPdfUrl);
router.patch('/:id', updateJob);
router.delete('/:id', deleteJob);
export default router;
