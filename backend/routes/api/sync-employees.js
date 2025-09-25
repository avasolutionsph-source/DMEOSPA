import express from 'express';
import Employee from '../../models/Employee.js';
import User from '../../models/User.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// POST /api/sync-employees/link-to-branch
// Links all employees to the correct branch owner
router.post('/link-to-branch', withErrorHandling(async (req, res) => {
    const requestingUserId = req.user.id || req.user._id;
    
    // Find the branch owner (business account)
    const branchOwner = await User.findOne({
        _id: requestingUserId,
        role: { $in: ['owner', 'business'] }
    });
    
    if (!branchOwner) {
        // If not a branch owner, find their associated branch
        const employee = await Employee.findOne({ userId: requestingUserId });
        if (employee && employee.branchId) {
            const branch = await User.findById(employee.branchId);
            if (branch) {
                // Link all employees to this branch
                const result = await Employee.updateMany(
                    { branchId: branch._id },
                    { userId: branch._id }
                );
                
                return res.json({
                    success: true,
                    message: `Linked ${result.modifiedCount} employees to branch owner`,
                    branchId: branch._id
                });
            }
        }
        
        return res.status(403).json({
            success: false,
            error: 'Not authorized to link employees'
        });
    }
    
    // Update all employees with this branchId to also have the correct userId
    const result = await Employee.updateMany(
        { branchId: branchOwner._id },
        { userId: branchOwner._id }
    );
    
    logger.info(`Linked employees to branch owner`, {
        category: 'SYNC',
        operation: 'link_employees_to_branch',
        data: {
            branchId: branchOwner._id,
            modifiedCount: result.modifiedCount
        }
    });
    
    res.json({
        success: true,
        message: `Successfully linked ${result.modifiedCount} employees to branch owner`,
        branchId: branchOwner._id
    });
}));

// GET /api/sync-employees/check-context
// Shows the current user context and associated employees
router.get('/check-context', withErrorHandling(async (req, res) => {
    const userId = req.user.id || req.user._id;
    
    // Get user info
    const user = await User.findById(userId);
    
    // Get employees by userId
    const employeesByUserId = await Employee.find({ userId });
    
    // Get employees by branchId
    const employeesByBranchId = await Employee.find({ branchId: userId });
    
    // If user is an employee, get their branch's employees
    let branchEmployees = [];
    const employeeRecord = await Employee.findOne({ userId });
    if (employeeRecord && employeeRecord.branchId) {
        branchEmployees = await Employee.find({ branchId: employeeRecord.branchId });
    }
    
    res.json({
        success: true,
        context: {
            userId,
            userRole: user?.role,
            userEmail: user?.email,
            businessName: user?.businessName
        },
        employees: {
            byUserId: employeesByUserId.map(e => ({
                id: e._id,
                name: `${e.firstName} ${e.lastName}`,
                email: e.email,
                userId: e.userId,
                branchId: e.branchId
            })),
            byBranchId: employeesByBranchId.map(e => ({
                id: e._id,
                name: `${e.firstName} ${e.lastName}`,
                email: e.email,
                userId: e.userId,
                branchId: e.branchId
            })),
            byBranch: branchEmployees.map(e => ({
                id: e._id,
                name: `${e.firstName} ${e.lastName}`,
                email: e.email,
                userId: e.userId,
                branchId: e.branchId
            }))
        },
        counts: {
            byUserId: employeesByUserId.length,
            byBranchId: employeesByBranchId.length,
            byBranch: branchEmployees.length
        }
    });
}));

// POST /api/sync-employees/migrate-all
// Migrates all employees to use branchId as primary association
router.post('/migrate-all', withErrorHandling(async (req, res) => {
    const userId = req.user.id || req.user._id;
    
    // Only allow business owners to migrate
    const user = await User.findById(userId);
    if (!user || !['owner', 'business'].includes(user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Only business owners can migrate employees'
        });
    }
    
    // Find all employees that might belong to this business
    const employees = await Employee.find({
        $or: [
            { userId },
            { branchId: userId }
        ]
    });
    
    // Update them all to have consistent userId and branchId
    const updates = await Promise.all(employees.map(emp => 
        Employee.findByIdAndUpdate(emp._id, {
            userId: userId,
            branchId: userId
        }, { new: true })
    ));
    
    logger.info(`Migrated employees to consistent branch structure`, {
        category: 'SYNC',
        operation: 'migrate_employees',
        data: {
            businessId: userId,
            count: updates.length
        }
    });
    
    res.json({
        success: true,
        message: `Migrated ${updates.length} employees`,
        employees: updates.map(e => ({
            id: e._id,
            name: `${e.firstName} ${e.lastName}`,
            email: e.email
        }))
    });
}));

export default router;