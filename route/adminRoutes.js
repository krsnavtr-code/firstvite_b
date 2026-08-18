import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import {
  populateAdminPermissions,
  checkPermission,
  checkMultiplePermissions,
} from "../middleware/adminPermissionMiddleware.js";
import {
  getVideos,
  getVideo,
  uploadVideo,
} from "../controller/videoController.js";
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
  getAllCandidates,
  getCandidate,
  updateCandidateStatus,
} from "../controller/adminController.js";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/temp/",
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const allowedMimeTypes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
    ];

    const extname = path.extname(file.originalname).toLowerCase();
    const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);
    const isExtensionAllowed = allowedTypes.includes(extname);

    if (isExtensionAllowed && isMimeTypeAllowed) {
      return cb(null, true);
    }

    const error = new Error(
      "Invalid file type. Only MP4, MOV, AVI, MKV, and WebM files are allowed.",
    );
    error.code = "LIMIT_FILE_TYPE";
    cb(error);
  },
});

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads/temp");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const router = express.Router();

// Protect all routes after this middleware (user must be logged in)
router.use(protect);

// Restrict all routes to only admin users
router.use(restrictTo("admin"));

// Populate admin permissions for all routes
router.use(populateAdminPermissions);

// Admin routes
// User management routes
router.get("/users", checkPermission("users", "canView"), getAllUsers);
router.get(
  "/pending-users",
  checkPermission("users", "canView"),
  getPendingUsers,
);
router.patch(
  "/approve-user/:id",
  checkPermission("users", "canEdit"),
  approveUser,
);
router.delete(
  "/reject-user/:id",
  checkPermission("users", "canDelete"),
  rejectUser,
);

router.patch(
  "/candidates/:id/status",
  checkPermission("candidates", "canEdit"),
  updateCandidateStatus,
);

// Video management routes
router
  .route("/videos")
  .get(
    checkMultiplePermissions(
      [
        { page: "lms-management", action: "canView" },
        { page: "send-brochure", action: "canView" },
      ],
      false,
    ), // OR logic - user needs either permission
    getVideos,
  )
  .post(
    checkPermission("lms-management", "canCreate"),
    upload.single("video"),
    uploadVideo,
  );

router.get(
  "/videos/:filename",
  checkMultiplePermissions(
    [
      { page: "lms-management", action: "canView" },
      { page: "send-brochure", action: "canView" },
    ],
    false,
  ), // OR logic - user needs either permission
  getVideo,
);

export default router;
