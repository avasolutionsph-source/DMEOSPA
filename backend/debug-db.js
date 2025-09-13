import mongoose from 'mongoose';
import Product from './models/Product.js';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions';

async function debugDatabase() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        // Check all collections
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('\n📂 Available Collections:');
        collections.forEach(col => {
            console.log(`  - ${col.name}`);
        });

        // The logged-in user ID from browser console
        const userId = '6708a6e6b5a00c09e2af8b5d';

        console.log(`\n🔍 Checking Products for user: ${userId}`);
        const products = await Product.find({ userId: userId });
        console.log(`Found ${products.length} products:`);
        products.forEach(product => {
            console.log(`  - ${product.name} (₱${product.price}, ${product.category}, showInPOS: ${product.showInPOS})`);
        });

        console.log('\n🔍 Checking ALL Products (all users):');
        const allProducts = await Product.find({}).limit(20);
        console.log(`Found ${allProducts.length} total products:`);
        allProducts.forEach(product => {
            console.log(`  - ${product.name} (₱${product.price}, User: ${product.userId}, showInPOS: ${product.showInPOS})`);
        });

        // Check if there are other collections that might contain services
        console.log('\n🔍 Checking for other possible service collections...');
        
        try {
            const services = await db.collection('services').find({}).toArray();
            console.log(`Found ${services.length} items in 'services' collection:`);
            services.forEach(service => {
                console.log(`  - ${service.name || 'Unknown'} (${service.category || 'No category'})`);
            });
        } catch (error) {
            console.log('No services collection found');
        }

        try {
            const items = await db.collection('items').find({}).toArray();
            console.log(`Found ${items.length} items in 'items' collection:`);
            items.forEach(item => {
                console.log(`  - ${item.name || 'Unknown'} (${item.category || 'No category'})`);
            });
        } catch (error) {
            console.log('No items collection found');
        }

        console.log('\n✅ Database debug completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error debugging database:', error);
        process.exit(1);
    }
}

// Run the debugging
debugDatabase();