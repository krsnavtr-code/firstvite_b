import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  saveEmailRecord,
  getAllEmailRecords,
  getEmailRecord
} from '../controllers/emailRecordController.js';

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// Only admin users can access these routes
router.use(authorize('admin'));

// Save email record
router.post('/save-email-record', saveEmailRecord);

// Get all email records with pagination and filtering
router.get('/', getAllEmailRecords);

// Get single email record
router.get('/:id', getEmailRecord);

export default router;
