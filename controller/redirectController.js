import Redirect from "../model/redirect.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

// @desc    Get all redirects
// @route   GET /api/redirects
// @access  Private (Admin only)
export const getAllRedirects = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const redirects = await Redirect.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Redirect.countDocuments();

  res.json({
    success: true,
    data: redirects,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get a single redirect
// @route   GET /api/redirects/:id
// @access  Private (Admin only)
export const getRedirect = catchAsync(async (req, res, next) => {
  const redirect = await Redirect.findById(req.params.id);

  if (!redirect) {
    return next(new AppError("Redirect not found", 404));
  }

  res.json({
    success: true,
    data: redirect,
  });
});

// @desc    Create a new redirect
// @route   POST /api/redirects
// @access  Private (Admin only)
export const createRedirect = catchAsync(async (req, res, next) => {
  const { sourceUrl, targetUrl, statusCode, description } = req.body;

  // Check if source URL already exists
  const existingRedirect = await Redirect.findOne({ sourceUrl });
  if (existingRedirect) {
    return next(
      new AppError("A redirect for this source URL already exists", 400),
    );
  }

  const redirect = await Redirect.create({
    sourceUrl,
    targetUrl,
    statusCode: statusCode || 301,
    description,
  });

  res.status(201).json({
    success: true,
    data: redirect,
  });
});

// @desc    Update a redirect
// @route   PATCH /api/redirects/:id
// @access  Private (Admin only)
export const updateRedirect = catchAsync(async (req, res, next) => {
  const { sourceUrl, targetUrl, statusCode, isActive, description } = req.body;

  const redirect = await Redirect.findById(req.params.id);

  if (!redirect) {
    return next(new AppError("Redirect not found", 404));
  }

  // If sourceUrl is being changed, check if it already exists
  if (sourceUrl && sourceUrl !== redirect.sourceUrl) {
    const existingRedirect = await Redirect.findOne({ sourceUrl });
    if (existingRedirect) {
      return next(
        new AppError("A redirect for this source URL already exists", 400),
      );
    }
  }

  const updatedRedirect = await Redirect.findByIdAndUpdate(
    req.params.id,
    {
      sourceUrl: sourceUrl || redirect.sourceUrl,
      targetUrl: targetUrl || redirect.targetUrl,
      statusCode: statusCode || redirect.statusCode,
      isActive: isActive !== undefined ? isActive : redirect.isActive,
      description: description || redirect.description,
    },
    { new: true, runValidators: true },
  );

  res.json({
    success: true,
    data: updatedRedirect,
  });
});

// @desc    Delete a redirect
// @route   DELETE /api/redirects/:id
// @access  Private (Admin only)
export const deleteRedirect = catchAsync(async (req, res, next) => {
  const redirect = await Redirect.findById(req.params.id);

  if (!redirect) {
    return next(new AppError("Redirect not found", 404));
  }

  await Redirect.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Redirect deleted successfully",
  });
});

// @desc    Toggle redirect active status
// @route   PATCH /api/redirects/:id/toggle
// @access  Private (Admin only)
export const toggleRedirect = catchAsync(async (req, res, next) => {
  const redirect = await Redirect.findById(req.params.id);

  if (!redirect) {
    return next(new AppError("Redirect not found", 404));
  }

  redirect.isActive = !redirect.isActive;
  await redirect.save();

  res.json({
    success: true,
    data: redirect,
  });
});

// @desc    Get redirect by source URL (for middleware)
// @access  Public
export const getRedirectBySource = async (sourceUrlOrUrls) => {
  const query = {
    isActive: true,
  };

  if (Array.isArray(sourceUrlOrUrls)) {
    query.sourceUrl = { $in: sourceUrlOrUrls };
  } else {
    query.sourceUrl = sourceUrlOrUrls;
  }

  const redirect = await Redirect.findOne(query);

  if (redirect) {
    // Update redirect count and last redirected time in background (non-blocking)
    Redirect.updateOne(
      { _id: redirect._id },
      {
        $inc: { redirectCount: 1 },
        $set: { lastRedirectedAt: new Date() },
      },
    ).catch((err) => console.error("Error updating redirect stats:", err));
  }

  return redirect;
};

// @desc    Check if a path has a redirect (public endpoint for client-side check)
// @route   GET /api/redirects/check?path=/some-path
// @access  Public
export const checkRedirect = catchAsync(async (req, res, next) => {
  const { path: reqPath } = req.query;

  if (!reqPath) {
    return next(new AppError("Path parameter is required", 400));
  }

  const host = req.headers.host || "";
  const protocol = req.protocol || "http";

  // Construct candidates exactly like middleware does
  const candidates = [reqPath];

  // If the passed path is a relative path (e.g. /old-url), construct full URLs
  if (reqPath.startsWith("/")) {
    const fullUrl = `${protocol}://${host}${reqPath}`;
    candidates.push(fullUrl);
    if (host && !host.startsWith("www.")) {
      candidates.push(`${protocol}://www.${host}${reqPath}`);
    }
  } else {
    // If it's already a full URL, we can extract the path and add it as a candidate,
    // and also add the www version if not present
    try {
      const urlObj = new URL(reqPath);
      const relativePath = urlObj.pathname + urlObj.search;
      candidates.push(relativePath);

      const hostname = urlObj.hostname;
      if (hostname && !hostname.startsWith("www.")) {
        candidates.push(
          `${urlObj.protocol}//www.${hostname}${urlObj.pathname}${urlObj.search}`,
        );
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  // De-duplicate candidates
  const uniqueCandidates = [...new Set(candidates)];

  const redirect = await Redirect.findOne({
    sourceUrl: { $in: uniqueCandidates },
    isActive: true,
  });

  if (redirect) {
    // Update redirect count and last redirected time in background (non-blocking)
    Redirect.updateOne(
      { _id: redirect._id },
      {
        $inc: { redirectCount: 1 },
        $set: { lastRedirectedAt: new Date() },
      },
    ).catch((err) =>
      console.error("Error updating redirect stats in checkRedirect:", err),
    );
  }

  res.json({
    success: true,
    data: redirect,
  });
});
