import express from "express";
import { body, validationResult } from 'express-validator';
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

];

// Admin routes
router.post('/', 
    isAdmin,
    upload.single('image'),
    (req, res, next) => {
        console.log('Request body:', req.body);
        console.log('File:', req.file);
        
        // If we have a file upload, convert it to base64
        if (req.file) {
            req.body.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        } else if (req.body.image) {
            // If image is sent as base64 in the body
            req.body.image = req.body.image;
        } else {
            req.body.image = ''; // Set default empty string if no image
        }
        
        // Parse isActive if it's a string
        if (typeof req.body.isActive === 'string') {
            req.body.isActive = req.body.isActive === 'true';
        }
        
        next();
    },
    [
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
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('Validation errors:', errors.array());
                return res.status(400).json({ errors: errors.array() });
            }
            next();
        } catch (error) {
            console.error('Validation error:', error);
            return res.status(500).json({ error: 'Validation error' });
        }
    },
    createCategory
);

router.put('/:id', 
    isAdmin, 
    upload.single('image'),
    (req, res, next) => {
        console.log('Update request body:', req.body);
        console.log('Update file:', req.file);
        
        // If we have a file upload, convert it to base64
        if (req.file) {
            req.body.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        } else if (req.body.image) {
            // If image is sent as base64 in the body
            req.body.image = req.body.image;
        } else {
            req.body.image = ''; // Set default empty string if no image
        }
        
        // Parse isActive if it's a string
        if (typeof req.body.isActive === 'string') {
            req.body.isActive = req.body.isActive === 'true';
        }
        
        next();
    },
    [
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
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('Update validation errors:', errors.array());
                return res.status(400).json({ errors: errors.array() });
            }
            next();
        } catch (error) {
            console.error('Update validation error:', error);
            return res.status(500).json({ error: 'Validation error' });
        }
    },
    updateCategory
);
router.delete('/:id', isAdmin, deleteCategory);

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

export default router;
