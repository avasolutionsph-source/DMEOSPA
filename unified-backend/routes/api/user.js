import express from 'express';

const router = express.Router();

// GET /api/user/profile
router.get('/profile', async (req, res) => {
  // Get user from request (set by auth middleware)
  const userId = req.userId || 'placeholder-id';
  
  res.json({ 
    message: 'User profile',
    user: {
      id: userId,
      email: req.user?.email || 'user@example.com',
      name: req.user?.name || 'John Doe',
      subscriptionPlan: req.user?.subscriptionPlan || 'pro',
      plan: req.user?.plan || 'pro'
    }
  });
});

// PUT /api/user/profile
router.put('/profile', async (req, res) => {
  res.json({ 
    message: 'Profile updated placeholder',
    success: true 
  });
});

// DELETE /api/user/account
router.delete('/account', async (req, res) => {
  res.json({ 
    message: 'Account deletion placeholder',
    success: true 
  });
});

// GET /api/user/preferences
router.get('/preferences', async (req, res) => {
  res.json({ 
    message: 'User preferences placeholder',
    preferences: {}
  });
});

// PUT /api/user/preferences
router.put('/preferences', async (req, res) => {
  res.json({ 
    message: 'Preferences updated placeholder',
    success: true 
  });
});

// GET /api/user/subscription
router.get('/subscription', async (req, res) => {
  // Get user's subscription plan from JWT or database
  const plan = req.user?.subscriptionPlan || req.user?.plan || 'pro';
  
  res.json({
    success: true,
    subscription: {
      plan: plan,
      subscriptionPlan: plan,
      status: 'active',
      features: {
        pos: true,
        inventory: true,
        employees: true,
        rooms: true,
        'gift-certificates': true,
        analytics: true,
        chatbot: true,
        cloudBackup: true,
        dashboard: 'full',
        multiUser: true,
        support: plan === 'pro' ? 'priority' : 'standard'
      },
      limits: {
        products: plan === 'pro' ? -1 : 100,
        employees: plan === 'pro' ? -1 : 10,
        transactions: plan === 'pro' ? -1 : 1000,
        storage: plan === 'pro' ? '10GB' : '1GB'
      },
      expiresAt: null
    }
  });
});

export default router;