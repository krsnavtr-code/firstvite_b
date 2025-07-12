import express from 'express';
import { handleFileUpload } from '../utils/fileUpload.js';
import { protect } from '../middleware/authMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import fsSync from 'fs';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        // Create uploads directory if it doesn't exist
        if (!fsSync.existsSync(uploadsDir)) {
            fsSync.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename with timestamp and original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer for image uploads
const imageUpload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for images
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'));
        }
    }
});

// Configure multer for video uploads
const videoUpload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit for videos
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/x-matroska'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only videos are allowed (MP4, WebM, QuickTime, MKV).'));
        }
    }
});

// Video upload endpoint
router.post('/video', protect, (req, res, next) => {
    videoUpload.single('file')(req, res, async (err) => {
        try {
            // Handle multer errors (e.g., file size, file type)
            if (err) {
                console.error('Multer error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        success: false,
                        message: 'File too large. Maximum size is 500MB.'
                    });
                }
                if (err.message.includes('Invalid file type')) {
                    return res.status(415).json({
                        success: false,
                        message: 'Invalid file type. Only MP4, WebM, and QuickTime videos are allowed.'
                    });
                }
                throw err;
            }

            if (!req.file) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No video file received' 
                });
            }

            // Verify file exists
            try {
                await fs.access(req.file.path);
            } catch (err) {
                console.error('Uploaded file not found:', req.file.path);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to process uploaded file'
                });
            }

            const fileSizeInMB = (req.file.size / (1024 * 1024)).toFixed(2);
            console.log(`Video uploaded: ${req.file.filename} (${fileSizeInMB}MB)`);
            
            // Return success response with file details
            res.status(200).json({
                success: true,
                message: 'Video uploaded successfully',
                data: {
                    name: req.file.filename,
                    originalName: req.file.originalname,
                    path: `/uploads/${req.file.filename}`,
                    url: `/api/upload/file/${encodeURIComponent(req.file.filename)}`,
                    size: req.file.size,
                    sizeMB: fileSizeInMB,
                    mimetype: req.file.mimetype,
                    type: 'video',
                    uploadedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error uploading video:', error);
            
            // Clean up the uploaded file if there was an error
            if (req.file && req.file.path) {
                try {
                    await fs.unlink(req.file.path);
                } catch (unlinkErr) {
                    console.error('Failed to clean up uploaded file:', unlinkErr);
                }
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to upload video',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    });
});

// Test endpoint to check if upload route is working
router.get('/test', (req, res) => {
    console.log('Test endpoint hit!');
    try {
        const publicPath = path.join(process.cwd(), 'public');
        const uploadsPath = path.join(publicPath, 'uploads');
        
        // Check if directories exist
        const publicExists = fsSync.existsSync(publicPath);
        const uploadsExists = fsSync.existsSync(uploadsPath);
        
        // List files in the uploads directory
        let files = [];
        if (uploadsExists) {
            files = fsSync.readdirSync(uploadsPath);
        }
        
        res.json({
            success: true,
            message: 'Upload route is working!',
            timestamp: new Date().toISOString(),
            paths: {
                currentWorkingDir: process.cwd(),
                publicDir: publicPath,
                uploadsDir: uploadsPath,
                publicExists,
                uploadsExists
            },
            filesInUploads: files,
            nodeEnv: process.env.NODE_ENV,
            allowedOrigins: process.env.ALLOWED_ORIGINS
        });
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking directories',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Serve an image file
// @route   GET /file/:filename
// @access  Public
router.get('/file/:filename', async (req, res) => {
    try {
        let { filename } = req.params;
        console.log('Request for file:', filename);
        
        // Decode URI component to handle special characters
        filename = decodeURIComponent(filename);
        
        // Prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            console.error('Invalid filename (possible directory traversal):', filename);
            return res.status(400).json({
                success: false,
                message: 'Invalid filename'
            });
        }
        
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        const filePath = path.join(uploadsDir, filename);
        
        console.log('Looking for file at path:', filePath);
        
        // Check if file exists
        try {
            await fs.access(filePath);
            console.log('File found, sending:', filePath);
            
            // Set appropriate content type based on file extension
            const ext = path.extname(filename).toLowerCase().substring(1);
            const mimeTypes = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml'
            };
            
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            
            res.sendFile(filePath, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000',
                    'X-Content-Type-Options': 'nosniff'
                }
            }, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: 'Error sending file',
                            error: err.message
                        });
                    }
                }
            });
        } catch (err) {
            res.status(404).json({
                success: false,
                message: 'File not found',
                path: filePath
            });
        }
    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({
            success: false,
            message: 'Error serving file',
            error: error.message
        });
    }
});

