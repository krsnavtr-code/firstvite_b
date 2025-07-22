import Enrollment from '../model/enrollment.model.js';
import Course from '../model/courseModel.js';
import asyncHandler from 'express-async-handler';

// @desc    Enroll in a course (for both guests and authenticated users)
// @route   POST /api/enrollments
// @access  Public
export const enrollInCourse = asyncHandler(async (req, res) => {
  const { courseId, name, email, phone, message } = req.body;
  const userId = req.user?._id; // Will be undefined for guests

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Check for existing enrollment
  let existingEnrollment;
  
  if (userId) {
    // For authenticated users, check by user ID and course
    existingEnrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
      user: { $type: 'objectId' }
    });
  } else {
    // For guests, check by email and course
    const guestEmail = (email || req.body.contactInfo?.email || '').toLowerCase().trim();
    
    if (!guestEmail) {
      res.status(400);
      throw new Error('Email is required for guest enrollment');
    }
    
    // Check for existing guest enrollment with the same email and course
    existingEnrollment = await Enrollment.findOne({
      'guestInfo.email': guestEmail,
      course: courseId,
      user: { $exists: false }
    });
  }

  if (existingEnrollment) {
    res.status(400);
    throw new Error('You are already enrolled in this course');
  }

  // Prepare base enrollment data
  const enrollmentData = {
    course: courseId,
    courseId: course._id.toString(),
    courseTitle: course.title,
    status: req.body.status || 'pending',
    enrollmentDate: new Date(),
    lastAccessed: new Date(),
    progress: req.body.progress || 0,
    isGuestEnrollment: !userId,
    enrolledAt: Date.now(),
    // Explicitly set contactInfo to undefined to avoid index conflicts
    contactInfo: undefined
  };

  // Handle authenticated user enrollment
  if (userId) {
    enrollmentData.user = userId;
  } 
  // Handle guest enrollment
  else {
    // Get contact info from either contactInfo object or individual fields
    const contactInfo = req.body.contactInfo || {};
    
    // Create guestInfo object with proper validation
    const guestInfo = {
      name: (contactInfo.name || name || '').trim(),
      email: (contactInfo.email || email || '').toLowerCase().trim(),
      phone: (contactInfo.phone || phone || '').trim(),
      message: (contactInfo.message || message || '').trim()
    };
    
    // Validate required fields
    if (!guestInfo.name) {
      res.status(400);
      throw new Error('Name is required for guest enrollment');
    }
    
    if (!guestInfo.email) {
      res.status(400);
      throw new Error('Email is required for guest enrollment');
    }
    
    // Assign guestInfo to the enrollment
    enrollmentData.guestInfo = guestInfo;
  }
  
  // Add any additional fields from the request
  if (req.body.progress !== undefined) {
    enrollmentData.progress = req.body.progress;
  }
  
  if (req.body.status) {
    enrollmentData.status = req.body.status;
  }

  const enrollment = await Enrollment.create(enrollmentData);

  res.status(201).json({
    success: true,
    data: enrollment
  });
});

// @desc    Get user's enrollments
// @route   GET /api/enrollments/my-enrollments
// @access  Private
export const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ user: req.user._id })
    .populate('course', 'title thumbnail price')
    .sort('-createdAt');

  res.json({
    success: true,
    data: enrollments
  });
});
