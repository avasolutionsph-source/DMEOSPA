import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Centralized mock users data to ensure consistency
function getMockUsers() {
  return [
    {
      _id: '1',
      email: 'john.doe@spa.com',
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'Relaxing Spa',
      subscriptionPlan: 'pro',
      subscriptionStatus: 'active',
      createdAt: new Date('2024-01-15'),
      businessMetrics: { lastActiveDate: new Date() }
    },
    {
      _id: '2', 
      email: 'jane.smith@wellness.com',
      firstName: 'Jane',
      lastName: 'Smith',
      businessName: 'Wellness Center',
      subscriptionPlan: 'unpaid',
      subscriptionStatus: 'inactive',
      createdAt: new Date('2024-02-10'),
      businessMetrics: { lastActiveDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
    },
    {
      _id: '3',
      email: 'mike.johnson@massage.com', 
      firstName: 'Mike',
      lastName: 'Johnson',
      businessName: 'Professional Massage',
      subscriptionPlan: 'pro',
      subscriptionStatus: 'active',
      createdAt: new Date('2024-03-05'),
      businessMetrics: { lastActiveDate: new Date() }
    }
  ];
}

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log('🔍 PWA Admin middleware - Token received:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    if (!token) {
      console.log('❌ PWA Admin middleware - No token provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Check for website owner special token (from unified-auth.js)
    if (token.startsWith('local-') || token.startsWith('admin-') || token.includes('demo-admin-signature')) {
      // Special handling for website owner/admin tokens from unified-auth
      console.log('🔑 PWA Admin middleware - Website owner token detected, type:', token.substring(0, 10));
      req.user = {
        userId: 'website-owner',
        email: 'avasolutionsph@gmail.com',
        role: 'superAdmin',
        businessName: 'Ava Solutions PH',
        isWebsiteOwner: true
      };
      console.log('✅ PWA Admin middleware - Website owner authenticated');
      return next();
    }

    // Try to verify as JWT token
    console.log('🔍 PWA Admin middleware - Attempting JWT verification...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (decoded.role !== 'admin' && decoded.role !== 'superAdmin') {
      console.log('❌ PWA Admin middleware - Insufficient role:', decoded.role);
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    req.user = decoded;
    console.log('✅ PWA Admin middleware - JWT user authenticated:', decoded.email);
    next();
  } catch (error) {
    console.error('❌ PWA Admin middleware - Auth error:', error.message);
    console.error('🔍 PWA Admin middleware - Token causing error:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// Get dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    console.log('📊 Getting admin stats...');
    
    // Get mock users to calculate consistent stats
    const mockUsers = getMockUsers();
    const activeUsers = mockUsers.filter(u => u.subscriptionStatus === 'active').length;
    const proUsers = mockUsers.filter(u => u.subscriptionPlan === 'pro').length;
    const unpaidUsers = mockUsers.filter(u => u.subscriptionPlan === 'unpaid').length;
    
    const stats = {
      totalUsers: mockUsers.length, // Now calculated from actual mock data
      activeUsers: activeUsers,
      planDistribution: [
        { _id: 'pro', count: proUsers, revenue: proUsers * 999 },
        { _id: 'unpaid', count: unpaidUsers, revenue: 0 }
      ],
      recentUsers: [],
      totalRevenue: proUsers * 999
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

// Get all users (admin dashboard)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    console.log('👥 Getting admin users...');
    
    // Use centralized mock users function for consistency
    const users = getMockUsers();

    console.log('✅ Admin users returned successfully:', users.length, 'users');
    res.json({
      success: true,
      users,
      pagination: {
        page: 1,
        limit: 20,
        total: users.length,
        pages: 1
      }
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user subscription (placeholder)
router.put('/users/:userId/subscription', requireAdmin, async (req, res) => {
  try {
    const { plan, status, notes } = req.body;
    console.log('🔧 Admin updating user subscription:', req.params.userId, { plan, status });
    
    // Mock response for now
    res.json({
      success: true,
      message: `Subscription updated to ${plan} (${status})`,
      user: {
        id: req.params.userId,
        subscriptionPlan: plan,
        subscriptionStatus: status
      }
    });
  } catch (error) {
    console.error('❌ Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

export default router;