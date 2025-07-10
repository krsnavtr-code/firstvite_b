import express from 'express';
import { body } from 'express-validator';
import * as faqController from '../controller/faq.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Create admin middleware
const admin = (req, res, next) => {
  return authorize('admin')(req, res, next);
};

// FAQ validation rules
const faqValidationRules = [
  body('question').trim().notEmpty().withMessage('Question is required'),
  body('answer').trim().notEmpty().withMessage('Answer is required'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
];

// Public route
router.get('/', faqController.getFAQs);

// Admin routes (protected)
router.get('/admin/faqs', protect, admin, faqController.getAllFAQs);
router.get('/admin/faqs/:id', protect, admin, faqController.getFAQ);
router.post('/admin/faqs', protect, admin, faqValidationRules, faqController.createFAQ);
router.put('/admin/faqs/:id', protect, admin, faqValidationRules, faqController.updateFAQ);
router.delete('/admin/faqs/:id', protect, admin, faqController.deleteFAQ);
router.put('/admin/faqs/update-order', protect, admin, faqController.updateFAQOrder);

export default router;
