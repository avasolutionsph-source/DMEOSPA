import mongoose from 'mongoose';

const payrollRecordSchema = new mongoose.Schema({
  // User and Employee identification
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },

  // Pay period information
  periodStart: {
    type: Date,
    required: true
  },

  periodEnd: {
    type: Date,
    required: true
  },

  payrollType: {
    type: String,
    enum: ['monthly', 'biweekly', 'weekly'],
    default: 'monthly'
  },

  // Earnings breakdown
  basePay: {
    type: Number,
    required: true,
    min: 0
  },

  overtimePay: {
    type: Number,
    default: 0,
    min: 0
  },

  holidayPay: {
    type: Number,
    default: 0,
    min: 0
  },

  nightDifferential: {
    type: Number,
    default: 0,
    min: 0
  },

  totalAllowances: {
    type: Number,
    default: 0,
    min: 0
  },

  commission: {
    type: Number,
    default: 0,
    min: 0
  },

  tips: {
    type: Number,
    default: 0,
    min: 0
  },

  grossPay: {
    type: Number,
    required: true,
    min: 0
  },

  // Deductions (Philippine labor law compliance)
  deductions: {
    sss: {
      type: Number,
      min: 0,
      default: 0
    },
    philHealth: {
      type: Number,
      min: 0,
      default: 0
    },
    pagIbig: {
      type: Number,
      min: 0,
      default: 0
    },
    withholdingTax: {
      type: Number,
      min: 0,
      default: 0
    },
    loanDeductions: {
      type: Number,
      min: 0,
      default: 0
    },
    otherDeductions: {
      type: Number,
      min: 0,
      default: 0
    }
  },

  totalDeductions: {
    type: Number,
    required: true,
    min: 0
  },

  // Final pay amount
  netPay: {
    type: Number,
    required: true,
    min: 0
  },

  // LEAN Attendance data - ONLY essential calculations (no videos/photos/GPS)
  attendanceData: {
    totalDaysWorked: {
      type: Number,
      default: 0
    },
    totalRegularHours: {
      type: Number,
      default: 0
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    nightDifferentialHours: {
      type: Number,
      default: 0
    },
    holidayHours: {
      type: Number,
      default: 0
    },
    lateMinutes: {
      type: Number,
      default: 0
    },
    earlyDepartureMinutes: {
      type: Number,
      default: 0
    },
    deductedHours: {
      type: Number,
      default: 0,
      comment: "Hours deducted for early departures (rounded up)"
    },
    attendanceDays: [{
      date: String, // YYYY-MM-DD format only
      hoursWorked: Number,
      isHoliday: Boolean,
      isOvertime: Boolean,
      lateMinutes: Number,
      earlyDepartureMinutes: Number
      // NO video, photo, GPS, or binary data
    }]
  },

  // Status and processing information
  status: {
    type: String,
    enum: ['draft', 'processed', 'paid', 'cancelled'],
    default: 'processed'
  },

  processedBy: {
    type: String,
    required: true
  },

  processedAt: {
    type: Date,
    default: Date.now
  },

  paidAt: {
    type: Date
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'check', 'gcash', 'paymaya'],
    default: 'cash'
  },

  notes: {
    type: String,
    maxlength: 1000
  },

  // Audit trail
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  lastSyncDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, employeeId: 1 },
    { periodStart: -1 },
    { status: 1 },
    { processedAt: -1 }
  ]
});

// Compound index for preventing duplicate payroll records
payrollRecordSchema.index(
  { userId: 1, employeeId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true }
);

// Virtual for pay period display
payrollRecordSchema.virtual('payPeriod').get(function() {
  return `${this.periodStart.toLocaleDateString()} - ${this.periodEnd.toLocaleDateString()}`;
});

// Pre-save middleware to update timestamps
payrollRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastSyncDate = new Date();
  next();
});

// Pre-update middleware
payrollRecordSchema.pre('findOneAndUpdate', function(next) {
  this.set({ 
    updatedAt: new Date(),
    lastSyncDate: new Date()
  });
  next();
});

export default mongoose.model('PayrollRecord', payrollRecordSchema);