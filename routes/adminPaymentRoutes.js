import express from 'express';
import { check } from 'express-validator';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getAllPayments,
  getPaymentById,
  updatePaymentStatus,
} from '../controllers/adminPaymentController.js';

const router = express.Router();

// @route   GET /api/admin/payments
// @desc    Get all payments (Admin only)
// @access  Private/Admin
router.get('/', protect, admin, getAllPayments);

// @route   GET /api/admin/payments/:id
// @desc    Get payment by ID (Admin only)
// @access  Private/Admin
router.get('/:id', protect, admin, getPaymentById);

// @route   PUT /api/admin/payments/:id/status
// @desc    Update payment status (Admin only)
// @access  Private/Admin
router.put(
  '/:id/status',
  protect,
  admin,
  [
    check('status', 'Status is required')
      .notEmpty()
      .isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled'])
      .withMessage('Invalid status'),
  ],
  updatePaymentStatus
);

export default router;
