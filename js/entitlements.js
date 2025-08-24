// Subscription Entitlements and Feature Gating System
class EntitlementsSystem {
    constructor() {
        this.entitlements = null;
        this.currentPlan = 'free';
        this.token = null;
        this.serverUrl = null; // Will be set from settings or environment
    }

    async init() {
        // Load entitlements from cached token or fetch from server
        await this.loadEntitlements();
        
        // Apply feature gates to UI
        this.applyFeatureGates();
        
        // Set up periodic refresh
        this.setupTokenRefresh();
    
    // Set up subscription status checking
    this.setupSubscriptionCheck();
    }

    // Load entitlements from token or server
    async loadEntitlements() {
        try {
            // First try to get from current session
            if (window.authSystem && window.authSystem.authToken) {
                this.token = window.authSystem.authToken;
                const decoded = this.decodeToken(this.token);
                
                if (decoded && decoded.entitlements) {
                    // Get subscription plan from JWT token
                    this.currentPlan = decoded.subscriptionPlan || decoded.plan || 'free';
                    console.log('🎯 LOADED SUBSCRIPTION PLAN FROM JWT:', this.currentPlan);
                    console.log('📊 JWT subscriptionPlan:', decoded.subscriptionPlan);
                    console.log('📊 JWT plan:', decoded.plan);
                    
                    // Set entitlements based on plan
                    this.setEntitlementsForPlan(this.currentPlan);
                    return;
                }
            }

            // Try to load from localStorage as fallback
            const cachedToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const cachedPlan = localStorage.getItem('subscriptionPlan') || 'free';
            
            if (cachedToken) {
                this.token = cachedToken;
                const decoded = this.decodeToken(cachedToken);
                
                if (decoded && !this.isTokenExpired(decoded)) {
                    // Get subscription plan from JWT token
                    this.currentPlan = decoded.subscriptionPlan || decoded.plan || cachedPlan;
                    console.log('🎯 LOADED SUBSCRIPTION PLAN FROM CACHED JWT:', this.currentPlan);
                    console.log('📊 Cached JWT subscriptionPlan:', decoded.subscriptionPlan);
                    console.log('📊 Cached JWT plan:', decoded.plan);
                    console.log('📊 Cached plan fallback:', cachedPlan);
                    
                    // Set entitlements based on plan
                    this.setEntitlementsForPlan(this.currentPlan);
                    return;
                }
            }

            // If no valid token, check if app authentication system validates user as logged in
            const isAppAuthenticated = window.app ? window.app.checkIfUserLoggedIn() : false;
            
            if (isAppAuthenticated) {
                console.log('🔍 App authentication system confirms user is logged in');
                
                // Get user data from app's authentication
                const userData = localStorage.getItem('userData') || localStorage.getItem('currentUser');
                let userPlan = 'professional'; // Default to professional for authenticated users
                
                if (userData) {
                    try {
                        const parsedUserData = JSON.parse(userData);
                        userPlan = parsedUserData.subscriptionPlan || parsedUserData.plan || 'professional';
                        console.log('📋 User plan from app authentication:', userPlan);
                    } catch (e) {
                        console.log('⚠️ Could not parse userData, defaulting to professional for authenticated user');
                        userPlan = 'professional';
                    }
                }
                
                // Set entitlements based on actual user plan
                this.setEntitlementsForPlan(userPlan);
                
                // Force update the UI
                setTimeout(() => {
                    console.log('🔄 Updating entitlements UI for plan:', userPlan);
                    this.updateUI();
                }, 500);
            } else {
                console.log('❌ App authentication system says user is NOT logged in');
                
                // Check if we have basic auth tokens regardless of app state
                const hasTokens = !!(localStorage.getItem('userToken') || localStorage.getItem('authToken') || 
                                   sessionStorage.getItem('userToken') || sessionStorage.getItem('authToken'));
                
                if (hasTokens) {
                    console.log('🔑 Found auth tokens, defaulting to professional plan');
                    this.setEntitlementsForPlan('professional');
                } else {
                    console.log('🚫 No auth tokens found, setting unpaid plan');
                    this.setUnpaidPlanEntitlements();
                }
            }
            
        } catch (error) {
            console.error('Error loading entitlements:', error);
            // Default to professional plan on error for restored PWA
            this.setEntitlementsForPlan('professional');
        }
    }

