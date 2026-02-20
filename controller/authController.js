import jwt from "jsonwebtoken";
import User from "../model/User.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import crypto from "crypto";
import { sendEmail } from "../utils/email.js";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    {
      id, // Store the user ID as 'id' in the token payload
      type: "access",
      iat: Math.floor(Date.now() / 1000), // Issued at time
    },
    process.env.JWT_SECRET || "your_jwt_secret",
    {
      expiresIn: "15m", // Access token expires in 15 minutes
    },
  );
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign(
    {
      id,
      type: "refresh",
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret",
    {
      expiresIn: "7d", // Refresh token expires in 7 days
    },
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = catchAsync(async (req, res, next) => {
  const { fullname, email, password, role, department, phone } = req.body;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  // Check if user exists
  const userExists = await User.findOne({ email: normalizedEmail });

  if (userExists) {
    return next(
      new AppError("Email already registered. Go to Login page", 409),
    );
  }

  // Create user (initially approved)
  const user = await User.create({
    fullname,
    email: normalizedEmail,
    password,
    role: role || "student",
    department,
    phone,
    isApproved: true, // New users are approved by default
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      message: "Registration successful. Your account has been approved.",
    });
  } else {
    return next(new AppError("Invalid user data", 400));
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("Invalid email or password", 401));
  }

  // Check if account is deactivated
  if (user.isActive === false) {
    return next(
      new AppError(
        "Your account has been deactivated. Please contact support.",
        401,
      ),
    );
  }

  // If account is active but not approved yet, still allow login
  // but limit access based on isApproved status (handled by frontend routes)

  // Check password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new AppError("Invalid email or password", 401));
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  console.log("Generating tokens for user:", user._id);
  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  console.log("Generated token:", token ? "Token exists" : "Token is missing");
  console.log(
    "Generated refreshToken:",
    refreshToken ? "Refresh token exists" : "Refresh token is missing",
  );

  if (!token || !refreshToken) {
    console.error("Token generation failed");
    return next(new AppError("Failed to generate authentication tokens", 500));
  }

  // Store refresh token in user document
  user.refreshToken = refreshToken;
  try {
    await user.save();
    console.log("Refresh token saved to user document");
  } catch (saveError) {
    console.error("Error saving refresh token:", saveError);
    return next(new AppError("Failed to save refresh token", 500));
  }

  // Prepare user data for response
  const userData = {
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    role: user.role,
    isApproved: user.isApproved,
    phone: user.phone || "",
    address: user.address || "",
  };

  console.log("Sending login response with user data");
  const responseData = {
    success: true,
    token,
    refreshToken,
    user: userData,
  };

  console.log("Login response data:", JSON.stringify(responseData, null, 2));
  res.json(responseData);
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = catchAsync(async (req, res, next) => {
  try {
    // Get user from the database to ensure we have the latest data
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      phone: user.phone || "",
      address: user.address || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return next(new AppError("Error fetching user profile", 500));
  }
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = catchAsync(async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    console.log("Change password request received:", { userId: req.user?.id });

    if (!req.user || !req.user.id) {
      console.error("No user ID in request");
      return next(new AppError("Authentication required", 401));
    }

    // 1) Get user from collection
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      console.error("User not found with ID:", req.user.id);
      return next(new AppError("User not found", 404));
    }

    // 2) Check if current password is correct
    const isPasswordCorrect = await user.correctPassword(
      currentPassword,
      user.password,
    );
    console.log("Password check result:", isPasswordCorrect);

    if (!isPasswordCorrect) {
      return next(new AppError("Your current password is incorrect", 401));
    }

    // 3) Update password
    user.password = newPassword;
    // Clear refresh token when password changes
    user.refreshToken = undefined;
    await user.save();
    console.log("Password updated successfully for user:", user._id);

    // 4) Generate new tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save the new refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Remove password from output
    user.password = undefined;

    res.status(200).json({
      status: "success",
      message: "Password updated successfully",
      token,
      refreshToken,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullname: user.fullname,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Error in changePassword:", error);
    if (error.name === "ValidationError") {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError("Refresh token is required", 400));
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret",
    );

    if (decoded.type !== "refresh") {
      return next(new AppError("Invalid token type", 401));
    }

    // Find the user and check if the refresh token matches
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken: refreshToken,
    });

    if (!user) {
      return next(new AppError("User not found or invalid refresh token", 401));
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update refresh token in the database
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Refresh token has expired", 401));
    }
    return next(new AppError("Invalid refresh token", 401));
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("No user found with that email address", 404));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash token and save to user document
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // Create reset URL
  const resetURL = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  // Send email
  const subject = "Password Reset Request - Eklabya";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Eklabya</h1>
        <p style="color: white; margin: 5px 0 0 0; opacity: 0.9;">Centre of Excellence</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
        
        <p style="color: #666; margin-bottom: 20px;">
          Hello ${user.fullname || "User"},<br><br>
          We received a request to reset your password for your Eklabya account. 
          Click the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetURL}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
          If the button doesn't work, you can copy and paste this link into your browser:
        </p>
        
        <div style="background: #f1f3f4; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px;">
          ${resetURL}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            <strong>Important:</strong> This link will expire in 10 minutes for security reasons.
            If you didn't request this password reset, please ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html,
    });

    res.json({
      success: true,
      message: "Password reset instructions have been sent to your email",
    });
  } catch (emailError) {
    console.error("Error sending password reset email:", emailError);
    return next(
      new AppError(
        "Failed to send password reset email. Please try again later.",
        500,
      ),
    );
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = catchAsync(async (req, res, next) => {
  const { token, email, password } = req.body;

  try {
    // Find user by email and explicitly select password reset fields and password
    const user = await User.findOne({ email }).select(
      "+passwordResetToken +passwordResetExpires +password +refreshToken",
    );

    if (!user) {
      return next(new AppError("No user found with that email address", 404));
    }

    // Check if reset token exists and is not expired
    if (!user.passwordResetToken || !user.passwordResetExpires) {
      return next(new AppError("No password reset request found", 400));
    }

    // Check if token has expired
    if (Date.now() > user.passwordResetExpires) {
      return next(new AppError("Password reset token has expired", 400));
    }

    // Hash the provided token and compare with stored token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    if (hashedToken !== user.passwordResetToken) {
      return next(new AppError("Invalid reset token", 400));
    }

    user.password = password;
    console.log("User password after setting:", user.password);
    console.log("User password type after setting:", typeof user.password);

    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // Clear refresh tokens on password reset

    await user.save();

    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    if (error.name === "ValidationError") {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
});
