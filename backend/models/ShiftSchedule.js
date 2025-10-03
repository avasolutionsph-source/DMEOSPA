import mongoose from 'mongoose';

const shiftScheduleSchema = new mongoose.Schema({
  // User context (branch owner)
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Employee reference
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  
  // Weekly schedule configuration
  weeklySchedule: {
    monday: {
      shift: {
        type: String,
        enum: ['day', 'night', 'off'],
        default: 'off'
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    tuesday: {
      shift: {
        type: String,
        enum: ['day', 'night', 'off'],
        default: 'off'
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    wednesday: {
      shift: {
        type: String,
        enum: ['day', 'night', 'off'],
        default: 'off'
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    thursday: {
      shift: {
        type: String,
        enum: ['day', 'night', 'off'],
        default: 'off'
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    friday: {
      shift: {
        type: String,
        enum: ['day', 'night', 'off'],
        default: 'off'
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    saturday: {
      shift: {
        type: String,
        enum: ['day', 'night', 'off'],
        default: 'off'
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    },
    sunday: {
      shift: {
        type: String,
        enum: ['day', 'night', 'off'],
        default: 'off'
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      }
    }
  },
  
  // When this schedule becomes effective
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  
  // Optional notes for the schedule
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Who created this schedule (manager/owner)
  createdBy: {
    type: String,
    required: true
  },
  
  // Status tracking
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Sync metadata
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'error'],
    default: 'synced'
  },
  lastSyncDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Validation middleware
shiftScheduleSchema.pre('save', function(next) {
  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    const daySchedule = this.weeklySchedule[day];
    
    // Skip validation if shift is 'off'
    if (daySchedule.shift === 'off') {
      continue;
    }
    
    // Validate start time format
    if (!timeRegex.test(daySchedule.startTime)) {
      return next(new Error(`Invalid start time format for ${day}. Use HH:MM format.`));
    }
    
    // Validate end time format
    if (!timeRegex.test(daySchedule.endTime)) {
      return next(new Error(`Invalid end time format for ${day}. Use HH:MM format.`));
    }
    
    // Validate that end time is after start time
    const startMinutes = this.timeToMinutes(daySchedule.startTime);
    const endMinutes = this.timeToMinutes(daySchedule.endTime);
    
    if (endMinutes <= startMinutes) {
      return next(new Error(`End time must be after start time for ${day}.`));
    }
  }
  
  next();
});

// Helper method to convert time string to minutes
shiftScheduleSchema.methods.timeToMinutes = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Method to get formatted schedule for display
shiftScheduleSchema.methods.getFormattedSchedule = function() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const formatted = {};
  
  days.forEach(day => {
    const daySchedule = this.weeklySchedule[day];
    if (daySchedule.shift === 'off') {
      formatted[day] = 'Off';
    } else {
      const shiftType = daySchedule.shift === 'day' ? 'Day' : 'Night';
      formatted[day] = `${shiftType} (${daySchedule.startTime}-${daySchedule.endTime})`;
    }
  });
  
  return formatted;
};

// Method to check for schedule conflicts
shiftScheduleSchema.methods.hasConflictWith = function(otherSchedule) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    const thisDay = this.weeklySchedule[day];
    const otherDay = otherSchedule.weeklySchedule[day];
    
    // Skip if either is off
    if (thisDay.shift === 'off' || otherDay.shift === 'off') {
      continue;
    }
    
    // Check for time overlap
    const thisStart = this.timeToMinutes(thisDay.startTime);
    const thisEnd = this.timeToMinutes(thisDay.endTime);
    const otherStart = this.timeToMinutes(otherDay.startTime);
    const otherEnd = this.timeToMinutes(otherDay.endTime);
    
    // Check if times overlap
    if (thisStart < otherEnd && thisEnd > otherStart) {
      return { hasConflict: true, day, conflictType: 'time_overlap' };
    }
  }
  
  return { hasConflict: false };
};

// Indexes for performance
shiftScheduleSchema.index({ userId: 1, employeeId: 1 });
shiftScheduleSchema.index({ userId: 1, isActive: 1 });
shiftScheduleSchema.index({ employeeId: 1, effectiveDate: -1 });
shiftScheduleSchema.index({ syncStatus: 1 });

// Ensure one active schedule per employee
shiftScheduleSchema.index(
  { userId: 1, employeeId: 1, isActive: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

export default mongoose.model('ShiftSchedule', shiftScheduleSchema);