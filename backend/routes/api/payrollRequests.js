import express from 'express';
import PayrollRequest from '../../models/PayrollRequest.js';
import Employee from '../../models/Employee.js';
import { authenticateJWT, requireBusinessUser } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Get all requests (managers see all, employees see their own)
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const { status, type, employeeId, startDate, endDate } = req.query;
    
    let query = { isDeleted: false };
    
    // Determine access level
    if (user.type === 'employee') {
      // Employees can only see their own requests
      const employee = await Employee.findOne({ 
        email: user.email,
        branchId: user.branchId || user.userId
      });
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee record not found'
        });
      }
      
      query.employeeId = employee._id;
    } else {
      // Managers see all requests for their business
      query.userId = user.userId || user.id;
      
      // Allow filtering by employee for managers
      if (employeeId) {
        query.employeeId = employeeId;
      }
    }
    
    // Apply filters
    if (status) query.status = status;
    if (type) query.type = type;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const requests = await PayrollRequest.find(query)
      .populate('employeeId', 'firstName lastName position email')
      .sort({ createdAt: -1 })
      .lean();
    
    logger.info('Payroll requests retrieved', {
      category: 'PAYROLL_REQUESTS',
      operation: 'get_requests',
      userId: user.id,
      count: requests.length,
      userType: user.type
    });
    
    res.json({
      success: true,
      data: requests,
      total: requests.length
    });
    
  } catch (error) {
    logger.error('Failed to get payroll requests', {
      category: 'PAYROLL_REQUESTS',
      operation: 'get_requests',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve requests'
    });
  }
});

// Create new request (employees only)
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    const { type, details } = req.body;
    
    // Get employee record
    let employee;
    if (user.type === 'employee') {
      employee = await Employee.findOne({ 
        email: user.email,
        branchId: user.branchId || user.userId
      });
    } else {
      // For testing, allow managers to create requests for employees
      if (req.body.employeeId) {
        employee = await Employee.findById(req.body.employeeId);
      }
    }
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee record not found'
      });
    }
    
    // Create the request
    const payrollRequest = new PayrollRequest({
      userId: employee.userId,
      employeeId: employee._id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      type,
      status: 'pending',
      details,
      localId: req.body.localId
    });
    
    await payrollRequest.save();
    
    logger.info('Payroll request created', {
      category: 'PAYROLL_REQUESTS',
      operation: 'create_request',
      requestId: payrollRequest._id,
      employeeId: employee._id,
      type
    });
    
    res.status(201).json({
      success: true,
      data: payrollRequest,
      message: 'Request submitted successfully'
    });
    
  } catch (error) {
    logger.error('Failed to create payroll request', {
      category: 'PAYROLL_REQUESTS',
      operation: 'create_request',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit request'
    });
  }
});

// Update request (managers only for approval/rejection)
router.put('/:id', requireBusinessUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, managerNotes } = req.body;
    const user = req.user;
    
    // Find the request
    const request = await PayrollRequest.findOne({
      _id: id,
      userId: user.userId || user.id,
      isDeleted: false
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }
    
    // Only allow status updates to pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Can only update pending requests'
      });
    }
    
    // Update based on status
    if (status === 'approved') {
      await request.approve(
        user.id,
        `${user.firstName} ${user.lastName}`,
        managerNotes
      );
    } else if (status === 'rejected') {
      await request.reject(
        user.id,
        `${user.firstName} ${user.lastName}`,
        managerNotes
      );
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Use approved or rejected'
      });
    }
    
    logger.info('Payroll request updated', {
      category: 'PAYROLL_REQUESTS',
      operation: 'update_request',
      requestId: id,
      newStatus: status,
      managerId: user.id
    });
    
    res.json({
      success: true,
      data: request,
      message: `Request ${status} successfully`
    });
    
  } catch (error) {
    logger.error('Failed to update payroll request', {
      category: 'PAYROLL_REQUESTS',
      operation: 'update_request',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update request'
    });
  }
});

