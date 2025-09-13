import express from 'express';
import { withErrorHandling } from '../../middleware/unifiedErrorHandler.js';
import logger from '../../utils/logger.js';
import Attendance from '../../models/Attendance.js';

const router = express.Router();

// GET /api/attendance - Get all attendance records for the authenticated user
router.get('/', withErrorHandling(async (req, res) => {
    console.log('🔍 [ATTENDANCE DEBUG] req.user:', req.user);
    console.log('🔍 [ATTENDANCE DEBUG] req.headers:', req.headers);
    
    if (!req.user) {
        console.error('❌ [ATTENDANCE] req.user is undefined');
        return res.status(401).json({ error: 'Authentication required - no user context' });
    }
    
    const userId = req.user._id?.toString() || req.user.id?.toString();
    
    // Query parameters for filtering
    const { employeeId, date, startDate, endDate, limit = 100 } = req.query;
    
    // Build query
    const query = { userId };
    
    if (employeeId) {
        query.employeeId = employeeId;
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
    const userId = req.user._id?.toString() || req.user.id?.toString();
    
    const attendanceData = {
        ...req.body,
        userId: userId
    };
    
    // Create new attendance record in MongoDB
    const attendance = new Attendance(attendanceData);
    await attendance.save();
    
    logger.info('Attendance record created in MongoDB', {
        category: 'DATABASE',
        operation: 'create',
        data: { userId, attendanceId: attendance._id }
    });
    
    res.status(201).json({
        success: true,
        data: attendance,
        message: 'Attendance record created successfully'
    });
}));

// PUT /api/attendance/:id - Update attendance record
router.put('/:id', withErrorHandling(async (req, res) => {
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const { id } = req.params;
    
    // Find and update attendance record in MongoDB
    const attendance = await Attendance.findOneAndUpdate(
        { _id: id, userId: userId },
        { ...req.body, updatedAt: new Date() },
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
    const userId = req.user._id?.toString() || req.user.id?.toString();
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
    const userId = req.user._id?.toString() || req.user.id?.toString();
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