import Course from "../model/course.model.js";
import { validationResult } from 'express-validator';

// Helper function to clean array fields
const cleanArrayField = (field, defaultVal = []) => {
    if (!field) return defaultVal;
    if (Array.isArray(field)) {
        const cleaned = field.filter(item => item && item.toString().trim() !== '');
        return cleaned.length > 0 ? cleaned : defaultVal;
    }
    if (typeof field === 'string') {
        const items = field.split('\n')
            .map(item => item.trim())
            .filter(item => item !== '');
        return items.length > 0 ? items : defaultVal;
    }
    return defaultVal;
};

// Helper function to clean and format course data
const prepareCourseData = (data) => {
    // Clean array fields
    const arrayFields = [
        'benefits', 'skills', 'mentors', 'curriculum', 'faqs',
        'whatYouWillLearn', 'requirements', 'whoIsThisFor', 'tags', 'prerequisites'
    ];

    // Create a clean copy of the data
    const cleanData = { ...data };

    // Process array fields
    arrayFields.forEach(field => {
        if (field === 'benefits') {
            cleanData[field] = cleanArrayField(data[field], ['No benefits specified']);
        } else if (Array.isArray(data[field])) {
            cleanData[field] = data[field].filter(item => 
                item !== null && item !== undefined && item.toString().trim() !== ''
            );
        } else if (data[field] === undefined || data[field] === null) {
            cleanData[field] = [];
        } else if (typeof data[field] === 'string') {
            cleanData[field] = data[field]
                .split('\n')
                .map(item => item.trim())
                .filter(item => item !== '');
        } else {
            cleanData[field] = [];
        }
    });

    // Process curriculum
    if (Array.isArray(data.curriculum)) {
        cleanData.curriculum = data.curriculum
            .filter(week => week && (week.title || week.week))
            .map((week, index) => ({
                week: Number(week.week) || index + 1,
                title: week.title?.toString().trim() || `Week ${index + 1}`,
                description: week.description?.toString().trim() || '',
                duration: week.duration?.toString().trim() || '0 min',
                topics: cleanArrayField(week.topics, [])
            }));
    } else {
        cleanData.curriculum = [{
            week: 1,
            title: 'Introduction',
            description: '',
            duration: '0 min',
            topics: ['Course introduction']
        }];
    }

    // Process other fields with defaults
    return {
        title: data.title?.toString().trim() || 'Untitled Course',
        shortDescription: data.shortDescription?.toString().trim() || '',
        description: data.description?.toString().trim() || '',
        category: data.category?.toString().trim() || null,
        instructor: data.instructor?.toString().trim() || 'Unknown Instructor',
        price: Math.max(0, Number(data.price) || 0),
        originalPrice: Math.max(0, Number(data.originalPrice) || 0),
        totalHours: Math.max(0, Number(data.totalHours) || 0),
        image: data.image?.toString().trim() || '',
        thumbnail: data.thumbnail?.toString().trim() || data.image?.toString().trim() || '',
        previewVideo: data.previewVideo?.toString().trim() || '',
        duration: data.duration?.toString().trim() || '0 min',
        level: ['Beginner', 'Intermediate', 'Advanced'].includes(data.level) 
            ? data.level 
            : 'Beginner',
        language: data.language?.toString().trim() || 'English',
        metaTitle: data.metaTitle?.toString().trim() || data.title?.toString().trim() || '',
        metaDescription: data.metaDescription?.toString().trim() || data.shortDescription?.toString().trim() || '',
        slug: data.slug?.toString().trim() || '',
        certificateIncluded: data.certificateIncluded !== false, // default to true
        isFeatured: Boolean(data.isFeatured),
        isPublished: Boolean(data.isPublished),
        status: ['draft', 'published', 'archived'].includes(data.status) 
            ? data.status 
            : 'draft',
        // Add array fields
        benefits: cleanData.benefits,
        skills: cleanData.skills,
        mentors: cleanData.mentors,
        curriculum: cleanData.curriculum,
        faqs: cleanData.faqs,
        whatYouWillLearn: cleanData.whatYouWillLearn,
        requirements: cleanData.requirements,
        whoIsThisFor: cleanData.whoIsThisFor,
        tags: cleanData.tags,
        prerequisites: cleanData.prerequisites
    };
};

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

        // Prepare and clean the course data
        const courseData = prepareCourseData(req.body);
        console.log('Creating course with data:', courseData);
        
        // Create course with all fields
        const course = new Course({
            ...courseData,
            totalStudents: 0,
            averageRating: 0,
            totalReviews: 0
        });

        try {
            // Save the course
            const savedCourse = await course.save();
            
            // Populate the category field before sending the response
            const populatedCourse = await savedCourse.populate('category', 'name _id');
            
            return res.status(201).json({
                success: true,
                message: 'Course created successfully',
                data: populatedCourse.toObject()
            });
        } catch (error) {
            console.error('Error saving course:', error);
            
            // Handle duplicate key error
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                return res.status(400).json({
                    success: false,
                    message: `A course with this ${field} already exists`
                });
            }
            
            // Handle validation errors
            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map(val => val.message);
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: messages
                });
            }
            
            throw error; // Re-throw to be caught by the outer catch
        }
    } catch (error) {
        console.error('Error in createCourse:', error);
        
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all courses with optional filters
export const getAllCourses = async (req, res) => {
    try {
        const { category, status, fields, all } = req.query;
        console.log('Getting all courses with params:', { category, status, fields, all, user: req.user });
        const query = {};
        
        // Add category filter if provided
        if (category) {
            query.category = category;
        }
        
        // Handle published status filtering
        const isAdmin = req.user && req.user.role === 'admin';
        
        // Only apply isPublished filter if not requesting all courses (for admin)
        if (all !== 'true') {
            if (!isAdmin) {
                // For non-admin users, only show published courses
                query.isPublished = true;
            } else if (status) {
                // For admin users, respect the status filter if provided
                query.isPublished = status === 'published';
            }
        }
        
        // Build the selection fields
        let selection = '';
        if (fields) {
            // Convert comma-separated fields to space-separated for Mongoose
            selection = fields.split(',').join(' ');
        }
        
        // Execute the query with filters and selection
        let coursesQuery = Course.find(query)
            .populate('category', 'name')
            .sort({ createdAt: -1 });
            
        // Apply field selection if specified
        if (selection) {
            coursesQuery = coursesQuery.select(selection);
        }
        
        const courses = await coursesQuery.exec();
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single course by ID or slug
export const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const { fields } = req.query;
        
        // Build the query condition
        const condition = /^[0-9a-fA-F]{24}$/.test(id) 
            ? { $or: [{ _id: id }, { slug: id }] } 
            : { slug: id };
        
        // Start building the query
        let query = Course.findOne(condition);
        
        // Select fields if specified, otherwise include all fields
        if (fields) {
            const fieldsArray = fields.split(',').map(field => field.trim());
            // Always include _id field
            if (!fieldsArray.includes('_id')) {
                fieldsArray.push('_id');
            }
            query = query.select(fieldsArray.join(' '));
        }
        
        // Always include these fields if not already included
        const requiredFields = [
            'title', 'description', 'shortDescription', 'category', 
            'instructor', 'price', 'originalPrice', 'thumbnail', 
            'duration', 'level', 'benefits', 'whatYouWillLearn', 
            'requirements', 'whoIsThisFor', 'curriculum', 'isFeatured',
            'isPublished', 'slug', 'tags', 'faqs', 'certificateIncluded',
            'metaTitle', 'metaDescription', 'previewVideo', 'image'
        ];
        
        // Add required fields to the select if they're not already included
        if (fields) {
            const includedFields = fields.split(',').map(f => f.trim());
            const missingFields = requiredFields.filter(f => !includedFields.includes(f) && f !== '_id');
            if (missingFields.length > 0) {
                query = query.select(missingFields.join(' '));
            }
        }
        
        // Populate necessary fields
        query = query.populate('category', 'name _id');
        
        const course = await query.lean().exec();
        
        if (!course) {
            return res.status(404).json({ 
                success: false,
                message: 'Course not found' 
            });
        }
        
        // Ensure all arrays exist and have at least one empty string if empty
        const ensureArray = (arr) => Array.isArray(arr) && arr.length > 0 ? arr : [''];
        
        const processedCourse = {
            ...course,
            benefits: ensureArray(course.benefits),
            whatYouWillLearn: ensureArray(course.whatYouWillLearn),
            requirements: ensureArray(course.requirements),
            whoIsThisFor: ensureArray(course.whoIsThisFor),
            tags: course.tags || [],
            faqs: course.faqs || [],
            curriculum: course.curriculum?.length ? course.curriculum : [{
                week: 1,
                title: "Introduction",
                description: "",
                duration: "0 min",
                topics: [""]
            }]
        };
        
        res.json({
            success: true,
            data: processedCourse
        });
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update a course
export const updateCourse = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('Validation errors:', errors.array());
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const courseId = req.params.id;
        console.log(`Updating course ${courseId} with data:`, req.body);

        // Helper function to clean array fields
        const cleanArrayField = (field) => {
            if (!field) return [];
            if (Array.isArray(field)) {
                return field.filter(item => item && item.toString().trim() !== '');
            }
            if (typeof field === 'string') {
                return field.split('\n')
                    .map(item => item.trim())
                    .filter(item => item !== '');
            }
            return [];
        };

        // Extract and clean all fields
        const {
            title,
            shortDescription = '',
            description = '',
            category,
            instructor,
            price = 0,
            originalPrice = 0,
            totalHours = 0,
            duration = '',
            level = 'Beginner',
            benefits,
            skills,
            curriculum,
            faqs = [],
            language = 'English',
            whatYouWillLearn,
            prerequisites,
            requirements,
            whoIsThisFor,
            certificateIncluded = true,
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
        
        // Prepare update data with proper cleaning
        const updateData = {
            title: title?.toString()?.trim() || 'Untitled Course',
            shortDescription: shortDescription?.toString()?.trim() || '',
            description: description?.toString()?.trim() || '',
            category: category?.toString()?.trim() || null,
            instructor: instructor?.toString()?.trim() || null,
            price: Math.max(0, Number(price) || 0),
            originalPrice: Math.max(0, Number(originalPrice) || 0),
            totalHours: Math.max(0, Number(totalHours) || 0),
            duration: duration?.toString()?.trim() || '0 min',
            level: ['Beginner', 'Intermediate', 'Advanced'].includes(level) ? level : 'Beginner',
            benefits: cleanArrayField(benefits),
            skills: cleanArrayField(skills),
            requirements: cleanArrayField(requirements),
            whoIsThisFor: cleanArrayField(whoIsThisFor),
            whatYouWillLearn: cleanArrayField(whatYouWillLearn),
            prerequisites: cleanArrayField(prerequisites),
            certificateIncluded: certificateIncluded !== false, // default to true
            isFeatured: Boolean(isFeatured),
            isPublished: Boolean(isPublished),
            status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
            image: image?.toString()?.trim() || '',
            thumbnail: thumbnail?.toString()?.trim() || '',
            previewVideo: previewVideo?.toString()?.trim() || '',
            metaTitle: metaTitle?.toString()?.trim() || '',
            metaDescription: metaDescription?.toString()?.trim() || '',
            slug: slug?.toString()?.trim() || '',
            tags: Array.isArray(tags) ? tags.map(tag => tag?.toString()?.trim()).filter(Boolean) : [],
            faqs: Array.isArray(faqs) ? faqs.filter(faq => 
                faq && 
                typeof faq === 'object' && 
                faq.question && 
                faq.answer
            ).map(faq => ({
                question: faq.question.toString().trim(),
                answer: faq.answer.toString().trim()
            })) : [],
            curriculum: Array.isArray(curriculum) ? curriculum.map((week, index) => ({
                week: Math.max(1, Number(week.week) || index + 1),
                title: week.title?.toString()?.trim() || `Week ${index + 1}`,
                description: week.description?.toString()?.trim() || '',
                duration: week.duration?.toString()?.trim() || '0 min',
                topics: Array.isArray(week.topics) 
                    ? week.topics.map(topic => topic?.toString()?.trim()).filter(Boolean)
                    : []
            })) : []
        };

        console.log('Processed update data:', updateData);
        
        // Find and update the course
        const course = await Course.findById(courseId);
        if (!course) {
            console.error(`Course not found: ${courseId}`);
            return res.status(404).json({ 
                success: false,
                message: 'Course not found' 
            });
        }

        // Update each field individually to trigger any pre-save hooks
        Object.keys(updateData).forEach(key => {
            course[key] = updateData[key];
        });

        // Save the updated course
        const updatedCourse = await course.save();
        
        // Populate the category for the response
        await updatedCourse.populate('category', 'name _id');
        
        console.log('Course updated successfully:', updatedCourse._id);
        
        res.json({
            success: true,
            message: 'Course updated successfully',
            data: updatedCourse.toObject()
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
