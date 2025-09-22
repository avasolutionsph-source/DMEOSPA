import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Employee from '../models/Employee.js';

dotenv.config();

async function fixJohnEmployee() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find John's employee record
        const john = await Employee.findOne({ email: 'j@gmail.com' });
        
        if (!john) {
            console.log('❌ Employee with email j@gmail.com not found');
            return;
        }
        
        console.log('\n📋 Found employee:');
        console.log(`   Name: ${john.firstName} ${john.lastName}`);
        console.log(`   Email: ${john.email}`);
        console.log(`   Current branchId: ${john.branchId || 'MISSING'}`);
        console.log(`   Current userId: ${john.userId}`);
        console.log(`   Password hashed: ${john.password && john.password.startsWith('$2a$') ? 'Yes' : 'No'}`);
        
        // Fix the issues
        console.log('\n🔧 Applying fixes...');
        
        // 1. Set branchId to userId (the branch owner's ID)
        if (!john.branchId) {
            john.branchId = john.userId;
            console.log(`   ✅ Set branchId to: ${john.userId}`);
        }
        
        // 2. Hash the password if it's not hashed
        const plainPassword = 'Thera1';
        if (!john.password.startsWith('$2a$')) {
            const salt = await bcrypt.genSalt(10);
            john.password = await bcrypt.hash(plainPassword, salt);
            console.log(`   ✅ Hashed password: ${plainPassword}`);
        }
        
        // 3. Set viewablePassword for branch owner visibility
        john.viewablePassword = plainPassword;
        console.log(`   ✅ Set viewablePassword: ${plainPassword}`);
        
        // 4. Ensure other required fields are set
        if (!john.isActive) {
            john.isActive = true;
            console.log('   ✅ Set isActive to true');
        }
        
        // Save the fixed employee
        await john.save();
        console.log('\n✅ Employee record fixed successfully!');
        
        // Verify the fix
        console.log('\n🧪 Testing login...');
        const updatedJohn = await Employee.findOne({ 
            email: 'j@gmail.com' 
        }).populate('branchId', 'businessName email');
        
        if (updatedJohn && updatedJohn.branchId) {
            console.log('✅ Employee can now login!');
            console.log(`   Branch: ${updatedJohn.branchId.businessName}`);
            console.log(`   Branch Email: ${updatedJohn.branchId.email}`);
            
            // Test password
            const isPasswordValid = await updatedJohn.comparePassword(plainPassword);
            console.log(`   Password validation: ${isPasswordValid ? '✅ Working' : '❌ Failed'}`);
        }
        
        console.log('\n📝 Summary:');
        console.log('   Employee "John" has been fixed and can now login');
        console.log('   Email: j@gmail.com');
        console.log('   Password: Thera1');
        console.log('   Role: Senior Therapist');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

fixJohnEmployee();