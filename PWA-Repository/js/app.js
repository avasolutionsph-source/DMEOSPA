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
        // Reduced logging for better performance
        
        // Wait for database to be ready before proceeding
        try {
            await ensureDBInit();
        } catch (error) {
            console.error('Failed to initialize database:', error);
            return;
        }
        
        // Performance mode optimization
        const savedMode = localStorage.getItem('perfMode');
        this.performanceProfile = savedMode || 'balanced';
        
        // Set global performance profile for other modules
        window.performanceProfile = this.performanceProfile;
        
        // Disable excessive console logging for performance
        if (this.performanceProfile === 'low' || window.location.hostname !== 'localhost') {
            console.log = () => {};
            console.debug = () => {};
            console.info = () => {};
            // Keep console.warn and console.error for important messages
        }
        
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
        
        // Production mode - no automatic test data loading
        
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
        
        // Set up date/time display (ultra performance mode - much slower updates)
        this.updateDateTime();
        const dateInterval = 30000; // Update only every 30 seconds for performance
        this.dateTimeInterval = setInterval(() => this.updateDateTime(), dateInterval);
        
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
        
        // Add small delay after login to ensure auth token is properly saved before loading dashboard
        // This prevents "No auth token found" errors during initial load
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('jwtToken');
        if (!authToken) {
            console.log('⏳ Waiting for authentication to complete before loading dashboard...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Initialize page
        await this.showPage('dashboard');
        
        // Set up modal close handlers
        this.setupModalHandlers();
        
        // Check for updates from service worker
        this.checkForUpdates();
        
        // DEFERRED: Now check authentication after PWA is fully loaded
        console.log('🛡️ PWA fully loaded, now checking authentication...');
        setTimeout(() => {
            if (window.checkAuthenticationAfterLoad) {
                const isAuthenticated = window.checkAuthenticationAfterLoad();
                if (!isAuthenticated) {
                    console.log('🚫 Authentication failed after load, will redirect to login');
                }
            }
        }, 1000); // Give PWA 1 second to fully render before auth check
        
        // Set up cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // Clean up resources to prevent memory leaks
    cleanup() {
        if (this.dateTimeInterval) {
            clearInterval(this.dateTimeInterval);
            this.dateTimeInterval = null;
        }
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
        // Disabled heavy performance profiling to improve startup speed
        // Performance mode can still be manually set via localStorage.setItem('perfMode', 'low'|'balanced'|'high')
        return;
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
        const navItems = document.querySelectorAll('.nav-link');
        console.log(`🧭 Setting up navigation for ${navItems.length} items`);
        
        if (navItems.length === 0) {
            console.warn('⚠️ No navigation items found - sidebar might not be loaded yet');
            return;
        }
        
        if (window.logger) {
            window.logger.debug('Setting up navigation items', { 
                category: 'APP', 
                operation: 'navigation_setup',
                data: { itemCount: navItems.length }
            });
        }
        
        // Cache nav items array for performance - avoid DOM queries on every click
        this.cachedNavItems = Array.from(navItems);

        navItems.forEach((item, index) => {
            const page = item.dataset.page;
            
            // Mark item to avoid duplicate event listeners
            if (item.hasAttribute('data-nav-setup')) {
                return;
            }
            item.setAttribute('data-nav-setup', 'true');
            
            // Use event delegation for better performance - single click handler
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // ULTRA PERFORMANCE: Enable high-performance mode during navigation
                const navbar = document.querySelector('.main-nav');
                navbar?.classList.add('nav-performance-mode');
                
                // Ultra-fast active state update with CSS
                document.querySelector('.nav-link.active')?.classList.remove('active');
                item.classList.add('active');
                
                // Defer heavy operations to next frame
                requestAnimationFrame(() => {
                    this.showPage(page);
                    // Re-enable visual effects after navigation completes
                    setTimeout(() => {
                        try {
                            const sidebar = document.querySelector('.sidebar');
                            if (sidebar) {
                                sidebar.classList.remove('nav-performance-mode');
                            }
                        } catch (error) {
                            console.warn('⚠️ Sidebar not found for nav-performance-mode cleanup:', error);
                        }
                    }, 100);
                });
            }, { passive: false });
        });
    }

    async showPage(pageName) {
        // Update state immediately for responsive UI
        if (window.StateHelpers) {
            window.StateHelpers.navigate(pageName);
        } else if (window.StateManager && window.StateManager.initialized) {
            window.StateManager.setState('ui.currentPage', pageName);
        } else {
            this.currentPage = pageName;
        }
        
        // Quick DOM cleanup - cache selectors for performance
        const modals = document.querySelectorAll('.modal');
        const pages = document.querySelectorAll('.page');
        
        modals.forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        
        // Check if page already exists in DOM
        const selectedPage = document.getElementById(pageName);
        if (selectedPage) {
            // Immediate UI response - show page first
            pages.forEach(page => page.classList.remove('active'));
            selectedPage.classList.add('active');
            
            // Defer data loading to not block UI
            requestAnimationFrame(() => {
                this.loadPageData(pageName);
            });
            return;
        }
        
        // Show loading state immediately
        pages.forEach(page => page.classList.remove('active'));
        
        // Show loading indicator
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="loading-page">
                    <div class="loading-spinner"></div>
                    <p>Loading ${pageName}...</p>
                </div>
            `;
        }
        
        // Defer heavy component loading
        requestAnimationFrame(async () => {
            await this.loadPageComponent(pageName);
        });
    }
    
    async loadPageComponent(pageName) {
        // Check if component loader is available
        if (!window.componentLoader) {
            setTimeout(() => this.loadPageComponent(pageName), 100);
            return;
        }
        
        try {
            const success = await window.componentLoader.loadComponent(pageName, '.main-content', false);
            
            if (success) {
                // Load data after component is ready
                requestAnimationFrame(() => {
                    this.loadPageData(pageName);
                });
            } else {
                // Fallback to dashboard
                if (pageName !== 'dashboard') {
                    this.showPage('dashboard');
                }
            }
        } catch (error) {
            console.error(`Error loading ${pageName}:`, error);
            if (pageName !== 'dashboard') {
                this.showPage('dashboard');
            }
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
        
        // Map pages to their required modules (only modules that need lazy loading)
        const pageModules = {
            'attendance': ['attendance', 'attendance-history'],
            'payroll': ['payroll'],
            'rooms': ['rooms'],
            'expense-manager': ['expense-manager'],
            'gift-certificates': ['gift-certificates'],
            'chatbot': ['chatbot']
        };
        
        // Ensure required modules are loaded before accessing page
        if (pageModules[pageName] && window.ensureModulesLoaded) {
            try {
                await window.ensureModulesLoaded(pageModules[pageName]);
            } catch (error) {
                console.error(`Failed to load modules for ${pageName}:`, error);
                return;
            }
        }
        
        // Load data asynchronously without blocking UI
        switch(pageName) {
            case 'dashboard':
                if (window.loadDashboard) {
                    window.loadDashboard().catch(e => console.warn('Dashboard load failed:', e));
                }
                break;
            case 'pos':
                if (window.loadPOS) {
                    window.loadPOS().catch(e => console.warn('POS load failed:', e));
                }
                break;
            case 'products':
                if (window.loadProducts) {
                    window.loadProducts().catch(e => console.warn('Products load failed:', e));
                }
                break;
            case 'inventory':
                if (window.loadInventory) {
                    window.loadInventory().catch(e => console.warn('Inventory load failed:', e));
                }
                break;
            case 'employees':
                if (window.loadEmployees) {
                    window.loadEmployees().catch(e => console.warn('Employees load failed:', e));
                }
                break;
            case 'attendance':
                if (window.attendanceManager) {
                    // Load asynchronously without blocking
                    setTimeout(() => {
                        window.attendanceManager.init().catch(e => console.warn('Attendance init failed:', e));
                    }, 100);
                }
                break;
            case 'payroll':
                if (window.payrollManager) {
                    // Initialize asynchronously without blocking
                    setTimeout(() => {
                        window.payrollManager.init().catch(e => console.warn('Payroll init failed:', e));
                    }, 100);
                }
                break;
            case 'rooms':
                if (window.loadRooms) {
                    window.loadRooms().catch(e => console.warn('Rooms load failed:', e));
                }
                break;
            case 'gift-certificates':
                // Load asynchronously without blocking
                setTimeout(() => {
                    this.loadGiftCertificatesPage().catch(e => console.warn('Gift certificates load failed:', e));
                }, 50);
                break;
            case 'expenses':
                // Initialize and load asynchronously
                setTimeout(() => {
                    if (!window.expenseManager && window.ExpenseManager) {
                        window.expenseManager = new ExpenseManager();
                    }
                    if (window.expenseManager && window.expenseManager.loadExpenses) {
                        window.expenseManager.loadExpenses();
                    }
                }, 50);
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

        // Clear container and inject professional HTML structure
        container.innerHTML = `
            <div class="gift-certificates-container">
                <!-- Page Header -->
                <div class="page-header">
                    <h1>Gift Certificate Management</h1>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="create-certificate-btn">
                            <i class="fas fa-plus"></i> Create Certificate
                        </button>
                        <button class="btn btn-secondary" id="validate-certificate-btn">
                            <i class="fas fa-check-circle"></i> Validate
                        </button>
                    </div>
                </div>

                <!-- Gift Certificate Statistics -->
                <div class="dashboard-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card">
                        <div class="stat-icon blue">
                            <i class="fas fa-certificate"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="gc-total-count">0</div>
                            <div class="stat-label">Total Certificates</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="gc-active-count">0</div>
                            <div class="stat-label">Active</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="gc-redeemed-count">0</div>
                            <div class="stat-label">Redeemed</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red">
                            <i class="fas fa-times-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="gc-expired-count">0</div>
                            <div class="stat-label">Expired</div>
                        </div>
                    </div>
                </div>
                
                <!-- Value Statistics -->
                <div class="dashboard-grid" style="margin-bottom: 2rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                    <div class="stat-card">
                        <div class="stat-icon purple">
                            <i class="fas fa-peso-sign"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="gc-total-value">₱0.00</div>
                            <div class="stat-label">Total Value</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon cyan">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="gc-remaining-value">₱0.00</div>
                            <div class="stat-label">Remaining Value</div>
                        </div>
                    </div>
                </div>

                <!-- Filter Buttons -->
                <div class="gc-filters" style="display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap;">
                    <button class="btn btn-secondary filter-btn active" data-filter="all">All Certificates</button>
                    <button class="btn btn-secondary filter-btn" data-filter="active">Active</button>
                    <button class="btn btn-secondary filter-btn" data-filter="redeemed">Redeemed</button>
                    <button class="btn btn-secondary filter-btn" data-filter="expired">Expired</button>
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

        // Gift certificates styles are now in main CSS file
        // No need to load external styles

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

    async loadBusinessName(retryCount = 0) {
        // Prevent infinite retries
        if (retryCount > 3) {
            console.log('Max retries reached for business name loading');
            return;
        }
        
        try {
            const setting = await window.db.get('settings', 'businessName');
            if (setting && setting.value) {
                // Update page title with business name
                document.title = `${setting.value} - Business Management System`;
                
                // Try to update business name input if it exists (but don't loop if it doesn't)
                const businessNameEl = document.getElementById('businessNameInput');
                if (businessNameEl) {
                    businessNameEl.value = setting.value;
                }
                
                // Try to update any business name display elements
                const businessNameDisplay = document.querySelector('.business-name-display');
                if (businessNameDisplay) {
                    businessNameDisplay.textContent = setting.value;
                }
                
                console.log('Business name loaded:', setting.value);
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

    // Update feature access - all features are now enabled
    updateFeatureAccess(entitlements) {
        console.log('🔓 All features enabled - no subscription restrictions');

        // Enable all navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            // Remove all restrictions
            item.classList.remove('locked', 'premium-locked');
            item.style.opacity = '1';
            
            // Remove any lock icons
            const lockIcon = item.querySelector('.fa-lock');
            if (lockIcon) {
                lockIcon.remove();
            }
        });

        // Show all advanced features
        const advancedCharts = document.querySelectorAll('.advanced-chart, .analytics-pro');
        advancedCharts.forEach(chart => {
            chart.style.display = '';
        });

        // Show employee selection in POS
        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.style.display = '';
        }

        console.log('✅ All features activated');
    }

    // Add this method to check if a module is enabled
    isModuleEnabled(moduleName) {
        return this.businessConfig?.modules?.[moduleName] || false;
    }

    // Check if user is already logged in (ENHANCED: Better token discovery)
    checkIfUserLoggedIn() {
        // ENHANCED: Try TokenManager first for better token discovery
        if (window.tokenManager) {
            const tokenManagerAuth = window.tokenManager.isAuthenticated();
            if (tokenManagerAuth) {
                console.log('✅ [APP] Authentication found via TokenManager');
                return true;
            }
        }
        
        // Fallback to existing logic for backward compatibility
        const userToken = localStorage.getItem('userToken') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const userData = localStorage.getItem('userData') || localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        
        // Must have both token AND user data to be considered logged in
        const hasValidLoginData = !!(userToken && userData);
        
        console.log('Authentication check:', {
            hasToken: !!userToken,
            hasUserData: !!userData,
            isValid: hasValidLoginData,
            tokenManagerAvailable: !!window.tokenManager
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

    // Clear authentication data (ENHANCED: Use TokenManager for better cleanup)
    clearAuthData() {
        // ENHANCED: Use TokenManager if available for comprehensive cleanup
        if (window.tokenManager) {
            window.tokenManager.clearAuth();
            console.log('✅ [APP] Authentication data cleared via TokenManager');
        } else {
            // Fallback to manual cleanup for backward compatibility
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
            console.log('Authentication data cleared manually');
        }
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
                    closeModal(modal.id);
                }
            });
        });
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    closeModal(activeModal.id);
                }
            }
        });
    }

    // Modal functions removed - using global functions in index.html for HTML onclick handlers

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
        this.deferredPrompt = null;
        
        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Show install banner after a delay
            setTimeout(() => {
                this.showInstallBanner(this.deferredPrompt);
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
            try {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    showNotification('App installation started!', 'success');
                } else {
                    console.log('User dismissed the install prompt');
                    showNotification('App installation cancelled', 'info');
                }
                
                this.deferredPrompt = null;
                this.hideInstallBanner();
            } catch (error) {
                console.error('Install failed:', error);
                showNotification('Install failed. Try using browser menu > Install App', 'warning');
            }
        } else {
            // No install prompt available
            console.log('No install prompt available');
            
            // Check if already installed
            if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
                showNotification('App is already installed!', 'info');
            } else {
                showNotification('To install: Look for the install icon in your browser address bar, or use browser menu > "Install App" or "Add to Home Screen"', 'info');
            }
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

