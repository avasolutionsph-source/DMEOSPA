import express from 'express';
import Product from '../models/Product.js';
import InventoryItem from '../models/InventoryItem.js';
import Employee from '../models/Employee.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Middleware to extract user ID from request
const getUserId = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && token !== 'pwa-demo-token') {
      // Try to decode JWT token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.userId = decoded.userId;
    } else {
      // Fallback for demo users
      req.userId = req.headers['x-user-id'] || 'demo-user';
    }
    next();
  } catch (error) {
    // If token is invalid, use demo user
    req.userId = 'demo-user';
    next();
  }
};

// Products sync endpoints
router.get('/products', getUserId, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/products', getUserId, async (req, res) => {
  try {
    const products = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    
    for (const productData of products) {
      const product = new Product({
        ...productData,
        userId: req.userId,
        syncStatus: 'synced',
        lastSyncDate: new Date()
      });
      
      await product.save();
      results.push(product);
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Create products error:', error);
    res.status(500).json({ error: 'Failed to create products' });
  }
});

router.put('/products/:id', getUserId, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        ...req.body, 
        syncStatus: 'synced',
        lastSyncDate: new Date()
      },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', getUserId, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Inventory sync endpoints
router.get('/inventory', getUserId, async (req, res) => {
  try {
    const inventory = await InventoryItem.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

router.post('/inventory', getUserId, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    
    for (const itemData of items) {
      const item = new InventoryItem({
        ...itemData,
        userId: req.userId,
        syncStatus: 'synced',
        lastSyncDate: new Date()
      });
      
      await item.save();
      results.push(item);
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({ error: 'Failed to create inventory items' });
  }
});

router.put('/inventory/:id', getUserId, async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        ...req.body, 
        syncStatus: 'synced',
        lastSyncDate: new Date()
      },
      { new: true }
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Employees sync endpoints
router.get('/employees', getUserId, async (req, res) => {
  try {
    const employees = await Employee.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.post('/employees', getUserId, async (req, res) => {
  try {
    const employees = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    
    for (const employeeData of employees) {
      const employee = new Employee({
        ...employeeData,
        userId: req.userId,
        syncStatus: 'synced',
        lastSyncDate: new Date()
      });
      
      await employee.save();
      results.push(employee);
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Create employees error:', error);
    res.status(500).json({ error: 'Failed to create employees' });
  }
});

// Transactions sync endpoints
router.get('/transactions', getUserId, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const transactions = await Transaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.post('/transactions', getUserId, async (req, res) => {
  try {
    const transactions = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    
    for (const transactionData of transactions) {
      const transaction = new Transaction({
        ...transactionData,
        userId: req.userId,
        syncStatus: 'synced',
        lastSyncDate: new Date()
      });
      
      await transaction.save();
      results.push(transaction);
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Create transactions error:', error);
    res.status(500).json({ error: 'Failed to create transactions' });
  }
});

// Bulk sync endpoint (what your PWA's sync.js expects)
router.post('/sync', getUserId, async (req, res) => {
  try {
    const { products, inventory, employees, transactions } = req.body;
    const results = {};
    
    // Sync products
    if (products && products.length > 0) {
      const productResults = [];
      for (const productData of products) {
        if (productData._id) {
          // Update existing
          const product = await Product.findOneAndUpdate(
            { _id: productData._id, userId: req.userId },
            { ...productData, syncStatus: 'synced', lastSyncDate: new Date() },
            { new: true, upsert: true }
          );
          productResults.push(product);
        } else {
          // Create new
          const product = new Product({
            ...productData,
            userId: req.userId,
            syncStatus: 'synced',
            lastSyncDate: new Date()
          });
          await product.save();
          productResults.push(product);
        }
      }
      results.products = productResults;
    }
    
    // Sync inventory
    if (inventory && inventory.length > 0) {
      const inventoryResults = [];
      for (const itemData of inventory) {
        if (itemData._id) {
          const item = await InventoryItem.findOneAndUpdate(
            { _id: itemData._id, userId: req.userId },
            { ...itemData, syncStatus: 'synced', lastSyncDate: new Date() },
            { new: true, upsert: true }
          );
          inventoryResults.push(item);
        } else {
          const item = new InventoryItem({
            ...itemData,
            userId: req.userId,
            syncStatus: 'synced',
            lastSyncDate: new Date()
          });
          await item.save();
          inventoryResults.push(item);
        }
      }
      results.inventory = inventoryResults;
    }
    
    // Sync employees
    if (employees && employees.length > 0) {
      const employeeResults = [];
      for (const employeeData of employees) {
        if (employeeData._id) {
          const employee = await Employee.findOneAndUpdate(
            { _id: employeeData._id, userId: req.userId },
            { ...employeeData, syncStatus: 'synced', lastSyncDate: new Date() },
            { new: true, upsert: true }
          );
          employeeResults.push(employee);
        } else {
          const employee = new Employee({
            ...employeeData,
            userId: req.userId,
            syncStatus: 'synced',
            lastSyncDate: new Date()
          });
          await employee.save();
          employeeResults.push(employee);
        }
      }
      results.employees = employeeResults;
    }
    
    // Sync transactions
    if (transactions && transactions.length > 0) {
      const transactionResults = [];
      for (const transactionData of transactions) {
        const transaction = new Transaction({
          ...transactionData,
          userId: req.userId,
          syncStatus: 'synced',
          lastSyncDate: new Date()
        });
        await transaction.save();
        transactionResults.push(transaction);
      }
      results.transactions = transactionResults;
    }
    
    res.json({ 
      success: true, 
      message: 'Sync completed successfully',
      data: results 
    });
  } catch (error) {
    console.error('Bulk sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// User summary endpoint for marketing website sync
router.get('/user-summary/:userId', getUserId, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get aggregated data for this user
    const [products, inventory, employees, transactions] = await Promise.all([
      Product.find({ userId }).countDocuments(),
      InventoryItem.find({ userId }).countDocuments(),
      Employee.find({ userId }).countDocuments(),
      Transaction.find({ userId })
    ]);

    // Calculate total sales from transactions
    const totalSales = transactions.reduce((sum, transaction) => {
      return sum + (transaction.total || 0);
    }, 0);

    const summary = {
      totalSales: totalSales,
      totalTransactions: transactions.length,
      totalProducts: products,
      totalEmployees: employees,
      lastUpdated: new Date()
    };

    res.json(summary);
  } catch (error) {
    console.error('User summary error:', error);
    res.status(500).json({ error: 'Failed to get user summary' });
  }
});

// Sync endpoints that match PWA expectations
router.post('/products/sync', getUserId, async (req, res) => {
  try {
    console.log('Products sync request for user:', req.userId);
    console.log('Products sync data:', req.body);
    
    // Handle empty or missing data
    if (!req.body.products || req.body.products.length === 0) {
      console.log('No products to sync');
      return res.json({ success: true, data: [], message: 'No products to sync' });
    }
    
    const products = Array.isArray(req.body.products) ? req.body.products : [req.body.products];
    const results = [];
    
    for (const productData of products) {
      // Skip invalid products
      if (!productData || !productData.name) {
        console.log('Skipping invalid product:', productData);
        continue;
      }
      
      const product = new Product({
        ...productData,
        userId: req.userId,
        syncStatus: 'synced',
        lastModified: new Date()
      });
      
      const savedProduct = await product.save();
      results.push(savedProduct);
    }
    
    console.log(`Synced ${results.length} products for user:`, req.userId);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Products sync error:', error);
    res.status(500).json({ error: 'Failed to sync products', details: error.message });
  }
});

router.post('/inventory/sync', getUserId, async (req, res) => {
  try {
    console.log('Inventory sync request for user:', req.userId);
    
    // Handle empty or missing data
    if (!req.body.inventory || req.body.inventory.length === 0) {
      console.log('No inventory to sync');
      return res.json({ success: true, data: [], message: 'No inventory to sync' });
    }
    
    const inventory = Array.isArray(req.body.inventory) ? req.body.inventory : [req.body.inventory];
    const results = [];
    
    for (const itemData of inventory) {
      // Skip invalid items
      if (!itemData || !itemData.name) {
        console.log('Skipping invalid inventory item:', itemData);
        continue;
      }
      
      const item = new InventoryItem({
        ...itemData,
        userId: req.userId,
        syncStatus: 'synced',
        lastModified: new Date()
      });
      
      const savedItem = await item.save();
      results.push(savedItem);
    }
    
    console.log(`Synced ${results.length} inventory items for user:`, req.userId);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Inventory sync error:', error);
    res.status(500).json({ error: 'Failed to sync inventory', details: error.message });
  }
});

router.post('/employees/sync', getUserId, async (req, res) => {
  try {
    console.log('Employees sync request for user:', req.userId);
    
    // Handle empty or missing data
    if (!req.body.employees || req.body.employees.length === 0) {
      console.log('No employees to sync');
      return res.json({ success: true, data: [], message: 'No employees to sync' });
    }
    
    const employees = Array.isArray(req.body.employees) ? req.body.employees : [req.body.employees];
    const results = [];
    
    for (const employeeData of employees) {
      // Skip invalid employees
      if (!employeeData || !employeeData.name) {
        console.log('Skipping invalid employee:', employeeData);
        continue;
      }
      
      const employee = new Employee({
        ...employeeData,
        userId: req.userId,
        syncStatus: 'synced',
        lastModified: new Date()
      });
      
      const savedEmployee = await employee.save();
      results.push(savedEmployee);
    }
    
    console.log(`Synced ${results.length} employees for user:`, req.userId);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Employees sync error:', error);
    res.status(500).json({ error: 'Failed to sync employees', details: error.message });
  }
});

router.post('/transactions/sync', getUserId, async (req, res) => {
  try {
    console.log('Transactions sync request for user:', req.userId);
    
    // Handle empty or missing data
    if (!req.body.transactions || req.body.transactions.length === 0) {
      console.log('No transactions to sync');
      return res.json({ success: true, data: [], message: 'No transactions to sync' });
    }
    
    const transactions = Array.isArray(req.body.transactions) ? req.body.transactions : [req.body.transactions];
    const results = [];
    
    for (const transactionData of transactions) {
      // Skip invalid transactions
      if (!transactionData || (!transactionData.id && !transactionData._id)) {
        console.log('Skipping invalid transaction:', transactionData);
        continue;
      }
      
      // Auto-generate missing fields
      const processedTransaction = {
        ...transactionData,
        userId: req.userId,
        syncStatus: 'synced',
        lastModified: new Date()
      };
      
      // Generate transactionId if missing
      if (!processedTransaction.transactionId) {
        processedTransaction.transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Calculate subtotal if missing
      if (!processedTransaction.subtotal && processedTransaction.items && processedTransaction.items.length > 0) {
        processedTransaction.subtotal = processedTransaction.items.reduce((sum, item) => {
          return sum + (item.subtotal || (item.price * item.quantity) || 0);
        }, 0);
      }
      
      // Ensure total exists
      if (!processedTransaction.total) {
        processedTransaction.total = (processedTransaction.subtotal || 0) + (processedTransaction.tax || 0) - (processedTransaction.discount || 0);
      }
      
      const transaction = new Transaction(processedTransaction);
      
      const savedTransaction = await transaction.save();
      results.push(savedTransaction);
    }
    
    console.log(`Synced ${results.length} transactions for user:`, req.userId);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Transactions sync error:', error);
    res.status(500).json({ error: 'Failed to sync transactions', details: error.message });
  }
});

// Chatbot sync endpoints
router.get('/chatbot', getUserId, async (req, res) => {
  try {
    // For now, return empty chatbot history
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Get chatbot history error:', error);
    res.status(500).json({ error: 'Failed to fetch chatbot history' });
  }
});

router.post('/chatbot', getUserId, async (req, res) => {
  try {
    // For now, just acknowledge the sync
    console.log('Chatbot history synced for user:', req.userId);
    res.json({ success: true, message: 'Chatbot history synced successfully' });
  } catch (error) {
    console.error('Sync chatbot history error:', error);
    res.status(500).json({ error: 'Failed to sync chatbot history' });
  }
});

router.post('/chatbot/sync', getUserId, async (req, res) => {
  // Redirect to chatbot endpoint
  req.url = '/chatbot';
  router.handle(req, res);
});

export default router;
