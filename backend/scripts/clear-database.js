/**
 * Database Clear Script
 *
 * Safely clears all MongoDB collections for testing from scratch
 *
 * SUPER ADMIN LOGIN (hardcoded - will auto-recreate on login):
 * Email: avasolutionsph@gmail.com
 * Password: Ava12345
 *
 * HOW TO RUN:
 * cd backend
 * node scripts/clear-database.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function clearDatabase() {
  try {
    console.log(`\n${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.cyan}DATABASE CLEAR SCRIPT${colors.reset}`);
    console.log(`${colors.cyan}========================================${colors.reset}\n`);

    // Connect to MongoDB
    console.log(`${colors.cyan}Connecting to MongoDB...${colors.reset}`);
    await mongoose.connect(process.env.MONGODB_URI);
    const dbName = mongoose.connection.name;
    console.log(`${colors.green}✅ Connected to database: ${dbName}${colors.reset}\n`);

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Show what will be deleted
    console.log(`${colors.yellow}⚠️  WARNING: This will delete ALL data!${colors.reset}\n`);
    console.log(`${colors.yellow}Collections to be cleared (${collectionNames.length} total):${colors.reset}`);
    collectionNames.forEach(name => {
      console.log(`  • ${name}`);
    });

    console.log(`\n${colors.cyan}What will be preserved:${colors.reset}`);
    console.log(`  ${colors.green}✓ Super Admin login (hardcoded):${colors.reset}`);
    console.log(`    Email: avasolutionsph@gmail.com`);
    console.log(`    Password: Ava12345`);
    console.log(`    ${colors.cyan}(Will auto-create on next login)${colors.reset}\n`);

    // Ask for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question(`${colors.red}Type 'DELETE ALL' to confirm (case-sensitive): ${colors.reset}`, (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    if (answer !== 'DELETE ALL') {
      console.log(`\n${colors.yellow}❌ Cancelled - No data was deleted${colors.reset}`);
      await mongoose.disconnect();
      return;
    }

    console.log(`\n${colors.cyan}Clearing collections...${colors.reset}\n`);

    let totalDeleted = 0;

    // Clear each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
      totalDeleted += result.deletedCount;
      console.log(`${colors.green}✓${colors.reset} ${collectionName}: ${colors.magenta}${result.deletedCount}${colors.reset} documents deleted`);
    }

    console.log(`\n${colors.green}========================================${colors.reset}`);
    console.log(`${colors.green}✅ DATABASE CLEARED SUCCESSFULLY!${colors.reset}`);
    console.log(`${colors.green}========================================${colors.reset}`);
    console.log(`${colors.magenta}Total documents deleted: ${totalDeleted}${colors.reset}\n`);

    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`  1. Login as super admin:`);
    console.log(`     ${colors.green}Email: avasolutionsph@gmail.com${colors.reset}`);
    console.log(`     ${colors.green}Password: Ava12345${colors.reset}`);
    console.log(`  2. Or create a new business account via registration\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Error clearing database:${colors.reset}`, error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log(`${colors.cyan}Disconnected from MongoDB${colors.reset}\n`);
  }
}

clearDatabase();