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

// Initialize express app
const app = express();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174'
];

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if the origin is in the allowed list
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
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

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public/uploads');
import fs from 'fs';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
} else {
    console.log('Uploads directory exists at:', uploadsDir);
    // List files in the uploads directory for debugging
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            console.error('Error reading uploads directory:', err);
        } else {
            console.log('Files in uploads directory:', files);
        }
    });
}

// Serve static files with proper MIME types and headers
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    console.log('Serving file:', path); // Debug log
    const ext = path.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    if (mimeTypes[ext]) {
      res.set('Content-Type', mimeTypes[ext]);
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    }
  }
}));

// Add a test route to check file serving
app.get('/test-upload/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`Serving test file: ${filePath}`);
    res.sendFile(filePath);
  } else {
    console.error(`File not found: ${filePath}`);
    res.status(404).send('File not found');
  }
});

console.log('Serving static files from:', uploadsDir);

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

// Routes
app.use("/api/auth", authRoute); // Authentication routes (login, signup)
app.use("/api/users", userRoute); // User management routes (admin only)
app.use("/api/profile", profileRoute); // User profile routes (any authenticated user)
app.use("/api/books", bookRoute);
app.use("/api/cart", cartRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/courses", courseRoute);
app.use("/api/contacts", contactRoute);
app.use("/api/enrollments", enrollmentRoute);
app.use("/api", faqRoute); // FAQ routes

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