import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.js';
import { sendProposalEmails } from '../controller/adminEmailController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only specific file types
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
    cb(new Error('Invalid file type. Only PDF, Word, Excel, text, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: fileFilter
});

// Middleware to handle multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum file size is 10MB.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: err.message || 'Error uploading files.'
    });
  } else if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message || 'Error processing your request.'
    });
  }
  next();
};

// Protect all routes and restrict to admin users
router.use(protect);
router.use(authorize('admin'));

// Send proposal emails with file uploads
router.post('/send-proposal', 
  // First handle the file upload
  (req, res, next) => {
    upload.array('attachments', 5)(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return handleMulterErrors(err, req, res, next);
      }
      
      // Ensure files are properly attached to the request
      if (req.files && req.files.length > 0) {
        // Make sure buffer is available for each file
        req.files = req.files.map(file => {
          if (!file.buffer && file._readableState) {
            // If buffer is missing but we have a stream, convert it to buffer
            const chunks = [];
            return new Promise((resolve) => {
              file.on('data', chunk => chunks.push(chunk));
              file.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                  ...file,
                  buffer,
                  size: buffer.length
                });
              });
            });
          }
          return file;
        });
        
        // If any files are promises, wait for them to resolve
        Promise.all(req.files).then(files => {
          req.files = files;
          next();
        }).catch(next);
      } else {
        next();
      }
    });
  },
  sendProposalEmails
);

export default router;
