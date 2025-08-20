// Emergency Clear for Booking Website - Remove All Business Listings
(function() {
    console.log('🚨 BOOKING EMERGENCY CLEAR: Starting...');
    
    async function clearAllBookingData() {
        console.log('🧹 Clearing all booking website data...');
        
        try {
            // 1. Clear all localStorage
            console.log('🗑️ Clearing localStorage...');
            const localKeys = Object.keys(localStorage);
            localStorage.clear();
            console.log('✅ Cleared localStorage keys:', localKeys);
            
            // 2. Clear all sessionStorage
            console.log('🗑️ Clearing sessionStorage...');
            const sessionKeys = Object.keys(sessionStorage);
            sessionStorage.clear();
            console.log('✅ Cleared sessionStorage keys:', sessionKeys);
            
            // 3. Clear all cookies
            console.log('🗑️ Clearing cookies...');
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
            // 4. Clear IndexedDB if exists
            if ('indexedDB' in window) {
                console.log('🗑️ Clearing IndexedDB...');
                try {
                    const databases = await indexedDB.databases();
                    databases.forEach(db => {
                        indexedDB.deleteDatabase(db.name);
                        console.log(`✅ Deleted database: ${db.name}`);
                    });
                } catch (e) {
                    console.warn('Could not clear IndexedDB:', e);
                }
            }
            
            // 5. Clear service worker caches
            if ('serviceWorker' in navigator && 'caches' in window) {
                console.log('🗑️ Clearing caches...');
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('✅ Cleared service worker caches');
                } catch (e) {
                    console.warn('Could not clear caches:', e);
                }
            }
            
            // 6. Clear specific booking data
            const businessDataKeys = [
                'bookingBusinessId', 'selectedBusiness', 'businessList', 'businessData',
                'businesses', 'spas', 'spaList', 'apiUrl', 'pwaApiUrl'
            ];
            businessDataKeys.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });
            
            // 7. Reset DOM elements
            console.log('🎨 Resetting UI...');
            const businessList = document.getElementById('businessList');
            if (businessList) {
                businessList.innerHTML = '<p>Loading businesses...</p>';
            }
            
            const businessSection = document.getElementById('businessSection');
            if (businessSection) {
                businessSection.style.display = 'block';
            }
            
            console.log('✅ All booking data cleared successfully!');
            
            // Show success message
            alert('✅ ALL BOOKING DATA CLEARED!\n\nThe page will refresh to show a clean state.');
            
            // Refresh after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error clearing booking data:', error);
            alert('❌ Error clearing data: ' + error.message);
        }
    }
    
    // Auto-clear immediately
    clearAllBookingData();
    
    // Also expose for manual trigger
    window.clearBookingData = clearAllBookingData;
    
    console.log('🚨 BOOKING EMERGENCY CLEAR: Ready');
})();
