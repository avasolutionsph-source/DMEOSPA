import mongoose from 'mongoose';

const shiftConfigurationSchema = new mongoose.Schema({
  // User context (branch owner)
  userId: {
    type: String,
    required: true,
    index: true,
    unique: true // One configuration per business
  },

  // Day shift default times
  dayShift: {
    startTime: {
      type: String,
      required: true,
      default: '09:00'
    },
    endTime: {
      type: String,
      required: true,
      default: '17:00'
    }
  },

  // Night shift default times
  nightShift: {
    startTime: {
      type: String,
      required: true,
      default: '18:00'
    },
    endTime: {
      type: String,
      required: true,
      default: '02:00'
    }
  }
}, {
  timestamps: true
});

// Validation middleware
shiftConfigurationSchema.pre('save', function(next) {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(this.dayShift.startTime)) {
    return next(new Error('Invalid day shift start time format. Use HH:MM format.'));
  }
  if (!timeRegex.test(this.dayShift.endTime)) {
    return next(new Error('Invalid day shift end time format. Use HH:MM format.'));
  }
  if (!timeRegex.test(this.nightShift.startTime)) {
    return next(new Error('Invalid night shift start time format. Use HH:MM format.'));
  }
  if (!timeRegex.test(this.nightShift.endTime)) {
    return next(new Error('Invalid night shift end time format. Use HH:MM format.'));
  }

  next();
});

export default mongoose.model('ShiftConfiguration', shiftConfigurationSchema);
