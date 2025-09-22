import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import crypto from 'crypto';

dotenv.config();

async function testEmployeeLoginCreation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find a test branch
        const testBranch = await User.findOne({ businessName: 'Test Spa & Wellness Center' });
        if (!testBranch) {
            console.log('❌ Test branch not found. Run create-test-employees.js first');
            process.exit(1);
        }
        
        console.log(`\n📍 Using branch: ${testBranch.businessName}`);
        
        // Create a PWA employee without login
        const pwaEmployee = new Employee({
            userId: testBranch._id,
            branchId: testBranch._id,
            firstName: 'Maria',
            lastName: 'Santos',
            email: `maria.santos@${testBranch.businessName.replace(/\s+/g, '').toLowerCase()}.temp`,
            position: 'Senior Therapist',
            department: 'Spa Services',
            phone: '09123456789',
            isActive: true,
            commissionRate: 15
            // Note: No password or role - this is a PWA-only employee
        });
        
        await pwaEmployee.save();
        console.log('\n✅ Created PWA employee without login:');
        console.log(`   Name: ${pwaEmployee.firstName} ${pwaEmployee.lastName}`);
        console.log(`   Position: ${pwaEmployee.position}`);
        console.log(`   Has Login: ${!!pwaEmployee.password}`);
        
        // Now add login credentials to this PWA employee
        console.log('\n🔐 Adding login credentials to PWA employee...');
        
        const email = 'maria.santos@testspa.com';
        const temporaryPassword = crypto.randomBytes(4).toString('hex');
        
        pwaEmployee.email = email;
        pwaEmployee.password = temporaryPassword;
        pwaEmployee.role = 'senior_therapist';
        pwaEmployee.assignedRooms = ['Room 1', 'Room 2'];
        
        await pwaEmployee.save();
        
        console.log('✅ Added login credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Temporary Password: ${temporaryPassword}`);
        console.log(`   Role: ${pwaEmployee.role}`);
        console.log(`   Assigned Rooms: ${pwaEmployee.assignedRooms.join(', ')}`);
        
        // Verify login works
        console.log('\n🧪 Testing login...');
        const foundEmployee = await Employee.findOne({ 
            email: email.toLowerCase(),
            isActive: true
        });
        
        if (foundEmployee) {
            const isPasswordValid = await foundEmployee.comparePassword(temporaryPassword);
            if (isPasswordValid) {
                console.log('✅ Login successful!');
                console.log('   Employee can now login with their credentials');
            } else {
                console.log('❌ Password validation failed');
            }
        } else {
            console.log('❌ Employee not found');
        }
        
        // Show all employees for this branch
        console.log('\n📊 All employees for this branch:');
        const allEmployees = await Employee.find({ 
            branchId: testBranch._id 
        }).select('firstName lastName email role position password');
        
        allEmployees.forEach(emp => {
            const hasLogin = !!emp.password;
            console.log(`   - ${emp.firstName} ${emp.lastName}`);
            console.log(`     Position: ${emp.position || 'N/A'}`);
            console.log(`     Has Login: ${hasLogin}`);
            if (hasLogin) {
                console.log(`     Login Role: ${emp.role}`);
                console.log(`     Email: ${emp.email}`);
            }
            console.log('');
        });
        
        console.log('✨ Test complete!');
        console.log('\n📝 Summary:');
        console.log('1. PWA employees can exist without login credentials');
        console.log('2. Login credentials can be added later via employee management');
        console.log('3. The same employee record is used for both PWA and login');
        console.log('4. This allows branch owners to see all employees and create logins as needed');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

testEmployeeLoginCreation();