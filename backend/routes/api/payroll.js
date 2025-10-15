import express from 'express';
import PayrollRecord from '../../models/PayrollRecord.js';
import Employee from '../../models/Employee.js';
import { authenticateJWT, requireBusinessUser } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import {
  getEmployeeScheduleSummary,
  validateEmployeeSchedule,
  calculateScheduleUtilization
} from '../../services/payroll-schedule-integration.js';

const router = express.Router();

// Apply authentication to all payroll routes
router.use(authenticateJWT, requireBusinessUser);

// ============================================================================
// SCHEDULE INTEGRATION ENDPOINTS
// ============================================================================

// Get employee schedule summary for payroll period
router.get('/schedule-summary/:employeeId/:periodStart/:periodEnd', async (req, res) => {
  try {
    const userId = req.user.id;
    const { employeeId, periodStart, periodEnd } = req.params;

    const summary = await getEmployeeScheduleSummary(
      userId,
      employeeId,
      new Date(periodStart),
      new Date(periodEnd)
    );

    logger.info('Schedule summary retrieved for payroll', {
      category: 'PAYROLL_SCHEDULE',
      operation: 'get_summary',
      userId,
      employeeId
    });

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Failed to get schedule summary', {
      category: 'PAYROLL_SCHEDULE',
      operation: 'get_summary',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get schedule summary'
    });
  }
});

// Validate schedules for all employees before payroll processing
router.post('/validate-schedules', async (req, res) => {
  try {
    const userId = req.user.id;
    const { employeeIds, periodStart, periodEnd } = req.body;

    if (!Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        error: 'employeeIds must be an array'
      });
    }

    const validations = [];

    for (const employeeId of employeeIds) {
      const validation = await validateEmployeeSchedule(
        userId,
        employeeId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      validations.push({
        employeeId,
        ...validation
      });
    }

    const allValid = validations.every(v => v.isValid);
    const hasWarnings = validations.some(v => v.hasWarnings);

    logger.info('Schedule validation completed', {
      category: 'PAYROLL_SCHEDULE',
      operation: 'validate_schedules',
      userId,
      employeeCount: employeeIds.length,
      allValid,
      hasWarnings
    });

    res.json({
      success: true,
      allValid,
      hasWarnings,
      validations
    });

  } catch (error) {
    logger.error('Failed to validate schedules', {
      category: 'PAYROLL_SCHEDULE',
      operation: 'validate_schedules',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to validate schedules'
    });
  }
});

// Get schedule conflicts before payroll processing
router.get('/schedule-conflicts/:periodStart/:periodEnd', async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodStart, periodEnd } = req.params;

    // Get all active employees
    const employees = await Employee.find({ userId, isActive: { $ne: false } }).lean();
    const conflicts = [];

    for (const employee of employees) {
      const validation = await validateEmployeeSchedule(
        userId,
        employee._id.toString(),
        new Date(periodStart),
        new Date(periodEnd)
      );

      if (!validation.isValid || validation.hasWarnings) {
        conflicts.push({
          employeeId: employee._id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          issues: [...validation.errors, ...validation.warnings]
        });
      }
    }

    logger.info('Schedule conflicts check completed', {
      category: 'PAYROLL_SCHEDULE',
      operation: 'check_conflicts',
      userId,
      totalEmployees: employees.length,
      conflictCount: conflicts.length
    });

    res.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts
    });

  } catch (error) {
    logger.error('Failed to check schedule conflicts', {
      category: 'PAYROLL_SCHEDULE',
      operation: 'check_conflicts',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check schedule conflicts'
    });
  }
});

// ============================================================================
// PAYROLL SYNC ENDPOINTS FOR PWA
// ============================================================================

// Get all payroll records for sync (download from server)
router.get('/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    const { lastSync } = req.query;

    let query = { userId };
    
    // If lastSync provided, only get records modified after that date
    if (lastSync) {
      query.lastSyncDate = { $gt: new Date(lastSync) };
    }

    const payrollRecords = await PayrollRecord.find(query)
      .populate('employeeId', 'firstName lastName position')
      .sort({ periodStart: -1 })
      .lean();

    logger.info('Payroll sync requested', {
      category: 'PAYROLL_SYNC',
      operation: 'download',
      userId,
      recordCount: payrollRecords.length,
      lastSync
    });

    res.json({
      success: true,
      data: payrollRecords,
      total: payrollRecords.length,
      syncTimestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Payroll sync failed', {
      category: 'PAYROLL_SYNC',
      operation: 'download',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to sync payroll records',
      message: error.message
    });
  }
});

