import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { getVideos, getVideo, uploadVideo } from '../controller/videoController.js';
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
  getAllCandidates,
  getCandidate,
  updateCandidateStatus
} from '../controller/adminController.js';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const allowedMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm'
    ];
    
    const extname = path.extname(file.originalname).toLowerCase();
    const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);
    const isExtensionAllowed = allowedTypes.includes(extname);
    
    if (isExtensionAllowed && isMimeTypeAllowed) {
      return cb(null, true);
    }
    
    const error = new Error('Invalid file type. Only MP4, MOV, AVI, MKV, and WebM files are allowed.');
    error.code = 'LIMIT_FILE_TYPE';
    cb(error);
  },
});

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const router = express.Router();

// Protect all routes after this middleware (user must be logged in)
router.use(protect);

// Restrict all routes to only admin users
router.use(restrictTo('admin'));

// Admin routes
// User management routes
router.get('/users', getAllUsers);
router.get('/pending-users', getPendingUsers);
router.patch('/approve-user/:id', approveUser);
router.delete('/reject-user/:id', rejectUser);

router.patch('/candidates/:id/status', updateCandidateStatus);

// Video management routes
router.route('/videos')
  .get(getVideos)
  .post(upload.single('video'), uploadVideo);
  
router.get('/videos/:filename', getVideo);

export default router;
