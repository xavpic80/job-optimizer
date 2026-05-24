import { Router } from 'express';
import multer from 'multer';
import {
  createApplication, listApplications, getApplication,
  updateApplication, deleteApplication, fitAssessment, meetingPrep,
} from '../controllers/applications.controller.js';
import { commsCoach } from '../controllers/commsCoach.controller.js';
import { fetchAiOutput } from '../controllers/aiOutputs.controller.js';
import {
  createCommunication, listCommunications,
} from '../controllers/communications.controller.js';
import { createTranscript, listTranscripts } from '../controllers/transcripts.controller.js';
import { optimizeApplication, getOptimization } from '../controllers/optimize.controller.js';
import { exportApplication } from '../controllers/export.controller.js';
import {
  listContacts, createContact, updateContact, deleteContact,
  uploadLinkedinPdf, generateBackground,
} from '../controllers/contacts.controller.js';
import { authenticate } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

router.post('/', createApplication);
router.get('/', listApplications);
router.get('/:id', getApplication);
router.patch('/:id', updateApplication);
router.delete('/:id', deleteApplication);

router.get('/:id/ai-output', fetchAiOutput);
router.post('/:id/fit-assessment', fitAssessment);
router.post('/:id/meeting-prep', meetingPrep);
router.post('/:id/comms-coach', commsCoach);

router.get('/:id/contacts', listContacts);
router.post('/:id/contacts', createContact);
router.patch('/:id/contacts/:contactId', updateContact);
router.delete('/:id/contacts/:contactId', deleteContact);
router.post('/:id/contacts/:contactId/linkedin-pdf', upload.single('pdf'), uploadLinkedinPdf);
router.post('/:id/contacts/:contactId/background', generateBackground);

router.post('/:id/communications', createCommunication);
router.get('/:id/communications', listCommunications);

router.post('/:id/transcripts', createTranscript);
router.get('/:id/transcripts', listTranscripts);

router.post('/:id/optimize', optimizeApplication);
router.get('/:id/optimize/:type', getOptimization);

router.get('/:id/export/pdf', exportApplication);

export default router;
