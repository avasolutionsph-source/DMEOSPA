import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password, firstName, lastName, businessName, phone, role = 'owner' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already in use' 
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
      role,
      subscriptionPlan: 'pro',
      subscriptionStatus: 'active',
      businessId: role === 'owner' ? undefined : undefined, // Will be set after save for owners
      isActive: true
    });

    // For owners, set businessId to their own ID after saving
    await user.save();
    if (role === 'owner') {
      user.businessId = user._id.toString();
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        ownerId: user.ownerId || (user.role === 'owner' ? user._id : undefined)
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Return success response
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
      },
      entitlements: {
        pos: user.permissions.pos,
        dashboard: user.permissions.dashboard ? 'advanced' : 'basic',
        transactions: -1,
        inventory: user.permissions.inventory,
        employees: user.permissions.employees,
        aiAssistant: user.permissions.chatbot,
        analytics: user.permissions.analytics ? 'advanced' : 'basic',
        support: 'phone-email',
        bookings: user.permissions.bookings,
        products: user.permissions.products,
        rooms: user.permissions.rooms,
        therapistPortal: user.permissions.therapistPortal,
        timer: user.permissions.timer
      }
    });

  } catch (error) {
    console.error('PWA registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Login existing user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
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
    const user = await User.findOne({ email }).populate('ownerId');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        error: 'Account is deactivated' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.businessMetrics.lastActiveDate = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        ownerId: user.ownerId || (user.role === 'owner' ? user._id : undefined)
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Return success response
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
        businessId: user.businessId,
        therapistDetails: user.therapistDetails
      },
      entitlements: {
        pos: user.permissions.pos,
        dashboard: user.permissions.dashboard ? 'advanced' : 'basic',
        transactions: -1,
        inventory: user.permissions.inventory,
        employees: user.permissions.employees,
        aiAssistant: user.permissions.chatbot,
        analytics: user.permissions.analytics ? 'advanced' : 'basic',
        support: 'phone-email',
        bookings: user.permissions.bookings,
        products: user.permissions.products,
        rooms: user.permissions.rooms,
        therapistPortal: user.permissions.therapistPortal,
        timer: user.permissions.timer
      }
    });

  } catch (error) {
    console.error('PWA login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Validate token
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }

    res.json({
      success: true,
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        businessName: user.businessName,
        permissions: user.permissions
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
});

// Create employee account (for owners/managers)
router.post('/create-employee', [
  body('email').isEmail().normalizeEmail(),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['employee', 'receptionist', 'therapist', 'manager'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Verify requester is owner or manager
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const requester = await User.findById(decoded.userId);
    
    if (!requester || !['owner', 'manager'].includes(requester.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Insufficient permissions' 
      });
    }

    const { email, firstName, lastName, role, phone, specialties, hourlyRate } = req.body;

    // Check if employee email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already in use' 
      });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    // Create employee
    const employee = new User({
      email,
      password: tempPassword,
      firstName,
      lastName,
      businessName: requester.businessName,
      phone,
      role,
      ownerId: requester.role === 'owner' ? requester._id : requester.ownerId,
      businessId: requester.businessId,
      subscriptionPlan: 'pro',
      subscriptionStatus: 'active',
      isActive: true
    });

    // Set therapist details if role is therapist
    if (role === 'therapist') {
      employee.therapistDetails = {
        specialties: specialties || [],
        hourlyRate: hourlyRate || 0,
        availability: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '09:00', end: '17:00', available: false },
          sunday: { start: '09:00', end: '17:00', available: false }
        }
      };
    }

    await employee.save();

    res.json({
      success: true,
      message: 'Employee account created',
      employee: {
        id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        tempPassword: tempPassword,
        permissions: employee.permissions
      }
    });

  } catch (error) {
    console.error('Employee creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create employee account' 
    });
  }
});

