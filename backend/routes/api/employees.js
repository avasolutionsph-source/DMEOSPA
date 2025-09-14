import express from 'express';
import Employee from '../../models/Employee.js';
import BaseRouteHandler from '../../utils/base-route-handler.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Create base route handler for employees
const employeeHandler = new BaseRouteHandler(Employee, {
    populate: [], // Add population fields if needed
    searchFields: ['firstName', 'lastName', 'email', 'phone'],
    sortField: 'firstName',
    sortOrder: 1,
    requiredFields: ['firstName', 'lastName'],
    uniqueFields: ['email'], // Email should be unique per user
    ownerField: 'userId'
});

// Standard CRUD routes using base handler
employeeHandler.createRoutes(router);

// Additional employee-specific routes
router.get('/role/:role', withErrorHandling(async (req, res) => {
    const { role } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const query = {
        userId: req.user._id,
        role,
        isActive: true
    };
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [employees, total] = await Promise.all([
        Employee.find(query)
            .sort({ firstName: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Employee.countDocuments(query)
    ]);
    
    logger.info(`Retrieved employees by role: ${role}`, {
        category: 'DATABASE',
        operation: 'get_employees_by_role',
        data: { role, count: employees.length }
    });
    
    res.json({
        success: true,
        data: employees,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));

router.patch('/:id/status', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const employee = await Employee.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { isActive, syncStatus: 'pending' },
        { new: true }
    );
    
    if (!employee) {
        return res.status(404).json({
            success: false,
            error: { message: 'Employee not found' }
        });
    }
    
    logger.info(`Updated employee status: ${id}`, {
        category: 'DATABASE',
        operation: 'update_employee_status',
        data: { id, isActive }
    });
    
    res.json({
        success: true,
        data: employee,
        message: 'Employee status updated successfully'
    });
}));

router.get('/:id/schedule', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    const employee = await Employee.findOne({
        _id: id,
        userId: req.user._id
    });
    
    if (!employee) {
        return res.status(404).json({
            success: false,
            error: { message: 'Employee not found' }
        });
    }
    
    // This would typically integrate with a scheduling system
    // For now, return placeholder schedule data
    const schedule = {
        employeeId: id,
        employeeName: employee.name,
        schedule: [],
        period: { startDate, endDate }
    };
    
    res.json({
        success: true,
        data: schedule,
        message: 'Employee schedule retrieved successfully'
    });
}));

router.put('/:id/schedule', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const { schedule } = req.body;
    
    const employee = await Employee.findOne({
        _id: id,
        userId: req.user._id
    });
    
    if (!employee) {
        return res.status(404).json({
            success: false,
            error: { message: 'Employee not found' }
        });
    }
    
    // Update employee schedule (this would typically integrate with scheduling system)
    // For now, just acknowledge the update
    logger.info(`Updated employee schedule: ${id}`, {
        category: 'DATABASE',
        operation: 'update_employee_schedule',
        data: { id, scheduleItems: schedule?.length || 0 }
    });
    
    res.json({
        success: true,
        message: 'Employee schedule updated successfully'
    });
}));

export default router;