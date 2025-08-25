import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const cleanupSampleUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📊 Connected to MongoDB');

    // List of sample user emails to remove
    const sampleEmails = [
      'spa1@example.com',
      'spa2@example.com', 
      'spa3@example.com',
      'dsadas@gmail.com', // This looks like test data too
      'dsa@gmail.com',    // Alternative spelling
      // Add any other test emails you want to remove
    ];

    console.log('🔍 Looking for sample users to remove...');
    
    // Find sample users
    const sampleUsers = await User.find({ 
      email: { $in: sampleEmails },
      role: { $ne: 'superAdmin' } // Don't accidentally delete super admin
    });

    if (sampleUsers.length === 0) {
      console.log('✅ No sample users found to remove');
      process.exit(0);
    }

    console.log(`📋 Found ${sampleUsers.length} sample users:`);
    sampleUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.businessName}) - ${user.subscriptionPlan}`);
    });

    // Remove sample users
    const result = await User.deleteMany({ 
      email: { $in: sampleEmails },
      role: { $ne: 'superAdmin' } // Safety check
    });

    console.log(`🗑️  Removed ${result.deletedCount} sample users`);
    
    // Show remaining users
    const remainingUsers = await User.find({}).select('email businessName role subscriptionPlan');
    console.log(`\n👥 Remaining users in database:`);
    remainingUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.subscriptionPlan}`);
    });

    console.log('\n🎉 Database cleanup completed!');

  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    mongoose.connection.close();
  }
};

cleanupSampleUsers();
