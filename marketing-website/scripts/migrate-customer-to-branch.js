import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Migration script to update all users with role 'customer' to 'branch'

async function migrateCustomerToBranch() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/daet_spa';
    await mongoose.connect(mongoUri);
    console.log('📊 Connected to MongoDB for migration');

    // Find all users with role 'customer'
    const customersToUpdate = await User.find({ role: 'customer' });
    
    if (customersToUpdate.length === 0) {
      console.log('✅ No users with role "customer" found. Migration not needed.');
      await mongoose.disconnect();
      return;
    }

    console.log(`🔄 Found ${customersToUpdate.length} users with role "customer" to migrate to "branch"`);

    // Update all customer roles to branch
    const result = await User.updateMany(
      { role: 'customer' },
      { $set: { role: 'branch' } }
    );

    console.log(`✅ Migration completed successfully!`);
    console.log(`📈 Updated ${result.modifiedCount} users from "customer" to "branch" role`);

    // Verify the migration
    const branchUsers = await User.countDocuments({ role: 'branch' });
    const remainingCustomers = await User.countDocuments({ role: 'customer' });
    
    console.log(`\n📊 Post-migration stats:`);
    console.log(`   Branch users: ${branchUsers}`);
    console.log(`   Customer users (should be 0): ${remainingCustomers}`);
    
    if (remainingCustomers > 0) {
      console.log('⚠️  Warning: Some customer users still exist. Please check manually.');
    } else {
      console.log('🎉 Migration successful - all customer roles updated to branch!');
    }

    await mongoose.disconnect();
    console.log('📊 Database connection closed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
console.log('🚀 Starting customer-to-branch role migration...');
migrateCustomerToBranch();