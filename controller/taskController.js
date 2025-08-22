import Task from '../model/Task.js';
import Session from '../model/Session.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

// @desc    Create a new task for a session
// @route   POST /api/tasks
// @access  Private/Admin
export const createTask = catchAsync(async (req, res, next) => {
  const { title, description, sessionId, questions } = req.body;

  // Create the task
  const task = await Task.create({
    title,
    description,
    sessionId,
    questions: questions || [],
    createdBy: req.user.id
  });

  // Add task to session
  await Session.findByIdAndUpdate(sessionId, {
    $push: { tasks: task._id }
  });

  res.status(201).json({
    status: 'success',
    data: {
      task
    }
  });
});

// @desc    Get all tasks for a session
// @route   GET /api/tasks/session/:sessionId
// @access  Private
export const getTasksBySession = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  
  const tasks = await Task.find({ 
    sessionId,
    isActive: true 
  }).sort('order');

  res.status(200).json({
    status: 'success',
    results: tasks.length,
    data: {
      tasks
    }
  });
});

// @desc    Get a single task
// @route   GET /api/tasks/:id
// @access  Private
export const getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      task
    }
  });
});

// @desc    Update a task
// @route   PATCH /api/tasks/:id
// @access  Private/Admin
export const updateTask = catchAsync(async (req, res, next) => {
  const { title, description, questions, isActive } = req.body;
  
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { 
      title,
      description,
      questions: questions || [],
      isActive,
      updatedAt: Date.now()
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      task
    }
  });
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
export const deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  // Remove task from session
  await Session.findByIdAndUpdate(task.sessionId, {
    $pull: { tasks: task._id }
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Reorder tasks
// @route   PATCH /api/tasks/reorder
// @access  Private/Admin
export const reorderTasks = catchAsync(async (req, res, next) => {
  const { tasks } = req.body;
  
  if (!Array.isArray(tasks)) {
    return next(new AppError('Please provide an array of tasks with their new order', 400));
  }

  const bulkOps = tasks.map(task => ({
    updateOne: {
      filter: { _id: task.id },
      update: { $set: { order: task.order } }
    }
  }));

  await Task.bulkWrite(bulkOps);

  res.status(200).json({
    status: 'success',
    message: 'Tasks reordered successfully'
  });
});

// @desc    Submit task answers
// @route   POST /api/tasks/:id/submit
// @access  Private
export const submitTaskAnswers = catchAsync(async (req, res, next) => {
  const { id: taskId } = req.params;
  const { sessionId, answers, score, timeSpent } = req.body;
  const userId = req.user.id;

  // 1) Check if task exists
  const task = await Task.findById(taskId);
  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }

  // 2) Create submission object
  const submission = {
    user: userId,
    session: sessionId,
    answers,
    score,
    timeSpent,
    submittedAt: Date.now()
  };

  // 3) Add submission to task
  task.submissions = task.submissions || [];
  
  // Check if user already has a submission
  const existingSubmissionIndex = task.submissions.findIndex(
    sub => sub.user.toString() === userId
  );

  if (existingSubmissionIndex >= 0) {
    // Update existing submission
    task.submissions[existingSubmissionIndex] = {
      ...task.submissions[existingSubmissionIndex].toObject(),
      ...submission
    };
  } else {
    // Add new submission
    task.submissions.push(submission);
  }

  // 4) Save the task with updated submissions
  await task.save();

  res.status(200).json({
    status: 'success',
    data: {
      submission: {
        ...submission,
        _id: existingSubmissionIndex >= 0 
          ? task.submissions[existingSubmissionIndex]._id 
          : task.submissions[task.submissions.length - 1]._id
      }
    }
  });
});
