import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    // Get MongoDB URI with fallback
    const mongoUri = process.env.MONGODB_URI || 
                    process.env.DATABASE_URL || 
                    'mongodb://localhost:27017/ava-solutions';

    const conn = await mongoose.connect(mongoUri);
    logger.db(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Database connection error', error);
    logger.info('Continuing in demo mode without MongoDB');
    // Don't exit - continue without database
  }
};

export default connectDB;
