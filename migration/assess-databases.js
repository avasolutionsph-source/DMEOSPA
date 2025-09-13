// Database Assessment Script
// Compares data between both databases to determine migration strategy

import mongoose from 'mongoose';

const databases = {
  avasolutions: 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/avasolutions?retryWrites=true&w=majority&appName=Avasolutions',
  marketing: 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions'
};

async function assessDatabase(dbName, uri) {
  console.log(`\n🔍 Assessing ${dbName} database...`);
  
  try {
    const connection = await mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const db = connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Collections found: ${collections.length}`);
    
    const stats = {};
    
    for (const collection of collections) {
      const collectionName = collection.name;
      try {
        const count = await db.collection(collectionName).countDocuments();
        stats[collectionName] = count;
        console.log(`  📋 ${collectionName}: ${count} documents`);
      } catch (error) {
        console.log(`  ❌ ${collectionName}: Error counting - ${error.message}`);
        stats[collectionName] = 'Error';
      }
    }
    
    // Get sample user data to understand structure
    if (stats.users && stats.users > 0) {
      console.log(`\n👥 Sample users from ${dbName}:`);
      const users = await db.collection('users').find({}).limit(3).toArray();
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} - ${user.firstName} ${user.lastName} (${user.role || 'no-role'}) - Created: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'unknown'}`);
      });
    }
    
    // Get sample transaction data
    if (stats.transactions && stats.transactions > 0) {
      console.log(`\n💰 Sample transactions from ${dbName}:`);
      const transactions = await db.collection('transactions').find({}).limit(3).toArray();
      transactions.forEach((txn, index) => {
        console.log(`  ${index + 1}. Amount: ₱${txn.total || 0} - User: ${txn.userId} - Date: ${txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : 'unknown'}`);
      });
    }
    
    await connection.close();
    return stats;
    
  } catch (error) {
    console.error(`❌ Error assessing ${dbName}:`, error.message);
    return {};
  }
}

async function main() {
  console.log('🚀 Database Assessment for Migration Planning');
  console.log('='.repeat(50));
  
  const results = {};
  
  for (const [dbName, uri] of Object.entries(databases)) {
    results[dbName] = await assessDatabase(dbName, uri);
  }
  
  console.log('\n📋 ASSESSMENT SUMMARY');
  console.log('='.repeat(30));
  
  // Compare collections
  const allCollections = new Set();
  Object.values(results).forEach(stats => {
    Object.keys(stats).forEach(collection => allCollections.add(collection));
  });
  
  console.log('\n📊 Collection Comparison:');
  for (const collection of allCollections) {
    const avaCount = results.avasolutions[collection] || 0;
    const marketingCount = results.marketing[collection] || 0;
    console.log(`  ${collection}:`);
    console.log(`    - avasolutions: ${avaCount}`);
    console.log(`    - marketing: ${marketingCount}`);
    console.log(`    - Total if merged: ${(typeof avaCount === 'number' ? avaCount : 0) + (typeof marketingCount === 'number' ? marketingCount : 0)}`);
  }
  
  console.log('\n🎯 RECOMMENDATION:');
  
  // Determine which database has more data
  const avasolutionsUsers = results.avasolutions.users || 0;
  const marketingUsers = results.marketing.users || 0;
  const avasolutionsTransactions = results.avasolutions.transactions || 0;
  const marketingTransactions = results.marketing.transactions || 0;
  
  if (avasolutionsUsers > marketingUsers && avasolutionsTransactions >= marketingTransactions) {
    console.log('✅ Use "avasolutions" as target database - has more users and transactions');
  } else if (marketingUsers > avasolutionsUsers && marketingTransactions >= avasolutionsTransactions) {
    console.log('✅ Use "ava-marketing-website" as target database - has more users and transactions');
  } else {
    console.log('⚠️  Mixed data distribution - need careful merge strategy');
    console.log('   Consider merging all data into the database with more recent user accounts');
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('💥 Assessment failed:', error);
  process.exit(1);
});