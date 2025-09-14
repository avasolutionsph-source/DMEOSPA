// Unified Database Migration Script
// Merges data from avasolutions database into ava-marketing-website database

import mongoose from 'mongoose';

const SOURCE_DB = 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/avasolutions?retryWrites=true&w=majority&appName=Avasolutions';
const TARGET_DB = 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions';

async function migrateData() {
  console.log('🚀 Starting Database Migration');
  console.log('='.repeat(50));
  console.log(`📤 Source: avasolutions database`);
  console.log(`📥 Target: ava-marketing-website database`);
  console.log('='.repeat(50));

  let sourceConnection, targetConnection;

  try {
    // Connect to both databases
    console.log('\n🔌 Connecting to databases...');
    sourceConnection = await mongoose.createConnection(SOURCE_DB);
    targetConnection = await mongoose.createConnection(TARGET_DB);
    
    // Wait for connections to be ready
    await sourceConnection.asPromise();
    await targetConnection.asPromise();
    console.log('✅ Connected to both databases');

    // Get database handles
    const sourceDb = sourceConnection.db;
    const targetDb = targetConnection.db;

    // Migrate transactions (most important - your sales data!)
    console.log('\n💰 Migrating transactions...');
    const transactions = await sourceDb.collection('transactions').find({}).toArray();
    console.log(`Found ${transactions.length} transactions to migrate`);
    
    if (transactions.length > 0) {
      // Check for duplicates in target
      const existingTransactionIds = new Set();
      const existingTransactions = await targetDb.collection('transactions').find({}, { projection: { _id: 1 } }).toArray();
      existingTransactions.forEach(t => existingTransactionIds.add(t._id.toString()));
      
      const newTransactions = transactions.filter(t => !existingTransactionIds.has(t._id.toString()));
      
      if (newTransactions.length > 0) {
        await targetDb.collection('transactions').insertMany(newTransactions);
        console.log(`✅ Migrated ${newTransactions.length} new transactions`);
        
        // Show migrated transaction details
        newTransactions.forEach((txn, index) => {
          console.log(`  ${index + 1}. ₱${txn.total} - User: ${txn.userId} - Date: ${new Date(txn.createdAt).toLocaleDateString()}`);
        });
      } else {
        console.log('ℹ️  No new transactions to migrate (all already exist)');
      }
    }

    // Migrate products
    console.log('\n🛍️ Migrating products...');
    const products = await sourceDb.collection('products').find({}).toArray();
    console.log(`Found ${products.length} products to migrate`);
    
    if (products.length > 0) {
      // Check for duplicates
      const existingProductIds = new Set();
      const existingProducts = await targetDb.collection('products').find({}, { projection: { _id: 1 } }).toArray();
      existingProducts.forEach(p => existingProductIds.add(p._id.toString()));
      
      const newProducts = products.filter(p => !existingProductIds.has(p._id.toString()));
      
      if (newProducts.length > 0) {
        await targetDb.collection('products').insertMany(newProducts);
        console.log(`✅ Migrated ${newProducts.length} new products`);
      } else {
        console.log('ℹ️  No new products to migrate (all already exist)');
      }
    }

    // Migrate employees
    console.log('\n👥 Migrating employees...');
    const employees = await sourceDb.collection('employees').find({}).toArray();
    console.log(`Found ${employees.length} employees to migrate`);
    
    if (employees.length > 0) {
      // Check for duplicates
      const existingEmployeeIds = new Set();
      const existingEmployees = await targetDb.collection('employees').find({}, { projection: { _id: 1 } }).toArray();
      existingEmployees.forEach(e => existingEmployeeIds.add(e._id.toString()));
      
      const newEmployees = employees.filter(e => !existingEmployeeIds.has(e._id.toString()));
      
      if (newEmployees.length > 0) {
        await targetDb.collection('employees').insertMany(newEmployees);
        console.log(`✅ Migrated ${newEmployees.length} new employees`);
      } else {
        console.log('ℹ️  No new employees to migrate (all already exist)');
      }
    }

    // Handle user account conflicts carefully
    console.log('\n👤 Checking user accounts...');
    const sourceUsers = await sourceDb.collection('users').find({}).toArray();
    const targetUsers = await targetDb.collection('users').find({}).toArray();
    
    console.log(`Source users: ${sourceUsers.length}`);
    console.log(`Target users: ${targetUsers.length}`);
    
    // Find users that exist in source but not in target (by email)
    const targetUserEmails = new Set(targetUsers.map(u => u.email));
    const usersToMigrate = sourceUsers.filter(u => !targetUserEmails.has(u.email));
    
    if (usersToMigrate.length > 0) {
      console.log(`Found ${usersToMigrate.length} new users to migrate:`);
      usersToMigrate.forEach(user => {
        console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) - Role: ${user.role}`);
      });
      
      await targetDb.collection('users').insertMany(usersToMigrate);
      console.log(`✅ Migrated ${usersToMigrate.length} new users`);
    } else {
      console.log('ℹ️  No new users to migrate');
    }

    // Final verification
    console.log('\n🔍 Post-migration verification...');
    const finalTransactionCount = await targetDb.collection('transactions').countDocuments();
    const finalProductCount = await targetDb.collection('products').countDocuments();
    const finalEmployeeCount = await targetDb.collection('employees').countDocuments();
    const finalUserCount = await targetDb.collection('users').countDocuments();
    
    console.log('\n📊 Final counts in unified database:');
    console.log(`  Users: ${finalUserCount}`);
    console.log(`  Transactions: ${finalTransactionCount}`);
    console.log(`  Products: ${finalProductCount}`);
    console.log(`  Employees: ${finalEmployeeCount}`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Your sales data has been restored to the unified database');
    console.log('✅ All user accounts are now in one place');
    console.log('✅ Business data (products, employees) has been merged');

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    // Close connections
    if (sourceConnection) {
      await sourceConnection.close();
    }
    if (targetConnection) {
      await targetConnection.close();
    }
    console.log('\n🔌 Database connections closed');
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n✨ Migration process completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💀 Migration process failed:', error);
    process.exit(1);
  });