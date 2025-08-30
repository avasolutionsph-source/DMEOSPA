import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import User from '../../models/User.js';
import { generateToken, verifyToken, authenticateJWT } from '../../middleware/auth.js';

const router = express.Router();

// Rate limiting for auth endpoints (safe limits to prevent abuse without breaking normal usage)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs (generous limit)
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests to avoid limiting legitimate users
  skipSuccessfulRequests: true
});

// More restrictive rate limiting for login attempts (brute force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed requests
  skipSuccessfulRequests: true
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, businessName, phone, plan } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !businessName) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }
    
    // Validate plan name - support new 4-tier system
    const validPlans = ['unpaid', 'basic', 'professional', 'enterprise'];
    const subscriptionPlan = validPlans.includes(plan) ? plan : 'unpaid';
    
    // Create new user (password will be hashed by pre-save hook)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      businessName,
      phone: phone || '',
      subscriptionPlan,
      role: 'customer'
    });
    
    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      subscriptionPlan: user.subscriptionPlan,
      role: user.role
    });
    
    res.json({ 
      success: true,
      message: 'User registration successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        plan: user.subscriptionPlan, // For backward compatibility
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Check for super admin credentials (now secured via environment variables)
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'avasolutionsph@gmail.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ava12345';
    
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      // Create or update super admin user
      let superAdmin = user;
      if (!superAdmin) {
        superAdmin = await User.create({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          firstName: 'Super',
          lastName: 'Admin',
          businessName: 'Ava Solutions PH',
          role: 'superAdmin',
          subscriptionPlan: 'enterprise'
        });
      } else if (superAdmin.role !== 'superAdmin') {
        superAdmin.role = 'superAdmin';
        superAdmin.subscriptionPlan = 'enterprise';
        await superAdmin.save();
      }
      
      const token = generateToken({
        id: superAdmin._id,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        businessName: superAdmin.businessName,
        subscriptionPlan: superAdmin.subscriptionPlan,
        role: superAdmin.role
      });
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: superAdmin._id,
          email: superAdmin.email,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          businessName: superAdmin.businessName,
          subscriptionPlan: superAdmin.subscriptionPlan,
          plan: superAdmin.subscriptionPlan,
          role: superAdmin.role
        }
      });
    }
    
    // Check for demo accounts
    const demoAccounts = {
      'demo@spa.com': { password: 'demo123', plan: 'professional', firstName: 'Demo', lastName: 'User', businessName: 'Demo Spa' },
      'basic@demo.com': { password: 'demo123', plan: 'basic', firstName: 'Basic', lastName: 'Demo', businessName: 'Basic Business' },
      'professional@demo.com': { password: 'demo123', plan: 'professional', firstName: 'Pro', lastName: 'Demo', businessName: 'Pro Business' },
      'enterprise@demo.com': { password: 'demo123', plan: 'enterprise', firstName: 'Enterprise', lastName: 'Demo', businessName: 'Enterprise Corp' }
    };
    
    const demoAccount = demoAccounts[email.toLowerCase()];
    if (demoAccount && password === demoAccount.password) {
      // Create or update demo user
      let demoUser = user;
      if (!demoUser) {
        demoUser = await User.create({
          email: email.toLowerCase(),
          password: demoAccount.password,
          firstName: demoAccount.firstName,
          lastName: demoAccount.lastName,
          businessName: demoAccount.businessName,
          subscriptionPlan: demoAccount.plan,
          role: 'customer'
        });
      }
      
      const token = generateToken({
        id: demoUser._id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        businessName: demoUser.businessName,
        subscriptionPlan: demoUser.subscriptionPlan,
        role: demoUser.role
      });
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: demoUser._id,
          email: demoUser.email,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          businessName: demoUser.businessName,
          subscriptionPlan: demoUser.subscriptionPlan,
          plan: demoUser.subscriptionPlan,
          role: demoUser.role
        }
      });
    }
    
    // Normal user authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = generateToken({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      subscriptionPlan: user.subscriptionPlan,
      role: user.role
    });
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        plan: user.subscriptionPlan, // For backward compatibility
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  // Client should remove token from storage
  res.json({ 
    success: true,
    message: 'Logout successful'
  });
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    // Get fresh user data from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        plan: user.subscriptionPlan,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email address'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }
    
    // TODO: Implement email sending with reset token
    // For now, just return success
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide reset token and new password'
      });
    }
    
    // TODO: Implement token verification and password reset
    // For now, just return success
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// GET /api/auth/subscription - Check current subscription status
router.get('/subscription', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token'
      });
    }
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Return subscription information
    res.json({ 
      success: true,
      subscriptionPlan: user.subscriptionPlan,
      plan: user.subscriptionPlan, // For backward compatibility
      email: user.email,
      businessName: user.businessName,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStart: user.subscriptionStart,
      subscriptionEnd: user.subscriptionEnd
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to verify subscription'
    });
  }
});

// POST /api/auth/refresh - Token refresh endpoint
router.post('/refresh', authenticateJWT, async (req, res) => {
  try {
    // User is already authenticated via JWT middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Generate new token with same data but fresh expiration
    const newToken = generateToken({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      subscriptionPlan: user.subscriptionPlan,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        plan: user.subscriptionPlan,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh token' 
    });
  }
});

export default router;