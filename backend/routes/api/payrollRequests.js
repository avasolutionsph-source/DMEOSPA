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
    if (user.type === 'employee' && user.role !== 'manager') {
      // Regular employees can only see their own requests (NOT managers)
      // Try multiple ways to find the employee record
      let employee = await Employee.findOne({ 
        email: user.email,
        branchId: user.branchId || user.userId
      });
      
      // If not found with branchId, try just email
      if (!employee) {
        employee = await Employee.findOne({ 
          email: user.email
        });
      }
      
      // If still not found, try by _id if user has employeeId
      if (!employee && user.employeeId) {
        employee = await Employee.findById(user.employeeId);
      }
      
      if (!employee) {
        logger.warn('Employee record not found for payroll requests', {
          email: user.email,
          userId: user.id,
          branchId: user.branchId
        });
        
        // Return empty array instead of 404 for better UX
        return res.json({
          success: true,
          data: [],
          total: 0,
          message: 'No employee record linked to this account'
        });
      }
      
      query.employeeId = employee._id;
    } else {
      // Managers and owners see all requests for their business
      // For managers (who are employees with role='manager'), userId contains the branch owner ID
      let businessUserId;
      
      if (user.type === 'employee' && user.role === 'manager') {
        // Manager: userId is the branch owner's ID (set during employee login)
        businessUserId = user.userId;
        logger.info('Manager accessing requests with branch owner ID', {
          managerId: user.id,
          branchOwnerId: businessUserId,
          role: user.role
        });
      } else {
        // Owner: their own ID is the business ID
        businessUserId = user.id;
        logger.info('Owner accessing requests', {
          ownerId: businessUserId
        });
      }
      
      query.userId = businessUserId;
      
      logger.info('Final query for requests', {
        role: user.role,
        type: user.type,
        businessUserId: businessUserId,
        queryUserId: query.userId
      });
      
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
      // Try multiple ways to find the employee
      employee = await Employee.findOne({ 
        email: user.email,
        branchId: user.branchId || user.userId
      });
      
      // If not found with branchId, try just email
      if (!employee) {
        employee = await Employee.findOne({ 
          email: user.email
        });
      }
      
      // If still not found, try by _id if user has employeeId
      if (!employee && user.employeeId) {
        employee = await Employee.findById(user.employeeId);
      }
      
      // If still no employee record, create a minimal one for the request
      if (!employee) {
        logger.info('Creating temporary employee data for request', {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        });
        
        // Use user data to create request without Employee record
        const payrollRequest = new PayrollRequest({
          userId: user.branchId || user.userId || user.id,
          employeeId: user.id, // Use user ID as fallback
          employeeName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          type,
          status: 'pending',
          details,
          localId: req.body.localId
        });
        
        await payrollRequest.save();
        
        return res.status(201).json({
          success: true,
          data: payrollRequest,
          message: 'Request submitted successfully (without employee record)'
        });
      }
    } else {
      // For testing, allow managers to create requests for employees
      if (req.body.employeeId) {
        employee = await Employee.findById(req.body.employeeId);
      }
    }
    
    if (!employee && user.type !== 'employee') {
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

// Update request (managers and owners can approve/reject)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, managerNotes } = req.body;
    const user = req.user;
    
    // Check if user is manager or owner
    const isManager = user.role === 'manager';
    const isOwner = user.type !== 'employee';
    
    if (!isManager && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Only managers and owners can approve/reject requests'
      });
    }
    
    // Get the correct business userId
    let businessUserId;
    if (isManager) {
      // For managers, userId contains the branch owner ID (set in auth middleware)
      businessUserId = user.userId || user.branchOwnerId || user.branchId;
      
      if (!businessUserId) {
        logger.error('Manager missing branch owner ID', {
          managerId: user.id,
          user: user
        });
        return res.status(500).json({
          success: false,
          error: 'Manager configuration error - missing branch owner ID'
        });
      }
      
      logger.info('Manager attempting to update request', {
        managerId: user.id,
        managerEmail: user.email,
        branchOwnerId: businessUserId,
        requestId: id
      });
    } else {
      businessUserId = user.userId || user.id; // Owner uses their own ID
      logger.info('Owner attempting to update request', {
        ownerId: businessUserId,
        requestId: id
      });
    }
    
    // First, try to find the request without userId filter to debug
    const debugRequest = await PayrollRequest.findOne({
      _id: id,
      isDeleted: false
    });
    
    if (debugRequest) {
      logger.info('Debug: Request found in database', {
        requestId: id,
        requestUserId: debugRequest.userId,
        requestUserIdType: typeof debugRequest.userId,
        lookingForUserId: businessUserId,
        lookingForUserIdType: typeof businessUserId,
        stringMatch: String(debugRequest.userId) === String(businessUserId)
      });
    } else {
      logger.warn('Debug: Request not found at all', { requestId: id });
    }
    
    // Find the request - use string comparison for better matching
    let request = null;
    
    // Try direct find first
    request = await PayrollRequest.findOne({
      _id: id,
      isDeleted: false
    });
    
    if (request) {
      // Check if user has access to this request
      const requestUserIdStr = String(request.userId);
      const businessUserIdStr = String(businessUserId);
      
      logger.info('Comparing userIds for access', {
        requestUserIdStr,
        businessUserIdStr,
        match: requestUserIdStr === businessUserIdStr
      });
      
      if (requestUserIdStr !== businessUserIdStr) {
        logger.error('Access denied - userId mismatch', {
          requestId: id,
          expectedUserId: businessUserIdStr,
          actualUserId: requestUserIdStr
        });
        
        return res.status(403).json({
          success: false,
          error: 'Access denied - request belongs to different business',
          debug: {
            expectedUserId: businessUserIdStr,
            actualUserId: requestUserIdStr
          }
        });
      }
    } else {
      logger.error('Request not found', {
        requestId: id
      });
      
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }
    
    // Only allow status updates to pending requests
    if (request && request.status !== 'pending') {
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