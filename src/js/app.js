// Main Application Controller
class App {
    constructor() {
        // Initialize with StateManager if available, fallback to local properties
        if (window.StateManager && window.StateManager.initialized) {
            // Properties will proxy to state
            this.currentPage = window.StateManager.getState('ui.currentPage') || 'dashboard';
            this.cart = window.StateManager.getState('pos.cart') || [];
            this.selectedEmployee = window.StateManager.getState('pos.selectedEmployee');
        } else {
            // Fallback to local properties (will proxy to state when StateManager loads)
            this.currentPage = 'dashboard';
            this.cart = [];
            this.selectedEmployee = null;
        }
        // REMOVED: setup-related properties - manual setup wizard doesn't need state tracking
    }

    async init() {
        if (window.logger) {
            window.logger.info('App initialization starting', { 
                category: 'APP', 
                operation: 'init_start'
            });
        }
        
        // CRITICAL: Check authentication IMMEDIATELY - redirect to login page if not authenticated
        const isUserLoggedIn = this.checkIfUserLoggedIn();
        console.log('🔐 Authentication check result:', isUserLoggedIn);
        
        if (!isUserLoggedIn) {
            console.log('❌ User not authenticated, redirecting to login page immediately');
            // Force immediate redirect without any delays
            window.location.replace('login.html');
            return; // Stop all initialization
        }
        
        console.log('✅ User authenticated, continuing with PWA initialization');
        
        // Wait for database to be ready before proceeding
        try {
            await ensureDBInit();
            if (window.logger) {
                window.logger.info('Database initialized successfully', { 
                    category: 'APP', 
                    operation: 'database_init',
                    data: { status: 'success' }
                });
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to initialize database', { 
                    category: 'APP', 
                    operation: 'database_init',
                    error: error
                });
            } else {
                console.error('Failed to initialize database:', error);
            }
            return;
        }
        
        // Detect performance profile (optimize for laptops with different CPU/thermal limits)
        const savedMode = localStorage.getItem('perfMode');
        this.performanceProfile = (savedMode && savedMode !== 'auto') ? savedMode : this.detectPerformanceProfile();
        window.performanceProfile = this.performanceProfile;
        this.applyPerformanceTuning();
        this.autotunePerformance();
        
        // User is logged in, restore their UI state
        if (window.logger) {
            window.logger.info('User logged in, restoring UI state', { 
                category: 'APP', 
                operation: 'restore_ui_state'
            });
        }
        // Call the checkLoginState function from index.html to restore UI
        if (typeof window.checkLoginState === 'function') {
            window.checkLoginState();
        }
        
        // REMOVED: Automatic setup wizard - now manual only
        if (window.logger) {
            window.logger.debug('Setup wizard is manual only', { 
                category: 'APP', 
                operation: 'setup_wizard_info'
            });
        }
        
        // Load business configuration first
        await this.loadBusinessConfig();
        
        // Set up navigation
        if (window.logger) {
            window.logger.debug('Setting up navigation', { 
                category: 'APP', 
                operation: 'navigation_setup_start'
            });
        }
        this.setupNavigation();
        if (window.logger) {
            window.logger.info('Navigation setup complete', { 
                category: 'APP', 
                operation: 'navigation_setup_complete'
            });
        }
        
        // Set up date/time display (throttle on low/balanced devices)
        this.updateDateTime();
        const dateInterval = this.performanceProfile === 'low' ? 60000 : (this.performanceProfile === 'balanced' ? 5000 : 1000);
        setInterval(() => this.updateDateTime(), dateInterval);
        
        // Load business name from settings
        await this.loadBusinessName();
        
        // Initialize authentication system
        if (window.authSystem) {
            await window.authSystem.init();
        }
        
        // Initialize API client (deferred)
        if (window.apiClient) {
            this.defer(() => window.apiClient.init());
        }
        
        // Initialize entitlements (deferred)
        if (window.entitlementsSystem) {
            this.defer(() => window.entitlementsSystem.init());
        }
        
        // Check URL parameters for auth modal display
        this.handleURLParameters();
        
        // Initialize page
        this.showPage('dashboard');
        
        // Set up modal close handlers
        this.setupModalHandlers();
        
        // Check for updates from service worker
        this.checkForUpdates();
    }

    // Heuristic performance detection (cores/memory/reduced motion)
    detectPerformanceProfile() {
        try {
            const cores = navigator.hardwareConcurrency || 2;
            const mem = navigator.deviceMemory || 4;
            const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reducedMotion || cores <= 4 || mem <= 4) return 'low';
            if (cores <= 8 || mem <= 8) return 'balanced';
            return 'high';
        } catch (e) {
            return 'balanced';
        }
    }

    applyPerformanceTuning() {
        if (this.performanceProfile === 'low') {
            document.documentElement.classList.add('perf-low');
            if (!localStorage.getItem('debugLogs')) {
                try { console.log = () => {}; console.info = () => {}; console.debug = () => {}; } catch(_){}
            }
        }
    }

    autotunePerformance() {
        try {
            let frames = 0; let last = performance.now(); let total = 0; let stop = false;
            const sample = (t) => {
                if (stop) return;
                total += (t - last); last = t; frames++;
                if (frames < 60) { requestAnimationFrame(sample); } else {
                    const avg = total / frames;
                    if (avg > 24 && this.performanceProfile !== 'low') {
                        this.performanceProfile = 'low';
                        window.performanceProfile = 'low';
                        this.applyPerformanceTuning();
                    }
                }
            };
            requestAnimationFrame(sample);
            setTimeout(() => { stop = true; }, 3000);
        } catch(_e) {}
    }

    defer(fn) {
        const ric = window.requestIdleCallback || function(cb){ return setTimeout(() => cb({ timeRemaining: () => 0 }), 1); };
        try { 
            ric(() => { 
                try { 
                    fn(); 
                } catch(e) { 
                    if (window.logger) {
                        window.logger.error('Deferred function error', {
                            category: 'APP',
                            operation: 'defer_execution',
                            error: e
                        });
                    } else {
                        console.error(e);
                    }
                } 
            }); 
        } catch(_e) { 
            setTimeout(fn, 0); 
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        if (window.logger) {
            window.logger.debug('Setting up navigation items', { 
                category: 'APP', 
                operation: 'navigation_setup',
                data: { itemCount: navItems.length }
            });
        } else {
            if (window.logger) {
                window.logger.info('Setting up navigation', {
                    category: 'APP',
                    operation: 'navigation_setup',
                    data: { itemCount: navItems.length }
                });
            } else {
                console.log(`🧭 Setting up navigation for ${navItems.length} items`);
            }
        }
        
        navItems.forEach(item => {
            const page = item.dataset.page;
            if (window.logger) {
                window.logger.debug('Adding navigation click handler', { 
                    category: 'APP', 
                    operation: 'add_nav_handler',
                    data: { page: page }
                });
            }
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Check entitlements before navigation
                if (window.entitlementsSystem && !window.entitlementsSystem.can(page)) {
                    if (window.logger) {
                        window.logger.debug('Navigation blocked by entitlements', { 
                            category: 'APP', 
                            operation: 'nav_blocked',
                            data: { page: page }
                        });
                    }
                    
                    // Show upgrade prompt instead of navigating
                    if (window.entitlementsSystem.showUpgradePrompt) {
                        window.entitlementsSystem.showUpgradePrompt(page);
                    }
                    return;
                }
                
                if (window.logger) {
                    window.logger.debug('Navigation item clicked', { 
                        category: 'APP', 
                        operation: 'nav_click',
                        data: { page: page }
                    });
                }
                this.showPage(page);
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    showPage(pageName) {
        if (window.logger) {
            window.logger.info('Navigating to page', { 
                category: 'APP', 
                operation: 'page_navigation',
                data: { page: pageName }
            });
        }
        
        // Use StateHelpers if available for navigation
        if (window.StateHelpers) {
            // StateHelpers.navigate will handle state update and history
            window.StateHelpers.navigate(pageName);
        } else if (window.StateManager && window.StateManager.initialized) {
            // Use StateManager directly if StateHelpers not available
            window.StateManager.setState('ui.currentPage', pageName);
        } else {
            // Fallback to direct property (will proxy to state when available)
            this.currentPage = pageName;
        }
        
        // Close all modals first
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const selectedPage = document.getElementById(pageName);
        if (selectedPage) {
            selectedPage.classList.add('active');
            
            // Load page-specific data
            this.loadPageData(pageName);
        } else {
            // Page element not loaded yet, wait for components to load
            console.log(`Page element not found: ${pageName}, waiting for components to load...`);
            
            // Check for component loading
            const checkForPage = () => {
                const page = document.getElementById(pageName);
                if (page) {
                    page.classList.add('active');
                    this.loadPageData(pageName);
                } else {
                    // Try again after a short delay
                    setTimeout(checkForPage, 500);
                }
            };
            
            // Start checking after a brief delay
            setTimeout(checkForPage, 100);
        }
    }

    async loadPageData(pageName) {
        if (window.logger) {
            window.logger.debug('Loading page data', { 
                category: 'APP', 
                operation: 'load_page_data',
                data: { page: pageName }
            });
        }
        switch(pageName) {
            case 'dashboard':
                if (window.loadDashboard) {
                    await window.loadDashboard();
                }
                break;
            case 'pos':
                if (window.loadPOS) {
                    await window.loadPOS();
                }
                break;
            case 'products':
                if (window.loadProducts) {
                    await window.loadProducts();
                }
                break;
            case 'inventory':
                if (window.loadInventory) {
                    await window.loadInventory();
                }
                break;
            case 'employees':
                if (window.loadEmployees) {
                    await window.loadEmployees();
                }
                break;
            case 'rooms':
                if (window.loadRooms) {
                    await window.loadRooms();
                }
                break;
            case 'gift-certificates':
                if (window.logger) {
                    window.logger.debug('Gift certificates case matched', {
                        category: 'APP',
                        operation: 'route_match',
                        data: { page: 'giftcertificates' }
                    });
                } else {
                    console.log('🎁 Gift certificates case matched!');
                }
                // Load gift certificates content dynamically
                await this.loadGiftCertificatesPage();
                break;
            case 'chatbot':
                // Chatbot is loaded on demand
                break;
            case 'settings':
                if (window.loadSettings) {
                    await window.loadSettings();
                }
                break;
        }
    }

    async loadGiftCertificatesPage() {
        if (window.logger) {
            window.logger.info('Loading Gift Certificates page', {
                category: 'APP',
                operation: 'load_gift_certificates'
            });
        } else {
            console.log('🎁 Loading Gift Certificates page...');
        }
        const container = document.getElementById('gift-certificates');
        if (!container) {
            if (window.logger) {
                window.logger.error('Gift certificates container not found', {
                    category: 'APP',
                    operation: 'load_gift_certificates',
                    error: { message: 'Container element not found' }
                });
            } else {
                console.error('❌ Gift certificates container not found!');
            }
            return;
        }
        if (window.logger) {
            window.logger.debug('Container found', {
                category: 'APP',
                operation: 'load_gift_certificates'
            });
        } else {
            console.log('✅ Container found');
        }

        // Clear container and inject HTML directly
        container.innerHTML = `
            <div class="gift-certificates-container">
                <div class="gc-header">
                    <h1><i class="fas fa-gift"></i> Gift Certificate Management</h1>
                    <div class="gc-actions">
                        <button class="btn-primary" id="create-certificate-btn" style="pointer-events: auto !important; cursor: pointer !important; position: relative; z-index: 100;">
                            <i class="fas fa-plus"></i> Create Certificate
                        </button>
                        <button class="btn-secondary" id="validate-certificate-btn" style="pointer-events: auto !important; cursor: pointer !important; position: relative; z-index: 100;">
                            <i class="fas fa-check"></i> Validate Certificate
                        </button>
                        <button class="btn-secondary" id="export-certificates-btn" style="pointer-events: auto !important; cursor: pointer !important; position: relative; z-index: 100;">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>

                <div class="gc-dashboard">
                    <div class="stat-card total">
                        <i class="fas fa-certificate"></i>
                        <div class="stat-value" id="gc-total-count">0</div>
                        <div class="stat-label">Total Certificates</div>
                    </div>
                    <div class="stat-card active">
                        <i class="fas fa-check-circle"></i>
                        <div class="stat-value" id="gc-active-count">0</div>
                        <div class="stat-label">Active</div>
                    </div>
                    <div class="stat-card redeemed">
                        <i class="fas fa-shopping-cart"></i>
                        <div class="stat-value" id="gc-redeemed-count">0</div>
                        <div class="stat-label">Redeemed</div>
                    </div>
                    <div class="stat-card expired">
                        <i class="fas fa-clock"></i>
                        <div class="stat-value" id="gc-expired-count">0</div>
                        <div class="stat-label">Expired</div>
                    </div>
                    <div class="stat-card value">
                        <i class="fas fa-coins"></i>
                        <div class="stat-value" id="gc-total-value">₱0.00</div>
                        <div class="stat-label">Total Value</div>
                    </div>
                    <div class="stat-card remaining">
                        <i class="fas fa-wallet"></i>
                        <div class="stat-value" id="gc-remaining-value">₱0.00</div>
                        <div class="stat-label">Remaining Value</div>
                    </div>
                </div>

                <div class="gc-filters">
                    <button class="filter-btn active" data-filter="all">All Certificates</button>
                    <button class="filter-btn" data-filter="active">Active</button>
                    <button class="filter-btn" data-filter="redeemed">Redeemed</button>
                    <button class="filter-btn" data-filter="expired">Expired</button>
                </div>

                <div id="certificates-list">
                    <div class="empty-state">
                        <i class="fas fa-gift"></i>
                        <h3>No Gift Certificates</h3>
                        <p>Create your first gift certificate to get started</p>
                    </div>
                </div>
            </div>
        `;

        // Load styles if not present
        if (!document.getElementById('gift-certificates-styles')) {
            const response = await fetch('gift-certificates.html');
            if (response.ok) {
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const styles = doc.querySelector('style');
                
                if (styles) {
                    const styleElement = document.createElement('style');
                    styleElement.id = 'gift-certificates-styles';
                    styleElement.textContent = styles.textContent;
                    document.head.appendChild(styleElement);
                }
            }
        }

        // Load the gift certificates JavaScript
        if (window.logger) {
            window.logger.debug('Checking for GiftCertificateManager class', {
                category: 'APP',
                operation: 'check_gift_manager',
                data: {
                    classExists: !!window.GiftCertificateManager,
                    instanceExists: !!window.giftCertificateManager
                }
            });
        } else {
            console.log('📦 Checking for GiftCertificateManager class...');
            console.log('window.GiftCertificateManager exists?', !!window.GiftCertificateManager);
            console.log('window.giftCertificateManager exists?', !!window.giftCertificateManager);
        }
        
        if (!window.GiftCertificateManager) {
            if (window.logger) {
                window.logger.info('GiftCertificateManager class not found, loading script', {
                    category: 'APP',
                    operation: 'load_gift_script'
                });
            } else {
                console.log('🔄 Class not found, loading script...');
            }
            
            // Check if script is already in DOM
            const existingScript = document.querySelector('script[src*="gift-certificates.js"]');
            if (existingScript) {
                if (window.logger) {
                    window.logger.warn('Script already in DOM, removing it', {
                        category: 'APP',
                        operation: 'script_cleanup'
                    });
                } else {
                    console.log('⚠️ Script already in DOM, removing it');
                }
                existingScript.remove();
            }
            
            // First time loading - load the script
            const script = document.createElement('script');
            script.src = 'js/gift-certificates.js?t=' + Date.now(); // Add timestamp to force reload
            script.id = 'gift-certificates-script';
            
            script.onload = async () => {
                if (window.logger) {
                    window.logger.info('Script loaded successfully', {
                        category: 'APP',
                        operation: 'script_load_success'
                    });
                } else {
                    console.log('✅ Script loaded successfully');
                }
                console.log('Checking what was loaded:', {
                    GiftCertificateManager: !!window.GiftCertificateManager,
                    loadGiftCertificates: !!window.loadGiftCertificates
                });
                
                // Wait a tick for DOM to be ready
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (window.loadGiftCertificates) {
                    console.log('🚀 Calling loadGiftCertificates...');
                    await window.loadGiftCertificates();
                    console.log('✅ Manager initialized:', window.giftCertificateManager);
                } else {
                    console.error('❌ loadGiftCertificates function not found!');
                }
            };
            
            script.onerror = (error) => {
                console.error('❌ Failed to load script:', error);
            };
            
            console.log('📎 Appending script to body...');
            document.body.appendChild(script);
            
        } else {
            // Script already loaded, just create new instance
            console.log('♻️ Class already exists, creating new instance');
            
            if (window.giftCertificateManager) {
                console.log('🗑️ Destroying old instance');
                window.giftCertificateManager = null;
            }
            
            // Create new instance immediately
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (window.loadGiftCertificates) {
                console.log('🚀 Calling loadGiftCertificates...');
                await window.loadGiftCertificates();
                console.log('✅ Manager re-initialized:', window.giftCertificateManager);
            } else {
                console.error('❌ loadGiftCertificates function not found!');
            }
        }
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Manila'
        };
        const dateTimeString = now.toLocaleDateString('en-PH', options);
        
        const dateTimeElement = document.getElementById('currentDateTime');
        if (dateTimeElement) {
            dateTimeElement.textContent = dateTimeString + ' (PH Time)';
        }
    }

    async loadBusinessName() {
        try {
            const setting = await window.db.get('settings', 'businessName');
            if (setting && setting.value) {
                const businessNameEl = document.getElementById('businessName');
                if (businessNameEl) {
                    businessNameEl.textContent = setting.value;
                    document.title = `${setting.value} - Business Management System`;
                } else {
                    // Element not loaded yet, try again after components load
                    console.log('Business name element not found, will retry after components load');
                    setTimeout(() => this.loadBusinessName(), 1000);
                }
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load business name', { 
                    category: 'APP', 
                    operation: 'load_business_name',
                    error: error
                });
            } else {
                console.error('Failed to load business name:', error);
            }
        }
    }

    async loadBusinessConfig() {
        try {
            const config = await window.db.get('settings', 'businessConfig');
            this.businessConfig = config?.value || {
                businessType: 'spa',
                modules: {
                    dashboard: true,
                    pos: true,
                    services: true,
                    inventory: true,
                    employees: true,
                    chatbot: true,
                    settings: true
                },
                features: {
                    requireEmployeeForServices: true,
                    showInventoryInPOS: false,
                    enableCommissionTracking: true,
                    showServiceDuration: true
                }
            };
            
            // Apply feature flags to UI
            this.applyFeatureFlags();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Failed to load business config', { 
                    category: 'APP', 
                    operation: 'load_business_config',
                    error: error
                });
            } else {
                console.error('Failed to load business config:', error);
            }
        }
    }

    applyFeatureFlags() {
        // Hide/show navigation items based on enabled modules
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const page = item.dataset.page;
            // Map page names to module names
            let moduleName = page;
            if (page === 'products') {
                moduleName = 'services'; // Products page is actually services
            }
            
            const isEnabled = this.businessConfig.modules[moduleName];
            
            if (isEnabled) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide/show employee selection in POS based on features
        const employeeContainer = document.querySelector('#pos .header-actions');
        if (employeeContainer) {
            if (this.businessConfig.features.requireEmployeeForServices) {
                employeeContainer.style.display = 'block';
            } else {
                employeeContainer.style.display = 'none';
            }
        }
        
        console.log(`Business configured for: ${this.businessConfig.businessType}`);
    }

    // Add this method to check if a feature is enabled
    isFeatureEnabled(featureName) {
        return this.businessConfig?.features?.[featureName] || false;
    }

    // Update feature access based on entitlements
    updateFeatureAccess(entitlements) {
        if (!entitlements) {
            console.warn('No entitlements provided to updateFeatureAccess');
            return;
        }

        console.log('🔐 Updating feature access based on entitlements:', entitlements);

        // Update navigation items visibility based on entitlements
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const page = item.dataset.page;
            
            // Check if user has access to this feature
            let hasAccess = false;
            switch(page) {
                case 'dashboard':
                    hasAccess = entitlements.dashboard !== 'none';
                    break;
                case 'pos':
                    hasAccess = entitlements.pos === true;
                    break;
                case 'products':
                case 'inventory':
                    hasAccess = entitlements.inventory === true;
                    break;
                case 'employees':
                    hasAccess = entitlements.employees === true;
                    break;
                case 'rooms':
                    hasAccess = entitlements.rooms === true;
                    break;
                case 'gift-certificates':
                    hasAccess = entitlements['gift-certificates'] === true;
                    break;
                case 'chatbot':
                    hasAccess = entitlements.chatbot === true;
                    break;
                case 'settings':
                    hasAccess = true; // Settings always accessible
                    break;
                default:
                    hasAccess = true; // Unknown features default to accessible
            }
            
            // Apply visual changes based on access
            if (!hasAccess) {
                item.classList.add('locked', 'premium-locked');
                item.style.opacity = '0.6';
                
                // Add lock icon if not present
                if (!item.querySelector('.fa-lock')) {
                    const lockIcon = document.createElement('i');
                    lockIcon.className = 'fas fa-lock';
                    lockIcon.style.marginLeft = '5px';
                    lockIcon.style.fontSize = '0.8em';
                    item.querySelector('span').appendChild(lockIcon);
                }
            } else {
                item.classList.remove('locked', 'premium-locked');
                item.style.opacity = '1';
                
                // Remove lock icon if present
                const lockIcon = item.querySelector('.fa-lock');
                if (lockIcon) {
                    lockIcon.remove();
                }
            }
        });

        // Update dashboard based on entitlements
        if (entitlements.dashboard === 'basic') {
            // Hide advanced analytics charts
            const advancedCharts = document.querySelectorAll('.advanced-chart, .analytics-pro');
            advancedCharts.forEach(chart => {
                chart.style.display = 'none';
            });
        }

        // Update POS features based on entitlements
        if (!entitlements.employees) {
            // Hide employee selection in POS
            const employeeSelect = document.getElementById('employeeSelect');
            if (employeeSelect) {
                employeeSelect.style.display = 'none';
            }
        }

        // Update analytics history based on plan limits
        if (typeof entitlements.analyticsHistory === 'number' && entitlements.analyticsHistory > 0) {
            // Limit analytics data to specified days
            console.log(`📊 Analytics limited to ${entitlements.analyticsHistory} days`);
        }
    }

    // Add this method to check if a module is enabled
    isModuleEnabled(moduleName) {
        return this.businessConfig?.modules?.[moduleName] || false;
    }

    // Check if user is already logged in
    checkIfUserLoggedIn() {
        // Check for valid authentication token
        const userToken = localStorage.getItem('userToken') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const userData = localStorage.getItem('userData') || localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        
        // Must have both token AND user data to be considered logged in
        const hasValidLoginData = !!(userToken && userData);
        
        console.log('Authentication check:', {
            hasToken: !!userToken,
            hasUserData: !!userData,
            isValid: hasValidLoginData
        });
        
        // Additional validation: check if user data is valid JSON
        if (hasValidLoginData && userData) {
            try {
                const user = JSON.parse(userData);
                if (!user.email || !user.id) {
                    console.log('Invalid user data structure, clearing auth');
                    this.clearAuthData();
                    return false;
                }
            } catch (error) {
                console.log('Invalid user data JSON, clearing auth');
                this.clearAuthData();
                return false;
            }
        }
        
        return hasValidLoginData;
    }

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('userToken');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userToken');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');
    }


    // Handle login state change - called when user logs in successfully
    onUserLoggedIn() {
        console.log('User logged in - updating app state');
        
        
        // Update login detection state
        const isLoggedIn = this.checkIfUserLoggedIn();
        console.log('Login state after login:', isLoggedIn);
        
        // Reload business configuration and name
        this.loadBusinessName();
        this.loadBusinessConfig();
    }

    // Handle logout - called when user logs out
    onUserLoggedOut() {
        console.log('User logged out - resetting app state');
        
        // Clear authentication data
        this.clearAuthData();
        
        // Clear any cached business data
        this.businessConfig = null;
        
        // Redirect to login page
        window.location.href = 'login.html';
    }

    // REMOVED: checkFirstTimeSetup() method - setup wizard is now manual only

    // REMOVED: markSetupCompleted() method - no longer needed for manual setup wizard

    setupModalHandlers() {
        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    this.closeModal(activeModal.id);
                }
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Remove any inline display style that might be blocking
            modal.style.display = '';
            modal.classList.add('active');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            
            // Clear form if exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    checkForUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            this.showUpdateNotification();
                        }
                    });
                });
            });
            
            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SYNC_COMPLETE') {
                    showNotification('Data synchronized successfully!', 'success');
                }
            });
        }
        
        // Set up PWA install prompt
        this.setupPWAInstall();
        
        // Set up offline detection
        this.setupOfflineDetection();
    }

    setupPWAInstall() {
        let deferredPrompt;
        
        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install banner after a delay
            setTimeout(() => {
                this.showInstallBanner(deferredPrompt);
            }, 30000); // Show after 30 seconds
        });
        
        // Handle app install
        window.addEventListener('appinstalled', () => {
            this.hideInstallBanner();
            showNotification('App installed successfully! You can now use it offline.', 'success');
            deferredPrompt = null;
        });
    }

    showInstallBanner(prompt) {
        // Create install banner if it doesn't exist
        let banner = document.getElementById('installBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'installBanner';
            banner.className = 'install-banner';
            banner.innerHTML = `
                <div class="install-banner-content">
                    <div class="install-info">
                        <i class="fas fa-mobile-alt"></i>
                        <div>
                            <strong>Install Ava Solutions</strong>
                            <p>Get faster access and work offline!</p>
                        </div>
                    </div>
                    <div class="install-actions">
                        <button class="btn-secondary" onclick="app.hideInstallBanner()">Not Now</button>
                        <button class="btn-primary" onclick="app.installApp()">Install</button>
                    </div>
                </div>
            `;
            document.body.appendChild(banner);
        }
        
        banner.style.display = 'block';
        this.deferredPrompt = prompt;
    }

    hideInstallBanner() {
        const banner = document.getElementById('installBanner');
        if (banner) {
            banner.style.display = 'none';
        }
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            this.hideInstallBanner();
        }
    }

    setupOfflineDetection() {
        // Show offline status
        window.addEventListener('online', () => {
            this.hideOfflineNotification();
            showNotification('Back online! Syncing data...', 'success');
            
            // Trigger background sync
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.sync.register('sync-data');
                });
            }
        });
        
        window.addEventListener('offline', () => {
            this.showOfflineNotification();
        });
        
        // Check initial status
        if (!navigator.onLine) {
            this.showOfflineNotification();
        }
    }

    showOfflineNotification() {
        let notification = document.getElementById('offlineNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'offlineNotification';
            notification.className = 'offline-notification';
            notification.innerHTML = `
                <div class="offline-content">
                    <i class="fas fa-wifi" style="text-decoration: line-through;"></i>
                    <span>You're offline. Changes will sync when connection is restored.</span>
                </div>
            `;
            document.body.appendChild(notification);
        }
        notification.style.display = 'flex';
    }

    hideOfflineNotification() {
        const notification = document.getElementById('offlineNotification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    showUpdateNotification() {
        const updateNotification = document.createElement('div');
        updateNotification.className = 'update-notification';
        updateNotification.innerHTML = `
            <div class="update-content">
                <div class="update-info">
                    <i class="fas fa-download"></i>
                    <div>
                        <strong>Update Available</strong>
                        <p>A new version is ready to install</p>
                    </div>
                </div>
                <div class="update-actions">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Later</button>
                    <button class="btn-primary" onclick="app.applyUpdate()">Update Now</button>
                </div>
            </div>
        `;
        document.body.appendChild(updateNotification);
    }

    applyUpdate() {
        showLoading('Updating application...', 'Installing latest features and improvements');
        
        if ('serviceWorker' in navigator) {
            // Clear all caches to ensure fresh files
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Clearing cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                // Force service worker update
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                
                // Hard reload to get fresh files
                setTimeout(() => {
                    window.location.reload(true);
                }, 1000);
            });
        } else {
            // Fallback for browsers without service worker
            setTimeout(() => {
                window.location.reload(true);
            }, 1000);
        }
    }

    // Manual cache refresh for development
    async forceRefresh() {
        console.log('🔄 Force refreshing application cache...');
        showLoading('Refreshing application...', 'Loading latest updates');
        
        try {
            // Clear all browser caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Clearing cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }
            
            // Clear localStorage for chatbot cache
            if (window.chatbot) {
                window.chatbot.dataCache = {
                    transactions: [],
                    inventory: [],
                    employees: [],
                    products: [],
                    lastFetch: null
                };
                console.log('Cleared chatbot data cache');
            }
            
            // Force reload with cache bypass
            setTimeout(() => {
                window.location.reload(true);
            }, 500);
            
        } catch (error) {
            console.error('Error during force refresh:', error);
            hideLoading();
            showNotification('Refresh failed. Please try a hard browser refresh (Ctrl+Shift+R)', 'error');
        }
    }

    // Handle URL parameters for showing auth modals
    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // URL parameters for auth modals removed - PWA now uses dedicated login page
    }
    
    // Clear URL parameter without page reload
    clearURLParameter(paramName) {
        const url = new URL(window.location);
        url.searchParams.delete(paramName);
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Manila'
        });
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Manila'
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Global functions for modals (DEPRECATED - PWA now uses dedicated login page)
function openModal(modalId) {
    if (window.app) {
        window.app.openModal(modalId);
    }
}

