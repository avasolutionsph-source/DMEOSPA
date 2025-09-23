import mongoose from 'mongoose';

const payrollRequestSchema = new mongoose.Schema({
  // User context (business owner)
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Employee who submitted the request
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  
  // Employee details (denormalized for performance)
  employeeName: {
    type: String,
    required: true
  },
  
  // Request type
  type: {
    type: String,
    required: true,
    enum: ['leave', 'overtime', 'payroll'],
    index: true
  },
  
  // Request status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Request details (flexible for different types)
  details: {
    // For leave requests
    startDate: Date,
    endDate: Date,
    leaveType: String, // sick, vacation, emergency, personal
    
    // For overtime requests
    date: Date,
    startTime: String,
    endTime: String,
    
    // For payroll requests
    requestType: String, // advance, final, adjustment, reimbursement
    amount: Number,
    
    // Common fields
    reason: String,
    details: String
  },
  
  // Manager approval details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedByName: String,
  approvalDate: Date,
  managerNotes: String,
  
  // Sync metadata
  localId: String,
  lastSyncDate: {
    type: Date,
    default: Date.now
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
payrollRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
payrollRequestSchema.index({ employeeId: 1, createdAt: -1 });
payrollRequestSchema.index({ userId: 1, type: 1, status: 1 });

// Virtual for formatted dates
payrollRequestSchema.virtual('formattedDates').get(function() {
  if (this.type === 'leave' && this.details.startDate && this.details.endDate) {
    return `${new Date(this.details.startDate).toLocaleDateString()} - ${new Date(this.details.endDate).toLocaleDateString()}`;
  }
  if (this.type === 'overtime' && this.details.date) {
    return new Date(this.details.date).toLocaleDateString();
  }
  return '';
});

// Pre-save middleware
payrollRequestSchema.pre('save', function(next) {
  // Update sync date
  this.lastSyncDate = new Date();
  
  // If approving, set approval date
  if (this.isModified('status') && this.status === 'approved' && !this.approvalDate) {
    this.approvalDate = new Date();
  }
  
  next();
});

// Methods
payrollRequestSchema.methods.approve = function(managerId, managerName, notes) {
  this.status = 'approved';
  this.approvedBy = managerId;
  this.approvedByName = managerName;
  this.approvalDate = new Date();
  this.managerNotes = notes;
  return this.save();
};

payrollRequestSchema.methods.reject = function(managerId, managerName, notes) {
  this.status = 'rejected';
  this.approvedBy = managerId;
  this.approvedByName = managerName;
  this.approvalDate = new Date();
  this.managerNotes = notes;
  return this.save();
};

// Static methods
payrollRequestSchema.statics.getEmployeeRequests = async function(employeeId, filters = {}) {
  const query = {
    employeeId,
    isDeleted: false,
    ...filters
  };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .lean();
};

payrollRequestSchema.statics.getManagerView = async function(userId, filters = {}) {
  const query = {
    userId,
    isDeleted: false,
    ...filters
  };
  
  return this.find(query)
    .populate('employeeId', 'firstName lastName position')
    .sort({ createdAt: -1 })
    .lean();
};

const PayrollRequest = mongoose.model('PayrollRequest', payrollRequestSchema);

export default PayrollRequest;