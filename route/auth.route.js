import express from "express";
import { signup, login, getCurrentUser } from "../controller/user.controller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected route - requires authentication
router.get("/me", protect, getCurrentUser);

export default router;
