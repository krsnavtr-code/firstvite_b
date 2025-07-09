import jwt from 'jsonwebtoken';
import User from '../model/User.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    console.log('Auth middleware - Checking authorization...');
    console.log('Authorization header:', req.headers.authorization);
    
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Extracted token from Authorization header');
    }
    // Get token from x-auth-token header
    else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
      console.log('Extracted token from x-auth-token header');
    } else {
      console.log('No token found in headers');
    }

    // Check if no token
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized to access this route. No token provided.'
      });
    }
    
    console.log('Extracted token:', token ? 'Token exists' : 'No token');

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      console.log('Decoded token:', JSON.stringify(decoded, null, 2));
      
      // Get user from the token
      req.user = await User.findById(decoded.userId).select('-password');
      console.log('Found user:', req.user ? `ID: ${req.user._id}, Role: ${req.user.role}` : 'No user found');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found with this token.'
        });
      }
      
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Invalid token.'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};
