import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { 
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    updateUserStatus,
    updateUserLMSStatus
} from '../controllers/userController.js';
const router = express.Router();

// Routes with admin authorization
router.route('/').get(protect, authorize('admin'), getAllUsers);
router.route('/:id').get(protect, authorize('admin'), getUserById);
router.route('/').post(protect, authorize('admin'), createUser);
router.route('/:id').put(protect, authorize('admin'), updateUser);
router.route('/:id/status').put(protect, authorize('admin'), updateUserStatus);
router.route('/:id/lms-status').put(protect, authorize('admin'), updateUserLMSStatus);
router.route('/:id').delete(protect, authorize('admin'), deleteUser);

export default router;
