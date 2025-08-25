import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log('⚠️  MONGO_URI not found in environment variables');
      console.log('📝 Running in demo mode without MongoDB');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('📝 Continuing in demo mode without MongoDB');
    // Don't exit - continue without database
  }
};

export default connectDB;
