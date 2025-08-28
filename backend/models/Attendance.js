// Attendance Model
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    employeeName: {
        type: String,
        required: true
    },
    employeePosition: {
        type: String
    },
    type: {
        type: String,
        enum: ['check-in', 'check-out'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    faceImagePath: {
        type: String
    },
    location: {
        latitude: Number,
        longitude: Number
    },
    notes: {
        type: String
    },
    syncStatus: {
        type: String,
        enum: ['pending', 'synced', 'failed'],
        default: 'synced'
    }
}, {
    timestamps: true
});

// Indexes for better query performance
attendanceSchema.index({ userId: 1, timestamp: -1 });
attendanceSchema.index({ employeeId: 1, timestamp: -1 });
attendanceSchema.index({ userId: 1, employeeId: 1, date: 1 });
attendanceSchema.index({ type: 1, timestamp: -1 });

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
    return new Date(this.timestamp).toLocaleDateString();
});

// Virtual for formatted time
attendanceSchema.virtual('formattedTime').get(function() {
    return new Date(this.timestamp).toLocaleTimeString();
});

// Method to check if employee is currently checked in
attendanceSchema.statics.isCheckedIn = async function(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const lastCheckIn = await this.findOne({
        employeeId,
        type: 'check-in',
        timestamp: { $gte: today, $lt: tomorrow }
    }).sort({ timestamp: -1 });
    
    if (!lastCheckIn) return false;
    
    const lastCheckOut = await this.findOne({
        employeeId,
        type: 'check-out',
        timestamp: { $gte: lastCheckIn.timestamp }
    }).sort({ timestamp: -1 });
    
    return !lastCheckOut;
};

// Method to get attendance summary for an employee
attendanceSchema.statics.getEmployeeSummary = async function(employeeId, startDate, endDate) {
    const query = { employeeId };
    
    if (startDate && endDate) {
        query.timestamp = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    
    const records = await this.find(query).sort({ timestamp: -1 });
    
    const summary = {
        totalDays: new Set(records.map(r => r.date)).size,
        totalCheckIns: records.filter(r => r.type === 'check-in').length,
        totalCheckOuts: records.filter(r => r.type === 'check-out').length,
        records: records
    };
    
    // Calculate total hours worked
    let totalMinutes = 0;
    const checkIns = records.filter(r => r.type === 'check-in');
    
    for (const checkIn of checkIns) {
        const checkOut = records.find(r => 
            r.type === 'check-out' && 
            r.timestamp > checkIn.timestamp &&
            r.date === checkIn.date
        );
        
        if (checkOut) {
            const minutes = (checkOut.timestamp - checkIn.timestamp) / (1000 * 60);
            totalMinutes += minutes;
        }
    }
    
    summary.totalHours = Math.round(totalMinutes / 60 * 100) / 100;
    
    return summary;
};

// Method to get daily attendance report
attendanceSchema.statics.getDailyReport = async function(userId, date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    const records = await this.find({
        userId,
        timestamp: { $gte: startDate, $lt: endDate }
    }).populate('employeeId', 'name position').sort({ timestamp: 1 });
    
    // Group by employee
    const employeeRecords = {};
    
    records.forEach(record => {
        const empId = record.employeeId._id.toString();
        if (!employeeRecords[empId]) {
            employeeRecords[empId] = {
                employee: record.employeeId,
                checkIns: [],
                checkOuts: []
            };
        }
        
        if (record.type === 'check-in') {
            employeeRecords[empId].checkIns.push(record);
        } else {
            employeeRecords[empId].checkOuts.push(record);
        }
    });
    
    return Object.values(employeeRecords);
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;