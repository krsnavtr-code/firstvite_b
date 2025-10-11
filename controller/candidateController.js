import Candidate from "../model/Candidate.js";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import generateIdCard from "../utils/idCardGenerator.js";
import dotenv from "dotenv";
import crypto from "crypto";
import { fileURLToPath } from 'url';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../../uploads");
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
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER || "noreply@firstvite.com",
        pass: process.env.SMTP_PASS || "your-email-password",
    },
    tls: {
        rejectUnauthorized: false, // Only for development, remove in production
    },
};

// Use EMAIL_FROM if available, otherwise fall back to SMTP user
const emailFrom = process.env.EMAIL_FROM || emailConfig.auth.user;

console.log("SMTP Config:", {
    host: emailConfig.host,
    port: emailConfig.port,
    user: emailConfig.auth.user,
    from: emailFrom,
});

const transporter = nodemailer.createTransport(emailConfig);

// Verify SMTP connection
transporter.verify(function (error, success) {
    if (error) {
        console.error("SMTP Connection Error:", error);
    } else {
        console.log("SMTP Server is ready to take our messages");
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
                message: "Email is required",
            });
        }

        // Check if email already exists
        const existingCandidate = await Candidate.findOne({ email });
        if (existingCandidate) {
            return res.status(400).json({
                success: false,
                message: "Email already registered",
                field: "email",
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
            subject: "Your OTP for Email Verification", // Subject line
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
      `,
        };
        console.log("Sending email with options:", {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
        });

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent:", info.messageId);
        } catch (error) {
            console.error("Error sending email:", error);
            throw error; // Re-throw to be caught by the outer try-catch
        }

        res.status(200).json({
            success: true,
            message: "OTP sent to email",
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send OTP. Please try again.",
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
                message: "Email and OTP are required",
            });
        }

        const otpData = otpStore.get(email);
        const now = new Date();

        if (!otpData) {
            return res.status(400).json({
                success: false,
                message: "OTP not found or expired. Please request a new one.",
            });
        }

        if (now > otpData.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one.",
            });
        }

        if (otpData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again.",
            });
        }

        // Mark email as verified
        otpData.verified = true;
        otpStore.set(email, otpData);

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify OTP. Please try again.",
        });
    }
};

// @desc    Create a new candidate
// @route   POST /api/candidates
// @access  Public
dotenv.config();
export const createCandidate = async (req, res) => {
    let profilePhotoPath = null;

    // Default values for email template
    const companyName = 'FirstVite E-Learning Pvt.Ltd';
    const eventName = 'Career Hiring Camp 2025';
    const eventDate = 'November 9, 2025 - Sunday';
    const eventTime = '9:00 AM - 5:00 PM';
    const venue = 'Mosaic Hotel Noida - C-1, C Block, Pocket C, Sector 18';
    const city = 'Noida, Uttar Pradesh 201301';
    const mapLink = 'https://maps.app.goo.gl/PjBJ8U51Kn1as9Aq6';
    const supportEmail = 'info@firstvite.com';
    const supportPhone = '9990056799';
    const website = 'https://firstvite.com';
    const yourName = 'FirstVITE E-Learning';

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
                    if (err) console.error("Error deleting uploaded file:", err);
                });
            }

            return res.status(400).json({
                success: false,
                message: "Please verify your email address first.",
                field: "email",
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
                    if (err) console.error("Error deleting uploaded file:", err);
                });
            }

            return res.status(400).json({
                success: false,
                message: "An application with this email already exists.",
                field: "email",
            });
        }

        // Check if phone already exists
        const existingPhone = await Candidate.findOne({ phone });
        if (existingPhone) {
            // Clean up the uploaded file if it exists
            if (profilePhotoPath && fs.existsSync(profilePhotoPath)) {
                fs.unlink(profilePhotoPath, (err) => {
                    if (err) console.error("Error deleting uploaded file:", err);
                });
            }

            return res.status(400).json({
                success: false,
                message: "An application with this phone number already exists.",
                field: "phone",
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

        // Send welcome email
        const welcomeMailOptions = {
            from: `FirstVITE <${emailFrom}>`,
            to: email,
            subject: `Registration Confirmed — Career Hiring Camp 2025`,
            html: `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fb; padding: 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 6px 18px rgba(32,33,36,0.08);">
      <tr>
        <td style="padding:20px 24px; text-align:left; background: linear-gradient(90deg,#4f46e5 0%, #6366f1 100%); color:#fff;">
          <h1 style="margin:0; font-size:20px; line-height:1.2;">Welcome, ${name}!</h1>
          <p style="margin:6px 0 0; font-size:14px; opacity:0.95;">Your registration for <strong>${eventName 
                }</strong> is confirmed.</p>
        </td>
      </tr>

      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px; font-size:15px; color:#111827;">
            Thank you for registering for <strong>${eventName 
                }</strong>, organized by <strong>FirstVITE</strong> in collaboration with our partner companies. We’re excited to have you — this event will connect you directly with recruiters, provide skill sessions, and create real job & internship opportunities.
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin-top:12px;">
            <tr>
              <td style="vertical-align:top; padding:8px 0;">
                <p style="margin:0; font-weight:600; color:#374151;">📍 Event</p>
                <p style="margin:6px 0 0; color:#4b5563;">
                  <strong>${eventName }</strong><br>
                  <span style="display:block; margin-top:6px;"><strong>Date:</strong> ${eventDate }
                </span>
                  <span style="display:block;"><strong>Time:</strong> ${eventTime }
                </span>
                  <span style="display:block;"><strong>Venue:</strong> ${venue }
                </span>
                  <span style="display:block;"><strong>City:</strong> ${city }
                </span>
                </p>
              </td>
            </tr>
          </table>

          <div style="margin:18px 0;">
            <a href="${mapLink }" style="display:inline-block; text-decoration:none; padding:10px 16px; border-radius:8px; background:#4f46e5; color:#ffffff; font-weight:600; font-size:14px;">
              View Location / Google Maps
            </a>
          </div>

          <hr style="border:none; border-top:1px solid #eef2ff; margin:18px 0;">

          <p style="margin:0 0 8px; font-weight:600; color:#374151;">💼 What to Expect</p>
          <ul style="margin:8px 0 0 18px; color:#4b5563; padding:0;">
            <li>On-the-spot interviews & hiring opportunities</li>
            <li>Free career and skill-development sessions</li>
            <li>Interaction with top industry recruiters</li>
            <li>Participation certificate for all attendees</li>
          </ul>

          <p style="margin:14px 0 8px; font-weight:600; color:#374151;">📋 What to Bring</p>
          <ul style="margin:8px 0 0 18px; color:#4b5563; padding:0;">
            <li>Updated Resume</li>
            <li>College ID Card / Valid Photo ID</li>
            <li>FristVITE Provided Invitation (Find Atteched in this Email)</li>
            <li>Passport-size photograph (optional)</li>
          </ul>

          <p style="margin:18px 0 0; color:#374151; font-weight:600;">🌐 Stay Connected</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:10px;">
            <tr>
              <td style="padding-right:18px; vertical-align:top;">
                <p style="margin:0; font-size:13px; color:#6b7280;"><strong>Email</strong></p>
                <p style="margin:4px 0 0; font-size:14px; color:#111827;">${supportEmail
                }</p>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0; font-size:13px; color:#6b7280;"><strong>Phone / WhatsApp</strong></p>
                <p style="margin:4px 0 0; font-size:14px; color:#111827;">${supportPhone
                }</p>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0; font-size:13px; color:#6b7280;"><strong>Website</strong></p>
                <p style="margin:4px 0 0; font-size:14px; color:#111827;">${website
                }</p>
              </td>
            </tr>
          </table>

          <p style="margin:18px 0 0; color:#6b7280; font-size:13px;">
            We look forward to meeting you at the event and helping you take the next step in your career!
          </p>
        </td>
      </tr>

      <tr>
        <td style="background:#f9fafb; padding:14px 24px; text-align:center; color:#6b7280; font-size:13px;">
          <div style="max-width:520px; margin:0 auto;">
            <p style="margin:0 0 8px;">Need to update your registration? Reply to this email or contact us at ${supportEmail }.</p>
            <p style="margin:0;">© ${new Date().getFullYear()} ${companyName }. All rights reserved.</p>
          </div>
        </td>
      </tr>
    </table>
  </div>
  `,
            text: `Welcome to ${companyName }, ${name}!

Thank you for registering for ${eventName }.

Event Details:
- Date: ${eventDate }
- Time: ${eventTime }
- Venue: ${venue }
- City: ${city }

What to Expect:
- On-the-spot interviews & hiring opportunities
- Free career & skill development sessions
- Interaction with industry recruiters
- Participation certificate for all attendees

Please bring:
- Updated Resume
- College ID / Valid Photo ID
- Passport-size photograph (optional)

For questions contact: ${supportEmail } | ${supportPhone }

Warm regards,
${yourName }
${companyName }
`,
        };

        // Read profile photo if it exists
        let profilePhotoData = null;
        if (req.file) {
            try {
                const fileData = fs.readFileSync(req.file.path);
                const mimeType = req.file.mimetype || 'image/jpeg';
                profilePhotoData = {
                    data: fileData,
                    mimeType: mimeType,
                    base64: fileData.toString('base64')
                };
            } catch (err) {
                console.error('Error reading profile photo:', err);
            }
        }

        // Generate ID card with profile photo
        const idCard = await generateIdCard({
            ...candidate.toObject(),
            profilePhoto: profilePhotoData
        }, {
            eventName,
            eventDate,
            venue,
            city,
            qrCodeUrl: `https://firstvite.com/verify/${candidate._id}`,
            logoUrl: 'https://firstvite.com/logo.png'
        });

        // Add ID card as PDF attachment
        welcomeMailOptions.attachments = [{
            filename: idCard.fileName,
            path: idCard.filePath,
            contentType: 'application/pdf'
        }];

        // Add ID card download link in email body
        const idCardSection = `
            <div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #1e40af;">📌 Your Event ID Card</h3>
                <p style="margin: 0 0 10px 0; color: #1e3a8a;">
                    Your personalized event ID card is attached to this email. Please download and carry a printed copy to the event for verification.
                </p>
                <p style="margin: 0; font-size: 13px; color: #3b82f6;">
                    <strong>ID Number:</strong> ${idCard.registrationId}
                </p>
            </div>
        `;

        // Insert ID card section after the greeting
        welcomeMailOptions.html = welcomeMailOptions.html.replace(
            '<p style="margin:0 0 12px; font-size:15px; color:#111827;">',
            idCardSection + '<p style="margin:0 0 12px; font-size:15px; color:#111827;">'
        );

        // Send welcome email (don't await to avoid delaying the response)
        transporter
            .sendMail(welcomeMailOptions)
            .then((info) => {
                console.log("Welcome email sent:", info.messageId);
                // Clean up the temporary ID card file after sending
                if (fs.existsSync(idCard.filePath)) {
                    fs.unlink(idCard.filePath, (err) => {
                        if (err) console.error("Error deleting temporary ID card:", err);
                    });
                }
            })
            .catch((error) => {
                console.error("Error sending welcome email:", error);
                // Clean up the temporary ID card file on error
                if (fs.existsSync(idCard.filePath)) {
                    fs.unlink(idCard.filePath, (err) => {
                        if (err) console.error("Error deleting temporary ID card:", err);
                    });
                }
            });

        res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            data: candidate,
        });
    } catch (error) {
        console.error("Error creating candidate:", error);

        // Clean up the uploaded file if it exists
        if (profilePhotoPath && fs.existsSync(profilePhotoPath)) {
            fs.unlink(profilePhotoPath, (err) => {
                if (err) console.error("Error deleting uploaded file:", err);
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
