// ULTIMATE FIX: Complete override of entitlements system for PRO users
console.log('🔨 Applying ultimate entitlements override for PRO users...');

(function() {
    // Step 1: Complete override of entitlements system
    function overrideEntitlementsCompletely() {
        // Wait for entitlements system
        if (!window.entitlementsSystem) {
            setTimeout(overrideEntitlementsCompletely, 50);
            return;
        }
        
        console.log('📦 Overriding entire entitlements system...');
        
        // Store original methods
        const originalMethods = {
            updateUI: window.entitlementsSystem.updateUI,
            setEntitlementsForPlan: window.entitlementsSystem.setEntitlementsForPlan,
            gateNavigationItems: window.entitlementsSystem.gateNavigationItems,
            can: window.entitlementsSystem.can,
            applyFeatureGates: window.entitlementsSystem.applyFeatureGates
        };
        
        // Override setEntitlementsForPlan to always set PRO for PRO users
        window.entitlementsSystem.setEntitlementsForPlan = function(plan) {
            console.log(`🔄 setEntitlementsForPlan called with: ${plan}`);
            
            // Check if user should be PRO
            const userData = localStorage.getItem('userData');
            let shouldBePro = false;
            
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    shouldBePro = parsed.subscriptionPlan === 'pro' || parsed.plan === 'pro';
                } catch (e) {}
            }
            
            // Force PRO if user should be PRO
            if (shouldBePro || plan === 'pro') {
                console.log('✅ Forcing PRO entitlements');
                this.currentPlan = 'pro';
                this.entitlements = {
                    pos: true,
                    inventory: true,
                    employees: true,
                    rooms: true,
                    dashboard: 'full',
                    chatbot: true,
                    cloudBackup: true,
                    analytics: true,
                    multiUser: true,
                    prioritySupport: true,
                    customReports: true,
                    apiAccess: true
                };
            } else {
                // Call original for non-PRO users
                originalMethods.setEntitlementsForPlan.call(this, plan);
            }
        };
        
        // Override updateUI to always enable everything for PRO
        window.entitlementsSystem.updateUI = function() {
            console.log('🎨 UpdateUI called, checking PRO status...');
            
            // Check if PRO
            if (this.currentPlan === 'pro' || localStorage.getItem('userData')?.includes('pro')) {
                console.log('✅ PRO user detected, enabling ALL features');
                
                // Enable all navigation items
                const navItems = document.querySelectorAll('.nav-item');
                navItems.forEach(item => {
                    item.classList.remove('disabled', 'locked', 'premium-locked');
                    item.style.opacity = '1';
                    item.style.pointerEvents = 'auto';
                    item.style.cursor = 'pointer';
                    
                    // Remove any lock icons
                    const lockIcon = item.querySelector('.fa-lock');
                    if (lockIcon) lockIcon.remove();
                    
                    // Remove crown icons
                    const crownIcon = item.querySelector('.crown-icon');
                    if (crownIcon) crownIcon.remove();
                    
                    // Remove onclick handlers that show upgrade prompts
                    if (item.onclick?.toString().includes('showUpgradePrompt')) {
                        item.onclick = null;
                    }
                });
                
                // Update plan badge
                const planBadge = document.querySelector('.plan-badge');
                if (planBadge) {
                    planBadge.textContent = 'PRO';
                    planBadge.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                }
                
                console.log('✅ All features enabled for PRO user');
            } else {
                // Call original for non-PRO
                originalMethods.updateUI.call(this);
            }
        };
        
        // Override gateNavigationItems to not gate PRO users
        window.entitlementsSystem.gateNavigationItems = function() {
            console.log('🚪 gateNavigationItems called');
            
            if (this.currentPlan === 'pro') {
                console.log('✅ PRO user - not gating any items');
                return;
            }
            
            // Call original for non-PRO
            originalMethods.gateNavigationItems.call(this);
        };
        
        // Override can() to always return true for PRO
        window.entitlementsSystem.can = function(feature, level) {
            if (this.currentPlan === 'pro') {
                return true;
            }
            return originalMethods.can.call(this, feature, level);
        };
        
        // Override applyFeatureGates
        window.entitlementsSystem.applyFeatureGates = function() {
            console.log('🔒 applyFeatureGates called');
            
            if (this.currentPlan === 'pro') {
                console.log('✅ PRO user - not applying any gates');
                // Still update the badge
                this.updateSubscriptionStatus();
                return;
            }
            
            originalMethods.applyFeatureGates.call(this);
        };
        
        // Override showUpgradePrompt to not show for PRO
        window.entitlementsSystem.showUpgradePrompt = function(feature) {
            if (this.currentPlan === 'pro') {
                console.log('PRO user clicked', feature, '- navigating directly');
                if (window.app && window.app.navigateTo) {
                    window.app.navigateTo(feature);
                }
                return;
            }
            
            // For non-PRO, show the prompt
            console.log('Showing upgrade prompt for', feature);
            // Original implementation...
        };
        
        console.log('✅ Entitlements system completely overridden');
    }
    
    // Step 2: Force PRO state immediately
    function forceProState() {
        const userData = localStorage.getItem('userData');
        if (userData && userData.includes('pro')) {
            console.log('🎯 Forcing immediate PRO state');
            
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
                    prioritySupport: true,
                    customReports: true,
                    apiAccess: true
                };
            }
        }
    }
    
    // Step 3: Remove all upgrade modals
    function removeUpgradeModals() {
        const modals = document.querySelectorAll('.upgrade-modal, .premium-feature-modal');
        modals.forEach(modal => modal.remove());
    }
    
    // Step 4: Enable click handlers for all features
    function enableAllClickHandlers() {
        // Inventory
        const inventory = document.querySelector('[data-page="inventory"]');
        if (inventory) {
            inventory.onclick = null;
            inventory.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.app) window.app.navigateTo('inventory');
            });
        }
        
        // Employees
        const employees = document.querySelector('[data-page="employees"]');
        if (employees) {
            employees.onclick = null;
            employees.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.app) window.app.navigateTo('employees');
            });
        }
        
        // AI Assistant
        const chatbot = document.querySelector('[data-page="chatbot"]');
        if (chatbot) {
            chatbot.onclick = null;
            chatbot.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.app) window.app.navigateTo('chatbot');
            });
        }
    }
    
    // Step 5: Continuous monitoring
    function startContinuousMonitoring() {
        setInterval(() => {
            // Check if features got disabled
            const disabledItems = document.querySelectorAll('.nav-item.disabled, .nav-item.locked');
            
            if (disabledItems.length > 0 && window.entitlementsSystem?.currentPlan === 'pro') {
                console.log('⚠️ Found disabled items for PRO user, re-enabling...');
                
                disabledItems.forEach(item => {
                    item.classList.remove('disabled', 'locked', 'premium-locked');
                    item.style.opacity = '1';
                    item.style.pointerEvents = 'auto';
                });
                
                enableAllClickHandlers();
            }
            
            // Remove any upgrade modals that appear
            removeUpgradeModals();
        }, 1000);
    }
    
    // Step 6: Main execution
    function executeOverride() {
        console.log('🚀 Executing complete entitlements override...');
        
        // Override the system
        overrideEntitlementsCompletely();
        
        // Force PRO state
        forceProState();
        
        // Enable all features
        setTimeout(() => {
            forceProState();
            enableAllClickHandlers();
            
            // Trigger UI update
            if (window.entitlementsSystem) {
                window.entitlementsSystem.updateUI();
            }
        }, 500);
        
        // Start monitoring
        startContinuousMonitoring();
        
        console.log('✅ Override complete');
    }
    
    // Execute immediately and after delays
    executeOverride();
    setTimeout(executeOverride, 1000);
    setTimeout(executeOverride, 2000);
    
    // Also execute when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executeOverride);
    }
})();

console.log('✅ Entitlements override script loaded');