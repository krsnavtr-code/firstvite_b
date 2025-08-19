import Enrollment from '../model/enrollment.model.js';
import Course from '../model/course.model.js';
import User from '../model/User.js';
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
// @desc    Admin enrolls a user in a course
// @route   POST /api/enrollments/admin-enroll
// @access  Private/Admin
export const adminEnrollUser = asyncHandler(async (req, res) => {
  const { userId, courseId, status = 'active' } = req.body;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Check for existing enrollment
  const existingEnrollment = await Enrollment.findOne({
    user: userId,
    course: courseId
  });

  if (existingEnrollment) {
    res.status(400);
    throw new Error('User is already enrolled in this course');
  }

  // Create new enrollment
  const enrollment = await Enrollment.create({
    user: userId,
    course: courseId,
    courseId: course._id.toString(),
    courseTitle: course.title,
    status,
    enrollmentDate: new Date(),
    lastAccessed: new Date(),
    progress: 0,
    isGuestEnrollment: false,
    enrolledAt: Date.now(),
    enrolledBy: req.user._id // Track which admin enrolled the user
  });

  res.status(201).json({
    success: true,
    data: enrollment
  });
});

// @desc    Get user's enrollments
// @route   GET /api/enrollments/my-enrollments
// @access  Private
export const getMyEnrollments = asyncHandler(async (req, res) => {
  try {
    console.log('=== START getMyEnrollments ===');
    console.log('Request user:', {
      id: req.user?._id,
      email: req.user?.email,
      role: req.user?.role,
      isAuthenticated: !!req.user
    });
    console.log('Request query:', req.query);

    if (!req.user) {
      console.error('No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    let query = {};
    
    // If userId is provided and user is admin, use that userId
    if (req.query.userId && req.user.role === 'admin') {
      query.user = req.query.userId;
      console.log('Admin viewing enrollments for user:', req.query.userId);
    } else {
      // Otherwise, use the logged-in user's ID
      query.user = req.user._id;
      console.log('User viewing their own enrollments');
    }

    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    const enrollments = await Enrollment.find(query)
      .populate('course', 'title thumbnail price')
      .sort('-createdAt')
      .lean(); // Convert to plain JS objects for logging

    console.log(`Found ${enrollments.length} enrollments`);
    
    if (enrollments.length > 0) {
      console.log('Sample enrollment:', {
        _id: enrollments[0]._id,
        user: enrollments[0].user,
        course: enrollments[0].course ? {
          _id: enrollments[0].course._id,
          title: enrollments[0].course.title
        } : 'No course data',
        status: enrollments[0].status,
        progress: enrollments[0].progress,
        isGuestEnrollment: enrollments[0].isGuestEnrollment
      });
    } else {
      console.log('No enrollments found for query');
      // Verify if the user exists
      const user = await User.findById(query.user);
      console.log('User exists in database:', !!user);
      if (!user) {
        console.error('User not found in database');
      }
    }

    res.json({
      success: true,
      data: enrollments
    });
    
    console.log('=== END getMyEnrollments ===');
  } catch (error) {
    console.error('Error in getMyEnrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get all enrollments (admin only)
// @route   GET /api/enrollments/all
// @access  Private/Admin
export const getAllEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({})
    .populate('user', 'name email')
    .populate('course', 'title')
    .sort('-enrolledAt');

  res.json({
    success: true,
    count: enrollments.length,
    data: enrollments
  });
});

// @desc    Get pending enrollments (admin only)
// @route   GET /api/enrollments/pending
// @access  Private/Admin
export const getPendingEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ status: 'pending' })
    .populate('user', 'name email')
    .populate('course', 'title')
    .sort('-enrolledAt');

  res.json({
    success: true,
    count: enrollments.length,
    data: enrollments
  });
});

// @desc    Update enrollment status (admin only)
// @route   PUT /api/enrollments/:id/status
// @access  Private/Admin
export const updateEnrollmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  const enrollment = await Enrollment.findById(req.params.id);
  
  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }
  
  enrollment.status = status;
  await enrollment.save();
  
  res.json({
    success: true,
    data: enrollment
  });
});

// @desc    Update pending enrollment to active (admin only)
// @route   PUT /api/enrollments/:id/activate
// @access  Private/Admin
export const updatePendingToActive = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  
  if (!enrollment) {
    res.status(404);
    throw new Error('Enrollment not found');
  }
  
  if (enrollment.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending enrollments can be activated');
  }
  
  enrollment.status = 'active';
  await enrollment.save();
  
  res.json({
    success: true,
    data: enrollment
  });
});
