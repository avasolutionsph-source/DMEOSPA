// Attendance Routes
const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { authenticateUser } = require('../middleware/auth');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'attendance');
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `attendance-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Get all attendance records
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { date, employeeId, type, limit = 100, offset = 0 } = req.query;
        
        let query = { userId: req.user._id };
        
        // Apply filters
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query.timestamp = { $gte: startDate, $lt: endDate };
        }
        
        if (employeeId) {
            query.employeeId = employeeId;
        }
        
        if (type) {
            query.type = type;
        }
        
        const attendance = await Attendance.find(query)
            .populate('employeeId', 'name position')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));
            
        const total = await Attendance.countDocuments(query);
        
        res.json({
            success: true,
            data: attendance,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        logger.error('Error fetching attendance records:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch attendance records',
            error: error.message 
        });
    }
});

// Record attendance (check-in/check-out)
router.post('/', authenticateUser, upload.single('faceImage'), async (req, res) => {
    try {
        const { employeeId, type, timestamp, location } = req.body;
        
        // Validate employee exists
        const employee = await Employee.findOne({ 
            _id: employeeId, 
            userId: req.user._id 
        });
        
        if (!employee) {
            return res.status(404).json({ 
                success: false, 
                message: 'Employee not found' 
            });
        }
        
        // Check for duplicate check-in on the same day
        if (type === 'check-in') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const existingCheckIn = await Attendance.findOne({
                employeeId,
                type: 'check-in',
                timestamp: { $gte: today, $lt: tomorrow }
            });
            
            if (existingCheckIn) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee already checked in today'
                });
            }
        }
        
        // Create attendance record
        const attendanceData = {
            userId: req.user._id,
            employeeId,
            employeeName: employee.name,
            employeePosition: employee.position,
            type,
            timestamp: timestamp || new Date(),
            date: new Date().toDateString(),
            time: new Date().toLocaleTimeString(),
            location: location || null
        };
        
        // Add face image path if uploaded
        if (req.file) {
            attendanceData.faceImagePath = `/uploads/attendance/${req.file.filename}`;
        }
        
        const attendance = new Attendance(attendanceData);
        await attendance.save();
        
        // Log activity
        logger.info(`Attendance recorded: ${employee.name} - ${type}`, {
            userId: req.user._id,
            employeeId,
            type
        });
        
        res.status(201).json({
            success: true,
            message: `${employee.name} ${type === 'check-in' ? 'checked in' : 'checked out'} successfully`,
            data: attendance
        });
    } catch (error) {
        logger.error('Error recording attendance:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to record attendance',
            error: error.message 
        });
    }
});

// Get attendance statistics
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateQuery = {};
        if (startDate && endDate) {
            dateQuery = {
                timestamp: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        } else {
            // Default to today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateQuery = {
                timestamp: { $gte: today, $lt: tomorrow }
            };
        }
        
        const query = { 
            userId: req.user._id,
            ...dateQuery
        };
        
        // Get statistics
        const [checkIns, checkOuts, uniqueEmployees, allRecords] = await Promise.all([
            Attendance.countDocuments({ ...query, type: 'check-in' }),
            Attendance.countDocuments({ ...query, type: 'check-out' }),
            Attendance.distinct('employeeId', query),
            Attendance.find(query).populate('employeeId', 'name position')
        ]);
        
        // Calculate average check-in time
        const checkInTimes = allRecords
            .filter(r => r.type === 'check-in')
            .map(r => new Date(r.timestamp).getHours() * 60 + new Date(r.timestamp).getMinutes());
        
        const avgCheckInMinutes = checkInTimes.length > 0 
            ? Math.round(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length)
            : 0;
        
        const avgCheckInTime = checkInTimes.length > 0
            ? `${Math.floor(avgCheckInMinutes / 60)}:${String(avgCheckInMinutes % 60).padStart(2, '0')}`
            : 'N/A';
        
        res.json({
            success: true,
            data: {
                totalCheckIns: checkIns,
                totalCheckOuts: checkOuts,
                presentToday: uniqueEmployees.length,
                averageCheckInTime: avgCheckInTime,
                records: allRecords
            }
        });
    } catch (error) {
        logger.error('Error fetching attendance statistics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch attendance statistics',
            error: error.message 
        });
    }
});

// Get attendance report for an employee
router.get('/employee/:employeeId', authenticateUser, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;
        
        // Verify employee belongs to user
        const employee = await Employee.findOne({ 
            _id: employeeId, 
            userId: req.user._id 
        });
        
        if (!employee) {
            return res.status(404).json({ 
                success: false, 
                message: 'Employee not found' 
            });
        }
        
        let query = { 
            userId: req.user._id,
            employeeId 
        };
        
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        const attendance = await Attendance.find(query)
            .sort({ timestamp: -1 });
        
        // Calculate statistics
        const totalDays = new Set(attendance.map(r => 
            new Date(r.timestamp).toDateString()
        )).size;
        
        const checkIns = attendance.filter(r => r.type === 'check-in').length;
        const checkOuts = attendance.filter(r => r.type === 'check-out').length;
        
        res.json({
            success: true,
            data: {
                employee: {
                    id: employee._id,
                    name: employee.name,
                    position: employee.position
                },
                totalDays,
                totalCheckIns: checkIns,
                totalCheckOuts: checkOuts,
                records: attendance
            }
        });
    } catch (error) {
        logger.error('Error fetching employee attendance:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch employee attendance',
            error: error.message 
        });
    }
});

// Delete attendance record
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const attendance = await Attendance.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });
        
        if (!attendance) {
            return res.status(404).json({ 
                success: false, 
                message: 'Attendance record not found' 
            });
        }
        
        // Delete associated image if exists
        if (attendance.faceImagePath) {
            const imagePath = path.join(__dirname, '..', attendance.faceImagePath);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                logger.warn('Failed to delete attendance image:', err);
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Attendance record deleted successfully' 
        });
    } catch (error) {
        logger.error('Error deleting attendance record:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete attendance record',
            error: error.message 
        });
    }
});

// Export attendance data
router.get('/export', authenticateUser, async (req, res) => {
    try {
        const { format = 'json', startDate, endDate } = req.query;
        
        let query = { userId: req.user._id };
        
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        const attendance = await Attendance.find(query)
            .populate('employeeId', 'name position')
            .sort({ timestamp: -1 });
        
        if (format === 'csv') {
            // Generate CSV
            const csv = [
                ['Date', 'Time', 'Employee Name', 'Position', 'Type', 'Location'].join(','),
                ...attendance.map(r => [
                    new Date(r.timestamp).toLocaleDateString(),
                    new Date(r.timestamp).toLocaleTimeString(),
                    r.employeeName,
                    r.employeePosition || 'N/A',
                    r.type,
                    r.location ? `${r.location.latitude},${r.location.longitude}` : 'N/A'
                ].join(','))
            ].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=attendance-${Date.now()}.csv`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                data: attendance
            });
        }
    } catch (error) {
        logger.error('Error exporting attendance data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to export attendance data',
            error: error.message 
        });
    }
});

module.exports = router;