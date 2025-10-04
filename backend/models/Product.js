import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
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
  
  // Product details
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'service', 'product', 'massage', 'facial', 'wellness', 'skincare', 'therapy', 'treatment',
      'body', 'nail', 'nails', 'hair', 'waxing', 'manicure', 'pedicure', 'relaxation', 'beauty',
      'spa', 'aromatherapy', 'detox', 'anti-aging', 'acne', 'hydrating', 'exfoliation'
    ],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  
  // Service-specific fields
  duration: {
    type: Number, // in minutes
    min: 0
  },
  
  // Product-specific fields
  sku: {
    type: String,
    sparse: true, // Allow multiple null values
    trim: true
  },
  
  // Inventory usage for services
  inventoryUsage: [{
    inventoryId: String,
    quantity: {
      type: Number,
      min: 0,
      default: 0
    }
  }],
  
  // Display settings
  showInPOS: {
    type: Boolean,
    default: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Sort order for user preferences
  sortOrder: {
    type: Number,
    default: 0
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
productSchema.index({ userId: 1, name: 1 });
productSchema.index({ userId: 1, category: 1 });
productSchema.index({ userId: 1, isActive: 1 });
productSchema.index({ userId: 1, sortOrder: 1 });
productSchema.index({ userId: 1, localId: 1 }, { unique: true, sparse: true });
productSchema.index({ syncStatus: 1 });

export default mongoose.model('Product', productSchema);
