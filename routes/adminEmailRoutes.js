import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import { sendProposalEmails } from '../controller/adminEmailController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
});

// Protect all routes and restrict to admin users
router.use(protect);
router.use(authorize('admin'));

// Send proposal emails to multiple colleges with file upload support
router.post(
  '/send-proposal',
  upload.array('attachments', 5), // Allow up to 5 files
  sendProposalEmails
);

export default router;
