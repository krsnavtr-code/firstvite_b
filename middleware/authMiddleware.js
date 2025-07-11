import jwt from 'jsonwebtoken';
import User from '../model/User.js';

export const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                // Get token from header
                token = req.headers.authorization.split(' ')[1];

                // Verify token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                // Get user from the token
                req.user = await User.findById(decoded.id).select('-password');
                next();
            } catch (error) {
                console.error('Token verification error:', error);
                res.status(401).json({ 
                    success: false,
                    message: 'Not authorized, token failed' 
                });
            }
        }

        if (!token) {
            res.status(401).json({ 
                success: false,
                message: 'Not authorized, no token' 
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
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
