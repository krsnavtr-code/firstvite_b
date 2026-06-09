import express from "express";
import {
  uploadDocument,
  getStudentDocuments,
  getDocumentById,
  deleteDocument,
  getAllStudentDocuments,
  verifyDocument,
  uploadMiddleware,
} from "../controller/studentDocumentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Student routes
router.use(protect);
router.post("/upload", uploadMiddleware, uploadDocument);
router.get("/", getStudentDocuments);
router.get("/:id", getDocumentById);
router.delete("/:id", deleteDocument);

// Admin routes
router.get("/admin/all", getAllStudentDocuments);
router.patch("/admin/:id/verify", verifyDocument);

export default router;
