import { Router } from 'express';
import multer from 'multer';
import { listAssets, createAsset, uploadAssetPdf, deleteAsset } from '../controllers/assets.controller.js';
import { authenticate } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);
router.get('/', listAssets);
router.post('/', createAsset);
router.post('/upload', upload.single('pdf'), uploadAssetPdf);
router.delete('/:id', deleteAsset);
export default router;
