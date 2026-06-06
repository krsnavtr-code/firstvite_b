import express from "express";
import {
  sendCustomEmail,
  getEmailHistory,
  getEmailById,
  deleteEmailHistory,
  uploadMiddleware,
} from "../controller/emailController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected and require admin access
router.use(protect);

router.post("/send", uploadMiddleware, sendCustomEmail);
router.get("/history", getEmailHistory);
router.get("/history/:id", getEmailById);
router.delete("/history/:id", deleteEmailHistory);

export default router;
