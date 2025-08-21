import express from 'express';
import {
  createSession,
  getSessionsBySprint,
  getSession,
  updateSession,
  deleteSession,
  reorderSessions
} from '../controller/sessionController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Admin-only routes
router.route('/')
  .post(admin, createSession);

router.route('/reorder')
  .patch(admin, reorderSessions);

router.route('/sprint/:sprintId')
  .get(getSessionsBySprint);

// Get sessions by sprint (alternative path to match frontend)
router.get('/sprint/:sprintId/sessions', getSessionsBySprint);

router.route('/:id')
  .get(getSession)
  .patch(admin, updateSession)
  .delete(admin, deleteSession);

export default router;
