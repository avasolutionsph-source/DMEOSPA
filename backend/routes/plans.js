import express from 'express';
import { protect } from '../middleware/auth.js';
import { getPlanStatus } from '../middleware/planLimits.js';
import User from '../models/User.js';

const router = express.Router();

// Get current plan status and usage
router.get('/status', protect, getPlanStatus);

// Get available plans with pricing
router.get('/available', (req, res) => {
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 999,
      currency: 'PHP',
      interval: 'month',
      description: 'Perfect for small spas getting started',
      features: [
        'Point of Sale System',
        'Basic Inventory Management',
        'Up to 50 customers',
        'Basic Reporting',
        'Email Support',
        '1 User Account'
      ],
      limits: {
        maxCustomers: 50,
        maxEmployees: 1,
        maxProducts: 20,
        maxBookingsPerMonth: 100,
        maxStorageGB: 1,
        allowsOnlineBooking: false,
        allowsAdvancedReports: false,
        allowsAIInsights: false,
        allowsMobileApp: false
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 1999,
      currency: 'PHP',
      interval: 'month',
      description: 'Everything you need to grow your business',
      popular: true,
      features: [
        'Everything in Starter',
        'Online Booking System',
        'Advanced Analytics',
        'Unlimited Customers',
        'Staff Management',
        'Up to 5 User Accounts',
        'Phone & Email Support',
        'Mobile App Access'
      ],
      limits: {
        maxCustomers: -1,
        maxEmployees: 5,
        maxProducts: -1,
        maxBookingsPerMonth: -1,
        maxStorageGB: 10,
        allowsOnlineBooking: true,
        allowsAdvancedReports: true,
        allowsAIInsights: false,
        allowsMobileApp: true
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 3999,
      currency: 'PHP',
      interval: 'month',
      description: 'Advanced features for growing businesses',
      features: [
        'Everything in Professional',
        'AI-Powered Insights',
        'Custom Integrations',
        'Unlimited User Accounts',
        'Priority Support',
        'Dedicated Account Manager',
        'Advanced Security Features',
        'White-label Options'
      ],
      limits: {
        maxCustomers: -1,
        maxEmployees: -1,
        maxProducts: -1,
        maxBookingsPerMonth: -1,
        maxStorageGB: 100,
        allowsOnlineBooking: true,
        allowsAdvancedReports: true,
        allowsCustomIntegrations: true,
        allowsAIInsights: true,
        allowsMultiLocation: true,
        allowsPrioritySupport: true,
        allowsWhiteLabel: true,
        allowsMobileApp: true
      }
    }
  ];

  res.json({
    success: true,
    plans
  });
});

// Check if user can perform specific action
router.post('/check-limit', protect, async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action parameter required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const actionCheck = user.canPerformAction(action, req.body);
    
    res.json({
      success: true,
      allowed: actionCheck.allowed,
      reason: actionCheck.reason,
      planLimits: user.planLimits,
      currentUsage: user.currentUsage
    });
  } catch (error) {
    console.error('Error checking plan limit:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update usage manually (for testing or corrections)
router.post('/update-usage', protect, async (req, res) => {
  try {
    const { type, count } = req.body;
    
    if (!type || count === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Type and count parameters required'
      });
    }

    const validTypes = ['customersCount', 'employeesCount', 'productsCount', 'bookingsThisMonth', 'storageUsedGB'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid usage type'
      });
    }

    const updateQuery = {
      [`currentUsage.${type}`]: count,
      'currentUsage.lastUpdated': new Date()
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateQuery },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Usage updated successfully',
      currentUsage: user.currentUsage
    });
  } catch (error) {
    console.error('Error updating usage:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;