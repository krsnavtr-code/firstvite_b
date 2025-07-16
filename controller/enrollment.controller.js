import Enrollment from '../model/enrollment.model.js';
import Course from '../model/courseModel.js';
import asyncHandler from 'express-async-handler';

// @desc    Enroll in a course
// @route   POST /api/enrollments
// @access  Private
export const enrollInCourse = asyncHandler(async (req, res) => {
  const { courseId, name, email, phone, message } = req.body;
  const userId = req.user._id;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Check if already enrolled
  const existingEnrollment = await Enrollment.findOne({
    user: userId,
    course: courseId
  });

  if (existingEnrollment) {
    res.status(400);
    throw new Error('You are already enrolled in this course');
  }

  // Create enrollment
  const enrollment = await Enrollment.create({
    user: userId,
    course: courseId,
    courseId: course._id.toString(),
    courseTitle: course.title,
    status: 'pending',
    contactInfo: {
      name,
      email,
      phone,
      message
    }
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
  const enrollments = await Enrollment.find({ user: req.user._id })
    .populate('course', 'title thumbnail price')
    .sort('-createdAt');

  res.json({
    success: true,
    data: enrollments
  });
});
