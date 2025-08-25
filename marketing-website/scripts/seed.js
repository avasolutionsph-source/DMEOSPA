import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const seedSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📊 Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ role: 'superAdmin' });
    if (existingAdmin) {
      console.log('✅ Super Admin already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create super admin user (YOU - Platform Owner)
    const superAdmin = new User({
      email: 'avasolutionsph@gmail.com', // Your email
      password: 'Ava12345', // Your password
      firstName: 'Platform',
      lastName: 'Owner',
      businessName: 'Ava Solutions Platform',
      role: 'superAdmin', // Platform super admin - controls everything
      subscriptionPlan: 'pro', // Super admin gets pro features
      subscriptionStatus: 'active'
    });

    await superAdmin.save();
    console.log('🎉 Super Admin created successfully!');
    console.log('📧 Email:', superAdmin.email);
    console.log('👑 Role:', superAdmin.role);
    console.log('🔗 Login at: http://localhost:3000/admin');

    // No sample users - only create super admin
    console.log('📝 Only super admin created. Real users will register through the website.');

    console.log('\n🎊 Database seeded successfully!');
    console.log('\n🔐 Login credentials:');
    console.log('Email: avasolutionsph@gmail.com');
    console.log('Password: Ava12345');
    console.log('\n🌐 Admin Panel: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedSuperAdmin();
