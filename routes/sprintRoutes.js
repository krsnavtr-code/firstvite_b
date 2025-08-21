import express from 'express';
import { 
  createSprint, 
  getSprintsByCourse, 
  getSprint, 
  updateSprint, 
  deleteSprint,
  getAllSprints
} from '../controller/sprintController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Restrict the following routes to admin only
router.use(admin);

router
  .route('/')
  .get(getAllSprints)
  .post(createSprint);

router
  .route('/course/:courseId')
  .get(getSprintsByCourse);

router
  .route('/:id')
  .get(getSprint)
  .patch(updateSprint)
  .delete(deleteSprint);

export default router;
