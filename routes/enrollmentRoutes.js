import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { 
  enrollInCourse, 
  getMyEnrollments, 
  updateEnrollmentStatus 
} from '../controllers/enrollmentController.js';

const router = express.Router();

// Public routes (none for enrollments)

// Protected routes
router.route('/')
  .post(protect, enrollInCourse);

// Get enrollments for the authenticated user
router.route('/me')
  .get(protect, (req, res, next) => {
    // Use the user ID from the token for security
    req.query.userId = req.user.id;
    next();
  }, getMyEnrollments);

// Admin routes - only allow admin to update enrollment status
router.route('/:id')
  .put(protect, authorize('admin'), updateEnrollmentStatus);

export default router;