    // Set entitlements based on subscription plan - ENFORCE ACTUAL RESTRICTIONS
    setEntitlementsForPlan(plan) {
        console.log(`🔍 ENTITLEMENTS: Setting plan for "${plan}"`);
        this.currentPlan = plan || 'unpaid';
        
        // ENFORCE PLAN-BASED RESTRICTIONS
        switch(this.currentPlan.toLowerCase()) {
            case 'unpaid':
                // Unpaid: No features at all
                this.entitlements = {
                    pos: false,
                    inventory: false,
                    employees: false,
                    rooms: false,
                    'gift-certificates': false,
                    dashboard: 'none',
                    chatbot: false,
                    cloudBackup: false,
                    analytics: false,
                    multiUser: false,
                    support: 'none',
                    analyticsHistory: 0,
                    maxDevices: 0
                };
                console.log('❌ UNPAID PLAN: No features available');
                break;
                
            case 'basic':
                // Basic: ₱1,999/month - Core POS & Basic Features
                this.entitlements = {
                    pos: true,              // ✅ Smart POS System
                    inventory: true,        // ✅ Basic inventory tracking
                    employees: false,       // ❌ No employee management
                    rooms: false,           // ❌ No room management
                    'gift-certificates': false, // ❌ No gift certificates
                    dashboard: 'basic',     // ✅ Basic dashboard only
                    chatbot: false,         // ❌ No AI assistant
                    cloudBackup: false,     // ❌ No cloud backup
                    analytics: 'basic',     // ✅ Basic analytics only
                    multiUser: false,       // ❌ Single device only
                    support: 'email',       // ✅ Email support only
                    analyticsHistory: 30,   // 30-day history limit
                    maxDevices: 1          // Single device only
                };
                console.log('📦 BASIC PLAN: Core POS features only');
                break;
                
            case 'professional':
            case 'pro':  // Support legacy 'pro' naming
                // Professional: ₱4,999/month - Full Platform + AI
                this.entitlements = {
                    pos: true,              // ✅ Smart POS System
                    inventory: true,        // ✅ Advanced inventory management
                    employees: true,        // ✅ Full employee management
                    rooms: true,            // ✅ Room management & booking
                    'gift-certificates': true, // ✅ Gift certificate system
                    dashboard: 'full',      // ✅ Full dashboard access
                    chatbot: true,          // ✅ AI Business Assistant
                    cloudBackup: true,      // ✅ Automated cloud backup
                    analytics: 'advanced',  // ✅ Advanced analytics
                    multiUser: true,        // ✅ Multi-device sync
                    support: 'priority',    // ✅ Priority support
                    analyticsHistory: -1,   // Unlimited history
                    maxDevices: 5          // Up to 5 devices
                };
                console.log('🚀 PROFESSIONAL PLAN: Full platform access with AI');
                break;
                
            case 'enterprise':
                // Enterprise: ₱9,999/month - Everything + Multi-location
                this.entitlements = {
                    pos: true,              // ✅ Smart POS System
                    inventory: true,        // ✅ Advanced inventory management
                    employees: true,        // ✅ Full employee management
                    rooms: true,            // ✅ Room management & booking
                    'gift-certificates': true, // ✅ Gift certificate system
                    dashboard: 'full',      // ✅ Full dashboard access
                    chatbot: true,          // ✅ AI Business Assistant
                    cloudBackup: true,      // ✅ Real-time cloud backup
                    analytics: 'custom',    // ✅ Custom analytics & reports
                    multiUser: true,        // ✅ Unlimited devices
                    support: 'dedicated',   // ✅ Dedicated support
                    analyticsHistory: -1,   // Unlimited history
                    maxDevices: -1,         // Unlimited devices
                    multiLocation: true,    // ✅ Multi-location support
                    whiteLabel: true,       // ✅ White-label options
                    customIntegrations: true // ✅ API access
                };
                console.log('🏢 ENTERPRISE PLAN: Full platform with multi-location');
                break;
                
            default:
                // Default to unpaid if unknown plan
                console.warn(`⚠️ Unknown plan "${this.currentPlan}", defaulting to unpaid`);
                this.setEntitlementsForPlan('unpaid');
                return;
        }
        
        console.log('📋 Entitlements set:', this.entitlements);
        
        // Force update UI immediately
        setTimeout(() => this.updateUI(), 100);
    }

    // Set unpaid plan entitlements - PROPERLY RESTRICT FEATURES
    setUnpaidPlanEntitlements() {
        this.currentPlan = 'unpaid';
        // UNPAID USERS GET NO FEATURES
        this.entitlements = {
            pos: false,             // ❌ No POS access
            inventory: false,       // ❌ No inventory management
            employees: false,       // ❌ No employee management
            dashboard: 'none',      // ❌ No dashboard access
            chatbot: false,         // ❌ No AI assistant
            cloudBackup: false,     // ❌ No cloud backup
            analytics: false,       // ❌ No analytics
            multiUser: false,       // ❌ No multi-user
            support: 'none',        // ❌ No support
            rooms: false,           // ❌ No rooms access
            'gift-certificates': false, // ❌ No gift certificates
            analyticsHistory: 0,    // No history
            maxDevices: 0          // No devices
        };
        console.log('❌ Set unpaid plan entitlements - NO FEATURES AVAILABLE');
    }

