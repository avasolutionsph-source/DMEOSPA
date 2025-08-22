// Quick script to generate replacements for sync.js console statements

const replacements = [
    // Inventory sync
    {
        old: "console.log(`📦 Found ${allInventory.length} total inventory items for sync`);",
        new: `if (window.logger) {
    window.logger.info('Found inventory items for sync', {
        category: 'SYNC',
        operation: 'inventory_sync_count',
        data: { count: allInventory.length }
    });
} else {
    console.log(\`📦 Found \${allInventory.length} total inventory items for sync\`);
}`
    },
    {
        old: "console.log('⚠️ No inventory items to sync');",
        new: `if (window.logger) {
    window.logger.warn('No inventory items to sync', {
        category: 'SYNC',
        operation: 'inventory_sync_empty'
    });
} else {
    console.log('⚠️ No inventory items to sync');
}`
    },
    {
        old: "console.log('📤 Sending processed inventory:', processedInventory);",
        new: `if (window.logger) {
    window.logger.debug('Sending processed inventory', {
        category: 'SYNC',
        operation: 'inventory_sync_send',
        data: { items: processedInventory }
    });
} else {
    console.log('📤 Sending processed inventory:', processedInventory);
}`
    },
    {
        old: "console.log('✅ Inventory sync successful');",
        new: `if (window.logger) {
    window.logger.info('Inventory sync successful', {
        category: 'SYNC',
        operation: 'inventory_sync_success'
    });
} else {
    console.log('✅ Inventory sync successful');
}`
    },
    {
        old: "console.log('✅ All inventory items marked as synced');",
        new: `if (window.logger) {
    window.logger.info('All inventory items marked as synced', {
        category: 'SYNC',
        operation: 'inventory_mark_synced'
    });
} else {
    console.log('✅ All inventory items marked as synced');
}`
    },
    {
        old: "console.error('❌ Inventory sync failed:', response.status, errorText);",
        new: `if (window.logger) {
    window.logger.error('Inventory sync failed', {
        category: 'SYNC',
        operation: 'inventory_sync_error',
        error: { status: response.status, message: errorText }
    });
} else {
    console.error('❌ Inventory sync failed:', response.status, errorText);
}`
    }
];

module.exports = replacements;