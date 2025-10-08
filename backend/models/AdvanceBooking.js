import mongoose from 'mongoose';

const advanceBookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Booking date and time
    bookingDateTime: {
        type: Date,
        required: true,
        index: true
    },
    // Employee/Therapist information
    employeeId: {
        type: String,
        required: true,
        index: true
    },
    employeeName: {
        type: String,
        required: true
    },
    // Service information
    serviceName: {
        type: String,
        required: true
    },
    estimatedDuration: {
        type: Number,  // in minutes
        required: true
    },
    servicePrice: {
        type: Number,
        required: true
    },
    // Room/Location information
    roomId: {
        type: Number,
        required: false,
        default: null
    },
    roomName: {
        type: String,
        required: false,
        trim: true
    },
    isHomeService: {
        type: Boolean,
        default: false,
        index: true
    },
    // Customer information
    clientName: {
        type: String,
        required: true
    },
    clientPhone: {
        type: String,
        default: null
    },
    clientEmail: {
        type: String,
        default: null
    },
    clientAddress: {
        type: String,
        default: null
    },
    // Payment information
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'gcash'],
        default: 'cash'
    },
    // Transaction reference (if paid during booking)
    transactionId: {
        type: String
    },
    // Booking status
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'],
        default: 'scheduled',
        index: true
    },
    // Notes
    specialRequests: {
        type: String,
        default: null
    },
    // Reminder sent flag
    reminderSent: {
        type: Boolean,
        default: false
    },
    // Conversion to active service
    activeServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActiveService',
        default: null
    },
    convertedToActiveAt: {
        type: Date,
        default: null
    },
    // Cancellation info
    cancelledAt: {
        type: Date,
        default: null
    },
    cancellationReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
advanceBookingSchema.index({ userId: 1, status: 1 });
advanceBookingSchema.index({ userId: 1, bookingDateTime: 1 });
advanceBookingSchema.index({ employeeId: 1, bookingDateTime: 1 });

// Index for finding bookings by date range
advanceBookingSchema.index({ userId: 1, bookingDateTime: 1, status: 1 });

const AdvanceBooking = mongoose.model('AdvanceBooking', advanceBookingSchema);

export default AdvanceBooking;
