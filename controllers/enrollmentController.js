import Enrollment from '../model/enrollment.model.js';
import Course from '../model/courseModel.js';
import User from '../model/User.js';
import { validationResult } from 'express-validator';

// @desc    Enroll user in a course
// @route   POST /api/enrollments
// @access  Public
// @body    {string} courseId - ID of the course to enroll in
// @body    {object} contactInfo - Contact information (required for guest users)
// @body    {string} contactInfo.name - Full name (required for guests)
// @body    {string} contactInfo.email - Email address (required for guests)
// @body    {string} [contactInfo.phone] - Phone number (optional)
// @body    {string} [contactInfo.message] - Additional message (optional)
export const enrollInCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get user ID from the authenticated token (if available)
    const userId = req.user?.id;
    const { courseId, status = 'pending', contactInfo } = req.body;
    
    // For guest users, validate required contact info
    if (!userId) {
      if (!contactInfo || !contactInfo.name || !contactInfo.email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required for guest enrollments'
        });
      }
    }

    // Check if enrollment already exists for authenticated users
    if (userId) {
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
    }

    // Get course details
    const course = await Course.findById(courseId).select('title slug');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Create new enrollment with contact info
    const enrollmentData = {
      user: userId || null, // null for guest users
      course: courseId,
      courseId: courseId,
      courseTitle: course.title,
      status: 'active', // Set to active to show in My Learning
      enrolledAt: Date.now(),
      lastAccessed: Date.now(),
      contactInfo: {
        name: userId ? (req.user.name || 'Unknown') : contactInfo.name,
        email: userId ? req.user.email : contactInfo.email,
        phone: contactInfo?.phone || '',
        message: contactInfo?.message || `Enrollment request for ${course.title}`
      },
      progress: 0, // Initialize progress
      enrollmentDate: new Date(),
      isGuestEnrollment: !userId // Flag to identify guest enrollments
    };
    
    // Force status to be 'active' to ensure it shows in My Learning
    enrollmentData.status = 'active';

    console.log('Creating enrollment with data:', JSON.stringify(enrollmentData, null, 2));
    
    const enrollment = new Enrollment(enrollmentData);
    const savedEnrollment = await enrollment.save();
    
    console.log('Enrollment created successfully:', savedEnrollment);

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
    console.log('Authenticated user ID:', req.user?.id);
    
    // Get user ID from query params or auth token
    const userId = req.query.userId || req.user?.id;
    const { status } = req.query;
    
    if (!userId) {
      console.error('No user ID provided');
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    console.log(`Fetching enrollments for user: ${userId}`);
    
    // Build query - use completionStatus instead of status to match schema
    const query = { user: userId };
    if (status) {
      query.completionStatus = status;
    }

    // Log the query being executed
    console.log('Executing query:', JSON.stringify(query));

    // Find enrollments with detailed course population
    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'course',
        select: 'title description thumbnail instructor price modules duration slug',
        populate: {
          path: 'instructor',
          select: 'name email avatar'
        },
        options: { lean: true }
      })
      .sort({ enrolledAt: -1 })
      .lean(); // Convert to plain JavaScript objects for better performance

    console.log(`Found ${enrollments.length} enrollments for user ${userId}`);
    
    // Format the response
    const formattedEnrollments = enrollments.map(enrollment => ({
      _id: enrollment._id,
      user: enrollment.user,
      course: enrollment.course ? {
        _id: enrollment.course._id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        thumbnail: enrollment.course.thumbnail,
        slug: enrollment.course.slug,
        duration: enrollment.course.duration,
        instructor: enrollment.course.instructor,
        modules: enrollment.course.modules || []
      } : {
        title: enrollment.courseTitle || 'Course not found',
        _id: enrollment.courseId || 'unknown'
      },
      status: enrollment.status,
      progress: enrollment.progress || 0,
      enrolledAt: enrollment.enrolledAt,
      lastAccessed: enrollment.lastAccessed
    }));

    console.log('Formatted enrollments:', formattedEnrollments);
    
    return res.status(200).json({
      success: true,
      count: formattedEnrollments.length,
      data: formattedEnrollments
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

// @desc    Get all pending enrollments (Admin only)
// @route   GET /api/enrollments/pending
// @access  Private/Admin
export const getPendingEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ status: 'pending' })
      .populate('user', 'name email')
      .populate('course', 'title instructor')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments
    });
  } catch (error) {
    console.error('Error fetching pending enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending enrollments',
      error: error.message
    });
  }
};

