import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { getAvailablePdfs, sendBrochure } from '../controller/pdfController.js';

const router = express.Router();

// @route   GET /api/pdfs
// @desc    Get list of available PDFs
// @access  Private/Admin
router.get('/', protect, restrictTo('admin'), getAvailablePdfs);

// @route   POST /api/pdfs/send-brochure
// @desc    Send a brochure via email
// @access  Private/Admin
router.post('/send-brochure', protect, restrictTo('admin'), sendBrochure);

export default router;
