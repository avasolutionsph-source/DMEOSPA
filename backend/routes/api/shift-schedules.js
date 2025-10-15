import express from 'express';
import ShiftSchedule from '../../models/ShiftSchedule.js';
import Employee from '../../models/Employee.js';
import BaseRouteHandler from '../../utils/base-route-handler.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Middleware to ensure only managers, owners, branch users, and admins can access shift schedules
const requireManagerOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Check if user is manager, owner, branch user, or admin
  const userRole = req.user.role;
  if (!['owner', 'manager', 'branch', 'admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Only business users can manage shift schedules.',
      receivedRole: userRole // Help debug role issues
    });
  }

  next();
};

// Get all shift schedules for the branch
router.get('/', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const { page = 1, limit = 50, employeeId, isActive = true } = req.query;
  
  // Build query
  let query = {
    userId: req.user.id || req.user._id
  };
  
  if (employeeId) {
    query.employeeId = employeeId;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [schedules, total] = await Promise.all([
    ShiftSchedule.find(query)
      .populate('employeeId', 'firstName lastName position role email')
      .sort({ effectiveDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    ShiftSchedule.countDocuments(query)
  ]);
  
  logger.info(`Retrieved ${schedules.length} shift schedules`, {
    category: 'DATABASE',
    operation: 'get_shift_schedules',
    data: { count: schedules.length, userId: req.user.id }
  });
  
  res.json({
    success: true,
    data: schedules,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// Get shift schedule for a specific employee
router.get('/employee/:employeeId', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const { employeeId } = req.params;
  
  // Verify employee belongs to this branch
  const employee = await Employee.findOne({
    _id: employeeId,
    userId: req.user.id || req.user._id
  });
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      error: 'Employee not found'
    });
  }
  
  const schedule = await ShiftSchedule.findOne({
    employeeId,
    userId: req.user.id || req.user._id,
    isActive: true
  }).populate('employeeId', 'firstName lastName position role email');
  
  logger.info(`Retrieved shift schedule for employee: ${employeeId}`, {
    category: 'DATABASE',
    operation: 'get_employee_shift_schedule',
    data: { employeeId, hasSchedule: !!schedule }
  });
  
  res.json({
    success: true,
    data: schedule,
    message: schedule ? 'Shift schedule retrieved successfully' : 'No active shift schedule found for this employee'
  });
}));

// Create new shift schedule
router.post('/', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const { employeeId, weeklySchedule, effectiveDate, notes } = req.body;
  
  // Validate required fields
  if (!employeeId || !weeklySchedule) {
    return res.status(400).json({
      success: false,
      error: 'Employee ID and weekly schedule are required'
    });
  }
  
  // Verify employee belongs to this branch
  const employee = await Employee.findOne({
    _id: employeeId,
    userId: req.user.id || req.user._id
  });
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      error: 'Employee not found'
    });
  }
  
  // Check if employee already has an active schedule
  const existingSchedule = await ShiftSchedule.findOne({
    employeeId,
    userId: req.user.id || req.user._id,
    isActive: true
  });
  
  if (existingSchedule) {
    // Deactivate existing schedule
    existingSchedule.isActive = false;
    existingSchedule.syncStatus = 'pending';
    await existingSchedule.save();
  }
  
  // Create new schedule
  const schedule = new ShiftSchedule({
    userId: req.user.id || req.user._id,
    employeeId,
    weeklySchedule,
    effectiveDate: effectiveDate || new Date(),
    notes: notes || '',
    createdBy: req.user.id || req.user._id,
    isActive: true
  });
  
  await schedule.save();
  
  // Populate employee data for response
  await schedule.populate('employeeId', 'firstName lastName position role email');
  
  logger.info(`Created shift schedule for employee: ${employeeId}`, {
    category: 'DATABASE',
    operation: 'create_shift_schedule',
    data: { 
      employeeId, 
      scheduleId: schedule._id,
      createdBy: req.user.id 
    }
  });
  
  res.status(201).json({
    success: true,
    data: schedule,
    message: 'Shift schedule created successfully'
  });
}));

