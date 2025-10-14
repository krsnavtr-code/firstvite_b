import EmailRecord from '../model/EmailRecord.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * @desc    Save email record to database
 * @route   POST /api/emails/save-email-record
 * @access  Private/Admin
 */
export const saveEmailRecord = catchAsync(async (req, res, next) => {
  const {
    to,
    subject,
    message,
    studentName = '',
    courseName = '',
    templateUsed = 'custom',
    attachments = [],
    status = 'sent',
    error = null
  } = req.body;

  const emailRecord = await EmailRecord.create({
    to,
    subject,
    message,
    studentName,
    courseName,
    templateUsed,
    attachments,
    status,
    error,
    sentBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: {
      emailRecord
    }
  });
});

/**
 * @desc    Get all email records
 * @route   GET /api/emails
 * @access  Private/Admin
 */
export const getAllEmailRecords = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};
  
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  if (req.query.to) {
    query.to = { $regex: req.query.to, $options: 'i' };
  }
  
  if (req.query.courseName) {
    query.courseName = { $regex: req.query.courseName, $options: 'i' };
  }

  const [records, total] = await Promise.all([
    EmailRecord.find(query)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sentBy', 'name email'),
    EmailRecord.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    status: 'success',
    results: records.length,
    total,
    totalPages,
    currentPage: page,
    data: {
      records
    }
  });
});

/**
 * @desc    Get email record by ID
 * @route   GET /api/emails/:id
 * @access  Private/Admin
 */
export const getEmailRecord = catchAsync(async (req, res, next) => {
  const emailRecord = await EmailRecord.findById(req.params.id)
    .populate('sentBy', 'name email');

  if (!emailRecord) {
    return next(new AppError('No email record found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      emailRecord
    }
  });
});
