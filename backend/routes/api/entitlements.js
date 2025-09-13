import express from 'express';

const router = express.Router();

// GET /api/entitlements
router.get('/', async (req, res) => {
  // Return all features enabled since no subscription system
  res.json({
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
      support: 'standard'
    },
    limits: {
      products: -1, // Unlimited
      employees: -1, // Unlimited
      transactions: -1, // Unlimited
      storage: 'unlimited'
    }
  });
});

// PUT /api/entitlements - No longer needed since no subscription system
router.put('/', async (req, res) => {
  res.json({ 
    message: 'All features are already enabled',
    success: true 
  });
});

export default router;