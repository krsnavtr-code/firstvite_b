import jwt from 'jsonwebtoken';
import User from '../model/User.js';

// Try to attach req.user if a valid token is present, but don't block if missing/invalid
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (!token) return next();

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      const userId = decoded.id || decoded.userId || decoded._id;
      if (!userId) return next();
      const user = await User.findById(userId).select('-password');
      if (user) {
        req.user = {
          _id: user._id,
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        };
      }
      return next();
    } catch (e) {
      // ignore invalid tokens, continue anonymously
      return next();
    }
  } catch (e) {
    return next();
  }
};

export default optionalAuth;
