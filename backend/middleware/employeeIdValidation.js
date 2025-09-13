import Employee from '../models/Employee.js';
import logger from '../utils/logger.js';

/**
 * Middleware to validate and ensure employee ID consistency
 */

/**
 * Validate employee ID references in transaction data
 */
export const validateEmployeeReferences = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?.userId || req.userId;
        
        if (!userId || userId === 'anonymous') {
            return next(); // Skip validation for anonymous users
        }

        // Check if request contains employee references
        const { employees, transactions } = req.body;
        
        if (employees && Array.isArray(employees)) {
            // Validate employee data integrity
            const validationResults = await validateEmployeeData(employees, userId);
            if (!validationResults.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Employee data validation failed',
                    details: validationResults.errors
                });
            }
            
            // Attach validated employee data to request
            req.validatedEmployees = validationResults.validatedEmployees;
        }

        if (transactions && Array.isArray(transactions)) {
            // Validate transaction employee references
            const validationResults = await validateTransactionEmployeeRefs(transactions, userId);
            if (!validationResults.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction employee reference validation failed',
                    details: validationResults.errors
                });
            }
            
            // Attach corrected transaction data to request
            req.validatedTransactions = validationResults.correctedTransactions;
        }

        next();
    } catch (error) {
        logger.error('Employee ID validation middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Employee validation failed',
            details: error.message
        });
    }
};

/**
 * Validate employee data for duplicates and consistency
 */
