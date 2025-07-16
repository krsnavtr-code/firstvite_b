import Enrollment from '../model/enrollment.model.js';
import Lesson from '../model/lesson.model.js';
import Course from '../model/course.model.js';
import User from '../model/User.js';
import { validationResult } from 'express-validator';

// Enroll a user in a course
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ user: userId, course: courseId });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Create new enrollment
    const enrollment = new Enrollment({
      user: userId,
      course: courseId,
      enrollmentDate: new Date(),
      completionStatus: 'not_started',
      progress: 0
    });

    await enrollment.save();
    
    // Add course to user's enrolled courses
    await User.findByIdAndUpdate(userId, {
      $addToSet: { enrolledCourses: courseId }
    });

    // Increment enrollment count in course
    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrollmentCount: 1 }
    });

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ message: 'Error enrolling in course', error: error.message });
  }
};

// Get user's enrolled courses
export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate('course', 'title description image instructor')
      .sort({ lastAccessed: -1 });

    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ message: 'Error fetching enrollments', error: error.message });
  }
};

// Get course content for a user
export const getCourseContent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Get course with lessons
    const course = await Course.findById(courseId)
      .populate('instructor', 'name email')
      .populate('lessons');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Update last accessed
    enrollment.lastAccessed = new Date();
    await enrollment.save();

    res.json({
      course,
      enrollment
    });
  } catch (error) {
    console.error('Error fetching course content:', error);
    res.status(500).json({ message: 'Error fetching course content', error: error.message });
  }
};

// Update lesson progress
export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user._id;

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Check if lesson exists in course
    const lesson = await Lesson.findOne({
      _id: lessonId,
      course: courseId
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found in this course' });
    }

    // Add to completed lessons if not already there
    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
      
      // Calculate new progress
      const totalLessons = await Lesson.countDocuments({ course: courseId });
      const completedCount = enrollment.completedLessons.length;
      enrollment.progress = Math.round((completedCount / totalLessons) * 100);
      
      // Update completion status
      if (enrollment.progress === 100) {
        enrollment.completionStatus = 'completed';
      } else if (enrollment.progress > 0) {
        enrollment.completionStatus = 'in_progress';
      }
      
      await enrollment.save();
    }

    res.json({
      message: 'Lesson progress updated',
      progress: enrollment.progress,
      completionStatus: enrollment.completionStatus
    });
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    res.status(500).json({ message: 'Error updating progress', error: error.message });
  }
};

// Generate certificate (basic implementation)
export const generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Check if user has completed the course
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
      completionStatus: 'completed'
    });

    if (!enrollment) {
      return res.status(400).json({ message: 'Course not completed' });
    }

    // Check if certificate already exists
    if (enrollment.certificateIssued) {
      return res.json({
        message: 'Certificate already issued',
        certificateId: enrollment.certificateId
      });
    }

    // Generate certificate ID (in a real app, you'd generate a proper certificate)
    const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Update enrollment with certificate info
    enrollment.certificateIssued = true;
    enrollment.certificateId = certificateId;
    enrollment.certificateIssuedAt = new Date();
    await enrollment.save();

    res.json({
      message: 'Certificate generated successfully',
      certificateId,
      issuedAt: enrollment.certificateIssuedAt
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ message: 'Error generating certificate', error: error.message });
  }
};