// NOTE: Global modal and utility functions are now embedded directly in index.html 
// to prevent module loading conflicts and ensure immediate availability.
// This matches the working architecture from the old backup version.

// NOTE: logout function is now embedded in index.html

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

// NOTE: showNotification, showLoading, and hideLoading functions are now embedded in index.html

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

// Authentication check removed - now handled after PWA loads completely

// Global initialization function for component-loader
window.initializeApp = async function() {
    try {
        // Check if window.app exists but is not a real App instance (created by StateManager)
        if (window.app && !(window.app instanceof App)) {
            console.log('🔄 Replacing empty app object with real App instance...');
            const tempApp = window.app; // Save any properties that StateManager might have added
            window.app = new App();
            // Copy any properties from the temp object if needed
            if (tempApp.cart) window.app.cart = tempApp.cart;
            if (tempApp.selectedEmployee) window.app.selectedEmployee = tempApp.selectedEmployee;
        }
        
        if (!window.app) {
            console.log('🚀 Creating new App instance...');
            window.app = new App();
            console.log('📋 App instance created, methods available:', !!window.app.setupNavigation);
        }
        
        // Now check if it needs initialization
        if (!window.app.initialized) {
            console.log('⏳ Starting app initialization...');
            await window.app.init();
            window.app.initialized = true; // Mark as initialized
            console.log('✅ App initialization completed');
            console.log('🔍 App methods after init:', {
                setupNavigation: !!window.app.setupNavigation,
                showPage: !!window.app.showPage,
                init: !!window.app.init
            });
        } else {
            console.log('✅ App already initialized');
        }
    } catch (error) {
        console.error('❌ Error during app initialization:', error);
        throw error;
    }
};