// Get business services (for booking website)
router.get('/business/:businessId/services', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const User = (await import('../models/User.js')).default;
    const business = await User.findById(businessId);
    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });

    const services = business.products || [];
    const activeServices = services.filter(service => service.isActive !== false);

    res.json({ 
      success: true, 
      services: activeServices,
      businessName: business.businessName
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

// Get business employees (for booking website)
router.get('/business/:businessId/employees', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const User = (await import('../models/User.js')).default;
    const business = await User.findById(businessId);
    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });

    const employees = business.employees || [];
    const activeEmployees = employees.filter(employee => employee.isActive !== false);

    res.json({ 
      success: true, 
      employees: activeEmployees,
      businessName: business.businessName
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

// Publish catalog endpoint for PWA backend
router.post('/publish-catalog', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
    
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const { products = [], employees = [] } = req.body || {};

    const now = new Date();

    // Sanitize and store services/products
    const sanitizedProducts = (Array.isArray(products) ? products : [])
      .map(p => ({
        id: String(p.id || p._id || ''),
        name: String(p.name || ''),
        category: String(p.category || 'service'),
        duration: Number(p.duration || 0),
        price: Number(p.price || 0),
        isActive: p.isActive !== false,
        publishedAt: now
      }));

    // Sanitize and store employees  
    const sanitizedEmployees = (Array.isArray(employees) ? employees : [])
      .map(e => ({
        id: String(e.id || e._id || ''),
        name: String(e.name || ''),
        position: String(e.position || ''),
        email: String(e.email || ''),
        phone: String(e.phone || ''),
        isActive: e.isActive !== false,
        publishedAt: now
      }));

    // Store in user document
    user.products = sanitizedProducts;
    user.employees = sanitizedEmployees;
    await user.save();

    console.log(`📋 Catalog published for ${user.email}: ${sanitizedProducts.length} products, ${sanitizedEmployees.length} employees`);

    res.json({ 
      success: true, 
      products: sanitizedProducts.length, 
      employees: sanitizedEmployees.length,
      message: 'Catalog published successfully to MongoDB'
    });
  } catch (error) {
    console.error('PWA publish catalog error:', error);
    res.status(500).json({ success: false, error: 'Failed to publish catalog' });
  }
});

// Public: Get business catalog (services + employees for booking website)
router.get('/public/business-catalog/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const User = (await import('../models/User.js')).default;
    const business = await User.findById(businessId);
    
    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    const services = (business.products || []).filter(service => service.isActive !== false);
    const employees = (business.employees || []).filter(employee => employee.isActive !== false);
    
    console.log(`📋 Business catalog requested for ${business.businessName}: ${services.length} services, ${employees.length} employees`);

    res.json({ 
      success: true, 
      businessName: business.businessName,
      services: services,
      employees: employees,
      servicesCount: services.length,
      employeesCount: employees.length
    });
  } catch (error) {
    console.error('Get business catalog error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch business catalog' });
  }
});

// Public: Get all businesses with published catalogs (for booking directory)
router.get('/public/businesses', async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    
    // Find businesses that have published catalogs (have products or employees)
    const businesses = await User.find({
      isActive: true,
      $or: [
        { 'products.0': { $exists: true } },  // Has at least one product
        { 'employees.0': { $exists: true } }  // Has at least one employee
      ]
    }).select('_id businessName products employees createdAt').lean();

    const formattedBusinesses = businesses.map(business => ({
      id: String(business._id),
      businessName: business.businessName,
      name: business.businessName, // Alias for compatibility
      servicesCount: (business.products || []).length,
      employeesCount: (business.employees || []).length,
      hasServices: (business.products || []).length > 0,
      hasEmployees: (business.employees || []).length > 0
    }));

    res.json({ 
      success: true, 
      data: formattedBusinesses,
      total: formattedBusinesses.length
    });
  } catch (error) {
    console.error('Public businesses error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch businesses' });
  }
});

export default router;
