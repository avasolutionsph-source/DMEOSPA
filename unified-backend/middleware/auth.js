import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Authenticate JWT token
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    req.userId = user.id || user.userId;
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
      req.userId = user.id || user.userId;
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
    console.error('Token verification failed:', err.message);
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

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id || user._id,
      email: user.email,
      businessId: user.businessId,
      subscriptionPlan: user.subscriptionPlan || user.plan || 'basic',
      plan: user.subscriptionPlan || user.plan || 'basic', // Include both for compatibility
      entitlements: {
        plan: user.subscriptionPlan || user.plan || 'basic'
      }
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};