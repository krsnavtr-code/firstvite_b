import express from "express";
import { body } from 'express-validator';
import { 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    getAllCategories, 
    getCategoryById 
} from "../controller/category.controller.js";
import { isAdmin } from "../middleware/admin.js";

const router = express.Router();

// Validation middleware
const validateCategory = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 3, max: 50 })
        .withMessage('Name must be between 3 and 50 characters'),
    body('description')
        .trim()
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
    body('image')
        .optional()
        .isURL()
        .withMessage('Invalid image URL')
];

// Admin routes
router.post('/', isAdmin, validateCategory, createCategory);
router.put('/:id', isAdmin, validateCategory, updateCategory);
router.delete('/:id', isAdmin, deleteCategory);

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

export default router;
