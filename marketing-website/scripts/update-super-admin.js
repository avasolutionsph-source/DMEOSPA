import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const updateSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📊 Connected to MongoDB');

    // Find and update super admin
    const superAdmin = await User.findOne({ role: 'superAdmin' });
    
    if (!superAdmin) {
      console.log('❌ Super admin not found');
      process.exit(1);
    }

    console.log('🔍 Found super admin:', superAdmin.email);
    console.log('📊 Current plan:', superAdmin.subscriptionPlan);

    // Update to new subscription system
    superAdmin.subscriptionPlan = 'pro'; // Super admin gets pro features
    superAdmin.subscriptionStatus = 'active';
    
    await superAdmin.save();
    
    console.log('✅ Super admin updated to pro plan');
    console.log('📧 Email:', superAdmin.email);
    console.log('📋 Plan:', superAdmin.subscriptionPlan);
    console.log('🎯 Status:', superAdmin.subscriptionStatus);

  } catch (error) {
    console.error('❌ Update error:', error);
  } finally {
    mongoose.connection.close();
  }
};

updateSuperAdmin();
