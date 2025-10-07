import mongoose from 'mongoose';

const activeServiceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    roomId: {
        type: Number,
        required: true
    },
    roomName: {
        type: String,
        required: true,
        trim: true
    },
    serviceName: {
        type: String,
        required: true
    },
    clientName: {
        type: String,
        default: 'Walk-in'
    },
    employeeId: {
        type: String,
        required: true,
        index: true
    },
    employeeName: {
        type: String,
        required: true
    },
    transactionId: {
        type: Number
    },
    estimatedDuration: {
        type: Number  // in minutes
    },
    startTime: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed'],
        default: 'pending',
        index: true
    },
    extensions: {
        type: Number,
        default: 0
    },
    lastExtended: {
        type: Date
    },
    endTime: {
        type: Date
    },
    actualDuration: {
        type: Number  // in minutes
    }
}, {
    timestamps: true
});

// Compound index for active/pending services per user
activeServiceSchema.index({ userId: 1, status: 1 });

// Index for quick room lookups
activeServiceSchema.index({ userId: 1, roomId: 1, status: 1 });

const ActiveService = mongoose.model('ActiveService', activeServiceSchema);

export default ActiveService;
