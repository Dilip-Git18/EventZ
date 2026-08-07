import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes
export const protect = async (req, res, next) => {
  let token;

  // Retrieve token from cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    const tokenCookie = rawCookies.find(c => c.trim().startsWith('token='));
    if (tokenCookie) {
      token = tokenCookie.split('=')[1];
    }
  }

  // Fallback: Authorization header (Bearer token) for flexibility (e.g. testing)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, login required' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database (excluding password)
    const user = await User.findById(decoded.id).select('+status');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    // Check if user is blocked
    if (user.status === 'blocked') {
      res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
      });
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token verification failed' });
  }
};

// Grant access to specific roles
export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'unknown'}' is not authorized to access this resource`
      });
    }
    next();
  };
};
