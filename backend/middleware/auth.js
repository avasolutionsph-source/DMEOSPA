import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

// SECURITY FIX: Remove hardcoded fallback - fail securely if JWT_SECRET not set
if (!process.env.JWT_SECRET) {
  logger.error('CRITICAL: JWT_SECRET environment variable not set. Application cannot start securely.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Authenticate JWT token
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  logger.debug('[AUTH] JWT Authentication Check:', {
    endpoint: req.originalUrl,
    method: req.method,
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenType: token ? (token.startsWith('dev-token-') ? 'DEVELOPMENT' : 'PRODUCTION') : 'NONE',
    tokenPreview: token ? token.substring(0, 30) + '...' : 'NONE'
  });

  // SECURITY FIX: Removed development token bypass - all tokens must be properly signed JWT
  // Development tokens allowed cross-user data contamination by accepting any dev-token-*
  if (token && token.startsWith('dev-token-')) {
    logger.warn('[AUTH] Development token blocked - use proper JWT authentication');
    return res.status(401).json({ error: 'Development tokens disabled for security' });
  }

  if (!token) {
    logger.debug('[AUTH] No token provided - authentication required');
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.debug('[AUTH] Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Normalize the user object to ensure consistency
    req.user = {
      ...user,
      id: user.id || user.userId || user._id,
      isEmployee: user.type === 'employee' // Set isEmployee flag for employee tokens
    };
    
    // MANAGER FIX: Give managers same access as owners
    // For employees (including managers), use the branch owner's ID for data access
    if (req.user.isEmployee || user.type === 'employee') {
      req.userId = user.userId || user.branchOwnerId || req.user.id; // Use branch owner's ID
      
      // For managers specifically, treat them like owners
      if (user.role === 'manager') {
        req.user.id = user.userId || user.branchOwnerId || req.user.id;
        req.userId = req.user.id;
        // Don't set isEmployee flag for managers to give them full access
        req.user.isEmployee = false;
      }
    } else {
      req.userId = req.user.id;
    }
    
    logger.debug('[AUTH] JWT token verified, user:', {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email,
      isEmployee: req.user.isEmployee,
      userId: req.userId,
      isManager: req.user.role === 'manager'
    });
    next();
  });
};

// Optional authentication - continues even without token
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
      req.userId = user.id || user.userId || user._id || user.user_id;
    }
    next();
  });
};

// Require business context for operations
export const requireBusinessContext = (req, res, next) => {
  // For now, set a default business ID if not present
  // In production, this would come from the user's business association
  if (!req.businessId) {
    req.businessId = req.user?.businessId || 'default-business';
  }
  next();
};

// Verify token helper function
export const verifyToken = (token) => {
  try {
    // Synchronous version for immediate return
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
};

// Async version of verify token (returns promise)
export const verifyTokenAsync = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

// Block client role access to PWA endpoints
export const requireBusinessUser = (req, res, next) => {
  logger.debug('[BUSINESS-USER-CHECK] Checking user:', {
    hasUser: !!req.user,
    userId: req.user?.id,
    role: req.user?.role,
    businessName: req.user?.businessName,
    email: req.user?.email
  });
  
  if (req.user && req.user.role === 'client') {
    logger.info('[BUSINESS-USER-CHECK] Client role blocked from PWA access');
    return res.status(403).json({ 
      error: 'Client accounts cannot access PWA features. Please use the marketing website for bookings.' 
    });
  }
  
  logger.debug('[BUSINESS-USER-CHECK] Business user access granted');
  next();
};

// Generate JWT token
export const generateToken = (user) => {
  // Pass through all user properties for employee tokens
  const tokenPayload = { 
    id: user.id || user._id,
    email: user.email,
    businessId: user.businessId,
    role: user.role || 'branch'
  };
  
  // Include additional fields for employee tokens
  if (user.type === 'employee') {
    tokenPayload.type = 'employee';
    tokenPayload.employeeId = user.employeeId;
    tokenPayload.userId = user.userId; // Branch owner ID for data access
    tokenPayload.branchId = user.branchId;
    tokenPayload.branchName = user.branchName;
    tokenPayload.permissions = user.permissions;
  }
  
  // Include name fields if available
  if (user.firstName) tokenPayload.firstName = user.firstName;
  if (user.lastName) tokenPayload.lastName = user.lastName;
  
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
};