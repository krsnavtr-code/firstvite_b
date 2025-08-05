import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAllContacts,
  updateContactStatus,
  submitContact
} from '../controllers/contactController.js';

const router = express.Router();

// Public routes
router.post('/', submitContact);

// Protected admin routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getAllContacts);

router.route('/:id/status')
  .patch(updateContactStatus);

export default router;
