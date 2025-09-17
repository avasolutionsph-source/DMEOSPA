import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATION_NAME = '001-add-unique-constraints';

async function up() {
  console.log(`🔄 Running migration: ${MIGRATION_NAME} - UP`);
  
  const db = mongoose.connection.db;
  const results = [];
  
  try {
    // 1. Add compound unique index to prevent duplicate employees
    console.log('Creating unique index for employees...');
    try {
      await db.collection('employees').createIndex(
        { userId: 1, firstName: 1, lastName: 1 },
        { 
          unique: true,
          name: 'prevent_duplicate_employees',
          background: true
        }
      );
      results.push('✅ Employee unique index created');
    } catch (error) {
      if (error.code === 11000) {
        console.warn('⚠️ Duplicate employees exist - clean them first');
        results.push('⚠️ Employee index skipped - duplicates exist');
      } else if (error.codeName === 'IndexOptionsConflict') {
        results.push('ℹ️ Employee unique index already exists');
      } else {
        throw error;
      }
    }
    
    // 2. Add compound unique index to prevent duplicate transactions
    console.log('Creating unique index for transactions...');
    try {
      // Create a unique index based on multiple fields to prevent exact duplicates
      await db.collection('transactions').createIndex(
        { 
          userId: 1, 
          total: 1,
          createdAt: 1,
          'items.0.productId': 1  // First item as part of uniqueness
        },
        { 
          unique: true,
          name: 'prevent_duplicate_transactions',
          background: true,
          partialFilterExpression: { 
            transactionId: { $exists: false } // Only for records without transactionId
          }
        }
      );
      results.push('✅ Transaction unique index created');
    } catch (error) {
      if (error.codeName === 'IndexOptionsConflict') {
        results.push('ℹ️ Transaction unique index already exists');
      } else if (error.code === 11000) {
        results.push('⚠️ Transaction index skipped - duplicates exist');
      } else {
        throw error;
      }
    }
    
    // 3. Add unique index for customer email per user
    console.log('Creating unique index for customers...');
    try {
      await db.collection('customers').createIndex(
        { userId: 1, email: 1 },
        { 
          unique: true,
          sparse: true, // Allow null emails
          name: 'prevent_duplicate_customers',
          background: true,
          partialFilterExpression: { 
            email: { $exists: true, $ne: null, $ne: '' }
          }
        }
      );
      results.push('✅ Customer unique index created');
    } catch (error) {
      if (error.codeName === 'IndexOptionsConflict') {
        results.push('ℹ️ Customer unique index already exists');
      } else if (error.code === 11000) {
        results.push('⚠️ Customer index skipped - duplicates exist');
      } else {
        throw error;
      }
    }
    
    // 4. Ensure transactionId is indexed properly
    console.log('Verifying transaction ID index...');
    const txIndexes = await db.collection('transactions').indexes();
    const hasTransactionIdIndex = txIndexes.some(idx => 
      idx.key && idx.key.transactionId === 1
    );
    
    if (!hasTransactionIdIndex) {
      await db.collection('transactions').createIndex(
        { transactionId: 1 },
        { 
          unique: true,
          sparse: true,
          name: 'transactionId_unique',
          background: true
        }
      );
      results.push('✅ Transaction ID index created');
    } else {
      results.push('ℹ️ Transaction ID index already exists');
    }
    
    console.log('\n📊 Migration Results:');
    results.forEach(result => console.log(`  ${result}`));
    
    return results;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log(`🔄 Running migration: ${MIGRATION_NAME} - DOWN`);
  
  const db = mongoose.connection.db;
  const results = [];
  
  try {
    // Remove the indexes we created
    const indexesToDrop = [
      'prevent_duplicate_employees',
      'prevent_duplicate_transactions',
      'prevent_duplicate_customers',
      'transactionId_unique'
    ];
    
    for (const indexName of indexesToDrop) {
      try {
        const collection = indexName.includes('employee') ? 'employees' :
                          indexName.includes('transaction') ? 'transactions' :
                          indexName.includes('customer') ? 'customers' : 'transactions';
        
        await db.collection(collection).dropIndex(indexName);
        results.push(`✅ Dropped index: ${indexName}`);
      } catch (error) {
        if (error.codeName === 'IndexNotFound') {
          results.push(`ℹ️ Index ${indexName} not found (already removed)`);
        } else {
          results.push(`⚠️ Failed to drop ${indexName}: ${error.message}`);
        }
      }
    }
    
    console.log('\n📊 Rollback Results:');
    results.forEach(result => console.log(`  ${result}`));
    
    return results;
    
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
    console.log('✅ Connected to MongoDB\n');
    
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
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// CLI execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const direction = process.argv[2] || 'up';
  
  if (!['up', 'down'].includes(direction)) {
    console.error('Usage: node 001-add-unique-constraints.js [up|down]');
    process.exit(1);
  }
  
  runMigration(direction)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { up, down, runMigration };