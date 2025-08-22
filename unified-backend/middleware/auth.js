// Unified Authentication Middleware
// Consolidates auth logic from all three backends

import jwt from 'jsonwebtoken';
import passport from 'passport';
import logger from '../utils/logger.js';

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 */
export const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    businessId: user.businessId,
    role: user.role || 'user',
    subscriptionPlan: user.subscriptionPlan || 'free'
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'ava-solutions',
    audience: 'ava-solutions-apps'
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'ava-solutions',
      audience: 'ava-solutions-apps'
    });
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * JWT authentication middleware
 * Extracts and verifies JWT from Authorization header
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.id;
    req.businessId = decoded.businessId;
    
    // Log authentication
    logger.debug(`Authenticated user ${decoded.id} for ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    logger.error('JWT authentication error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional JWT authentication
 * Attempts to authenticate but doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
        req.userId = decoded.id;
        req.businessId = decoded.businessId;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}. Required: ${roles.join(', ')}`);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Subscription plan check middleware
 */
export const requireSubscription = (...plans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }
    
    const userPlan = req.user.subscriptionPlan || 'free';
    
    // Check if user's plan is in the allowed plans
    if (!plans.includes(userPlan)) {
      // Special case: higher plans include lower plan features
      const planHierarchy = ['free', 'basic', 'pro', 'enterprise'];
      const userPlanIndex = planHierarchy.indexOf(userPlan);
      const allowedPlanIndices = plans.map(p => planHierarchy.indexOf(p));
      const minRequiredIndex = Math.min(...allowedPlanIndices);
      
      if (userPlanIndex < minRequiredIndex) {
        logger.warn(`Subscription check failed for user ${req.user.id}. Has: ${userPlan}, Requires: ${plans.join(' or ')}`);
        return res.status(403).json({ 
          error: 'Upgrade required',
          code: 'SUBSCRIPTION_REQUIRED',
          required: plans,
          current: userPlan,
          upgrade_url: '/pricing'
        });
      }
    }
    
    next();
  };
};

/**
 * API key authentication for external services
 */
export const authenticateAPIKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        code: 'NO_API_KEY'
      });
    }
    
    // Validate API key (would typically check against database)
    const validKeys = (process.env.VALID_API_KEYS || '').split(',');
    if (!validKeys.includes(apiKey)) {
      logger.warn(`Invalid API key attempted: ${apiKey.substring(0, 8)}...`);
      return res.status(401).json({ 
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }
    
    // Set API key context
    req.apiKey = apiKey;
    req.isAPIRequest = true;
    
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Session-based authentication (for marketing website)
 */
export const requireSession = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // If it's an API request, return JSON error
  if (req.path.startsWith('/api')) {
    return res.status(401).json({ 
      error: 'Session required',
      code: 'NO_SESSION'
    });
  }
  
  // Otherwise redirect to login
  res.redirect('/login?returnUrl=' + encodeURIComponent(req.originalUrl));
};

/**
 * Passport authentication strategies wrapper
 */
export const passportAuth = (strategy, options = {}) => {
  return (req, res, next) => {
    passport.authenticate(strategy, options, (err, user, info) => {
      if (err) {
        logger.error(`Passport ${strategy} error:`, err);
        return res.status(500).json({ 
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
      
      if (!user) {
        return res.status(401).json({ 
          error: info?.message || 'Authentication failed',
          code: 'AUTH_FAILED'
        });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          logger.error('Session login error:', err);
          return res.status(500).json({ 
            error: 'Login error',
            code: 'LOGIN_ERROR'
          });
        }
        next();
      });
    })(req, res, next);
  };
};

/**
 * Rate limiting per user
 */
export const userRateLimit = (max = 100, windowMs = 60000) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    if (!req.user) return next();
    
    const key = req.user.id;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of attempts.entries()) {
      if (now - v.resetTime > windowMs) {
        attempts.delete(k);
      }
    }
    
    // Check rate limit
    const userAttempts = attempts.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (userAttempts.count >= max) {
      const retryAfter = Math.ceil((userAttempts.resetTime - now) / 1000);
      logger.warn(`Rate limit exceeded for user ${key}`);
      return res.status(429).json({ 
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter
      });
    }
    
    // Increment counter
    userAttempts.count++;
    attempts.set(key, userAttempts);
    
    next();
  };
};

/**
 * Business context middleware
 * Ensures user can only access their business data
 */
export const requireBusinessContext = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }
  
  // Admin users can access any business
  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
    // Allow specifying business via header or query
    req.businessId = req.headers['x-business-id'] || 
                     req.query.businessId || 
                     req.user.businessId;
    return next();
  }
  
  // Regular users can only access their own business
  if (!req.user.businessId) {
    return res.status(403).json({ 
      error: 'No business associated with user',
      code: 'NO_BUSINESS'
    });
  }
  
  req.businessId = req.user.businessId;
  next();
};

/**
 * Refresh token handling
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    // Verify refresh token (would typically check against database)
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || JWT_SECRET);
    
    // Generate new access token
    const newToken = generateToken(decoded);
    
    res.json({
      success: true,
      token: newToken,
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ 
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH'
    });
  }
};

export default {
  generateToken,
  verifyToken,
  authenticateJWT,
  optionalAuth,
  requireRole,
  requireSubscription,
  authenticateAPIKey,
  requireSession,
  passportAuth,
  userRateLimit,
  requireBusinessContext,
  refreshToken
};