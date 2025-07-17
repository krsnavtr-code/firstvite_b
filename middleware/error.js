// Custom error class for API errors
class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 Not Found Error
export class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

// 400 Bad Request Error
export class BadRequestError extends APIError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

// 401 Unauthorized Error
export class UnauthorizedError extends APIError {
  constructor(message = 'Not authorized to access this route') {
    super(message, 401);
  }
}

// 403 Forbidden Error
export class ForbiddenError extends APIError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// 409 Conflict Error
export class ConflictError extends APIError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

// 500 Internal Server Error
export class InternalServerError extends APIError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

// Global error handling middleware
export const globalErrorHandler = (err, req, res, next) => {
  // Default error status and message
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error 💥', {
      status: err.status,
      statusCode: err.statusCode,
      message: err.message,
      stack: err.stack,
      error: err
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message,
      errors
    });
  }

  if (err.name === 'JsonWebTokenError') {
    // JWT error
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Invalid token. Please log in again!'
    });
  }

  if (err.name === 'TokenExpiredError') {
    // JWT expired error
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Your token has expired! Please log in again.'
    });
  }

  // Handle duplicate field errors (MongoDB)
  if (err.code === 11000) {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message
    });
  }

  // Handle CastError (invalid MongoDB ID format)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message
    });
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: `File upload error: ${err.message}`
    });
  }

  // For all other errors, send generic error response
  res.status(err.statusCode).json({
    status: err.status,
    statusCode: err.statusCode,
    message: err.message || 'Something went wrong!' ,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 Not Found handler
export const notFoundHandler = (req, res, next) => {
  const error = new APIError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(error);
};

// Catch async errors and pass them to the global error handler
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

export default {
  APIError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  globalErrorHandler,
  notFoundHandler,
  catchAsync
};
