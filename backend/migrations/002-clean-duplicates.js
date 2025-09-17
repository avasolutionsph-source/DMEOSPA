import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATION_NAME = '002-clean-duplicates';

async function up() {
  console.log(`🔄 Running migration: ${MIGRATION_NAME} - UP`);
  
  const db = mongoose.connection.db;
  const results = {
    employees: { found: 0, removed: 0 },
    transactions: { found: 0, removed: 0 },
    customers: { found: 0, removed: 0 }
  };
  
  try {
    // 1. Remove duplicate employees (keep the oldest/first one)
    console.log('\n🔍 Finding duplicate employees...');
    const duplicateEmployees = await db.collection('employees').aggregate([
      {
        $group: {
          _id: {
            userId: '$userId',
            firstName: '$firstName',
            lastName: '$lastName'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          dates: { $push: '$createdAt' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    results.employees.found = duplicateEmployees.length;
    
    for (const group of duplicateEmployees) {
      // Sort by creation date and keep the oldest (first created)
      const sorted = group.ids
        .map((id, i) => ({ id, date: group.dates[i] || new Date(0) }))
        .sort((a, b) => a.date - b.date);
      
      // Keep the first one, delete the rest
      const toDelete = sorted.slice(1).map(item => item.id);
      
      if (toDelete.length > 0) {
        const deleteResult = await db.collection('employees').deleteMany({ 
          _id: { $in: toDelete } 
        });
        results.employees.removed += deleteResult.deletedCount;
        
        console.log(`  Removed ${toDelete.length} duplicates for: ${group._id.firstName} ${group._id.lastName}`);
      }
    }
    
    // 2. Remove duplicate transactions (same user, same time, same total)
    console.log('\n🔍 Finding duplicate transactions...');
    const duplicateTransactions = await db.collection('transactions').aggregate([
      {
        $group: {
          _id: {
            userId: '$userId',
            total: '$total',
            createdAt: '$createdAt'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    results.transactions.found = duplicateTransactions.length;
    
    for (const group of duplicateTransactions) {
      // Keep the first transaction, delete the rest
      const toDelete = group.ids.slice(1);
      
      if (toDelete.length > 0) {
        const deleteResult = await db.collection('transactions').deleteMany({ 
          _id: { $in: toDelete } 
        });
        results.transactions.removed += deleteResult.deletedCount;
        
        console.log(`  Removed ${toDelete.length} duplicate transactions for total: ${group._id.total}`);
      }
    }
    
    // 3. Remove duplicate customers (same email for same user)
    console.log('\n🔍 Finding duplicate customers...');
    const duplicateCustomers = await db.collection('customers').aggregate([
      {
        $match: { 
          email: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            email: '$email'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          dates: { $push: '$createdAt' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    results.customers.found = duplicateCustomers.length;
    
    for (const group of duplicateCustomers) {
      // Keep the oldest customer record
      const sorted = group.ids
        .map((id, i) => ({ id, date: group.dates[i] || new Date(0) }))
        .sort((a, b) => a.date - b.date);
      
      const toDelete = sorted.slice(1).map(item => item.id);
      
      if (toDelete.length > 0) {
        const deleteResult = await db.collection('customers').deleteMany({ 
          _id: { $in: toDelete } 
        });
        results.customers.removed += deleteResult.deletedCount;
        
        console.log(`  Removed ${toDelete.length} duplicates for email: ${group._id.email}`);
      }
    }
    
    // 4. Generate transaction IDs for transactions without them
    console.log('\n🔍 Adding transaction IDs to records without them...');
    const txnsWithoutId = await db.collection('transactions').find({
      $or: [
        { transactionId: null },
        { transactionId: { $exists: false } }
      ]
    }).toArray();
    
    let updatedCount = 0;
    for (const txn of txnsWithoutId) {
      const newId = `txn_${txn._id}_${Date.now()}`;
      await db.collection('transactions').updateOne(
        { _id: txn._id },
        { $set: { transactionId: newId } }
      );
      updatedCount++;
    }
    
    // Print summary
    console.log('\n📊 Cleanup Summary:');
    console.log('  Employees:');
    console.log(`    - Groups with duplicates: ${results.employees.found}`);
    console.log(`    - Records removed: ${results.employees.removed}`);
    console.log('  Transactions:');
    console.log(`    - Groups with duplicates: ${results.transactions.found}`);
    console.log(`    - Records removed: ${results.transactions.removed}`);
    console.log('  Customers:');
    console.log(`    - Groups with duplicates: ${results.customers.found}`);
    console.log(`    - Records removed: ${results.customers.removed}`);
    console.log('  Transaction IDs:');
    console.log(`    - Generated for: ${updatedCount} records`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log(`🔄 Running migration: ${MIGRATION_NAME} - DOWN`);
  console.log('⚠️ Warning: Cannot restore deleted duplicate records');
  console.log('This is a data cleanup migration - rollback not available');
  
  // Remove generated transaction IDs only
  const db = mongoose.connection.db;
  
  try {
    const result = await db.collection('transactions').updateMany(
      { transactionId: /^txn_.*_\d+$/ },
      { $unset: { transactionId: 1 } }
    );
    
    console.log(`✅ Removed ${result.modifiedCount} generated transaction IDs`);
    return { removedTransactionIds: result.modifiedCount };
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Main execution
async function runMigration(direction = 'up') {
  let connection;
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    connection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ava-solutions');
    console.log('✅ Connected to MongoDB');
    
    // Run migration
    const results = direction === 'up' ? await up() : await down();
    
    console.log(`\n✅ Migration ${MIGRATION_NAME} completed successfully (${direction})`);
    return results;
    
  } catch (error) {
    console.error(`\n❌ Migration ${MIGRATION_NAME} failed:`, error.message);
    throw error;
    
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// CLI execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const direction = process.argv[2] || 'up';
  
  if (!['up', 'down'].includes(direction)) {
    console.error('Usage: node 002-clean-duplicates.js [up|down]');
    process.exit(1);
  }
  
  runMigration(direction)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { up, down, runMigration };