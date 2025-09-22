import express from 'express';
import crypto from 'crypto';
import Employee from '../../models/Employee.js';
import User from '../../models/User.js';
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

// Override create to handle employee login setup
router.post('/', withErrorHandling(async (req, res) => {
    const { firstName, lastName, email, role, phone, position, department, 
            commissionRate, assignedRooms, createLogin, temporaryPassword } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !role) {
        return res.status(400).json({
            success: false,
            error: 'First name, last name, and role are required'
        });
    }
    
    // Validate role
    const validRoles = ['owner', 'manager', 'senior_therapist', 'junior_therapist', 
                       'new_therapist', 'receptionist', 'other_staff'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({
            success: false,
            error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
    }
    
    // Get branch information from the authenticated user
    const branchUser = await User.findById(req.user.id || req.user._id);
    if (!branchUser) {
        return res.status(404).json({
            success: false,
            error: 'Branch user not found'
        });
    }
    
    // Check if employee with same email already exists for this branch
    if (email) {
        const existingEmployee = await Employee.findOne({
            branchId: branchUser._id,
            email: email.toLowerCase()
        });
        
        if (existingEmployee) {
            return res.status(400).json({
                success: false,
                error: 'An employee with this email already exists in your branch'
            });
        }
    }
    
    // Use provided password or generate one
    let password = null;
    if (createLogin && email) {
        password = temporaryPassword || crypto.randomBytes(4).toString('hex');
    }
    
    // Create employee
    const employee = new Employee({
        userId: req.user.id || req.user._id,
        branchId: branchUser._id,
        firstName,
        lastName,
        email: email ? email.toLowerCase() : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${branchUser.businessName.replace(/\s+/g, '').toLowerCase()}.temp`,
        password: password, // Will be hashed by pre-save hook, viewablePassword set in pre-save
        role,
        phone: phone || '',
        position: position || role,
        department: department || '',
        commissionRate: commissionRate || 0,
        assignedRooms: assignedRooms || [],
        isActive: true
    });
    
    await employee.save();
    
    logger.info(`Created employee with role: ${role}`, {
        category: 'DATABASE',
        operation: 'create_employee',
        data: { 
            employeeId: employee._id, 
            role,
            hasLogin: !!password,
            branchId: branchUser._id
        }
    });
    
    // Prepare response
    const response = {
        success: true,
        data: employee,
        message: 'Employee created successfully'
    };
    
    // Include password in response if created
    if (password) {
        response.temporaryPassword = password;
        response.viewablePassword = password;
        response.loginInstructions = `Employee can login with email: ${employee.email} and password: ${password}.`;
    }
    
    res.json(response);
}));

// Get all employees (with employee context support)
router.get('/', withErrorHandling(async (req, res) => {
    const { page = 1, limit = 50, search = '', role, isActive } = req.query;
    
    // Build query based on user context
    let query = {};
    
    // Check if request is from employee or owner
    if (req.user.isEmployee) {
        // Employee viewing - use branch context
        query.userId = req.userId; // Original branch owner ID
        
        // Therapists can only see themselves
        if (['senior_therapist', 'junior_therapist', 'new_therapist'].includes(req.user.role)) {
            query._id = req.user.id;
        }
    } else {
        // Owner viewing their employees
        query.userId = req.user.id || req.user._id;
    }
    
    // Add filters
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Add search
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [employees, total] = await Promise.all([
        Employee.find(query)
            .select('+temporaryPassword +viewablePassword') // Include passwords for branch owners
            .sort({ firstName: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Employee.countDocuments(query)
    ]);
    
    // Add login status indicator and include viewable password for branch owners
    const employeesWithLoginStatus = employees.map(emp => {
        const { password, temporaryPassword, viewablePassword, ...employeeData } = emp;
        return {
            ...employeeData,
            hasLogin: !!password,
            loginRole: emp.role || null,
            // Include viewable password for branch owners
            viewablePassword: viewablePassword || temporaryPassword || null,
            temporaryPassword: emp.isUsingTemporaryPassword ? temporaryPassword : null,
            isUsingTemporaryPassword: emp.isUsingTemporaryPassword || false
        };
    });
    
    res.json({
        success: true,
        data: employeesWithLoginStatus,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));

// Update employee (including password reset)
router.put('/:id', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.userId;
    delete updateData.branchId;
    
    // Handle password reset or update
    let newPassword = null;
    if (updateData.resetPassword || updateData.password) {
        newPassword = updateData.password || updateData.temporaryPassword || crypto.randomBytes(4).toString('hex');
        updateData.password = newPassword;
        updateData.viewablePassword = newPassword; // Store viewable version
        updateData.loginAttempts = 0;
        updateData.isLocked = false;
        delete updateData.resetPassword;
        delete updateData.temporaryPassword;
    }
    
    // Find and update employee
    const employee = await Employee.findOneAndUpdate(
        { _id: id, userId: req.user.id || req.user._id },
        updateData,
        { new: true, runValidators: true }
    ).select('-password');
    
    if (!employee) {
        return res.status(404).json({
            success: false,
            error: 'Employee not found'
        });
    }
    
    logger.info(`Updated employee: ${id}`, {
        category: 'DATABASE',
        operation: 'update_employee',
        data: { 
            employeeId: id,
            hadPasswordReset: !!req.body.resetPassword
        }
    });
    
    const response = {
        success: true,
        data: employee,
        message: 'Employee updated successfully'
    };
    
    // Include new password if reset
    if (newPassword) {
        response.temporaryPassword = newPassword;
        response.viewablePassword = newPassword;
        response.loginInstructions = `Employee password has been updated. New password: ${newPassword}`;
    }
    
    res.json(response);
}));

// Delete employee
router.delete('/:id', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    
    const employee = await Employee.findOneAndDelete({
        _id: id,
        userId: req.user.id || req.user._id
    });
    
    if (!employee) {
        return res.status(404).json({
            success: false,
            error: 'Employee not found'
        });
    }
    
    logger.info(`Deleted employee: ${id}`, {
        category: 'DATABASE',
        operation: 'delete_employee',
        data: { employeeId: id }
    });
    
    res.json({
        success: true,
        message: 'Employee deleted successfully'
    });
}));

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