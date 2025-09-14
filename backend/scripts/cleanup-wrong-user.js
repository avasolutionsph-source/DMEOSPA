import mongoose from 'mongoose';
import Product from './models/Product.js';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions';

async function cleanupWrongUser() {
    try {
        console.log('🧹 Connecting to MongoDB to clean up...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        // The WRONG user ID that has the old services
        const wrongUserId = '68c21c728d8e77ab71c2e8e2';
        
        // The CORRECT logged-in user ID
        const correctUserId = '6708a6e6b5a00c09e2af8b5d';

        console.log(`🔍 Finding products for WRONG user: ${wrongUserId}`);
        const wrongUserProducts = await Product.find({ userId: wrongUserId });
        console.log(`Found ${wrongUserProducts.length} products to delete:`);
        wrongUserProducts.forEach(product => {
            console.log(`  - ${product.name} (₱${product.price})`);
        });

        console.log(`\n🗑️ Deleting all products for wrong user...`);
        const deleteResult = await Product.deleteMany({ userId: wrongUserId });
        console.log(`✅ Deleted ${deleteResult.deletedCount} products from wrong user`);

        console.log(`\n✅ Verifying correct user products still exist:`);
        const correctUserProducts = await Product.find({ userId: correctUserId });
        console.log(`Found ${correctUserProducts.length} products for correct user:`);
        correctUserProducts.forEach(product => {
            console.log(`  - ${product.name} (₱${product.price}, ${product.category})`);
        });

        console.log('\n🎉 Cleanup completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Run the cleanup
cleanupWrongUser();