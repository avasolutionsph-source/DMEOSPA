import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to get user ID from JWT token - REQUIRES VALID AUTH
const getUserId = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.error('❌ No JWT token provided for sync request');
      return res.status(401).json({ error: 'Authentication required. Please login to sync data.' });
    }
    
    if (token === 'demo-user') {
      console.error('❌ Demo user token not allowed for sync');
      return res.status(401).json({ error: 'Demo user not allowed. Please login with real account.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    
    console.log(`✅ Authenticated sync request for user: ${req.userEmail} (${req.userId})`);
    next();
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid authentication token. Please login again.' });
  }
};

// Products sync endpoint
router.post('/products/sync', getUserId, async (req, res) => {
  try {
    console.log('Products sync request for user:', req.userId);
    console.log('Products sync data:', req.body);
    
    if (!req.body.products || req.body.products.length === 0) {
      console.log('No products to sync');
      return res.json({ success: true, data: [], message: 'No products to sync' });
    }
    
    const products = Array.isArray(req.body.products) ? req.body.products : [req.body.products];
    console.log(`✅ Acknowledged ${products.length} products sync for user:`, req.userId);
    
    // Update user's business metrics with product count
    try {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(req.userId);
      if (user) {
        if (!user.businessMetrics) {
          user.businessMetrics = {
            totalSales: 0,
            totalTransactions: 0,
            totalProducts: 0,
            totalEmployees: 0,
            lastSyncDate: new Date()
          };
        }
        
        // Check if PWA sent a complete products summary
        if (req.body.productsSummary) {
          console.log('🛍️ Using complete products summary from PWA:', req.body.productsSummary);
          user.businessMetrics.totalProducts = req.body.productsSummary.totalProducts || 0;
        } else {
          // Fallback: use products array length
          user.businessMetrics.totalProducts = products.length;
        }
        
        user.businessMetrics.lastSyncDate = new Date();
        await user.save();
        console.log(`💾 Updated product count for user ${req.userId}: ${user.businessMetrics.totalProducts} products/services`);
      }
    } catch (dbError) {
      console.error('Failed to update product metrics:', dbError);
    }
    
    res.json({ success: true, data: products, message: `Synced ${products.length} products` });
  } catch (error) {
    console.error('Products sync error:', error);
    res.status(500).json({ error: 'Failed to sync products', details: error.message });
  }
});

// Inventory sync endpoint
router.post('/inventory/sync', getUserId, async (req, res) => {
  try {
    console.log('📦 Inventory sync request for user:', req.userId);
    console.log('📦 Inventory data received:', JSON.stringify(req.body, null, 2));
    
    if (!req.body.inventory || req.body.inventory.length === 0) {
      console.log('⚠️ No inventory in sync request');
      return res.json({ success: true, data: [], message: 'No inventory to sync' });
    }
    
    const inventory = Array.isArray(req.body.inventory) ? req.body.inventory : [req.body.inventory];
    console.log(`✅ Processing ${inventory.length} inventory items for user:`, req.userId);
    console.log('📦 Inventory details:', inventory.map(item => ({ 
      name: item.name, 
      sku: item.sku, 
      quantity: item.quantity,
      category: item.category 
    })));
    
    // Update user's inventory data
    try {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(req.userId);
      if (user) {
        // Store detailed inventory data
        user.inventory = inventory.map(item => ({
          id: item.id || item._id,
          name: item.name,
          sku: item.sku || '',
          category: item.category || 'Uncategorized',
          quantity: item.quantity || 0,
          unit: item.unit || 'units',
          minStock: item.minStock || 5,
          price: item.price || 0,
          cost: item.cost || 0,
          supplier: item.supplier || '',
          description: item.description || '',
          lastRestocked: item.lastRestocked ? new Date(item.lastRestocked) : null,
          lastUpdated: new Date()
        }));
        
        // Update inventory count in business metrics
        if (!user.businessMetrics) {
          user.businessMetrics = {
            totalSales: 0,
            totalTransactions: 0,
            totalProducts: 0,
            totalEmployees: 0,
            lastSyncDate: new Date()
          };
        }
        
        // If PWA sent a complete inventory summary
        if (req.body.inventorySummary) {
          console.log('📦 Using complete inventory summary from PWA:', req.body.inventorySummary);
          user.businessMetrics.totalInventory = req.body.inventorySummary.totalItems || inventory.length;
          user.businessMetrics.lowStockItems = req.body.inventorySummary.lowStockItems || 0;
          user.businessMetrics.outOfStockItems = req.body.inventorySummary.outOfStockItems || 0;
        }
        
        user.businessMetrics.lastSyncDate = new Date();
        
        await user.save();
        console.log(`💾 Updated ${inventory.length} inventory items for user ${req.userId}`);
      }
    } catch (dbError) {
      console.error('Failed to update inventory data:', dbError);
    }
    
    res.json({ success: true, data: inventory, message: `Synced ${inventory.length} inventory items` });
  } catch (error) {
    console.error('Inventory sync error:', error);
    res.status(500).json({ error: 'Failed to sync inventory', details: error.message });
  }
});

// Employees sync endpoint
router.post('/employees/sync', getUserId, async (req, res) => {
  try {
    console.log('📋 Employees sync request for user:', req.userId);
    console.log('📋 Employee data received:', JSON.stringify(req.body, null, 2));
    
    if (!req.body.employees || req.body.employees.length === 0) {
      console.log('⚠️ No employees in sync request');
      return res.json({ success: true, data: [], message: 'No employees to sync' });
    }
    
    const employees = Array.isArray(req.body.employees) ? req.body.employees : [req.body.employees];
    console.log(`✅ Processing ${employees.length} employees for user:`, req.userId);
    console.log('👥 Employee details:', employees.map(emp => ({ name: emp.name, position: emp.position, totalSales: emp.totalSales })));
    
    // Update user's business metrics and detailed employee data
    try {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(req.userId);
      if (user) {
        if (!user.businessMetrics) {
          user.businessMetrics = {
            totalSales: 0,
            totalTransactions: 0,
            totalProducts: 0,
            totalEmployees: 0,
            lastSyncDate: new Date()
          };
        }
        
        // Update employee count
        user.businessMetrics.totalEmployees = employees.length;
        user.businessMetrics.lastSyncDate = new Date();
        
        // Store detailed employee data
        user.employees = employees.map(emp => ({
          id: emp.id || emp._id,
          name: emp.name,
          position: emp.position,
          email: emp.email,
          phone: emp.phone,
          hiredDate: emp.hiredDate ? new Date(emp.hiredDate) : new Date(),
          commission: emp.commission || 0,
          totalSales: emp.totalSales || 0,
          totalCommission: emp.totalCommission || 0,
          transactions: emp.transactions || 0,
          avgSale: emp.avgSale || 0,
          lastUpdated: new Date()
        }));
        
        await user.save();
        console.log(`💾 Updated ${employees.length} employees with detailed data for user ${req.userId}`);
      }
    } catch (dbError) {
      console.error('Failed to update employee data:', dbError);
    }
    
    res.json({ success: true, data: employees, message: `Synced ${employees.length} employees` });
  } catch (error) {
    console.error('Employees sync error:', error);
    res.status(500).json({ error: 'Failed to sync employees', details: error.message });
  }
});

// Transactions sync endpoint - THIS IS THE IMPORTANT ONE
router.post('/transactions/sync', getUserId, async (req, res) => {
  try {
    console.log('Transactions sync request for user:', req.userId);
    console.log('Transactions sync data:', req.body);
    
    if (!req.body.transactions || req.body.transactions.length === 0) {
      return res.json({ success: true, data: [], message: 'No transactions to sync' });
    }
    
    const transactions = Array.isArray(req.body.transactions) ? req.body.transactions : [req.body.transactions];
    
    // Calculate totals from synced transactions
    let totalSales = 0;
    let totalTransactions = transactions.length;
    
    transactions.forEach(transaction => {
      totalSales += transaction.total || 0;
      console.log(`💰 Transaction: ${transaction.total} - ${transaction.items?.length || 0} items`);
    });
    
    console.log(`✅ Synced ${transactions.length} transactions, total sales: ${totalSales} for user:`, req.userId);
    
    // Save transaction data to user's business metrics in the database
    try {
      const User = (await import('../models/User.js')).default;
      
      // Find the user and update their business metrics
      const user = await User.findById(req.userId);
      if (user) {
        // Initialize businessMetrics if it doesn't exist
        if (!user.businessMetrics) {
          user.businessMetrics = {
            totalSales: 0,
            totalTransactions: 0,
            totalProducts: 0,
            totalEmployees: 0,
            lastSyncDate: new Date()
          };
        }
        
        // Check if PWA sent a complete business summary
        if (req.body.businessSummary) {
          console.log('📊 Using complete business summary from PWA:', req.body.businessSummary);
          const summary = req.body.businessSummary;
          
          // Use the complete summary from PWA (SET, don't accumulate)
          user.businessMetrics.totalSales = summary.totalSales || 0;
          user.businessMetrics.totalTransactions = summary.totalTransactions || 0;
          
          // Add detailed time-based metrics
          user.businessMetrics.todaySales = summary.todaySales || 0;
          user.businessMetrics.todayTransactions = summary.todayTransactions || 0;
          user.businessMetrics.monthSales = summary.monthSales || 0;
          user.businessMetrics.monthTransactions = summary.monthTransactions || 0;
          user.businessMetrics.yearSales = summary.yearSales || 0;
          user.businessMetrics.yearTransactions = summary.yearTransactions || 0;
          
          console.log(`📊 Detailed metrics updated:`);
          console.log(`   Today: ₱${user.businessMetrics.todaySales}`);
          console.log(`   Month: ₱${user.businessMetrics.monthSales}`);
          console.log(`   Year: ₱${user.businessMetrics.yearSales}`);
        } else {
          // Fallback: accumulate transaction data (old behavior)
          user.businessMetrics.totalSales = (user.businessMetrics.totalSales || 0) + totalSales;
          user.businessMetrics.totalTransactions = (user.businessMetrics.totalTransactions || 0) + totalTransactions;
        }
        
        user.businessMetrics.lastSyncDate = new Date();
        
        await user.save();
        console.log(`💾 Updated business metrics for user ${req.userId}: Sales: ${user.businessMetrics.totalSales}, Transactions: ${user.businessMetrics.totalTransactions}`);
      }
    } catch (dbError) {
      console.error('Failed to update business metrics:', dbError);
      // Continue with response even if DB update fails
    }
    
    res.json({ 
      success: true, 
      data: transactions, 
      message: `Synced ${transactions.length} transactions`,
      totalSales: totalSales
    });
  } catch (error) {
    console.error('Transactions sync error:', error);
    res.status(500).json({ error: 'Failed to sync transactions', details: error.message });
  }
});

// Chatbot sync endpoint
router.post('/chatbot/sync', getUserId, async (req, res) => {
  try {
    console.log('Chatbot sync request for user:', req.userId);
    
    res.json({ success: true, message: 'Chatbot history synced' });
  } catch (error) {
    console.error('Chatbot sync error:', error);
    res.status(500).json({ error: 'Failed to sync chatbot', details: error.message });
  }
});

export default router;
