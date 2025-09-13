// SyncService - Handles data synchronization for PWA offline/online functionality
import { Employee } from '../models/index.js';
import logger from '../utils/logger.js';

class SyncService {
  constructor(businessId, userId) {
    this.businessId = businessId;
    this.userId = userId;
  }

  // Get sync status and metadata
  async getSyncStatus() {
    return {
      lastSync: new Date().toISOString(),
      pendingChanges: 0,
      syncEnabled: true,
      businessId: this.businessId,
      userId: this.userId
    };
  }

  // Get all data for full sync
  async getFullSync() {
    return {
      products: [],
      inventory: [],
      employees: [],
      transactions: [],
      settings: {},
      metadata: {
        businessId: this.businessId,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  // Get changes since a specific timestamp
  async getChangesSince(since) {
    return {
      products: { added: [], updated: [], deleted: [] },
      inventory: { added: [], updated: [], deleted: [] },
      employees: { added: [], updated: [], deleted: [] },
      transactions: { added: [], updated: [], deleted: [] },
      settings: { updated: false },
      metadata: {
        since: since.toISOString(),
        until: new Date().toISOString(),
        changesCount: 0
      }
    };
  }

  // Push sync - receive and process data from PWA
  async pushSync(data) {
    const results = {
      products: { created: 0, updated: 0, failed: 0 },
      inventory: { created: 0, updated: 0, failed: 0 },
      employees: { created: 0, updated: 0, failed: 0 },
      transactions: { created: 0, updated: 0, failed: 0 },
      settings: { updated: false }
    };

    // Placeholder implementation
    if (data.products) results.products.created = data.products.length;
    if (data.inventory) results.inventory.created = data.inventory.length;
    if (data.employees) results.employees.created = data.employees.length;
    if (data.transactions) results.transactions.created = data.transactions.length;
    if (data.settings) results.settings.updated = true;

    return results;
  }

  // Sync products
  async syncProducts({ since, limit, offset }) {
    return {
      items: [],
      total: 0,
      hasMore: false
    };
  }

  async syncProductsUp(products) {
    return {
      created: [],
      updated: [],
      failed: [],
      conflicts: []
    };
  }

  // Sync inventory
  async syncInventory({ since, limit, offset }) {
    return {
      items: [],
      total: 0,
      hasMore: false
    };
  }

  async syncInventoryUp(inventory) {
    const { default: InventoryItem } = await import('../models/InventoryItem.js');
    const results = {
      created: [],
      updated: [],
      failed: [],
      conflicts: []
    };

    for (const inventoryData of inventory) {
      try {
        // Find existing item by multiple methods to prevent duplicates
        let existingItem = null;
        
        // Method 1: Try to find by MongoDB _id (if it's a valid ObjectId)
        if (inventoryData.id && inventoryData.id.match(/^[0-9a-fA-F]{24}$/)) {
          existingItem = await InventoryItem.findOne({ _id: inventoryData.id, userId: this.userId });
        }
        
        // Method 2: If not found, try by name + category combination (more unique than just name)
        if (!existingItem) {
          const nameFilter = {
            name: inventoryData.name,
            category: inventoryData.category || 'Uncategorized',
            userId: this.userId
          };
          existingItem = await InventoryItem.findOne(nameFilter);
        }
        
        // Method 3: If still not found and we have SKU, try by SKU
        if (!existingItem && inventoryData.sku) {
          existingItem = await InventoryItem.findOne({ 
            sku: inventoryData.sku, 
            userId: this.userId 
          });
        }
        
        // Prepare inventory document with all critical fields
        const inventoryDoc = {
          name: inventoryData.name,
          sku: inventoryData.sku || '',
          category: inventoryData.category || 'Uncategorized',
          currentStock: inventoryData.currentStock || inventoryData.quantity || 0,
          unit: inventoryData.unit || 'units',
          minStock: inventoryData.minStock || 5,
          price: inventoryData.price || inventoryData.unitPrice || 0,
          cost: inventoryData.cost || 0,
          costPrice: inventoryData.costPrice || inventoryData.cost || 0,  // CRITICAL: Unit cost field
          sellingPrice: inventoryData.sellingPrice || inventoryData.price || 0,  // CRITICAL: Selling price field
          supplier: inventoryData.supplier || '',
          description: inventoryData.description || inventoryData.notes || '',
          notes: inventoryData.notes || inventoryData.description || '',
          lastRestocked: inventoryData.lastRestocked || null,
          availableInPOS: inventoryData.availableInPOS !== undefined ? inventoryData.availableInPOS : false,  // CRITICAL: POS checkbox
          lowStockAlert: inventoryData.lowStockAlert !== undefined ? inventoryData.lowStockAlert : false,  // CRITICAL: Alert checkbox
          isActive: inventoryData.isActive !== false,
          syncStatus: 'synced',
          userId: this.userId
        };
        
        if (existingItem) {
          // Update existing item - preserve modifiedAt from client if provided
          if (inventoryData.modifiedAt) {
            inventoryDoc.modifiedAt = new Date(inventoryData.modifiedAt);
          }
          
          await InventoryItem.findByIdAndUpdate(existingItem._id, inventoryDoc, { new: true });
          results.updated.push({ id: existingItem._id, name: inventoryDoc.name });
        } else {
          // Create new item
          inventoryDoc.createdAt = inventoryData.createdAt ? new Date(inventoryData.createdAt) : new Date();
          const newItem = new InventoryItem(inventoryDoc);
          await newItem.save();
          results.created.push({ id: newItem._id, name: inventoryDoc.name });
        }
      } catch (error) {
        console.error('Failed to sync inventory item:', error);
        results.failed.push({
          item: inventoryData.name || 'Unknown',
          error: error.message
        });
      }
    }

    return results;
  }

  // Sync employees
  async syncEmployees({ since, limit, offset }) {
    return {
      items: [],
      total: 0,
      hasMore: false
    };
  }

  async syncEmployeesUp(employees) {
    console.log(`📊 [SYNC-SERVICE] Starting employee sync for ${employees.length} employees`);
    
    const results = {
      created: [],
      updated: [],
      failed: [],
      conflicts: []
    };

    for (const employeeData of employees) {
      try {
        console.log(`📊 [SYNC-SERVICE] Processing employee: ${employeeData.name}`, {
          id: employeeData.id,
          totalSales: employeeData.totalSales || 0,
          totalCommission: employeeData.totalCommission || 0,
          totalTransactions: employeeData.totalTransactions || 0
        });

        // Find employee by localId or _id
        let existingEmployee = null;
        
        // Try finding by localId first (PWA uses this) - try multiple ID formats
        if (employeeData.id) {
          console.log(`🔍 [SYNC-SERVICE] Searching for employee with ID: ${employeeData.id} (type: ${typeof employeeData.id})`);
          
          // Try exact localId match
          existingEmployee = await Employee.findOne({ 
            userId: this.userId, 
            localId: employeeData.id.toString() 
          });
          
          // If not found, try finding by MongoDB _id (in case id is actually a MongoDB ObjectId)
          if (!existingEmployee && employeeData.id.toString().match(/^[0-9a-fA-F]{24}$/)) {
            existingEmployee = await Employee.findOne({ 
              userId: this.userId, 
              _id: employeeData.id 
            });
          }
          
          // If not found, try finding by numeric conversion (in case of ID format mismatch)
          if (!existingEmployee && !isNaN(employeeData.id)) {
            existingEmployee = await Employee.findOne({ 
              userId: this.userId, 
              localId: parseInt(employeeData.id).toString()
            });
          }
          
          if (existingEmployee) {
            console.log(`✅ [SYNC-SERVICE] Found existing employee by ID: ${existingEmployee.firstName} ${existingEmployee.lastName}`);
          }
        }

        // REMOVED: Name-based fallback matching to prevent duplicate creation
        // Only match employees by ID to ensure data integrity
        
        // If no existing employee found, we'll create a new one
        // This prevents accidental merging of different employees with same names
        if (!existingEmployee) {
          console.log(`📝 [SYNC-SERVICE] No ID-based match found for employee: ${employeeData.name || 'Unknown'} (ID: ${employeeData.id})`);
          console.log(`📝 [SYNC-SERVICE] Will create new employee record with proper ID mapping`);
        }

        // Prepare employee document data
        const employeeDoc = {
          userId: this.userId,
          localId: employeeData.id?.toString() || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          firstName: employeeData.firstName || employeeData.name?.split(' ')[0] || 'Unknown',
          lastName: employeeData.lastName || employeeData.name?.split(' ').slice(1).join(' ') || 'Employee',
          email: employeeData.email || '',
          phone: employeeData.phone || '',
          position: employeeData.position || 'Staff',
          hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : new Date(),
          commissionRate: employeeData.commissionRate || 0,
          // CRITICAL: Performance data that needs to be synced
          totalSales: parseFloat(employeeData.totalSales) || 0,
          totalCommission: parseFloat(employeeData.totalCommission) || 0,
          totalTransactions: parseInt(employeeData.totalTransactions) || 0,
          isActive: employeeData.isActive !== false,
          syncStatus: 'synced',
          lastSyncDate: new Date()
        };

        if (existingEmployee) {
          // Update existing employee
          const updatedEmployee = await Employee.findByIdAndUpdate(
            existingEmployee._id,
            employeeDoc,
            { new: true, runValidators: true }
          );

          results.updated.push({
            id: existingEmployee._id,
            localId: employeeDoc.localId,
            name: employeeData.name,
            totalSales: employeeDoc.totalSales,
            totalCommission: employeeDoc.totalCommission,
            totalTransactions: employeeDoc.totalTransactions
          });

          console.log(`✅ [SYNC-SERVICE] Updated employee: ${employeeData.name}`, {
            id: updatedEmployee._id,
            totalSales: updatedEmployee.totalSales,
            totalCommission: updatedEmployee.totalCommission,
            totalTransactions: updatedEmployee.totalTransactions
          });
        } else {
          // Create new employee
          const newEmployee = new Employee(employeeDoc);
          const savedEmployee = await newEmployee.save();

          results.created.push({
            id: savedEmployee._id,
            localId: employeeDoc.localId,
            name: employeeData.name,
            totalSales: employeeDoc.totalSales,
            totalCommission: employeeDoc.totalCommission,
            totalTransactions: employeeDoc.totalTransactions
          });

          console.log(`🆕 [SYNC-SERVICE] Created employee: ${employeeData.name}`, {
            id: savedEmployee._id,
            totalSales: savedEmployee.totalSales,
            totalCommission: savedEmployee.totalCommission,
            totalTransactions: savedEmployee.totalTransactions
          });
        }

      } catch (error) {
        console.error(`❌ [SYNC-SERVICE] Failed to sync employee ${employeeData.name}:`, error);
        
        results.failed.push({
          localId: employeeData.id,
          name: employeeData.name,
          error: error.message
        });
      }
    }

    const summary = {
      total: employees.length,
      created: results.created.length,
      updated: results.updated.length,
      failed: results.failed.length
    };

    console.log(`✅ [SYNC-SERVICE] Employee sync completed:`, summary);

    logger.info('Employee sync completed', {
      category: 'SYNC',
      operation: 'sync_employees_up',
      data: summary
    });

    return results;
  }

  // Sync transactions
  async syncTransactions({ since, startDate, endDate, limit, offset }) {
    return {
      items: [],
      total: 0,
      totalAmount: 0,
      hasMore: false
    };
  }

  async syncTransactionsUp(transactions) {
    return {
      created: [],
      updated: [],
      failed: [],
      totalAmount: 0,
      conflicts: []
    };
  }

  // Resolve conflicts
  async resolveConflicts(conflicts, resolution) {
    return {
      resolved: conflicts.length,
      failed: 0,
      strategy: resolution || 'server-wins'
    };
  }

  // Reset sync state
  async resetSyncState(type) {
    return {
      type: type || 'full',
      timestamp: new Date().toISOString(),
      affectedRecords: 0
    };
  }

  // Get sync history
  async getSyncHistory({ limit, offset }) {
    return {
      history: [],
      total: 0,
      hasMore: false
    };
  }
}

export default SyncService;