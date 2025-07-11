import mongoose from 'mongoose';

/**
 * Middleware to validate MongoDB ObjectId in request parameters or body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateObjectId = (req, res, next) => {
  // Check in params first, then body
  const id = req.params.id || req.params.userId || req.body.id || req.body._id;
  
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    console.error('Invalid ObjectId format:', id);
    return res.status(400).json({ 
      success: false,
      message: 'Invalid ID format',
      error: 'INVALID_ID_FORMAT',
      receivedId: id
    });
  }
  
  next();
};

export default validateObjectId;
