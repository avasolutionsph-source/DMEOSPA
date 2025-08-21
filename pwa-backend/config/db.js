import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      logger.warn('MONGODB_URI not found in environment variables');
      logger.info('Running in demo mode without MongoDB');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
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
