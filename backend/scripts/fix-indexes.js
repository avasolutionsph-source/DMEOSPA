import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const collection = db.collection('employees');
        
        // List current indexes
        console.log('\n📋 Current indexes:');
        const indexes = await collection.indexes();
        indexes.forEach(index => {
            console.log('  -', index.name, ':', JSON.stringify(index.key));
        });
        
        // Drop the problematic index if it exists
        try {
            await collection.dropIndex('userId_1_localId_1');
            console.log('\n✅ Dropped problematic index: userId_1_localId_1');
        } catch (error) {
            if (error.code === 27) {
                console.log('\n⚠️  Index userId_1_localId_1 not found (already removed)');
            } else {
                console.log('\n❌ Error dropping index:', error.message);
            }
        }
        
        // Also drop the duplicate email index if exists
        try {
            await collection.dropIndex('unique_employee_email_per_branch');
            console.log('✅ Dropped duplicate email index');
        } catch (error) {
            // Index might not exist, that's ok
        }
        
        console.log('\n✨ Index cleanup complete!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

fixIndexes();