import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  // User context
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Item details
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    sparse: true, // Allow multiple null values
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Inventory tracking
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minStock: {
    type: Number,
    min: 0,
    default: 0
  },
  maxStock: {
    type: Number,
    min: 0
  },
  unit: {
    type: String,
    trim: true,
    default: 'pcs'
  },
  
  // Pricing
  costPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  sellingPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Supplier info
  supplier: {
    type: String,
    trim: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Alerts
  lowStockAlert: {
    type: Boolean,
    default: false
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

// Virtual for stock status
inventoryItemSchema.virtual('stockStatus').get(function() {
  if (this.currentStock <= 0) return 'out_of_stock';
  if (this.currentStock <= this.minStock) return 'low_stock';
  return 'in_stock';
});

// Indexes
inventoryItemSchema.index({ userId: 1, name: 1 });
inventoryItemSchema.index({ userId: 1, currentStock: 1 });
inventoryItemSchema.index({ userId: 1, isActive: 1 });
inventoryItemSchema.index({ syncStatus: 1 });

export default mongoose.model('InventoryItem', inventoryItemSchema);
