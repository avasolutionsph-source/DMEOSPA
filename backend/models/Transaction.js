import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // User context
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Transaction details
  transactionId: {
    type: String,
    required: false, // Make optional, will auto-generate if missing
    unique: true,
    sparse: true // Allow multiple null values
  },
  
  // Items sold
  items: [{
    productId: String,
    name: String,
    category: String, // 'service' or 'product'
    price: Number,
    quantity: Number,
    subtotal: Number
  }],
  
  // Totals
  subtotal: {
    type: Number,
    required: false, // Make optional, will calculate from items if missing
    min: 0,
    default: 0
  },
  tax: {
    type: Number,
    min: 0,
    default: 0
  },
  discount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Detailed discount tracking
  discountDetails: {
    seniorPWD: {
      applied: { type: Boolean, default: false },
      percentage: Number,
      amount: Number,
      cardholderName: String,
      idNumber: String,
      cardType: { type: String, enum: ['senior', 'pwd'] }
    },
    promo: {
      applied: { type: Boolean, default: false },
      type: String,
      percentage: Number,
      amount: Number,
      reason: String
    },
    giftCertificate: {
      applied: { type: Boolean, default: false },
      controlNumber: String,
      amount: Number,
      gcId: String
    }
  },
  
  // Gift Certificate amount
  gcAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'gcash', 'paymaya', 'bank_transfer', 'other'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  
  // Employee info
  employeeId: String,
  employeeName: String,
  employeeCommission: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Customer info (optional)
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  
  // Status
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  
  // Audit trail
  auditLog: {
    createdBy: String,
    createdAt: Date,
    terminal: String,
    ipAddress: String,
    userAgent: String,
    modifications: [{
      date: Date,
      by: String,
      action: String,
      details: String
    }]
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
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, employeeId: 1 });
transactionSchema.index({ userId: 1, paymentMethod: 1 });
transactionSchema.index({ syncStatus: 1 });
transactionSchema.index({ transactionId: 1 });

export default mongoose.model('Transaction', transactionSchema);
