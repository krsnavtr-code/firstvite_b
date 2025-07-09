import express from 'express';
import { protect } from '../middleware/auth.js';
import { enrollInCourse, getMyEnrollments } from '../controller/enrollment.controller.js';

const router = express.Router();

// Protected routes (require authentication)
router.route('/')
  .post(protect, enrollInCourse);

router.route('/my-enrollments')
  .get(protect, getMyEnrollments);

export default router;
