import express from 'express';

const router = express.Router();

// Get user profile
router.get('/profile', (req, res) => {
  // Simplified user profile for PWA
  res.json({
    success: true,
    user: {
      id: 'demo-user',
      email: 'demo@example.com',
      businessName: 'Demo Spa',
      subscriptionPlan: 'pro',
      subscriptionStatus: 'active'
    }
  });
});

// Update user profile
router.put('/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Profile updated successfully'
  });
});

export default router;
