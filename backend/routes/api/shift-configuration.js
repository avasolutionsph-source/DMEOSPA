import express from 'express';
import ShiftConfiguration from '../../models/ShiftConfiguration.js';
import { withErrorHandling } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Middleware to ensure only managers, owners, and branch users can access
const requireManagerOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userRole = req.user.role;
  // Accept owner, manager, branch, and admin roles
  if (!['owner', 'manager', 'branch', 'admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Only business users can manage shift configurations.',
      receivedRole: userRole // Help debug role issues
    });
  }

  next();
};

// Get shift configuration for current business
router.get('/', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const userId = req.user.id || req.user._id;

  let config = await ShiftConfiguration.findOne({ userId });

  // If no configuration exists, create default one
  if (!config) {
    config = new ShiftConfiguration({
      userId,
      dayShift: {
        startTime: '09:00',
        endTime: '17:00'
      },
      nightShift: {
        startTime: '18:00',
        endTime: '02:00'
      }
    });
    await config.save();

    logger.info('Created default shift configuration', {
      category: 'DATABASE',
      operation: 'create_shift_configuration',
      data: { userId }
    });
  }

  res.json({
    success: true,
    data: config,
    message: 'Shift configuration retrieved successfully'
  });
}));

// Update shift configuration
router.put('/', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { dayShift, nightShift } = req.body;

  // Validate required fields
  if (!dayShift || !nightShift) {
    return res.status(400).json({
      success: false,
      error: 'Both day shift and night shift configurations are required'
    });
  }

  if (!dayShift.startTime || !dayShift.endTime) {
    return res.status(400).json({
      success: false,
      error: 'Day shift start time and end time are required'
    });
  }

  if (!nightShift.startTime || !nightShift.endTime) {
    return res.status(400).json({
      success: false,
      error: 'Night shift start time and end time are required'
    });
  }

  // Find existing config or create new one
  let config = await ShiftConfiguration.findOne({ userId });

  if (config) {
    // Update existing configuration
    config.dayShift = dayShift;
    config.nightShift = nightShift;
    await config.save();

    logger.info('Updated shift configuration', {
      category: 'DATABASE',
      operation: 'update_shift_configuration',
      data: { userId }
    });
  } else {
    // Create new configuration
    config = new ShiftConfiguration({
      userId,
      dayShift,
      nightShift
    });
    await config.save();

    logger.info('Created shift configuration', {
      category: 'DATABASE',
      operation: 'create_shift_configuration',
      data: { userId }
    });
  }

  res.json({
    success: true,
    data: config,
    message: 'Shift configuration updated successfully'
  });
}));

// Reset to default configuration
router.post('/reset', requireManagerOrOwner, withErrorHandling(async (req, res) => {
  const userId = req.user.id || req.user._id;

  let config = await ShiftConfiguration.findOne({ userId });

  if (!config) {
    config = new ShiftConfiguration({ userId });
  }

  // Reset to defaults
  config.dayShift = {
    startTime: '09:00',
    endTime: '17:00'
  };
  config.nightShift = {
    startTime: '18:00',
    endTime: '02:00'
  };

  await config.save();

  logger.info('Reset shift configuration to defaults', {
    category: 'DATABASE',
    operation: 'reset_shift_configuration',
    data: { userId }
  });

  res.json({
    success: true,
    data: config,
    message: 'Shift configuration reset to defaults'
  });
}));

export default router;
