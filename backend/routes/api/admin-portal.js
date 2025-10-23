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

// POST /api/admin-portal/create-account
// Create new branch account
router.post('/create-account', async (req, res) => {
  try {
    const User = (await import('../../models/User.js')).default;
    const bcrypt = (await import('bcrypt')).default;

    const { email, password, firstName, lastName, businessName, phone } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new branch user
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName || 'Branch',
      lastName: lastName || 'User',
      businessName: businessName || `${firstName} ${lastName}`,
      phone: phone || '',
      role: 'branch',
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      createdBy: req.user.userId // Track who created this account
    });

    await newUser.save();

    res.json({
      success: true,
      message: 'Branch account created successfully',
      account: {
        id: newUser._id,
        email: newUser.email,
        businessName: newUser.businessName,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      }
    });

  } catch (error) {
    console.error('Error creating branch account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create branch account'
    });
  }
});

// GET /api/admin-portal/branch-data/:accountId
// Get branch account details
router.get('/branch-data/:accountId', async (req, res) => {
  try {
    const User = (await import('../../models/User.js')).default;
    const { accountId } = req.params;

    const account = await User.findById(accountId).select('-password').lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Verify this admin created this account (optional - remove if admins should see all)
    // if (account.createdBy !== req.user.userId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'You do not have permission to view this account'
    //   });
    // }

    res.json({
      success: true,
      data: {
        id: account._id.toString(),
        email: account.email,
        businessName: account.businessName,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
        role: account.role,
        subscriptionPlan: account.subscriptionPlan,
        subscriptionStatus: account.subscriptionStatus,
        createdAt: account.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching branch data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch data'
    });
  }
});

export default router;
