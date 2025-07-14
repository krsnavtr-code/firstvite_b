import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';


// Import routes
import bookRoute from "./route/book.route.js";
import authRoute from "./route/auth.route.js";
import userRoute from "./route/user.route.js";
import profileRoute from "./route/profile.route.js";
import cartRoute from "./route/cart.route.js";
import categoryRoute from "./route/category.route.js";
import courseRoute from "./route/course.route.js";
import contactRoute from "./route/contactRoutes.js";
import enrollmentRoute from "./routes/enrollmentRoutes.js";
import faqRoute from "./route/faq.route.js";
import uploadRoute from "./route/uploadRoute.js";
import authRoutes from "./route/authRoutes.js";
import adminRoutes from "./route/adminRoutes.js";

// Initialize express app
const app = express();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configure express to handle larger payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Increase the HTTP request timeout to 5 minutes (300000ms)
app.timeout = 300000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://firstvite.com',
  'https://www.firstvite.com'
];

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // In development or if no origin, allow all
        if (process.env.NODE_ENV !== 'production' || !origin) {
            return callback(null, true);
        }
        
        // Check if the origin is in the allowed list
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'https://firstvite.com',
            'https://www.firstvite.com',
            'https://firstvite.vercel.app',
            'https://www.firstvite.vercel.app'
        ];
        
        if (allowedOrigins.includes(origin) || 
            origin.endsWith('.firstvite.com') || 
            origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        
        console.warn('CORS blocked request from origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization',
        'x-auth-token', 
        'x-user-agent', 
        'x-client-ip'
    ],
    exposedHeaders: [
        'Content-Length', 
        'Content-Type',
        'Authorization'
    ]
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up public directory for static files
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
import fs from 'fs';

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
} else {
    console.log('Uploads directory exists at:', uploadsDir);
    // List files in the uploads directory for debugging
    // fs.readdir(uploadsDir, (err, files) => {
    //     if (err) {
    //         console.error('Error reading uploads directory:', err);
    //     } else {
    //         console.log('Files in uploads directory:', files);
    //     }
    // });
}

// Debug: Log the current working directory and paths
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Public directory path:', path.join(__dirname, 'public'));
console.log('Uploads directory path:', uploadsDir);

// List all files in the public directory
const listPublicFiles = (dir) => {
    try {
        const files = fs.readdirSync(dir);
        console.log(`Files in ${dir}:`, files);
        return files;
    } catch (err) {
        console.error(`Error reading directory ${dir}:`, err);
        return [];
    }
};

listPublicFiles(publicDir);
listPublicFiles(uploadsDir);

// Serve static files from the public directory
app.use(express.static(publicDir, {
    setHeaders: (res, path) => {
        console.log('Serving static file:', path);
    }
}));

// Serve uploads with specific headers
app.use('/uploads', (req, res, next) => {
    console.log('Request for upload file:', req.path);
    next();
}, express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    console.log('Serving file:', filePath);
    const ext = path.extname(filePath).toLowerCase().substring(1);
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    if (mimeTypes[ext]) {
      res.set('Content-Type', mimeTypes[ext]);
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Test route to check file serving
app.get('/test-upload/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`Serving test file: ${filePath}`);
    res.sendFile(filePath);
  } else {
    console.error(`File not found: ${filePath}`);
    res.status(404).json({
      success: false,
      message: 'File not found',
      path: filePath,
      files: fs.readdirSync(uploadsDir)
    });
  }
});

console.log('Serving static files from:', publicDir);
console.log('Uploads directory at:', uploadsDir);

// Database connection
const PORT = process.env.PORT || 4002;
const URI = process.env.MongoDBURI;

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        console.log('Connection string:', URI ? 'Provided' : 'Missing');
        
        await mongoose.connect(URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        
        console.log("✅ Successfully connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        if (error.name === 'MongoServerError') {
            console.error('MongoDB Server Error:', error.message);
        } else if (error.name === 'MongooseServerSelectionError') {
            console.error('Could not connect to MongoDB. Is it running?');
        }
        process.exit(1);
    }
};

// Connect to the database
connectDB();

// Log database connection status
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);});

// Routes - Specific routes first
console.log('Mounting upload route at /api/upload');
app.use('/api/upload', uploadRoute); // File upload routes

// Debug route to test if the server is running
app.get('/api/ping', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        paths: {
            currentWorkingDir: process.cwd(),
            publicDir: publicDir,
            uploadsDir: uploadsDir
        }
    });
});

// API Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);

// Authentication routes
app.use("/api/auth", authRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Other routes
app.use("/api/profile", profileRoute);
app.use("/api/books", bookRoute);
app.use("/api/cart", cartRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/courses", courseRoute);
app.use("/api/contact", contactRoute);
app.use("/api/enrollments", enrollmentRoute);
app.use("/api/faqs", faqRoute);
app.use("/api/upload", uploadRoute);

// Log all routes for debugging
const printRoutes = (routes, parentPath = '') => {
  routes.forEach(route => {
    if (route.route) {
      const methods = Object.keys(route.route.methods).join(',').toUpperCase();
      console.log(`${methods.padEnd(6)} ${parentPath}${route.route.path}`);
    } else if (route.name === 'router') {
      // This is a router instance
      const routerPath = route.regexp?.toString().replace(/^\/\^|\$\//g, '').replace('\/?', '') || '';
      if (route.handle?.stack) {
        printRoutes(route.handle.stack, `${parentPath}${routerPath}/`);
      }
    }
  });
};

console.log('\nRegistered Routes:');
printRoutes(app._router.stack);

// API Routes
app.use("/api/auth", authRoute);  // Mount auth routes
app.use("/api/books", bookRoute);
app.use("/api/cart", cartRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/courses", courseRoute);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Start the server
const server = app.listen(PORT, () => {
    
    console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err);
    server.close(() => {
        process.exit(1);
    });
});

export default app;