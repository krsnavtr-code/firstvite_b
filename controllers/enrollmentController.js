import Enrollment from '../models/enrollmentModel.js';
import { validationResult } from 'express-validator';

// @desc    Enroll user in a course
// @route   POST /api/enrollments
// @access  Private
export const enrollInCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, userId, status = 'pending' } = req.body;

    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({ 
      user: userId, 
      course: courseId 
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course',
        enrollment: existingEnrollment
      });
    }

    // Create new enrollment
    const enrollment = new Enrollment({
      user: userId,
      course: courseId,
      status,
      enrolledAt: Date.now()
    });

    await enrollment.save();

    // Populate course details for the response
    await enrollment.populate('course', 'title description thumbnail instructor price');

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in the course',
      enrollment
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling in course',
      error: error.message
    });
  }
};

// @desc    Get user's enrollments
// @route   GET /api/enrollments/me
// @access  Private
export const getMyEnrollments = async (req, res) => {
  try {
    console.log('getMyEnrollments - Request received');
    console.log('Query params:', req.query);
    console.log('Auth user:', req.user);
    
    const userId = req.query.userId || req.user?.id;
    
    if (!userId) {
      console.error('No user ID provided');
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    console.log(`Fetching enrollments for user: ${userId}`);
    const enrollments = await Enrollment.find({ user: userId })
      .populate('course', 'title description thumbnail instructor price')
      .sort({ enrolledAt: -1 });
      
    console.log(`Found ${enrollments.length} enrollments`);

    res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments
    });
  } catch (error) {
    console.error('Error getting enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting enrollments',
      error: error.message
    });
  }
};

// @desc    Update enrollment status
// @route   PUT /api/enrollments/:id
// @access  Private/Admin
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const enrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Enrollment status updated',
      enrollment
    });

  } catch (error) {
    console.error('Error updating enrollment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating enrollment status',
      error: error.message
    });
  }
};
