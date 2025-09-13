#!/usr/bin/env node

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/daet-spa';

async function createBookingIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📋 Creating booking indexes to prevent double bookings...');
    
    // Drop existing indexes if they exist (to recreate with correct options)
    try {
      await Booking.collection.dropIndex('prevent_double_bookings');
      console.log('🗑️ Dropped existing prevent_double_bookings index');
    } catch (error) {
      if (error.codeName !== 'IndexNotFound') {
        console.log('⚠️ Could not drop existing index:', error.message);
      }
    }

    // Create the new unique index
    await Booking.collection.createIndex(
      { 
        therapistId: 1, 
        appointmentDate: 1, 
        startTime: 1,
        status: 1
      }, 
      { 
        unique: true,
        partialFilterExpression: { 
          status: { $in: ['pending', 'confirmed', 'in-progress'] } 
        },
        name: 'prevent_double_bookings'
      }
    );

    console.log('✅ Created unique index to prevent double bookings');

    // List all indexes to verify
    const indexes = await Booking.collection.indexes();
    console.log('📋 All booking collection indexes:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) {
        console.log(`     → Unique index with filter: ${JSON.stringify(index.partialFilterExpression)}`);
      }
    });

    // Test the index by trying to create duplicate bookings
    console.log('\n🧪 Testing double booking prevention...');
    
    const testBooking1 = new Booking({
      clientId: new mongoose.Types.ObjectId(),
      clientName: 'Test User 1',
      clientEmail: 'test1@example.com',
      clientPhone: '09123456789',
      branchId: new mongoose.Types.ObjectId(),
      branchName: 'Test Branch',
      serviceId: 'test-service-1',
      serviceName: 'Test Massage',
      serviceDuration: 60,
      servicePrice: 1000,
      serviceCategory: 'Massage',
      therapistId: 'therapist-123',
      therapistName: 'Test Therapist',
      appointmentDate: new Date('2025-12-01'),
      startTime: '14:00',
      endTime: '15:00',
      serviceLocation: 'in-spa',
      status: 'pending'
    });

    await testBooking1.save();
    console.log('✅ Created first test booking');

    // Try to create a duplicate booking (should fail)
    const testBooking2 = new Booking({
      clientId: new mongoose.Types.ObjectId(),
      clientName: 'Test User 2',
      clientEmail: 'test2@example.com',
      clientPhone: '09987654321',
      branchId: new mongoose.Types.ObjectId(),
      branchName: 'Test Branch',
      serviceId: 'test-service-1',
      serviceName: 'Test Massage',
      serviceDuration: 60,
      servicePrice: 1000,
      serviceCategory: 'Massage',
      therapistId: 'therapist-123', // Same therapist
      therapistName: 'Test Therapist',
      appointmentDate: new Date('2025-12-01'), // Same date
      startTime: '14:00', // Same time
      endTime: '15:00',
      serviceLocation: 'in-spa',
      status: 'pending' // Same status
    });

    try {
      await testBooking2.save();
      console.log('❌ ERROR: Duplicate booking was allowed! Index not working.');
    } catch (error) {
      if (error.code === 11000) {
        console.log('✅ SUCCESS: Duplicate booking prevented by database index');
        console.log(`   → Error: ${error.message}`);
      } else {
        console.log('❌ Unexpected error:', error);
      }
    }

    // Clean up test bookings
    await Booking.deleteMany({ 
      clientEmail: { $in: ['test1@example.com', 'test2@example.com'] } 
    });
    console.log('🧹 Cleaned up test bookings');

    console.log('\n🎉 Double booking prevention setup complete!');
    console.log('The system will now prevent race conditions at the database level.');
    
  } catch (error) {
    console.error('❌ Error setting up indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createBookingIndexes();
}

export default createBookingIndexes;