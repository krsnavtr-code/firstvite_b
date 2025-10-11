import Candidate from "../model/Candidate.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map();

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'noreply@firstvite.com',
    pass: process.env.SMTP_PASS || 'your-email-password'
  },
  tls: {
    rejectUnauthorized: false // Only for development, remove in production
  }
};

// Use EMAIL_FROM if available, otherwise fall back to SMTP user
const emailFrom = process.env.EMAIL_FROM || emailConfig.auth.user;

console.log('SMTP Config:', {
  host: emailConfig.host,
  port: emailConfig.port,
  user: emailConfig.auth.user,
  from: emailFrom
});

const transporter = nodemailer.createTransport(emailConfig);

// Verify SMTP connection
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

// @desc    Send OTP to email
// @route   POST /api/candidates/send-otp
// @access  Public
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Check if email already exists
    const existingCandidate = await Candidate.findOne({ email });
    if (existingCandidate) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
        field: 'email'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP valid for 10 minutes

    // Store OTP with email and expiration
    otpStore.set(email, {
      otp,
      expiresAt,
    });

    // Send email with OTP
    const mailOptions = {
      from: `FirstVITE <${emailFrom}>`, // Sender address with name
      to: email, // List of recipients
      subject: 'Your OTP for Email Verification', // Subject line
      text: `Your OTP for email verification is: ${otp}. This OTP is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Email Verification</h2>
          <p>Hello,</p>
          <p>Your OTP for email verification is: <strong>${otp}</strong></p>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <p>Best regards,<br>FirstVITE Team</p>
        </div>
      `
    };
    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error; // Re-throw to be caught by the outer try-catch
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to email',
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/candidates/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const otpData = otpStore.get(email);
    const now = new Date();

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired. Please request a new one.',
      });
    }

    if (now > otpData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    // Mark email as verified
    otpData.verified = true;
    otpStore.set(email, otpData);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    });
  }
};

// @desc    Create a new candidate
// @route   POST /api/candidates
// @access  Public
export const createCandidate = async (req, res) => {
  let profilePhotoPath = null;
  
  try {
    const { name, email, phone, course, college, university } = req.body;
    // Store the file path for cleanup in case of errors
    if (req.file) {
      profilePhotoPath = req.file.path;
    }
    
    // Check if email is verified
    const otpData = otpStore.get(email);
    if (!otpData || !otpData.verified) {
      // Clean up the uploaded file if it exists
      if (profilePhotoPath && fs.existsSync(profilePhotoPath)) {
        fs.unlink(profilePhotoPath, (err) => {
          if (err) console.error('Error deleting uploaded file:', err);
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Please verify your email address first.',
        field: 'email'
      });
    }

    // Clear the OTP data after successful verification and before saving to database
    otpStore.delete(email);

    // Check if email already exists in the database
    const existingCandidate = await Candidate.findOne({ email });
    if (existingCandidate) {
      // Clean up the uploaded file if it exists
      if (profilePhotoPath && fs.existsSync(profilePhotoPath)) {
        fs.unlink(profilePhotoPath, (err) => {
          if (err) console.error('Error deleting uploaded file:', err);
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'An application with this email already exists.',
        field: 'email'
      });
    }
    
    // Check if phone already exists
    const existingPhone = await Candidate.findOne({ phone });
    if (existingPhone) {
      // Clean up the uploaded file if it exists
      if (profilePhotoPath && fs.existsSync(profilePhotoPath)) {
        fs.unlink(profilePhotoPath, (err) => {
          if (err) console.error('Error deleting uploaded file:', err);
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'An application with this phone number already exists.',
        field: 'phone'
      });
    }

    let profilePhotoUrl = "";

    // Handle file upload if provided
    if (req.file) {
      // Construct the URL path to the uploaded file
      profilePhotoUrl = `/candidate_profile/${req.file.filename}`;
    }

    // Create new candidate
    const candidate = await Candidate.create({
      name,
      email,
      phone,
      course,
      college,
      university,
      profilePhoto: profilePhotoUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: candidate,
    });
  } catch (error) {
    console.error("Error creating candidate:", error);
    
    // Clean up the uploaded file if it exists
    if (profilePhotoPath && fs.existsSync(profilePhotoPath)) {
      fs.unlink(profilePhotoPath, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || "Error submitting application",
    });
  }
};

// @desc    Get all candidates (for admin)
// @route   GET /api/candidates
// @access  Private/Admin
export const getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching candidates",
    });
  }
};

// @desc    Update candidate status (for admin)
// @route   PUT /api/candidates/:id/status
// @access  Private/Admin
export const updateCandidateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true, runValidators: true }
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    console.error("Error updating candidate status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating candidate status",
    });
  }
};
