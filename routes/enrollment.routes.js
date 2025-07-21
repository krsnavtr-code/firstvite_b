import express from 'express';
import { enrollInCourse, getMyEnrollments } from '../controller/enrollment.controller.js';

const router = express.Router();

// Public route for course enrollment
router.route('/')
  .post(enrollInCourse);

// Protected route for viewing user's enrollments
router.route('/my-enrollments')
  .get(protect, getMyEnrollments);

export default router;
