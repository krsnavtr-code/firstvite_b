import express from 'express';
import { generateCoursePDF, sendCoursePdfToStudent, downloadCourseBrochure } from '../controllers/pdfController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate PDF for a course
router.route('/courses/:id/generate-pdf')
    .get(protect, admin, generateCoursePDF);

// Send course PDF to student's email
router.route('/courses/:id/send-pdf')
    .post(protect, admin, sendCoursePdfToStudent);

// Download course brochure (public access)
router.route('/courses/:id/download-brochure')
    .get(downloadCourseBrochure);

export default router;