// @desc    Update enrollment status (Admin only)
// @route   PUT /api/enrollments/:id/status
// @access  Private/Admin
// @desc    Update all pending enrollments to active (temporary endpoint)
// @route   PUT /api/enrollments/update-to-active
// @access  Private/Admin
export const updatePendingToActive = async (req, res) => {
  try {
    const result = await Enrollment.updateMany(
      { status: 'pending' },
      { $set: { status: 'active' } }
    );
    
    res.status(200).json({
      success: true,
      message: `Updated ${result.nModified} enrollments to active status`,
      data: result
    });
  } catch (error) {
    console.error('Error updating enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating enrollments',
      error: error.message
    });
  }
};

// @desc    Update enrollment status (Admin only)
// @route   PUT /api/enrollments/:id/status
// @access  Private/Admin
// @desc    Get all enrollments with complete user details (Admin only)
// @route   GET /api/enrollments/all
// @access  Private/Admin
export const getAllEnrollments = async (req, res) => {
  try {
    const { status, language = 'en' } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Find enrollments with detailed user and course population
    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'user',
        select: 'name email phone role createdAt',
        model: User
      })
      .populate({
        path: 'course',
        select: 'title description thumbnail instructor price duration slug',
        populate: {
          path: 'instructor',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    // Format response with Thai language support
    const formattedEnrollments = enrollments.map(enrollment => ({
      _id: enrollment._id,
      user: {
        _id: enrollment.user?._id,
        name: enrollment.user?.name || 'N/A',
        email: enrollment.user?.email || 'N/A',
        phone: enrollment.user?.phone || 'N/A',
        role: enrollment.user?.role || 'user',
        joined: enrollment.user?.createdAt || 'N/A'
      },
      course: {
        _id: enrollment.course?._id || 'N/A',
        title: enrollment.course?.title || enrollment.courseTitle || 'Course not found',
        instructor: enrollment.course?.instructor?.name || 'N/A',
        duration: enrollment.course?.duration || 'N/A'
      },
      status: enrollment.status,
      progress: enrollment.progress || 0,
      enrolledAt: enrollment.enrolledAt,
      lastAccessed: enrollment.lastAccessed || 'Never',
      contactInfo: enrollment.contactInfo || {}
    }));

    // Thai language messages
    const messages = {
      en: {
        success: 'Enrollments retrieved successfully',
        error: 'Error retrieving enrollments'
      },
      th: {
        success: 'ดึงข้อมูลการลงทะเบียนสำเร็จ',
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการลงทะเบียน'
      }
    };

    res.status(200).json({
      success: true,
      message: messages[language]?.success || messages.en.success,
      count: formattedEnrollments.length,
      data: formattedEnrollments
    });
  } catch (error) {
    console.error('Error getting all enrollments:', error);
    res.status(500).json({
      success: false,
      message: messages[req.query.language || 'en']?.error || 'Error getting enrollments',
      error: error.message
    });
  }
};

export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'active', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, active, rejected, completed'
      });
    }

    const enrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(status === 'active' && { enrolledAt: Date.now() })
      },
      { new: true, runValidators: true }
    )
    .populate('user', 'name email')
    .populate('course', 'title');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // TODO: Send email notification to user about status update

    res.status(200).json({
      success: true,
      message: `Enrollment ${status} successfully`,
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
