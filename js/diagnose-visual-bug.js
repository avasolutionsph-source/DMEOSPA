// DIAGNOSTIC: Check if Rooms exists but is hidden
console.log('🔍 Diagnosing visual issues...');

(function() {
    function diagnose() {
        console.log('\n=== ROOMS DIAGNOSTIC ===\n');
        
        // 1. Check if Rooms element exists
        const roomsElement = document.querySelector('[data-page="rooms"]');
        
        if (roomsElement) {
            console.log('✅ Rooms element EXISTS in DOM');
            
            // 2. Check visibility
            const styles = window.getComputedStyle(roomsElement);
            console.log('Rooms element styles:');
            console.log('- Display:', styles.display);
            console.log('- Visibility:', styles.visibility);
            console.log('- Opacity:', styles.opacity);
            console.log('- Position:', styles.position);
            console.log('- Width:', styles.width);
            console.log('- Height:', styles.height);
            console.log('- Overflow:', styles.overflow);
            console.log('- Z-index:', styles.zIndex);
            
            // 3. Check parent visibility
            const parent = roomsElement.parentElement;
            if (parent) {
                const parentStyles = window.getComputedStyle(parent);
                console.log('\nParent element styles:');
                console.log('- Display:', parentStyles.display);
                console.log('- Overflow:', parentStyles.overflow);
                console.log('- Height:', parentStyles.height);
            }
            
            // 4. Check if it's off-screen
            const rect = roomsElement.getBoundingClientRect();
            console.log('\nElement position:');
            console.log('- Top:', rect.top);
            console.log('- Left:', rect.left);
            console.log('- Width:', rect.width);
            console.log('- Height:', rect.height);
            
            // 5. Try to make it visible
            console.log('\n🔧 Attempting to fix visibility...');
            
            // Remove any hiding styles
            roomsElement.style.display = 'flex';
            roomsElement.style.visibility = 'visible';
            roomsElement.style.opacity = '1';
            roomsElement.style.position = 'relative';
            roomsElement.style.width = 'auto';
            roomsElement.style.height = 'auto';
            roomsElement.style.overflow = 'visible';
            
            // Ensure it has the same styles as other nav items
            const employeesItem = document.querySelector('[data-page="employees"]');
            if (employeesItem) {
                const employeesStyles = window.getComputedStyle(employeesItem);
                roomsElement.style.padding = employeesStyles.padding;
                roomsElement.style.margin = employeesStyles.margin;
                roomsElement.style.alignItems = employeesStyles.alignItems;
            }
            
            console.log('✅ Applied visibility fixes to Rooms element');
            
        } else {
            console.log('❌ Rooms element NOT FOUND in DOM');
            
            // Check all nav items
            const navItems = document.querySelectorAll('[data-page]');
            console.log('\nFound nav items:');
            navItems.forEach(item => {
                console.log('- ' + item.getAttribute('data-page'));
            });
        }
        
        // 6. Check for duplicate or conflicting scripts
        const scripts = document.querySelectorAll('script[src*="fix"], script[src*="enable"], script[src*="room"]');
        console.log('\n📜 Loaded fix scripts:', scripts.length);
        scripts.forEach(script => {
            console.log('- ' + script.src.split('/').pop());
        });
        
        // 7. Fix all nav items visibility
        console.log('\n🔧 Fixing all nav items visibility...');
        const allNavItems = document.querySelectorAll('.nav-item');
        allNavItems.forEach(item => {
            item.style.display = 'flex';
            item.style.visibility = 'visible';
            item.style.opacity = '1';
        });
        
        console.log('✅ Diagnostic complete');
    }
    
    // Run diagnostic
    diagnose();
    
    // Also add a global function to run it manually
    window.diagnoseRooms = diagnose;
})();

console.log('💡 Type diagnoseRooms() in console to run diagnostic again');