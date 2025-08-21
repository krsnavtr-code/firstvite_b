import express from 'express';
import {
  createTask,
  getTasksBySession,
  getTask,
  updateTask,
  deleteTask,
  reorderTasks
} from '../controller/taskController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Admin-only routes
router.route('/')
  .post(admin, createTask);

router.route('/reorder')
  .patch(admin, reorderTasks);

router.route('/session/:sessionId')
  .get(getTasksBySession);

router.route('/:id')
  .get(getTask)
  .patch(admin, updateTask)
  .delete(admin, deleteTask);

export default router;
