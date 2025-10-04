import mongoose from 'mongoose';

const cashDrawerSessionSchema = new mongoose.Schema({
  // User context (branch owner)
  userId: {
    type: String,
    required: true,
    index: true
  },

  // Session identification
  sessionId: {
    type: String,
    required: true,
    unique: true
  },

  // Opening details
  openedBy: {
    type: String,
    required: true
  },
  openedByName: {
    type: String,
    required: true
  },
  openedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  openingFloat: {
    type: Number,
    required: true,
    min: 0
  },

  // Closing details
  closedBy: {
    type: String,
    required: false
  },
  closedByName: {
    type: String,
    required: false
  },
  closedAt: {
    type: Date,
    required: false
  },
  closingBalance: {
    type: Number,
    required: false,
    min: 0
  },

  // Calculated totals
  expectedBalance: {
    type: Number,
    required: true,
    default: function() { return this.openingFloat; }
  },
  totalCashSales: {
    type: Number,
    default: 0,
    min: 0
  },
  transactionCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Variance tracking
  variance: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
    required: true
  },

  // Notes and audit trail
  notes: {
    type: String,
    maxlength: 1000
  },
  
  // Cash transaction references
  cashTransactions: [{
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    amount: Number,
    timestamp: Date
  }],

  // Terminal/device info
  terminal: {
    type: String,
    default: 'POS Terminal'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
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
  },

  // Local ID for offline support
  localId: {
    type: String,
    sparse: true
  },

  // Transfer tracking fields
  transferType: {
    type: String,
    enum: ['incoming', 'outgoing', null],
    default: null
  },
  transferredFrom: {
    type: String,
    required: false
  },
  transferredTo: {
    type: String,
    required: false
  },
  transferredAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for performance
cashDrawerSessionSchema.index({ userId: 1, createdAt: -1 });
cashDrawerSessionSchema.index({ userId: 1, status: 1 });
cashDrawerSessionSchema.index({ userId: 1, openedBy: 1 });
cashDrawerSessionSchema.index({ sessionId: 1 }, { unique: true });
cashDrawerSessionSchema.index({ status: 1, openedAt: -1 });
cashDrawerSessionSchema.index({ syncStatus: 1 });

// Ensure only one open session per user/terminal
cashDrawerSessionSchema.index(
  { userId: 1, terminal: 1, status: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { status: 'open' }
  }
);

// Virtual for session duration
cashDrawerSessionSchema.virtual('duration').get(function() {
  if (!this.closedAt) return null;
  return this.closedAt - this.openedAt;
});

// Virtual for variance percentage
cashDrawerSessionSchema.virtual('variancePercentage').get(function() {
  if (!this.expectedBalance || this.expectedBalance === 0) return 0;
  return ((this.variance / this.expectedBalance) * 100).toFixed(2);
});

// Pre-save middleware for validation
cashDrawerSessionSchema.pre('save', function(next) {
  // Calculate expected balance if not already set
  if (this.isNew && !this.expectedBalance) {
    this.expectedBalance = this.openingFloat;
  }

  // Validate closing data if session is closed
  if (this.status === 'closed') {
    if (!this.closedBy || !this.closedAt || this.closingBalance === undefined) {
      return next(new Error('Closed sessions must have closedBy, closedAt, and closingBalance'));
    }
    
    // Calculate variance if not set
    if (this.variance === undefined || this.variance === null) {
      this.variance = this.closingBalance - this.expectedBalance;
    }
  }

  // Ensure session ID is unique
  if (this.isNew && !this.sessionId) {
    this.sessionId = `drawer_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  next();
});

// Method to add cash transaction
cashDrawerSessionSchema.methods.addCashTransaction = function(transactionId, amount) {
  this.cashTransactions.push({
    transactionId,
    amount,
    timestamp: new Date()
  });
  
  this.totalCashSales += amount;
  this.expectedBalance += amount;
  this.transactionCount += 1;
  
  return this.save();
};

// Method to close session
cashDrawerSessionSchema.methods.closeSession = function(closingBalance, closedBy, closedByName, notes = '') {
  this.status = 'closed';
  this.closedBy = closedBy;
  this.closedByName = closedByName;
  this.closedAt = new Date();
  this.closingBalance = closingBalance;
  this.variance = closingBalance - this.expectedBalance;
  this.notes = notes;
  
  return this.save();
};

// Method to get session summary
cashDrawerSessionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    sessionId: this.sessionId,
    status: this.status,
    openedBy: this.openedByName,
    openedAt: this.openedAt,
    closedBy: this.closedByName,
    closedAt: this.closedAt,
    openingFloat: this.openingFloat,
    closingBalance: this.closingBalance,
    expectedBalance: this.expectedBalance,
    totalCashSales: this.totalCashSales,
    transactionCount: this.transactionCount,
    variance: this.variance,
    variancePercentage: this.variancePercentage,
    duration: this.duration,
    notes: this.notes
  };
};

// Static method to find active session for user
cashDrawerSessionSchema.statics.findActiveSession = function(userId, terminal = 'POS Terminal') {
  return this.findOne({ 
    userId, 
    terminal, 
    status: 'open' 
  });
};

// Static method to get recent sessions
cashDrawerSessionSchema.statics.getRecentSessions = function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-cashTransactions'); // Exclude transaction details for performance
};

// Static method to get session statistics
cashDrawerSessionSchema.statics.getSessionStats = function(userId, fromDate, toDate) {
  const matchQuery = { userId };
  
  if (fromDate || toDate) {
    matchQuery.createdAt = {};
    if (fromDate) matchQuery.createdAt.$gte = new Date(fromDate);
    if (toDate) matchQuery.createdAt.$lte = new Date(toDate);
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalCashSales: { $sum: '$totalCashSales' },
        totalTransactions: { $sum: '$transactionCount' },
        totalVariance: { $sum: '$variance' },
        avgVariance: { $avg: '$variance' },
        maxVariance: { $max: '$variance' },
        minVariance: { $min: '$variance' }
      }
    }
  ]);
};

export default mongoose.model('CashDrawerSession', cashDrawerSessionSchema);