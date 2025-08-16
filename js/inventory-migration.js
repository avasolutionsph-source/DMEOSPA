// Inventory Field Migration
// This script migrates old inventory items from currentStock to quantity field

async function migrateInventoryFields() {
    try {
        // Check if migration has already been done
        const migrationDone = localStorage.getItem('inventoryMigrationV1');
        if (migrationDone === 'completed') {
            console.log('✅ Inventory migration already completed');
            return;
        }

        console.log('🔄 Starting inventory field migration...');
        
        // Initialize database if needed
        if (typeof db === 'undefined' || !db) {
            console.log('⚠️ Database not initialized, skipping migration');
            return;
        }

        // Get all inventory items
        const inventory = await db.getAll('inventory');
        let migratedCount = 0;
        
        for (const item of inventory) {
            let needsUpdate = false;
            
            // If item has currentStock but not quantity, migrate it
            if (item.hasOwnProperty('currentStock') && !item.hasOwnProperty('quantity')) {
                item.quantity = item.currentStock;
                needsUpdate = true;
                console.log(`Migrating ${item.name}: currentStock (${item.currentStock}) -> quantity`);
            }
            // If both exist but don't match, use the currentStock value
            else if (item.hasOwnProperty('currentStock') && item.hasOwnProperty('quantity')) {
                if (item.currentStock !== item.quantity) {
                    // Use currentStock as it's likely the more recent value
                    item.quantity = item.currentStock;
                    needsUpdate = true;
                    console.log(`Updating ${item.name}: quantity set to ${item.currentStock}`);
                }
            }
            // If neither exist, set quantity to 0
            else if (!item.hasOwnProperty('quantity')) {
                item.quantity = 0;
                needsUpdate = true;
                console.log(`Setting ${item.name}: quantity to 0 (was missing)`);
            }
            
            // Remove currentStock field to avoid confusion
            if (item.hasOwnProperty('currentStock')) {
                delete item.currentStock;
                needsUpdate = true;
            }
            
            // Update the item if needed
            if (needsUpdate) {
                item.syncStatus = 'pending'; // Mark for re-sync
                item.modifiedAt = new Date().toISOString();
                await db.update('inventory', item);
                migratedCount++;
            }
        }
        
        // Mark migration as complete
        localStorage.setItem('inventoryMigrationV1', 'completed');
        
        console.log(`✅ Inventory migration completed: ${migratedCount} items updated`);
        
        // If items were migrated, trigger a sync
        if (migratedCount > 0 && typeof window.syncManager !== 'undefined') {
            console.log('🔄 Triggering sync after migration...');
            await window.syncManager.syncInventory();
        }
        
    } catch (error) {
        console.error('❌ Inventory migration failed:', error);
    }
}

// Run migration when database is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for database to be initialized
        setTimeout(migrateInventoryFields, 1000);
    });
} else {
    // DOM already loaded, wait for database
    setTimeout(migrateInventoryFields, 1000);
}
