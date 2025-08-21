// FIX: Ensure PRO users have all features enabled
console.log('🔧 Fixing PRO account entitlements...');

(function() {
    // Step 1: Force correct PRO entitlements
    function forceProEntitlements() {
        if (!window.entitlementsSystem) {
            setTimeout(forceProEntitlements, 100);
            return;
        }
        
        // Check if user is PRO
        const userData = localStorage.getItem('userData');
        let isPro = false;
        
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                isPro = parsed.subscriptionPlan === 'pro' || parsed.plan === 'pro';
            } catch (e) {
                console.log('Could not parse userData');
            }
        }
        
        // Also check current plan in entitlements
        if (window.entitlementsSystem.currentPlan === 'pro') {
            isPro = true;
        }
        
        if (isPro) {
            console.log('✅ User is PRO, enabling all features...');
            
            // Force all PRO entitlements
            window.entitlementsSystem.currentPlan = 'pro';
            window.entitlementsSystem.entitlements = {
                pos: true,
                inventory: true,
                employees: true,
                rooms: true,
                dashboard: 'full',
                chatbot: true,  // AI Assistant
                cloudBackup: true,
                analytics: true,
                multiUser: true,
                prioritySupport: true,
                customReports: true,
                apiAccess: true
            };
            
            console.log('✅ All PRO features enabled:', window.entitlementsSystem.entitlements);
            
            // Update UI to reflect changes
            updateUIForPro();
        }
    }
    
    // Step 2: Update UI to show all features as enabled
    function updateUIForPro() {
        // Enable all sidebar items
        const sidebarItems = document.querySelectorAll('.nav-item');
        sidebarItems.forEach(item => {
            item.classList.remove('disabled', 'locked', 'premium-locked');
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
            
            // Remove any crown icons
            const crownIcon = item.querySelector('.crown-icon');
            if (crownIcon) {
                crownIcon.remove();
            }
            
            // Remove lock icons
            const lockIcon = item.querySelector('.fa-lock');
            if (lockIcon) {
                lockIcon.remove();
            }
        });
        
        // Specifically enable AI Assistant
        const chatbotItem = document.querySelector('[data-page="chatbot"]');
        if (chatbotItem) {
            chatbotItem.classList.remove('disabled', 'locked', 'premium-locked');
            chatbotItem.style.opacity = '1';
            chatbotItem.style.pointerEvents = 'auto';
            
            // Remove onclick that shows upgrade prompt
            chatbotItem.onclick = null;
            
            // Add proper navigation handler
            chatbotItem.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToAIAssistant();
            });
        }
        
        // Enable inventory
        const inventoryItem = document.querySelector('[data-page="inventory"]');
        if (inventoryItem) {
            inventoryItem.classList.remove('disabled', 'locked', 'premium-locked');
            inventoryItem.style.opacity = '1';
            inventoryItem.style.pointerEvents = 'auto';
        }
        
        // Enable employees
        const employeesItem = document.querySelector('[data-page="employees"]');
        if (employeesItem) {
            employeesItem.classList.remove('disabled', 'locked', 'premium-locked');
            employeesItem.style.opacity = '1';
            employeesItem.style.pointerEvents = 'auto';
        }
        
        console.log('✅ UI updated for PRO features');
    }
    
    // Step 3: Handle AI Assistant navigation
    function navigateToAIAssistant() {
        // Remove any upgrade modals
        const upgradeModal = document.querySelector('.upgrade-modal');
        if (upgradeModal) {
            upgradeModal.remove();
        }
        
        // Update active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const chatbotItem = document.querySelector('[data-page="chatbot"]');
        if (chatbotItem) {
            chatbotItem.classList.add('active');
        }
        
        // Navigate using app's system
        if (window.app && window.app.navigateTo) {
            window.app.navigateTo('chatbot');
        } else {
            // Manual navigation
            document.querySelectorAll('.page').forEach(page => {
                page.style.display = 'none';
            });
            
            const chatbotPage = document.getElementById('chatbot');
            if (chatbotPage) {
                chatbotPage.style.display = 'block';
            }
        }
        
        // Update app state
        if (window.app) {
            window.app.currentPage = 'chatbot';
        }
    }
    
    // Step 4: Override the showUpgradePrompt to prevent it for PRO users
    function overrideUpgradePrompt() {
        if (window.entitlementsSystem && window.entitlementsSystem.showUpgradePrompt) {
            const originalShowUpgrade = window.entitlementsSystem.showUpgradePrompt.bind(window.entitlementsSystem);
            
            window.entitlementsSystem.showUpgradePrompt = function(feature) {
                // Check if user is actually PRO
                if (this.currentPlan === 'pro') {
                    console.log('User is PRO, not showing upgrade prompt for', feature);
                    
                    // Instead navigate to the feature
                    if (window.app && window.app.navigateTo) {
                        window.app.navigateTo(feature);
                    }
                    return;
                }
                
                // Otherwise show original prompt
                originalShowUpgrade(feature);
            };
        }
    }
    
    // Step 5: Fix the gateNavigationItems method
    function fixGateNavigation() {
        if (window.entitlementsSystem && window.entitlementsSystem.gateNavigationItems) {
            const original = window.entitlementsSystem.gateNavigationItems.bind(window.entitlementsSystem);
            
            window.entitlementsSystem.gateNavigationItems = function() {
                // Call original
                original();
                
                // If PRO, enable everything
                if (this.currentPlan === 'pro') {
                    const navItems = document.querySelectorAll('.nav-item');
                    navItems.forEach(item => {
                        item.classList.remove('disabled', 'locked', 'premium-locked');
                        item.style.opacity = '1';
                        item.style.pointerEvents = 'auto';
                        
                        // Remove upgrade onclick
                        if (item.onclick && item.onclick.toString().includes('showUpgradePrompt')) {
                            item.onclick = null;
                        }
                    });
                }
            };
        }
    }
    
    // Step 6: Periodic check to ensure PRO features stay enabled
    function periodicProCheck() {
        setInterval(() => {
            if (window.entitlementsSystem && window.entitlementsSystem.currentPlan === 'pro') {
                // Check if any features are disabled
                const disabledItems = document.querySelectorAll('.nav-item.disabled, .nav-item.locked, .nav-item.premium-locked');
                if (disabledItems.length > 0) {
                    console.log('Found disabled items for PRO user, re-enabling...');
                    updateUIForPro();
                }
            }
        }, 2000);
    }
    
    // Step 7: Execute all fixes
    function executeAllFixes() {
        console.log('🚀 Executing PRO entitlements fixes...');
        
        // Force PRO entitlements
        forceProEntitlements();
        
        // Override methods
        overrideUpgradePrompt();
        fixGateNavigation();
        
        // Start periodic check
        periodicProCheck();
        
        // Apply fixes after a delay to ensure everything is loaded
        setTimeout(() => {
            forceProEntitlements();
            updateUIForPro();
        }, 1000);
        
        // And again after 2 seconds
        setTimeout(() => {
            forceProEntitlements();
            updateUIForPro();
        }, 2000);
        
        console.log('✅ PRO entitlements fixes applied');
    }
    
    // Wait for entitlements system to load
    const checkInterval = setInterval(() => {
        if (window.entitlementsSystem) {
            clearInterval(checkInterval);
            executeAllFixes();
        }
    }, 100);
    
    // Fallback execution
    setTimeout(() => {
        clearInterval(checkInterval);
        executeAllFixes();
    }, 5000);
})();

console.log('✅ PRO entitlements fix loaded');