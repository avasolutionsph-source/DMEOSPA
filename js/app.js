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
        
        console.log('🚀 PWA: Starting full initialization, authentication will be checked after load');
        
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
        
        navItems.forEach((item, index) => {
            const page = item.dataset.page;
            console.log(`🔧 Setting up navigation item ${index + 1}: ${page}`);
            
            if (window.logger) {
                window.logger.debug('Adding navigation click handler', { 
                    category: 'APP', 
                    operation: 'add_nav_handler',
                    data: { page: page }
                });
            }
            
            // Remove any existing listeners by cloning the element
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`🧭 Navigation clicked: ${page}`);
                
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
                
                // Update active state - get fresh nav items list
                const allNavItems = document.querySelectorAll('.nav-item');
                allNavItems.forEach(nav => nav.classList.remove('active'));
                newItem.classList.add('active');
            });
            
            console.log(`✅ Navigation item ${index + 1} setup complete: ${page}`);
        });
    }

    async showPage(pageName) {
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
        
        // Check if page already exists in DOM
        const selectedPage = document.getElementById(pageName);
        if (selectedPage) {
            // Page already loaded - just hide others and show this one
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            selectedPage.classList.add('active');
            
            // Load page-specific data
            this.loadPageData(pageName);
            console.log(`✅ Existing page ${pageName} activated`);
        } else {
            // Page element not found, need to load component
            console.log(`📄 Page element #${pageName} not found, loading component...`);
            
            // Check if component loader is available
            if (!window.componentLoader) {
                console.error('❌ Component loader not available yet, retrying in 100ms...');
                setTimeout(() => this.showPage(pageName), 100);
                return;
            }
            
            try {
                console.log(`🔄 Loading component: ${pageName} into .main-content`);
                const success = await window.componentLoader.loadComponent(pageName, '.main-content', false);
                
                if (success) {
                    console.log(`✅ Component ${pageName} loaded successfully`);
                    
                    // Since we loaded with append=false, the component replaced the content
                    // The page should already be active from the component, just load data
                    this.loadPageData(pageName);
                    console.log(`🎯 Page ${pageName} loaded as new content`);
                } else {
                    console.error(`❌ Failed to load component: ${pageName}`);
                    // Try to show dashboard as fallback
                    if (pageName !== 'dashboard') {
                        console.log(`🔄 Falling back to dashboard...`);
                        this.showPage('dashboard');
                    }
                }
            } catch (error) {
                console.error(`❌ Error loading page component ${pageName}:`, error);
                // Try to show dashboard as fallback
                if (pageName !== 'dashboard') {
                    console.log(`🔄 Falling back to dashboard due to error...`);
                    this.showPage('dashboard');
                }
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
            case 'expenses':
                // Initialize expense manager if not already done
                if (!window.expenseManager && window.ExpenseManager) {
                    window.expenseManager = new ExpenseManager();
                }
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

        // Clear container and inject modernized HTML structure
        container.innerHTML = `
            <div class="gift-certificates-container">
                <!-- Modern Page Header -->
                <div class="page-header" style="
                    background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
                    padding: 2rem; 
                    border-radius: 16px; 
                    margin-bottom: 2rem; 
                    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 16px 64px rgba(0, 0, 0, 0.25)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 12px 48px rgba(0, 0, 0, 0.2)'">
                    <!-- Subtle Pattern Overlay -->
                    <div style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: url('data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M30 0L0 30l30 30 30-30z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');
                        pointer-events: none;
                    "></div>
                    <!-- Gradient Light Effect -->
                    <div style="
                        position: absolute;
                        top: -50%;
                        right: -30%;
                        width: 60%;
                        height: 120%;
                        background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
                        pointer-events: none;
                    "></div>
                    <div class="header-content" style="position: relative; z-index: 1;">
                        <div class="header-left">
                            <div class="header-icon" style="color: rgba(255,255,255,0.9); font-size: 2rem; margin-right: 1rem;">
                                <i class="fas fa-gift"></i>
                            </div>
                            <div class="header-text">
                                <h1 style="color: white; font-size: 2rem; font-weight: 700; margin-bottom: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Gift Certificate Management</h1>
                            </div>
                        </div>
                        <div class="header-actions">
                            <button class="btn btn-primary" id="create-certificate-btn" style="
                                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                padding: 0.75rem 1.5rem;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(249, 115, 22, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(249, 115, 22, 0.3)'">
                                <i class="fas fa-plus"></i>
                                <span>Create Certificate</span>
                            </button>
                            <button class="btn btn-secondary" id="validate-certificate-btn" style="
                                background: rgba(255,255,255,0.9);
                                color: #374151;
                                border: 2px solid rgba(255,255,255,0.5);
                                border-radius: 8px;
                                padding: 0.75rem 1.5rem;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                backdrop-filter: blur(10px);
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                            " onmouseover="this.style.background='white'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.9)'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                <i class="fas fa-search"></i>
                                <span>Validate</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="gc-dashboard" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <div class="stat-card total" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: none; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1); text-align: center;">
                        <i class="fas fa-certificate" style="color: #667eea; font-size: 2rem; margin-bottom: 0.75rem;"></i>
                        <div class="stat-value" id="gc-total-count" style="font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">0</div>
                        <div class="stat-label" style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Total Certificates</div>
                    </div>
                    <div class="stat-card active" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: none; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1); text-align: center;">
                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 2rem; margin-bottom: 0.75rem;"></i>
                        <div class="stat-value" id="gc-active-count" style="font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">0</div>
                        <div class="stat-label" style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Active</div>
                    </div>
                    <div class="stat-card redeemed" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: none; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1); text-align: center;">
                        <i class="fas fa-shopping-cart" style="color: #f59e0b; font-size: 2rem; margin-bottom: 0.75rem;"></i>
                        <div class="stat-value" id="gc-redeemed-count" style="font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">0</div>
                        <div class="stat-label" style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Redeemed</div>
                    </div>
                    <div class="stat-card expired" style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); border: none; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1); text-align: center;">
                        <i class="fas fa-clock" style="color: #ef4444; font-size: 2rem; margin-bottom: 0.75rem;"></i>
                        <div class="stat-value" id="gc-expired-count" style="font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">0</div>
                        <div class="stat-label" style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Expired</div>
                    </div>
                    <div class="stat-card value" style="background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%); border: none; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1); text-align: center;">
                        <i class="fas fa-coins" style="color: #3b82f6; font-size: 2rem; margin-bottom: 0.75rem;"></i>
                        <div class="stat-value" id="gc-total-value" style="font-size: 1.8rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">₱0.00</div>
                        <div class="stat-label" style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Total Value</div>
                    </div>
                    <div class="stat-card remaining" style="background: linear-gradient(135deg, #faf5ff 0%, #e9d5ff 100%); border: none; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1); text-align: center;">
                        <i class="fas fa-wallet" style="color: #8b5cf6; font-size: 2rem; margin-bottom: 0.75rem;"></i>
                        <div class="stat-value" id="gc-remaining-value" style="font-size: 1.8rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">₱0.00</div>
                        <div class="stat-label" style="color: #64748b; font-size: 0.9rem; font-weight: 500;">Remaining Value</div>
                    </div>
                </div>

                <div class="gc-filters" style="display: flex; gap: 0.75rem; margin-bottom: 2rem; flex-wrap: wrap;">
                    <button class="filter-btn active" data-filter="all" style="
                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        padding: 0.75rem 1.25rem;
                        font-weight: 600;
                        font-size: 0.9rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border: 2px solid transparent;
                    ">All Certificates</button>
                    <button class="filter-btn" data-filter="active" style="
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        padding: 0.75rem 1.25rem;
                        font-weight: 600;
                        font-size: 0.9rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border: 2px solid transparent;
                    ">Active</button>
                    <button class="filter-btn" data-filter="redeemed" style="
                        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        padding: 0.75rem 1.25rem;
                        font-weight: 600;
                        font-size: 0.9rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border: 2px solid transparent;
                    ">Redeemed</button>
                    <button class="filter-btn" data-filter="expired" style="
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        padding: 0.75rem 1.25rem;
                        font-weight: 600;
                        font-size: 0.9rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border: 2px solid transparent;
                    ">Expired</button>
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
                case 'expenses':
                    hasAccess = entitlements.expenses === true;
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
