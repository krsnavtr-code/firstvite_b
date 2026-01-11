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
import { getTestQuestions, submitTest } from '../controller/testQAController.js';


const router = express.Router();

// Public routes (no protection needed as they're protected by the route in index.js)
router.get('/questions', getTestQuestions);
router.post('/submit', submitTest);

// Apply protect and restrictTo('admin') to all admin routes
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
