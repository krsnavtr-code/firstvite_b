import jwt from 'jsonwebtoken';
import User from '../model/User.js';
import AppError from '../utils/appError.js';

export const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Not authorized, no token' 
                });
            }

            try {
                // Verify token
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
                
                // Get user from the token
                const user = await User.findById(decoded.userId).select('-password');
                
                if (!user) {
                    return res.status(401).json({ 
                        success: false,
                        message: 'User not found' 
                    });
                }
                
                // Check if user is active
                if (!user.isActive) {
                    return res.status(401).json({ 
                        success: false,
                        message: 'User account is not active' 
                    });
                }
                
                // Attach user to request object
                req.user = user;
                next();
            } catch (error) {
                console.error('Token verification error:', error);
                return res.status(401).json({ 
                    success: false,
                    message: 'Not authorized, invalid token' 
                });
            }
        } else {
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, no token' 
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
};

export const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Not authorized as an admin' 
        });
    }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'teacher']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};
