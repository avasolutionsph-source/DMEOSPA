import express from 'express';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, businessName, phone, plan } = req.body;
  
  // Validate plan name - support new 4-tier system
  const validPlans = ['unpaid', 'basic', 'professional', 'enterprise'];
  const subscriptionPlan = validPlans.includes(plan) ? plan : 'unpaid';
  
  // Mock user creation (in production, save to database)
  const mockUser = {
    id: 'user-' + Date.now(),
    email: email || 'user@example.com',
    firstName: firstName || 'John',
    lastName: lastName || 'Doe',
    businessName: businessName || 'My Business',
    phone: phone || '',
    subscriptionPlan: subscriptionPlan,
    plan: subscriptionPlan, // For backward compatibility
    role: 'customer'
  };
  
  // Import generateToken from auth middleware
  const { generateToken } = await import('../../middleware/auth.js');
  const token = generateToken(mockUser);
  
  res.json({ 
    success: true,
    message: 'User registration successful',
    token,
    user: {
      id: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      businessName: mockUser.businessName,
      subscriptionPlan: mockUser.subscriptionPlan,
      plan: mockUser.plan
    }
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Mock user with proper subscription plan based on email
  // In production, this would verify credentials and fetch from database
  let subscriptionPlan = 'unpaid';
  
  // Demo accounts with different plans for testing
  if (email === 'basic@demo.com') {
    subscriptionPlan = 'basic';
  } else if (email === 'pro@demo.com' || email === 'professional@demo.com') {
    subscriptionPlan = 'professional';
  } else if (email === 'enterprise@demo.com') {
    subscriptionPlan = 'enterprise';
  } else if (email === 'admin@demo.com' || email === 'avasolutionsph@gmail.com') {
    subscriptionPlan = 'enterprise'; // Admins get enterprise features
  }
  
  const mockUser = {
    id: 'user-123',
    email: email || 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    businessName: 'Demo Business',
    businessId: 'business-123',
    subscriptionPlan: subscriptionPlan,
    plan: subscriptionPlan, // For backward compatibility
    role: email === 'avasolutionsph@gmail.com' ? 'superAdmin' : 'customer'
  };
  
  // Import generateToken from auth middleware
  const { generateToken } = await import('../../middleware/auth.js');
  const token = generateToken(mockUser);
  
  res.json({ 
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      businessName: mockUser.businessName,
      subscriptionPlan: mockUser.subscriptionPlan,
      plan: mockUser.plan,
      role: mockUser.role
    }
  });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.json({ 
    message: 'User logout placeholder',
    success: true 
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  res.json({ 
    message: 'Token refresh placeholder',
    token: 'new-placeholder-jwt-token',
    success: true 
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  res.json({ 
    message: 'Password reset email sent placeholder',
    success: true 
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  res.json({ 
    message: 'Password reset placeholder',
    success: true 
  });
});

// GET /api/auth/subscription - Check current subscription status
router.get('/subscription', async (req, res) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'No token provided',
      success: false 
    });
  }

  const token = authHeader.substring(7);
  
  try {
    // Import verifyToken from auth middleware
    const { verifyToken } = await import('../../middleware/auth.js');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid token',
        success: false 
      });
    }
    
    // Return subscription information
    res.json({ 
      success: true,
      subscriptionPlan: decoded.subscriptionPlan || decoded.plan || 'unpaid',
      plan: decoded.subscriptionPlan || decoded.plan || 'unpaid',
      email: decoded.email,
      businessName: decoded.businessName,
      role: decoded.role || 'customer'
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(401).json({ 
      error: 'Failed to verify subscription',
      success: false 
    });
  }
});

export default router;