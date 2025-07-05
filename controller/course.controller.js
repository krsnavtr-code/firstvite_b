import Course from "../model/course.model.js";
import { validationResult } from 'express-validator';

// Create a new course
export const createCourse = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, category, instructor, price, image, duration, level } = req.body;
        
        const course = new Course({
            title,
            description,
            category,
            instructor,
            price,
            image: image || '',
            duration,
            level: level || 'Beginner'
        });

        await course.save();
        
        // Populate category details in the response
        await course.populate('category', 'name');
        
        res.status(201).json(course);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all courses with optional category filter
export const getAllCourses = async (req, res) => {
    try {
        const { category } = req.query;
        const query = {};
        
        if (category) {
            query.category = category;
        }
        
        const courses = await Course.find(query)
            .populate('category', 'name')
            .sort({ createdAt: -1 });
            
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single course by ID
export const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('category', 'name');
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json(course);
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update a course
export const updateCourse = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, category, instructor, price, image, duration, level, isPublished } = req.body;
        
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { 
                title, 
                description, 
                category, 
                instructor, 
                price, 
                image, 
                duration, 
                level,
                isPublished
            },
            { new: true, runValidators: true }
        ).populate('category', 'name');
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json(course);
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a course
export const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
