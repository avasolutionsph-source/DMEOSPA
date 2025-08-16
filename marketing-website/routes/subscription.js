import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Auth middleware
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user's subscription status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('subscriptionPlan subscriptionStatus subscriptionStart subscriptionEnd businessMetrics');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      subscription: {
        plan: user.subscriptionPlan,
        status: user.subscriptionStatus,
        startDate: user.subscriptionStart,
        endDate: user.subscriptionEnd,
        isActive: user.subscriptionStatus === 'active',
        daysRemaining: user.subscriptionEnd ? Math.max(0, Math.ceil((user.subscriptionEnd - new Date()) / (1000 * 60 * 60 * 24))) : null
      },
      features: getFeaturesByPlan(user.subscriptionPlan),
      businessMetrics: user.businessMetrics
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Get available plans
router.get('/plans', (req, res) => {
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      currency: 'PHP',
      interval: 'month',
      features: [
        'POS System',
        'Basic Dashboard',
        'Up to 50 transactions/month',
        'Basic reporting',
        'Email support'
      ],
      limits: {
        transactions: 50,
        products: 10,
        employees: 1
      }
    },
    basic: {
      name: 'Basic',
      price: 499,
      currency: 'PHP',
      interval: 'month',
      features: [
        'Everything in Free',
        'Unlimited transactions',
        'Inventory management',
        'Low stock alerts',
        'Cloud backup',
        'Advanced reporting',
        'Priority email support'
      ],
      limits: {
        transactions: -1, // unlimited
        products: 100,
        employees: 5
      }
    },
    pro: {
      name: 'Pro',
      price: 999,
      currency: 'PHP',
      interval: 'month',
      popular: true,
      features: [
        'Everything in Basic',
        'Employee management',
        'Commission tracking',
        'AI business assistant',
        'Advanced analytics',
        'Custom reports',
        'Multi-user access',
        'Phone support',
        'Priority features'
      ],
      limits: {
        transactions: -1, // unlimited
        products: 500,
        employees: 20
      }
    },
    enterprise: {
      name: 'Enterprise',
      price: 'Custom',
      currency: 'PHP',
      interval: 'month',
      features: [
        'Everything in Pro',
        'Multiple locations',
        'Custom integrations',
        'Advanced security',
        'Dedicated support',
        'Training & onboarding',
        'Custom features',
        'SLA guarantee',
        'Account manager'
      ],
      limits: {
        transactions: -1, // unlimited
        products: -1, // unlimited
        employees: -1 // unlimited
      }
    }
  };

  res.json({ success: true, plans });
});

// Helper function to get features by plan
function getFeaturesByPlan(plan) {
  const features = {
    free: {
      pos: true,
      dashboard: 'basic',
      transactions: 50,
      inventory: false,
      employees: false,
      aiAssistant: false,
      analytics: 'basic',
      support: 'email'
    },
    basic: {
      pos: true,
      dashboard: 'advanced',
      transactions: -1, // unlimited
      inventory: true,
      employees: false,
      aiAssistant: false,
      analytics: 'advanced',
      support: 'priority-email'
    },
    pro: {
      pos: true,
      dashboard: 'advanced',
      transactions: -1, // unlimited
      inventory: true,
      employees: true,
      aiAssistant: true,
      analytics: 'advanced',
      support: 'phone-email'
    },
    enterprise: {
      pos: true,
      dashboard: 'advanced',
      transactions: -1, // unlimited
      inventory: true,
      employees: true,
      aiAssistant: true,
      analytics: 'custom',
      support: 'dedicated'
    }
  };

  return features[plan] || features.free;
}

// Update business metrics (called by PWA backend)
router.post('/metrics', requireAuth, async (req, res) => {
  try {
    const { totalSales, totalTransactions, totalProducts, totalEmployees } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update business metrics
    user.businessMetrics = {
      ...user.businessMetrics,
      totalSales: totalSales || user.businessMetrics.totalSales,
      totalTransactions: totalTransactions || user.businessMetrics.totalTransactions,
      totalProducts: totalProducts || user.businessMetrics.totalProducts,
      totalEmployees: totalEmployees || user.businessMetrics.totalEmployees,
      lastSyncDate: new Date(),
      lastActiveDate: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'Business metrics updated',
      metrics: user.businessMetrics
    });
  } catch (error) {
    console.error('Update metrics error:', error);
    res.status(500).json({ error: 'Failed to update business metrics' });
  }
});

export default router;
