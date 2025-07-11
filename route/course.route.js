import express from 'express';
import { body } from 'express-validator';
import { 
    createCourse, 
    getAllCourses, 
    getCourseById, 
    updateCourse, 
    deleteCourse,
    uploadCourseImage
} from '../controller/course.controller.js';
import { isAdmin } from '../middleware/admin.js';
import { handleFileUpload } from '../utils/fileUpload.js';

const router = express.Router();

// Validation middleware
const validateCourse = [
    body('title')
        .trim()
        .isLength({ min: 5, max: 100 })
        .withMessage('Title must be between 5 and 100 characters'),
    body('description')
        .trim()
        .isLength({ min: 10 })
        .withMessage('Description must be at least 10 characters'),
    body('category')
        .isMongoId()
        .withMessage('Invalid category ID'),
    body('instructor')
        .trim()
        .isLength({ min: 2 })
        .withMessage('Instructor name is required'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('duration')
        .trim()
        .notEmpty()
        .withMessage('Duration is required'),
    body('level')
        .optional()
        .isIn(['Beginner', 'Intermediate', 'Advanced'])
        .withMessage('Invalid level'),
    body('showOnHome')
        .optional()
        .isBoolean()
        .withMessage('Show on Home must be a boolean value')
];

// Admin routes
router.post('/', isAdmin, validateCourse, createCourse);
router.put('/:id', isAdmin, validateCourse, updateCourse);
router.delete('/:id', isAdmin, deleteCourse);

// Image upload route - Must come before the ID parameter routes
router.post('/upload-image', isAdmin, handleFileUpload, uploadCourseImage);

// Public routes
router.get('/', getAllCourses);
router.get('/:id', getCourseById);

export default router;