// @desc    Get all uploaded media files (images and videos)
// @route   GET /files
// @access  Private
router.get('/files', protect, async (req, res) => {
    try {
        console.log('Fetching list of uploaded media files');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        const files = await fs.readdir(uploadsDir);
        
        const mediaFiles = await Promise.all(files.map(async (file) => {
            try {
                if (file === '.gitkeep') return null;
                
                const filePath = path.join(uploadsDir, file);
                const stats = await fs.stat(filePath);
                const fileUrl = `/api/upload/file/${encodeURIComponent(file)}`;
                const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;
                
                // Determine file type
                const isVideo = ['.mp4', '.webm', '.mov', '.mkv'].some(ext => 
                    file.toLowerCase().endsWith(ext)
                );
                
                return {
                    name: file,
                    url: fullUrl,
                    path: fileUrl,
                    size: stats.size,
                    uploadedAt: stats.birthtime,
                    mimetype: getMimeType(file),
                    type: isVideo ? 'video' : 'image'
                };
            } catch (err) {
                console.error(`Error processing file ${file}:`, err);
                return null;
            }
        }));
        
        // Filter out any null values from failed file processing
        const validFiles = mediaFiles.filter(file => file !== null);
        
        // Sort by upload date (newest first)
        validFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        console.log(`Found ${validFiles.length} valid media files`);
        
        res.json({
            success: true,
            count: validFiles.length,
            data: validFiles
        });
    } catch (error) {
        console.error('Error getting images:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting images',
            error: error.message
        });
    }
});

// Upload video file
router.post('/video', protect, videoUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No video file uploaded or invalid file type'
            });
        }

        // Construct URLs
        const filePath = path.join('uploads', req.file.filename);
        const fileUrl = `/api/upload/file/${encodeURIComponent(req.file.filename)}`;
        const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;

        console.log('Video uploaded successfully:', {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: filePath,
            url: fullUrl
        });

        res.status(201).json({
            success: true,
            data: {
                name: req.file.filename,
                path: fileUrl,
                url: fullUrl,
                size: req.file.size,
                mimetype: req.file.mimetype,
                type: 'video',
                uploadedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading video',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get all uploaded files (images and videos)
router.get('/files', protect, async (req, res) => {
    try {
        console.log('Fetching list of uploaded files');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        const files = await fs.readdir(uploadsDir);
        
        const filesList = await Promise.all(files.map(async (file) => {
            try {
                const filePath = path.join(uploadsDir, file);
                const stats = await fs.stat(filePath);
                const fileUrl = `/api/upload/file/${encodeURIComponent(file)}`;
                const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;
                
                return {
                    name: file,
                    url: fullUrl,
                    path: fileUrl,
                    size: stats.size,
                    uploadedAt: stats.birthtime,
                    mimetype: getMimeType(file)
                };
            } catch (err) {
                console.error(`Error processing file ${file}:`, err);
                return null;
            }
        }));
        
        // Filter out any null values from failed file processing
        const validFiles = filesList.filter(file => file !== null);
        
        console.log(`Found ${validFiles.length} valid files`);
        
        res.json({
            success: true,
            count: validFiles.length,
            data: validFiles
        });
    } catch (error) {
        console.error('Error getting files:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting files',
            error: error.message
        });
    }
});

// @desc    Upload a file
// @route   POST /
// @access  Private
router.post('/image', protect, imageUpload.single('file'), async (req, res) => {
    try {
        console.log('Upload request received:', req.file);
        
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Construct URLs
        const filePath = path.join('uploads', req.file.filename);
        const fileUrl = `/api/upload/file/${encodeURIComponent(req.file.filename)}`;
        const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;

        console.log('File uploaded successfully:', {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: filePath,
            url: fullUrl
        });

        res.status(201).json({
            success: true,
            data: {
                name: req.file.filename,
                path: fileUrl,
                url: fullUrl,
                size: req.file.size,
                mimetype: req.file.mimetype,
                uploadedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading file',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Add OPTIONS handler for CORS preflight
router.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(200).send();
});

// Helper function to get MIME type from filename
function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase().substring(1);
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'zip': 'application/zip',
        'txt': 'text/plain',
        'json': 'application/json'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}

export default router;
