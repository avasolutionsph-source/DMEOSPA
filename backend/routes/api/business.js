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
    
    const response = {
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
    };
    
    console.log('📊 [BUSINESS-STATS] Sending response:', JSON.stringify(response, null, 2));
    console.log('📊 [BUSINESS-STATS] Response size:', JSON.stringify(response).length, 'bytes');
    console.log('📊 [BUSINESS-STATS] Total transactions found:', transactions.length);
    console.log('📊 [BUSINESS-STATS] Sample transaction:', transactions[0]);
    
    res.json(response);
  } catch (error) {
    logger.error('Get business stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get business statistics'
    });
  }
});

// GET /api/business/employees - Get employee data with calculated statistics
router.get('/employees', async (req, res) => {
  try {
    const Employee = (await import('../../models/Employee.js')).default;
    const Transaction = (await import('../../models/Transaction.js')).default;
    const userId = req.userId || req.user?.userId || req.user?.id;
    
    // Enhanced debugging for manager account employee access
    console.log('👥 [BUSINESS-EMPLOYEES] Request details:', {
      userId: userId,
      userRole: req.user?.role,
      userEmail: req.user?.email,
      reqUserId: req.userId,
      reqUserDetails: req.user
    });
    
    // ENHANCED: Support both userId and branchId filtering for manager accounts
    let query = { userId };
    
    // If no employees found with userId, try branchId for manager accounts
    let employees = await Employee.find(query);
    
    if (employees.length === 0 && req.user?.role === 'manager') {
      console.log('👥 [BUSINESS-EMPLOYEES] No employees found with userId, trying branchId for manager account...');
      const branchQuery = { branchId: userId };
      employees = await Employee.find(branchQuery);
      query = branchQuery;
      
      console.log('👥 [BUSINESS-EMPLOYEES] BranchId query result:', {
        foundEmployees: employees.length,
        branchId: userId
      });
    }
    
    console.log('👥 [BUSINESS-EMPLOYEES] Database query result:', {
      finalQuery: query,
      foundEmployees: employees.length,
      queryUserId: userId,
      userRole: req.user?.role,
      sampleEmployee: employees[0] ? {
        name: employees[0].firstName + ' ' + employees[0].lastName,
        userId: employees[0].userId,
        branchId: employees[0].branchId,
        role: employees[0].role
      } : null
    });
    
    // Get all transactions for this user to calculate stats
    const transactions = await Transaction.find({ userId });
    
    // Calculate statistics for each employee
    const employeesWithStats = employees.map(emp => {
      // Find all transactions for this employee
      const employeeTransactions = transactions.filter(t => {
        if (!t.employee) return false;
        
        // Check if transaction is linked to this employee
        // Handle both string and ObjectId comparisons
        const empId = emp._id.toString();
        const transEmpId = t.employee.id ? t.employee.id.toString() : '';
        
        return transEmpId === empId || 
               t.employee.name === emp.fullName || 
               t.employee.name === `${emp.firstName} ${emp.lastName}`;
      });
      
      // Calculate total sales and commission
      const totalSales = employeeTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
      const commissionRate = emp.commissionRate || emp.commission || 0;
      const totalCommission = totalSales * (commissionRate / 100);
      const transactionCount = employeeTransactions.length;
      
      return {
        id: emp._id,
        name: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        position: emp.position,
        email: emp.email,
        phone: emp.phone,
        hiredDate: emp.hireDate || emp.hiredDate,
        totalSales: totalSales,
        commission: commissionRate,
        totalCommission: totalCommission,
        totalTransactions: transactionCount, // Use calculated count, not static field
        transactions: transactionCount // Duplicate for compatibility
      };
    });
    
    // Log calculated stats for debugging
    console.log('📊 [BUSINESS-EMPLOYEES] Calculated stats for employees:', 
      employeesWithStats.map(e => ({
        name: e.name,
        totalSales: e.totalSales,
        transactions: e.transactions
      }))
    );
    
    // CRITICAL FIX: Return in standard API format that frontend expects
    res.json({
      success: true,
      data: employeesWithStats,
      employees: employeesWithStats, // Keep backward compatibility 
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
    const Inventory = (await import('../../models/InventoryItem.js')).default;
    const userId = req.userId || req.user?.userId || req.user?.id;
    
    const inventory = await Inventory.find({ userId });
    
    const lowStockItems = inventory.filter(item => {
      const stock = item.currentStock || item.quantity || 0;
      return stock <= (item.minStock || 5) && stock > 0;
    }).length;
    
    const outOfStockItems = inventory.filter(item => {
      const stock = item.currentStock || item.quantity || 0;
      return stock === 0;
    }).length;
    
    res.json({
      inventory: inventory.map(item => ({
        id: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        quantity: item.currentStock || item.quantity || 0,  // Use currentStock as quantity
        unit: item.unit,
        minStock: item.minStock,
        price: item.sellingPrice || item.price || 0,
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