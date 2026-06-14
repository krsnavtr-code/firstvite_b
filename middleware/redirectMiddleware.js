import { getRedirectBySource } from "../controller/redirectController.js";

const handleRedirects = async (req, res, next) => {
  try {
    const path = req.path; // Get the path without query string
    const host = req.headers.host;
    const protocol = req.protocol;
    const fullUrl = `${protocol}://${host}${path}`; // Construct full URL

    // Check if there's a redirect rule for this path (try both path and full URL)
    let redirect = await getRedirectBySource(path);

    // If not found by path, try with full URL
    if (!redirect) {
      redirect = await getRedirectBySource(fullUrl);
    }

    // If still not found, try with www prefix if not present
    if (!redirect && !host.startsWith("www.")) {
      const wwwUrl = `${protocol}://www.${host}${path}`;
      redirect = await getRedirectBySource(wwwUrl);
    }

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
