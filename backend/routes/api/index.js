// Main API Router
// Consolidates all API endpoints for the PWA

import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
// import businessRoutes from './business.js';
// import productsRoutes from './products.js';
// import inventoryRoutes from './inventory.js';
// import employeesRoutes from './employees.js';
// import transactionsRoutes from './transactions.js';
// import subscriptionRoutes from './subscription.js';
// import settingsRoutes from './settings.js';
// import analyticsRoutes from './analytics.js';
// import entitlementsRoutes from './entitlements.js';
import chatbotRoutes from './chatbot.js';
import syncSimpleRoutes from './sync-simple.js';
import { authenticateJWT, optionalAuth } from '../../middleware/auth.js';
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
      subscription: '/api/subscription',
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
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'API',
    timestamp: new Date().toISOString()
  });
});

// Public routes (no authentication required)
router.use('/auth', authRoutes);

// User routes (requires authentication)
router.use('/user', userRoutes);

// Chatbot routes (optional auth)
router.use('/chatbot', chatbotRoutes);

// Sync routes (optional auth for now)
router.use('/sync', syncSimpleRoutes);

// Commented out routes that don't have implementations yet
// router.use('/products', optionalAuth, productsRoutes);
// router.use('/business', authenticateJWT, businessRoutes);
// router.use('/inventory', authenticateJWT, inventoryRoutes);
// router.use('/employees', authenticateJWT, employeesRoutes);
// router.use('/transactions', authenticateJWT, transactionsRoutes);
// router.use('/subscription', authenticateJWT, subscriptionRoutes);
// router.use('/settings', authenticateJWT, settingsRoutes);
// router.use('/analytics', authenticateJWT, analyticsRoutes);
// router.use('/entitlements', optionalAuth, entitlementsRoutes);

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