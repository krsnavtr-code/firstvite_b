import express from "express";
import {
  register,
  login,
  getUserProfile,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controller/authController.js";
import { updateProfile } from "../controller/user.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

export default router;
