import Sprint from '../model/Sprint.js';
import Enrollment from '../model/enrollment.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

// @desc    Create a new sprint
// @route   POST /api/sprints
// @access  Private/Admin
export const createSprint = catchAsync(async (req, res, next) => {
  console.log('Received sprint data:', req.body);
  console.log('Authenticated user:', req.user);
  
  try {
    if (!req.user?.id) {
      console.error('No user ID in request');
      return next(new AppError('You must be logged in to create a sprint', 401));
    }

    const sprintData = {
      name: req.body.name,
      description: req.body.description,
      courseId: req.body.courseId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      goal: req.body.goal,
      whatsappGroupLink: req.body.whatsappGroupLink,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdBy: req.user._id || req.user.id // Use _id if available, fallback to id
    };

    console.log('Creating sprint with data:', sprintData);
    const sprint = await Sprint.create(sprintData);

    console.log('Created sprint:', sprint);
    
    res.status(201).json({
      status: 'success',
      data: {
        sprint
      }
    });
  } catch (error) {
    console.error('Error creating sprint:', error);
    console.error('Validation errors:', error.errors);
    next(error);
  }
});

// @desc    Get all sprints
// @route   GET /api/sprints
// @access  Private/Admin
export const getAllSprints = catchAsync(async (req, res, next) => {
  const sprints = await Sprint.find({})
    .sort('-createdAt')
    .select('-__v')
    .populate('courseId', 'title');

  res.status(200).json({
    status: 'success',
    results: sprints.length,
    data: {
      sprints
    }
  });
});

// @desc    Get all sprints for a course
// @route   GET /api/sprints/course/:courseId
// @access  Private
export const getSprintsByCourse = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  // Check if user is enrolled in the course or is an admin
  if (req.user.role !== 'admin') {
    const enrollment = await Enrollment.findOne({
      $or: [
        { user: userId, course: courseId, status: { $ne: 'cancelled' } },
        { 'guestInfo.email': req.user.email, course: courseId, status: { $ne: 'cancelled' } }
      ]
    });

    if (!enrollment) {
      return next(new AppError('You are not enrolled in this course', 403));
    }
  }
  
  const sprints = await Sprint.find({ courseId, isActive: true })
    .sort('order')
    .select('-__v');

  res.status(200).json({
    status: 'success',
    results: sprints.length,
    data: {
      sprints
    }
  });
});

// @desc    Get a single sprint
// @route   GET /api/sprints/:id
// @access  Private
export const getSprint = catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findById(req.params.id);

  if (!sprint) {
    return next(new AppError('No sprint found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      sprint
    }
  });
});

// @desc    Update a sprint
// @route   PATCH /api/sprints/:id
// @access  Private/Admin
export const updateSprint = catchAsync(async (req, res, next) => {
  // console.log('Update sprint request body:', req.body);
  const { name, description, startDate, endDate, goal, whatsappGroupLink, isActive } = req.body;
  // console.log('whatsappGroupLink from request:', whatsappGroupLink);

  const sprint = await Sprint.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      startDate,
      endDate,
      goal,
      whatsappGroupLink,
      isActive
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!sprint) {
    return next(new AppError('No sprint found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      sprint
    }
  });
});

// @desc    Delete a sprint
// @route   DELETE /api/sprints/:id
// @access  Private/Admin
export const deleteSprint = catchAsync(async (req, res, next) => {
  const sprint = await Sprint.findByIdAndDelete(req.params.id);

  if (!sprint) {
    return next(new AppError('No sprint found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// All functions are now individually exported
