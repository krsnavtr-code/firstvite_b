import Course from "../model/course.model.js";
import { validationResult } from 'express-validator';

// Create a new course
export const createCourse = async (req, res) => {
    try {
        console.log('Received create course request with data:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('Validation errors:', errors.array());
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        // Extract all possible fields with defaults
        const {
            title,
            description = '',
            category,
            instructor = 'Unknown Instructor',
            price = 0,
            image = '',
            duration = 0,
            level = 'Beginner',
            benefits = [],
            skills = '',
            mentors = [],
            curriculum = [],
            faqs = [],
            language = 'English',
            whatYouWillLearn = [],
            requirements = [],
            whoIsThisFor = [],
            previewVideo = '',
            thumbnail = '',
            metaTitle = '',
            metaDescription = '',
            slug = '',
            tags = []
        } = req.body;

        // Create course with all fields
        const course = new Course({
            title,
            description,
            category,
            instructor,
            price,
            image,
            duration,
            level,
            benefits,
            skills,
            mentors,
            curriculum,
            faqs,
            language,
            whatYouWillLearn,
            requirements,
            whoIsThisFor,
            previewVideo,
            thumbnail,
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || description.substring(0, 160),
            slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
            tags
        });

        await course.save();
        
        // Populate category details in the response
        await course.populate('category', 'name');
        
        console.log('Course created successfully:', course._id);
        res.status(201).json({
            success: true,
            data: course
        });
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

        // Extract all possible fields
        const {
            title,
            shortDescription = '',
            description = '',
            category,
            instructor,
            price = 0,
            originalPrice = 0,
            totalHours = 0,
            duration = 0,
            level = 'Beginner',
            benefits = [],
            skills = [],
            curriculum = [],
            faqs = [],
            language = 'English',
            whatYouWillLearn = [],
            prerequisites = [],
            certificateIncluded = false,
            isFeatured = false,
            isPublished = false,
            status = 'draft',
            image = '',
            thumbnail = '',
            previewVideo = '',
            metaTitle = '',
            metaDescription = '',
            slug = '',
            tags = []
        } = req.body;
        
        const updateData = {
            title,
            shortDescription,
            description,
            category,
            instructor,
            price: Number(price) || 0,
            originalPrice: Number(originalPrice) || 0,
            totalHours: Number(totalHours) || 0,
            duration: Number(duration) || 0,
            level,
            benefits: Array.isArray(benefits) ? benefits : [],
            skills: Array.isArray(skills) ? skills : [],
            curriculum: Array.isArray(curriculum) ? curriculum : [],
            faqs: Array.isArray(faqs) ? faqs : [],
            language,
            whatYouWillLearn: Array.isArray(whatYouWillLearn) ? whatYouWillLearn : [],
            prerequisites: Array.isArray(prerequisites) ? prerequisites : [],
            certificateIncluded: Boolean(certificateIncluded),
            isFeatured: Boolean(isFeatured),
            isPublished: Boolean(isPublished),
            status,
            image,
            thumbnail,
            previewVideo,
            metaTitle,
            metaDescription,
            slug,
            tags: Array.isArray(tags) ? tags : []
        };
        
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('category', 'name');
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        
        res.json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a course
// Upload course image
export const uploadCourseImage = async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({
                success: false,
                message: 'No file was uploaded'
            });
        }

        console.log('Processing uploaded file:', req.file);

        // Construct the URL to the uploaded file
        const fileUrl = `/uploads/${req.file.filename}`;
        const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;
        
        console.log('File uploaded successfully. URL:', fullUrl);
        
        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            location: fileUrl,
            fullUrl: fullUrl
        });
    } catch (error) {
        console.error('Error processing image upload:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing image upload',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
