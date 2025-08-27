import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply authentication to all business routes
router.use(authenticateJWT);

// GET /api/business
router.get('/', async (req, res) => {
  res.json({ 
    message: 'Business info placeholder',
    business: {
      id: 'placeholder-id',
      name: 'Sample Business',
      type: 'retail'
    }
  });
});

// POST /api/business
router.post('/', async (req, res) => {
  res.json({ 
    message: 'Business created placeholder',
    success: true 
  });
});

// PUT /api/business/:id
router.put('/:id', async (req, res) => {
  res.json({ 
    message: 'Business updated placeholder',
    success: true 
  });
});

// DELETE /api/business/:id
router.delete('/:id', async (req, res) => {
  res.json({ 
    message: 'Business deleted placeholder',
    success: true 
  });
});

// GET /api/business/stats - Get business statistics
router.get('/stats', async (req, res) => {
  try {
    // Import models dynamically
    const Transaction = (await import('../../models/Transaction.js')).default;
    const Product = (await import('../../models/Product.js')).default;
    const Employee = (await import('../../models/Employee.js')).default;
    
    const userId = req.userId || req.user?.userId || req.user?.id;
    
    // Get all transactions for this user
    const transactions = await Transaction.find({ userId });
    
    // Calculate stats
    let totalSales = 0;
    let totalTransactions = transactions.length;
    
    // Time-based calculations
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);
    
    let todaySales = 0;
    let monthSales = 0;
    let yearSales = 0;
    let todayTransactions = 0;
    let monthTransactions = 0;
    let yearTransactions = 0;
    
    transactions.forEach(t => {
      const transactionTotal = t.total || 0;
      totalSales += transactionTotal;
      
      const transactionDate = new Date(t.date || t.createdAt);
      
      if (transactionDate >= today) {
        todaySales += transactionTotal;
        todayTransactions++;
      }
      
      if (transactionDate >= thisMonth) {
        monthSales += transactionTotal;
        monthTransactions++;
      }
      
      if (transactionDate >= thisYear) {
        yearSales += transactionTotal;
        yearTransactions++;
      }
    });
    
    // Get counts
    const totalProducts = await Product.countDocuments({ userId });
    const totalEmployees = await Employee.countDocuments({ userId });
    
    res.json({
      totalSales,
      totalTransactions,
      totalProducts,
      totalEmployees,
      todaySales,
      todayTransactions,
      monthSales,
      monthTransactions,
      yearSales,
      yearTransactions,
      lastSyncDate: new Date()
    });
  } catch (error) {
    logger.error('Get business stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get business statistics'
    });
  }
});

// GET /api/business/employees - Get employee data
router.get('/employees', async (req, res) => {
  try {
    const Employee = (await import('../../models/Employee.js')).default;
    const userId = req.userId || req.user?.userId || req.user?.id;
    
    const employees = await Employee.find({ userId });
    
    res.json({
      employees: employees.map(emp => ({
        id: emp._id,
        name: emp.name,
        position: emp.position,
        email: emp.email,
        phone: emp.phone,
        hiredDate: emp.hiredDate,
        totalSales: emp.totalSales || 0,
        commission: emp.commission || 0,
        totalCommission: emp.totalCommission || 0
      })),
      totalEmployees: employees.length,
      lastSyncDate: new Date()
    });
  } catch (error) {
    logger.error('Get business employees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get employee data'
    });
  }
});

// GET /api/business/inventory - Get inventory data
router.get('/inventory', async (req, res) => {
  try {
    const Inventory = (await import('../../models/Inventory.js')).default;
    const userId = req.userId || req.user?.userId || req.user?.id;
    
    const inventory = await Inventory.find({ userId });
    
    const lowStockItems = inventory.filter(item => 
      item.quantity <= (item.minStock || 5)
    ).length;
    
    const outOfStockItems = inventory.filter(item => 
      item.quantity === 0
    ).length;
    
    res.json({
      inventory: inventory.map(item => ({
        id: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minStock: item.minStock,
        price: item.price,
        supplier: item.supplier
      })),
      totalItems: inventory.length,
      lowStockItems,
      outOfStockItems,
      lastSyncDate: new Date()
    });
  } catch (error) {
    logger.error('Get business inventory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory data'
    });
  }
});

export default router;