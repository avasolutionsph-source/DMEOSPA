import express from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import transactionManager from '../../utils/transactionManager.js';
import Product from '../../models/Product.js';
import Inventory from '../../models/InventoryItem.js';
import Transaction from '../../models/Transaction.js';
import Employee from '../../models/Employee.js';

const router = express.Router();

// Apply optional auth to all routes
router.use(optionalAuth);

// Helper function to get userId safely
const getUserId = (req) => {
  // Try multiple possible sources for userId
  const userId = req.userId || 
                req.user?.userId || 
                req.user?.id || 
                req.user?._id ||
                req.user?.user_id ||
                'anonymous';
  
  // Log for debugging
  if (userId === 'anonymous') {
    logger.warn('No userId found in request', {
      hasUser: !!req.user,
      userKeys: req.user ? Object.keys(req.user) : [],
      hasAuth: !!req.headers.authorization
    });
  } else {
    logger.info('UserId extracted', { userId });
  }
  
  return userId;
};

// DISABLED: This route conflicts with the complete sync system
router.post('/products-DISABLED', async (req, res) => {
  try {
    const { products, productsSummary, lastSyncTime } = req.body;
    const userId = getUserId(req);
    
    logger.info('Products sync request', {
      userId,
      productCount: products?.length || 0,
      summary: productsSummary
    });
    
    // Only process if we have a valid userId (not anonymous)
    if (userId !== 'anonymous' && products !== undefined) {
      // CRITICAL: Only delete existing products if we have data to replace them
      // This prevents data loss when empty arrays are uploaded from new devices
      if (products.length > 0) {
        // Delete existing products only when we have new data to replace them
        await Product.deleteMany({ userId });
        const productsToSave = products.map((product, index) => ({
          ...product,
          userId,
          localId: product.localId || `${userId}_product_${Date.now()}_${index}`,
          lastModified: new Date(),
          syncedAt: new Date()
        }));
        
        // Use individual saves to handle duplicates gracefully
        const savedProducts = [];
        for (const product of productsToSave) {
          try {
            const savedProduct = new Product(product);
            await savedProduct.save();
            savedProducts.push(savedProduct);
          } catch (error) {
            if (error.code === 11000) {
              // Handle duplicate key error by updating instead
              try {
                const updated = await Product.findOneAndUpdate(
                  { userId, localId: product.localId },
                  product,
                  { new: true, upsert: true }
                );
                savedProducts.push(updated);
              } catch (updateError) {
                logger.error('Failed to upsert product', { userId, error: updateError.message });
              }
            } else {
              logger.error('Failed to save product', { userId, error: error.message });
            }
          }
        }
        
        logger.info('Products saved to database', {
          userId,
          count: savedProducts.length
        });
      } else {
        logger.info('Products cleared from database (empty sync)', { userId });
      }
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

// DISABLED: This route conflicts with the complete sync system
// Use the proper sync system in /backend/routes/sync/index.js instead
router.post('/inventory-DISABLED', async (req, res) => {
  try {
    const { inventory, inventorySummary, lastSyncTime } = req.body;
    const userId = getUserId(req);
    
    logger.info('Inventory sync request', {
      userId,
      inventoryCount: inventory?.length || 0,
      summary: inventorySummary
    });
    
    // Only process if we have a valid userId (not anonymous)
    if (userId !== 'anonymous' && inventory !== undefined) {
      // CRITICAL: Only delete existing inventory if we have data to replace them
      // This prevents data loss when empty arrays are uploaded from new devices
      if (inventory.length > 0) {
        // Delete existing inventory only when we have new data to replace them
        await Inventory.deleteMany({ userId });
        const inventoryToSave = inventory.map(item => ({
          userId,
          name: item.name || 'Unknown Item',
          sku: item.sku || '',
          description: item.description || item.notes || '',
          currentStock: item.quantity || item.currentStock || 0,  // Map quantity to currentStock
          minStock: item.minStock || 5,
          maxStock: item.maxStock,
          unit: item.unit || 'units',
          costPrice: item.costPrice || item.cost || 0,  // FIXED: Check costPrice first
          sellingPrice: item.sellingPrice || item.price || item.unitPrice || 0,  // FIXED: Check sellingPrice first
          supplier: item.supplier || '',
          category: item.category || 'Uncategorized',
          // CRITICAL MISSING FIELDS ADDED:
          availableInPOS: item.availableInPOS !== undefined ? item.availableInPOS : false,
          lowStockAlert: item.lowStockAlert !== undefined ? item.lowStockAlert : false,
          isActive: item.isActive !== undefined ? item.isActive : true,
          syncStatus: 'synced',
          lastSyncDate: new Date(),
          lastRestocked: item.lastRestocked || null
        }));
        
        await Inventory.insertMany(inventoryToSave);
        
        logger.info('Inventory saved to database', {
          userId,
          count: inventoryToSave.length
        });
      } else {
        logger.info('Inventory cleared from database (empty sync)', { userId });
      }
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
    
    // Only process if we have a valid userId (not anonymous)
    if (userId !== 'anonymous' && transactions !== undefined) {
      // CRITICAL: Only delete existing transactions if we have data to replace them
      // This prevents data loss when empty arrays are uploaded from new devices
      if (transactions.length > 0) {
        // Delete existing transactions only when we have new data to replace them
        await Transaction.deleteMany({ userId });
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
      } else {
        logger.info('Transactions cleared from database (empty sync)', { userId });
      }
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
    
    // Track employee ID mappings for response
    let employeeIdMapping = [];
    
    // Only process if we have a valid userId (not anonymous)
    if (userId !== 'anonymous' && employees !== undefined) {
      // CRITICAL: Only delete existing employees if we have data to replace them
      // This prevents data loss when empty arrays are uploaded from new devices
      if (employees.length > 0) {
        // CRITICAL FIX: Do NOT delete existing employees - use upsert to prevent data corruption
        // await Employee.deleteMany({ userId }); // DANGEROUS - causes ID mismatches and duplicates
        const employeesToSave = employees.map((employee, index) => {
          // Split name into firstName and lastName
          const nameParts = (employee.name || 'Unknown Employee').trim().split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || 'Employee';
          
          return {
            userId,
            localId: employee.localId || `${userId}_employee_${Date.now()}_${index}`,
            firstName,
            lastName,
            email: employee.email || '',
            phone: employee.phone || '',
            position: employee.position || 'No Position',
            hireDate: employee.hiredDate || employee.hireDate || new Date(),
            commissionRate: employee.commission || employee.commissionRate || 0,
            totalSales: employee.totalSales || 0,
            totalCommission: employee.totalCommission || 0,
            totalTransactions: employee.transactions || 0,
            isActive: true,
            syncStatus: 'synced',
            lastSyncDate: new Date()
          };
        });
        
        // Use upsert approach to handle duplicates gracefully and track ID mappings
        const savedEmployees = [];
        
        for (const employeeData of employeesToSave) {
          try {
            // Use findOneAndUpdate with upsert to prevent duplicates
            const result = await Employee.findOneAndUpdate(
              { 
                userId,
                localId: employeeData.localId
              },
              employeeData,
              { 
                upsert: true, 
                new: true, 
                runValidators: true,
                setDefaultsOnInsert: true
              }
            );
            
            savedEmployees.push(result);
            
            // Track ID mapping for PWA to update local records
            employeeIdMapping.push({
              oldId: employeeData.localId,
              newId: result._id.toString(),
              localId: result.localId,
              name: `${result.firstName} ${result.lastName}`,
              backendEmployeeId: result._id.toString()
            });
            
          } catch (error) {
            logger.error('Failed to sync employee', { 
              userId, 
              employee: employeeData.firstName + ' ' + employeeData.lastName,
              error: error.message 
            });
          }
        }
        
        logger.info('Employees saved to database', {
          userId,
          count: savedEmployees.length
        });
      } else {
        logger.info('Employees cleared from database (empty sync)', { userId });
      }
    }
    
    res.json({
      success: true,
      message: 'Employees synced',
      syncedCount: employees?.length || 0,
      employeeIdMapping: employeeIdMapping || [], // CRITICAL: Return ID mappings for PWA
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
      
      // DISABLED: Dangerous deleteMany operations that cause data corruption
      // Use individual sync endpoints instead for safer upsert operations
      
      /* 
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
      */
      
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

// GET /api/sync/pull - Pull latest data for marketing website
router.get('/pull', async (req, res) => {
  try {
    const userId = getUserId(req);
    
    logger.info('Data pull request for marketing website', { userId });
    
    if (userId === 'anonymous') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Pull all latest data for the user
    const [products, inventory, transactions, employees] = await Promise.all([
      Product.find({ userId }).sort({ lastModified: -1 }),
      Inventory.find({ userId }).sort({ lastSyncDate: -1 }),
      Transaction.find({ userId }).sort({ date: -1 }),
      Employee.find({ userId, isActive: true }).sort({ lastSyncDate: -1 })
    ]);
    
    // Calculate business summary
    const totalSales = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTransactions = transactions.filter(t => new Date(t.date) >= today);
    const todaySales = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTransactions = transactions.filter(t => new Date(t.date) >= thisMonth);
    const monthSales = monthTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
    
    const thisYear = new Date(today.getFullYear(), 0, 1);
    const yearTransactions = transactions.filter(t => new Date(t.date) >= thisYear);
    const yearSales = yearTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
    
    // Enrich employees with performance data
    const enrichedEmployees = employees.map(emp => {
      const empTransactions = transactions.filter(t => 
        t.employeeId === emp.localId || 
        t.employee?.id === emp.localId ||
        (t.employee?.name && t.employee.name.toLowerCase() === `${emp.firstName} ${emp.lastName}`.toLowerCase())
      );
      
      const empSales = empTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
      const empCommission = empSales * (emp.commissionRate || 0) / 100;
      
      return {
        id: emp.localId || emp._id,
        name: `${emp.firstName} ${emp.lastName}`,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        hiredDate: emp.hireDate,
        hireDate: emp.hireDate, // Both formats for compatibility
        commission: emp.commissionRate,
        commissionRate: emp.commissionRate,
        totalSales: empSales,
        totalCommission: empCommission,
        transactions: empTransactions.length,
        avgSale: empTransactions.length > 0 ? empSales / empTransactions.length : 0,
        lastSyncDate: emp.lastSyncDate
      };
    });
    
    const businessStats = {
      totalSales,
      totalTransactions: transactions.length,
      totalProducts: products.length,
      totalEmployees: employees.length,
      todaySales,
      todayTransactions: todayTransactions.length,
      monthSales,
      monthTransactions: monthTransactions.length,
      yearSales,
      yearTransactions: yearTransactions.length,
      lastSyncDate: new Date().toISOString()
    };
    
    logger.info('Data pulled successfully', {
      userId,
      counts: {
        products: products.length,
        inventory: inventory.length,
        transactions: transactions.length,
        employees: employees.length
      },
      businessStats: {
        totalSales,
        totalTransactions: transactions.length
      }
    });
    
    res.json({
      success: true,
      data: {
        products,
        inventory,
        transactions,
        employees: enrichedEmployees
      },
      businessStats,
      serverTime: new Date().toISOString(),
      lastSync: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Data pull error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pull data'
    });
  }
});

export default router;