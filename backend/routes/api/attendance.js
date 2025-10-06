import express from 'express';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';
import Attendance from '../../models/Attendance.js';

const router = express.Router();

// Test endpoint to verify attendance API is accessible
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Attendance API is working',
        user: req.user ? {
            id: req.user._id || req.user.id,
            email: req.user.email,
            role: req.user.role
        } : null
    });
});

// GET /api/attendance - Get all attendance records for the authenticated user
router.get('/', withErrorHandling(async (req, res) => {
    console.log('🔍 [ATTENDANCE DEBUG] req.user:', req.user);
    console.log('🔍 [ATTENDANCE DEBUG] req.headers:', req.headers);

    if (!req.user) {
        console.error('❌ [ATTENDANCE] req.user is undefined');
        return res.status(401).json({ error: 'Authentication required - no user context' });
    }

    // CRITICAL: Use req.user.userId (branch owner ID) for cross-employee visibility
    // req.user.id = individual employee ID (wrong!)
    // req.user.userId = branch owner ID (correct!)
    const userId = req.user.userId?.toString() || req.userId?.toString() || req.user._id?.toString() || req.user.id?.toString();

    // Query parameters for filtering
    const { employeeId, date, startDate, endDate, limit = 100 } = req.query;

    // Build query
    const query = { userId };

    // SECURITY: Filter based on role hierarchy
    // Priority: role takes precedence over type
    // - Owners, managers, receptionists → see ALL attendance
    // - Regular employees → see only their own attendance
    const isManagerOrOwner = req.user.role === 'manager' || req.user.role === 'owner' || req.user.role === 'receptionist';

    if (!isManagerOrOwner && req.user.employeeId) {
        // Regular employees can only see their own attendance
        query.employeeId = req.user.employeeId;
        console.log('🔒 [SECURITY] Employee view - filtering to employeeId:', req.user.employeeId);
    } else if (employeeId) {
        // Managers/owners can optionally filter by specific employee
        query.employeeId = employeeId;
        console.log('📊 [MANAGER] Filtering to specific employee:', employeeId);
    } else {
        // Managers/owners see all attendance for their business
        console.log('📊 [MANAGER] Showing all attendance for userId:', userId);
    }
    
    if (date) {
        query.date = date;
    } else if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
        query.date = { $gte: startDate };
    } else if (endDate) {
        query.date = { $lte: endDate };
    }
    
    // Get attendance records from MongoDB
    const attendance = await Attendance.find(query)
        .sort({ date: -1, checkIn: -1 })
        .limit(parseInt(limit));
    
    logger.info('Attendance records retrieved from MongoDB', {
        category: 'DATABASE',
        operation: 'get_all',
        data: { userId, count: attendance.length, query }
    });
    
    res.json({
        success: true,
        data: attendance,
        count: attendance.length
    });
}));

// POST /api/attendance - Create new attendance record
router.post('/', withErrorHandling(async (req, res) => {
    console.log('📥 [ATTENDANCE POST] Request body:', req.body);
    console.log('👤 [ATTENDANCE POST] User:', req.user);

    // CRITICAL: Use req.user.userId (branch owner ID) for cross-employee visibility
    // req.user.id = individual employee ID (wrong!)
    // req.user.userId = branch owner ID (correct!)
    const userId = req.user.userId?.toString() || req.userId?.toString() || req.user._id?.toString() || req.user.id?.toString();
    
    // Transform PWA format to match MongoDB schema
    const attendanceData = {
        ...req.body,
        userId: userId,
        // Convert checkInTime string to checkIn Date
        checkIn: req.body.checkInTime ? new Date(req.body.checkInTime) : new Date(),
        // Convert checkOutTime string to checkOut Date if provided
        checkOut: req.body.checkOutTime ? new Date(req.body.checkOutTime) : null,
        // Ensure checkInTime and checkOutTime are also set for compatibility
        checkInTime: req.body.checkInTime || new Date().toISOString(),
        checkOutTime: req.body.checkOutTime || null
    };
    
    // Don't delete these fields as they might be needed
    // delete attendanceData.checkInTime;
    // delete attendanceData.checkOutTime;
    
    console.log('💾 [ATTENDANCE POST] Saving data:', attendanceData);
    
    // Create new attendance record in MongoDB
    const attendance = new Attendance(attendanceData);
    const savedAttendance = await attendance.save();
    
    console.log('✅ [ATTENDANCE POST] Saved successfully:', savedAttendance._id);
    
    logger.info('Attendance record created in MongoDB', {
        category: 'DATABASE',
        operation: 'create',
        data: { userId, attendanceId: attendance._id }
    });
    
    res.status(201).json({
        success: true,
        data: {
            ...savedAttendance.toObject(),
            id: savedAttendance._id,
            _id: savedAttendance._id
        },
        message: 'Attendance record created successfully'
    });
}));

