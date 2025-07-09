import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { 
  enrollInCourse, 
  getMyEnrollments, 
  updateEnrollmentStatus,
  getPendingEnrollments,
  updatePendingToActive
} from '../controllers/enrollmentController.js';

const router = express.Router();

// Public routes (none for enrollments)

// Protected routes - User enrollments
router.route('/')
  .post(protect, enrollInCourse);

// Get enrollments for the authenticated user
router.route('/me')
  .get(protect, (req, res, next) => {
    // Use the user ID from query params or token for security
    const requestedUserId = req.query.userId;
    const tokenUserId = req.user.id;
    
    // If a specific user ID is requested, verify it matches the token user ID
    // This prevents users from accessing other users' enrollments
    if (requestedUserId && requestedUserId !== tokenUserId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access these enrollments'
      });
    }
    
    // Always use the token user ID for security
    req.query.userId = tokenUserId;
    next();
  }, getMyEnrollments);

// Admin routes
router.route('/pending')
  .get(protect, authorize('admin'), getPendingEnrollments);

// Temporary route to update all pending enrollments to active
router.route('/update-to-active')
  .put(protect, authorize('admin'), updatePendingToActive);

router.route('/:id/status')
  .put(protect, authorize('admin'), updateEnrollmentStatus);

export default router;
