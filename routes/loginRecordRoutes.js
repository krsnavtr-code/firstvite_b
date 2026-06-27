import express from "express";
import LoginRecord from "../model/LoginRecord.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

// @desc    Get all login records (admin only)
// @route   GET /api/admin/login-records
// @access  Private/Admin
router.get("/login-records", protect, admin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userRole,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    // Build query
    const query = {};

    if (userRole) {
      query.userRole = userRole;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.loginTime = {};
      if (startDate) {
        query.loginTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.loginTime.$lte = new Date(endDate);
      }
    }

    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get records with pagination
    const records = await LoginRecord.find(query)
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await LoginRecord.countDocuments(query);

    // Get statistics
    const stats = await LoginRecord.aggregate([
      {
        $group: {
          _id: null,
          totalLogins: { $sum: 1 },
          activeSessions: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          uniqueUsers: { $addToSet: "$user" },
        },
      },
      {
        $project: {
          totalLogins: 1,
          activeSessions: 1,
          uniqueUsers: { $size: "$uniqueUsers" },
        },
      },
    ]);

    // Get role distribution
    const roleDistribution = await LoginRecord.aggregate([
      {
        $group: {
          _id: "$userRole",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      statistics: stats[0] || {
        totalLogins: 0,
        activeSessions: 0,
        uniqueUsers: 0,
      },
      roleDistribution,
    });
  } catch (error) {
    console.error("Error fetching login records:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching login records",
      error: error.message,
    });
  }
});

// @desc    Get login records for a specific user
// @route   GET /api/admin/login-records/user/:userId
// @access  Private/Admin
router.get("/login-records/user/:userId", protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const records = await LoginRecord.find({ user: userId })
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await LoginRecord.countDocuments({ user: userId });

    res.json({
      success: true,
      data: records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching user login records:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user login records",
      error: error.message,
    });
  }
});

// @desc    Get login record by ID
// @route   GET /api/admin/login-records/:id
// @access  Private/Admin
router.get("/login-records/:id", protect, admin, async (req, res) => {
  try {
    const record = await LoginRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Login record not found",
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error fetching login record:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching login record",
      error: error.message,
    });
  }
});

// @desc    Update login record (e.g., mark as logged out)
// @route   PATCH /api/admin/login-records/:id
// @access  Private/Admin
router.patch("/login-records/:id", protect, admin, async (req, res) => {
  try {
    const { status, logoutTime } = req.body;

    const record = await LoginRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Login record not found",
      });
    }

    if (status) {
      record.status = status;
    }

    if (logoutTime) {
      record.logoutTime = new Date(logoutTime);
      record.sessionDuration = Math.floor(
        (new Date(logoutTime) - record.loginTime) / 1000
      );
    }

    await record.save();

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error updating login record:", error);
    res.status(500).json({
      success: false,
      message: "Error updating login record",
      error: error.message,
    });
  }
});

// @desc    Delete login record
// @route   DELETE /api/admin/login-records/:id
// @access  Private/Admin
router.delete("/login-records/:id", protect, admin, async (req, res) => {
  try {
    const record = await LoginRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Login record not found",
      });
    }

    await record.deleteOne();

    res.json({
      success: true,
      message: "Login record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting login record:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting login record",
      error: error.message,
    });
  }
});

// @desc    Get login statistics
// @route   GET /api/admin/login-statistics
// @access  Private/Admin
router.get("/login-statistics", protect, admin, async (req, res) => {
  try {
    const { period = "7d" } = req.query;

    let startDate = new Date();
    if (period === "24h") {
      startDate.setHours(startDate.getHours() - 24);
    } else if (period === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === "90d") {
      startDate.setDate(startDate.getDate() - 90);
    }

    const stats = await LoginRecord.aggregate([
      {
        $match: {
          loginTime: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$loginTime",
              },
            },
            role: "$userRole",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // Get recent logins
    const recentLogins = await LoginRecord.find({
      loginTime: { $gte: startDate },
    })
      .sort({ loginTime: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        dailyStats: stats,
        recentLogins,
      },
    });
  } catch (error) {
    console.error("Error fetching login statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching login statistics",
      error: error.message,
    });
  }
});

export default router;
