import express from 'express';

const router = express.Router();

// Mock data for admin dashboard
const mockUsers = [
  {
    id: 'user-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    businessName: 'John\'s Spa',
    plan: 'professional',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    lastLogin: new Date('2024-12-20')
  },
  {
    id: 'user-2',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    businessName: 'Wellness Center',
    plan: 'basic',
    status: 'active',
    createdAt: new Date('2024-02-20'),
    lastLogin: new Date('2024-12-19')
  },
  {
    id: 'user-3',
    email: 'demo@spa.com',
    firstName: 'Demo',
    lastName: 'User',
    businessName: 'Demo Business',
    plan: 'unpaid',
    status: 'active',
    createdAt: new Date('2024-03-10'),
    lastLogin: new Date('2024-12-18')
  }
];

// GET /admin/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Mock statistics data
    const stats = {
      totalUsers: mockUsers.length,
      activeUsers: mockUsers.filter(u => u.status === 'active').length,
      totalRevenue: 25000, // Mock revenue in PHP
      planDistribution: [
        { _id: 'unpaid', count: 1 },
        { _id: 'basic', count: 1 },
        { _id: 'professional', count: 1 },
        { _id: 'enterprise', count: 0 }
      ]
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
    // In production, this would fetch from database
    // For now, return mock data
    res.json({ 
      success: true,
      users: mockUsers,
      total: mockUsers.length
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
    const user = mockUsers.find(u => u.id === req.params.id);
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
    const userIndex = mockUsers.findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Update user data
    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...req.body,
      id: mockUsers[userIndex].id // Preserve ID
    };

    res.json({ 
      success: true,
      message: 'User updated successfully',
      user: mockUsers[userIndex]
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
    const userIndex = mockUsers.findIndex(u => u.id === req.params.id);
    if (userIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Remove user
    mockUsers.splice(userIndex, 1);

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