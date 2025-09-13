import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { requireSuperAdmin } from '../../middleware/superAdmin.js';
import dataRepair from '../../utils/dataRepair.js';
import employeeStatsManager from '../../utils/employeeStatsManager.js';

const router = express.Router();

// CRITICAL SECURITY: ALL data repair routes require super admin authentication
router.use(authenticateJWT);
router.use(requireSuperAdmin);

// POST /admin/data-repair/employee-stats/:userId - Repair employee data for specific user
router.post('/employee-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { dryRun = false, fixDuplicateStats = true, recalculateStats = true, cleanupTransactions = true } = req.body;

    console.log(`🔧 [DATA-REPAIR] Starting employee data repair for user: ${userId}`, {
      dryRun,
      fixDuplicateStats,
      recalculateStats,
      cleanupTransactions,
      requestedBy: req.superAdmin.email
    });

    const repairResults = await dataRepair.repairEmployeeData(userId, {
      fixDuplicateStats,
      recalculateStats,
      cleanupTransactions,
      dryRun
    });

    res.json({
      success: true,
      message: 'Employee data repair completed',
      userId,
      dryRun,
      results: repairResults,
      repairedBy: req.superAdmin.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Employee data repair error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to repair employee data',
      details: error.message
    });
  }
});

// POST /admin/data-repair/validate/:userId - Validate data consistency for specific user
router.post('/validate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`🔍 [DATA-VALIDATION] Validating data consistency for user: ${userId}`, {
      requestedBy: req.superAdmin.email
    });

    const validationResults = await dataRepair.validateDataConsistency(userId);

    res.json({
      success: true,
      message: 'Data consistency validation completed',
      userId,
      validation: validationResults,
      validatedBy: req.superAdmin.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Data validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate data consistency',
      details: error.message
    });
  }
});

// POST /admin/data-repair/recalculate-stats/:userId - Recalculate employee stats from transactions
router.post('/recalculate-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { employeeId = null } = req.body; // Optional: recalculate for specific employee

    console.log(`📊 [STATS-RECALC] Recalculating employee stats for user: ${userId}`, {
      employeeId,
      requestedBy: req.superAdmin.email
    });

    const updatedCount = await employeeStatsManager.recalculateEmployeeStats(userId, employeeId);

    res.json({
      success: true,
      message: 'Employee stats recalculation completed',
      userId,
      employeeId,
      updatedEmployees: updatedCount,
      recalculatedBy: req.superAdmin.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats recalculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate employee stats',
      details: error.message
    });
  }
});

// POST /admin/data-repair/clear-cache - Clear processed transaction cache
router.post('/clear-cache', async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.body;

    console.log(`🧹 [CACHE-CLEAR] Clearing processed transaction cache`, {
      olderThanHours,
      requestedBy: req.superAdmin.email
    });

    employeeStatsManager.clearProcessedCache(olderThanHours);

    res.json({
      success: true,
      message: 'Processed transaction cache cleared',
      olderThanHours,
      clearedBy: req.superAdmin.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

// GET /admin/data-repair/status - Get system repair status and statistics
router.get('/status', async (req, res) => {
  try {
    const User = (await import('../../models/User.js')).default;
    const Employee = (await import('../../models/Employee.js')).default;
    const Transaction = (await import('../../models/Transaction.js')).default;

    // Get system-wide statistics
    const stats = {
      totalUsers: await User.countDocuments(),
      totalEmployees: await Employee.countDocuments(),
      totalTransactions: await Transaction.countDocuments(),
      pendingSyncEmployees: await Employee.countDocuments({ syncStatus: 'pending' }),
      pendingSyncTransactions: await Transaction.countDocuments({ syncStatus: 'pending' }),
      employeesWithoutLocalId: await Employee.countDocuments({ 
        localId: { $exists: false } 
      }),
      transactionsWithLegacyRefs: await Transaction.countDocuments({
        $or: [
          { employeeId: { $exists: true } },
          { employeeName: { $exists: true } },
          { employeeCommission: { $exists: true } }
        ]
      })
    };

    res.json({
      success: true,
      message: 'Data repair system status',
      stats,
      requestedBy: req.superAdmin.email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      details: error.message
    });
  }
});

export default router;