import { Router } from 'express';
import { saveCV, getCurrentCV, listCVVersions, setCurrentCV, updateCV } from '../controllers/cv.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.post('/', saveCV);
router.get('/current', getCurrentCV);
router.get('/versions', listCVVersions);
router.patch('/:id/set-current', setCurrentCV);
router.patch('/:id', updateCV);
export default router;
