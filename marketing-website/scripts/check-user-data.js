import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const checkUserData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📊 Connected to MongoDB');

    // Find kenn@gmail.com user
    const user = await User.findOne({ email: 'kenn@gmail.com' });
    
    if (!user) {
      console.log('❌ User kenn@gmail.com not found');
      process.exit(1);
    }

    console.log('🔍 Found user data for kenn@gmail.com:');
    console.log('📧 Email:', user.email);
    console.log('👤 First Name:', user.firstName);
    console.log('👤 Last Name:', user.lastName);
    console.log('🏢 Business Name:', user.businessName);
    console.log('📋 Subscription Plan:', user.subscriptionPlan);
    console.log('🎯 Status:', user.subscriptionStatus);
    console.log('👑 Role:', user.role);
    console.log('📅 Created:', user.createdAt);
    console.log('📅 Updated:', user.updatedAt);

    // Check if business name is missing or incorrect
    if (!user.businessName || user.businessName === 'Ava Solutions') {
      console.log('\n⚠️  Business name issue detected!');
      console.log('🔧 Fixing business name...');
      
      // Set a proper business name based on email
      user.businessName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName} Business`
        : `${user.email.split('@')[0]} Business`;
      
      await user.save();
      console.log('✅ Updated business name to:', user.businessName);
    }

  } catch (error) {
    console.error('❌ Check error:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkUserData();
