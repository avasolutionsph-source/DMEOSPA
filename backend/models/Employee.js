import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema({
  // User context (branch owner)
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Branch association for employee login
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      // Password required for employee login
      return this.role !== undefined;
    },
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Employee role (required only if has login/password)
  role: {
    type: String,
    enum: ['owner', 'manager', 'senior_therapist', 'junior_therapist', 'new_therapist', 'receptionist', 'other_staff'],
    required: false, // Optional for PWA-only employees without login
    index: true
  },
  
  // Room assignments for therapists
  assignedRooms: [{
    type: String,
    trim: true
  }],
  
  // Store the actual password for branch owner visibility
  viewablePassword: {
    type: String,
    select: false // Only show when explicitly requested by branch owner
  },
  
  // Temporary password tracking (deprecated - using viewablePassword now)
  temporaryPassword: {
    type: String,
    select: false
  },
  
  // Track if using temporary password
  isUsingTemporaryPassword: {
    type: Boolean,
    default: false
  },
  
  // Authentication tracking
  lastLogin: {
    type: Date
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
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
  
  // SSS Detailed Configuration
  sssContributionMethod: {
    type: String,
    enum: ['table-based', 'percentage', 'fixed-amount'],
    default: 'table-based'
  },
  sssEmployeeShareRate: {
    type: Number,
    min: 0,
    default: 4.5 // Standard employee share percentage or fixed amount
  },
  sssDeductionType: {
    type: String,
    enum: ['percentage', 'fixed-amount'],
    default: 'percentage'
  },
  
  // PhilHealth Detailed Configuration
  philHealthRate: {
    type: Number,
    min: 0,
    default: 2 // Standard 2% of salary or fixed amount
  },
  philHealthEmployeeShareRate: {
    type: Number,
    min: 0,
    default: 50 // Employee pays 50%, employer pays 50% or fixed amount
  },
  philHealthDeductionType: {
    type: String,
    enum: ['percentage', 'fixed-amount'],
    default: 'percentage'
  },
  philHealthEmployeeDeductionType: {
    type: String,
    enum: ['percentage', 'fixed-amount'],
    default: 'percentage'
  },
  
  // Pag-IBIG Detailed Configuration
  pagIbigRate: {
    type: Number,
    min: 0,
    default: 2 // Standard 2% of salary or fixed amount
  },
  pagIbigEmployeeContributionRate: {
    type: Number,
    min: 0,
    default: 1 // Standard 1% employee contribution or fixed amount
  },
  pagIbigDeductionType: {
    type: String,
    enum: ['percentage', 'fixed-amount'],
    default: 'percentage'
  },
  pagIbigEmployeeDeductionType: {
    type: String,
    enum: ['percentage', 'fixed-amount'],
    default: 'percentage'
  },
  
  // Tax Calculation Configuration
  taxCalculationMethod: {
    type: String,
    enum: ['bir-train-law', 'bir-old-law', 'custom'],
    default: 'bir-train-law'
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

// Pre-save middleware
employeeSchema.pre('save', async function(next) {
  // Set branchId to userId if not set (for backward compatibility)
  if (!this.branchId && this.userId) {
    this.branchId = this.userId;
  }
  
  // If password is set, role must also be set
  if (this.password && !this.role) {
    return next(new Error('Role is required when creating employee login'));
  }
  
  if (!this.isModified('password') || !this.password) return next();
  
  // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    // Password is already hashed, don't hash again
    return next();
  }
  
  // Store the viewable password before hashing
  this.viewablePassword = this.password;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method for employee login
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if employee has specific permission
employeeSchema.methods.hasPermission = function(permission) {
  const rolePermissions = {
    owner: ['*'],
    manager: ['read:*'],
    senior_therapist: ['read:own_appointments', 'write:own_appointments', 'read:own_attendance', 'read:own_payroll', 'read:assigned_rooms'],
    junior_therapist: ['read:own_appointments', 'write:own_appointments', 'read:own_attendance', 'read:own_payroll', 'read:assigned_rooms'],
    new_therapist: ['read:own_appointments', 'write:own_appointments', 'read:own_attendance', 'read:own_payroll', 'read:assigned_rooms'],
    receptionist: ['read:pos', 'write:pos', 'read:inventory', 'write:inventory', 'read:customers', 'write:customers', 'read:attendance', 'write:attendance', 'read:payroll', 'read:rooms', 'read:expenses', 'write:expenses'],
    other_staff: ['read:own_attendance', 'write:own_attendance', 'read:own_payroll']
  };
  
  const permissions = rolePermissions[this.role] || [];
  if (permissions.includes('*')) return true;
  if (permissions.includes(`${permission.split(':')[0]}:*`)) return true;
  return permissions.includes(permission);
};

// Indexes for performance and uniqueness
employeeSchema.index({ userId: 1, isActive: 1 });
employeeSchema.index({ branchId: 1, role: 1 });
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

// Email unique per branch (for employee login)
employeeSchema.index(
  { branchId: 1, email: 1 }, 
  { 
    unique: true, 
    sparse: true,
    name: 'unique_employee_email_per_branch',
    partialFilterExpression: { 
      email: { $exists: true, $ne: null, $ne: "" }
    }
  }
);

// Additional compound index for common queries
employeeSchema.index({ userId: 1, firstName: 1, lastName: 1, isActive: 1 });

export default mongoose.model('Employee', employeeSchema);
