import express from 'express';
import { authenticateJWT, optionalAuth } from '../../middleware/auth.js';
import { Product, Employee, Transaction, InventoryItem, Customer } from '../../models/index.js';
import { processBulkTransactions, preventDuplicateProcessing, validateEmployeeData } from '../../middleware/transactionProcessor.js';
import { validateEmployeeReferences, ensureEmployeeExists, logEmployeeIdMappingIssues } from '../../middleware/employeeIdValidation.js';

const router = express.Router();

// GET /api/sync/status - Check sync system status
router.get('/status', optionalAuth, (req, res) => {
  res.json({ 
    status: 'operational',
    authenticated: !!req.user,
    timestamp: new Date().toISOString()
  });
});

// POST /api/sync/products - Sync products
router.post('/products', optionalAuth, async (req, res) => {
  try {
    const { products, lastSync } = req.body;
    const userId = req.user?.id || 'anonymous';
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array is required' });
    }
    
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const productData of products) {
      try {
        const filter = {
          userId: userId,
          localId: productData.id?.toString()
        };
        
        const productDoc = {
          userId: userId,
          localId: productData.id?.toString(),
          name: productData.name,
          category: productData.category || 'service',
          price: productData.price || 0,
          description: productData.description || '',
          duration: productData.duration || null,
          sku: productData.sku || null,
          inventoryUsage: productData.inventoryUsage || [],
          isActive: productData.isActive !== false,
          syncStatus: 'synced',
          lastSyncDate: new Date()
        };
        
        const result = await Product.findOneAndUpdate(
          filter,
          productDoc,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        if (result.isNew || result.upserted) {
          savedCount++;
        } else {
          updatedCount++;
        }
      } catch (itemError) {
        console.error('Error syncing product:', productData.name, itemError);
      }
    }
    
    res.json({ 
      success: true,
      message: 'Products synced to MongoDB',
      saved: savedCount,
      updated: updatedCount,
      total: products.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Products sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// REMOVED: Duplicate transaction sync route - causes route conflicts
// The advanced route (line 437) with middleware provides better functionality
// POST /api/sync/transactions - Sync transactions
/* router.post('/transactions', optionalAuth, async (req, res) => {
  try {
    const { transactions, lastSync } = req.body;
    const userId = req.user?.id || 'anonymous';
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Transactions array is required' });
    }
    
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const transactionData of transactions) {
      try {
        // Create a unique identifier for this transaction
        const uniqueId = transactionData.transactionId || 
                        transactionData.id?.toString() || 
                        `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // For existing transactions without localId, use other identifiers
        const filter = transactionData.id?.toString() ? 
          { userId: userId, localId: transactionData.id.toString() } :
          { 
            userId: userId, 
            transactionId: uniqueId,
            total: transactionData.total,
            employeeId: transactionData.employeeId
          };
        
        const transactionDoc = {
          userId: userId,
          localId: transactionData.id?.toString() || uniqueId,
          transactionId: uniqueId,
          items: transactionData.items || [],
          subtotal: transactionData.subtotal || 0,
          tax: transactionData.tax || 0,
          discount: transactionData.discount || 0,
          discountDetails: transactionData.discountDetails || {},
          gcAmount: transactionData.gcAmount || 0,
          total: transactionData.total || 0,
          paymentMethod: transactionData.paymentMethod || 'cash',
          paymentStatus: transactionData.paymentStatus || 'completed',
          employeeId: transactionData.employeeId,
          employeeName: transactionData.employeeName,
          employeeCommission: transactionData.employeeCommission || 0,
          customerName: transactionData.customerName,
          customerPhone: transactionData.customerPhone,
          customerEmail: transactionData.customerEmail,
          status: transactionData.status || 'completed',
          date: transactionData.date || transactionData.auditLog?.createdAt || new Date(),
          auditLog: {
            createdBy: transactionData.auditLog?.createdBy || userId,
            createdAt: transactionData.auditLog?.createdAt || transactionData.date || new Date(),
            terminal: transactionData.auditLog?.terminal || 'PWA',
            modifications: transactionData.auditLog?.modifications || []
          },
          syncStatus: 'synced',
          lastSyncDate: new Date()
        };
        
        const result = await Transaction.findOneAndUpdate(
          filter,
          transactionDoc,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        if (result.isNew || result.upserted) {
          savedCount++;
        } else {
          updatedCount++;
        }
      } catch (itemError) {
        console.error('Error syncing transaction:', transactionData.id, itemError);
      }
    }
    
    res.json({ 
      success: true,
      message: 'Transactions synced to MongoDB',
      saved: savedCount,
      updated: updatedCount,
      total: transactions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transactions sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
}); */

// POST /api/sync/employees - Sync employees
router.post('/employees', optionalAuth, logEmployeeIdMappingIssues, validateEmployeeReferences, async (req, res) => {
  try {
    const { employees, lastSync } = req.body;
    const userId = req.user?.id || 'anonymous';
    
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ error: 'Employees array is required' });
    }
    
    let savedCount = 0;
    let updatedCount = 0;
    const employeeIdMapping = []; // Track ID mappings for PWA
    
    for (const employeeData of employees) {
      try {
        const filter = {
          userId: userId,
          localId: employeeData.id?.toString()
        };
        
        // Split name into firstName and lastName to match Employee model
        const nameParts = (employeeData.name || 'Employee').trim().split(' ');
        const firstName = nameParts[0] || 'Employee';
        const lastName = nameParts.slice(1).join(' ') || 'Staff';
        
        const employeeDoc = {
          userId: userId,
          localId: employeeData.id?.toString(),
          firstName: firstName,
          lastName: lastName,
          email: employeeData.email,
          phone: employeeData.phone,
          position: employeeData.position || 'Staff',
          department: employeeData.department,
          hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : new Date(),
          commissionRate: employeeData.commissionRate || 0,
          totalSales: employeeData.totalSales || 0,
          totalCommission: employeeData.totalCommission || 0,
          totalTransactions: employeeData.totalTransactions || 0,
          isActive: employeeData.isActive !== false,
          syncStatus: 'synced',
          lastSyncDate: new Date()
        };
        
        const result = await Employee.findOneAndUpdate(
          filter,
          employeeDoc,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        // Track ID mapping for PWA to update local records
        employeeIdMapping.push({
          oldId: employeeData.id?.toString(),
          newId: result._id.toString(),
          localId: result.localId,
          name: `${result.firstName} ${result.lastName}`,
          backendEmployeeId: result._id.toString()
        });
        
        if (result.isNew || result.upserted) {
          savedCount++;
        } else {
          updatedCount++;
        }
      } catch (itemError) {
        console.error('Error syncing employee:', employeeData.name, itemError);
      }
    }
    
    res.json({ 
      success: true,
      message: 'Employees synced to MongoDB',
      saved: savedCount,
      updated: updatedCount,
      total: employees.length,
      employeeIdMapping: employeeIdMapping, // Return ID mappings for PWA
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Employees sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/inventory - Sync inventory
router.post('/inventory', optionalAuth, async (req, res) => {
  try {
    const { inventory, lastSync } = req.body;
    const userId = req.user?.id || 'anonymous';
    
    if (!inventory || !Array.isArray(inventory)) {
      return res.status(400).json({ error: 'Inventory array is required' });
    }
    
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const inventoryData of inventory) {
      try {
        const filter = {
          userId: userId,
          localId: inventoryData.id?.toString()
        };
        
        const inventoryDoc = {
          userId: userId,
          localId: inventoryData.id?.toString(),
          name: inventoryData.name,
          sku: inventoryData.sku,
          category: inventoryData.category || 'general',
          quantity: inventoryData.quantity || 0,
          currentStock: inventoryData.currentStock || inventoryData.quantity || 0,
          unit: inventoryData.unit || 'piece',
          costPrice: inventoryData.costPrice || inventoryData.cost || 0,  // FIXED: Use costPrice field
          sellingPrice: inventoryData.sellingPrice || inventoryData.price || 0,
          minStock: inventoryData.minStock || 0,
          maxStock: inventoryData.maxStock || null,
          supplier: inventoryData.supplier,
          location: inventoryData.location,
          description: inventoryData.description,
          expiryDate: inventoryData.expiryDate ? new Date(inventoryData.expiryDate) : null,
          // CRITICAL MISSING FIELDS ADDED:
          availableInPOS: inventoryData.availableInPOS !== undefined ? inventoryData.availableInPOS : false,
          lowStockAlert: inventoryData.lowStockAlert !== undefined ? inventoryData.lowStockAlert : false,
          isActive: inventoryData.isActive !== false,
          syncStatus: 'synced',
          lastSyncDate: new Date()
        };
        
        const result = await InventoryItem.findOneAndUpdate(
          filter,
          inventoryDoc,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        if (result.isNew || result.upserted) {
          savedCount++;
        } else {
          updatedCount++;
        }
      } catch (itemError) {
        console.error('Error syncing inventory item:', inventoryData.name, itemError);
      }
    }
    
    res.json({ 
      success: true,
      message: 'Inventory synced to MongoDB',
      saved: savedCount,
      updated: updatedCount,
      total: inventory.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Inventory sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/customers - Sync customers
router.post('/customers', optionalAuth, async (req, res) => {
  try {
    const { customers, lastSync } = req.body;
    const userId = req.user?.id || 'anonymous';
    
    if (!customers || !Array.isArray(customers)) {
      return res.status(400).json({ error: 'Customers array is required' });
    }
    
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const customerData of customers) {
      try {
        const filter = {
          userId: userId,
          localId: customerData.id?.toString()
        };
        
        const customerDoc = {
          userId: userId,
          localId: customerData.id?.toString(),
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
          totalVisits: customerData.totalVisits || 0,
          totalSpent: customerData.totalSpent || 0,
          lastVisit: customerData.lastVisit ? new Date(customerData.lastVisit) : null,
          favoriteServices: customerData.favoriteServices || [],
          notes: customerData.notes,
          isActive: customerData.isActive !== false,
          syncStatus: 'synced',
          lastSyncDate: new Date()
        };
        
        const result = await Customer.findOneAndUpdate(
          filter,
          customerDoc,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        if (result.isNew || result.upserted) {
          savedCount++;
        } else {
          updatedCount++;
        }
      } catch (itemError) {
        console.error('Error syncing customer:', customerData.firstName, customerData.lastName, itemError);
      }
    }
    
    res.json({ 
      success: true,
      message: 'Customers synced to MongoDB',
      saved: savedCount,
      updated: updatedCount,
      total: customers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Customers sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/chatbot-history - Sync chatbot history
router.post('/chatbot-history', optionalAuth, async (req, res) => {
  try {
    const { history, lastSync } = req.body;
    
    // Chatbot history is intentionally kept local to PWA only
    // Just acknowledge receipt
    res.json({ 
      success: true,
      message: 'Chatbot history acknowledged (stored locally only)',
      count: history?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chatbot history sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/all - Sync all data
router.post('/all', optionalAuth, async (req, res) => {
  try {
    const { data, lastSync } = req.body;
    
    res.json({ 
      success: true,
      message: 'Full sync received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Full sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// POST /api/sync/transactions - Sync transactions from PWA
router.post('/transactions', optionalAuth, logEmployeeIdMappingIssues, validateEmployeeReferences, ensureEmployeeExists, preventDuplicateProcessing, validateEmployeeData, processBulkTransactions, async (req, res) => {
  try {
    const { transactions, lastSync } = req.body;
    const userId = req.user?.id || 'anonymous';
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Transactions array is required' });
    }
    
    console.log(`📋 [TRANSACTION-SYNC] Received ${transactions.length} transactions from PWA for user: ${userId}`);
    
    const Transaction = (await import('../../models/Transaction.js')).default;
    const Employee = (await import('../../models/Employee.js')).default;
    
    let savedCount = 0;
    let updatedCount = 0;
    let employeeUpdates = new Map(); // Track employee stats updates
    
    for (const transactionData of transactions) {
      try {
        console.log(`📋 Processing transaction:`, {
          id: transactionData.id,
          total: transactionData.total,
          employee: transactionData.employee?.name || transactionData.employee?.id
        });
        
        // Create filter for upsert - use localId or id
        const filter = {
          userId: userId.toString(),
          $or: [
            { localId: transactionData.id },
            { _id: transactionData.id }
          ]
        };
        
        // Prepare transaction document
        const transactionDoc = {
          userId: userId.toString(),
          localId: transactionData.localId || transactionData.id,
          total: transactionData.total || 0,
          subtotal: transactionData.subtotal || 0,
          tax: transactionData.tax || 0,
          discount: transactionData.discount || 0,
          paymentMethod: transactionData.paymentMethod || 'cash',
          items: transactionData.items || [],
          employee: transactionData.employee,
          customer: transactionData.customer,
          date: transactionData.date ? new Date(transactionData.date) : new Date(),
          createdAt: transactionData.createdAt ? new Date(transactionData.createdAt) : new Date(),
          modifiedAt: transactionData.modifiedAt ? new Date(transactionData.modifiedAt) : new Date(),
          notes: transactionData.notes,
          status: transactionData.status || 'completed',
          source: 'PWA',
          syncStatus: 'synced',
          lastSyncDate: new Date()
        };
        
        const result = await Transaction.findOneAndUpdate(
          filter,
          transactionDoc,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        if (result.isNew || result.upserted) {
          savedCount++;
        } else {
          updatedCount++;
        }
        
        // Track employee stats for bulk update
        if (transactionData.employee && transactionData.employee.id) {
          const empId = transactionData.employee.id;
          const transactionTotal = parseFloat(transactionData.total) || 0;
          
          if (!employeeUpdates.has(empId)) {
            employeeUpdates.set(empId, {
              totalSales: 0,
              totalTransactions: 0,
              totalCommission: 0
            });
          }
          
          const empStats = employeeUpdates.get(empId);
          empStats.totalSales += transactionTotal;
          empStats.totalTransactions += 1;
        }
        
      } catch (itemError) {
        console.error('Error syncing transaction:', transactionData.id, itemError);
      }
    }
    
    // Employee stats will be updated by the centralized middleware
    // Remove duplicate update mechanism to prevent double counting
    console.log(`📊 Transaction sync completed. Employee stats updates handled by middleware for ${employeeUpdates.size} employees.`);
    
    res.json({ 
      success: true,
      message: 'Transactions synced to MongoDB',
      saved: savedCount,
      updated: updatedCount,
      total: transactions.length,
      employeesUpdated: employeeUpdates.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transactions sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// GET /api/sync/last - Get last sync timestamp
router.get('/last', authenticateJWT, async (req, res) => {
  try {
    // In production, fetch from database
    res.json({ 
      lastSync: new Date().toISOString(),
      userId: req.userId
    });
  } catch (error) {
    console.error('Get last sync error:', error);
    res.status(500).json({ error: 'Failed to get last sync', details: error.message });
  }
});

export default router;