async function validateEmployeeData(employees, userId) {
    const errors = [];
    const validatedEmployees = [];
    const seenEmployees = new Map(); // Track duplicates by name and email
    
    for (const employee of employees) {
        const employeeErrors = [];
        
        // Check required fields
        if (!employee.firstName || !employee.lastName) {
            employeeErrors.push('Missing required fields: firstName and lastName');
        }
        
        // Check for duplicate names within the request
        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
        if (seenEmployees.has(fullName)) {
            employeeErrors.push(`Duplicate employee name in request: ${employee.firstName} ${employee.lastName}`);
        } else {
            seenEmployees.set(fullName, employee);
        }
        
        // Check for duplicate emails within the request
        if (employee.email) {
            const email = employee.email.toLowerCase();
            for (const [name, emp] of seenEmployees) {
                if (emp.email && emp.email.toLowerCase() === email && name !== fullName) {
                    employeeErrors.push(`Duplicate email in request: ${employee.email}`);
                    break;
                }
            }
        }
        
        // Validate against existing database records
        try {
            const existingEmployee = await Employee.findOne({
                userId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                isActive: true
            });
            
            if (existingEmployee && existingEmployee.localId !== employee.id) {
                employeeErrors.push(`Employee ${employee.firstName} ${employee.lastName} already exists with different ID`);
            }
            
            if (employee.email && existingEmployee && existingEmployee.email !== employee.email) {
                const emailExists = await Employee.findOne({
                    userId,
                    email: employee.email,
                    _id: { $ne: existingEmployee._id }
                });
                
                if (emailExists) {
                    employeeErrors.push(`Email ${employee.email} is already used by another employee`);
                }
            }
        } catch (dbError) {
            logger.error('Database validation error for employee:', employee, dbError);
            employeeErrors.push('Database validation failed');
        }
        
        if (employeeErrors.length > 0) {
            errors.push({
                employee: `${employee.firstName} ${employee.lastName}`,
                errors: employeeErrors
            });
        } else {
            validatedEmployees.push(employee);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        validatedEmployees
    };
}

/**
 * Validate and correct transaction employee references
 */
async function validateTransactionEmployeeRefs(transactions, userId) {
    const errors = [];
    const correctedTransactions = [];
    
    // Get all employees for this user to validate references
    const employees = await Employee.find({ userId });
    const employeeMap = new Map();
    
    // Create lookup maps
    employees.forEach(emp => {
        employeeMap.set(emp._id.toString(), emp);
        if (emp.localId) {
            employeeMap.set(emp.localId, emp);
        }
    });
    
    for (const transaction of transactions) {
        const transactionErrors = [];
        let correctedTransaction = { ...transaction };
        
        // Check employee references
        const employeeId = transaction.employee?.id || transaction.employeeId;
        
        if (employeeId) {
            const employee = employeeMap.get(employeeId.toString());
            
            if (!employee) {
                // Try to find employee by name if ID fails
                const employeeName = transaction.employee?.name;
                if (employeeName) {
                    const foundEmployee = employees.find(emp => 
                        `${emp.firstName} ${emp.lastName}`.toLowerCase() === employeeName.toLowerCase()
                    );
                    
                    if (foundEmployee) {
                        // Correct the employee reference
                        correctedTransaction.employee = {
                            ...correctedTransaction.employee,
                            id: foundEmployee._id.toString(),
                            backendId: foundEmployee._id.toString(),
                            name: `${foundEmployee.firstName} ${foundEmployee.lastName}`
                        };
                        correctedTransaction.employeeId = foundEmployee._id.toString();
                        
                        logger.info(`Corrected employee reference in transaction ${transaction.id}:`, {
                            oldId: employeeId,
                            newId: foundEmployee._id.toString(),
                            employeeName: foundEmployee.firstName + ' ' + foundEmployee.lastName
                        });
                    } else {
                        transactionErrors.push(`Employee not found: ${employeeId} (${employeeName})`);
                    }
                } else {
                    transactionErrors.push(`Employee not found: ${employeeId}`);
                }
            } else {
                // Ensure employee reference is up to date
                if (correctedTransaction.employee) {
                    correctedTransaction.employee.id = employee._id.toString();
                    correctedTransaction.employee.backendId = employee._id.toString();
                    correctedTransaction.employee.name = `${employee.firstName} ${employee.lastName}`;
                }
                correctedTransaction.employeeId = employee._id.toString();
            }
        }
        
        if (transactionErrors.length > 0) {
            errors.push({
                transaction: transaction.id || 'unknown',
                errors: transactionErrors
            });
        }
        
        correctedTransactions.push(correctedTransaction);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        correctedTransactions
    };
}

/**
 * Middleware to ensure employee exists before processing transactions
 */
export const ensureEmployeeExists = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?.userId || req.userId;
        const { transactions } = req.body;
        
        if (!transactions || !Array.isArray(transactions) || userId === 'anonymous') {
            return next();
        }
        
        const employees = await Employee.find({ userId });
        const employeeMap = new Map();
        employees.forEach(emp => {
            employeeMap.set(emp._id.toString(), emp);
            if (emp.localId) employeeMap.set(emp.localId, emp);
        });
        
        let hasErrors = false;
        const errorDetails = [];
        
        for (const transaction of transactions) {
            const employeeId = transaction.employee?.id || transaction.employeeId;
            
            if (employeeId && !employeeMap.has(employeeId.toString())) {
                hasErrors = true;
                errorDetails.push({
                    transactionId: transaction.id || 'unknown',
                    employeeId,
                    error: 'Employee does not exist'
                });
            }
        }
        
        if (hasErrors) {
            return res.status(400).json({
                success: false,
                error: 'Invalid employee references in transactions',
                details: errorDetails
            });
        }
        
        next();
    } catch (error) {
        logger.error('Employee existence check error:', error);
        res.status(500).json({
            success: false,
            error: 'Employee validation failed'
        });
    }
};

/**
 * Middleware to log employee ID mapping issues for monitoring
 */
export const logEmployeeIdMappingIssues = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log any ID mapping issues in responses
        if (typeof data === 'string') {
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.employeeIdMapping && parsedData.employeeIdMapping.length > 0) {
                    logger.info('Employee ID mappings returned:', {
                        count: parsedData.employeeIdMapping.length,
                        mappings: parsedData.employeeIdMapping.map(m => ({
                            oldId: m.oldId,
                            newId: m.newId,
                            name: m.name
                        }))
                    });
                }
            } catch (e) {
                // Not JSON, ignore
            }
        }
        
        originalSend.call(this, data);
    };
    
    next();
};