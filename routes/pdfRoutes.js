import express from 'express';
import { generateCoursePDF, sendCoursePdfToStudent } from '../controllers/pdfController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate PDF for a course
router.route('/courses/:id/generate-pdf')
    .get(protect, admin, generateCoursePDF);

// Send course PDF to student's email
router.route('/courses/:id/send-pdf')
    .post(protect, admin, sendCoursePdfToStudent);

export default router;
