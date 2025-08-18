import express from 'express';
import { 
  enrollInCourse, 
  getMyEnrollments, 
  adminEnrollUser 
} from '../controller/enrollment.controller.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Public route for course enrollment (both guests and authenticated users)
router.route('/')
  .post(enrollInCourse);

// Route for viewing user's enrollments
// Admins can view enrollments for any user by providing userId
// Regular users can only view their own enrollments
router.route('/my-enrollments')
  .get(protect, (req, res, next) => {
    // If userId is provided and user is admin, allow viewing other user's enrollments
    if (req.query.userId && req.user.role === 'admin') {
      return getMyEnrollments(req, res, next);
    }
    // Otherwise, only allow viewing own enrollments
    return getMyEnrollments(req, res, next);
  });

// Admin route for enrolling users in courses
router.route('/admin-enroll')
  .post(protect, admin, adminEnrollUser);

export default router;
