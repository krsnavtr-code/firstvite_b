import express from 'express';
import {
  createQA,
  getAllQAs,
  getQAById,
  updateQA,
  deleteQA,
  toggleQAActiveStatus,
  getTestResults,
  getTestQuestions,
  submitTest,
  checkIfUserHasTakenTest
} from '../controller/testQAController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';


const router = express.Router();

// Public route for getting questions (no auth required)
router.get('/questions', getTestQuestions);

// Check if user has already taken the test (requires authentication)
router.get('/has-taken-test', protect, checkIfUserHasTakenTest);

// Protected route for submitting test (requires authentication)
router.post('/submit', protect, submitTest);

// Get test results (requires authentication)
router.get('/results', protect, getTestResults);

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