// PUT /api/attendance/:id - Update attendance record
router.put('/:id', withErrorHandling(async (req, res) => {
    // Use branch owner ID for cross-employee visibility
    const userId = req.user.userId?.toString() || req.userId?.toString() || req.user._id?.toString() || req.user.id?.toString();
    const { id } = req.params;
    
    // Transform PWA format to match MongoDB schema
    const updateData = { ...req.body };
    
    // Convert time fields if provided
    if (req.body.checkInTime) {
        updateData.checkIn = new Date(req.body.checkInTime);
        delete updateData.checkInTime;
    }
    if (req.body.checkOutTime) {
        updateData.checkOut = new Date(req.body.checkOutTime);
        delete updateData.checkOutTime;
    }
    
    updateData.updatedAt = new Date();
    
    // Find and update attendance record in MongoDB
    const attendance = await Attendance.findOneAndUpdate(
        { _id: id, userId: userId },
        updateData,
        { new: true, runValidators: true }
    );
    
    if (!attendance) {
        return res.status(404).json({
            success: false,
            message: 'Attendance record not found'
        });
    }
    
    logger.info('Attendance record updated in MongoDB', {
        category: 'DATABASE',
        operation: 'update',
        data: { userId, attendanceId: id }
    });
    
    res.json({
        success: true,
        data: attendance,
        message: 'Attendance record updated successfully'
    });
}));

// DELETE /api/attendance/:id - Delete attendance record
router.delete('/:id', withErrorHandling(async (req, res) => {
    // Use branch owner ID for cross-employee visibility
    const userId = req.user.userId?.toString() || req.userId?.toString() || req.user._id?.toString() || req.user.id?.toString();
    const { id } = req.params;
    
    // Find and delete attendance record in MongoDB
    const attendance = await Attendance.findOneAndDelete({ _id: id, userId: userId });
    
    if (!attendance) {
        return res.status(404).json({
            success: false,
            message: 'Attendance record not found'
        });
    }
    
    logger.info('Attendance record deleted from MongoDB', {
        category: 'DATABASE',
        operation: 'delete',
        data: { userId, attendanceId: id }
    });
    
    res.json({
        success: true,
        message: 'Attendance record deleted successfully'
    });
}));

// GET /api/attendance/stats - Get attendance statistics
router.get('/stats', withErrorHandling(async (req, res) => {
    // Use branch owner ID for cross-employee visibility
    const userId = req.user.userId?.toString() || req.userId?.toString() || req.user._id?.toString() || req.user.id?.toString();
    const { startDate, endDate, employeeId } = req.query;
    
    // Build query
    const matchQuery = { userId };
    
    if (employeeId) {
        matchQuery.employeeId = employeeId;
    }
    
    if (startDate && endDate) {
        matchQuery.date = { $gte: startDate, $lte: endDate };
    }
    
    // Aggregate statistics
    const stats = await Attendance.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalDays: { $sum: 1 },
                totalHours: { $sum: '$workingHours' },
                avgHours: { $avg: '$workingHours' },
                lateDays: { $sum: { $cond: ['$isLate', 1, 0] } },
                totalLateMinutes: { $sum: '$lateMinutes' },
                totalPayDeductions: { $sum: '$payDeduction' }
            }
        }
    ]);
    
    const result = stats[0] || {
        totalDays: 0,
        totalHours: 0,
        avgHours: 0,
        lateDays: 0,
        totalLateMinutes: 0,
        totalPayDeductions: 0
    };
    
    res.json({
        success: true,
        data: result
    });
}));

export default router;