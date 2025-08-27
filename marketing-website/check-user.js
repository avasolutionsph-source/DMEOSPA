import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// Connect to MongoDB
async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions');
        console.log('Connected to MongoDB');
        
        // Import User model
        const User = (await import('./models/User.js')).default;
        
        // Find ALL users and check their sync data
        const allUsers = await User.find({});
        console.log('\n=== Checking ALL Users for Synced Data ===');
        
        for (const user of allUsers) {
            console.log(`\nUser: ${user.email}`);
            if (user.businessMetrics && (user.businessMetrics.totalSales > 0 || user.businessMetrics.totalTransactions > 0)) {
                console.log('  HAS SYNCED DATA:');
                console.log('  - Total Sales:', user.businessMetrics.totalSales);
                console.log('  - Total Transactions:', user.businessMetrics.totalTransactions);
                console.log('  - Last Sync:', user.businessMetrics.lastSyncDate);
            } else {
                console.log('  No synced data');
            }
        }
        
        // Original check
        const user = await User.findOne({ email: 'pok@gmail.com' });
        
        if (user) {
            console.log('\n=== User Found ===');
            console.log('Email:', user.email);
            console.log('Name:', user.firstName, user.lastName);
            console.log('Business Name:', user.businessName);
            console.log('\n=== Business Metrics ===');
            console.log('Total Sales:', user.businessMetrics?.totalSales || 0);
            console.log('Total Transactions:', user.businessMetrics?.totalTransactions || 0);
            console.log('Total Products:', user.businessMetrics?.totalProducts || 0);
            console.log('Total Employees:', user.businessMetrics?.totalEmployees || 0);
            console.log('Last Sync:', user.businessMetrics?.lastSyncDate);
            console.log('\n=== Detailed Metrics ===');
            console.log('Today Sales:', user.businessMetrics?.todaySales || 0);
            console.log('Month Sales:', user.businessMetrics?.monthSales || 0);
            console.log('Year Sales:', user.businessMetrics?.yearSales || 0);
            console.log('\n=== Employees ===');
            console.log('Employee Count:', user.employees?.length || 0);
            if (user.employees && user.employees.length > 0) {
                user.employees.forEach(emp => {
                    console.log(`- ${emp.name}: ${emp.position}`);
                });
            }
        } else {
            console.log('User not found with email: pok@gmail.com');
            
            // List all users
            const allUsers = await User.find({}, 'email businessName');
            console.log('\nAll users in database:');
            allUsers.forEach(u => {
                console.log(`- ${u.email} (${u.businessName || 'No business name'})`);
            });
        }
        
        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUser();