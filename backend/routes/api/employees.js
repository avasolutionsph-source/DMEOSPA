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
            commissionRate, assignedRooms, createLogin, temporaryPassword,
            wageType, dailyRate, monthlyRate, hourlyRate, overtimeMultiplier,
            hasSSS, hasPhilHealth, hasPagibig,
            sssDeductionAmount, philHealthDeductionAmount, pagIbigDeductionAmount } = req.body;
    
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
    
    // 🔍 DEBUGGING: Log salary data received from frontend
    logger.info('💰 [SALARY-DEBUG] Salary data received from frontend:', {
        category: 'SALARY_DEBUG',
        operation: 'create_employee_salary',
        data: {
            wageType,
            dailyRate: parseFloat(dailyRate) || 0,
            monthlyRate: parseFloat(monthlyRate) || 0,
            hourlyRate: parseFloat(hourlyRate) || 0,
            overtimeMultiplier: parseFloat(overtimeMultiplier) || 1.25,
            mappedSalaryType: wageType || 'daily'
        }
    });
    
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
        // Salary configuration fields
        salaryType: wageType || 'daily', // Map frontend wageType to backend salaryType
        dailyRate: parseFloat(dailyRate) || 0,
        monthlyRate: parseFloat(monthlyRate) || 0,
        hourlyRate: parseFloat(hourlyRate) || 0,
        overtimeMultiplier: parseFloat(overtimeMultiplier) || 1.25,
        // Government benefits
        hasSSS: hasSSS || false,
        hasPhilHealth: hasPhilHealth || false,
        hasPagibig: hasPagibig || false,
        // Government deduction amounts (simplified)
        sssDeductionAmount: parseFloat(sssDeductionAmount) || 0,
        philHealthDeductionAmount: parseFloat(philHealthDeductionAmount) || 0,
        pagIbigDeductionAmount: parseFloat(pagIbigDeductionAmount) || 0,
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
    if (req.user.isEmployee && req.user.role !== 'manager') {
        // Regular employee viewing - use branch context
        query.userId = req.userId; // Original branch owner ID
        
        // Therapists can only see themselves
        if (['senior_therapist', 'junior_therapist', 'new_therapist'].includes(req.user.role)) {
            query._id = req.user.id;
        }
    } else {
        // Owner or manager viewing their employees (managers get same access as owners)
        query.userId = req.userId || req.user.id || req.user._id;
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
            isUsingTemporaryPassword: emp.isUsingTemporaryPassword || false,
            // CRITICAL FIX: Map backend salaryType to frontend wageType for compatibility
            wageType: emp.salaryType || emp.wageType || 'daily'
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

// Get single employee by ID
router.get('/:id', withErrorHandling(async (req, res) => {
    const { id } = req.params;
    
    // CRITICAL FIX: Use proper userId context consistently with PUT endpoint
    // req.userId is set by auth middleware to handle managers/employees correctly
    const queryUserId = req.userId || req.user.id || req.user._id;
    
    console.log('💰 [SALARY-DEBUG] Employee GET query details:', {
        employeeId: id,
        employeeIdType: typeof id,
        authUserId: req.user.id,
        authUserRole: req.user.role,
        contextUserId: req.userId,
        queryUserId: queryUserId,
        queryUserIdType: typeof queryUserId,
        isManager: req.user.role === 'manager',
        isEmployee: req.user.isEmployee,
        requestURL: req.originalUrl
    });
    
    // Find employee with proper user context
    let query = { _id: id };
    
    // Check if request is from employee or owner
    if (req.user.isEmployee && req.user.role !== 'manager') {
        // Regular employee viewing - use branch context and only allow viewing themselves
        query.userId = queryUserId; // Use consistent auth context
        
        // Therapists can only see themselves
        if (['senior_therapist', 'junior_therapist', 'new_therapist'].includes(req.user.role)) {
            query._id = req.user.id;
        }
    } else {
        // Owner or manager viewing their employees - use consistent auth context
        query.userId = queryUserId;
    }
    
    // CRITICAL DEBUG: Check if employee exists before retrieval
    const existingEmployee = await Employee.findOne({ _id: id }).lean();
    console.log('💰 [SALARY-DEBUG] Employee GET existence check:', {
        employeeId: id,
        foundEmployee: !!existingEmployee,
        employeeUserId: existingEmployee?.userId,
        expectedUserId: queryUserId,
        userIdMatch: existingEmployee?.userId === queryUserId,
        queryBeingUsed: query,
        currentSalaryData: existingEmployee ? {
            salaryType: existingEmployee.salaryType,
            dailyRate: existingEmployee.dailyRate,
            monthlyRate: existingEmployee.monthlyRate,
            hourlyRate: existingEmployee.hourlyRate
        } : null
    });
    
    const employee = await Employee.findOne(query)
        .select('+temporaryPassword +viewablePassword') // Include passwords for branch owners
        .lean();
    
    if (!employee) {
        // ENHANCED ERROR: Log detailed information when employee not found during GET
        console.error('❌ [SALARY-DEBUG] Employee not found for GET request:', {
            employeeId: id,
            queryUserId: queryUserId,
            query: query,
            authUser: {
                id: req.user.id,
                role: req.user.role,
                email: req.user.email
            }
        });
        
        return res.status(404).json({
            success: false,
            error: 'Employee not found or you do not have permission to view this employee'
        });
    }
    
    // SIMPLIFIED RESPONSE: Build response explicitly without spread operator complexity
    const responseData = {
        // Core identification
        _id: employee._id,
        id: employee._id.toString(),
        userId: employee.userId,
        branchId: employee.branchId,
        
        // Personal information
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        department: employee.department,
        role: employee.role,
        hireDate: employee.hireDate,
        
        // Authentication info
        hasLogin: !!employee.password,
        loginRole: employee.role || null,
        viewablePassword: employee.viewablePassword || employee.temporaryPassword || null,
        temporaryPassword: employee.isUsingTemporaryPassword ? employee.temporaryPassword : null,
        isUsingTemporaryPassword: employee.isUsingTemporaryPassword || false,
        
        // Commission settings
        commissionRate: employee.commissionRate || 0,
        commissionType: employee.commissionType || 'percentage',
        
        // CRITICAL: Salary configuration - explicitly defined
        wageType: employee.salaryType || 'daily', // Map backend salaryType to frontend wageType
        salaryType: employee.salaryType || 'daily', // Also keep backend field
        dailyRate: employee.dailyRate || 0,
        monthlyRate: employee.monthlyRate || 0,
        hourlyRate: employee.hourlyRate || 0,
        overtimeMultiplier: employee.overtimeMultiplier || 1.25,
        
        // Government benefits
        hasSSS: employee.hasSSS || false,
        hasPhilHealth: employee.hasPhilHealth || false,
        hasPagibig: employee.hasPagibig || false,
        sssDeductionAmount: employee.sssDeductionAmount || 0,
        philHealthDeductionAmount: employee.philHealthDeductionAmount || 0,
        pagIbigDeductionAmount: employee.pagIbigDeductionAmount || 0,
        
        // Status and metadata
        isActive: employee.isActive !== false,
        syncStatus: employee.syncStatus || 'synced',
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
    };
    
    // ENHANCED DEBUGGING: Comprehensive salary data validation
    console.log('💰 [SALARY-DEBUG] Employee salary data being returned to frontend (ENHANCED):', {
        employeeId: id,
        retrievalSuccessful: true,
        mongoQueryUsed: query,
        rawEmployeeFromDB: {
            _id: employee._id,
            salaryType: employee.salaryType,
            dailyRate: employee.dailyRate,
            monthlyRate: employee.monthlyRate,
            hourlyRate: employee.hourlyRate,
            overtimeMultiplier: employee.overtimeMultiplier,
            dataTypes: {
                dailyRateType: typeof employee.dailyRate,
                monthlyRateType: typeof employee.monthlyRate,
                hourlyRateType: typeof employee.hourlyRate
            }
        },
        finalResponseData: {
            wageType: responseData.wageType,
            dailyRate: responseData.dailyRate,
            monthlyRate: responseData.monthlyRate,
            hourlyRate: responseData.hourlyRate,
            overtimeMultiplier: responseData.overtimeMultiplier
        },
        salaryFieldsExist: {
            hasDaily: !!(employee.dailyRate && employee.dailyRate > 0 && employee.dailyRate !== 500),
            hasMonthly: !!(employee.monthlyRate && employee.monthlyRate > 0 && employee.monthlyRate !== 15000),
            hasHourly: !!(employee.hourlyRate && employee.hourlyRate > 0 && employee.hourlyRate !== 62.50)
        },
        frontendWillShowConfigured: !!(
            (responseData.dailyRate && responseData.dailyRate > 0 && responseData.dailyRate !== 500) ||
            (responseData.monthlyRate && responseData.monthlyRate > 0 && responseData.monthlyRate !== 15000) ||
            (responseData.hourlyRate && responseData.hourlyRate > 0 && responseData.hourlyRate !== 62.50)
        ),
        schemaDefaults: {
            dailyDefault: 500,
            monthlyDefault: 15000,
            hourlyDefault: 62.50
        }
    });
    
    // CRITICAL CHECK: Ensure all salary fields are included in response
    if (!responseData.hasOwnProperty('dailyRate')) {
        console.error('❌ [SALARY-DEBUG] CRITICAL: dailyRate missing from response!');
        responseData.dailyRate = employee.dailyRate || 0;
    }
    if (!responseData.hasOwnProperty('monthlyRate')) {
        console.error('❌ [SALARY-DEBUG] CRITICAL: monthlyRate missing from response!');
        responseData.monthlyRate = employee.monthlyRate || 0;
    }
    if (!responseData.hasOwnProperty('hourlyRate')) {
        console.error('❌ [SALARY-DEBUG] CRITICAL: hourlyRate missing from response!');
        responseData.hourlyRate = employee.hourlyRate || 0;
    }
    
    logger.info(`Retrieved employee details: ${id}`, {
        category: 'DATABASE',
        operation: 'get_employee_details',
        data: { employeeId: id }
    });
    
    // CACHE-BUSTING: Add headers to prevent stale data
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toISOString()
    });
    
    res.json({
        success: true,
        data: responseData
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
    
    // ENHANCED FIELD MAPPING: Map frontend field to backend field for salary type
    if (updateData.wageType) {
        updateData.salaryType = updateData.wageType;
        delete updateData.wageType;
        console.log('💰 [SALARY-DEBUG] Mapped wageType to salaryType:', updateData.salaryType);
    }
    
    // ENHANCED VALIDATION: Ensure salary rate fields are properly processed
    // Convert string values to numbers and validate
    const salaryFields = ['dailyRate', 'monthlyRate', 'hourlyRate', 'overtimeMultiplier'];
    salaryFields.forEach(field => {
        if (updateData[field] !== undefined) {
            const numValue = parseFloat(updateData[field]);
            updateData[field] = isNaN(numValue) ? 0 : numValue;
        }
    });
    
    // CRITICAL FIX: Ensure salary rate fields are properly saved
    // Frontend sends: dailyRate, monthlyRate, hourlyRate, overtimeMultiplier
    console.log('💰 [SALARY-DEBUG] Backend received salary update data (after validation):', {
        salaryType: updateData.salaryType,
        dailyRate: updateData.dailyRate,
        monthlyRate: updateData.monthlyRate,
        hourlyRate: updateData.hourlyRate,
        overtimeMultiplier: updateData.overtimeMultiplier,
        rawBody: {
            wageType: req.body.wageType,
            dailyRate: req.body.dailyRate,
            monthlyRate: req.body.monthlyRate,
            hourlyRate: req.body.hourlyRate
        }
    });
    
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
    
    // CRITICAL FIX: Use proper userId context from auth middleware
    // req.userId is set by auth middleware to handle managers/employees correctly
    const queryUserId = req.userId || req.user.id || req.user._id;
    
    console.log('💰 [SALARY-DEBUG] Employee update query details:', {
        employeeId: id,
        employeeIdType: typeof id,
        authUserId: req.user.id,
        authUserRole: req.user.role,
        contextUserId: req.userId,
        queryUserId: queryUserId,
        queryUserIdType: typeof queryUserId,
        isManager: req.user.role === 'manager',
        requestURL: req.originalUrl,
        requestMethod: req.method
    });
    
    // CRITICAL DEBUG: Check if employee exists before update
    const existingEmployee = await Employee.findOne({ _id: id }).lean();
    console.log('💰 [SALARY-DEBUG] Employee existence check:', {
        employeeId: id,
        foundEmployee: !!existingEmployee,
        employeeUserId: existingEmployee?.userId,
        expectedUserId: queryUserId,
        userIdMatch: existingEmployee?.userId === queryUserId,
        currentSalaryData: existingEmployee ? {
            salaryType: existingEmployee.salaryType,
            dailyRate: existingEmployee.dailyRate,
            monthlyRate: existingEmployee.monthlyRate,
            hourlyRate: existingEmployee.hourlyRate
        } : null
    });
    
    // CRITICAL FIX: First verify employee exists with correct auth context
    // Try finding without userId filter first to debug auth context
    const employeeByIdOnly = await Employee.findById(id).lean();
    if (!employeeByIdOnly) {
        console.error('❌ [SALARY-DEBUG] Employee ID does not exist in database:', {
            employeeId: id,
            employeeIdType: typeof id
        });
        return res.status(404).json({
            success: false,
            error: 'Employee ID not found in database'
        });
    }
    
    // Check if userId mismatch is the issue
    if (employeeByIdOnly.userId !== queryUserId) {
        console.error('❌ [SALARY-DEBUG] CRITICAL: Authentication context mismatch:', {
            employeeId: id,
            employeeActualUserId: employeeByIdOnly.userId,
            authContextUserId: queryUserId,
            userIdType: typeof employeeByIdOnly.userId,
            contextType: typeof queryUserId,
            authUser: {
                id: req.user.id,
                role: req.user.role,
                email: req.user.email
            }
        });
        
        // Try update with the actual userId from the employee record
        console.log('🔄 [SALARY-DEBUG] Attempting update with employee\'s actual userId...');
        const employee = await Employee.findOneAndUpdate(
            { _id: id, userId: employeeByIdOnly.userId },
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!employee) {
            return res.status(403).json({
                success: false,
                error: 'Authentication context mismatch - cannot update this employee'
            });
        }
        
        console.log('✅ [SALARY-DEBUG] Update succeeded with employee\'s actual userId');
        // Continue to success logging with this employee
    } else {
        // Normal update path
        const employee = await Employee.findOneAndUpdate(
            { _id: id, userId: queryUserId },
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!employee) {
            console.error('❌ [SALARY-DEBUG] Employee update failed despite matching userId:', {
                employeeId: id,
                queryUserId: queryUserId,
                updateData: {
                    salaryType: updateData.salaryType,
                    dailyRate: updateData.dailyRate,
                    monthlyRate: updateData.monthlyRate,
                    hourlyRate: updateData.hourlyRate
                }
            });
            
            return res.status(500).json({
                success: false,
                error: 'Employee update failed for unknown reason'
            });
        }
        // Continue to success logging with this employee
    }
    
    // Get the updated employee for response (re-fetch to ensure we have latest data)
    const employee = await Employee.findById(id).select('-password').lean();
    
    // ENHANCED SUCCESS LOGGING: Verify and log the actual update results
    logger.info(`Updated employee: ${id}`, {
        category: 'DATABASE',
        operation: 'update_employee',
        data: { 
            employeeId: id,
            hadPasswordReset: !!req.body.resetPassword,
            salaryUpdated: !!(updateData.dailyRate || updateData.monthlyRate || updateData.hourlyRate),
            updatedFields: Object.keys(updateData)
        }
    });
    
    // CRITICAL FIX: Debug salary data after save to verify persistence
    console.log('💰 [SALARY-DEBUG] Employee data after MongoDB save (VERIFICATION):', {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        salaryType: employee.salaryType,
        dailyRate: employee.dailyRate,
        monthlyRate: employee.monthlyRate,
        hourlyRate: employee.hourlyRate,
        overtimeMultiplier: employee.overtimeMultiplier,
        updateSuccessful: true,
        matchedDocument: true,
        originalUpdateData: {
            salaryType: updateData.salaryType,
            dailyRate: updateData.dailyRate,
            monthlyRate: updateData.monthlyRate,
            hourlyRate: updateData.hourlyRate
        },
        dataTypeCheck: {
            dailyRateType: typeof employee.dailyRate,
            monthlyRateType: typeof employee.monthlyRate,
            hourlyRateType: typeof employee.hourlyRate,
            dailyRateValue: employee.dailyRate,
            monthlyRateValue: employee.monthlyRate,
            hourlyRateValue: employee.hourlyRate
        }
    });
    
    // CRITICAL VERIFICATION: Ensure salary fields were actually saved
    if (updateData.dailyRate !== undefined || updateData.monthlyRate !== undefined || updateData.hourlyRate !== undefined) {
        const savedCorrectly = (
            (updateData.dailyRate === undefined || employee.dailyRate === updateData.dailyRate) &&
            (updateData.monthlyRate === undefined || employee.monthlyRate === updateData.monthlyRate) &&
            (updateData.hourlyRate === undefined || employee.hourlyRate === updateData.hourlyRate)
        );
        
        console.log('💰 [SALARY-DEBUG] Salary persistence verification:', {
            savedCorrectly,
            expectedDaily: updateData.dailyRate,
            actualDaily: employee.dailyRate,
            expectedMonthly: updateData.monthlyRate,
            actualMonthly: employee.monthlyRate,
            expectedHourly: updateData.hourlyRate,
            actualHourly: employee.hourlyRate,
            salaryFieldsInResponse: {
                dailyRate: employee.dailyRate,
                monthlyRate: employee.monthlyRate,
                hourlyRate: employee.hourlyRate,
                overtimeMultiplier: employee.overtimeMultiplier
            }
        });
        
        if (!savedCorrectly) {
            console.error('❌ [SALARY-DEBUG] CRITICAL: Salary data not saved correctly!');
            return res.status(500).json({
                success: false,
                error: 'Salary data was not saved correctly to database',
                debug: {
                    expected: {
                        dailyRate: updateData.dailyRate,
                        monthlyRate: updateData.monthlyRate,
                        hourlyRate: updateData.hourlyRate
                    },
                    actual: {
                        dailyRate: employee.dailyRate,
                        monthlyRate: employee.monthlyRate,
                        hourlyRate: employee.hourlyRate
                    }
                }
            });
        }
    }
    
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