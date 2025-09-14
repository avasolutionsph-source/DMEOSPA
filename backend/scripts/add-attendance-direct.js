// Add attendance records directly to MongoDB
import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions';
const USER_ID = '68c21c728d8e77ab71c2e8e2';

// Employee IDs from our system
const EMPLOYEE_IDS = [
    '68c232f5e2a4cde706d4a0f5', // dasdas dsa
    '68c23514e2a4cde706d4a168'  // dsadas N/A
];

// Create attendance record
const createAttendanceRecord = (employeeId, date, userId) => {
    const checkInTime = new Date(date + 'T08:00:00.000Z');
    checkInTime.setHours(8 + Math.floor(Math.random() * 2)); // 8-9 AM check-in
    checkInTime.setMinutes(Math.floor(Math.random() * 60));
    
    const checkOutTime = new Date(date + 'T17:00:00.000Z');
    checkOutTime.setHours(17 + Math.floor(Math.random() * 2)); // 5-6 PM check-out
    checkOutTime.setMinutes(Math.floor(Math.random() * 60));
    
    const workingHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    
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

async function addAttendanceRecords() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        console.log('🔄 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db();
        const attendanceCollection = db.collection('attendance');
        
        const allRecords = [];
        
        for (const employeeId of EMPLOYEE_IDS) {
            console.log(`\\n📅 Creating attendance for employee: ${employeeId}`);
            
            // Create attendance for the last 20 working days
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) {
                    continue;
                }
                
                // 90% attendance rate
                if (Math.random() < 0.1) {
                    continue;
                }
                
                const dateStr = date.toISOString().split('T')[0];
                const record = createAttendanceRecord(employeeId, dateStr, USER_ID);
                allRecords.push(record);
            }
        }
        
        console.log(`\\n💾 Inserting ${allRecords.length} attendance records...`);
        
        if (allRecords.length > 0) {
            const result = await attendanceCollection.insertMany(allRecords);
            console.log(`✅ Successfully inserted ${result.insertedCount} attendance records`);
            
            // Show summary
            const summary = await attendanceCollection.aggregate([
                { $match: { userId: USER_ID } },
                { $group: { 
                    _id: '$employeeId', 
                    count: { $sum: 1 },
                    totalHours: { $sum: '$workingHours' },
                    avgHours: { $avg: '$workingHours' }
                }}
            ]).toArray();
            
            console.log(`\\n📊 Attendance Summary:`);
            summary.forEach(emp => {
                console.log(`Employee ${emp._id}: ${emp.count} days, ${emp.totalHours.toFixed(1)} total hours, ${emp.avgHours.toFixed(1)} avg hours/day`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

console.log('🚀 Starting attendance record creation...');
addAttendanceRecords();