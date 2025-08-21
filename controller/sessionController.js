import Session from '../model/Session.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import mongoose from 'mongoose';

// @desc    Create a new session
// @route   POST /api/v1/sessions
// @access  Private/Admin
const createSession = catchAsync(async (req, res, next) => {
  const { name, description, sprintId, duration, content, videoUrl, resources } = req.body;

  // Get the highest order number for this sprint
  const lastSession = await Session.findOne({ sprintId })
    .sort('-order')
    .select('order');
  
  const order = lastSession ? lastSession.order + 1 : 1;

  const session = await Session.create({
    name,
    description,
    sprintId,
    order,
    duration,
    content,
    videoUrl,
    resources: resources || [],
    createdBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: {
      session
    }
  });
});

// @desc    Get all sessions for a sprint
// @route   GET /api/v1/sessions/sprint/:sprintId
// @access  Private
const getSessionsBySprint = catchAsync(async (req, res, next) => {
  const { sprintId } = req.params;
  
  const sessions = await Session.find({ 
    sprintId,
    isActive: true 
  }).sort('order');

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: {
      sessions
    }
  });
});

// @desc    Get a single session
// @route   GET /api/v1/sessions/:id
// @access  Private
const getSession = catchAsync(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('No session found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      session
    }
  });
});

// @desc    Update a session
// @route   PATCH /api/v1/sessions/:id
// @access  Private/Admin
const updateSession = catchAsync(async (req, res, next) => {
  const { name, description, duration, content, videoUrl, resources, isActive } = req.body;
  
  const session = await Session.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      duration,
      content,
      videoUrl,
      resources: resources || [],
      isActive
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!session) {
    return next(new AppError('No session found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      session
    }
  });
});

// @desc    Delete a session
// @route   DELETE /api/v1/sessions/:id
// @access  Private/Admin
const deleteSession = catchAsync(async (req, res, next) => {
  const session = await Session.findByIdAndDelete(req.params.id);

  if (!session) {
    return next(new AppError('No session found with that ID', 404));
  }

  // Update order of remaining sessions
  await Session.updateMany(
    { sprintId: session.sprintId, order: { $gt: session.order } },
    { $inc: { order: -1 } }
  );

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Reorder sessions
// @route   PATCH /api/v1/sessions/reorder
// @access  Private/Admin
const reorderSessions = catchAsync(async (req, res, next) => {
  const { sprintId, sessions } = req.body;

  const session = await Session.startSession();
  await session.withTransaction(async () => {
    const bulkOps = sessions.map((sess, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(sess.id), sprintId },
        update: { $set: { order: index + 1 } }
      }
    }));

    await Session.bulkWrite(bulkOps, { session });
  });
  session.endSession();

  res.status(200).json({
    status: 'success',
    data: null
  });
});

export {
  createSession,
  getSessionsBySprint,
  getSession,
  updateSession,
  deleteSession,
  reorderSessions
};
