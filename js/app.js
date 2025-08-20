// Main Application Controller
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.cart = [];
        this.selectedEmployee = null;
        // REMOVED: setup-related properties - manual setup wizard doesn't need state tracking
    }

    async init() {
        console.log('🚀 App.init() starting...');
        // Wait for database to be ready before proceeding
        try {
            console.log('💾 Initializing database...');
            await ensureDBInit();
            console.log('✅ Database initialized');
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            return;
        }
        
        // Detect performance profile (optimize for laptops with different CPU/thermal limits)
        console.log('⚡ Setting up performance profile...');
        const savedMode = localStorage.getItem('perfMode');
        this.performanceProfile = (savedMode && savedMode !== 'auto') ? savedMode : this.detectPerformanceProfile();
        window.performanceProfile = this.performanceProfile;
        this.applyPerformanceTuning();
        this.autotunePerformance();
        console.log('✅ Performance profile set to:', this.performanceProfile);
        
        // Check if user is already logged in before showing setup wizard
        console.log('🔐 Checking login state...');
        const isUserLoggedIn = this.checkIfUserLoggedIn();
        
        // If user is logged in, restore their UI state first
        if (isUserLoggedIn) {
            console.log('✅ User is logged in, restoring UI state');
            // Call the checkLoginState function from index.html to restore UI
            if (typeof window.checkLoginState === 'function') {
                window.checkLoginState();
            }
        }
        
        // REMOVED: Automatic setup wizard - now manual only
        console.log('📋 Setup wizard is now manual only - accessible from dashboard');
        
        // Load business configuration first
        console.log('🏢 Loading business configuration...');
        await this.loadBusinessConfig();
        console.log('✅ Business configuration loaded');
        
        // Set up navigation
        console.log('🧭 Setting up navigation...');
        this.setupNavigation();
        
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
            // TESTING MODE: Keep console logs enabled
            console.log('⚡ TESTING MODE: Console logs remain enabled for debugging');
            // Extra scroll/paint optimizations for low-power Intel CPUs
            try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch(_){ }
            // Ensure any global scroll listeners are passive and cheap
            try {
                if (this._passiveScrollHandler) window.removeEventListener('scroll', this._passiveScrollHandler);
                this._passiveScrollHandler = () => {};
                window.addEventListener('scroll', this._passiveScrollHandler, { passive: true });
            } catch(_){ }
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
        try { ric(() => { try { fn(); } catch(e) { console.error(e); } }); } catch(_e) { setTimeout(fn, 0); }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        console.log('🧭 Setting up navigation for', navItems.length, 'items');
        navItems.forEach(item => {
            const page = item.dataset.page;
            console.log('🔗 Adding click handler for page:', page);
            item.addEventListener('click', (e) => {
                console.log('🖱️ Navigation click detected for page:', page);
                e.preventDefault();
                this.showPage(page);
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
        console.log('✅ Navigation setup complete');
    }

    showPage(pageName) {
        console.log('📄 showPage called with:', pageName);
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const selectedPage = document.getElementById(pageName);
        if (selectedPage) {
            console.log('✅ Found page element for:', pageName);
            selectedPage.classList.add('active');
            this.currentPage = pageName;
            
            // Load page-specific data
            console.log('📊 Loading page data for:', pageName);
            this.loadPageData(pageName);
        } else {
            console.error('❌ Page element not found for:', pageName);
        }
    }

    async loadPageData(pageName) {
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
            case 'expenses':
                if (window.loadExpenses) {
                    await window.loadExpenses();
                }
                break;
            case 'bookings':
                console.log('🔄 Loading bookings page...');
                if (window.loadBookings) {
                    console.log('✅ window.loadBookings found, calling it...');
                    await window.loadBookings();
                    console.log('✅ window.loadBookings completed');
                } else {
                    console.error('❌ window.loadBookings not found!');
                }
                break;
            case 'rooms':
                if (window.loadRooms) {
                    await window.loadRooms();
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
            const setting = await db.get('settings', 'businessName');
            if (setting && setting.value) {
                document.getElementById('businessName').textContent = setting.value;
                document.title = `${setting.value} - Business Management System`;
            }
        } catch (error) {
            console.error('Failed to load business name:', error);
        }
    }

    async loadBusinessConfig() {
        try {
            const config = await db.get('settings', 'businessConfig');
            // Defaults
            const defaultConfig = {
                businessType: 'spa',
                modules: {
                    dashboard: true,
                    pos: true,
                    services: true,
                    inventory: true,
                    employees: true,
                    bookings: true,
                    rooms: true,
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

            // Merge with defaults to include any newly added modules/features
            this.businessConfig = config?.value || defaultConfig;
            this.businessConfig.modules = { ...defaultConfig.modules, ...(this.businessConfig.modules || {}) };
            this.businessConfig.features = { ...defaultConfig.features, ...(this.businessConfig.features || {}) };

            // Persist back if we filled in missing fields
            await db.update('settings', { key: 'businessConfig', value: this.businessConfig });
            
            // Apply feature flags to UI
            this.applyFeatureFlags();
        } catch (error) {
            console.error('Failed to load business config:', error);
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

    // Add this method to check if a module is enabled
    isModuleEnabled(moduleName) {
        return this.businessConfig?.modules?.[moduleName] || false;
    }

    // Check if user is already logged in
    checkIfUserLoggedIn() {
        // Check multiple possible login state indicators
        const userToken = localStorage.getItem('userToken') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const userData = localStorage.getItem('userData') || localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        // If any login indicators exist, user is likely logged in
        const hasLoginData = !!(userToken || userData || isLoggedIn === 'true');
        
        if (hasLoginData) {
            console.log('Detected existing login state:', {
                hasToken: !!userToken,
                hasUserData: !!userData,
                isLoggedIn: isLoggedIn
            });
        }
        
        return hasLoginData;
    }

    // Force close setup wizard (simplified for manual use)
    forceCloseSetupWizard() {
        const setupModal = document.getElementById('setupWizardModal');
        if (setupModal) {
            setupModal.style.display = 'none';
            setupModal.classList.add('setup-completed');
            console.log('Setup wizard closed');
        }
    }

    // Handle login state change - called when user logs in successfully
    onUserLoggedIn() {
        console.log('User logged in - updating app state');
        
        // Close setup wizard if it's open (manual setup wizard doesn't need persistence)
        this.forceCloseSetupWizard();
        
        // Update login detection state
        const isLoggedIn = this.checkIfUserLoggedIn();
        console.log('Login state after login:', isLoggedIn);
        
        // Reload business configuration and name
        this.loadBusinessName();
        this.loadBusinessConfig();

        // Ensure initial page shows Settings if manager not yet assigned
        try {
            if (localStorage.getItem('managerAssigned') !== 'true') {
                this.showPage('settings');
            }
        } catch(_) {}
    }

    // Handle logout - called when user logs out
    onUserLoggedOut() {
        console.log('User logged out - resetting app state');
        
        // REMOVED: Setup state properties - manual setup wizard doesn't need state tracking
        
        // Clear any cached business data
        this.businessConfig = null;
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
            
            // Clear form if exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    // Unified confirm dialog
    async confirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            if (!modal) { resolve(window.confirm(message)); return; }
            modal.querySelector('#confirmTitle').textContent = title || 'Confirm';
            modal.querySelector('#confirmMessage').textContent = message || '';
            const ok = modal.querySelector('#confirmOkBtn');
            const cancel = modal.querySelector('#confirmCancelBtn');
            const cleanup = () => {
                ok.onclick = null; cancel.onclick = null; this.closeModal('confirmModal');
            };
            ok.onclick = () => { cleanup(); resolve(true); };
            cancel.onclick = () => { cleanup(); resolve(false); };
            modal.classList.add('active');
        });
    }

    // Unified prompt dialog (text or select)
    async prompt(options) {
        return new Promise((resolve) => {
            const modal = document.getElementById('promptModal');
            if (!modal) { resolve(window.prompt(options?.label || 'Input', options?.value || '')); return; }
            modal.querySelector('#promptTitle').textContent = options?.title || 'Input';
            modal.querySelector('#promptLabel').textContent = options?.label || '';
            modal.querySelector('#promptHint').textContent = options?.hint || '';
            const input = modal.querySelector('#promptInput');
            const select = modal.querySelector('#promptSelect');
            if (options?.type === 'select') {
                input.style.display = 'none'; select.style.display = '';
                select.innerHTML = (options?.options || []).map(o => `<option value="${o.value}">${o.label}</option>`).join('');
                select.value = options?.value || (options?.options?.[0]?.value || '');
            } else {
                select.style.display = 'none'; input.style.display = '';
                input.type = options?.inputType || 'text';
                input.value = options?.value || '';
            }
            const ok = modal.querySelector('#promptOkBtn');
            const cancel = modal.querySelector('#promptCancelBtn');
            const cleanup = () => { ok.onclick = null; cancel.onclick = null; this.closeModal('promptModal'); };
            ok.onclick = () => { const val = options?.type === 'select' ? select.value : input.value; cleanup(); resolve(val); };
            cancel.onclick = () => { cleanup(); resolve(null); };
            modal.classList.add('active');
            setTimeout(() => { (options?.type === 'select' ? select : input).focus(); }, 50);
        });
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

// Global functions for modals
function openModal(modalId) {
    window.app.openModal(modalId);
}

function closeModal(modalId) {
    window.app.closeModal(modalId);
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM loaded, creating App instance...');
    window.app = new App();
    console.log('✅ App instance created, starting initialization...');
    // Immediate initialization for better performance since DB is pre-initialized
    await window.app.init();
    console.log('🎉 App initialization completed!');
});
