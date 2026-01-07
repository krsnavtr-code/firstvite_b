import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

// Configure storage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'public', 'proposal_documents');
        if (!fs.existsSync(uploadDir)) {
            await mkdirAsync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const baseName = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9.-]/g, '_');

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    }
});


// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only PDF, Word, Excel, text, and image files are allowed.', 400), false);
  }
};

// Initialize multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
});

export const uploadDocuments = upload.array('documents', 5); // Max 5 files

// Handle document upload
/**
 * @desc    Upload proposal documents
 * @route   POST /api/v1/admin/upload-proposal-documents
 * @access  Private/Admin
 */
export const uploadProposalDocuments = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No files were uploaded.', 400));
  }

  // Process uploaded files
  const files = req.files.map(file => ({
    originalname: file.originalname,
    filename: file.filename,
    path: file.path,
    url: `/proposal_documents/${file.filename}`,
    size: file.size,
    mimetype: file.mimetype,
  }));

  res.status(200).json({
    status: 'success',
    message: 'Files uploaded successfully',
    files,
  });
});

/**
 * @desc    Delete a proposal document
 * @route   DELETE /api/v1/admin/delete-proposal-document
 * @access  Private/Admin
 */
export const deleteProposalDocument = catchAsync(async (req, res, next) => {
  const { filePath } = req.body;

  if (!filePath) {
    return next(new AppError('File path is required', 400));
  }

  // Ensure the file path is within the allowed directory
  const fullPath = path.join(process.cwd(), 'public', filePath);
  const normalizedPath = path.normalize(fullPath);
  const allowedDir = path.join(process.cwd(), 'public', 'proposal_documents');

  // Prevent directory traversal
  if (!normalizedPath.startsWith(allowedDir)) {
    return next(new AppError('Access to the specified file is not allowed', 403));
  }

  try {
    await unlinkAsync(normalizedPath);
    
    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully',
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return next(new AppError('File not found', 404));
    }
    return next(new AppError('Error deleting file', 500));
  }
});
