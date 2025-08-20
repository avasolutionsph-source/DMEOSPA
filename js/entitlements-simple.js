// Simplified Entitlements - All features unlocked for testing
class EntitlementsSystem {
    constructor() {
        this.entitlements = {
            pos: true, inventory: true, employees: true, dashboard: 'full',
            chatbot: true, cloudBackup: true, analytics: true, multiUser: true,
            support: 'priority', bookings: true, rooms: true, services: true,
            giftcerts: true, payroll: true
        };
        this.currentPlan = 'pro';
    }

    async init() {
        console.log('🚀 SIMPLIFIED ENTITLEMENTS: All features unlocked');
        this.updateUI();
    }

    can(feature, level = true) {
        return true; // Always allow everything
    }

    updateUI() {
        // Show all navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.style.display = '';
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
        });
        console.log('✅ All navigation items unlocked');
    }

    applyFeatureGates() {
        // No gating - everything is accessible
        console.log('🔓 No feature gates applied - all features accessible');
    }

    getCurrentPlan() {
        return { plan: 'pro', entitlements: this.entitlements };
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
window.can = () => true;
window.requiresUpgrade = () => false;
window.showFeatureLockedMessage = () => {};
window.checkPlanLimits = () => true;
window.showLimitReachedMessage = () => {};
