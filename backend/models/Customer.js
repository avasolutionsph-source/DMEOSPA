import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
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
  
  // Customer details
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
  phone: {
    type: String,
    trim: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // Customer metrics
  totalVisits: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  lastVisit: {
    type: Date
  },
  
  // Preferences
  favoriteServices: [{
    type: String
  }],
  notes: {
    type: String,
    trim: true
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

// Indexes
customerSchema.index({ userId: 1, firstName: 1, lastName: 1 });
customerSchema.index({ userId: 1, phone: 1 });
customerSchema.index({ userId: 1, email: 1 });
customerSchema.index({ userId: 1, isActive: 1 });
customerSchema.index({ userId: 1, localId: 1 }, { unique: true, sparse: true });
customerSchema.index({ syncStatus: 1 });

export default mongoose.model('Customer', customerSchema);