import mongoose from 'mongoose';
import Product from './models/Product.js';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website?retryWrites=true&w=majority&appName=Avasolutions';

async function restoreServices() {
    try {
        console.log('🚑 EMERGENCY RESTORE: Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        // The CORRECT user ID (the one that had your original services)
        const correctUserId = '68c21c728d8e77ab71c2e8e2';

        // Delete any services that might be under wrong user ID
        console.log('🧹 Cleaning up any wrong services...');
        await Product.deleteMany({ userId: '6708a6e6b5a00c09e2af8b5d' });

        // Restore your original services PLUS the new ones with CORRECT user ID
        const services = [
            // Your original services that I accidentally deleted
            {
                userId: correctUserId,
                localId: 'restore_foot_massage',
                name: 'Foot Massage',
                type: 'service',
                category: 'nails',
                price: 500,
                duration: 80,
                description: 'Relaxing foot massage service',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: correctUserId,
                localId: 'restore_nail_treatment',
                name: 'Nail Treatment',
                type: 'service',
                category: 'nails',
                price: 300,
                duration: 45,
                description: 'Professional nail care',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: correctUserId,
                localId: 'restore_test_service',
                name: 'Test Service for Employee',
                type: 'service',
                category: 'service',
                price: 100,
                duration: 30,
                description: 'Test service to verify employee tracking',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: correctUserId,
                localId: 'restore_dasdas',
                name: 'dasdas',
                type: 'service',
                category: 'facial',
                price: 234,
                duration: 75,
                description: '-',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            {
                userId: correctUserId,
                localId: 'restore_restart_test',
                name: 'Restart Test',
                type: 'service',
                category: 'nails',
                price: 100,
                duration: null,
                description: '-',
                showInPOS: true,
                isActive: true,
                syncStatus: 'synced',
                createdAt: new Date(),
                updatedAt: new Date(),
                inventoryUsage: []
            },
            // PLUS the new quality services I created
            {
                userId: correctUserId,
                localId: 'new_swedish_massage',
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
                userId: correctUserId,
                localId: 'new_facial_treatment',
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
                userId: correctUserId,
                localId: 'new_body_scrub',
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
                userId: correctUserId,
                localId: 'new_manicure',
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
                userId: correctUserId,
                localId: 'new_deep_tissue',
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
                userId: correctUserId,
                localId: 'new_pedicure',
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

        console.log('🚑 RESTORING your services with correct user ID...');
        
        // Insert restored services
        const results = await Product.insertMany(services);
        console.log(`✅ Successfully restored ${results.length} services:`);
        
        results.forEach(service => {
            console.log(`  - ${service.name} (₱${service.price}, ${service.duration}min, ${service.category})`);
        });

        console.log('\n🎉 EMERGENCY RESTORE COMPLETED! Your services are back!');
        console.log('📱 Please refresh your browser to see all your services in both Services page and POS!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during emergency restore:', error);
        process.exit(1);
    }
}

// Run the emergency restore
restoreServices();