    // Legacy method for backward compatibility
    setFreePlanEntitlements() {
        this.setUnpaidPlanEntitlements();
    }

    // Force update UI elements - ENFORCE PLAN-BASED RESTRICTIONS
    updateUI() {
        console.log(`🔄 Updating UI for ${this.currentPlan} plan with restrictions`);
        
        // Update navigation items based on entitlements
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(element => {
            const page = element.dataset.page || element.getAttribute('data-page');
            let hasAccess = false;
            
            // Check access based on page/feature
            switch(page) {
                case 'pos':
                    hasAccess = this.entitlements.pos;
                    break;
                case 'inventory':
                    hasAccess = this.entitlements.inventory;
                    break;
                case 'employees':
                    hasAccess = this.entitlements.employees;
                    break;
                case 'rooms':
                    hasAccess = this.entitlements.rooms;
                    break;
                case 'gift-certificates':
                    hasAccess = this.entitlements['gift-certificates'];
                    break;
                case 'chatbot':
                    hasAccess = this.entitlements.chatbot;
                    break;
                case 'dashboard':
                    hasAccess = this.entitlements.dashboard !== 'none';
                    break;
                case 'products':
                    // Products tied to inventory
                    hasAccess = this.entitlements.inventory;
                    break;
                case 'settings':
                    // Settings always accessible but with limited options
                    hasAccess = true;
                    break;
                default:
                    // Unknown features default to restricted for unpaid
                    hasAccess = this.currentPlan !== 'unpaid';
            }
            
            if (!hasAccess) {
                // Disable the feature
                element.classList.add('disabled', 'locked', 'premium-locked');
                element.style.opacity = '0.5';
                element.style.pointerEvents = 'none';
                
                // Add lock icon if not present
                if (!element.querySelector('.fa-lock')) {
                    const lockIcon = document.createElement('i');
                    lockIcon.className = 'fas fa-lock';
                    lockIcon.style.marginLeft = '5px';
                    element.appendChild(lockIcon);
                }
                
                // Add upgrade handler
                element.onclick = (e) => {
                    e.preventDefault();
                    this.showUpgradePrompt(page);
                };
                
                console.log(`🔒 Locked feature: ${page}`);
            } else {
                // Enable the feature
                element.classList.remove('disabled', 'locked', 'premium-locked');
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
                
                // Remove lock icon if present
                const lockIcon = element.querySelector('.fa-lock');
                if (lockIcon) {
                    lockIcon.remove();
                }
                
                // Remove upgrade onclick if it was set by us
                if (element.onclick && element.onclick.toString().includes('showUpgradePrompt')) {
                    element.onclick = null;
                }
                
                console.log(`✅ Enabled feature: ${page}`);
            }
        });
        
        // Update plan badge in sidebar
        this.updatePlanBadge();
        
        // Trigger any other UI updates
        if (window.app && typeof window.app.updateFeatureAccess === 'function') {
            window.app.updateFeatureAccess(this.entitlements);
        }
    }

    // Update the plan badge in the sidebar
    updatePlanBadge() {
        const planBadge = document.querySelector('.plan-badge') || 
                         document.querySelector('[class*="pro"]') ||
                         document.querySelector('[class*="unpaid"]');
        
        if (planBadge) {
            planBadge.className = 'plan-badge';
            
            // Handle different plan types with null safety
            if (this.currentPlan === 'pro' || this.currentPlan === 'professional') {
                planBadge.classList.add('pro-badge');
                planBadge.textContent = 'PRO';
                planBadge.style.cssText = 'background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;';
            } else if (this.currentPlan === 'basic') {
                planBadge.classList.add('basic-badge');
                planBadge.textContent = 'BASIC';
                planBadge.style.cssText = 'background: #2196F3; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;';
            } else if (this.currentPlan === 'enterprise') {
                planBadge.classList.add('enterprise-badge');
                planBadge.textContent = 'ENTERPRISE';
                planBadge.style.cssText = 'background: #9C27B0; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;';
            } else {
                planBadge.classList.add('unpaid-badge');
                planBadge.textContent = this.currentPlan ? this.currentPlan.toUpperCase() : 'UNPAID';
                planBadge.style.cssText = 'background: #f44336; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;';
            }
            
            console.log(`🏷️ Updated plan badge to: ${this.currentPlan?.toUpperCase() || 'UNKNOWN'}`);
        }
    }

