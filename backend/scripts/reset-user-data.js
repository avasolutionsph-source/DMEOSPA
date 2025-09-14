// Reset MongoDB data for a specific user
// Usage: node reset-user-data.js <email>

import mongoose from 'mongoose';
import User from './models/User.js';
import Employee from './models/Employee.js';
import Product from './models/Product.js';
import Transaction from './models/Transaction.js';
import InventoryItem from './models/InventoryItem.js';

// Import from marketing website models
import MarketingUser from '../marketing-website/models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ava-solutions';

async function resetUserData(email) {
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

        console.log(`\n🗑️ Starting data cleanup for ${email}...`);
        
        let totalDeleted = 0;

        // Delete PWA data if PWA user exists
        if (userId) {
            console.log(`\n📊 Cleaning PWA data for userId: ${userId}`);

            // Delete employees
            const deletedEmployees = await Employee.deleteMany({ userId });
            console.log(`✅ Deleted ${deletedEmployees.deletedCount} employees`);
            totalDeleted += deletedEmployees.deletedCount;

            // Delete products
            const deletedProducts = await Product.deleteMany({ userId });
            console.log(`✅ Deleted ${deletedProducts.deletedCount} products`);
            totalDeleted += deletedProducts.deletedCount;

            // Delete transactions
            const deletedTransactions = await Transaction.deleteMany({ userId });
            console.log(`✅ Deleted ${deletedTransactions.deletedCount} transactions`);
            totalDeleted += deletedTransactions.deletedCount;

            // Delete inventory items
            const deletedInventory = await InventoryItem.deleteMany({ userId });
            console.log(`✅ Deleted ${deletedInventory.deletedCount} inventory items`);
            totalDeleted += deletedInventory.deletedCount;

            // Keep the user account but reset specific fields
            await User.updateOne(
                { _id: userId },
                { 
                    $unset: { 
                        lastLoginDate: 1,
                        lastSyncDate: 1,
                        syncStatus: 1
                    },
                    $set: {
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );
            console.log(`✅ Reset PWA user account fields`);
        }

        // Reset marketing user data if exists
        if (marketingUser) {
            console.log(`\n📧 Resetting marketing user data...`);
            await MarketingUser.updateOne(
                { _id: marketingUser._id },
                { 
                    $unset: { 
                        lastLoginDate: 1,
                        verificationToken: 1,
                        resetPasswordToken: 1,
                        resetPasswordExpires: 1
                    },
                    $set: {
                        isVerified: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );
            console.log(`✅ Reset marketing user account fields`);
        }

        console.log(`\n🎉 Reset complete!`);
        console.log(`📊 Total items deleted: ${totalDeleted}`);
        console.log(`👤 User accounts preserved but reset`);
        console.log(`🧪 User ${email} now has clean data for testing`);

    } catch (error) {
        console.error(`❌ Error resetting user data:`, error);
    } finally {
        await mongoose.disconnect();
        console.log(`🔌 Disconnected from MongoDB`);
    }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
    console.log(`❌ Usage: node reset-user-data.js <email>`);
    console.log(`📝 Example: node reset-user-data.js pok@gmail.com`);
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    console.log(`❌ Invalid email format: ${email}`);
    process.exit(1);
}

console.log(`🚀 Starting reset for user: ${email}`);
resetUserData(email)
    .then(() => {
        console.log(`✅ Reset completed successfully`);
        process.exit(0);
    })
    .catch((error) => {
        console.error(`❌ Reset failed:`, error);
        process.exit(1);
    });