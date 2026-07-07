import { Router } from "express";
import {
  submitContactForm,
  getAllContacts,
  updateContactStatus,
  trackVisit,
} from "../controller/contactController.js";
import { protect } from "../middleware/auth.js";
import { isAdmin } from "../middleware/admin.js";
import { contactValidationRules, validate } from "../middleware/validation.js";
import { socketMiddleware } from "../middleware/socketMiddleware.js";

const router = Router();

// Public route for submitting contact form with validation
router.post("/", contactValidationRules, validate, submitContactForm);

// Public route for tracking visits (hot lead alerts)
router.post("/track-visit", socketMiddleware, trackVisit);

// Protected admin routes
router.get("/", protect, isAdmin, getAllContacts);

router.patch("/:id/status", protect, isAdmin, updateContactStatus);

// Export the router as default
export default router;
