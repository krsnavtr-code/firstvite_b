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
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Get all categories with optional filters (public)
router.get('/', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            fields: req.query.fields,
            sort: req.query.sort,
            limit: parseInt(req.query.limit) || 100,
            page: parseInt(req.query.page) || 1
        };
        
        const result = await getAllCategories(filters);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching categories',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Middleware to validate MongoDB ObjectId more strictly
const validateObjectId = [
    param('id')
        .trim()
        .notEmpty()
        .withMessage('Category ID is required')
        .bail()
        .isLength({ min: 24, max: 24 })
        .withMessage('Category ID must be 24 characters long')
        .bail()
        .matches(/^[0-9a-fA-F]+$/)
        .withMessage('Category ID must be a valid hexadecimal string')
        .bail()
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('Invalid category ID format');
            }
            return true;
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        // Convert to ObjectId and attach to request for later use
        req.params.id = new mongoose.Types.ObjectId(req.params.id);
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
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }
        
        // Ensure boolean values are properly converted
        if (req.body.isActive !== undefined) {
            req.body.isActive = String(req.body.isActive).toLowerCase() === 'true';
        }
        if (req.body.showOnHome !== undefined) {
            req.body.showOnHome = String(req.body.showOnHome).toLowerCase() === 'true';
        }
        
        console.log('Processed create data:', req.body);
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
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }
        
        // Ensure boolean values are properly converted
        if (req.body.isActive !== undefined) {
            req.body.isActive = String(req.body.isActive).toLowerCase() === 'true';
        }
        if (req.body.showOnHome !== undefined) {
            req.body.showOnHome = String(req.body.showOnHome).toLowerCase() === 'true';
        }
        
        console.log('Processed update data:', req.body);
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
