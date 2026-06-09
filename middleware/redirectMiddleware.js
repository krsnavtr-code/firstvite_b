import { getRedirectBySource } from "../controller/redirectController.js";

const handleRedirects = async (req, res, next) => {
  try {
    const sourceUrl = req.path; // Get the path without query string

    // Check if there's a redirect rule for this path
    const redirect = await getRedirectBySource(sourceUrl);

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
