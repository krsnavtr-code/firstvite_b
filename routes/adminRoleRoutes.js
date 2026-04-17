import express from "express";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import {
  populateAdminPermissions,
  checkPermission,
} from "../middleware/adminPermissionMiddleware.js";
import {
  getAllAdminRoles,
  getAdminRole,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  getAdminUsers,
  createAdminUser,
  updateAdminUserRole,
  getAvailablePages,
} from "../controller/adminRoleController.js";

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo("admin"));
router.use(populateAdminPermissions);

// Admin role management routes
router.get("/roles", getAllAdminRoles);
router.get("/roles/:id", getAdminRole);
router.post(
  "/roles",
  checkPermission("admin-management", "canCreate"),
  createAdminRole,
);
router.patch(
  "/roles/:id",
  checkPermission("admin-management", "canEdit"),
  updateAdminRole,
);
router.delete(
  "/roles/:id",
  checkPermission("admin-management", "canDelete"),
  deleteAdminRole,
);

// Admin user management routes
router.get("/users", getAdminUsers);
router.post(
  "/users",
  checkPermission("admin-management", "canCreate"),
  createAdminUser,
);
router.patch(
  "/users/:id/role",
  checkPermission("admin-management", "canEdit"),
  updateAdminUserRole,
);

// Utility routes
router.get("/pages", getAvailablePages);

export default router;
