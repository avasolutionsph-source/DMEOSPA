import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

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

// Login - PROXY TO PWA BACKEND FOR UNIFIED AUTH
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

    // Forward login request to PWA backend for unified authentication
    console.log(`🔐 Forwarding login request for ${email} to PWA backend`);
    const pwaBackendUrl = 'https://ava-pwa-backend.onrender.com';
    
    const response = await fetch(`${pwaBackendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ PWA backend login failed for ${email}:`, data.error);
      return res.status(response.status).json({ error: data.error || 'Login failed' });
    }

    console.log(`✅ PWA backend login successful for ${email}`);
    
    // Return PWA backend's response (includes token and user data)
    res.json({
      success: true,
      message: 'Login successful',
      token: data.token,
      user: data.user || {
        id: data.userId,
        email: email,
        firstName: data.firstName || email.split('@')[0],
        lastName: data.lastName || '',
        businessName: data.businessName || email.split('@')[0],
        subscriptionPlan: data.subscriptionPlan || 'free',
        role: data.role || 'user'
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

export default router;
