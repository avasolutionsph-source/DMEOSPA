import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import Employee from './models/Employee.js';
import Customer from './models/Customer.js';
import User from './models/User.js';

dotenv.config();

async function auditDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Database Audit Started\n');
    
    const issues = [];
    const duplicates = [];
    
    // 1. Check for duplicate transactions (same user, same time, same total)
    console.log('🔍 Checking for duplicate transactions...');
    const duplicateTxns = await Transaction.aggregate([
      {
        $group: {
          _id: {
            userId: '$userId',
            total: '$total',
            date: { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$createdAt' } }
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicateTxns.length > 0) {
      duplicates.push({
        type: 'Transactions',
        count: duplicateTxns.length,
        details: duplicateTxns.slice(0, 5) // First 5 examples
      });
    }
    
    // 2. Check for missing transactionId (idempotency key)
    const txnsWithoutId = await Transaction.countDocuments({ 
      $or: [
        { transactionId: null },
        { transactionId: { $exists: false } }
      ]
    });
    
    if (txnsWithoutId > 0) {
      issues.push({
        severity: 'HIGH',
        issue: 'Missing idempotency keys',
        count: txnsWithoutId,
        fix: 'Generate unique transactionId for each transaction'
      });
    }
    
    // 3. Check for duplicate employees (same name and userId)
    console.log('🔍 Checking for duplicate employees...');
    const duplicateEmps = await Employee.aggregate([
      {
        $group: {
          _id: {
            userId: '$userId',
            firstName: '$firstName',
            lastName: '$lastName'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicateEmps.length > 0) {
      duplicates.push({
        type: 'Employees',
        count: duplicateEmps.length,
        details: duplicateEmps.slice(0, 5)
      });
    }
    
    // 4. Check for duplicate customers (same email and userId)
    console.log('🔍 Checking for duplicate customers...');
    const duplicateCusts = await Customer.aggregate([
      {
        $match: { email: { $ne: null, $exists: true } }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            email: '$email'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicateCusts.length > 0) {
      duplicates.push({
        type: 'Customers',
        count: duplicateCusts.length,
        details: duplicateCusts.slice(0, 5)
      });
    }
    
    // 5. Check index health
    console.log('🔍 Checking indexes...');
    const collections = ['transactions', 'employees', 'customers', 'users'];
    for (const coll of collections) {
      const indexes = await mongoose.connection.collection(coll).indexes();
      const uniqueIndexes = indexes.filter(idx => idx.unique);
      console.log(`  ${coll}: ${indexes.length} total, ${uniqueIndexes.length} unique`);
    }
    
    // 6. Check for orphaned records
    const orphanedTransactions = await Transaction.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $match: { user: { $size: 0 } }
      },
      {
        $count: 'orphaned'
      }
    ]);
    
    if (orphanedTransactions.length > 0) {
      issues.push({
        severity: 'MEDIUM',
        issue: 'Orphaned transactions',
        count: orphanedTransactions[0].orphaned,
        fix: 'Clean up or associate with valid users'
      });
    }
    
    // Generate Report
    console.log('\n' + '='.repeat(50));
    console.log('📊 DATABASE AUDIT REPORT');
    console.log('='.repeat(50));
    
    // Verdict
    const hasHighSeverity = issues.some(i => i.severity === 'HIGH');
    const hasDuplicates = duplicates.length > 0;
    const verdict = (!hasHighSeverity && !hasDuplicates) ? 'PASS ✅' : 'FAIL ❌';
    
    console.log(`\n🎯 VERDICT: ${verdict}`);
    
    // Issues
    if (issues.length > 0) {
      console.log('\n⚠️ ISSUES FOUND:');
      issues.forEach(issue => {
        console.log(`\n[${issue.severity}] ${issue.issue}`);
        console.log(`  Count: ${issue.count}`);
        console.log(`  Fix: ${issue.fix}`);
      });
    }
    
    // Duplicates
    if (duplicates.length > 0) {
      console.log('\n🔄 DUPLICATE DATA:');
      duplicates.forEach(dup => {
        console.log(`\n${dup.type}: ${dup.count} groups with duplicates`);
        if (dup.details.length > 0) {
          console.log('  First example:', JSON.stringify(dup.details[0], null, 2));
        }
      });
    }
    
    // Collection Stats
    console.log('\n📈 COLLECTION STATS:');
    console.log(`  Transactions: ${await Transaction.countDocuments()}`);
    console.log(`  Employees: ${await Employee.countDocuments()}`);
    console.log(`  Customers: ${await Customer.countDocuments()}`);
    console.log(`  Users: ${await User.countDocuments()}`);
    
    return { verdict, issues, duplicates };
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// Migration Scripts
const migrations = {
  // Add transactionId to all transactions without one
  addTransactionIds: {
    up: async () => {
      const txns = await Transaction.find({
        $or: [
          { transactionId: null },
          { transactionId: { $exists: false } }
        ]
      });
      
      for (const txn of txns) {
        txn.transactionId = `txn_${txn._id}_${Date.now()}`;
        await txn.save();
      }
      
      return `Updated ${txns.length} transactions with unique IDs`;
    },
    down: async () => {
      await Transaction.updateMany(
        { transactionId: /^txn_/ },
        { $unset: { transactionId: 1 } }
      );
      return 'Removed generated transaction IDs';
    }
  },
  
  // Remove duplicate employees (keep newest)
  removeDuplicateEmployees: {
    up: async () => {
      const duplicates = await Employee.aggregate([
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
      ]);
      
      let removedCount = 0;
      for (const group of duplicates) {
        // Sort by date and keep the newest
        const sorted = group.ids.map((id, i) => ({ id, date: group.dates[i] }))
          .sort((a, b) => b.date - a.date);
        
        // Delete all but the newest
        const toDelete = sorted.slice(1).map(item => item.id);
        await Employee.deleteMany({ _id: { $in: toDelete } });
        removedCount += toDelete.length;
      }
      
      return `Removed ${removedCount} duplicate employees`;
    },
    down: async () => {
      return 'Cannot restore deleted duplicates';
    }
  }
};

// Run audit if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  auditDatabase()
    .then(result => {
      if (result.issues.length > 0 || result.duplicates.length > 0) {
        console.log('\n📝 SUGGESTED MIGRATIONS:');
        console.log('  1. Run: node db-audit.js migrate:addTransactionIds');
        console.log('  2. Run: node db-audit.js migrate:removeDuplicateEmployees');
      }
      process.exit(result.verdict === 'PASS ✅' ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

// Handle migration commands
if (process.argv[2] && process.argv[2].startsWith('migrate:')) {
  const migrationName = process.argv[2].split(':')[1];
  const direction = process.argv[3] || 'up';
  
  if (migrations[migrationName] && migrations[migrationName][direction]) {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => migrations[migrationName][direction]())
      .then(result => {
        console.log('✅ Migration complete:', result);
        return mongoose.connection.close();
      })
      .then(() => process.exit(0))
      .catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
      });
  } else {
    console.error(`Unknown migration: ${migrationName}:${direction}`);
    process.exit(1);
  }
}

export { auditDatabase, migrations };