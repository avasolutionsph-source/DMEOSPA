import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  // User context
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Local ID for sync purposes
  localId: {
    type: String,
    sparse: true // Allow multiple null values, but unique when present
  },
  
  // Personal info
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Employment details
  position: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  hireDate: {
    type: Date
  },
  
  // Commission settings
  commissionRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  commissionType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  
  // Salary and payroll information
  salaryType: {
    type: String,
    enum: ['daily', 'monthly', 'hourly'],
    default: 'daily'
  },
  
  // Salary rates
  dailyRate: {
    type: Number,
    min: 0,
    default: 500 // PHP 500 default daily rate
  },
  monthlyRate: {
    type: Number,
    min: 0,
    default: 15000 // PHP 15,000 default monthly rate
  },
  hourlyRate: {
    type: Number,
    min: 0,
    default: 62.50 // Current PHP minimum wage per hour
  },
  
  // Additional compensation
  allowances: {
    type: Number,
    min: 0,
    default: 0
  },
  regularDeductions: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Tax and government deduction settings
  taxExempt: {
    type: Boolean,
    default: false
  },
  
  // Government benefits enrollment status
  hasSSS: {
    type: Boolean,
    default: false
  },
  hasPhilHealth: {
    type: Boolean,
    default: false
  },
  hasPagibig: {
    type: Boolean,
    default: false
  },
  
  // Government identification numbers
  sssNumber: {
    type: String,
    trim: true
  },
  philHealthNumber: {
    type: String,
    trim: true
  },
  pagIbigNumber: {
    type: String,
    trim: true
  },
  tinNumber: {
    type: String,
    trim: true
  },
  
  // Employment status affecting payroll
  employmentStatus: {
    type: String,
    enum: ['regular', 'probationary', 'contractual', 'part-time'],
    default: 'regular'
  },
  
  // Banking information for payroll
  bankAccount: {
    bankName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    accountName: {
      type: String,
      trim: true
    }
  },
  
  // Performance tracking
  totalSales: {
    type: Number,
    min: 0,
    default: 0
  },
  totalCommission: {
    type: Number,
    min: 0,
    default: 0
  },
  totalTransactions: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Status
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

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for performance and uniqueness
employeeSchema.index({ userId: 1, isActive: 1 });
employeeSchema.index({ userId: 1, localId: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { localId: { $exists: true, $ne: null } }
});
employeeSchema.index({ syncStatus: 1 });
employeeSchema.index({ userId: 1, totalSales: -1 }); // For performance ranking

// CRITICAL: Unique constraints to prevent employee duplicates
employeeSchema.index(
  { userId: 1, firstName: 1, lastName: 1 }, 
  { 
    unique: true,
    name: 'unique_employee_name_per_user',
    partialFilterExpression: { 
      isActive: true,
      firstName: { $exists: true, $ne: "" },
      lastName: { $exists: true, $ne: "" }
    }
  }
);

employeeSchema.index(
  { userId: 1, email: 1 }, 
  { 
    unique: true, 
    sparse: true,
    name: 'unique_employee_email_per_user',
    partialFilterExpression: { 
      email: { $exists: true, $ne: null, $ne: "" }
    }
  }
);

// Additional compound index for common queries
employeeSchema.index({ userId: 1, firstName: 1, lastName: 1, isActive: 1 });

export default mongoose.model('Employee', employeeSchema);
