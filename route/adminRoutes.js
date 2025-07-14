import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers
} from '../controller/adminController.js';

const router = express.Router();

// Protect all routes after this middleware (user must be logged in)
router.use(protect);

// Restrict all routes to only admin users
router.use(restrictTo('admin'));

// Admin routes
router.get('/users', getAllUsers);
router.get('/pending-users', getPendingUsers);
router.patch('/approve-user/:id', approveUser);
router.delete('/reject-user/:id', rejectUser);

export default router;
