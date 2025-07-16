import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { 
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';
const router = express.Router();

// Routes with admin authorization
router.route('/').get(protect, authorize('admin'), getAllUsers);
router.route('/:id').get(protect, authorize('admin'), getUserById);
router.route('/').post(protect, authorize('admin'), createUser);
router.route('/:id').put(protect, authorize('admin'), updateUser);
router.route('/:id').delete(protect, authorize('admin'), deleteUser);

export default router;
