import express from "express";
import { body } from 'express-validator';
import { 
    createBook, 
    updateBook, 
    deleteBook, 
    getAllBooks, 
    getBookById, 
    getAdminBooks 
} from "../controller/book.controller.js";
import { isAdmin } from "../middleware/admin.js";

const router = express.Router();

// Validation middleware
const validateBook = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 5, max: 200 })
        .withMessage('Title must be between 5 and 200 characters'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 20 })
        .withMessage('Description must be at least 20 characters'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('category')
        .notEmpty()
        .withMessage('Category is required')
        .isMongoId()
        .withMessage('Invalid category ID'),
    body('instructor')
        .trim()
        .notEmpty()
        .withMessage('Instructor name is required'),
    body('duration')
        .trim()
        .notEmpty()
        .withMessage('Duration is required'),
    body('level')
        .isIn(['Beginner', 'Intermediate', 'Advanced'])
        .withMessage('Invalid difficulty level'),
    body('image')
        .trim()
        .notEmpty()
        .withMessage('Image URL is required')
        .isURL()
        .withMessage('Invalid image URL')
];

// Admin routes
router.post('/', isAdmin, validateBook, createBook);
router.put('/:id', isAdmin, validateBook, updateBook);
router.delete('/:id', isAdmin, deleteBook);
router.get('/admin', isAdmin, getAdminBooks);

// Public routes
router.get('/', getAllBooks);
router.get('/:id', getBookById);

export default router;