// Subscription Entitlements and Feature Gating System
class EntitlementsSystem {
    constructor() {
        this.entitlements = null;
        this.currentPlan = 'unpaid'; // Default to unpaid instead of free
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
                    this.currentPlan = decoded.subscriptionPlan || decoded.plan || 'unpaid';
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
            const cachedPlan = localStorage.getItem('subscriptionPlan') || 'unpaid';
            
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

            // If no valid token, check localStorage for user data and subscription plan
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            const userData = localStorage.getItem('userData');
            
            if (isLoggedIn === 'true' || userData) {
                console.log('🔍 User is logged in, checking subscription plan from userData');
                
                // Try to get plan from userData
                let userPlan = 'unpaid';
                if (userData) {
                    try {
                        const parsedUserData = JSON.parse(userData);
                        userPlan = parsedUserData.subscriptionPlan || parsedUserData.plan || 'unpaid';
                        console.log('📋 User plan from localStorage:', userPlan);
                    } catch (e) {
                        console.log('⚠️ Could not parse userData, defaulting to unpaid');
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
                console.log('❌ No valid token and not logged in, setting unpaid plan');
                this.setUnpaidPlanEntitlements();
            }
            
        } catch (error) {
            console.error('Error loading entitlements:', error);
            this.setUnpaidPlanEntitlements();
        }
    }

    // Set entitlements based on subscription plan
    setEntitlementsForPlan(plan) {
        console.log(`🔍 ENTITLEMENTS DEBUG: Setting plan for "${plan}"`);
        this.currentPlan = plan;
        
        switch (plan) {
            case 'pro':
                // PRO plan - all features available
                this.entitlements = {
                    pos: true,
                    inventory: true,
                    employees: true,
                    dashboard: 'full',
                    chatbot: true,
                    cloudBackup: true,
                    analytics: true,
                    multiUser: true,
                    support: 'priority'
                };
                console.log('✅ PRO PLAN ACTIVATED - All features enabled!');
                console.log('📋 PRO Features:', this.entitlements);
                
                // Force update UI immediately
                setTimeout(() => this.updateUI(), 500);
                break;
            case 'unpaid':
            case 'free':
            default:
                // UNPAID plan - no features available
                console.log('❌ UNPAID/FREE PLAN - No features available');
                this.setUnpaidPlanEntitlements();
                return;
        }
        console.log(`✅ Set ${plan} plan entitlements successfully`);
    }

    // Set unpaid plan entitlements (very limited features)
    setUnpaidPlanEntitlements() {
        this.currentPlan = 'unpaid';
        this.entitlements = {
            pos: false,             // No POS access - need registration
            inventory: false,       // No inventory management
            employees: false,       // No employee management
            dashboard: 'limited',   // Very limited dashboard access
            chatbot: false,         // No AI assistant
            cloudBackup: false,     // No cloud backup
            analytics: false,       // No analytics
            multiUser: false,       // No multi-user
            support: false,         // No support
            bookings: false,        // No bookings
            rooms: false            // No rooms
        };
        console.log('Set unpaid plan entitlements - very limited features, registration required');
    }

    // Legacy method for backward compatibility
    setFreePlanEntitlements() {
        this.setUnpaidPlanEntitlements();
    }

    // Force update UI elements based on current entitlements
    updateUI() {
        console.log('🔄 Updating UI with entitlements:', this.entitlements);
        
        // Update sidebar items based on data-page attributes
        const sidebarFeatures = {
            'inventory': this.entitlements.inventory,
            'employees': this.entitlements.employees,
            'chatbot': this.entitlements.chatbot,
            'products': true // Services always available
        };
        
        Object.entries(sidebarFeatures).forEach(([page, enabled]) => {
            const element = document.querySelector(`a.nav-item[data-page="${page}"]`);
            
            if (element) {
                if (enabled) {
                    element.classList.remove('disabled', 'locked', 'premium-locked');
                    element.style.opacity = '1';
                    element.style.pointerEvents = 'auto';
                    
                    // Remove crown icon if present
                    const crownIcon = element.querySelector('.crown-icon');
                    if (crownIcon) {
                        crownIcon.remove();
                    }
                    
                    console.log(`✅ Enabled feature: ${page}`);
                } else {
                    element.classList.add('disabled', 'locked', 'premium-locked');
                    element.style.opacity = '0.5';
                    element.style.pointerEvents = 'auto'; // Allow clicks to show upgrade prompt
                    
                    // Add crown icon if not present
                    if (!element.querySelector('.crown-icon')) {
                        const crownIcon = document.createElement('i');
                        crownIcon.className = 'fas fa-crown crown-icon';
                        crownIcon.style.cssText = 'color: #ffd700; margin-left: 5px; font-size: 12px;';
                        element.appendChild(crownIcon);
                    }
                    
                    // Add click handler for upgrade prompt
                    element.onclick = (e) => {
                        e.preventDefault();
                        this.showUpgradePrompt(page);
                    };
                    
                    console.log(`❌ Disabled feature: ${page}`);
                }
            } else {
                console.warn(`⚠️ Could not find sidebar element for: ${page}`);
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
            
            if (this.currentPlan === 'pro') {
                planBadge.classList.add('pro-badge');
                planBadge.textContent = 'PRO';
                planBadge.style.cssText = 'background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;';
            } else {
                planBadge.classList.add('unpaid-badge');
                planBadge.textContent = 'UNPAID';
                planBadge.style.cssText = 'background: #f44336; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;';
            }
            
            console.log(`🏷️ Updated plan badge to: ${this.currentPlan.toUpperCase()}`);
        }
    }

    // Show upgrade prompt for locked features
    showUpgradePrompt(feature) {
        const featureNames = {
            'inventory': 'Inventory Management',
            'employees': 'Employee Management',
            'chatbot': 'AI Assistant'
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
        
        prompt.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">👑</div>
            <h3 style="margin-bottom: 15px; font-size: 24px;">Premium Feature</h3>
            <p style="margin-bottom: 20px; opacity: 0.9; line-height: 1.5;">
                <strong>${featureName}</strong> is a premium feature available with our Pro plan.
            </p>
            <div style="margin-bottom: 20px;">
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="margin-bottom: 10px;">Pro Plan includes:</h4>
                    <ul style="text-align: left; list-style: none; padding: 0;">
                        <li style="margin-bottom: 5px;">✅ Inventory Management</li>
                        <li style="margin-bottom: 5px;">✅ Employee Management</li>
                        <li style="margin-bottom: 5px;">✅ AI Assistant</li>
                        <li style="margin-bottom: 5px;">✅ Advanced Analytics</li>
                        <li style="margin-bottom: 5px;">✅ Cloud Backup</li>
                    </ul>
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="upgrade-btn" onclick="this.parentElement.parentElement.parentElement.remove(); window.open('https://ava-solutions-marketing.netlify.app/pricing', '_blank');">
                    🚀 Upgrade to Pro
                </button>
                <button style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;" onclick="this.parentElement.parentElement.parentElement.remove();">
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

    // Check if user can access a feature
    can(feature, level = true) {
        if (!this.entitlements) {
            console.warn('Entitlements not loaded, defaulting to free plan');
            this.setFreePlanEntitlements();
        }

        const entitlement = this.entitlements[feature];
        
        // Boolean check
        if (typeof level === 'boolean') {
            return !!entitlement === level;
        }
        
        // String level check (e.g., 'lite' vs 'full')
        if (typeof level === 'string' && typeof entitlement === 'string') {
            return entitlement === level || (entitlement === 'full' && level === 'lite');
        }
        
        // Direct value check
        return entitlement === level;
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

    // Gate navigation items
    gateNavigationItems() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const page = item.dataset.page;
            let canAccess = true;
            let showUpgrade = false;
            
            switch (page) {
                case 'inventory':
                    canAccess = this.can('inventory');
                    showUpgrade = !canAccess;
                    break;
                case 'employees':
                    canAccess = this.can('employees');
                    showUpgrade = !canAccess;
                    break;
                case 'chatbot':
                    canAccess = this.can('chatbot');
                    showUpgrade = !canAccess;
                    break;
                // POS and Dashboard are always accessible but with limitations
                case 'pos':
                case 'dashboard':
                case 'products':
                case 'settings':
                    canAccess = true;
                    break;
            }
            
            if (!canAccess) {
                item.style.opacity = '0.5';
                item.style.pointerEvents = 'none';
                
                // Add upgrade indicator
                if (showUpgrade && !item.querySelector('.upgrade-indicator')) {
                    const upgradeIndicator = document.createElement('span');
                    upgradeIndicator.className = 'upgrade-indicator';
                    upgradeIndicator.innerHTML = '<i class="fas fa-crown"></i>';
                    upgradeIndicator.title = 'Upgrade required';
                    item.appendChild(upgradeIndicator);
                }
            } else {
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
                
                // Remove upgrade indicator if present
                const upgradeIndicator = item.querySelector('.upgrade-indicator');
                if (upgradeIndicator) {
                    upgradeIndicator.remove();
                }
            }
        });
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
        // Show registration prompts for unpaid users instead of hiding features
        if (this.currentPlan === 'unpaid') {
            this.showRegistrationPrompts();
            return;
        }

        // Gate inventory features in POS
        if (!this.can('inventory')) {
            const inventoryRelated = document.querySelectorAll('.inventory-related');
            inventoryRelated.forEach(element => {
                element.style.display = 'none';
            });
        }
        
        // Gate employee features in POS
        // Never fully hide the employee selection; keep visible for assignment even on unpaid plans
        if (!this.can('employees')) {
            const employeeSelect = document.getElementById('employeeSelect');
            if (employeeSelect) {
                employeeSelect.style.display = '';
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

    showRegistrationPrompts() {
        // Add registration overlay to restricted pages
        const restrictedPages = ['pos', 'inventory', 'employees', 'bookings', 'rooms'];
        
        restrictedPages.forEach(pageId => {
            const pageElement = document.getElementById(pageId);
            if (pageElement && !pageElement.querySelector('.registration-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'registration-overlay';
                overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.95);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 2rem;
                    text-align: center;
                `;
                
                overlay.innerHTML = `
                    <div style="max-width: 400px;">
                        <i class="fas fa-lock" style="font-size: 3rem; color: #6366f1; margin-bottom: 1rem;"></i>
                        <h2 style="color: #1f2937; margin-bottom: 1rem;">Registration Required</h2>
                        <p style="color: #6b7280; margin-bottom: 2rem;">
                            To access ${pageId.charAt(0).toUpperCase() + pageId.slice(1)} and other premium features, 
                            please register your business account on our website.
                        </p>
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <a href="https://avasolutionsph.com/register.html" target="_blank" 
                               class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-user-plus"></i> Register Now
                            </a>
                            <button onclick="showLoginModalDirect()" class="btn btn-secondary">
                                <i class="fas fa-sign-in-alt"></i> Already Registered? Login
                            </button>
                        </div>
                        <p style="font-size: 0.875rem; color: #9ca3af; margin-top: 1.5rem;">
                            <i class="fas fa-shield-alt"></i> Secure • Free Trial Available • No Credit Card Required
                        </p>
                    </div>
                `;
                
                pageElement.style.position = 'relative';
                pageElement.appendChild(overlay);
            }
        });
        
        // Also add registration prompts to navigation items
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        navItems.forEach(navItem => {
            const page = navItem.getAttribute('data-page');
            if (restrictedPages.includes(page)) {
                navItem.style.opacity = '0.6';
                navItem.title = `${page.charAt(0).toUpperCase() + page.slice(1)} - Registration Required`;
            }
        });
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
            <div class="plan-badge" style="background-color: ${planColors[this.currentPlan] || '#ef4444'}">
                <i class="fas fa-${this.currentPlan === 'unpaid' ? 'lock' : this.currentPlan === 'free' ? 'gift' : 'crown'}"></i>
                <span>${this.currentPlan.toUpperCase()}</span>
            </div>
        `;
        
        // Add registration/upgrade button for unpaid/free/basic plans
        if (this.currentPlan === 'unpaid' || this.currentPlan === 'free' || this.currentPlan === 'basic') {
            if (!statusIndicator.querySelector('.upgrade-btn')) {
                const upgradeBtn = document.createElement('button');
                upgradeBtn.className = 'upgrade-btn btn-sm btn-primary';
                upgradeBtn.innerHTML = this.currentPlan === 'unpaid' ? '<i class="fas fa-user-plus"></i> Register' : '<i class="fas fa-arrow-up"></i> Upgrade';
                upgradeBtn.onclick = () => this.showUpgradeModal();
                statusIndicator.appendChild(upgradeBtn);
            }
        }
    }

    // Show upgrade modal
    showUpgradeModal() {
        // For unpaid users, show registration prompt instead of upgrade modal
        if (this.currentPlan === 'unpaid') {
            this.showRegistrationModal();
            return;
        }
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

    showRegistrationModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'registrationModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-user-plus"></i> Get Started with Ava Solutions</h2>
                    <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 2rem;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem;">
                            <i class="fas fa-rocket" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                            <h3>Unlock All Features</h3>
                            <p>Register your business account to access POS, Inventory, Employee Management, and more!</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                            <div style="padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                                <i class="fas fa-cash-register" style="color: #10b981; font-size: 2rem; margin-bottom: 0.5rem;"></i>
                                <h4>Point of Sale</h4>
                                <p style="font-size: 0.9rem; color: #6b7280;">Process transactions and manage sales</p>
                            </div>
                            <div style="padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                                <i class="fas fa-boxes" style="color: #f59e0b; font-size: 2rem; margin-bottom: 0.5rem;"></i>
                                <h4>Inventory</h4>
                                <p style="font-size: 0.9rem; color: #6b7280;">Track stock and manage supplies</p>
                            </div>
                            <div style="padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                                <i class="fas fa-users" style="color: #8b5cf6; font-size: 2rem; margin-bottom: 0.5rem;"></i>
                                <h4>Staff Management</h4>
                                <p style="font-size: 0.9rem; color: #6b7280;">Manage employees and payroll</p>
                            </div>
                            <div style="padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                                <i class="fas fa-door-open" style="color: #ef4444; font-size: 2rem; margin-bottom: 0.5rem;"></i>
                                <h4>Room Management</h4>
                                <p style="font-size: 0.9rem; color: #6b7280;">Track sessions and timers</p>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <a href="https://avasolutionsph.com/register.html" target="_blank" 
                               class="btn btn-primary btn-lg" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-user-plus"></i> Register Your Business
                            </a>
                            <button onclick="showLoginModalDirect()" class="btn btn-secondary btn-lg">
                                <i class="fas fa-sign-in-alt"></i> Already Registered? Login
                            </button>
                        </div>
                        
                        <div style="margin-top: 2rem; padding: 1rem; background: #f3f4f6; border-radius: 8px;">
                            <p style="margin: 0; font-size: 0.9rem; color: #6b7280;">
                                <i class="fas fa-shield-alt" style="color: #10b981;"></i>
                                <strong>100% Secure</strong> • Free Trial Available • No Credit Card Required
                            </p>
                        </div>
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
        const baseUrl = 'https://ava-marketing-api.onrender.com';
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
            // Hardcoded server URL for production deployment
            this.serverUrl = 'https://ava-marketing-api.onrender.com';
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

            // Hardcoded API URL for production deployment
            const apiUrl = 'https://ava-marketing-api.onrender.com';

            console.log('🔄 Checking subscription status from server...');
            
            const response = await fetch(`${apiUrl}/api/user/subscription`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
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
                console.log('⚠️ Could not check subscription status:', response.status);
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
                const transactions = await db.getAll('transactions');
                return transactions.length;
            case 'products':
                const products = await db.getAll('products');
                return products.length;
            case 'employees':
                const employees = await db.getAll('employees');
                return employees.length;
            case 'inventory':
                const inventory = await db.getAll('inventory');
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

