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

// Stats route with real database data
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

// Users route with real database data
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
    
    // Format users for admin panel
    const formattedUsers = users.map(user => ({
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
      lastActiveDate: user.businessMetrics?.lastActiveDate || user.createdAt,
      totalSales: user.businessMetrics?.totalSales || 0,
      totalTransactions: user.businessMetrics?.totalTransactions || 0,
      totalEmployees: user.employees?.length || 0,
      totalProducts: user.inventory?.length || 0
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

export default router;