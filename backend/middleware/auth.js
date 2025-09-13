import jwt from 'jsonwebtoken';

// SECURITY FIX: Remove hardcoded fallback - fail securely if JWT_SECRET not set
if (!process.env.JWT_SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set. Application cannot start securely.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Authenticate JWT token
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 [AUTH] JWT Authentication Check:', {
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
    console.log('🚨 [AUTH] Development token blocked - use proper JWT authentication');
    return res.status(401).json({ error: 'Development tokens disabled for security' });
  }

  if (!token) {
    console.log('❌ [AUTH] No token provided - authentication required');
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ [AUTH] Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Normalize the user object to ensure consistency
    req.user = {
      ...user,
      id: user.id || user.userId || user._id
    };
    req.userId = req.user.id;
    console.log('✅ [AUTH] JWT token verified, user:', {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email
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
  console.log('🔒 [BUSINESS-USER-CHECK] Checking user:', {
    hasUser: !!req.user,
    userId: req.user?.id,
    role: req.user?.role,
    businessName: req.user?.businessName,
    email: req.user?.email
  });
  
  if (req.user && req.user.role === 'client') {
    console.log('❌ [BUSINESS-USER-CHECK] Client role blocked from PWA access');
    return res.status(403).json({ 
      error: 'Client accounts cannot access PWA features. Please use the marketing website for bookings.' 
    });
  }
  
  console.log('✅ [BUSINESS-USER-CHECK] Business user access granted');
  next();
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id || user._id,
      email: user.email,
      businessId: user.businessId,
      role: user.role || 'branch'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};