function closeModal(modalId) {
    if (window.app) {
        window.app.closeModal(modalId);
    }
}

// Global logout function
function logout() {
    if (window.app) {
        window.app.onUserLoggedOut();
    } else {
        // Fallback logout
        clearAllAuthData();
        window.location.href = 'login.html';
    }
}

// Force clear all authentication data (debug function)
function clearAllAuthData() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userToken');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');
    console.log('All authentication data cleared');
}

// Force logout function (for debugging)
function forceLogout() {
    console.log('Forcing logout and redirect to login page');
    clearAllAuthData();
    window.location.href = 'login.html';
}

// Fallback notification function
function showNotification(message, type = 'info') {
    if (window.syncManager && window.syncManager.showNotification) {
        window.syncManager.showNotification(message, type);
    } else {
        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 9999;
            border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Loading functions
function showLoading(message = 'Processing...', subtitle = '') {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <h3>${message}</h3>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

function setButtonLoading(buttonId, loading = true) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

// Refresh current page data
window.refreshCurrentPage = async function() {
    if (window.app) {
        await window.app.loadPageData(window.app.currentPage);
    }
};

// Immediate authentication check (before DOM ready)
function immediateAuthCheck() {
    const userToken = localStorage.getItem('userToken') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userData = localStorage.getItem('userData') || localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    
    const hasValidAuth = !!(userToken && userData);
    
    if (!hasValidAuth) {
        console.log('🚫 IMMEDIATE AUTH CHECK: No valid authentication, redirecting to login');
        window.location.replace('login.html');
        return false;
    }
    
    // Validate user data structure
    if (userData) {
        try {
            const user = JSON.parse(userData);
            if (!user.email || !user.id) {
                console.log('🚫 IMMEDIATE AUTH CHECK: Invalid user data structure, redirecting to login');
                // Clear invalid data
                localStorage.removeItem('userToken');
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn');
                sessionStorage.clear();
                window.location.replace('login.html');
                return false;
            }
        } catch (error) {
            console.log('🚫 IMMEDIATE AUTH CHECK: Corrupted user data, redirecting to login');
            // Clear corrupted data
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('login.html');
            return false;
        }
    }
    
    console.log('✅ IMMEDIATE AUTH CHECK: Valid authentication found');
    return true;
}

// Run immediate auth check
if (!immediateAuthCheck()) {
    // If auth check failed, don't initialize the app at all
    throw new Error('Authentication failed, redirecting to login');
}

// Initialize app when DOM is ready (only if auth check passed)
document.addEventListener('DOMContentLoaded', async () => {
    // Double-check authentication before initializing
    if (!immediateAuthCheck()) {
        return; // Auth check will handle redirect
    }
    
    window.app = new App();
    // Immediate initialization for better performance since DB is pre-initialized
    await window.app.init();
});
