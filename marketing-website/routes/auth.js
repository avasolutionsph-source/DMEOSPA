import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import logger from '../utils/logger.js';

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
      phone,
      subscriptionPlan: plan || 'unpaid'
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
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
    console.log('🔐 Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;

    // Hardcoded Super Admin Check
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'avasolutionsph@gmail.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Ava12345';
    
    console.log('🔍 Super Admin Check:', {
      inputEmail: email,
      expectedEmail: superAdminEmail,
      emailMatch: email === superAdminEmail,
      passwordMatch: password === superAdminPassword,
      inputEmailLength: email?.length,
      expectedEmailLength: superAdminEmail?.length
    });
    
    if (email === superAdminEmail && password === superAdminPassword) {
      // Log super admin login
      logger.auth('Super Admin login successful', { email: superAdminEmail, ip: req.ip });
      
      // Generate JWT for super admin
      const token = jwt.sign(
        { 
          userId: 'super-admin', 
          email: superAdminEmail, 
          role: 'superAdmin',
          subscriptionPlan: 'pro',
          businessName: 'Ava Solutions (Super Admin)'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      return res.json({
        success: true,
        message: 'Super Admin login successful',
        token,
        user: {
          id: 'super-admin',
          email: superAdminEmail,
          firstName: 'Super',
          lastName: 'Admin',
          businessName: 'Ava Solutions (Super Admin)',
          subscriptionPlan: 'pro',
          role: 'superAdmin'
        }
      });
    }

    // Find user
    console.log('🔍 Looking for regular user with email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ No user found with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('✅ User found:', { id: user._id, email: user.email, role: user.role });

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last active
    user.businessMetrics.lastActiveDate = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
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

    // First check hardcoded super admin credentials
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'avasolutionsph@gmail.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Ava12345';
    
    if (email === superAdminEmail && password === superAdminPassword) {
      // Log super admin login
      logger.auth('Super Admin login via admin-login endpoint', { email: superAdminEmail, ip: req.ip });
      
      // Generate JWT for super admin
      const token = jwt.sign(
        { 
          userId: 'super-admin', 
          email: superAdminEmail, 
          role: 'superAdmin',
          subscriptionPlan: 'pro',
          businessName: 'Ava Solutions (Super Admin)'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      return res.json({
        success: true,
        message: 'Super Admin login successful',
        token,
        user: {
          id: 'super-admin',
          email: superAdminEmail,
          firstName: 'Super',
          lastName: 'Admin',
          businessName: 'Ava Solutions (Super Admin)',
          subscriptionPlan: 'pro',
          role: 'superAdmin'
        }
      });
    }

    // Otherwise, find admin user in database
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

export default router;
