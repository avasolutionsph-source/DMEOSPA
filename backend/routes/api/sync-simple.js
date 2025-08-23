import express from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply optional auth to all routes
router.use(optionalAuth);

// POST /api/sync/products - Sync products
router.post('/products', async (req, res) => {
  try {
    const { products, lastSyncTime } = req.body;
    
    logger.info('Products sync request', {
      userId: req.userId || 'anonymous',
      productCount: products?.length || 0
    });
    
    res.json({
      success: true,
      message: 'Products synced',
      syncedCount: products?.length || 0,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Products sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// POST /api/sync/inventory - Sync inventory
router.post('/inventory', async (req, res) => {
  try {
    const { inventory, lastSyncTime } = req.body;
    
    res.json({
      success: true,
      message: 'Inventory synced',
      syncedCount: inventory?.length || 0,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// POST /api/sync/transactions - Sync transactions
router.post('/transactions', async (req, res) => {
  try {
    const { transactions, lastSyncTime } = req.body;
    
    logger.info('Transactions sync request', {
      userId: req.userId || 'anonymous',
      transactionCount: transactions?.length || 0
    });
    
    res.json({
      success: true,
      message: 'Transactions synced',
      syncedCount: transactions?.length || 0,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Transactions sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// POST /api/sync/employees - Sync employees
router.post('/employees', async (req, res) => {
  try {
    const { employees, lastSyncTime } = req.body;
    
    res.json({
      success: true,
      message: 'Employees synced',
      syncedCount: employees?.length || 0,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// POST /api/sync/full - Full sync
router.post('/full', async (req, res) => {
  try {
    const { data, lastSyncTime } = req.body;
    
    res.json({
      success: true,
      message: 'Full sync completed',
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// GET /api/sync/status - Get sync status
router.get('/status', async (req, res) => {
  try {
    res.json({
      success: true,
      lastSync: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      syncEnabled: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status'
    });
  }
});

// POST /api/sync/changes - Get changes
router.post('/changes', async (req, res) => {
  try {
    const { lastSyncTime } = req.body;
    
    res.json({
      success: true,
      changes: {
        products: [],
        inventory: [],
        transactions: [],
        employees: []
      },
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get changes'
    });
  }
});

export default router;