import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  logger.error('CRITICAL: JWT_SECRET environment variable not set.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Authenticate employee JWT token
export const authenticateEmployee = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  logger.debug('[EMPLOYEE AUTH] Authentication Check:', {
    endpoint: req.originalUrl,
    method: req.method,
    hasAuthHeader: !!authHeader,
    hasToken: !!token
  });

  if (!token) {
    logger.debug('[EMPLOYEE AUTH] No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.debug('[EMPLOYEE AUTH] Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Check if it's an employee token
    if (user.type !== 'employee') {
      logger.debug('[EMPLOYEE AUTH] Not an employee token');
      return res.status(403).json({ error: 'Employee authentication required' });
    }
    
    // Normalize the user object for employee context
    req.user = {
      ...user,
      id: user.employeeId || user.id,
      isEmployee: true
    };
    
    // Add branch context
    req.branchId = user.branchId;
    req.userId = user.userId; // Original branch owner ID for data queries
    
    logger.debug('[EMPLOYEE AUTH] Token verified:', {
      employeeId: req.user.id,
      role: req.user.role,
      branchId: req.branchId,
      permissions: req.user.permissions
    });
    
    next();
  });
};

// Authenticate either employee or owner
export const authenticateEmployeeOrOwner = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Handle both employee and owner tokens
    if (user.type === 'employee') {
      req.user = {
        ...user,
        id: user.employeeId || user.id,
        isEmployee: true
      };
      req.branchId = user.branchId;
      req.userId = user.userId; // Original branch owner ID
    } else {
      // Owner token
      req.user = {
        ...user,
        id: user.id || user.userId || user._id,
        isEmployee: false
      };
      req.userId = req.user.id;
      req.branchId = user.id; // Owner is the branch
    }
    
    logger.debug('[AUTH] Token verified:', {
      id: req.user.id,
      role: req.user.role,
      isEmployee: req.user.isEmployee
    });
    
    next();
  });
};

// Require specific employee roles
export const requireEmployeeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.isEmployee) {
      return res.status(403).json({ 
        error: 'Employee access required' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('[EMPLOYEE AUTH] Role not authorized:', {
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.originalUrl
      });
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    next();
  };
};

// Check specific permission
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Owners have all permissions
    if (!req.user.isEmployee || req.user.role === 'owner') {
      return next();
    }
    
    const permissions = req.user.permissions || [];
    
    // Check for wildcard permissions
    if (permissions.includes('*')) {
      return next();
    }
    
    // Check for read/write wildcard
    const [action] = permission.split(':');
    if (permissions.includes(`${action}:*`)) {
      return next();
    }
    
    // Check specific permission
    if (!permissions.includes(permission)) {
      logger.warn('[EMPLOYEE AUTH] Permission denied:', {
        requiredPermission: permission,
        userPermissions: permissions,
        role: req.user.role
      });
      return res.status(403).json({ 
        error: `Permission denied: ${permission}` 
      });
    }
    
    next();
  };
};

// Enforce read-only for manager role
export const enforceReadOnly = (req, res, next) => {
  if (!req.user || !req.user.isEmployee) {
    return next();
  }
  
  if (req.user.role === 'manager' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    logger.warn('[EMPLOYEE AUTH] Manager attempted write operation:', {
      method: req.method,
      endpoint: req.originalUrl
    });
    return res.status(403).json({ 
      error: 'Managers have read-only access for safety precaution' 
    });
  }
  
  next();
};

// Filter data for therapist roles (personal data only)
export const filterTherapistData = (req, res, next) => {
  if (!req.user || !req.user.isEmployee) {
    return next();
  }
  
  const therapistRoles = ['senior_therapist', 'junior_therapist', 'new_therapist'];
  
  if (therapistRoles.includes(req.user.role)) {
    // Add filter to request for personal data only
    req.personalDataOnly = true;
    req.employeeId = req.user.id;
    
    logger.debug('[EMPLOYEE AUTH] Therapist data filter applied:', {
      role: req.user.role,
      employeeId: req.employeeId
    });
  }
  
  next();
};

// Attach branch context to all requests
export const attachBranchContext = (req, res, next) => {
  if (req.user) {
    if (req.user.isEmployee) {
      req.branchContext = {
        branchId: req.branchId,
        userId: req.userId, // Original owner ID for data queries
        employeeId: req.user.id,
        role: req.user.role,
        isEmployee: true
      };
    } else {
      req.branchContext = {
        branchId: req.user.id,
        userId: req.user.id,
        role: req.user.role || 'owner',
        isEmployee: false
      };
    }
    
    logger.debug('[BRANCH CONTEXT] Attached:', req.branchContext);
  }
  
  next();
};