import express from "express";
import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    getAllCategories, 
    getCategoryById 
} from "../controller/category.controller.js";
import { isAdmin } from "../middleware/admin.js";

const router = express.Router();

// Middleware to validate MongoDB ObjectId
const validateObjectId = [
    param('id')
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid category ID format'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

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
        .withMessage('Description must be less than 500 characters')
];

// Admin routes
router.post('/', 
    isAdmin,
    validateCategory,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
        
        // Parse isActive if it's a string
        if (typeof req.body.isActive === 'string') {
            req.body.isActive = req.body.isActive === 'true';
        }
        
        next();
    },
    createCategory
);

router.put('/:id', 
    isAdmin, 
    validateObjectId,
    validateCategory,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
        
        // Parse isActive if it's a string
        if (typeof req.body.isActive === 'string') {
            req.body.isActive = req.body.isActive === 'true';
        }
        
        next();
    },
    updateCategory
);

router.delete('/:id', 
    isAdmin, 
    validateObjectId, 
    deleteCategory
);

// Public routes
router.get('/', getAllCategories);
router.get('/:id', 
    validateObjectId,
    getCategoryById
);

export default router;
