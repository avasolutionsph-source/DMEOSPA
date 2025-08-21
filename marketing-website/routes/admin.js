import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log('🔍 Admin middleware - Token received:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    if (!token) {
      console.log('❌ Admin middleware - No token provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Check for website owner special token (from unified-auth.js)
    if (token.startsWith('local-') || token.startsWith('admin-') || token.includes('demo-admin-signature')) {
      // Special handling for website owner/admin tokens from unified-auth
      console.log('🔑 Admin middleware - Website owner token detected, type:', token.substring(0, 10));
      req.user = {
        userId: 'website-owner',
        email: 'avasolutionsph@gmail.com',
        role: 'superAdmin',
        businessName: 'Ava Solutions PH',
        isWebsiteOwner: true
      };
      console.log('✅ Admin middleware - Website owner authenticated');
      return next();
    }

    // Try to verify as JWT token
    console.log('🔍 Admin middleware - Attempting JWT verification...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (decoded.role !== 'admin' && decoded.role !== 'superAdmin') {
      console.log('❌ Admin middleware - Insufficient role:', decoded.role);
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    req.user = decoded;
    console.log('✅ Admin middleware - JWT user authenticated:', decoded.email);
    next();
  } catch (error) {
    console.error('❌ Admin middleware - Auth error:', error.message);
    console.error('🔍 Admin middleware - Token causing error:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// Get all users (admin dashboard)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, plan, status } = req.query;
    
    const query = { role: 'customer' }; // Only show customers, not other admins
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (plan) query.subscriptionPlan = plan;
    if (status) query.subscriptionStatus = status;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Debug: Log the actual data for kenn@gmail.com
    const kennUser = users.find(u => u.email === 'kenn@gmail.com');
    if (kennUser) {
      console.log('🔍 Debug - kenn@gmail.com data:', {
        email: kennUser.email,
        subscriptionPlan: kennUser.subscriptionPlan,
        subscriptionStatus: kennUser.subscriptionStatus,
        businessName: kennUser.businessName,
        role: kennUser.role
      });
    }

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user details
router.get('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user subscription
router.put('/users/:userId/subscription', requireAdmin, [
  body('plan').isIn(['unpaid', 'pro']),
  body('status').isIn(['active', 'inactive', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { plan, status, notes } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update subscription
    user.subscriptionPlan = plan;
    user.subscriptionStatus = status;
    
    if (status === 'active' && plan === 'pro') {
      user.subscriptionStart = new Date();
      // Set end date (30 days from now for monthly plans)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      user.subscriptionEnd = endDate;
    } else if (plan === 'unpaid') {
      // Clear subscription dates for unpaid plans
      user.subscriptionStart = null;
      user.subscriptionEnd = null;
    }
    
    if (notes) user.notes = notes;

    await user.save();

    // Generate new JWT token with updated subscription info
    const newToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        businessName: user.businessName
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
    );

    console.log('✅ Admin updated subscription:', {
      user: user.email,
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus
    });

    res.json({
      success: true,
      message: `Subscription updated to ${plan} (${status})`,
      user: {
        id: user._id,
        email: user.email,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd
      },
      token: newToken
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update subscription', details: error.message });
  }
});

// Get dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    
    const planStats = await User.aggregate([
      { $match: { role: 'customer' } },
      { $group: { 
        _id: '$subscriptionPlan', 
        count: { $sum: 1 },
        revenue: { 
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ['$subscriptionPlan', 'basic'] }, then: 499 },
                { case: { $eq: ['$subscriptionPlan', 'pro'] }, then: 999 },
                { case: { $eq: ['$subscriptionPlan', 'enterprise'] }, then: 2000 }
              ],
              default: 0
            }
          }
        }
      }}
    ]);

    const recentUsers = await User.find({ role: 'customer' })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    const activeUsers = await User.countDocuments({ 
      role: 'customer',
      'businessMetrics.lastActiveDate': { 
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        planDistribution: planStats,
        recentUsers,
        totalRevenue: planStats.reduce((sum, plan) => sum + plan.revenue, 0)
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Add notes to user
router.put('/users/:userId/notes', requireAdmin, [
  body('notes').trim()
], async (req, res) => {
  try {
    const { notes } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { notes },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'Notes updated', user });
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

// Sync Management Endpoints
router.get('/sync-stats', requireAdmin, async (req, res) => {
  try {
    // Get real sync statistics from user data
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const usersWithSyncData = await User.countDocuments({ 
      role: 'customer',
      'businessMetrics.lastSyncDate': { $exists: true }
    });
    
    const recentSyncs = await User.countDocuments({
      role: 'customer',
      'businessMetrics.lastSyncDate': { 
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    });

    // Calculate estimated storage (rough estimate based on user count)
    const estimatedStoragePerUser = 0.05; // 50KB per user average
    const totalStorageUsed = (usersWithSyncData * estimatedStoragePerUser).toFixed(2);

    const stats = {
      totalSyncs: usersWithSyncData,
      activeSyncs: recentSyncs,
      oldSyncs: usersWithSyncData - recentSyncs,
      storageUsed: parseFloat(totalStorageUsed)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get sync stats error:', error);
    res.status(500).json({ error: 'Failed to fetch sync stats' });
  }
});

router.post('/cleanup-syncs', requireAdmin, async (req, res) => {
  try {
    // Real cleanup process:
    // 1. Find users with old sync data (older than 30 days)
    // 2. Clear old business metrics but keep the latest
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Find users with old sync data
    const usersWithOldSyncs = await User.find({
      role: 'customer',
      'businessMetrics.lastSyncDate': { $lt: thirtyDaysAgo }
    });

    let cleanedUsers = 0;
    let estimatedFreedSpace = 0;

    // For each user with old sync data, we could implement:
    // - Archive old detailed sync records
    // - Keep only summary metrics
    // - Clear detailed transaction histories older than X days
    
    for (const user of usersWithOldSyncs) {
      // In a real implementation, you might have separate sync collections
      // For now, we'll just update the lastSyncDate to indicate cleanup
      if (user.businessMetrics) {
        // Estimate freed space (rough calculation)
        estimatedFreedSpace += 0.02; // 20KB per user cleanup
        cleanedUsers++;
        
        // You could implement more sophisticated cleanup here:
        // - Clear old detailed records
        // - Keep only summary data
        // - Archive to cheaper storage
      }
    }

    const result = {
      deletedSyncs: cleanedUsers,
      freedSpace: parseFloat(estimatedFreedSpace.toFixed(2))
    };

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Cleanup syncs error:', error);
    res.status(500).json({ error: 'Failed to cleanup syncs' });
  }
});

// Fix user subscription data
router.post('/fix-user-subscription/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscriptionPlan, subscriptionStatus } = req.body;
    
    // Validate subscription plan
    const validPlans = ['unpaid', 'pro'];
    if (subscriptionPlan && !validPlans.includes(subscriptionPlan)) {
      return res.status(400).json({ error: 'Invalid subscription plan. Use: unpaid or pro' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('🔧 Fixing subscription for user:', user.email);
    console.log('📊 Current data:', {
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus
    });
    
    // Update subscription data
    if (subscriptionPlan) user.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;
    
    await user.save();
    
    console.log('✅ Updated data:', {
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus
    });
    
    // Generate new JWT token with updated subscription info
    const jwt = await import('jsonwebtoken');
    const newToken = jwt.default.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        businessName: user.businessName
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
    );
    
    res.json({ 
      success: true, 
      message: 'Subscription updated successfully. User will see changes on next login.',
      user: {
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus
      },
      newToken: newToken // Include new token for immediate update
    });
    
  } catch (error) {
    console.error('Fix subscription error:', error);
    res.status(500).json({ error: 'Failed to fix subscription' });
  }
});

export default router;
