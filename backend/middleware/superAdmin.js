import User from '../models/User.js';

/**
 * Super Admin Security Middleware
 * CRITICAL: Only users with role 'superAdmin' can access these resources
 */

// Strict Super Admin Authentication - ONLY super admins
export const requireSuperAdmin = async (req, res, next) => {
  try {
    // First check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    // Get full user data from database to verify current role
    const user = await User.findById(req.user.id).select('role email firstName lastName');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // CRITICAL CHECK: Only 'superAdmin' role is allowed
    if (user.role !== 'superAdmin') {
      console.warn(`🚫 UNAUTHORIZED SUPER ADMIN ACCESS ATTEMPT:`, {
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        attemptedRoute: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({ 
        error: 'Super Admin access required. This incident has been logged.',
        code: 'SUPER_ADMIN_REQUIRED',
        userRole: user.role,
        requiredRole: 'superAdmin',
        timestamp: new Date().toISOString()
      });
    }

    // Log successful super admin access
    console.log(`✅ SUPER ADMIN ACCESS GRANTED:`, {
      userId: user._id,
      userEmail: user.email,
      route: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Add user info to request for further processing
    req.superAdmin = {
      id: user._id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Super Admin middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication system error',
      code: 'AUTH_SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

// Double verification for critical operations
export const requireSuperAdminConfirmation = async (req, res, next) => {
  try {
    // This middleware should run after requireSuperAdmin
    if (!req.superAdmin) {
      return res.status(403).json({ 
        error: 'Super Admin verification required',
        code: 'SUPER_ADMIN_VERIFICATION_REQUIRED'
      });
    }

    // Additional verification for destructive operations
    const confirmationHeader = req.headers['x-super-admin-confirm'];
    if (!confirmationHeader || confirmationHeader !== 'confirmed') {
      return res.status(400).json({ 
        error: 'Super Admin confirmation required. Include X-Super-Admin-Confirm: confirmed header.',
        code: 'CONFIRMATION_REQUIRED'
      });
    }

    console.log(`🔐 SUPER ADMIN CRITICAL OPERATION CONFIRMED:`, {
      userId: req.superAdmin.id,
      userEmail: req.superAdmin.email,
      route: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    console.error('Super Admin confirmation middleware error:', error);
    return res.status(500).json({ 
      error: 'Confirmation system error',
      code: 'CONFIRMATION_SYSTEM_ERROR'
    });
  }
};

// Middleware to prevent any other role from accessing super admin routes
export const blockNonSuperAdmin = (req, res, next) => {
  // This is a safety net - should not be reached if auth is properly implemented
  if (req.user && req.user.role !== 'superAdmin') {
    console.error(`🚨 CRITICAL SECURITY VIOLATION - Non-super admin reached protected route:`, {
      userId: req.user.id,
      userRole: req.user.role,
      route: req.originalUrl,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(403).json({ 
      error: 'Access denied. Security violation logged.',
      code: 'SECURITY_VIOLATION',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Rate limiting for super admin operations
const rateLimitMap = new Map();

export const rateLimitSuperAdmin = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    if (!req.superAdmin) {
      return next();
    }

    const key = req.superAdmin.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (rateLimitMap.has(key)) {
      const requests = rateLimitMap.get(key).filter(time => time > windowStart);
      rateLimitMap.set(key, requests);
    }

    // Get current requests
    const currentRequests = rateLimitMap.get(key) || [];
    
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded for super admin operations',
        code: 'SUPER_ADMIN_RATE_LIMIT',
        resetTime: new Date(windowStart + windowMs).toISOString()
      });
    }

    // Add current request
    currentRequests.push(now);
    rateLimitMap.set(key, currentRequests);

    next();
  };
};