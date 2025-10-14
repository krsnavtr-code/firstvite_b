import express from 'express';
import { getVideos, getVideo, uploadVideo } from '../controller/videoController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

// Public routes
router.get('/', getVideos);
router.get('/:filename', getVideo);

// Protected routes (require authentication)
router.use(protect);

// Upload video route
router.post('/upload', upload.single('video'), uploadVideo);

export default router;
