import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  // User context
  userId: {
    type: String,
    required: true,
    index: true
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

// Indexes
employeeSchema.index({ userId: 1, firstName: 1, lastName: 1 });
employeeSchema.index({ userId: 1, isActive: 1 });
employeeSchema.index({ syncStatus: 1 });

export default mongoose.model('Employee', employeeSchema);
