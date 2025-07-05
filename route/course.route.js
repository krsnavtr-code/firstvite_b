import express from 'express';
import { body } from 'express-validator';
import { 
    createCourse, 
    getAllCourses, 
    getCourseById, 
    updateCourse, 
    deleteCourse 
} from '../controller/course.controller.js';
import { isAdmin } from '../middleware/admin.js';

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
        .withMessage('Invalid level')
];

// Admin routes
router.post('/', isAdmin, validateCourse, createCourse);
router.put('/:id', isAdmin, validateCourse, updateCourse);
router.delete('/:id', isAdmin, deleteCourse);

// Public routes
router.get('/', getAllCourses);
router.get('/:id', getCourseById);

export default router;
