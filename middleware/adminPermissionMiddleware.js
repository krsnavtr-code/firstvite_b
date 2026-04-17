import AppError from "../utils/appError.js";

// Check if admin user has permission for a specific page and action
export const checkPermission = (page, action = "canView") => {
  return async (req, res, next) => {
    try {
      // Only check permissions for admin users
      if (!req.user || req.user.role !== "admin") {
        return next(new AppError("Admin access required", 403));
      }

      // Super admin check - if user has no adminRoleId, they have full access
      if (!req.user.adminRoleId) {
        return next();
      }

      // Get user permissions (they should be populated by auth middleware)
      const userPermissions = req.user.adminPermissions || {};

      // Get permission for this specific page
      const pagePermission = userPermissions[page];

      if (!pagePermission) {
        return next(
          new AppError(`You do not have permission to access ${page}`, 403),
        );
      }

      // Check specific action permission
      if (!pagePermission[action]) {
        const actionText = action.replace("can", "").toLowerCase();
        return next(
          new AppError(
            `You do not have permission to ${actionText} ${page}`,
            403,
          ),
        );
      }

      next();
    } catch (error) {
      return next(new AppError("Permission check failed", 500));
    }
  };
};

// Middleware to populate admin permissions for the current user
export const populateAdminPermissions = async (req, res, next) => {
  try {
    if (req.user && req.user.role === "admin") {
      // Populate admin permissions if not already loaded
      if (!req.user.adminPermissions) {
        const user = await req.user.constructor
          .findById(req.user._id)
          .select("+adminPermissions +adminRoleId")
          .populate("adminRoleId", "permissions");

        if (user) {
          req.user.adminPermissions = user.adminPermissions;
          req.user.adminRoleId = user.adminRoleId;
        }
      }
    }
    next();
  } catch (error) {
    return next(new AppError("Failed to populate permissions", 500));
  }
};

// Check multiple permissions (for routes that need multiple page access)
export const checkMultiplePermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return next(new AppError("Admin access required", 403));
      }

      // Super admin check
      if (!req.user.adminRoleId) {
        return next();
      }

      const userPermissions = req.user.adminPermissions || {};

      for (const { page, action = "canView" } of permissions) {
        const pagePermission = userPermissions[page];

        if (!pagePermission || !pagePermission[action]) {
          return next(
            new AppError(`You do not have required permissions`, 403),
          );
        }
      }

      next();
    } catch (error) {
      return next(new AppError("Permission check failed", 500));
    }
  };
};

// Get user's accessible pages for UI rendering
export const getAccessiblePages = (user) => {
  if (!user || user.role !== "admin") {
    return [];
  }

  // Super admin has access to all pages
  if (!user.adminRoleId) {
    return [
      "dashboard",
      "lms-management",
      "test-qa",
      "courses",
      "send-brochure",
      "send-proposal",
      "candidates",
      "categories",
      "users",
      "blog",
      "contacts",
      "payments",
      "enrollments",
      "faqs",
      "image-gallery",
      "admin-management",
    ];
  }

  const userPermissions = user.adminPermissions || {};
  const accessiblePages = [];

  for (const [page, permissions] of Object.entries(userPermissions)) {
    if (permissions.canView) {
      accessiblePages.push(page);
    }
  }

  return accessiblePages;
};
