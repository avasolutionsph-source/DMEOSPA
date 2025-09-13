import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  // User context
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Employee information
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeePosition: {
    type: String,
    default: 'Employee'
  },
  
  // Attendance details
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    index: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    default: null
  },
  
  // Working hours calculation
  workingHours: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Check-in details
  checkInTime: {
    type: String // ISO string format for compatibility
  },
  checkOutTime: {
    type: String // ISO string format for compatibility
  },
  
  // Attendance method
  method: {
    type: String,
    enum: ['manual', 'facial', 'automatic'],
    default: 'manual'
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'early_departure'],
    default: 'present'
  },
  
  // Late arrival tracking
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Early departure tracking
  checkOutDeduction: {
    type: Number,
    min: 0,
    default: 0
  },
  earlyDepartureMinutes: {
    type: Number,
    min: 0,
    default: 0
  },
  payDeduction: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Additional information
  notes: {
    type: String,
    trim: true
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

// Indexes for efficient queries
attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ userId: 1, employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ syncStatus: 1 });

// Compound index for user-specific attendance lookups
attendanceSchema.index({ userId: 1, date: -1 });

export default mongoose.model('Attendance', attendanceSchema, 'attendance');