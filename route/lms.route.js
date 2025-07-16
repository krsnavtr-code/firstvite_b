import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  enrollInCourse,
  getMyEnrollments,
  getCourseContent,
  updateLessonProgress,
  generateCertificate
} from '../controller/lms.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Enroll in a course
router.post('/courses/:courseId/enroll', enrollInCourse);

// Get user's enrollments
router.get('/my-courses', getMyEnrollments);

// Get course content
router.get('/courses/:courseId/content', getCourseContent);

// Update lesson progress
router.post('/courses/:courseId/lessons/:lessonId/progress', updateLessonProgress);

// Generate certificate
router.post('/courses/:courseId/certificate', generateCertificate);

export default router;
