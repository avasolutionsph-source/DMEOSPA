import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    // Get MongoDB URI with fallback
    const mongoUri = process.env.MONGODB_URI || 
                    process.env.DATABASE_URL || 
                    'mongodb://localhost:27017/ava-solutions';

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      bufferMaxEntries: 0,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 30000
    });
    logger.db(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Database connection error', error);
    logger.info('Continuing in demo mode without MongoDB');
    // Don't exit - continue without database
  }
};

export default connectDB;
