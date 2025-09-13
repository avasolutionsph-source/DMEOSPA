// Simplified Entitlements System - All features enabled for everyone
class EntitlementsSystem {
    constructor() {
        this.entitlements = null;
    }

    async init() {
        // Set all features as enabled
        this.setUnlimitedAccess();
        console.log('✅ All features enabled - no subscription restrictions');
    }

    // Set unlimited access to all features
    setUnlimitedAccess() {
        this.entitlements = {
            pos: true,
            inventory: true,
            employees: true,
            rooms: true,
            'gift-certificates': true,
            dashboard: 'full',
            chatbot: true,
            cloudBackup: true,
            analytics: 'advanced',
            multiUser: true,
            support: 'priority'
        };
        
        console.log('🚀 All features enabled for unlimited access');
    }

    // Check if user can access a feature - always returns true
    can(feature, level = true) {
        return true; // All features are always available
    }

    // Get current plan info - returns unlimited access
    getCurrentPlan() {
        return {
            plan: 'unlimited',
            entitlements: this.entitlements
        };
    }

    // Apply feature gates - does nothing since all features are enabled
    applyFeatureGates() {
        // All features are enabled - no gating needed
        console.log('✅ No feature gating - all features available');
    }

    // Load entitlements - same as init but can be called separately
    async loadEntitlements() {
        this.setUnlimitedAccess();
        console.log('✅ Entitlements loaded - all features enabled');
        return this.entitlements;
    }

    // Update UI - enables all navigation items
    updateUI() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(element => {
            // Enable all navigation items
            element.classList.remove('disabled', 'locked', 'premium-locked');
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
            
            // Remove any lock icons
            const lockIcon = element.querySelector('.fa-lock');
            if (lockIcon) {
                lockIcon.remove();
            }
        });
        
        console.log('✅ All navigation items enabled');
    }

    // Get plan limits - always unlimited
    getPlanLimits() {
        return {
            transactions: -1, // unlimited
            products: -1,     // unlimited
            employees: -1,    // unlimited
            inventory: -1     // unlimited
        };
    }

    // Check plan limits - always returns false (no limits)
    async checkPlanLimits(type) {
        return false; // No limits
    }

    // Show limit reached message - disabled
    showLimitReachedMessage(type) {
        console.log('No limits - unlimited access enabled');
        return;
    }

    // Check if feature requires upgrade - always false
    requiresUpgrade(feature) {
        return false; // No upgrades needed
    }

    // Show feature locked message - disabled
    showFeatureLockedMessage(feature, action) {
        console.log('No locked features - all features available');
        return;
    }
}

// Create global instance
const entitlementsSystem = new EntitlementsSystem();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await entitlementsSystem.init();
});

// Export for use in other modules
window.entitlementsSystem = entitlementsSystem;

// Helper functions for other modules to use
window.can = (feature, level) => true; // Always return true
window.requiresUpgrade = (feature) => false; // Never requires upgrade
window.showFeatureLockedMessage = (feature, action) => {}; // Do nothing
window.checkPlanLimits = (type) => Promise.resolve(false); // No limits
window.showLimitReachedMessage = (type) => {}; // Do nothing