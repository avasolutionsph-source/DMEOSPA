import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, validateToken, refreshToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('businessName').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password, firstName, lastName, businessName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(409).json({ 
        success: false,
        error: 'Email already registered'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      businessName,
      phone,
      role: 'owner',
      subscriptionPlan: 'pro',
      subscriptionStatus: 'active',
      isActive: true
    });

    await user.save();
    
    // Set businessId to their own ID for owners
    user.businessId = user._id.toString();
    await user.save();

    console.log('✅ User created successfully:', email);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        businessId: user.businessId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        role: user.role,
        permissions: user.permissions,
        businessId: user.businessId
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      console.log('❌ Account deactivated:', email);
      return res.status(401).json({ 
        success: false,
        error: 'Account is deactivated' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password:', email);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    try {
      // Initialize missing fields for existing users
      if (!user.planLimits) {
        console.log('📝 Initializing planLimits for user:', user.email);
        user.setPlanLimits();
      }
      if (!user.currentUsage) {
        console.log('📝 Initializing currentUsage for user:', user.email);
        user.currentUsage = {
          customersCount: 0,
          employeesCount: 1,
          productsCount: 0,
          bookingsThisMonth: 0,
          storageUsedGB: 0,
          lastUpdated: new Date()
        };
      }
      if (!user.businessMetrics) {
        console.log('📝 Initializing businessMetrics for user:', user.email);
        user.businessMetrics = {
          totalSales: 0,
          totalTransactions: 0,
          totalProducts: 0,
          totalEmployees: 0,
          lastActiveDate: new Date()
        };
      }

      // Update last login
      user.lastLogin = new Date();
      if (user.businessMetrics) {
        user.businessMetrics.lastActiveDate = new Date();
      }
      
      console.log('💾 Saving user data for:', user.email);
      await user.save();
      console.log('✅ User data saved successfully for:', user.email);
    } catch (saveError) {
      console.error('❌ Error saving user data:', saveError);
      // Continue with login even if save fails
    }

    console.log('✅ Login successful:', email);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        businessId: user.businessId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

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
        role: user.role,
        permissions: user.permissions,
        businessId: user.businessId
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false,
      error: 'Login failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Validate token with plan limits and usage info
router.get('/validate', protect, validateToken);

// Refresh token
router.post('/refresh', protect, refreshToken);

// Test endpoint for debugging
router.get('/test', async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const userCount = await User.countDocuments();
    
    res.json({
      success: true,
      message: 'Auth system is working',
      timestamp: new Date().toISOString(),
      userCount,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;