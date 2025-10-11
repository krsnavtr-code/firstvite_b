import Candidate from "../model/Candidate.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
    
    // Check if email already exists
    const existingEmail = await Candidate.findOne({ email });
    if (existingEmail) {
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
