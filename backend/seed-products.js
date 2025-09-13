import mongoose from 'mongoose';
import Product from './models/Product.js';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions';

async function seedProducts() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully');

        // The user ID from the logs
        const userId = '6708a6e6b5a00c09e2af8b5d';

        // Sample products to create
        const products = [
            {
                userId: userId,
                localId: 'seed_swedish_massage',
                name: 'Swedish Massage',
                type: 'service',
                category: 'massage',
                price: 800,
                duration: 60,
                description: 'Relaxing full body massage',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: userId,
                localId: 'seed_facial_treatment',
                name: 'Facial Treatment',
                type: 'service',
                category: 'facial',
                price: 700,
                duration: 45,
                description: 'Rejuvenating facial treatment',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: userId,
                localId: 'seed_body_scrub',
                name: 'Body Scrub',
                type: 'service',
                category: 'wellness',
                price: 600,
                duration: 30,
                description: 'Exfoliating body treatment',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: userId,
                localId: 'seed_manicure',
                name: 'Manicure',
                type: 'service',
                category: 'nails',
                price: 350,
                duration: 30,
                description: 'Professional nail care',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: userId,
                localId: 'seed_deep_tissue',
                name: 'Deep Tissue Massage',
                type: 'service',
                category: 'massage',
                price: 900,
                duration: 90,
                description: 'Therapeutic deep tissue massage',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: userId,
                localId: 'seed_pedicure',
                name: 'Pedicure',
                type: 'service',
                category: 'nails',
                price: 400,
                duration: 45,
                description: 'Professional foot care treatment',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            }
        ];

        console.log('Creating products...');
        
        // Remove existing products for this user to avoid duplicates
        await Product.deleteMany({ userId: userId });
        console.log('Cleared existing products for user');

        // Insert new products
        const results = await Product.insertMany(products);
        console.log(`✅ Successfully created ${results.length} products:`);
        
        results.forEach(product => {
            console.log(`  - ${product.name} (₱${product.price}, ${product.duration}min, ${product.category})`);
        });

        console.log('Products seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding products:', error);
        process.exit(1);
    }
}

// Run the seeding
seedProducts();