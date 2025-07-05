import jwt from 'jsonwebtoken';
import User from "../model/user.model.js";

export const isAdmin = async (req, res, next) => {
    try {
        console.log('Admin middleware - Checking authorization...');
        
        const authHeader = req.header('Authorization');
        console.log('Authorization header:', authHeader);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('No Bearer token found in Authorization header');
            return res.status(401).json({ 
                success: false,
                message: 'Authentication required' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        console.log('Extracted token:', token ? 'Token exists' : 'No token');

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Decoded token:', decoded);
        
        if (!decoded.userId) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token format' 
            });
        }

        const user = await User.findById(decoded.userId);
        console.log('Found user:', user ? `ID: ${user._id}, Role: ${user.role}` : 'No user found');

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        if (user.role !== 'admin') {
            console.log(`Access denied: User ${user._id} is not an admin`);
            return res.status(403).json({ 
                success: false,
                message: 'Admin access required' 
            });
        }

        console.log(`User ${user._id} granted admin access`);
        req.user = user;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        
        let errorMessage = 'Authentication failed';
        if (error.name === 'JsonWebTokenError') {
            errorMessage = 'Invalid token';
        } else if (error.name === 'TokenExpiredError') {
            errorMessage = 'Token expired';
        }
        
        return res.status(401).json({ 
            success: false,
            message: errorMessage,
            error: error.message 
        });
    }
};
