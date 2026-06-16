import { getRedirectBySource } from "../controller/redirectController.js";

const handleRedirects = async (req, res, next) => {
  try {
    const path = req.path; // Get the path without query string

    // 1. PERFORMANCE OPTIMIZATION: Fast path for API requests and static assets
    // Skip checking database for API routes
    if (path.startsWith("/api")) {
      return next();
    }

    // Skip checking database for common static directories
    if (
      path.startsWith("/uploads") ||
      path.startsWith("/pdfs") ||
      path.startsWith("/candidate_profile") ||
      path.startsWith("/uploaded_brochure")
    ) {
      return next();
    }

    // Skip checking database for static files (extensions)
    const staticExtensionRegex =
      /\.(js|css|png|jpe?g|gif|svg|ico|webp|json|xml|txt|pdf|woff2?|ttf|eot|map)$/i;
    if (staticExtensionRegex.test(path)) {
      return next();
    }

    const host = req.headers.host || "";
    const protocol = req.protocol || "http";
    const fullUrl = `${protocol}://${host}${path}`; // Construct full URL

    // 2. PERFORMANCE OPTIMIZATION: Query all potential source URLs in ONE database call
    const candidates = [path];
    if (fullUrl !== path) {
      candidates.push(fullUrl);
    }

    if (host && !host.startsWith("www.")) {
      const wwwUrl = `${protocol}://www.${host}${path}`;
      if (!candidates.includes(wwwUrl)) {
        candidates.push(wwwUrl);
      }
    }

    // Query all possible candidate URLs in a single database round-trip
    const redirect = await getRedirectBySource(candidates);

    if (redirect) {
      // Perform the redirect
      return res.redirect(redirect.statusCode, redirect.targetUrl);
    }

    // No redirect found, continue to next middleware
    next();
  } catch (error) {
    // If there's an error, just continue to avoid breaking the app
    console.error("Redirect middleware error:", error);
    next();
  }
};

export default handleRedirects;
