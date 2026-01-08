import express from 'express';
import {
  createQA,
  getAllQAs,
  getQAById,
  updateQA,
  deleteQA,
  toggleQAActiveStatus,
} from '../controller/testQAController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect and restrictTo('admin') to all routes
router.use(protect);
router.use(restrictTo('admin'));

router.route('/')
  .post(createQA)
  .get(getAllQAs);

router.route('/:id')
  .get(getQAById)
  .put(updateQA)
  .delete(deleteQA);

router.route('/:id/toggle').patch(toggleQAActiveStatus);

export default router;
