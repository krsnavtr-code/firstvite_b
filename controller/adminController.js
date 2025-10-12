import User from '../model/User.js';
import Candidate from '../model/Candidate.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';

// Get all pending users (not approved yet)
export const getPendingUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ isApproved: false }).select('-password');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

// Approve a user
export const approveUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// Reject a user (delete)
export const rejectUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get all users
export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('-password');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

// Get all candidates with filtering and pagination
export const getAllCandidates = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Candidate.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const candidates = await features.query;
  const total = await Candidate.countDocuments(features.filteredQuery);

  res.status(200).json({
    status: 'success',
    results: candidates.length,
    total,
    data: {
      candidates
    }
  });
});

// Get a single candidate by ID
export const getCandidate = catchAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id);
  
  if (!candidate) {
    return next(new AppError('No candidate found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      candidate
    }
  });
});

// Update candidate status
export const updateCandidateStatus = catchAsync(async (req, res, next) => {
  const { status, notes } = req.body;
  
  const candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    { status, notes },
    { new: true, runValidators: true }
  );

  if (!candidate) {
    return next(new AppError('No candidate found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      candidate
    }
  });
});
