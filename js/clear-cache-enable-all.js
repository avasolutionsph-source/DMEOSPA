// CLEAR ALL CACHES AND ENABLE ALL FEATURES
console.log('🧹 Clearing all cached data and enabling all features...');

(async function() {
    // Step 1: Update localStorage to ensure PRO status
    function updateLocalStorage() {
        console.log('📦 Updating localStorage...');
        
        // Get existing user data
        let userData = localStorage.getItem('userData');
        if (userData) {
            try {
                let userObj = JSON.parse(userData);
                // Force PRO plan
                userObj.subscriptionPlan = 'pro';
                userObj.plan = 'pro';
                userObj.entitlements = {
                    pos: true,
                    inventory: true,
                    employees: true,
                    rooms: true,
                    dashboard: 'full',
                    chatbot: true,
                    cloudBackup: true,
                    analytics: true,
                    multiUser: true,
                    support: 'priority'
                };
                localStorage.setItem('userData', JSON.stringify(userObj));
                console.log('✅ Updated userData to PRO with all features');
            } catch (e) {
                console.log('Could not parse userData:', e);
            }
        }
        
        // Set subscription plan
        localStorage.setItem('subscriptionPlan', 'pro');
        localStorage.setItem('userPlan', 'pro');
        
        // Remove any cached restrictions
        localStorage.removeItem('featureRestrictions');
        localStorage.removeItem('lockedFeatures');
        localStorage.removeItem('upgradePrompts');
        
        console.log('✅ localStorage updated');
    }
    
    // Step 2: Clear IndexedDB settings that might cache restrictions
    async function clearIndexedDBRestrictions() {
        console.log('🗄️ Clearing IndexedDB restrictions...');
        
        try {
            // Open the database
            const dbName = 'AvaSolutionsDB';
            const request = indexedDB.open(dbName);
            
            request.onsuccess = async function(event) {
                const db = event.target.result;
                
                // Check if settings store exists
                if (db.objectStoreNames.contains('settings')) {
                    const transaction = db.transaction(['settings'], 'readwrite');
                    const store = transaction.objectStore('settings');
                    
                    // Update or add settings
                    const settings = [
                        { key: 'userPlan', value: 'pro' },
                        { key: 'subscriptionPlan', value: 'pro' },
                        { key: 'allFeaturesEnabled', value: true },
                        { key: 'entitlements', value: {
                            pos: true,
                            inventory: true,
                            employees: true,
                            rooms: true,
                            dashboard: 'full',
                            chatbot: true,
                            cloudBackup: true,
                            analytics: true,
                            multiUser: true,
                            support: 'priority'
                        }}
                    ];
                    
                    for (const setting of settings) {
                        try {
                            await store.put(setting);
                            console.log(`✅ Updated setting: ${setting.key}`);
                        } catch (e) {
                            console.log(`Could not update ${setting.key}:`, e);
                        }
                    }
                }
                
                db.close();
                console.log('✅ IndexedDB updated');
            };
            
            request.onerror = function() {
                console.log('Could not open IndexedDB');
            };
        } catch (e) {
            console.log('IndexedDB error:', e);
        }
    }
    
    // Step 3: Clear sessionStorage
    function clearSessionStorage() {
        console.log('🧹 Clearing sessionStorage...');
        
        // Remove any cached restrictions
        sessionStorage.removeItem('featureRestrictions');
        sessionStorage.removeItem('lockedFeatures');
        sessionStorage.removeItem('upgradePrompts');
        
        // Set PRO status
        sessionStorage.setItem('subscriptionPlan', 'pro');
        sessionStorage.setItem('userPlan', 'pro');
        
        console.log('✅ sessionStorage cleared');
    }
    
    // Step 4: Override all restriction checks
    function overrideAllChecks() {
        console.log('🔓 Overriding all restriction checks...');
        
        // Override entitlements system
        if (window.entitlementsSystem) {
            window.entitlementsSystem.currentPlan = 'pro';
            window.entitlementsSystem.entitlements = {
                pos: true,
                inventory: true,
                employees: true,
                rooms: true,
                dashboard: 'full',
                chatbot: true,
                cloudBackup: true,
                analytics: true,
                multiUser: true,
                support: 'priority'
            };
            window.entitlementsSystem.can = () => true;
            window.entitlementsSystem.requiresUpgrade = () => false;
            window.entitlementsSystem.showUpgradePrompt = () => {};
            window.entitlementsSystem.gateNavigationItems = () => {};
            window.entitlementsSystem.applyFeatureGates = () => {};
        }
        
        // Override global functions
        window.can = () => true;
        window.requiresUpgrade = () => false;
        window.showFeatureLockedMessage = () => {};
        window.checkPlanLimits = () => true;
        window.showLimitReachedMessage = () => {};
        
        console.log('✅ All checks overridden');
    }
    
    // Step 5: Enable all UI elements
    function enableAllUI() {
        console.log('🎨 Enabling all UI elements...');
        
        // Enable all navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('disabled', 'locked', 'premium-locked');
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
            item.style.cursor = 'pointer';
            
            // Remove icons
            const icons = item.querySelectorAll('.fa-lock, .fa-crown, .crown-icon');
            icons.forEach(icon => icon.remove());
            
            // Remove onclick handlers
            if (item.onclick?.toString().includes('showUpgradePrompt')) {
                item.onclick = null;
            }
        });
        
        // Remove all modals
        const modals = document.querySelectorAll('.upgrade-modal, .premium-feature-modal, [class*="upgrade"], [class*="premium"]');
        modals.forEach(modal => {
            if (modal.textContent?.includes('Premium') || 
                modal.textContent?.includes('Upgrade') || 
                modal.textContent?.includes('Pro Plan')) {
                modal.remove();
            }
        });
        
        console.log('✅ All UI elements enabled');
    }
    
    // Step 6: Clear service worker cache
    async function clearServiceWorkerCache() {
        console.log('🔧 Clearing service worker cache...');
        
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log(`Deleting cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    })
                );
                console.log('✅ Service worker caches cleared');
            } catch (e) {
                console.log('Could not clear caches:', e);
            }
        }
    }
    
    // Step 7: Execute all fixes
    async function executeAllFixes() {
        console.log('🚀 Executing all fixes...');
        
        // Update storage
        updateLocalStorage();
        clearSessionStorage();
        
        // Clear IndexedDB
        await clearIndexedDBRestrictions();
        
        // Clear service worker cache
        await clearServiceWorkerCache();
        
        // Override checks
        overrideAllChecks();
        
        // Enable UI
        enableAllUI();
        
        console.log('✅ All fixes applied!');
        console.log('🔄 Refreshing in 2 seconds...');
        
        // Show success message
        showSuccessMessage();
    }
    
    // Step 8: Show success message
    function showSuccessMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 40px;
            border-radius: 12px;
            z-index: 999999;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
            font-size: 18px;
        `;
        message.innerHTML = `
            <h2 style="margin: 0 0 10px 0;">✅ All Features Enabled!</h2>
            <p style="margin: 0;">All caches cleared. Refreshing page...</p>
        `;
        document.body.appendChild(message);
        
        // Refresh after 2 seconds
        setTimeout(() => {
            location.reload(true);
        }, 2000);
    }
    
    // Execute everything
    await executeAllFixes();
    
    // Continue monitoring
    setInterval(() => {
        enableAllUI();
        overrideAllChecks();
    }, 1000);
})();

console.log('✅ Cache clearing and feature enabling script loaded');