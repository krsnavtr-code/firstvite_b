import jwt from 'jsonwebtoken';
import User from '../model/User.js';
import AppError from '../utils/appError.js';

export const protect = async (req, res, next) => {
    try {
        console.log('=== New Request ===');
        console.log('URL:', req.originalUrl);
        console.log('Method:', req.method);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        
        let token;
        const authHeader = req.headers.authorization;
        
        // Check for token in Authorization header
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            console.log('Token found in Authorization header');
        }
        
        // If no token, check cookies
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
            console.log('Token found in cookies');
        }
        
        if (!token) {
            console.log('No token found in request');
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, no token provided' 
            });
        }
        
        try {
            // Trim and verify the token
            const trimmedToken = token.trim();
            console.log('Token received (first 20 chars):', trimmedToken.substring(0, 20) + '...');
            
            // Log the token and environment for debugging
            console.log('Verifying token. Environment:', process.env.NODE_ENV);
            console.log('Token length:', trimmedToken.length);
            console.log('Token prefix:', trimmedToken.substring(0, 10) + '...');
            
            // Try to decode without verification first to see the token structure
            try {
                const unverified = jwt.decode(trimmedToken);
                console.log('Unverified token content:', JSON.stringify(unverified, null, 2));
            } catch (decodeError) {
                console.error('Failed to decode token:', decodeError);
            }
            
            let decoded;
            const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
            const refreshSecret = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';
            
            console.log('Using JWT_SECRET:', jwtSecret ? '***' : 'Not set');
            console.log('Using JWT_REFRESH_SECRET:', refreshSecret ? '***' : 'Not set');
            
            // First, try to verify with the access token secret
            try {
                console.log('Attempting to verify with JWT_SECRET...');
                decoded = jwt.verify(trimmedToken, jwtSecret, { ignoreExpiration: true });
                console.log('Token verified with JWT_SECRET');
                
                // Verify it's an access token
                if (decoded.type !== 'access') {
                    console.error('Invalid token type with JWT_SECRET:', decoded.type);
                    return res.status(401).json({ 
                        success: false,
                        message: 'Invalid token type. Access token required.'
                    });
                }
                
                // Check if token is expired
                const now = Math.floor(Date.now() / 1000);
                if (decoded.exp && decoded.exp < now) {
                    console.error('Token expired:', new Date(decoded.exp * 1000));
                    return res.status(401).json({
                        success: false,
                        message: 'Your session has expired. Please log in again.'
                    });
                }
                
            } catch (accessError) {
                console.log('Failed to verify with JWT_SECRET:', accessError.message);
                
                // If access token verification fails, try with refresh token secret
                try {
                    console.log('Attempting to verify with JWT_REFRESH_SECRET...');
                    decoded = jwt.verify(trimmedToken, refreshSecret, { ignoreExpiration: true });
                    console.log('Token verified with JWT_REFRESH_SECRET');
                    
                    // If we get here with a refresh token, it's the wrong token type
                    if (decoded.type === 'refresh') {
                        console.error('Refresh token used as access token');
                        return res.status(401).json({ 
                            success: false,
                            message: 'Access token required. Please log in again.'
                        });
                    }
                    
                    // Check if token is expired
                    const now = Math.floor(Date.now() / 1000);
                    if (decoded.exp && decoded.exp < now) {
                        console.error('Refresh token expired:', new Date(decoded.exp * 1000));
                        return res.status(401).json({
                            success: false,
                            message: 'Your session has expired. Please log in again.'
                        });
                    }
                    
                } catch (refreshError) {
                    console.error('Token verification failed with both secrets');
                    console.error('Access token error:', accessError.message);
                    console.error('Refresh token error:', refreshError.message);
                    
                    if (accessError.name === 'TokenExpiredError' || refreshError.name === 'TokenExpiredError') {
                        return res.status(401).json({
                            success: false,
                            message: 'Your session has expired. Please log in again.'
                        });
                    }
                    
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid token. Please log in again.',
                        debug: {
                            tokenLength: trimmedToken.length,
                            tokenPrefix: trimmedToken.substring(0, 10) + '...',
                            error: accessError.message
                        }
                    });
                }
            }
            
            console.log('Token decoded successfully:', JSON.stringify(decoded, null, 2));
            
            if (!decoded) {
                console.error('Token could not be decoded');
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token format: Token could not be decoded'
                });
            }
            
            console.log('Token verified for user ID:', decoded.id);

            // Get user from the token
            const currentUser = await User.findById(decoded.id).select('-password');
            if (!currentUser) {
                console.error('User not found for ID:', decoded.id);
                return res.status(401).json({ 
                    success: false,
                    message: 'The user belonging to this token no longer exists.'
                });
            }
            
            // Check if user is active
            if (!currentUser.isActive) {
                console.error('User account is not active:', currentUser.email);
                return res.status(401).json({ 
                    success: false,
                    message: 'User account is not active' 
                });
            }
            
            // Check if user is approved (if applicable)
            if (currentUser.isApproved === false) {
                console.error('User account not approved:', currentUser.email);
                return res.status(403).json({ 
                    success: false,
                    message: 'Your account is pending approval from the administrator.'
                });
            }
            
            // Attach user to request object
            req.user = currentUser;
            console.log('User authenticated successfully:', currentUser.email);
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Session expired. Please log in again.'
                });
            }
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid token. Please log in again.'
                });
            }
            
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, token verification failed',
                error: error.message
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
