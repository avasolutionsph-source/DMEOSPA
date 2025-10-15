/**
 * Payroll-Schedule Integration Service
 * Calculates schedule-based payroll information for employees
 */

import ShiftSchedule from '../models/ShiftSchedule.js';
import logger from '../utils/logger.js';

/**
 * Get employee's schedule summary for a payroll period
 * @param {String} userId - Business user ID
 * @param {String} employeeId - Employee ID
 * @param {Date} periodStart - Start of payroll period
 * @param {Date} periodEnd - End of payroll period
 * @returns {Object} Schedule summary with calculated hours and shifts
 */
export async function getEmployeeScheduleSummary(userId, employeeId, periodStart, periodEnd) {
  try {
    // Find active schedule for employee
    const schedule = await ShiftSchedule.findOne({
      userId,
      employeeId,
      isActive: true,
      effectiveDate: { $lte: periodEnd }
    }).sort({ effectiveDate: -1 }).lean();

    if (!schedule) {
      logger.warn('No active schedule found for employee', {
        userId,
        employeeId,
        periodStart,
        periodEnd
      });

      return {
        hasSchedule: false,
        scheduledDaysInPeriod: 0,
        scheduledHoursInPeriod: 0,
        dayShiftDays: 0,
        nightShiftDays: 0,
        shiftType: 'none',
        weeklySchedule: null,
        scheduleId: null
      };
    }

    // Calculate schedule info for the period
    const scheduleInfo = calculateScheduleForPeriod(
      schedule.weeklySchedule,
      periodStart,
      periodEnd
    );

    return {
      hasSchedule: true,
      scheduleId: schedule._id,
      scheduledDaysInPeriod: scheduleInfo.totalScheduledDays,
      scheduledHoursInPeriod: scheduleInfo.totalScheduledHours,
      dayShiftDays: scheduleInfo.dayShiftDays,
      nightShiftDays: scheduleInfo.nightShiftDays,
      shiftType: scheduleInfo.primaryShiftType,
      weeklySchedule: schedule.weeklySchedule,
      effectiveDate: schedule.effectiveDate
    };

  } catch (error) {
    logger.error('Error getting employee schedule summary', {
      error: error.message,
      userId,
      employeeId
    });
    throw error;
  }
}

/**
 * Calculate schedule statistics for a specific period
 * @param {Object} weeklySchedule - Employee's weekly schedule
 * @param {Date} periodStart - Period start date
 * @param {Date} periodEnd - Period end date
 * @returns {Object} Calculated schedule statistics
 */
function calculateScheduleForPeriod(weeklySchedule, periodStart, periodEnd) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  let totalScheduledDays = 0;
  let totalScheduledHours = 0;
  let dayShiftDays = 0;
  let nightShiftDays = 0;

  // Iterate through each day in the period
  const currentDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayName = dayNames[dayOfWeek];
    const daySchedule = weeklySchedule[dayName];

    if (daySchedule && daySchedule.shift !== 'off') {
      totalScheduledDays++;

      // Calculate hours for this shift
      const hours = calculateShiftHours(daySchedule.startTime, daySchedule.endTime);
      totalScheduledHours += hours;

      // Count shift types
      if (daySchedule.shift === 'day') {
        dayShiftDays++;
      } else if (daySchedule.shift === 'night') {
        nightShiftDays++;
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Determine primary shift type
  let primaryShiftType = 'none';
  if (dayShiftDays > 0 && nightShiftDays > 0) {
    primaryShiftType = 'mixed';
  } else if (dayShiftDays > 0) {
    primaryShiftType = 'day';
  } else if (nightShiftDays > 0) {
    primaryShiftType = 'night';
  }

  return {
    totalScheduledDays,
    totalScheduledHours,
    dayShiftDays,
    nightShiftDays,
    primaryShiftType
  };
}

/**
 * Calculate hours between two times (handles overnight shifts)
 * @param {String} startTime - Start time in HH:MM format
 * @param {String} endTime - End time in HH:MM format
 * @returns {Number} Hours between start and end
 */
function calculateShiftHours(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // Handle overnight shift (e.g., 22:00 to 06:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours
  }

  const totalMinutes = endMinutes - startMinutes;
  return totalMinutes / 60; // Convert to hours
}

/**
 * Calculate schedule utilization (percentage of scheduled shifts worked)
 * @param {Number} scheduledDays - Total scheduled days
 * @param {Number} workedDays - Actual days worked
 * @returns {Number} Utilization percentage (0-100)
 */
export function calculateScheduleUtilization(scheduledDays, workedDays) {
  if (scheduledDays === 0) return 0;
  const utilization = (workedDays / scheduledDays) * 100;
  return Math.min(Math.round(utilization * 10) / 10, 100); // Round to 1 decimal, max 100
}

/**
 * Calculate prorated deduction based on schedule
 * @param {Number} fullTimeAmount - Full-time deduction amount
 * @param {Number} scheduledHours - Scheduled hours in period
 * @param {Number} fullTimeHours - Full-time hours (default 160/month)
 * @returns {Number} Prorated deduction amount
 */
export function calculateProratedDeduction(fullTimeAmount, scheduledHours, fullTimeHours = 160) {
  if (scheduledHours >= fullTimeHours) {
    return fullTimeAmount; // Full deduction
  }

  const ratio = scheduledHours / fullTimeHours;
  return fullTimeAmount * ratio;
}

/**
 * Validate if employee has schedule for payroll period
 * @param {String} userId - Business user ID
 * @param {String} employeeId - Employee ID
 * @param {Date} periodStart - Period start
 * @param {Date} periodEnd - Period end
 * @returns {Object} Validation result
 */
export async function validateEmployeeSchedule(userId, employeeId, periodStart, periodEnd) {
  const summary = await getEmployeeScheduleSummary(userId, employeeId, periodStart, periodEnd);

  const warnings = [];
  const errors = [];

  if (!summary.hasSchedule) {
    errors.push('Employee has no active shift schedule');
  }

  if (summary.scheduledDaysInPeriod === 0) {
    warnings.push('Employee has zero scheduled work days in this period');
  }

  if (summary.scheduledHoursInPeriod === 0) {
    warnings.push('Employee has zero scheduled hours in this period');
  }

  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
    summary
  };
}

export default {
  getEmployeeScheduleSummary,
  calculateScheduleUtilization,
  calculateProratedDeduction,
  validateEmployeeSchedule
};
