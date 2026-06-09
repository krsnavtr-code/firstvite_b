import StudentDocument from "../model/studentDocument.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/student-documents";
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
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept common document formats
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and PDF files are allowed"), false);
    }
  },
});

// @desc    Upload student document
// @route   POST /api/student-documents/upload
// @access  Private (Student only)
export const uploadDocument = catchAsync(async (req, res, next) => {
  const { documentType } = req.body;

  if (!documentType) {
    return next(new AppError("Document type is required", 400));
  }

  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  // Check if document of this type already exists for this student
  const existingDocument = await StudentDocument.findOne({
    student: req.user.id,
    documentType,
  });

  if (existingDocument) {
    // Delete old file
    if (fs.existsSync(existingDocument.filePath)) {
      fs.unlinkSync(existingDocument.filePath);
    }
    // Delete old document record
    await StudentDocument.findByIdAndDelete(existingDocument._id);
  }

  const document = await StudentDocument.create({
    student: req.user.id,
    documentType,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    filePath: req.file.path,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });

  res.status(201).json({
    success: true,
    data: document,
  });
});

// @desc    Get all documents for a student
// @route   GET /api/student-documents
// @access  Private (Student only)
export const getStudentDocuments = catchAsync(async (req, res, next) => {
  const documents = await StudentDocument.find({
    student: req.user.id,
  }).sort({ documentType: 1 });

  res.json({
    success: true,
    data: documents,
  });
});

// @desc    Get document by ID
// @route   GET /api/student-documents/:id
// @access  Private (Student only)
export const getDocumentById = catchAsync(async (req, res, next) => {
  const document = await StudentDocument.findOne({
    _id: req.params.id,
    student: req.user.id,
  });

  if (!document) {
    return next(new AppError("Document not found", 404));
  }

  res.json({
    success: true,
    data: document,
  });
});

// @desc    Delete document
// @route   DELETE /api/student-documents/:id
// @access  Private (Student only)
export const deleteDocument = catchAsync(async (req, res, next) => {
  const document = await StudentDocument.findOne({
    _id: req.params.id,
    student: req.user.id,
  });

  if (!document) {
    return next(new AppError("Document not found", 404));
  }

  // Delete file from filesystem
  if (fs.existsSync(document.filePath)) {
    fs.unlinkSync(document.filePath);
  }

  await StudentDocument.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Document deleted successfully",
  });
});

// @desc    Get all student documents (Admin only)
// @route   GET /api/student-documents/admin/all
// @access  Private (Admin only)
export const getAllStudentDocuments = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { status, documentType } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (documentType) filter.documentType = documentType;

  const documents = await StudentDocument.find(filter)
    .populate("student", "fullname email phone")
    .populate("verifiedBy", "fullname email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await StudentDocument.countDocuments(filter);

  res.json({
    success: true,
    data: documents,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Verify/Reject document (Admin only)
// @route   PATCH /api/student-documents/admin/:id/verify
// @access  Private (Admin only)
export const verifyDocument = catchAsync(async (req, res, next) => {
  const { status, rejectionReason } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  if (status === "rejected" && !rejectionReason) {
    return next(new AppError("Rejection reason is required", 400));
  }

  const document = await StudentDocument.findById(req.params.id);

  if (!document) {
    return next(new AppError("Document not found", 404));
  }

  document.status = status;
  document.rejectionReason = rejectionReason || null;
  document.verifiedAt = new Date();
  document.verifiedBy = req.user.id;

  await document.save();

  res.json({
    success: true,
    data: document,
  });
});

export const uploadMiddleware = upload.single("document");
