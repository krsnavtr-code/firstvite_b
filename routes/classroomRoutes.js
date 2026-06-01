import express from "express";
import {
  createClassroomSession,
  getBatchClassroomSessions,
  getClassroomSession,
  startClassroomSession,
  endClassroomSession,
  joinClassroomSession,
  leaveClassroomSession,
  getActiveClassroomSession,
  addChatMessage,
  deleteClassroomSession,
  joinClassroomByInviteCode,
} from "../controller/classroom.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create a new classroom session
router.route("/sessions").post(protect, createClassroomSession);

// Get classroom sessions for a batch
router
  .route("/sessions/batch/:batchId")
  .get(protect, getBatchClassroomSessions);

// Get active classroom session for a batch
router
  .route("/sessions/batch/:batchId/active")
  .get(protect, getActiveClassroomSession);

// Get a specific classroom session
router.route("/sessions/:sessionId").get(protect, getClassroomSession);

// Start a classroom session (teacher only)
router.route("/sessions/:sessionId/start").post(protect, startClassroomSession);

// End a classroom session (teacher only)
router.route("/sessions/:sessionId/end").post(protect, endClassroomSession);

// Join a classroom session
router.route("/sessions/:sessionId/join").post(protect, joinClassroomSession);

// Leave a classroom session
router.route("/sessions/:sessionId/leave").post(protect, leaveClassroomSession);

// Join classroom by invite code
router.route("/join/:inviteCode").post(protect, joinClassroomByInviteCode);

// Add chat message to session
router.route("/sessions/:sessionId/chat").post(protect, addChatMessage);

// Delete a classroom session (admin only)
router.route("/sessions/:sessionId").delete(protect, deleteClassroomSession);

export default router;
