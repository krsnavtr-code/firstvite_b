import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const filetypes = /\.(jpg|jpeg|png|webp|gif)$/i;
    const mimetypes = /^image\//;
    
    const isExtValid = filetypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeValid = mimetypes.test(file.mimetype);
    
    if (isExtValid && isMimeValid) {
        return cb(null, true);
    } else {
        const error = new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed!');
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
    }
};

// Initialize multer with configuration
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    },
    fileFilter: fileFilter
});

// Middleware for handling single file upload
const uploadImage = upload.single('image');

// Handle file upload
const handleFileUpload = (req, res, next) => {
    console.log('File upload request received');
    
    uploadImage(req, res, function (err) {
        if (err) {
            console.error('File upload error:', err);
            
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'File size too large. Maximum size is 5MB.' 
                });
            }
            
            if (err.code === 'INVALID_FILE_TYPE') {
                return res.status(400).json({ 
                    success: false, 
                    message: err.message || 'Invalid file type. Only images are allowed.'
                });
            }
            
            return res.status(400).json({ 
                success: false, 
                message: err.message || 'Error uploading file',
                code: err.code
            });
        }
        
        if (!req.file) {
            console.log('No file was uploaded');
            return res.status(400).json({
                success: false,
                message: 'No file was uploaded'
            });
        }
        
        console.log('File uploaded successfully:', req.file);
        next();
    });
};

export { handleFileUpload };
