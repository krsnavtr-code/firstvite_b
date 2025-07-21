import express from 'express';
import { generateCoursePDF } from '../controllers/pdfController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate PDF for a course
router.route('/courses/:id/generate-pdf')
    .get(protect, admin, generateCoursePDF);

export default router;
