import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticateJWT);

// GET /api/user/profile - Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        phone: user.phone,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// PUT /api/user/update - Update user profile
router.put('/update', async (req, res) => {
  try {
    const { firstName, lastName, businessName, phone } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (businessName) user.businessName = businessName;
    if (phone) user.phone = phone;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        phone: user.phone
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// GET /api/user/subscription - Get subscription status
router.get('/subscription', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('subscriptionPlan subscriptionStatus subscriptionStart subscriptionEnd email businessName role');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      subscriptionPlan: user.subscriptionPlan,
      plan: user.subscriptionPlan, // For backward compatibility
      subscriptionStatus: user.subscriptionStatus || 'active',
      subscriptionStart: user.subscriptionStart,
      subscriptionEnd: user.subscriptionEnd,
      email: user.email,
      businessName: user.businessName,
      role: user.role
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status'
    });
  }
});

// POST /api/user/subscription/update - Update subscription (admin only)
router.post('/subscription/update', async (req, res) => {
  try {
    const { userId, plan } = req.body;
    
    // Check if requesting user is admin
    const requestingUser = await User.findById(req.userId);
    if (requestingUser.role !== 'superAdmin' && requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const user = await User.findById(userId || req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update subscription plan
    const validPlans = ['unpaid', 'basic', 'professional', 'enterprise'];
    if (validPlans.includes(plan)) {
      user.subscriptionPlan = plan;
      user.subscriptionStatus = 'active';
      user.subscriptionStart = new Date();
      
      // Set subscription end date (1 year from now for paid plans)
      if (plan !== 'unpaid') {
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        user.subscriptionEnd = endDate;
      }
      
      await user.save();
      
      res.json({
        success: true,
        message: 'Subscription updated successfully',
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid subscription plan'
      });
    }
  } catch (error) {
    logger.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription'
    });
  }
});

// GET /api/user/settings - Get user settings
router.get('/settings', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('settings emailNotifications pushNotifications');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      settings: user.settings || {},
      emailNotifications: user.emailNotifications !== false,
      pushNotifications: user.pushNotifications !== false
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settings'
    });
  }
});

// PUT /api/user/settings - Update user settings
router.put('/settings', async (req, res) => {
  try {
    const { settings, emailNotifications, pushNotifications } = req.body;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update settings
    if (settings) user.settings = settings;
    if (typeof emailNotifications === 'boolean') user.emailNotifications = emailNotifications;
    if (typeof pushNotifications === 'boolean') user.pushNotifications = pushNotifications;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings || {},
      emailNotifications: user.emailNotifications,
      pushNotifications: user.pushNotifications
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

export default router;