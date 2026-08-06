import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getAllAwards,
  getFeaturedAward,
  getAwardById,
  getAwardBySlug,
  createAward,
  updateAward,
  deleteAward,
  getAwardsByCategory,
  searchAwards,
} from "../controller/award.controller.js";

const router = express.Router();

// Public routes
router.route("/featured").get(getFeaturedAward);
router.route("/slug/:slug").get(getAwardBySlug);
router.route("/category/:category").get(getAwardsByCategory);
router.route("/search").get(searchAwards);

// Public get all (with filtering)
router.route("/").get(getAllAwards);

// Admin routes
router.route("/:id").get(protect, authorize("admin"), getAwardById);
router.route("/").post(protect, authorize("admin"), createAward);
router.route("/:id").put(protect, authorize("admin"), updateAward);
router.route("/:id").delete(protect, authorize("admin"), deleteAward);

export default router;