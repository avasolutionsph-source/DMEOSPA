import express from 'express';
import User from '../../models/User.js';

const router = express.Router();

// GET /admin/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Fetch real statistics from MongoDB
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ subscriptionStatus: 'active' });
    
    // Calculate plan distribution
    const planDistribution = await User.aggregate([
      {
        $group: {
          _id: '$subscriptionPlan',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Calculate total revenue (simple calculation based on plan counts)
    let totalRevenue = 0;
    const planPrices = {
      unpaid: 0,
      basic: 1500,
      professional: 3500,
      enterprise: 7500
    };
    
    for (const plan of planDistribution) {
      totalRevenue += (planPrices[plan._id] || 0) * plan.count;
    }
    
    // Ensure all plans are represented
    const allPlans = ['unpaid', 'basic', 'professional', 'enterprise'];
    const fullDistribution = allPlans.map(plan => {
      const found = planDistribution.find(p => p._id === plan);
      return { _id: plan, count: found ? found.count : 0 };
    });

    const stats = {
      totalUsers,
      activeUsers,
      totalRevenue,
      planDistribution: fullDistribution
    };

    res.json({ 
      success: true,
      stats 
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics' 
    });
  }
});

// GET /admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    // Fetch real users from MongoDB
    const users = await User.find({})
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 }) // Most recent first
      .lean();
    
    res.json({ 
      success: true,
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users' 
    });
  }
});

// GET /admin/user/:id - Get single user
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    res.json({ 
      success: true,
      user 
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user' 
    });
  }
});

// PUT /admin/user/:id - Update user
router.put('/user/:id', async (req, res) => {
  try {
    const allowedUpdates = ['subscriptionPlan', 'subscriptionStatus', 'notes', 'firstName', 'lastName', 'businessName'];
    const updates = {};
    
    // Only include allowed fields
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user' 
    });
  }
});

// DELETE /admin/user/:id - Delete user
router.delete('/user/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete user' 
    });
  }
});

// POST /admin/user - Create new user
router.post('/user', async (req, res) => {
  try {
    const newUser = {
      id: `user-${Date.now()}`,
      ...req.body,
      createdAt: new Date(),
      status: 'active'
    };

    mockUsers.push(newUser);

    res.json({ 
      success: true,
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create user' 
    });
  }
});

// GET /admin/revenue - Get revenue data
router.get('/revenue', async (req, res) => {
  try {
    // Mock revenue data
    const revenueData = {
      monthly: [
        { month: 'Jan', revenue: 15000 },
        { month: 'Feb', revenue: 18000 },
        { month: 'Mar', revenue: 22000 },
        { month: 'Apr', revenue: 25000 },
        { month: 'May', revenue: 28000 },
        { month: 'Jun', revenue: 30000 }
      ],
      total: 138000,
      currency: 'PHP'
    };

    res.json({ 
      success: true,
      revenue: revenueData
    });
  } catch (error) {
    console.error('Admin revenue error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch revenue data' 
    });
  }
});

// GET /admin/dashboard - Legacy dashboard route
router.get('/dashboard', (req, res) => {
  res.json({ 
    message: 'Admin dashboard - use /api/admin/stats for statistics',
    endpoints: {
      stats: '/api/admin/stats',
      users: '/api/admin/users',
      revenue: '/api/admin/revenue'
    }
  });
});

// GET / - Admin root
router.get('/', (req, res) => {
  res.json({ 
    message: 'Admin API',
    version: '1.0.0',
    endpoints: {
      stats: '/api/admin/stats',
      users: '/api/admin/users',
      user: '/api/admin/user/:id',
      revenue: '/api/admin/revenue'
    }
  });
});

export default router;