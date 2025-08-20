import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import AuthLog from '../models/AuthLog.js';

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('businessName').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, firstName, lastName, businessName, phone, plan } = req.body;

    // Check if user exists (owner, branch, employee)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      businessName,
      phone,
      subscriptionPlan: plan || 'unpaid',
      role: 'owner'
    });

    await user.save();

    // Generate JWT including ownerId for branch/employee and an optional branchId
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        ownerId: user.ownerId || (user.role === 'owner' ? user._id : undefined),
        subscriptionPlan: user.subscriptionPlan,
        businessName: user.businessName
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last active and log auth
    user.businessMetrics.lastActiveDate = new Date();
    await user.save();

    try {
      await AuthLog.create({
        userId: String(user._id),
        ownerId: user.ownerId || (user.role === 'owner' ? String(user._id) : ''),
        email: user.email,
        role: user.role,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        deviceName: req.headers['x-device-name'] || ''
      });
    } catch (e) { /* non-fatal */ }

    // Generate JWT including ownerId for branch/employee and an optional branchId
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        ownerId: user.ownerId || (user.role === 'owner' ? user._id : undefined),
        subscriptionPlan: user.subscriptionPlan,
        businessName: user.businessName
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
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
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Check if an email is already used anywhere (owner, branch, employee)
router.get('/check-email', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email required' });
    const existing = await User.findOne({ email }).select('_id role').lean();
    res.json({ exists: !!existing, role: existing?.role || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check email' });
  }
});

// Admin login (separate endpoint for admin users)
router.post('/admin-login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;

    // Find admin user
    const user = await User.findOne({ 
      email, 
      role: { $in: ['admin', 'superAdmin'] } 
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Admin access denied' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT with admin role
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// Franchise/Enterprise Registration
router.post('/franchise-register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('businessName').trim().isLength({ min: 1 }),
  body('phone').trim().isLength({ min: 1 }),
  body('accountType').isIn(['franchise', 'enterprise']),
  body('locationCount').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      businessName, 
      phone, 
      plan,
      accountType,
      locationCount 
    } = req.body;

    // Check if user exists (check all systems)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Create franchise owner user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      businessName,
      phone,
      subscriptionPlan: plan || 'enterprise',
      role: 'franchise_owner', // Special role for franchise owners
      accountType: accountType, // franchise or enterprise
      locationCount: locationCount,
      // Franchise owners are main owners (not branches)
      ownerId: null,
      isMainOwner: true
    });

    await user.save();

    // Generate JWT with franchise owner privileges
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        accountType: user.accountType,
        ownerId: user._id, // They are the main owner
        subscriptionPlan: user.subscriptionPlan,
        businessName: user.businessName,
        isMainOwner: true
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '999y' }
    );

    res.status(201).json({
      success: true,
      message: 'Enterprise account created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        subscriptionPlan: user.subscriptionPlan,
        role: user.role,
        accountType: user.accountType,
        isMainOwner: true
      }
    });
  } catch (error) {
    console.error('Franchise registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
