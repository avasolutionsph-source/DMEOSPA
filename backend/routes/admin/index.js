import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { requireSuperAdmin } from '../../middleware/superAdmin.js';
import dataRepairRouter from './dataRepair.js';

const router = express.Router();

// CRITICAL SECURITY: ALL admin routes require super admin authentication
router.use(authenticateJWT);
router.use(requireSuperAdmin);

// Super admin test route (PROTECTED)
router.get('/', (req, res) => {
  res.json({ 
    message: 'Super Admin API - SECURED',
    version: '2.0.0',
    status: 'available',
    superAdmin: req.superAdmin,
    timestamp: new Date().toISOString(),
    security: 'PROTECTED - Super Admin Only'
  });
});

// Super Admin Stats - ALL ACCOUNTS DATA (PROTECTED)
router.get('/stats', async (req, res) => {
  try {
    // Import User model
    const User = (await import('../../models/User.js')).default;
    
    // Get actual user statistics from database
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      subscriptionStatus: 'active'
    });
    
    // Get plan distribution
    const planDistribution = await User.aggregate([
      {
        $group: {
          _id: '$subscriptionPlan',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          plan: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Calculate total revenue
    const totalRevenue = await User.aggregate([
      {
        $group: {
          _id: null,
          revenue: { $sum: '$businessMetrics.totalSales' }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalRevenue: totalRevenue[0]?.revenue || 0,
        planDistribution
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics'
    });
  }
});

// Super Admin Users List - ALL USER ACCOUNTS (PROTECTED)
router.get('/users', async (req, res) => {
  try {
    // Import User model
    const User = (await import('../../models/User.js')).default;
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await User.countDocuments();
    
    // Fetch users with pagination (exclude password field)
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Format users for admin panel (keep it simple, detailed stats come from branch-data)
    const formattedUsers = users.map(user => ({
      _id: user._id,
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      businessName: user.businessName,
      phone: user.phone || '',
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role,
      createdAt: user.createdAt,
      lastActiveDate: user.businessMetrics?.lastActiveDate || user.createdAt
    }));
    
    res.json({
      success: true,
      users: formattedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Super Admin User Update - MODIFY ANY ACCOUNT (PROTECTED)
router.put('/users/:userId', async (req, res) => {
  try {
    // Import User model
    const User = (await import('../../models/User.js')).default;
    
    const { userId } = req.params;
    const { subscriptionPlan, subscriptionStatus, fullName, businessName } = req.body;
    
    // Validate the user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Build update object
    const updateData = {};
    if (subscriptionPlan) updateData.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
    if (fullName) updateData.firstName = fullName.split(' ')[0] || fullName;
    if (fullName) updateData.lastName = fullName.split(' ').slice(1).join(' ') || '';
    if (businessName) updateData.businessName = businessName;
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, select: '-password' }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`Admin updated user ${userId}:`, updateData);
    
    res.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Super Admin User Delete - DELETE ANY ACCOUNT (PROTECTED)
router.delete('/users/:userId', async (req, res) => {
  try {
    // Import User model
    const User = (await import('../../models/User.js')).default;
    
    const { userId } = req.params;
    
    // Validate the user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    // Delete the user
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log(`Admin deleted user ${userId}:`, deletedUser.email);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Admin user delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// Super Admin Branch Data Access - DETAILED USER BRANCH DATA (PROTECTED)
router.get('/users/:userId/branch-data', async (req, res) => {
  try {
    const User = (await import('../../models/User.js')).default;
    const { userId } = req.params;
    
    // Get complete user with all branch data
    const user = await User.findById(userId).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Log super admin access to specific user data
    console.log(`🔍 SUPER ADMIN BRANCH DATA ACCESS:`, {
      superAdminId: req.superAdmin.id,
      superAdminEmail: req.superAdmin.email,
      targetUserId: userId,
      targetUserEmail: user.email,
      targetBusinessName: user.businessName,
      dataAccessed: ['employees', 'inventory', 'businessMetrics'],
      timestamp: new Date().toISOString()
    });
    
    // Get real business stats from synced transaction data
    const Transaction = (await import('../../models/Transaction.js')).default;
    const Product = (await import('../../models/Product.js')).default;
    const Employee = (await import('../../models/Employee.js')).default;
    
    // Calculate real stats from synced data
    const transactions = await Transaction.find({ userId: userId.toString() });
    let totalSales = 0;
    let totalTransactions = transactions.length;
    
    // Time-based calculations
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);
    
    let todaySales = 0;
    let monthSales = 0;
    let yearSales = 0;
    let todayTransactions = 0;
    let monthTransactions = 0;
    let yearTransactions = 0;
    
    transactions.forEach(t => {
      const transactionTotal = t.total || 0;
      totalSales += transactionTotal;
      
      const transactionDate = new Date(t.date || t.createdAt);
      
      if (transactionDate >= today) {
        todaySales += transactionTotal;
        todayTransactions++;
      }
      
      if (transactionDate >= thisMonth) {
        monthSales += transactionTotal;
        monthTransactions++;
      }
      
      if (transactionDate >= thisYear) {
        yearSales += transactionTotal;
        yearTransactions++;
      }
    });
    
    // Get real counts from synced data
    const totalProducts = await Product.countDocuments({ userId: userId.toString() });
    const totalEmployees = await Employee.countDocuments({ userId: userId.toString() });
    
    // Get recent transactions (last 5)
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      .slice(0, 5)
      .map(t => ({
        id: t._id,
        total: t.total,
        date: t.date || t.createdAt,
        items: t.items,
        paymentMethod: t.paymentMethod
      }));

    // Return complete branch data with real synced stats
    const branchData = {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      },
      businessStats: {
        totalSales,
        totalTransactions,
        todaySales,
        todayTransactions,
        monthSales,
        monthTransactions,
        yearSales,
        yearTransactions
      },
      recentTransactions,
      productCount: totalProducts
    };
    
    res.json({
      success: true,
      branchData
    });
    
  } catch (error) {
    console.error('Super admin branch data access error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch data'
    });
  }
});

// Super Admin All Branches Overview (PROTECTED)
router.get('/all-branches-overview', async (req, res) => {
  try {
    const User = (await import('../../models/User.js')).default;
    
    // Get all users with their branch data
    const allUsers = await User.find({ role: { $in: ['branch', 'admin'] } })
      .select('-password')
      .sort({ 'businessMetrics.lastActiveDate': -1 })
      .lean();
    
    // Log super admin access to all branch data
    console.log(`🏢 SUPER ADMIN ALL BRANCHES ACCESS:`, {
      superAdminId: req.superAdmin.id,
      superAdminEmail: req.superAdmin.email,
      totalBranchesAccessed: allUsers.length,
      timestamp: new Date().toISOString()
    });
    
    // Summarize branch data
    const branchesOverview = allUsers.map(user => ({
      userId: user._id,
      businessName: user.businessName,
      ownerName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      role: user.role,
      totalSales: user.businessMetrics?.totalSales || 0,
      totalTransactions: user.businessMetrics?.totalTransactions || 0,
      totalEmployees: user.employees?.length || 0,
      totalProducts: user.inventory?.length || 0,
      lastActiveDate: user.businessMetrics?.lastActiveDate,
      lastSyncDate: user.businessMetrics?.lastSyncDate,
      createdAt: user.createdAt,
      status: user.businessMetrics?.lastActiveDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? 'Active' : 'Inactive'
    }));
    
    // Calculate totals across all branches
    const totals = {
      totalBranches: allUsers.length,
      totalRevenue: allUsers.reduce((sum, user) => sum + (user.businessMetrics?.totalSales || 0), 0),
      totalTransactions: allUsers.reduce((sum, user) => sum + (user.businessMetrics?.totalTransactions || 0), 0),
      totalEmployees: allUsers.reduce((sum, user) => sum + (user.employees?.length || 0), 0),
      totalProducts: allUsers.reduce((sum, user) => sum + (user.inventory?.length || 0), 0),
      activeBranches: branchesOverview.filter(branch => branch.status === 'Active').length
    };
    
    res.json({
      success: true,
      branchesOverview,
      totals
    });
    
  } catch (error) {
    console.error('Super admin all branches overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branches overview'
    });
  }
});

// Mount data repair routes
router.use('/data-repair', dataRepairRouter);

export default router;