    // Show upgrade prompt for locked features
    showUpgradePrompt(feature) {
        console.log(`💰 Showing upgrade prompt for feature: ${feature}`);
        
        const featureNames = {
            'pos': 'POS System',
            'inventory': 'Inventory Management',
            'employees': 'Employee Management',
            'rooms': 'Room Management',
            'gift-certificates': 'Gift Certificates',
            'chatbot': 'AI Business Assistant',
            'dashboard': 'Dashboard & Analytics',
            'products': 'Product Management'
        };
        
        const featureName = featureNames[feature] || feature;
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        // Create upgrade prompt
        const prompt = document.createElement('div');
        prompt.className = 'upgrade-prompt';
        prompt.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            margin: 20px;
        `;
        
        // Determine which plan is needed for this feature
        let requiredPlan = 'Professional';
        let planPrice = '₱4,999/month';
        let planFeatures = [];
        
        // Check which plan is needed based on feature
        if (['pos', 'inventory'].includes(feature)) {
            requiredPlan = 'Basic';
            planPrice = '₱1,999/month';
            planFeatures = [
                '✅ Smart POS System',
                '✅ Basic Inventory Tracking',
                '✅ Basic Dashboard',
                '✅ 30-Day Analytics',
                '✅ Email Support'
            ];
        } else if (['employees', 'rooms', 'gift-certificates', 'chatbot'].includes(feature)) {
            requiredPlan = 'Professional';
            planPrice = '₱4,999/month';
            planFeatures = [
                '✅ Everything in Basic',
                '✅ Employee Management',
                '✅ Room Management & Booking',
                '✅ Gift Certificate System',
                '✅ AI Business Assistant',
                '✅ Cloud Backup & Multi-device',
                '✅ Priority Support'
            ];
        }
        
        prompt.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">👑</div>
            <h3 style="margin-bottom: 15px; font-size: 24px;">Premium Feature</h3>
            <p style="margin-bottom: 20px; opacity: 0.9; line-height: 1.5;">
                <strong>${featureName}</strong> requires the ${requiredPlan} plan or higher.
            </p>
            <div style="margin-bottom: 20px;">
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="margin-bottom: 10px;">${requiredPlan} Plan (${planPrice})</h4>
                    <ul style="text-align: left; list-style: none; padding: 0;">
                        ${planFeatures.map(f => `<li style="margin-bottom: 5px;">${f}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="upgrade-btn" style="background: white; color: #667eea; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;" 
                    onclick="this.parentElement.parentElement.parentElement.remove(); window.open('https://ava-solutions-marketing.netlify.app/pricing?plan=${requiredPlan.toLowerCase()}', '_blank');">
                    🚀 Upgrade to ${requiredPlan}
                </button>
                <button style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;" 
                    onclick="this.parentElement.parentElement.parentElement.remove();">
                    Maybe Later
                </button>
            </div>
        `;
        
        overlay.appendChild(prompt);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        console.log(`💰 Showed upgrade prompt for: ${featureName}`);
    }

    // Decode JWT token (simple decode without verification - server verifies)
    decodeToken(token) {
        try {
            if (!token) return null;
            
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const payload = parts[1];
            const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            return decoded;
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    // Check if token is expired
    isTokenExpired(decoded) {
        if (!decoded || !decoded.exp) return true;
        return Date.now() >= decoded.exp * 1000;
    }

    // Check if user can access a feature - ENFORCE PLAN RESTRICTIONS
    can(feature, level = true) {
        // Check entitlements based on feature
        if (!this.entitlements) {
            console.warn('⚠️ No entitlements loaded, denying access');
            return false;
        }
        
        // Direct feature check
        if (typeof this.entitlements[feature] !== 'undefined') {
            const access = this.entitlements[feature];
            
            // Handle boolean access
            if (typeof access === 'boolean') {
                return access;
            }
            
            // Handle level-based access (e.g., dashboard: 'full', 'basic', 'none')
            if (typeof access === 'string') {
                if (access === 'none') return false;
                if (level === true) return access !== 'none';
                return access === level || access === 'full';
            }
            
            // Handle numeric limits (e.g., analyticsHistory: 30)
            if (typeof access === 'number') {
                return access > 0 || access === -1; // -1 means unlimited
            }
        }
        
        // Default to restricted for unpaid users
        if (this.currentPlan === 'unpaid') {
            console.log(`❌ Feature "${feature}" denied for unpaid plan`);
            return false;
        }
        
        // Default to allowed for paid plans if feature not explicitly defined
        return this.currentPlan !== 'unpaid';
    }

    // Get current plan info
    getCurrentPlan() {
        return {
            plan: this.currentPlan,
            entitlements: this.entitlements
        };
    }

    // Apply feature gates to UI elements
    applyFeatureGates() {
        // Hide/show navigation items based on entitlements
        this.gateNavigationItems();
        
        // Gate dashboard features
        this.gateDashboardFeatures();
        
        // Gate specific feature sections
        this.gateFeatureSections();
        
        // Add subscription status to UI
        this.updateSubscriptionStatus();
    }

    // Gate navigation items - ENFORCE PLAN-BASED RESTRICTIONS
    gateNavigationItems() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const page = item.dataset.page || item.getAttribute('data-page');
            let canAccess = true;
            let showUpgrade = false;
            
            // Check access based on feature
            switch (page) {
                case 'pos':
                    canAccess = this.can('pos');
                    showUpgrade = !canAccess;
                    break;
                case 'inventory':
                    canAccess = this.can('inventory');
                    showUpgrade = !canAccess;
                    break;
                case 'employees':
                    canAccess = this.can('employees');
                    showUpgrade = !canAccess;
                    break;
                case 'rooms':
                    canAccess = this.can('rooms');
                    showUpgrade = !canAccess;
                    break;
                case 'gift-certificates':
                    canAccess = this.can('gift-certificates');
                    showUpgrade = !canAccess;
                    break;
                case 'chatbot':
                    canAccess = this.can('chatbot');
                    showUpgrade = !canAccess;
                    break;
                case 'dashboard':
                    canAccess = this.can('dashboard');
                    showUpgrade = !canAccess;
                    break;
                case 'products':
                    canAccess = this.can('inventory'); // Products tied to inventory
                    showUpgrade = !canAccess;
                    break;
                case 'settings':
                    canAccess = true; // Settings always accessible
                    break;
                default:
                    // Unknown features - check plan
                    canAccess = this.currentPlan !== 'unpaid';
                    showUpgrade = !canAccess;
            }
            
            if (!canAccess) {
                // Disable the item
                item.classList.add('disabled', 'locked', 'premium-locked');
                item.style.opacity = '0.5';
                item.style.cursor = 'not-allowed';
                
                // Add lock icon if not present
                if (!item.querySelector('.fa-lock') && !item.querySelector('.crown-icon')) {
                    const lockIcon = document.createElement('i');
                    lockIcon.className = 'fas fa-lock';
                    lockIcon.style.marginLeft = '5px';
                    lockIcon.style.color = '#999';
                    item.appendChild(lockIcon);
                }
                
                // Add click handler to show upgrade prompt
                item.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showUpgradePrompt(page);
                };
                
                console.log(`🔒 Locked navigation: ${page}`);
            } else {
                // Enable the item
                item.classList.remove('disabled', 'locked', 'premium-locked');
                item.style.opacity = '1';
                item.style.cursor = 'pointer';
                
                // Remove lock/crown icons if present
                const lockIcon = item.querySelector('.fa-lock');
                if (lockIcon) lockIcon.remove();
                
                const crownIcon = item.querySelector('.crown-icon');
                if (crownIcon) crownIcon.remove();
                
                // Remove our upgrade onclick handler
                if (item.onclick && item.onclick.toString().includes('showUpgradePrompt')) {
                    item.onclick = null;
                }
                
                console.log(`✅ Enabled navigation: ${page}`);
            }
        });
        
        console.log(`📊 Navigation gating complete for ${this.currentPlan} plan`);
    }

    // Gate dashboard features
    gateDashboardFeatures() {
        const dashboardLevel = this.entitlements?.dashboard || 'lite';
        
        if (dashboardLevel === 'lite') {
            // Hide advanced analytics
            const advancedCharts = document.querySelectorAll('.advanced-chart');
            advancedCharts.forEach(chart => {
                chart.style.display = 'none';
            });
            
            // Limit transaction history
            const transactionsList = document.getElementById('recentTransactionsList');
            if (transactionsList) {
                // Limit to 5 recent transactions for lite plan
                const transactions = transactionsList.querySelectorAll('.transaction-item');
                transactions.forEach((transaction, index) => {
                    if (index >= 5) {
                        transaction.style.display = 'none';
                    }
                });
            }
        }
    }

    // Gate specific feature sections
    gateFeatureSections() {
        // Gate inventory features in POS
        if (!this.can('inventory')) {
            const inventoryRelated = document.querySelectorAll('.inventory-related');
            inventoryRelated.forEach(element => {
                element.style.display = 'none';
            });
        }
        
        // Gate employee features in POS
        if (!this.can('employees')) {
            const employeeSelect = document.getElementById('employeeSelect');
            if (employeeSelect) {
                employeeSelect.style.display = 'none';
            }
        }
        
        // Gate advanced features
        if (!this.can('analytics')) {
            const analyticsElements = document.querySelectorAll('.analytics-feature');
            analyticsElements.forEach(element => {
                element.style.display = 'none';
            });
        }
    }

    // Update subscription status in UI
    updateSubscriptionStatus() {
        // Add subscription indicator to sidebar
        let statusIndicator = document.getElementById('subscriptionStatus');
        
        if (!statusIndicator) {
            statusIndicator = document.createElement('div');
            statusIndicator.id = 'subscriptionStatus';
            statusIndicator.className = 'subscription-status';
            
            // Insert after connection status
            const connectionStatus = document.getElementById('connectionStatus');
            if (connectionStatus) {
                connectionStatus.parentNode.insertBefore(statusIndicator, connectionStatus.nextSibling);
            }
        }
        
        const planColors = {
            free: '#6b7280',
            basic: '#3b82f6',
            pro: '#10b981',
            enterprise: '#8b5cf6'
        };
        
        statusIndicator.innerHTML = `
            <div class="plan-badge" style="background-color: ${planColors[this.currentPlan]}">
                <i class="fas fa-${this.currentPlan === 'free' ? 'gift' : 'crown'}"></i>
                <span>${this.currentPlan.toUpperCase()}</span>
            </div>
        `;
        
        // Add upgrade button for free/basic plans
        if (this.currentPlan === 'free' || this.currentPlan === 'basic') {
            if (!statusIndicator.querySelector('.upgrade-btn')) {
                const upgradeBtn = document.createElement('button');
                upgradeBtn.className = 'upgrade-btn btn-sm btn-primary';
                upgradeBtn.innerHTML = '<i class="fas fa-arrow-up"></i> Upgrade';
                upgradeBtn.onclick = () => this.showUpgradeModal();
                statusIndicator.appendChild(upgradeBtn);
            }
        }
    }

    // Show upgrade modal
    showUpgradeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'upgradeModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-crown"></i> Upgrade Your Plan</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="upgrade-plans">
                        <div class="plan-card ${this.currentPlan === 'basic' ? 'current' : ''}">
                            <h3>Basic Plan</h3>
                            <div class="plan-price">$9.99/month</div>
                            <ul class="plan-features">
                                <li><i class="fas fa-check"></i> Inventory Management</li>
                                <li><i class="fas fa-check"></i> Basic AI Assistant</li>
                                <li><i class="fas fa-check"></i> Cloud Backup</li>
                                <li><i class="fas fa-check"></i> Email Support</li>
                            </ul>
                            ${this.currentPlan === 'basic' ? 
                                '<button class="btn btn-secondary" disabled>Current Plan</button>' :
                                '<button class="btn btn-primary" onclick="entitlementsSystem.redirectToUpgrade(\'basic\')">Choose Basic</button>'
                            }
                        </div>
                        <div class="plan-card recommended ${this.currentPlan === 'pro' ? 'current' : ''}">
                            <div class="recommended-badge">Recommended</div>
                            <h3>Pro Plan</h3>
                            <div class="plan-price">$19.99/month</div>
                            <ul class="plan-features">
                                <li><i class="fas fa-check"></i> Everything in Basic</li>
                                <li><i class="fas fa-check"></i> Employee Management</li>
                                <li><i class="fas fa-check"></i> Advanced Analytics</li>
                                <li><i class="fas fa-check"></i> Full AI Assistant</li>
                                <li><i class="fas fa-check"></i> Priority Support</li>
                                <li><i class="fas fa-check"></i> Multi-user Access</li>
                            </ul>
                            ${this.currentPlan === 'pro' ? 
                                '<button class="btn btn-secondary" disabled>Current Plan</button>' :
                                '<button class="btn btn-primary" onclick="entitlementsSystem.redirectToUpgrade(\'pro\')">Choose Pro</button>'
                            }
                        </div>
                    </div>
                    <div class="upgrade-note">
                        <p><i class="fas fa-info-circle"></i> You'll be redirected to our secure payment portal to complete your upgrade.</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Redirect to upgrade page (will be your MERN website)
    redirectToUpgrade(plan) {
        const upgradeUrl = this.getUpgradeUrl(plan);
        window.open(upgradeUrl, '_blank');
    }

    // Get upgrade URL (customize for your MERN website)
    getUpgradeUrl(plan) {
        const baseUrl = window.API_CONFIG?.BASE_URL || 'https://ava-pwa-backend.onrender.com';
        const currentUser = window.authSystem?.currentUser;
        const email = currentUser?.email || '';
        
        return `${baseUrl}/upgrade?plan=${plan}&email=${encodeURIComponent(email)}&source=pwa`;
    }

    // Refresh entitlements from server
    async refreshEntitlements() {
        try {
            if (!this.token) {
                console.log('No token available for refresh');
                return false;
            }

            const response = await this.makeAPICall('/api/entitlements', 'GET');
            
            if (response.ok) {
                const data = await response.json();
                this.entitlements = data.entitlements;
                this.currentPlan = data.plan;
                
                // Cache the updated entitlements
                localStorage.setItem('subscriptionPlan', this.currentPlan);
                
                // Reapply feature gates
                this.applyFeatureGates();
                
                console.log('Entitlements refreshed:', this.currentPlan);
                return true;
            }
        } catch (error) {
            console.error('Failed to refresh entitlements:', error);
        }
        
        return false;
    }

    // Make authenticated API call
    async makeAPICall(endpoint, method = 'GET', data = null) {
        if (!this.serverUrl) {
            // Use unified backend URL
            this.serverUrl = window.API_CONFIG?.BASE_URL || 'https://ava-pwa-backend.onrender.com';
        }

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        return fetch(`${this.serverUrl}${endpoint}`, options);
    }

    // Set up periodic token refresh
    setupTokenRefresh() {
        // Refresh entitlements every 24 hours
        setInterval(() => {
            this.refreshEntitlements();
        }, 24 * 60 * 60 * 1000);

        // Also refresh when window regains focus (user switches back to app)
        window.addEventListener('focus', () => {
            const lastRefresh = localStorage.getItem('lastEntitlementsRefresh');
            const now = Date.now();
            
            // Refresh if last refresh was more than 1 hour ago
            if (!lastRefresh || now - parseInt(lastRefresh) > 60 * 60 * 1000) {
                this.refreshEntitlements();
                localStorage.setItem('lastEntitlementsRefresh', now.toString());
            }
        });
    }

    // Set up periodic subscription status checking
    setupSubscriptionCheck() {
        // Check for subscription changes every 5 minutes
        setInterval(() => {
            this.checkSubscriptionStatus();
        }, 5 * 60 * 1000);

        // Also check when window regains focus
        window.addEventListener('focus', () => {
            const lastCheck = localStorage.getItem('lastSubscriptionCheck');
            const now = Date.now();
            
            // Check if last check was more than 2 minutes ago
            if (!lastCheck || now - parseInt(lastCheck) > 2 * 60 * 1000) {
                this.checkSubscriptionStatus();
                localStorage.setItem('lastSubscriptionCheck', now.toString());
            }
        });
    }

    // Check current subscription status from server
    async checkSubscriptionStatus() {
        try {
            const token = localStorage.getItem('userToken') || localStorage.getItem('authToken');
            if (!token) {
                console.log('🔍 No token available for subscription check');
                return;
            }

            // Use unified backend through API_CONFIG
            console.log('🔄 Checking subscription status from server...');
            
            if (window.API_CONFIG) {
                const data = await window.API_CONFIG.request('/api/user/subscription', {
                    method: 'GET'
                });

                if (data) {
                console.log('📊 Current subscription from server:', data.subscriptionPlan);
                
                // Check if subscription has changed
                const currentPlan = this.currentPlan;
                const serverPlan = data.subscriptionPlan;
                
                if (currentPlan !== serverPlan) {
                    console.log('🔄 Subscription changed!', currentPlan, '->', serverPlan);
                    
                    // Update localStorage with new user data
                    const userData = {
                        email: data.email,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        businessName: data.businessName,
                        subscriptionPlan: data.subscriptionPlan,
                        subscriptionStatus: data.subscriptionStatus
                    };
                    
                    localStorage.setItem('userData', JSON.stringify(userData));
                    localStorage.setItem('userToken', data.token);
                    localStorage.setItem('subscriptionPlan', data.subscriptionPlan);
                    
                    // Update entitlements
                    this.setEntitlementsForPlan(serverPlan);
                    this.updateUI();
                    
                    // Show notification to user
                    this.showSubscriptionChangeNotification(currentPlan, serverPlan);
                }
                } else {
                    console.log('⚠️ Could not check subscription status');
                }
            }
        } catch (error) {
            console.log('⚠️ Error checking subscription status:', error.message);
        }
    }

    // Show notification when subscription changes
    showSubscriptionChangeNotification(oldPlan, newPlan) {
        const planNames = {
            'unpaid': 'Unpaid (No Features)',
            'pro': 'Pro (All Features)',
            'free': 'Free'
        };
        
        const oldPlanName = planNames[oldPlan] || oldPlan;
        const newPlanName = planNames[newPlan] || newPlan;
        
        // Create a notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 300px;
        `;
        
        if (newPlan === 'unpaid') {
            notification.style.background = '#f44336';
            notification.innerHTML = `
                <strong>⚠️ Subscription Updated</strong><br>
                Your plan changed from ${oldPlanName} to ${newPlanName}.<br>
                Some features have been disabled.
            `;
        } else {
            notification.innerHTML = `
                <strong>🎉 Subscription Updated</strong><br>
                Your plan changed from ${oldPlanName} to ${newPlanName}.<br>
                New features are now available!
            `;
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Handle subscription update from server
    handleSubscriptionUpdate(newPlan, newEntitlements) {
        this.currentPlan = newPlan;
        this.entitlements = newEntitlements;
        
        // Cache the update
        localStorage.setItem('subscriptionPlan', newPlan);
        
        // Reapply feature gates
        this.applyFeatureGates();
        
        // Show notification
        showNotification(`Plan updated to ${newPlan.toUpperCase()}!`, 'success');
        
        console.log('Subscription updated:', newPlan);
    }

    // Check if feature requires upgrade
    requiresUpgrade(feature) {
        // Check if user can access the feature
        return !this.can(feature);
    }

    // Show feature locked message
    showFeatureLockedMessage(feature, action = 'access this feature') {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-lock"></i> Feature Locked</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="feature-locked-content">
                        <div class="lock-icon">
                            <i class="fas fa-crown"></i>
                        </div>
                        <h3>Upgrade Required</h3>
                        <p>To ${action}, you need to upgrade your plan.</p>
                        <div class="current-plan">
                            <span>Current Plan: <strong>${this.currentPlan.toUpperCase()}</strong></span>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Maybe Later
                    </button>
                    <button class="btn btn-primary" onclick="entitlementsSystem.showUpgradeModal(); this.closest('.modal').remove();">
                        <i class="fas fa-arrow-up"></i> Upgrade Now
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Get plan-specific limits
    getPlanLimits() {
        const limits = {
            free: {
                transactions: 50,
                products: 10,
                employees: 1,
                inventory: 0
            },
            basic: {
                transactions: 500,
                products: 50,
                employees: 3,
                inventory: 100
            },
            pro: {
                transactions: -1, // unlimited
                products: -1,
                employees: -1,
                inventory: -1
            }
        };
        
        return limits[this.currentPlan] || limits.free;
    }

    // Check if user has reached plan limits
    async checkPlanLimits(type) {
        const limits = this.getPlanLimits();
        const limit = limits[type];
        
        if (limit === -1) return false; // Unlimited
        
        try {
            const count = await this.getCurrentCount(type);
            return count >= limit;
        } catch (error) {
            console.error('Error checking plan limits:', error);
            return false;
        }
    }

    // Get current count for limit checking
    async getCurrentCount(type) {
        switch (type) {
            case 'transactions':
                const transactions = await window.db.getAll('transactions');
                return transactions.length;
            case 'products':
                const products = await window.db.getAll('products');
                return products.length;
            case 'employees':
                const employees = await window.db.getAll('employees');
                return employees.length;
            case 'inventory':
                const inventory = await window.db.getAll('inventory');
                return inventory.length;
            default:
                return 0;
        }
    }

    // Show limit reached message
    showLimitReachedMessage(type) {
        const limits = this.getPlanLimits();
        const limit = limits[type];
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Plan Limit Reached</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="limit-reached-content">
                        <p>You've reached your ${this.currentPlan.toUpperCase()} plan limit of <strong>${limit} ${type}</strong>.</p>
                        <p>Upgrade your plan to add more ${type}.</p>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Okay
                    </button>
                    <button class="btn btn-primary" onclick="entitlementsSystem.showUpgradeModal(); this.closest('.modal').remove();">
                        <i class="fas fa-arrow-up"></i> Upgrade Plan
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
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
window.can = (feature, level) => entitlementsSystem.can(feature, level);
window.requiresUpgrade = (feature) => entitlementsSystem.requiresUpgrade(feature);
window.showFeatureLockedMessage = (feature, action) => entitlementsSystem.showFeatureLockedMessage(feature, action);
window.checkPlanLimits = (type) => entitlementsSystem.checkPlanLimits(type);
window.showLimitReachedMessage = (type) => entitlementsSystem.showLimitReachedMessage(type);

