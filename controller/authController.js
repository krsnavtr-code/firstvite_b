import jwt from 'jsonwebtoken';
import User from '../model/User.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = catchAsync(async (req, res, next) => {
  const { fullname, email, password, role, department, phone } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    return next(new AppError('User already exists', 400));
  }

  // Create user (initially not approved)
  const user = await User.create({
    fullname,
    email,
    password,
    role: role || 'student',
    department,
    phone,
    isApproved: false // New users need admin approval
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      message: 'Registration successful. Please wait for admin approval.'
    });
  } else {
    return next(new AppError('Invalid user data', 400));
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if user is approved
  if (!user.isApproved) {
    return next(new AppError('Your account is pending approval from the administrator', 401));
  }

  // Check password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  res.json({
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    role: user.role,
    isApproved: user.isApproved,
    token: generateToken(user._id),
  });
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');

  if (user) {
    res.json(user);
  } else {
    return next(new AppError('User not found', 404));
  }
});
