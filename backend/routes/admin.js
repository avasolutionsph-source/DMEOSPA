import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    console.log('📊 Getting admin stats...');
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    const planDistribution = await User.aggregate([
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }
    ]);
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email businessName createdAt');
    
    // Calculate revenue (assuming pro = ₱999)
    const proUsers = planDistribution.find(p => p._id === 'pro')?.count || 0;
    const totalRevenue = proUsers * 999;

    const stats = {
      totalUsers,
      activeUsers,
      planDistribution,
      recentUsers,
      totalRevenue
    };

    console.log('✅ Admin stats returned successfully');
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    console.log('👥 Getting admin users...');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments();
    const pages = Math.ceil(total / limit);

    console.log('✅ Admin users returned successfully:', users.length, 'users');
    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user subscription
router.put('/users/:userId/subscription', requireAdmin, async (req, res) => {
  try {
    const { plan, status, notes } = req.body;
    console.log('🔧 Admin updating user subscription:', req.params.userId, { plan, status });
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        subscriptionPlan: plan,
        subscriptionStatus: status,
        'businessMetrics.lastActiveDate': new Date()
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: `Subscription updated to ${plan} (${status})`,
      user: {
        id: user._id,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus
      }
    });
  } catch (error) {
    console.error('❌ Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

export default router;