// Toggle Gift Certificate section in checkout
window.toggleGiftCertificateSection = function() {
    const fieldsSection = document.getElementById('giftCertificateFields');
    const toggleIcon = document.getElementById('gcToggleIcon');
    const toggleButton = document.getElementById('toggleGiftCertificate');
    
    if (!fieldsSection || !toggleIcon) return;
    
    const isHidden = fieldsSection.style.display === 'none';
    
    if (isHidden) {
        // Show the fields
        fieldsSection.style.display = 'block';
        toggleIcon.classList.remove('fa-chevron-down');
        toggleIcon.classList.add('fa-chevron-up');
        toggleButton.classList.remove('btn-outline');
        toggleButton.classList.add('btn-primary');
    } else {
        // Hide the fields
        fieldsSection.style.display = 'none';
        toggleIcon.classList.remove('fa-chevron-up');
        toggleIcon.classList.add('fa-chevron-down');
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-outline');
        
        // Clear gift certificate fields when hiding
        const gcInput = document.getElementById('gcControlNumber');
        const gcStatus = document.getElementById('gcStatus');
        if (gcInput) gcInput.value = '';
        if (gcStatus) gcStatus.innerHTML = '';
        
        // Clear any applied gift certificate in POS system
        if (window.posSystem) {
            window.posSystem.clearGiftCertificate();
        }
    }
};

