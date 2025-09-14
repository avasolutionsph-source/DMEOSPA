// Complete Database Reset Script
// This will clear ALL data from MongoDB and provide a fresh start

import mongoose from 'mongoose';

const UNIFIED_DB = 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions';

async function resetAllDatabases() {
    console.log('🔥 COMPLETE DATABASE RESET - FRESH START');
    console.log('='.repeat(60));
    console.log('⚠️  WARNING: This will delete ALL data permanently!');
    console.log('='.repeat(60));

    let connection;

    try {
        // Connect to database
        console.log('\n🔌 Connecting to MongoDB Atlas...');
        connection = await mongoose.createConnection(UNIFIED_DB);
        await connection.asPromise();
        console.log('✅ Connected successfully');

        const db = connection.db;

        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log(`\n📋 Found ${collections.length} collections to clear:`);
        collections.forEach((collection, index) => {
            console.log(`  ${index + 1}. ${collection.name}`);
        });

        // Clear each collection
        console.log('\n🗑️ Clearing all collections...');
        let clearedCollections = 0;

        for (const collection of collections) {
            try {
                const result = await db.collection(collection.name).deleteMany({});
                console.log(`  ✅ Cleared ${collection.name}: ${result.deletedCount} documents`);
                clearedCollections++;
            } catch (error) {
                console.log(`  ❌ Failed to clear ${collection.name}: ${error.message}`);
            }
        }

        // Verify all collections are empty
        console.log('\n🔍 Verifying database is empty...');
        for (const collection of collections) {
            const count = await db.collection(collection.name).countDocuments();
            if (count === 0) {
                console.log(`  ✅ ${collection.name}: 0 documents (empty)`);
            } else {
                console.log(`  ⚠️ ${collection.name}: ${count} documents remaining`);
            }
        }

        // Final summary
        console.log('\n📊 RESET SUMMARY:');
        console.log('-'.repeat(40));
        console.log(`Collections found: ${collections.length}`);
        console.log(`Collections cleared: ${clearedCollections}`);
        console.log(`Database: ava-marketing-website`);
        console.log(`Status: ${clearedCollections === collections.length ? 'COMPLETELY EMPTY' : 'PARTIALLY CLEARED'}`);

        if (clearedCollections === collections.length) {
            console.log('\n🎉 DATABASE RESET SUCCESSFUL!');
            console.log('✅ All data has been permanently deleted');
            console.log('✅ You now have a completely fresh database');
            console.log('✅ Ready for new data entry');
        } else {
            console.log('\n⚠️ DATABASE RESET PARTIAL');
            console.log('Some collections may still contain data');
        }

        console.log('\n📋 NEXT STEPS:');
        console.log('1. Refresh your PWA dashboard');
        console.log('2. Clear IndexedDB using the PWA reset tool');
        console.log('3. Start adding new data through the applications');

    } catch (error) {
        console.error('💥 Database reset failed:', error.message);
        console.error(error.stack);
        throw error;
    } finally {
        if (connection) {
            await connection.close();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Safety confirmation
console.log('🚨 DATABASE RESET TOOL 🚨');
console.log('This will permanently delete ALL data from:');
console.log('- Users (all accounts)');
console.log('- Transactions (all sales data)');
console.log('- Products (all services/products)');
console.log('- Employees (all staff data)');
console.log('- Customers (all customer data)');
console.log('- Inventory (all stock data)');
console.log('- Gift Certificates (all gift cards)');
console.log('- Expenses (all expense records)');
console.log('- Attendance (all time tracking)');
console.log('- ALL other business data');
console.log('');
console.log('This action CANNOT be undone!');
console.log('');

// Run reset
resetAllDatabases()
    .then(() => {
        console.log('\n✨ Database reset process completed!');
        console.log('🚀 You now have a fresh start for your business data');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💀 Database reset failed:', error);
        process.exit(1);
    });