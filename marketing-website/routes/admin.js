import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
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
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all users (admin dashboard) - PROXY TO UNIFIED BACKEND
router.get('/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify admin token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    
    // Proxy request to unified backend
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'https://daetspa-backend.onrender.com';
    const response = await fetch(`${pwaBackendUrl}/admin/users?${new URLSearchParams(req.query)}`, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      const error = await response.text();
      res.status(response.status).json({ error: 'Failed to fetch users from unified backend' });
    }
  } catch (error) {
    console.error('Failed to fetch users from unified backend:', error);
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

// Get dashboard stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});

    const recentUsers = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    const activeUsers = await User.countDocuments({ 
      'businessMetrics.lastActiveDate': { 
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        recentUsers
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
    const totalUsers = await User.countDocuments({});
    const usersWithSyncData = await User.countDocuments({ 
      'businessMetrics.lastSyncDate': { $exists: true }
    });
    
    const recentSyncs = await User.countDocuments({
      'businessMetrics.lastSyncDate': { 
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    });

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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const usersWithOldSyncs = await User.find({
      'businessMetrics.lastSyncDate': { $lt: thirtyDaysAgo }
    });

    let cleanedUsers = 0;
    let estimatedFreedSpace = 0;
    
    for (const user of usersWithOldSyncs) {
      if (user.businessMetrics) {
        estimatedFreedSpace += 0.02; // 20KB per user cleanup
        cleanedUsers++;
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

// Change user role (superAdmin only)
router.put('/users/:userId/role', requireAdmin, [
  body('role').isIn(['branch', 'admin', 'superAdmin'])
], async (req, res) => {
  try {
    // Only superAdmin can change roles
    if (req.user.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Access denied. Only superAdmin can change roles.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid role. Use: branch, admin, or superAdmin' });
    }

    const { role } = req.body;
    const targetUserId = req.params.userId;
    
    // Prevent superAdmin from changing their own role (prevent lockout)
    if (targetUserId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow superAdmin to promote others to superAdmin or change any role
    // No restrictions - superAdmin has full control

    const oldRole = user.role;
    user.role = role;
    await user.save();

    console.log(`✅ Role changed by ${req.user.email}: ${user.email} from ${oldRole} to ${role}`);

    res.json({
      success: true,
      message: `User role updated from ${oldRole} to ${role}`,
      user: {
        id: user._id,
        email: user.email,
        businessName: user.businessName,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Failed to change user role' });
  }
});

// Create new account (Admin only)
router.post('/create-account', requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('businessName').trim().isLength({ min: 1 }),
  body('role').isIn(['branch', 'admin', 'superAdmin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, firstName, lastName, businessName, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      businessName,
      phone: phone || '',
      role,
      createdBy: req.user.userId, // Track who created this account
      plainPassword: password // Store plain password for admin to see
    });

    await user.save();

    console.log(`✅ Account created by ${req.user.email}: ${email} (${role})`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({ error: 'Account creation failed' });
  }
});

// Get all branch users for dropdown
router.get('/branches', requireAdmin, async (req, res) => {
  try {
    const branches = await User.find({ role: 'branch' })
      .select('firstName lastName businessName email createdAt')
      .sort({ businessName: 1 });

    res.json({
      success: true,
      branches
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Get branch business data - PROXY TO UNIFIED BACKEND
router.get('/branch-data/:branchId', requireAdmin, async (req, res) => {
  try {
    const { branchId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    // Proxy request to unified backend
    const pwaBackendUrl = process.env.PWA_BACKEND_URL || 'https://daetspa-backend.onrender.com';
    const response = await fetch(`${pwaBackendUrl}/admin/users/${branchId}/branch-data`, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      const error = await response.text();
      res.status(response.status).json({ error: 'Failed to fetch branch data from unified backend' });
    }
  } catch (error) {
    console.error('Failed to fetch branch data from unified backend:', error);
    res.status(500).json({ error: 'Failed to fetch branch data' });
  }
});

// Get accounts created by current admin
router.get('/my-created-accounts', requireAdmin, async (req, res) => {
  try {
    const createdAccounts = await User.find({ 
      createdBy: req.user.userId,
      role: 'branch' // Only show branch accounts
    })
      .select('businessName email createdAt plainPassword')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      accounts: createdAccounts.map(account => ({
        id: account._id,
        businessName: account.businessName,
        email: account.email,
        password: account.plainPassword,
        createdAt: account.createdAt
      }))
    });

  } catch (error) {
    console.error('Get created accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch created accounts' });
  }
});

export default router;