import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

// SECURITY CHECK: Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set in marketing website');
  throw new Error('JWT_SECRET environment variable required for secure authentication');
}
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../models/User.js';

const router = express.Router();

// Configure Google OAuth Strategy for marketing website
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use('marketing-google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3001/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with the same email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        user.authProvider = 'google';
        user.emailVerified = true;
        await user.save();
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        googleId: profile.id,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
        businessName: profile.displayName || `${profile.name.givenName}'s Business`,
        role: 'client',
        authProvider: 'google',
        emailVerified: true,
        avatar: profile.photos[0]?.value
      });
      
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Configure Facebook OAuth Strategy for marketing website
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use('marketing-facebook', new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || "http://localhost:3002/api/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'emails', 'photos', 'first_name', 'last_name']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Facebook ID
      let user = await User.findOne({ facebookId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if user exists with the same email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`;
      user = await User.findOne({ email: email });
      
      if (user) {
        // Link Facebook account to existing user
        user.facebookId = profile.id;
        user.authProvider = 'facebook';
        user.emailVerified = true;
        await user.save();
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        facebookId: profile.id,
        firstName: profile.name?.givenName || profile.first_name || 'Facebook',
        lastName: profile.name?.familyName || profile.last_name || 'User',
        email: email,
        businessName: profile.displayName || `${profile.first_name || 'Facebook'}'s Business`,
        role: 'client',
        authProvider: 'facebook',
        emailVerified: profile.emails && profile.emails.length > 0,
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null
      });
      
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, firstName, lastName, phone } = req.body;

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
      phone,
      role: 'client'
    });

    console.log('🚀 Creating client user with data:', {
      email,
      firstName,
      lastName,
      phone,
      role: 'client'
    });

    await user.save();
    
    console.log('✅ User saved with role:', user.role);

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
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
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login - LOCAL AUTH FOR CLIENTS, PROXY FOR BUSINESS USERS
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
    console.log(`🔐 Marketing website login attempt for ${email}`);

    // First, check if user exists locally in marketing website database
    const localUser = await User.findOne({ email });
    
    if (localUser) {
      // Local user found - handle authentication locally
      console.log(`👤 Local user found: ${email}, role: ${localUser.role}`);
      
      // Check password for local user
      const isMatch = await localUser.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT for local user
      const token = jwt.sign(
        { 
          userId: localUser._id, 
          email: localUser.email, 
          role: localUser.role,
          businessName: localUser.businessName
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '999y' }
      );

      console.log(`✅ Local authentication successful for ${email}`);
      
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: localUser._id,
          email: localUser.email,
          firstName: localUser.firstName,
          lastName: localUser.lastName,
          businessName: localUser.businessName,
          role: localUser.role
        }
      });
    }

    // If not found locally and not a client role, try PWA backend for business users
    console.log(`🔄 User not found locally, checking PWA backend for business user: ${email}`);
    
    try {
      const backendUrl = process.env.PWA_BACKEND_URL || 'https://daetspa-backend.onrender.com';
      
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ PWA backend login successful for business user ${email}`);
        // Forward the response from PWA backend for business users
        return res.json(result);
      } else {
        console.log(`❌ PWA backend login failed for ${email}: ${result.error}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (pwaError) {
      console.error('PWA backend connection error:', pwaError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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

// Google OAuth routes
router.get('/google',
  passport.authenticate('marketing-google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('marketing-google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          businessName: user.businessName
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '999y' }
      );
      
      // Redirect to frontend with token based on role
      const redirectUrl = user.role === 'superAdmin' 
        ? '/admin' 
        : user.role === 'admin' 
          ? '/admin-dashboard'
          : user.role === 'client'
            ? '/book-appointment'
            : '/business-dashboard';
          
      // Redirect with token as query parameter (frontend will handle storing it)
      res.redirect(`${redirectUrl}?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: user.role
      }))}`);
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

// Facebook OAuth routes
router.get('/facebook',
  passport.authenticate('marketing-facebook', { scope: ['email'] })
);

router.get('/facebook/callback',
  passport.authenticate('marketing-facebook', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          businessName: user.businessName
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '999y' }
      );
      
      // Redirect to frontend with token based on role
      const redirectUrl = user.role === 'superAdmin' 
        ? '/admin' 
        : user.role === 'admin' 
          ? '/admin-dashboard'
          : user.role === 'client'
            ? '/book-appointment'
            : '/business-dashboard';
          
      // Redirect with token as query parameter (frontend will handle storing it)
      res.redirect(`${redirectUrl}?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        role: user.role
      }))}`);
      
    } catch (error) {
      console.error('Facebook OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

// GET /api/auth/profile - Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: user.businessName,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      emailVerified: user.emailVerified
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
