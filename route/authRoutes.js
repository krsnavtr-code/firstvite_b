import express from 'express';
import { register, login, getUserProfile, refreshToken } from '../controller/authController.js';
import { updateProfile } from '../controller/user.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateProfile);

export default router;
