import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin (not superAdmin)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
    return res.status(403).json({
      success: false,
      error: 'Admin role required'
    });
  }
  next();
};

// Apply authentication and admin check to all routes
router.use(authenticateJWT);
router.use(requireAdmin);

// GET /api/admin-portal/my-created-accounts
// Returns branch accounts created by this admin
router.get('/my-created-accounts', async (req, res) => {
  try {
    const User = (await import('../../models/User.js')).default;

    // Get all users created by this admin
    // For now, we'll return users where createdBy matches the admin's ID
    // You'll need to add a 'createdBy' field to your User model for this to work properly

    const accounts = await User.find({
      role: 'branch',
      // createdBy: req.user.userId // Uncomment this when you add createdBy field
    })
    .select('-password')
    .sort({ createdAt: -1 })
    .lean();

    // Format the accounts for the frontend
    const formattedAccounts = accounts.map(account => ({
      id: account._id.toString(),
      email: account.email,
      businessName: account.businessName || `${account.firstName} ${account.lastName}`,
      firstName: account.firstName,
      lastName: account.lastName,
      phone: account.phone,
      createdAt: account.createdAt,
      subscriptionPlan: account.subscriptionPlan,
      subscriptionStatus: account.subscriptionStatus
    }));

    res.json({
      success: true,
      accounts: formattedAccounts
    });

  } catch (error) {
    console.error('Error fetching admin created accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch created accounts'
    });
  }
});

// GET /api/admin-portal/stats
// Returns dashboard stats for admin user
router.get('/stats', async (req, res) => {
  try {
    const User = (await import('../../models/User.js')).default;

    // Get basic stats for admin dashboard
    const totalBranchAccounts = await User.countDocuments({ role: 'branch' });
    const activeBranchAccounts = await User.countDocuments({
      role: 'branch',
      subscriptionStatus: 'active'
    });

    res.json({
      success: true,
      stats: {
        totalBranchAccounts,
        activeBranchAccounts,
        pendingPayrolls: 0, // Placeholder
        monthlyPayrollTotal: 0 // Placeholder
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;
