import LoginRecord from "../model/LoginRecord.js";

// Helper function to parse user agent (simple version without external dependency)
const parseUserAgent = (userAgentString) => {
  const ua = userAgentString || "Unknown";

  // Simple browser detection
  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  else if (ua.includes("Opera")) browser = "Opera";

  // Simple OS detection
  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS")) os = "iOS";

  // Simple device detection
  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iOS")) {
    device = "Mobile";
  } else if (ua.includes("Tablet")) {
    device = "Tablet";
  }

  return {
    browser,
    os,
    device,
  };
};

// Helper function to get client IP
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-client-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "Unknown"
  );
};

// Track login middleware
export const trackLogin = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;

  // Override json method to intercept response
  res.json = function (data) {
    // Only track successful logins
    if (data.success && data.token && req.user) {
      (async () => {
        try {
          const userAgentString = req.headers["user-agent"] || "Unknown";
          const ipAddress = getClientIP(req);
          const parsedUA = parseUserAgent(userAgentString);

          // Get user details
          const user = await User.findById(req.user._id || req.user.id);
          if (!user) return;

          // Create login record
          await LoginRecord.create({
            user: user._id,
            userEmail: user.email,
            userName: user.fullname,
            userRole: user.role,
            ipAddress,
            userAgent: userAgentString,
            browser: parsedUA.browser,
            os: parsedUA.os,
            device: parsedUA.device,
            loginTime: new Date(),
            status: "active",
          });

          console.log(
            `Login tracked for user: ${user.email} from IP: ${ipAddress}`,
          );
        } catch (error) {
          console.error("Error tracking login:", error);
          // Don't fail the login if tracking fails
        }
      })();
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

// Track logout middleware
export const trackLogout = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const ipAddress = getClientIP(req);

    // Find active login record for this user and IP
    const activeRecord = await LoginRecord.findOne({
      user: userId,
      ipAddress,
      status: "active",
    }).sort({ loginTime: -1 });

    if (activeRecord) {
      const logoutTime = new Date();
      const sessionDuration = Math.floor(
        (logoutTime - activeRecord.loginTime) / 1000,
      );

      activeRecord.logoutTime = logoutTime;
      activeRecord.sessionDuration = sessionDuration;
      activeRecord.status = "logged_out";
      await activeRecord.save();

      console.log(`Logout tracked for user: ${userId}`);
    }
  } catch (error) {
    console.error("Error tracking logout:", error);
    // Don't fail the logout if tracking fails
  }

  next();
};

// Get location from IP (optional - can be enhanced with geoip service)
export const getLocationFromIP = async (ip) => {
  // This is a placeholder. You can integrate with services like:
  // - ipinfo.io
  // - maxmind geoip
  // - ip-api.com
  // For now, return null
  return null;
};
