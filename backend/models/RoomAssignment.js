import mongoose from 'mongoose';

const roomAssignmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    roomName: {
        type: String,
        required: true,
        trim: true
    },
    roomId: {
        type: Number,
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    employeeName: {
        type: String,
        required: true
    },
    employeePosition: {
        type: String,
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound index to ensure unique room-employee assignments per user
roomAssignmentSchema.index({ userId: 1, roomName: 1, employeeId: 1 }, { unique: true });

// Index for quick lookups
roomAssignmentSchema.index({ userId: 1, roomName: 1 });
roomAssignmentSchema.index({ userId: 1, employeeId: 1 });

const RoomAssignment = mongoose.model('RoomAssignment', roomAssignmentSchema);

export default RoomAssignment;
