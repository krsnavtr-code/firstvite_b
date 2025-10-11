import express from 'express';
import { createCandidate, getCandidates, updateCandidateStatus, sendOTP, verifyOTP } from '../controller/candidateController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Ensure candidate profile upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'candidate_profile');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `candidate-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpe?g|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpg, jpeg, png, gif)'));
    }
  },
});

// Public routes
router.post('/', upload.single('profilePhoto'), createCandidate);

// OTP routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Protected admin routes
router.get('/', protect, admin, getCandidates);
router.put('/:id/status', protect, admin, updateCandidateStatus);

export default router;
