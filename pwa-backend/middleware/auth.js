import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { 
      id: decoded.sub, 
      email: decoded.email,
      role: decoded.role || 'user',
      plan: decoded.plan || 'free'
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Optional auth - doesn't fail if no token
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { 
        id: decoded.sub, 
        email: decoded.email,
        role: decoded.role || 'user',
        plan: decoded.plan || 'free'
      };
    } catch (error) {
      // Invalid token, but continue without user
      req.user = null;
    }
  }
  
  next();
}