// Upload payroll records from PWA (sync to server)
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.id;
    const { payrollRecords } = req.body;

    if (!Array.isArray(payrollRecords)) {
      return res.status(400).json({
        success: false,
        error: 'payrollRecords must be an array'
      });
    }

    const results = {
      created: [],
      updated: [],
      errors: []
    };

    for (const record of payrollRecords) {
      try {
        // Add userId to record
        record.userId = userId;
        record.lastSyncDate = new Date();

        // Check if record already exists
        const existing = await PayrollRecord.findOne({
          userId,
          employeeId: record.employeeId,
          periodStart: new Date(record.periodStart),
          periodEnd: new Date(record.periodEnd)
        });

        if (existing) {
          // Update existing record
          Object.assign(existing, record);
          await existing.save();
          results.updated.push(existing._id);
        } else {
          // Create new record
          const newRecord = new PayrollRecord(record);
          await newRecord.save();
          results.created.push(newRecord._id);
        }

      } catch (recordError) {
        results.errors.push({
          record: record,
          error: recordError.message
        });
      }
    }

    logger.info('Payroll records uploaded', {
      category: 'PAYROLL_SYNC',
      operation: 'upload',
      userId,
      created: results.created.length,
      updated: results.updated.length,
      errors: results.errors.length
    });

    res.json({
      success: true,
      results,
      message: `Processed ${payrollRecords.length} payroll records`
    });

  } catch (error) {
    logger.error('Payroll upload failed', {
      category: 'PAYROLL_SYNC',
      operation: 'upload',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to upload payroll records',
      message: error.message
    });
  }
});

// ============================================================================
// PAYROLL DATA MANAGEMENT ENDPOINTS
// ============================================================================

// Get payroll records with filtering
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      employeeId, 
      status, 
      startDate, 
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;

    const query = { userId };
    
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.periodStart = {};
      if (startDate) query.periodStart.$gte = new Date(startDate);
      if (endDate) query.periodStart.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      PayrollRecord.find(query)
        .populate('employeeId', 'firstName lastName position')
        .sort({ periodStart: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PayrollRecord.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Failed to get payroll records', {
      category: 'PAYROLL',
      operation: 'get_records',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get payroll records'
    });
  }
});

// Get single payroll record
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const record = await PayrollRecord.findOne({ _id: id, userId })
      .populate('employeeId', 'firstName lastName position email phone')
      .lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    res.json({
      success: true,
      data: record
    });

  } catch (error) {
    logger.error('Failed to get payroll record', {
      category: 'PAYROLL',
      operation: 'get_record',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get payroll record'
    });
  }
});

// Update payroll record status
router.patch('/:id/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, notes, paymentMethod } = req.body;

    const validStatuses = ['draft', 'processed', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updateData = { 
      status,
      lastSyncDate: new Date()
    };

    if (notes) updateData.notes = notes;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (status === 'paid') updateData.paidAt = new Date();

    const record = await PayrollRecord.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    ).populate('employeeId', 'firstName lastName position');

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    logger.info('Payroll record status updated', {
      category: 'PAYROLL',
      operation: 'update_status',
      userId,
      recordId: id,
      status,
      previousStatus: record.status
    });

    res.json({
      success: true,
      data: record,
      message: 'Payroll record status updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update payroll record status', {
      category: 'PAYROLL',
      operation: 'update_status',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update payroll record status'
    });
  }
});

// Delete payroll record
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const record = await PayrollRecord.findOneAndDelete({ _id: id, userId });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found'
      });
    }

    logger.info('Payroll record deleted', {
      category: 'PAYROLL',
      operation: 'delete',
      userId,
      recordId: id
    });

    res.json({
      success: true,
      message: 'Payroll record deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete payroll record', {
      category: 'PAYROLL',
      operation: 'delete',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete payroll record'
    });
  }
});

export default router;