import express from 'express';

const router = express.Router();

// Simple test route (no auth, no dependencies)
router.get('/', (req, res) => {
  res.json({ 
    message: 'Admin API - Simplified',
    version: '1.0.0',
    status: 'available',
    timestamp: new Date().toISOString()
  });
});

// Simple stats route (no auth for testing)
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      planDistribution: []
    }
  });
});

// Simple users route (no auth for testing)
router.get('/users', (req, res) => {
  res.json({
    success: true,
    users: [],
    total: 0,
    message: 'Simplified admin router working'
  });
});

export default router;