import express from "express";
import { signup, login, getCurrentUser, updateProfile } from "../controller/user.controller.js";
import { changePassword } from '../controller/authController.js';
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes - require authentication
router.get("/me", protect, getCurrentUser);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

export default router;
