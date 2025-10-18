/**
 * Fix Customer Collection - Remove incorrect unique index on userId
 *
 * Problem: MongoDB has a unique index on userId field alone
 * This prevents adding multiple customers under same business owner
 *
 * This script:
 * 1. Connects to MongoDB
 * 2. Drops the incorrect unique index on userId
 * 3. Verifies correct indexes remain
 *
 * Run with: node backend/scripts/fix-customer-unique-index.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

async function fixCustomerIndexes() {
    try {
        console.log('🔧 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const customersCollection = db.collection('customers');

        // 1. List all current indexes
        console.log('\n📋 Current indexes on customers collection:');
        const indexes = await customersCollection.indexes();
        indexes.forEach(index => {
            console.log('  -', JSON.stringify(index.name), ':', JSON.stringify(index.key),
                       index.unique ? '[UNIQUE]' : '');
        });

        // 2. Find and drop the problematic unique index on userId
        const problematicIndexes = indexes.filter(index =>
            index.unique &&
            Object.keys(index.key).length === 1 &&
            index.key.userId === 1
        );

        if (problematicIndexes.length > 0) {
            console.log('\n⚠️  Found problematic unique index on userId alone:');
            problematicIndexes.forEach(index => {
                console.log('  -', index.name);
            });

            for (const index of problematicIndexes) {
                console.log(`\n🗑️  Dropping index: ${index.name}...`);
                await customersCollection.dropIndex(index.name);
                console.log(`✅ Successfully dropped index: ${index.name}`);
            }
        } else {
            console.log('\n✅ No problematic unique index found on userId');
        }

        // 3. Verify the correct compound index exists
        const correctIndex = indexes.find(index =>
            index.unique &&
            index.key.userId === 1 &&
            index.key.localId === 1
        );

        if (correctIndex) {
            console.log('\n✅ Correct compound unique index exists:', correctIndex.name);
            console.log('   Index:', JSON.stringify(correctIndex.key));
        } else {
            console.log('\n⚠️  Correct compound unique index not found');
            console.log('   Creating index: { userId: 1, localId: 1 } [unique, sparse]');
            await customersCollection.createIndex(
                { userId: 1, localId: 1 },
                { unique: true, sparse: true }
            );
            console.log('✅ Created compound unique index');
        }

        // 4. List final indexes
        console.log('\n📋 Final indexes on customers collection:');
        const finalIndexes = await customersCollection.indexes();
        finalIndexes.forEach(index => {
            console.log('  -', JSON.stringify(index.name), ':', JSON.stringify(index.key),
                       index.unique ? '[UNIQUE]' : '');
        });

        console.log('\n✅ Customer collection indexes fixed successfully!');
        console.log('\n💡 You can now add multiple customers under the same business owner');

    } catch (error) {
        console.error('\n❌ Error fixing customer indexes:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the fix
fixCustomerIndexes();
