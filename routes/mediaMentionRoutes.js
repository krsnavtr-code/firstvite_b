import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getAllMediaMentions,
  getFeaturedMediaMention,
  getMediaMentionById,
  getMediaMentionBySlug,
  createMediaMention,
  updateMediaMention,
  deleteMediaMention,
  getMediaMentionsByType,
  searchMediaMentions,
} from "../controller/mediaMention.controller.js";

const router = express.Router();

// Public routes
router.route("/featured").get(getFeaturedMediaMention);
router.route("/slug/:slug").get(getMediaMentionBySlug);
router.route("/type/:type").get(getMediaMentionsByType);
router.route("/search").get(searchMediaMentions);

// Public get all (with filtering)
router.route("/").get(getAllMediaMentions);

// Admin routes
router.route("/:id").get(protect, authorize("admin"), getMediaMentionById);
router.route("/").post(protect, authorize("admin"), createMediaMention);
router.route("/:id").put(protect, authorize("admin"), updateMediaMention);
router.route("/:id").delete(protect, authorize("admin"), deleteMediaMention);

export default router;
