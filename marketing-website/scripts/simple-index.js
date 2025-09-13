#!/usr/bin/env node

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/daet-spa';

async function createIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await Booking.collection.createIndex(
      { therapistId: 1, appointmentDate: 1, startTime: 1, status: 1 }, 
      { 
        unique: true,
        partialFilterExpression: { status: { $in: ['pending', 'confirmed', 'in-progress'] } },
        name: 'prevent_double_bookings'
      }
    );

    console.log('✅ Created unique index to prevent double bookings');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createIndex();