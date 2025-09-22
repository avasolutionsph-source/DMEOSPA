import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import crypto from 'crypto';

dotenv.config();

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Test employees data
const testEmployees = [
    {
        firstName: 'Maria',
        lastName: 'Manager',
        email: 'manager@testspa.com',
        role: 'manager',
        department: 'Management',
        position: 'General Manager',
        phone: '09171234567',
        commissionRate: 0
    },
    {
        firstName: 'Sandra',
        lastName: 'Senior',
        email: 'senior@testspa.com',
        role: 'senior_therapist',
        department: 'Spa',
        position: 'Senior Therapist',
        phone: '09181234567',
        commissionRate: 15,
        assignedRooms: ['Room 1', 'Room 2', 'VIP Room']
    },
    {
        firstName: 'Juan',
        lastName: 'Junior',
        email: 'junior@testspa.com',
        role: 'junior_therapist',
        department: 'Spa',
        position: 'Junior Therapist',
        phone: '09191234567',
        commissionRate: 10,
        assignedRooms: ['Room 3', 'Room 4']
    },
    {
        firstName: 'Nina',
        lastName: 'New',
        email: 'newbie@testspa.com',
        role: 'new_therapist',
        department: 'Spa',
        position: 'New Therapist',
        phone: '09201234567',
        commissionRate: 8,
        assignedRooms: ['Room 5']
    },
    {
        firstName: 'Rita',
        lastName: 'Receptionist',
        email: 'receptionist@testspa.com',
        role: 'receptionist',
        department: 'Front Desk',
        position: 'Receptionist',
        phone: '09211234567',
        commissionRate: 0
    },
    {
        firstName: 'Roberto',
        lastName: 'Rider',
        email: 'rider@testspa.com',
        role: 'other_staff',
        department: 'Delivery',
        position: 'Delivery Rider',
        phone: '09221234567',
        commissionRate: 0
    },
    {
        firstName: 'Utility',
        lastName: 'Worker',
        email: 'utility@testspa.com',
        role: 'other_staff',
        department: 'Maintenance',
        position: 'Utility Staff',
        phone: '09231234567',
        commissionRate: 0
    }
];

async function createTestEmployees() {
    try {
        await connectDB();
        
        // Find or create a test branch owner
        let branchOwner = await User.findOne({ email: 'owner@testspa.com' });
        
        if (!branchOwner) {
            console.log('Creating test branch owner...');
            branchOwner = await User.create({
                email: 'owner@testspa.com',
                password: 'Test123',
                firstName: 'Test',
                lastName: 'Owner',
                businessName: 'Test Spa & Wellness Center',
                phone: '09161234567',
                role: 'branch'
            });
            console.log('✅ Test branch owner created');
            console.log('   Email: owner@testspa.com');
            console.log('   Password: Test123');
        }
        
        console.log('\n📋 Creating test employees for branch:', branchOwner.businessName);
        console.log('=' .repeat(60));
        
        // Clear existing test employees
        const deletedCount = await Employee.deleteMany({ 
            email: { $regex: '@testspa.com' } 
        });
        
        if (deletedCount.deletedCount > 0) {
            console.log(`🗑️  Deleted ${deletedCount.deletedCount} existing test employees`);
        }
        
        // Create each test employee
        const createdEmployees = [];
        
        for (const empData of testEmployees) {
            // Generate temporary password
            const tempPassword = crypto.randomBytes(4).toString('hex');
            
            // Create employee
            const employee = new Employee({
                ...empData,
                userId: branchOwner._id.toString(),
                branchId: branchOwner._id,
                password: tempPassword, // Will be hashed by pre-save hook
                isActive: true,
                loginAttempts: 0,
                isLocked: false
            });
            
            await employee.save();
            
            createdEmployees.push({
                name: `${empData.firstName} ${empData.lastName}`,
                email: empData.email,
                role: empData.role,
                password: tempPassword,
                department: empData.department,
                assignedRooms: empData.assignedRooms
            });
            
            console.log(`\n✅ Created: ${empData.firstName} ${empData.lastName}`);
            console.log(`   Role: ${empData.role}`);
            console.log(`   Email: ${empData.email}`);
            console.log(`   Password: ${tempPassword}`);
            
            if (empData.assignedRooms) {
                console.log(`   Rooms: ${empData.assignedRooms.join(', ')}`);
            }
        }
        
        // Print summary
        console.log('\n' + '=' .repeat(60));
        console.log('📊 SUMMARY - Test Employees Created');
        console.log('=' .repeat(60));
        
        console.log('\n🏢 Branch Owner Login:');
        console.log('   URL: http://localhost:8082/login.html');
        console.log('   Email: owner@testspa.com');
        console.log('   Password: Test123');
        
        console.log('\n👥 Employee Logins (check "I\'m an employee" box):');
        console.log('=' .repeat(60));
        
        createdEmployees.forEach(emp => {
            console.log(`\n${emp.name} (${emp.role})`);
            console.log(`   Email: ${emp.email}`);
            console.log(`   Password: ${emp.password}`);
            
            // Role-specific access info
            const accessInfo = {
                'manager': '   Access: All features (read-only)',
                'senior_therapist': '   Access: Personal data + Rooms: ' + (emp.assignedRooms?.join(', ') || ''),
                'junior_therapist': '   Access: Personal data + Rooms: ' + (emp.assignedRooms?.join(', ') || ''),
                'new_therapist': '   Access: Personal data + Rooms: ' + (emp.assignedRooms?.join(', ') || ''),
                'receptionist': '   Access: POS, Inventory, Customers, Attendance, Rooms, Expenses',
                'other_staff': '   Access: Own attendance and payroll only'
            };
            
            console.log(accessInfo[emp.role] || '');
        });
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 Testing Instructions:');
        console.log('1. Start backend: cd backend && npm run dev');
        console.log('2. Start PWA: cd PWA-Repository && npx http-server -p 8082');
        console.log('3. Open: http://localhost:8082/login.html');
        console.log('4. For employees: Check "I\'m an employee" checkbox');
        console.log('5. Login with credentials above');
        console.log('6. Verify role-based access works correctly');
        
        console.log('\n✨ All test data created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating test employees:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Run the script
createTestEmployees();