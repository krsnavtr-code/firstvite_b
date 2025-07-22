import express from 'express';
import { enrollInCourse, getMyEnrollments } from '../controller/enrollment.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public route for course enrollment (both guests and authenticated users)
router.route('/')
  .post(enrollInCourse);

// Protected route for viewing user's enrollments (only for authenticated users)
router.route('/my-enrollments')
  .get(protect, getMyEnrollments);

export default router;
