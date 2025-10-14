import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
  getAllCandidates,
  getCandidate,
  updateCandidateStatus
} from '../controller/adminController.js';
import { getVideos, getVideo } from '../controller/videoController.js';

const router = express.Router();

// Protect all routes after this middleware (user must be logged in)
router.use(protect);

// Restrict all routes to only admin users
router.use(restrictTo('admin'));

// Admin routes
// User management routes
router.get('/users', getAllUsers);
router.get('/pending-users', getPendingUsers);
router.patch('/approve-user/:id', approveUser);
router.delete('/reject-user/:id', rejectUser);

// Candidate management routes
router.get('/candidates', getAllCandidates);
router.get('/candidates/:id', getCandidate);
router.patch('/candidates/:id/status', updateCandidateStatus);

// Video management routes
router.get('/videos', getVideos);
router.get('/videos/:filename', getVideo);

export default router;
