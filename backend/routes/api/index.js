// Main API Router
// Consolidates all API endpoints for the PWA

import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import healthRoutes from './health.js';
import businessRoutes from './business.js';
import productsRoutes from './products.js';
import inventoryRoutes from './inventory.js';
import employeesRoutes from './employees.js';
import transactionsRoutes from './transactions.js';
import payrollRoutes from './payroll.js';
import payrollRequestsRoutes from './payrollRequests.js';
import customersRoutes from './customers.js';
import attendanceRoutes from './attendance.js';
import settingsRoutes from './settings.js';
import entitlementsRoutes from './entitlements.js';
import chatbotRoutes from './chatbot.js';
import dataValidationRoutes from './dataValidation.js';
import bookingsRoutes from './bookings.js';
import { authenticateJWT, optionalAuth, requireBusinessUser } from '../../middleware/auth.js';
import { apiRequestLogger } from '../../middleware/requestLogger.js';
import logger from '../../utils/logger.js';

const router = Router();

// Apply API request logging to all routes
router.use(apiRequestLogger);

// API Information
router.get('/', (req, res) => {
  res.json({
    message: 'Ava Solutions API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      business: '/api/business',
      products: '/api/products',
      inventory: '/api/inventory',
      employees: '/api/employees',
      transactions: '/api/transactions',
      settings: '/api/settings',
      analytics: '/api/analytics',
      sync: '/api/sync',
      realtime: '/api/realtime'
    },
    documentation: process.env.API_DOCS_URL || '/api/docs',
    support: 'support@avasolutions.com'
  });
});

// Health check (no auth required)
router.use('/health', healthRoutes);

// Public routes (no authentication required)
router.use('/auth', authRoutes);

// Booking routes for marketing website
router.get('/booking/branches', async (req, res) => {
  try {
    // Import User model to get branch users
    const User = (await import('../../models/User.js')).default;
    
    // Get ALL branch users (business accounts that can receive bookings)
    // Remove businessName requirement to show all branches
    const branches = await User.find({ 
      role: 'branch'
    })
    .select('businessName firstName lastName email phone _id')  // Added email and phone fields
    .lean();
    
    console.log(`Found ${branches.length} branch accounts:`, branches.map(b => ({
      name: b.businessName || `${b.firstName} ${b.lastName}`,
      email: b.email
    })));
    
    // If no branches found, return empty array
    if (!branches || branches.length === 0) {
      return res.json({
        success: true,
        branches: []
      });
    }
    
    res.json({
      success: true,
      branches: branches.map(branch => ({
        id: branch._id,
        // Use businessName if available, otherwise use firstName + lastName
        name: branch.businessName || `${branch.firstName || ''} ${branch.lastName || ''}`.trim() || 'Unnamed Branch',
        contact: {
          email: branch.email || '',
          phone: branch.phone || ''
        },
        address: {
          city: '',
          province: ''
        },
        isActive: true
      }))
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load branches'
    });
  }
});

// Public products endpoint for marketing website booking system
router.get('/products/public/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Import Product model
        const Product = (await import('../../models/Product.js')).default;
        
        // Get products for the specified user (branch)
        const products = await Product.find({
            userId: userId,
            isActive: true  // Only show active services for booking
        })
        .select('name description category duration price isActive')
        .sort({ name: 1 })
        .lean();
        
        logger.info(`Public products retrieved for booking`, {
            category: 'API',
            operation: 'get_public_products',
            data: { userId, count: products.length }
        });
        
        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        logger.error('Error retrieving public products:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve products'
        });
    }
});

// Public employees endpoint for marketing website booking system  
router.get('/employees/public/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Import Employee model
        const Employee = (await import('../../models/Employee.js')).default;
        
        // Get employees for the specified user (branch)
        const employees = await Employee.find({
            userId: userId,
            isActive: { $ne: false }  // Only show active employees for booking
        })
        .select('firstName lastName position hireDate isActive')
        .sort({ firstName: 1, lastName: 1 })
        .lean();
        
        logger.info(`Public employees retrieved for booking`, {
            category: 'API',
            operation: 'get_public_employees',
            data: { userId, count: employees.length }
        });
        
        res.json({
            success: true,
            data: employees
        });
    } catch (error) {
        logger.error('Error retrieving public employees:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve employees'
        });
    }
});

// Bookings endpoint for PWA (authenticated access)
router.get('/bookings/:branchId', authenticateJWT, async (req, res) => {
    try {
        const { branchId } = req.params;
        
        // Import Booking model from backend
        const Booking = (await import('../../models/Booking.js')).default;
        
        // Verify user has access to this branch
        if (req.user.userId !== branchId && req.user.id !== branchId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Can only view your own branch bookings.'
            });
        }
        
        // Get bookings for the branch
        const bookings = await Booking.find({ branchId })
            .sort({ createdAt: -1 })
            .lean();
        
        logger.info(`PWA bookings retrieved for branch: ${branchId}`, {
            category: 'API',
            operation: 'get_pwa_bookings',
            data: { branchId, count: bookings.length }
        });
        
        res.json({
            success: true,
            data: bookings
        });
    } catch (error) {
        logger.error('Error retrieving PWA bookings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve bookings'
        });
    }
});

// User routes (requires authentication)
router.use('/user', userRoutes);

// Booking routes (mostly public for customers)
router.use('/bookings', bookingsRoutes);

// Chatbot routes (optional auth)
router.use('/chatbot', chatbotRoutes);

// Sync routes are mounted directly in server.js at /api/sync

// Business and data management routes (with authentication and business user requirement)
router.use('/products', authenticateJWT, requireBusinessUser, productsRoutes);
router.use('/business', authenticateJWT, requireBusinessUser, businessRoutes);
router.use('/inventory', authenticateJWT, requireBusinessUser, inventoryRoutes);
router.use('/employees', authenticateJWT, requireBusinessUser, employeesRoutes);
router.use('/transactions', authenticateJWT, requireBusinessUser, transactionsRoutes);
router.use('/customers', authenticateJWT, requireBusinessUser, customersRoutes);
router.use('/attendance', authenticateJWT, requireBusinessUser, attendanceRoutes);
router.use('/payroll', payrollRoutes); // Payroll with built-in auth middleware
router.use('/payroll-requests', payrollRequestsRoutes); // Payroll requests with auth
router.use('/settings', authenticateJWT, requireBusinessUser, settingsRoutes);
router.use('/entitlements', optionalAuth, entitlementsRoutes);
router.use('/data-validation', authenticateJWT, requireBusinessUser, dataValidationRoutes);

// Log unhandled API routes
router.use('*', (req, res) => {
  logger.warn(`Unhandled API route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

export default router;