// Delete request (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    let query = { _id: id, isDeleted: false };
    
    // Employees can only delete their own pending requests
    if (user.type === 'employee') {
      const employee = await Employee.findOne({ 
        email: user.email
      });
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee record not found'
        });
      }
      
      query.employeeId = employee._id;
      query.status = 'pending'; // Only pending requests can be deleted by employees
    } else {
      // Managers can delete any request from their business
      query.userId = user.userId || user.id;
    }
    
    const request = await PayrollRequest.findOne(query);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found or cannot be deleted'
      });
    }
    
    // Soft delete
    request.isDeleted = true;
    await request.save();
    
    logger.info('Payroll request deleted', {
      category: 'PAYROLL_REQUESTS',
      operation: 'delete_request',
      requestId: id,
      userId: user.id
    });
    
    res.json({
      success: true,
      message: 'Request deleted successfully'
    });
    
  } catch (error) {
    logger.error('Failed to delete payroll request', {
      category: 'PAYROLL_REQUESTS',
      operation: 'delete_request',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete request'
    });
  }
});

// Sync endpoint for offline support
router.get('/sync', async (req, res) => {
  try {
    const user = req.user;
    const { lastSync } = req.query;
    
    let query = { isDeleted: false };
    
    // Determine access level
    if (user.type === 'employee') {
      const employee = await Employee.findOne({ 
        email: user.email,
        branchId: user.branchId || user.userId
      });
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee record not found'
        });
      }
      
      query.employeeId = employee._id;
    } else {
      query.userId = user.userId || user.id;
    }
    
    // If lastSync provided, only get requests modified after that date
    if (lastSync) {
      query.lastSyncDate = { $gt: new Date(lastSync) };
    }
    
    const requests = await PayrollRequest.find(query)
      .populate('employeeId', 'firstName lastName position')
      .sort({ createdAt: -1 })
      .lean();
    
    logger.info('Payroll requests sync requested', {
      category: 'PAYROLL_REQUESTS',
      operation: 'sync',
      userId: user.id,
      count: requests.length,
      lastSync
    });
    
    res.json({
      success: true,
      data: requests,
      total: requests.length,
      syncTimestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Payroll requests sync failed', {
      category: 'PAYROLL_REQUESTS',
      operation: 'sync',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to sync requests'
    });
  }
});

// Upload requests from PWA (batch sync)
router.post('/sync', async (req, res) => {
  try {
    const user = req.user;
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).json({
        success: false,
        error: 'Requests must be an array'
      });
    }
    
    const results = {
      created: [],
      updated: [],
      errors: []
    };
    
    for (const requestData of requests) {
      try {
        // Check if request already exists by localId
        let existingRequest = null;
        if (requestData.localId) {
          existingRequest = await PayrollRequest.findOne({
            localId: requestData.localId,
            userId: user.userId || user.id
          });
        }
        
        if (existingRequest) {
          // Update existing request
          Object.assign(existingRequest, requestData);
          existingRequest.lastSyncDate = new Date();
          await existingRequest.save();
          results.updated.push(existingRequest._id);
        } else {
          // Create new request
          const newRequest = new PayrollRequest({
            ...requestData,
            userId: user.userId || user.id,
            lastSyncDate: new Date()
          });
          await newRequest.save();
          results.created.push(newRequest._id);
        }
        
      } catch (requestError) {
        results.errors.push({
          request: requestData,
          error: requestError.message
        });
      }
    }
    
    logger.info('Payroll requests uploaded', {
      category: 'PAYROLL_REQUESTS',
      operation: 'upload',
      userId: user.id,
      created: results.created.length,
      updated: results.updated.length,
      errors: results.errors.length
    });
    
    res.json({
      success: true,
      results,
      message: `Processed ${requests.length} requests`
    });
    
  } catch (error) {
    logger.error('Payroll requests upload failed', {
      category: 'PAYROLL_REQUESTS',
      operation: 'upload',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload requests'
    });
  }
});

export default router;