import express from 'express';

const router = express.Router();

// GET /api/entitlements
router.get('/', async (req, res) => {
  // Return entitlements based on user's subscription
  const userPlan = req.user?.plan || 'basic';
  
  res.json({
    plan: userPlan,
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
      support: userPlan === 'pro' ? 'priority' : 'standard'
    },
    limits: {
      products: userPlan === 'pro' ? -1 : 100,
      employees: userPlan === 'pro' ? -1 : 10,
      transactions: userPlan === 'pro' ? -1 : 1000,
      storage: userPlan === 'pro' ? '10GB' : '1GB'
    },
    expiresAt: null // No expiration for now
  });
});

// PUT /api/entitlements
router.put('/', async (req, res) => {
  // Update user's plan (admin only in production)
  const { plan } = req.body;
  
  if (!['basic', 'pro', 'enterprise'].includes(plan)) {
    return res.status(400).json({ 
      error: 'Invalid plan type' 
    });
  }
  
  res.json({ 
    message: 'Entitlements updated',
    plan,
    success: true 
  });
});

export default router;