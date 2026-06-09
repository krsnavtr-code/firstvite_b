import express from "express";
import {
  getAllRedirects,
  getRedirect,
  createRedirect,
  updateRedirect,
  deleteRedirect,
  toggleRedirect,
} from "../controller/redirectController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected and require admin access
router.use(protect);

router.get("/", getAllRedirects);
router.get("/:id", getRedirect);
router.post("/", createRedirect);
router.patch("/:id", updateRedirect);
router.delete("/:id", deleteRedirect);
router.patch("/:id/toggle", toggleRedirect);

export default router;
