import express from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import Product from '../../models/Product.js';
import Inventory from '../../models/InventoryItem.js';
import Transaction from '../../models/Transaction.js';
import Employee from '../../models/Employee.js';

const router = express.Router();

// Apply optional auth to all routes
router.use(optionalAuth);

// Helper function to get userId safely
const getUserId = (req) => {
  return req.userId || req.user?.userId || req.user?.id || req.user?._id || 'anonymous';
};

// POST /api/sync/products - Sync products
router.post('/products', async (req, res) => {
  try {
    const { products, productsSummary, lastSyncTime } = req.body;
    const userId = getUserId(req);
    
    logger.info('Products sync request', {
      userId,
      productCount: products?.length || 0,
      summary: productsSummary
    });
    
    // Only save if we have a valid userId (not anonymous)
    if (userId !== 'anonymous' && products && products.length > 0) {
      // Delete existing products for this user
      await Product.deleteMany({ userId });
      
      // Save new products
      const productsToSave = products.map(product => ({
        ...product,
        userId,
        lastModified: new Date(),
        syncedAt: new Date()
      }));
      
      await Product.insertMany(productsToSave);
      
      logger.info('Products saved to database', {
        userId,
        count: productsToSave.length
      });
    }
    
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
    const { inventory, inventorySummary, lastSyncTime } = req.body;
    const userId = getUserId(req);
    
    logger.info('Inventory sync request', {
      userId,
      inventoryCount: inventory?.length || 0,
      summary: inventorySummary
    });
    
    // Only save if we have a valid userId
    if (userId !== 'anonymous' && inventory && inventory.length > 0) {
      // Delete existing inventory for this user
      await Inventory.deleteMany({ userId });
      
      // Save new inventory items
      const inventoryToSave = inventory.map(item => ({
        ...item,
        userId,
        lastModified: new Date(),
        syncedAt: new Date()
      }));
      
      await Inventory.insertMany(inventoryToSave);
      
      logger.info('Inventory saved to database', {
        userId,
        count: inventoryToSave.length
      });
    }
    
    res.json({
      success: true,
      message: 'Inventory synced',
      syncedCount: inventory?.length || 0,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Inventory sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// POST /api/sync/transactions - Sync transactions
router.post('/transactions', async (req, res) => {
  try {
    const { transactions, businessSummary, lastSyncTime } = req.body;
    const userId = getUserId(req);
    
    logger.info('Transactions sync request', {
      userId,
      transactionCount: transactions?.length || 0,
      businessSummary
    });
    
    // Only save if we have a valid userId
    if (userId !== 'anonymous' && transactions && transactions.length > 0) {
      // Delete existing transactions for this user
      await Transaction.deleteMany({ userId });
      
      // Save new transactions
      const transactionsToSave = transactions.map(transaction => ({
        ...transaction,
        userId,
        date: transaction.date || transaction.createdAt || new Date(),
        total: transaction.total || 0,
        syncedAt: new Date()
      }));
      
      await Transaction.insertMany(transactionsToSave);
      
      logger.info('Transactions saved to database', {
        userId,
        count: transactionsToSave.length,
        totalSales: businessSummary?.totalSales
      });
    }
    
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
    const userId = getUserId(req);
    
    logger.info('Employees sync request', {
      userId,
      employeeCount: employees?.length || 0
    });
    
    // Only save if we have a valid userId
    if (userId !== 'anonymous' && employees && employees.length > 0) {
      // Delete existing employees for this user
      await Employee.deleteMany({ userId });
      
      // Save new employees
      const employeesToSave = employees.map(employee => ({
        ...employee,
        userId,
        hiredDate: employee.hiredDate || new Date(),
        totalSales: employee.totalSales || 0,
        commission: employee.commission || 0,
        totalCommission: employee.totalCommission || 0,
        syncedAt: new Date()
      }));
      
      await Employee.insertMany(employeesToSave);
      
      logger.info('Employees saved to database', {
        userId,
        count: employeesToSave.length
      });
    }
    
    res.json({
      success: true,
      message: 'Employees synced',
      syncedCount: employees?.length || 0,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Employees sync error:', error);
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
    const userId = getUserId(req);
    
    logger.info('Full sync request', {
      userId,
      hasData: !!data
    });
    
    // Process each data type if provided
    if (userId !== 'anonymous' && data) {
      const promises = [];
      
      if (data.products && data.products.length > 0) {
        promises.push(Product.deleteMany({ userId }).then(() => 
          Product.insertMany(data.products.map(p => ({ ...p, userId })))
        ));
      }
      
      if (data.inventory && data.inventory.length > 0) {
        promises.push(Inventory.deleteMany({ userId }).then(() => 
          Inventory.insertMany(data.inventory.map(i => ({ ...i, userId })))
        ));
      }
      
      if (data.transactions && data.transactions.length > 0) {
        promises.push(Transaction.deleteMany({ userId }).then(() => 
          Transaction.insertMany(data.transactions.map(t => ({ ...t, userId })))
        ));
      }
      
      if (data.employees && data.employees.length > 0) {
        promises.push(Employee.deleteMany({ userId }).then(() => 
          Employee.insertMany(data.employees.map(e => ({ ...e, userId })))
        ));
      }
      
      await Promise.all(promises);
      
      logger.info('Full sync completed', {
        userId,
        synced: {
          products: data.products?.length || 0,
          inventory: data.inventory?.length || 0,
          transactions: data.transactions?.length || 0,
          employees: data.employees?.length || 0
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Full sync completed',
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Full sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
});

// GET /api/sync/status - Get sync status
router.get('/status', async (req, res) => {
  try {
    const userId = getUserId(req);
    
    // Get counts if user is authenticated
    let counts = {};
    if (userId !== 'anonymous') {
      counts = {
        products: await Product.countDocuments({ userId }),
        inventory: await Inventory.countDocuments({ userId }),
        transactions: await Transaction.countDocuments({ userId }),
        employees: await Employee.countDocuments({ userId })
      };
    }
    
    res.json({
      success: true,
      lastSync: new Date().toISOString(),
      serverTime: new Date().toISOString(),
      syncEnabled: true,
      userId: userId !== 'anonymous' ? userId : null,
      counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status'
    });
  }
});

// POST /api/sync/changes - Get changes (currently returns empty - for future implementation)
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