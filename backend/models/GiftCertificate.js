import mongoose from 'mongoose';

const giftCertificateSchema = new mongoose.Schema({
  // User context
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // GC Details
  controlNumber: {
    type: String,
    required: true,
    unique: true
    // Removed index: true - unique already creates index
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  recipient: {
    type: String,
    default: null
  },
  
  notes: {
    type: String,
    default: null
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'voided'],
    default: 'active',
    index: true
  },
  
  // Dates
  expiryDate: {
    type: Date,
    default: null
  },
  
  usedDate: {
    type: Date,
    default: null
  },
  
  voidedDate: {
    type: Date,
    default: null
  },
  
  // References
  usedInTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  
  // Created/Modified by
  createdBy: {
    type: String,
    required: true
  },
  
  voidedBy: {
    type: String,
    default: null
  },
  
  // Audit log
  auditLog: [{
    action: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    by: {
      type: String,
      required: true
    },
    details: String,
    ipAddress: String,
    userAgent: String
  }],
  
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

// Indexes
giftCertificateSchema.index({ userId: 1, createdAt: -1 });
giftCertificateSchema.index({ userId: 1, status: 1 });
// Removed duplicate controlNumber index - field already has unique: true which creates index

// Middleware to check expiry on query
giftCertificateSchema.pre(['find', 'findOne', 'findOneAndUpdate'], async function() {
  // Auto-expire GCs past expiry date
  const now = new Date();
  await this.model.updateMany(
    { 
      status: 'active',
      expiryDate: { $lt: now }
    },
    { 
      $set: { 
        status: 'expired',
        'auditLog': {
          $push: {
            action: 'auto-expired',
            date: now,
            by: 'system',
            details: 'Automatically expired due to expiry date'
          }
        }
      }
    }
  );
});

// Method to validate GC for use (renamed to avoid Mongoose conflict)
giftCertificateSchema.methods.validateForUse = function() {
  if (this.status === 'used') {
    return { valid: false, reason: 'Gift certificate already used' };
  }
  
  if (this.status === 'voided') {
    return { valid: false, reason: 'Gift certificate has been voided' };
  }
  
  if (this.status === 'expired') {
    return { valid: false, reason: 'Gift certificate has expired' };
  }
  
  if (this.expiryDate && new Date() > this.expiryDate) {
    this.status = 'expired';
    return { valid: false, reason: 'Gift certificate has expired' };
  }
  
  return { valid: true, amount: this.amount };
};

// Method to use GC
giftCertificateSchema.methods.use = async function(transactionId, usedBy) {
  if (this.status !== 'active') {
    throw new Error('Gift certificate is not active');
  }
  
  this.status = 'used';
  this.usedDate = new Date();
  this.usedInTransaction = transactionId;
  
  this.auditLog.push({
    action: 'used',
    date: new Date(),
    by: usedBy || 'system',
    details: `Used in transaction ${transactionId}`
  });
  
  return await this.save();
};

export default mongoose.model('GiftCertificate', giftCertificateSchema);