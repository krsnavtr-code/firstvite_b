import EmailHistory from "../model/emailHistory.model.js";
import { sendEmail } from "../utils/email.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/emails";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept all file types
    cb(null, true);
  },
});

// @desc    Send custom email with attachments
// @route   POST /api/email/send
// @access  Private (Admin only)
export const sendCustomEmail = catchAsync(async (req, res, next) => {
  const { recipients, subject, body } = req.body;

  if (!recipients || !subject || !body) {
    return next(new AppError("Recipients, subject, and body are required", 400));
  }

  // Parse recipients (can be comma-separated or array)
  const recipientList = Array.isArray(recipients)
    ? recipients
    : recipients.split(",").map((r) => r.trim());

  // Process attachments
  const attachments = req.files
    ? req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      }))
    : [];

  // Create email history record
  const emailHistory = await EmailHistory.create({
    sender: req.user.id,
    recipients: recipientList,
    subject,
    body,
    attachments,
    status: "pending",
  });

  try {
    // Prepare attachments for email
    const emailAttachments = attachments.map((att) => ({
      filename: att.originalName,
      path: att.path,
    }));

    // Send email to each recipient
    for (const recipient of recipientList) {
      await sendEmail({
        to: recipient,
        subject,
        html: body,
        attachments: emailAttachments,
      });
    }

    // Update status to sent
    emailHistory.status = "sent";
    emailHistory.sentAt = Date.now();
    await emailHistory.save();

    res.json({
      success: true,
      message: `Email sent successfully to ${recipientList.length} recipient(s)`,
      data: emailHistory,
    });
  } catch (error) {
    console.error("Email sending error:", error);
    emailHistory.status = "failed";
    emailHistory.error = error.message;
    await emailHistory.save();

    return next(new AppError("Failed to send email. Please try again.", 500));
  }
});

// @desc    Get email history
// @route   GET /api/email/history
// @access  Private (Admin only)
export const getEmailHistory = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const emailHistory = await EmailHistory.find()
    .populate("sender", "fullname email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await EmailHistory.countDocuments();

  res.json({
    success: true,
    data: emailHistory,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single email history
// @route   GET /api/email/history/:id
// @access  Private (Admin only)
export const getEmailById = catchAsync(async (req, res, next) => {
  const emailHistory = await EmailHistory.findById(req.params.id).populate(
    "sender",
    "fullname email"
  );

  if (!emailHistory) {
    return next(new AppError("Email history not found", 404));
  }

  res.json({
    success: true,
    data: emailHistory,
  });
});

// @desc    Delete email history
// @route   DELETE /api/email/history/:id
// @access  Private (Admin only)
export const deleteEmailHistory = catchAsync(async (req, res, next) => {
  const emailHistory = await EmailHistory.findById(req.params.id);

  if (!emailHistory) {
    return next(new AppError("Email history not found", 404));
  }

  // Delete attachment files
  if (emailHistory.attachments && emailHistory.attachments.length > 0) {
    emailHistory.attachments.forEach((att) => {
      if (att.path && fs.existsSync(att.path)) {
        fs.unlinkSync(att.path);
      }
    });
  }

  await EmailHistory.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Email history deleted successfully",
  });
});

export const uploadMiddleware = upload.array("attachments", 5); // Max 5 files
