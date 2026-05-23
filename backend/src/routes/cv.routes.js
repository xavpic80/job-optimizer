import { Router } from 'express';
import multer from 'multer';
import { saveCV, getCurrentCV, listCVVersions, setCurrentCV, updateCV, parsePDF } from '../controllers/cv.controller.js';
import { authenticate } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = Router();
router.use(authenticate);
router.post('/', saveCV);
router.post('/parse-pdf', upload.single('pdf'), parsePDF);
router.get('/current', getCurrentCV);
router.get('/versions', listCVVersions);
router.patch('/:id/set-current', setCurrentCV);
router.patch('/:id', updateCV);
export default router;
