import mongoose from 'mongoose';

const businessCatalogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  businessName: {
    type: String,
    required: true
  },
  businessType: {
    type: String,
    default: 'spa'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  services: [{
    id: String,
    name: String,
    category: { type: String, default: 'service' },
    duration: Number,
    price: Number,
    description: String,
    isActive: { type: Boolean, default: true }
  }],
  employees: [{
    id: String,
    name: String,
    position: String,
    email: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    canBook: { type: Boolean, default: true }
  }],
  businessInfo: {
    address: String,
    phone: String,
    email: String,
    hours: String,
    description: String
  },
  publishedAt: Date,
  publishedBy: String
}, {
  timestamps: true
});

// Index for faster queries
businessCatalogSchema.index({ isPublished: 1 });
businessCatalogSchema.index({ userId: 1 });

const BusinessCatalog = mongoose.model('BusinessCatalog', businessCatalogSchema);

export default BusinessCatalog;