// Update existing shift schedule
router.put('/:id', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const { weeklySchedule, effectiveDate, notes, isActive } = req.body;
  
  const schedule = await ShiftSchedule.findOne({
    _id: id,
    userId: req.user.id || req.user._id
  });
  
  if (!schedule) {
    return res.status(404).json({
      success: false,
      error: 'Shift schedule not found'
    });
  }
  
  // Update fields
  if (weeklySchedule) schedule.weeklySchedule = weeklySchedule;
  if (effectiveDate) schedule.effectiveDate = effectiveDate;
  if (notes !== undefined) schedule.notes = notes;
  if (isActive !== undefined) schedule.isActive = isActive;
  
  schedule.syncStatus = 'pending';
  
  await schedule.save();
  await schedule.populate('employeeId', 'firstName lastName position role email');
  
  logger.info(`Updated shift schedule: ${id}`, {
    category: 'DATABASE',
    operation: 'update_shift_schedule',
    data: { scheduleId: id, updatedBy: req.user.id }
  });
  
  res.json({
    success: true,
    data: schedule,
    message: 'Shift schedule updated successfully'
  });
}));

// Delete shift schedule
router.delete('/:id', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const { id } = req.params;
  
  const schedule = await ShiftSchedule.findOneAndDelete({
    _id: id,
    userId: req.user.id || req.user._id
  });
  
  if (!schedule) {
    return res.status(404).json({
      success: false,
      error: 'Shift schedule not found'
    });
  }
  
  logger.info(`Deleted shift schedule: ${id}`, {
    category: 'DATABASE',
    operation: 'delete_shift_schedule',
    data: { scheduleId: id, deletedBy: req.user.id }
  });
  
  res.json({
    success: true,
    message: 'Shift schedule deleted successfully'
  });
}));

// Get shift schedule templates (common patterns)
router.get('/templates', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const templates = [
    {
      name: 'Monday-Friday Day Shift',
      description: '9 AM to 5 PM, Monday through Friday',
      schedule: {
        monday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        tuesday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        wednesday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        thursday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        friday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        saturday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
        sunday: { shift: 'off', startTime: '09:00', endTime: '17:00' }
      }
    },
    {
      name: 'Monday-Friday Night Shift',
      description: '6 PM to 2 AM, Monday through Friday',
      schedule: {
        monday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
        tuesday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
        wednesday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
        thursday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
        friday: { shift: 'night', startTime: '18:00', endTime: '02:00' },
        saturday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
        sunday: { shift: 'off', startTime: '09:00', endTime: '17:00' }
      }
    },
    {
      name: 'Weekend Shifts',
      description: 'Saturday and Sunday day shifts',
      schedule: {
        monday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
        tuesday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
        wednesday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
        thursday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
        friday: { shift: 'off', startTime: '09:00', endTime: '17:00' },
        saturday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        sunday: { shift: 'day', startTime: '09:00', endTime: '17:00' }
      }
    },
    {
      name: 'Full Week Day Shift',
      description: '7 days a week, day shift',
      schedule: {
        monday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        tuesday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        wednesday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        thursday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        friday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        saturday: { shift: 'day', startTime: '09:00', endTime: '17:00' },
        sunday: { shift: 'day', startTime: '09:00', endTime: '17:00' }
      }
    }
  ];
  
  res.json({
    success: true,
    data: templates,
    message: 'Shift schedule templates retrieved successfully'
  });
}));

// Get shift schedule analytics/summary
router.get('/analytics', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const userId = req.user.id || req.user._id;
  
  // Get all active schedules
  const schedules = await ShiftSchedule.find({
    userId,
    isActive: true
  }).populate('employeeId', 'firstName lastName position role');
  
  // Calculate analytics
  const analytics = {
    totalEmployeesScheduled: schedules.length,
    shiftDistribution: {
      day: 0,
      night: 0,
      off: 0
    },
    dailyCoverage: {
      monday: { day: 0, night: 0, off: 0 },
      tuesday: { day: 0, night: 0, off: 0 },
      wednesday: { day: 0, night: 0, off: 0 },
      thursday: { day: 0, night: 0, off: 0 },
      friday: { day: 0, night: 0, off: 0 },
      saturday: { day: 0, night: 0, off: 0 },
      sunday: { day: 0, night: 0, off: 0 }
    }
  };
  
  // Calculate statistics
  schedules.forEach(schedule => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      const shift = schedule.weeklySchedule[day].shift;
      analytics.dailyCoverage[day][shift]++;
      analytics.shiftDistribution[shift]++;
    });
  });
  
  res.json({
    success: true,
    data: analytics,
    message: 'Shift schedule analytics retrieved successfully'
  });
}));

export default router;