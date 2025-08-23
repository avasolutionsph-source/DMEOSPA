// Sync Router
// Handles data synchronization for PWA offline/online functionality

import { Router } from 'express';
import { authenticateJWT, requireBusinessContext } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import SyncService from '../../services/syncService.js';

const router = Router();

// All sync routes require authentication and business context
router.use(authenticateJWT);
router.use(requireBusinessContext);

/**
 * Get sync status and metadata
 */
router.get('/status', asyncHandler(async (req, res) => {
  const syncService = new SyncService(req.businessId, req.userId);
  const status = await syncService.getSyncStatus();
  
  res.json({
    success: true,
    data: status
  });
}));

/**
 * Full sync - get all data
 */
router.get('/full', asyncHandler(async (req, res) => {
  logger.info('Full sync requested', {
    userId: req.userId,
    businessId: req.businessId
  });
  
  const syncService = new SyncService(req.businessId, req.userId);
  const data = await syncService.getFullSync();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data
  });
}));

/**
 * Incremental sync - get changes since last sync
 */
router.get('/changes', asyncHandler(async (req, res) => {
  const { since } = req.query;
  
  if (!since) {
    return res.status(400).json({
      success: false,
      error: 'Missing "since" timestamp parameter'
    });
  }
  
  const syncService = new SyncService(req.businessId, req.userId);
  const changes = await syncService.getChangesSince(new Date(since));
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    changes
  });
}));

/**
 * Push sync - receive data from PWA
 */
router.post('/push', asyncHandler(async (req, res) => {
  const { products, inventory, employees, transactions, settings } = req.body;
  
  logger.info('Push sync received', {
    userId: req.userId,
    businessId: req.businessId,
    items: {
      products: products?.length || 0,
      inventory: inventory?.length || 0,
      employees: employees?.length || 0,
      transactions: transactions?.length || 0,
      settings: settings ? 1 : 0
    }
  });
  
  const syncService = new SyncService(req.businessId, req.userId);
  const results = await syncService.pushSync({
    products,
    inventory,
    employees,
    transactions,
    settings
  });
  
  // Emit real-time update to other connected clients
  const io = req.app.get('io');
  if (io) {
    io.to(`business:${req.businessId}`).emit('data:updated', {
      timestamp: new Date().toISOString(),
      updatedBy: req.userId,
      types: Object.keys(req.body)
    });
  }
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    results
  });
}));

/**
 * Sync products
 */
router.get('/products', asyncHandler(async (req, res) => {
  const { since, limit = 100, offset = 0 } = req.query;
  
  const syncService = new SyncService(req.businessId, req.userId);
  const products = await syncService.syncProducts({ since, limit, offset });
  
  res.json({
    success: true,
    data: products
  });
}));

router.post('/products', asyncHandler(async (req, res) => {
  const { products } = req.body;
  
  if (!Array.isArray(products)) {
    return res.status(400).json({
      success: false,
      error: 'Products must be an array'
    });
  }
  
  const syncService = new SyncService(req.businessId, req.userId);
  const results = await syncService.syncProductsUp(products);
  
  res.json({
    success: true,
    results
  });
}));

/**
 * Sync inventory
 */
router.get('/inventory', asyncHandler(async (req, res) => {
  const { since, limit = 100, offset = 0 } = req.query;
  
  const syncService = new SyncService(req.businessId, req.userId);
  const inventory = await syncService.syncInventory({ since, limit, offset });
  
  res.json({
    success: true,
    data: inventory
  });
}));

router.post('/inventory', asyncHandler(async (req, res) => {
  const { inventory } = req.body;
  
  if (!Array.isArray(inventory)) {
    return res.status(400).json({
      success: false,
      error: 'Inventory must be an array'
    });
  }
  
  const syncService = new SyncService(req.businessId, req.userId);
  const results = await syncService.syncInventoryUp(inventory);
  
  // Emit inventory update for real-time sync
  const io = req.app.get('io');
  if (io) {
    io.to(`business:${req.businessId}`).emit('inventory:updated', {
      timestamp: new Date().toISOString(),
      items: results.updated.length + results.created.length
    });
  }
  
  res.json({
    success: true,
    results
  });
}));

/**
 * Sync employees
 */
router.get('/employees', asyncHandler(async (req, res) => {
  const { since, limit = 100, offset = 0 } = req.query;
  
  const syncService = new SyncService(req.businessId, req.userId);
  const employees = await syncService.syncEmployees({ since, limit, offset });
  
  res.json({
    success: true,
    data: employees
  });
}));

router.post('/employees', asyncHandler(async (req, res) => {
  const { employees } = req.body;
  
  if (!Array.isArray(employees)) {
    return res.status(400).json({
      success: false,
      error: 'Employees must be an array'
    });
  }
  
  const syncService = new SyncService(req.businessId, req.userId);
  const results = await syncService.syncEmployeesUp(employees);
  
  res.json({
    success: true,
    results
  });
}));

/**
 * Sync transactions
 */
router.get('/transactions', asyncHandler(async (req, res) => {
  const { since, startDate, endDate, limit = 100, offset = 0 } = req.query;
  
  const syncService = new SyncService(req.businessId, req.userId);
  const transactions = await syncService.syncTransactions({ 
    since, 
    startDate, 
    endDate, 
    limit, 
    offset 
  });
  
  res.json({
    success: true,
    data: transactions
  });
}));

router.post('/transactions', asyncHandler(async (req, res) => {
  const { transactions } = req.body;
  
  if (!Array.isArray(transactions)) {
    return res.status(400).json({
      success: false,
      error: 'Transactions must be an array'
    });
  }
  
  const syncService = new SyncService(req.businessId, req.userId);
  const results = await syncService.syncTransactionsUp(transactions);
  
  // Emit transaction update for analytics
  const io = req.app.get('io');
  if (io) {
    io.to(`business:${req.businessId}`).emit('transactions:new', {
      timestamp: new Date().toISOString(),
      count: results.created.length,
      total: results.totalAmount
    });
  }
  
  res.json({
    success: true,
    results
  });
}));

/**
 * Conflict resolution
 */
router.post('/resolve', asyncHandler(async (req, res) => {
  const { conflicts, resolution } = req.body;
  
  if (!Array.isArray(conflicts)) {
    return res.status(400).json({
      success: false,
      error: 'Conflicts must be an array'
    });
  }
  
  const syncService = new SyncService(req.businessId, req.userId);
  const results = await syncService.resolveConflicts(conflicts, resolution);
  
  res.json({
    success: true,
    results
  });
}));

/**
 * Reset sync state (dangerous operation)
 */
router.post('/reset', asyncHandler(async (req, res) => {
  const { confirm, type } = req.body;
  
  if (confirm !== 'RESET_SYNC_STATE') {
    return res.status(400).json({
      success: false,
      error: 'Confirmation required. Send { confirm: "RESET_SYNC_STATE" }'
    });
  }
  
  logger.warn('Sync state reset requested', {
    userId: req.userId,
    businessId: req.businessId,
    type
  });
  
  const syncService = new SyncService(req.businessId, req.userId);
  const result = await syncService.resetSyncState(type);
  
  res.json({
    success: true,
    message: 'Sync state reset successfully',
    result
  });
}));

/**
 * Get sync history/logs
 */
router.get('/history', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  const syncService = new SyncService(req.businessId, req.userId);
  const history = await syncService.getSyncHistory({ limit, offset });
  
  res.json({
    success: true,
    data: history
  });
}));

export default router;