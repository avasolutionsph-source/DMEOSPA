import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('\nClearing collections:');
    
    // Clear each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
      console.log(`✓ ${collectionName}: Deleted ${result.deletedCount} documents`);
    }

    console.log('\n✅ Database cleared successfully!');
    
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

clearDatabase();