import { Router } from 'express';
import {
  createApplication, listApplications, getApplication,
  updateApplication, deleteApplication,
} from '../controllers/applications.controller.js';
import {
  createCommunication, listCommunications,
} from '../controllers/communications.controller.js';
import { createTranscript, listTranscripts } from '../controllers/transcripts.controller.js';
import { optimizeApplication, getOptimization } from '../controllers/optimize.controller.js';
import { exportApplication } from '../controllers/export.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/', createApplication);
router.get('/', listApplications);
router.get('/:id', getApplication);
router.patch('/:id', updateApplication);
router.delete('/:id', deleteApplication);

router.post('/:id/communications', createCommunication);
router.get('/:id/communications', listCommunications);

router.post('/:id/transcripts', createTranscript);
router.get('/:id/transcripts', listTranscripts);

router.post('/:id/optimize', optimizeApplication);
router.get('/:id/optimize/:type', getOptimization);

router.get('/:id/export/pdf', exportApplication);

export default router;
