import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  // Client information
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make optional for guest bookings
  },
  clientName: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  clientPhone: {
    type: String,
    required: true
  },
  
  // Branch information
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // References branch user
    required: true
  },
  branchName: {
    type: String,
    required: true
  },
  
  // Service information
  serviceId: {
    type: String,
    required: true // PWA product/service ID
  },
  serviceName: {
    type: String,
    required: true
  },
  serviceDuration: {
    type: Number, // Duration in minutes
    required: true
  },
  servicePrice: {
    type: Number,
    required: true
  },
  serviceCategory: {
    type: String,
    required: true
  },
  serviceDescription: String,
  
  // Therapist/Staff information
  therapistId: {
    type: String,
    required: true // PWA employee ID
  },
  therapistName: {
    type: String,
    required: true
  },
  
  // Appointment details
  appointmentDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // Format: "HH:MM" (24-hour)
    required: true
  },
  endTime: {
    type: String, // Calculated from startTime + duration
    required: false // Will be calculated automatically
  },
  
  // Service location
  serviceLocation: {
    type: String,
    enum: ['in-spa', 'home-service'],
    required: true
  },
  
  // Home service address (if applicable)
  homeAddress: {
    street: String,
    city: String,
    province: String,
    zipCode: String,
    landmarks: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Booking status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  
  // Payment information (for future use)
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'gcash', 'maya', 'bank-transfer'],
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    amount: Number,
    paidAt: Date,
    transactionId: String
  },
  
  // Special requests/notes
  specialRequests: {
    type: String,
    trim: true
  },
  
  // Admin notes
  adminNotes: {
    type: String,
    trim: true
  },
  
  // Cancellation info
  cancellationReason: String,
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Booking metadata
  bookingSource: {
    type: String,
    enum: ['website', 'mobile-app', 'phone', 'walk-in'],
    default: 'website'
  },
  
  // Reminders sent
  remindersSent: [{
    type: {
      type: String,
      enum: ['sms', 'email', 'push']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }],
  
  // Rating and feedback (post-service)
  rating: {
    overall: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    therapist: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    feedback: String,
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
bookingSchema.index({ clientId: 1, createdAt: -1 });
bookingSchema.index({ branchId: 1, appointmentDate: 1, startTime: 1 });
bookingSchema.index({ therapistId: 1, appointmentDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ appointmentDate: 1, status: 1 });

// Compound unique index to prevent double bookings at database level
bookingSchema.index(
  { 
    therapistId: 1, 
    appointmentDate: 1, 
    startTime: 1,
    status: 1
  }, 
  { 
    unique: true,
    partialFilterExpression: { 
      status: { $in: ['pending', 'confirmed', 'in-progress'] } 
    },
    name: 'prevent_double_bookings'
  }
);

// Virtual for full client address
bookingSchema.virtual('fullAddress').get(function() {
  if (this.serviceLocation === 'in-spa') return 'In-Spa Service';
  if (!this.homeAddress) return 'Address not provided';
  
  const addr = this.homeAddress;
  return `${addr.street}, ${addr.city}, ${addr.province} ${addr.zipCode}`;
});

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const appointmentDateTime = new Date(`${this.appointmentDate.toDateString()} ${this.startTime}`);
  const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
  
  // Allow cancellation if more than 2 hours before appointment
  return hoursUntilAppointment > 2 && ['pending', 'confirmed'].includes(this.status);
};

// Method to get booking duration in hours
bookingSchema.methods.getDurationHours = function() {
  return this.serviceDuration / 60;
};

// Static method to check therapist availability
bookingSchema.statics.isTherapistAvailable = async function(therapistId, date, startTime, duration, excludeBookingId = null) {
  const endTime = this.calculateEndTime(startTime, duration);
  
  const query = {
    therapistId,
    appointmentDate: date,
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    $or: [
      // New booking starts during existing booking
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      // New booking ends during existing booking
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      // New booking encompasses existing booking
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  const conflictingBooking = await this.findOne(query);
  return !conflictingBooking;
};

// Static method to calculate end time
bookingSchema.statics.calculateEndTime = function(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
};

export default mongoose.model('Booking', bookingSchema);