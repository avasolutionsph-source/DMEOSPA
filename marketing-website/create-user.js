import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function createUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const User = (await import('./models/User.js')).default;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: 'pok@gmail.com' });
        if (existingUser) {
            console.log('User already exists:', existingUser.email);
            mongoose.connection.close();
            return;
        }
        
        // Create new user
        const hashedPassword = await bcrypt.hash('password123', 10); // Change this password
        
        const newUser = new User({
            email: 'pok@gmail.com',
            password: hashedPassword,
            firstName: 'Pok',
            lastName: 'User',
            businessName: 'Pok Business',
            role: 'user',
            subscriptionPlan: 'free',
            subscriptionStatus: 'active',
            businessMetrics: {
                totalSales: 134,
                totalTransactions: 1,
                totalProducts: 0,
                totalEmployees: 0,
                todaySales: 134,
                todayTransactions: 1,
                monthSales: 134,
                monthTransactions: 1,
                yearSales: 134,
                yearTransactions: 1,
                lastSyncDate: new Date()
            }
        });
        
        await newUser.save();
        console.log('User created successfully:', newUser.email);
        console.log('Password: password123 (change this!)');
        
        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createUser();