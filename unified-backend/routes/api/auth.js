import express from 'express';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  res.json({ 
    message: 'User registration placeholder',
    success: true 
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // For now, return a mock user with subscription plan
  // In production, this would verify credentials and fetch from database
  const mockUser = {
    id: 'user-123',
    email: email || 'user@example.com',
    name: 'John Doe',
    businessId: 'business-123',
    subscriptionPlan: 'pro', // This should come from database
    plan: 'pro'
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
      name: mockUser.name,
      subscriptionPlan: mockUser.subscriptionPlan,
      plan: mockUser.plan
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

export default router;