// Server-based Entitlements System (No Local Caching)
class ServerEntitlementsSystem {
    constructor() {
        this.apiUrl = 'https://ava-marketing-api.onrender.com';
        this.currentPlan = null;
        this.userFeatures = null;
        this.lastFetch = 0;
    }

    async init() {
        console.log('🔐 Initializing Server-based Entitlements...');
        await this.loadEntitlementsFromServer();
    }

    // Always fetch fresh entitlements from server
    async loadEntitlementsFromServer() {
        const token = this.getToken();
        if (!token) {
            console.log('❌ No token found for entitlements');
            return;
        }

        try {
            console.log('🌐 Fetching entitlements from server...');
            const response = await fetch(`${this.apiUrl}/api/user/entitlements`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                this.currentPlan = data.plan;
                this.userFeatures = data.features;
                this.lastFetch = Date.now();
                
                console.log('✅ Entitlements loaded from server:', {
                    plan: this.currentPlan,
                    features: Object.keys(data.features || {}).filter(f => data.features[f])
                });
                
                // Update UI based on server data
                this.updateUIFromServer();
                
                return data;
            } else {
                console.log('❌ Failed to load entitlements from server');
                this.handleEntitlementsFail();
                return null;
            }
        } catch (error) {
            console.error('❌ Entitlements fetch error:', error);
            this.handleEntitlementsFail();
            return null;
        }
    }

    // Update UI based on server entitlements
    updateUIFromServer() {
        if (!this.userFeatures) {
            console.log('⚠️ No features data to update UI');
            return;
        }

        console.log('🎨 Updating UI with server entitlements...');

        // Show/hide navigation items based on server features
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            const hasFeature = this.checkFeatureAccess(page);
            
            if (hasFeature) {
                item.style.display = '';
                item.removeAttribute('disabled');
            } else {
                item.style.display = 'none';
                item.setAttribute('disabled', 'true');
            }
        });

        // Update feature gates in content
        this.updateFeatureGates();
        
        // Update plan indicators
        this.updatePlanIndicators();
    }

    // Check feature access based on server data
    checkFeatureAccess(feature) {
        if (!this.userFeatures) {
            console.log('⚠️ No features loaded, denying access to:', feature);
            return false;
        }

        // Map features to entitlements
        const featureMap = {
            'pos': this.userFeatures.pos || false,
            'inventory': this.userFeatures.inventory || false,
            'employees': this.userFeatures.employees || false,
            'bookings': this.userFeatures.bookings || true, // Usually included
            'dashboard': this.userFeatures.dashboard || true,
            'settings': true, // Always available
            'products': this.userFeatures.products || false,
            'rooms': this.userFeatures.rooms || false,
            'chatbot': this.userFeatures.chatbot || false,
            'therapist-portal': this.userFeatures.therapistPortal || true
        };

        const hasAccess = featureMap[feature] !== false;
        console.log(`🔍 Feature access check: ${feature} = ${hasAccess}`);
        return hasAccess;
    }

    // Update feature gates in content
    updateFeatureGates() {
        // Hide/show upgrade prompts
        document.querySelectorAll('.upgrade-prompt').forEach(prompt => {
            const requiredFeature = prompt.dataset.feature;
            if (requiredFeature && this.checkFeatureAccess(requiredFeature)) {
                prompt.style.display = 'none';
            } else {
                prompt.style.display = '';
            }
        });

        // Disable premium features
        document.querySelectorAll('.premium-feature').forEach(feature => {
            const requiredFeature = feature.dataset.feature;
            if (requiredFeature && !this.checkFeatureAccess(requiredFeature)) {
                feature.classList.add('disabled');
                feature.setAttribute('disabled', 'true');
            } else {
                feature.classList.remove('disabled');
                feature.removeAttribute('disabled');
            }
        });
    }

    // Update plan indicators
    updatePlanIndicators() {
        document.querySelectorAll('.plan-indicator').forEach(indicator => {
            indicator.textContent = this.currentPlan || 'Free';
        });

        // Update plan-specific styling
        document.documentElement.setAttribute('data-plan', this.currentPlan || 'free');
    }

    // Get user's subscription plan from server
    async getSubscriptionPlan() {
        if (!this.userFeatures || (Date.now() - this.lastFetch > 5 * 60 * 1000)) {
            await this.loadEntitlementsFromServer();
        }
        return this.currentPlan;
    }

    // Check if user has specific feature
    async hasFeature(feature) {
        if (!this.userFeatures || (Date.now() - this.lastFetch > 5 * 60 * 1000)) {
            await this.loadEntitlementsFromServer();
        }
        return this.checkFeatureAccess(feature);
    }

    // Handle entitlements load failure
    handleEntitlementsFail() {
        console.log('⚠️ Entitlements load failed - applying restrictive access');
        
        // Apply restrictive default
        this.currentPlan = 'free';
        this.userFeatures = {
            dashboard: true,
            bookings: true,
            settings: true,
            pos: false,
            inventory: false,
            employees: false,
            products: false,
            rooms: false,
            chatbot: false
        };
        
        this.updateUIFromServer();
    }

    // Force refresh entitlements from server
    async refreshEntitlements() {
        console.log('🔄 Force refreshing entitlements...');
        this.lastFetch = 0; // Reset cache
        return await this.loadEntitlementsFromServer();
    }

    // Get token from storage
    getToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    // Handle subscription change
    async handleSubscriptionUpdate(newPlan, newFeatures) {
        console.log('💳 Subscription updated to:', newPlan);
        
        // Always get fresh data from server instead of trusting local data
        await this.refreshEntitlements();
    }

    // Get entitlements for role-based access
    async getEntitlementsForRole(role) {
        const entitlements = await this.loadEntitlementsFromServer();
        
        if (!entitlements) {
            return this.getDefaultEntitlementsForRole(role);
        }

        // Server should return role-specific entitlements
        return entitlements.features || {};
    }

    // Default entitlements for different roles (fallback)
    getDefaultEntitlementsForRole(role) {
        const defaults = {
            owner: {
                dashboard: true, pos: true, inventory: true, employees: true,
                bookings: true, settings: true, products: true, rooms: true, chatbot: true
            },
            manager: {
                dashboard: true, pos: true, inventory: true, employees: true,
                bookings: true, settings: true, products: true, rooms: true, chatbot: false
            },
            therapist: {
                dashboard: true, bookings: true, settings: true, therapistPortal: true,
                pos: false, inventory: false, employees: false, products: false, rooms: false, chatbot: false
            },
            receptionist: {
                dashboard: true, pos: true, bookings: true, rooms: true, settings: true,
                inventory: false, employees: false, products: false, chatbot: false
            }
        };

        return defaults[role] || defaults.therapist;
    }
}

// Replace the existing entitlements system
if (window.entitlementsSystem) {
    window.entitlementsSystem = null;
}

window.entitlementsSystem = new ServerEntitlementsSystem();

// Initialize when auth is ready
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.authSystem?.isLoggedIn) {
            window.entitlementsSystem.init();
        }
    }, 1000);
});

console.log('🔐 Server-based Entitlements System loaded');
