// Create mock attendance data for employees
// Usage: node create-mock-attendance.js <email>

import mongoose from 'mongoose';
import User from './models/User.js';
import Employee from './models/Employee.js';

// Import from marketing website models
import MarketingUser from '../marketing-website/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions';

// Mock attendance data structure
const createAttendanceRecord = (employeeId, date, userId) => {
    const checkInTime = new Date(date);
    checkInTime.setHours(8 + Math.floor(Math.random() * 2)); // 8-9 AM check-in
    checkInTime.setMinutes(Math.floor(Math.random() * 60));
    
    const checkOutTime = new Date(date);
    checkOutTime.setHours(17 + Math.floor(Math.random() * 2)); // 5-6 PM check-out
    checkOutTime.setMinutes(Math.floor(Math.random() * 60));
    
    const workingHours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // Convert to hours
    
    return {
        employeeId: employeeId,
        userId: userId,
        date: date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        workingHours: parseFloat(workingHours.toFixed(2)),
        status: 'present',
        notes: `Mock attendance - ${workingHours.toFixed(1)} hours worked`,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'synced'
    };
};

async function createMockAttendance(email) {
    try {
        console.log(`🔄 Connecting to MongoDB...`);
        await mongoose.connect(MONGODB_URI);
        console.log(`✅ Connected to MongoDB`);

        // Find the user first
        console.log(`🔍 Looking for user: ${email}`);
        
        // Check both PWA and marketing users
        const pwaUser = await User.findOne({ email });
        const marketingUser = await MarketingUser.findOne({ email });
        
        let userId = null;
        if (pwaUser) {
            userId = pwaUser._id.toString();
            console.log(`👤 Found PWA user: ${userId}`);
        }
        if (marketingUser) {
            console.log(`👤 Found Marketing user: ${marketingUser._id}`);
        }

        if (!userId && !marketingUser) {
            console.log(`❌ User ${email} not found in either database`);
            return;
        }

        // Get all employees for this user
        const employees = await Employee.find({ userId });
        console.log(`👥 Found ${employees.length} employees for ${email}`);

        if (employees.length === 0) {
            console.log(`❌ No employees found for ${email}`);
            return;
        }

        // Create attendance collection manually since we don't have a model
        const db = mongoose.connection.db;
        const attendanceCollection = db.collection('attendance');

        let totalRecords = 0;

        for (const employee of employees) {
            console.log(`\\n📅 Creating attendance for: ${employee.firstName} ${employee.lastName}`);
            
            const attendanceRecords = [];
            
            // Create attendance for the last 30 days
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                
                // Skip weekends (Saturday = 6, Sunday = 0)
                if (date.getDay() === 0 || date.getDay() === 6) {
                    continue;
                }
                
                // 90% attendance rate - skip some random days
                if (Math.random() < 0.1) {
                    continue;
                }
                
                const attendanceRecord = createAttendanceRecord(
                    employee._id.toString(),
                    date.toISOString().split('T')[0], // YYYY-MM-DD format
                    userId
                );
                
                attendanceRecords.push(attendanceRecord);
            }
            
            // Insert attendance records for this employee
            if (attendanceRecords.length > 0) {
                await attendanceCollection.insertMany(attendanceRecords);
                console.log(`✅ Created ${attendanceRecords.length} attendance records for ${employee.firstName} ${employee.lastName}`);
                totalRecords += attendanceRecords.length;
            }
        }

        console.log(`\\n🎉 Mock attendance creation complete!`);
        console.log(`📊 Total attendance records created: ${totalRecords}`);
        console.log(`👥 Employees with attendance: ${employees.length}`);
        console.log(`📅 Date range: Last 30 working days (excluding weekends)`);
        console.log(`📈 Attendance rate: ~90% (some random absences)`);

        // Show sample of created records
        const sampleRecords = await attendanceCollection.find({ userId }).limit(5).toArray();
        console.log(`\\n📋 Sample attendance records:`);
        sampleRecords.forEach((record, index) => {
            console.log(`${index + 1}. ${record.date} - Check-in: ${record.checkIn.toLocaleTimeString()} - Check-out: ${record.checkOut.toLocaleTimeString()} - Hours: ${record.workingHours}`);
        });

    } catch (error) {
        console.error(`❌ Error creating mock attendance:`, error);
    } finally {
        await mongoose.disconnect();
        console.log(`🔌 Disconnected from MongoDB`);
    }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
    console.log(`❌ Usage: node create-mock-attendance.js <email>`);
    console.log(`📝 Example: node create-mock-attendance.js pok@gmail.com`);
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    console.log(`❌ Invalid email format: ${email}`);
    process.exit(1);
}

console.log(`🚀 Starting mock attendance creation for user: ${email}`);
createMockAttendance(email)
    .then(() => {
        console.log(`✅ Mock attendance creation completed successfully`);
        process.exit(0);
    })
    .catch((error) => {
        console.error(`❌ Mock attendance creation failed:`, error);
        process.exit(1);
    });