// Toggle Discounts section in checkout
window.toggleDiscountsSection = function() {
    const fieldsSection = document.getElementById('discountsFields');
    const toggleIcon = document.getElementById('discountsToggleIcon');
    const toggleButton = document.getElementById('toggleDiscounts');
    
    if (!fieldsSection || !toggleIcon) return;
    
    const isHidden = fieldsSection.style.display === 'none';
    
    if (isHidden) {
        // Show the fields
        fieldsSection.style.display = 'block';
        toggleIcon.classList.remove('fa-chevron-down');
        toggleIcon.classList.add('fa-chevron-up');
        toggleButton.classList.remove('btn-outline');
        toggleButton.classList.add('btn-primary');
    } else {
        // Hide the fields
        fieldsSection.style.display = 'none';
        toggleIcon.classList.remove('fa-chevron-up');
        toggleIcon.classList.add('fa-chevron-down');
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-outline');
        
        // Clear discount fields when hiding
        const seniorPWDCheckbox = document.getElementById('applySeniorPWD');
        const promoDiscountSelect = document.getElementById('promoDiscount');
        
        if (seniorPWDCheckbox) seniorPWDCheckbox.checked = false;
        if (promoDiscountSelect) promoDiscountSelect.value = '';
        
        // Hide nested sections
        const seniorPWDFields = document.getElementById('seniorPWDFields');
        const customDiscountField = document.getElementById('customDiscountField');
        
        if (seniorPWDFields) seniorPWDFields.style.display = 'none';
        if (customDiscountField) customDiscountField.style.display = 'none';
        
        // Clear any applied discounts in POS system
        if (window.posSystem && window.posSystem.clearDiscounts) {
            window.posSystem.clearDiscounts();
        }
    }
};

// Global function to manually setup navigation (for debugging)
window.setupNavigation = function() {
    console.log('🔧 Manual navigation setup requested');
    if (window.app && window.app.setupNavigation) {
        window.app.setupNavigation();
        console.log('✅ Manual navigation setup complete');
    } else {
        console.error('❌ App not available for navigation setup');
    }
};

// Initialize app when DOM is ready (authentication will be checked after load)
document.addEventListener('DOMContentLoaded', async () => {
    // Give the database and other systems more time to initialize
    console.log('⏳ Waiting for systems to be ready before app initialization...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await window.initializeApp();
});
