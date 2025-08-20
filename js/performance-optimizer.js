// Performance Optimizer for Therapist Portal and Bookings
class PerformanceOptimizer {
    constructor() {
        this.loadingCache = new Map();
        this.dataCache = new Map();
        this.loadingQueue = [];
        this.isProcessingQueue = false;
        this.criticalModulesLoaded = false;
    }

    async init() {
        console.log('⚡ Performance Optimizer initializing...');
        
        // Detect device capabilities
        this.deviceProfile = this.detectDeviceProfile();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Pre-cache critical data
        await this.preCacheCriticalData();
        
        // Setup lazy loading for modules
        this.setupLazyLoading();
        
        console.log('✅ Performance Optimizer ready');
    }

    detectDeviceProfile() {
        const profile = {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            cores: navigator.hardwareConcurrency || 4,
            memory: navigator.deviceMemory || 4,
            connection: navigator.connection?.effectiveType || '4g',
            isLowPower: false
        };

        // Detect low-power devices
        profile.isLowPower = profile.cores <= 4 || profile.memory <= 4 || 
                            profile.connection === 'slow-2g' || profile.connection === '2g';

        console.log('📱 Device profile:', profile);
        return profile;
    }

    setupPerformanceMonitoring() {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn(`⚠️ Long task detected: ${entry.duration}ms`);
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // Fallback for browsers that don't support longtask
            }
        }
    }

    async preCacheCriticalData() {
        try {
            // Pre-cache user authentication state
            if (window.authSystem?.currentUser) {
                const userRole = window.authSystem.currentUser.role?.toLowerCase();
                
                if (userRole === 'therapist') {
                    // Pre-load therapist-specific data
                    this.preloadTherapistData();
                }
            }

            // Pre-cache business configuration
            if (window.db) {
                const businessConfig = await window.db.get('settings', 'businessConfig');
                this.dataCache.set('businessConfig', businessConfig);
            }
        } catch (error) {
            console.warn('Pre-cache failed, continuing normally:', error);
        }
    }

    async preloadTherapistData() {
        try {
            // Background load today's date for quick access
            const today = new Date().toDateString();
            this.dataCache.set('todayDate', today);

            // Pre-load therapist identifiers
            if (window.bookingsManager && typeof window.bookingsManager.getTherapistIdentifiers === 'function') {
                const identifiers = await window.bookingsManager.getTherapistIdentifiers();
                this.dataCache.set('therapistIdentifiers', identifiers);
            }
        } catch (error) {
            console.warn('Therapist pre-load failed:', error);
        }
    }

    setupLazyLoading() {
        // Override module loading to use lazy loading
        this.originalShowPage = window.app?.showPage;
        if (window.app) {
            window.app.showPage = async (pageName) => {
                await this.lazyLoadModule(pageName);
                if (this.originalShowPage) {
                    this.originalShowPage.call(window.app, pageName);
                }
            };
        }
    }

    async lazyLoadModule(moduleName) {
        if (this.loadingCache.has(moduleName)) {
            return this.loadingCache.get(moduleName);
        }

        const loadPromise = this.loadModuleOptimized(moduleName);
        this.loadingCache.set(moduleName, loadPromise);
        return loadPromise;
    }

    async loadModuleOptimized(moduleName) {
        const startTime = performance.now();
        
        try {
            switch (moduleName) {
                case 'bookings':
                    await this.optimizedBookingsLoad();
                    break;
                case 'therapist-portal':
                    await this.optimizedTherapistPortalLoad();
                    break;
                default:
                    // Default loading
                    if (window.app?.loadPageData) {
                        await window.app.loadPageData(moduleName);
                    }
            }

            const loadTime = performance.now() - startTime;
            console.log(`⚡ Module ${moduleName} loaded in ${loadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
        }
    }

    async optimizedBookingsLoad() {
        console.log('🚀 Optimized bookings loading...');
        
        // Show skeleton UI immediately
        this.showBookingsSkeleton();
        
        // Initialize bookings manager if not already done
        if (!window.bookingsManager) {
            // Lazy load bookings.js if not loaded
            await this.loadScript('./js/bookings.js');
        }

        // Load with performance optimizations
        if (window.bookingsManager) {
            // Use cached data if available
            const cachedBookings = this.dataCache.get('bookings');
            if (cachedBookings && this.isCacheValid('bookings')) {
                await this.displayBookingsFromCache(cachedBookings);
            }

            // Background sync for fresh data
            this.backgroundSync('bookings');
            
            await window.bookingsManager.init();
        }
        
        this.hideBookingsSkeleton();
    }

    async optimizedTherapistPortalLoad() {
        console.log('🩺 Optimized therapist portal loading...');
        
        // Use cached therapist data if available
        const cachedData = this.dataCache.get('therapistIdentifiers');
        
        if (!window.therapistPortalManager) {
            await this.loadScript('./js/therapist-portal.js');
        }

        if (window.therapistPortalManager) {
            // Inject cached data to speed up loading
            if (cachedData) {
                window.therapistPortalManager.cachedData = cachedData;
            }
            
            await window.therapistPortalManager.loadPortalPage();
        }
    }

    showBookingsSkeleton() {
        const bookingsPage = document.getElementById('bookings');
        if (bookingsPage) {
            bookingsPage.innerHTML = `
                <div class="loading-skeleton">
                    <div class="skeleton-header">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-actions"></div>
                    </div>
                    <div class="skeleton-table">
                        ${Array(5).fill().map(() => `
                            <div class="skeleton-row">
                                <div class="skeleton-cell"></div>
                                <div class="skeleton-cell"></div>
                                <div class="skeleton-cell"></div>
                                <div class="skeleton-cell"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    hideBookingsSkeleton() {
        const skeleton = document.querySelector('.loading-skeleton');
        if (skeleton) {
            skeleton.remove();
        }
    }

    async displayBookingsFromCache(bookings) {
        // Quickly display cached bookings while loading fresh data
        if (window.bookingsManager && bookings) {
            window.bookingsManager.bookings = bookings;
            // Use fast display method without full re-render
            this.quickRenderBookings(bookings);
        }
    }

    quickRenderBookings(bookings) {
        // Fast rendering method for cached data
        const container = document.getElementById('bookingsTableBody');
        if (container && bookings.length > 0) {
            // Use DocumentFragment for faster DOM manipulation
            const fragment = document.createDocumentFragment();
            
            bookings.slice(0, 20).forEach(booking => { // Show first 20 for speed
                const row = this.createBookingRowElement(booking);
                fragment.appendChild(row);
            });
            
            container.appendChild(fragment);
        }
    }

    createBookingRowElement(booking) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.customerName || 'N/A'}</td>
            <td>${booking.serviceName || 'N/A'}</td>
            <td>${this.formatDate(booking.date)}</td>
            <td><span class="status-${booking.status}">${booking.status}</span></td>
        `;
        return row;
    }

    formatDate(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch {
            return dateStr || 'N/A';
        }
    }

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    backgroundSync(type) {
        // Use requestIdleCallback for background sync
        const sync = () => {
            if (type === 'bookings' && window.bookingsManager) {
                window.bookingsManager.syncExternalBookings()
                    .then(bookings => {
                        this.dataCache.set('bookings', bookings);
                        this.dataCache.set('bookings_timestamp', Date.now());
                    })
                    .catch(console.warn);
            }
        };

        if ('requestIdleCallback' in window) {
            requestIdleCallback(sync, { timeout: 5000 });
        } else {
            setTimeout(sync, 100);
        }
    }

    isCacheValid(key, maxAge = 5 * 60 * 1000) { // 5 minutes default
        const timestamp = this.dataCache.get(`${key}_timestamp`);
        return timestamp && (Date.now() - timestamp) < maxAge;
    }

    // Cache management
    setCachedData(key, data) {
        this.dataCache.set(key, data);
        this.dataCache.set(`${key}_timestamp`, Date.now());
    }

    getCachedData(key) {
        if (this.isCacheValid(key)) {
            return this.dataCache.get(key);
        }
        return null;
    }

    clearCache() {
        this.dataCache.clear();
        console.log('🧹 Performance cache cleared');
    }
}

// Initialize performance optimizer
window.performanceOptimizer = new PerformanceOptimizer();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceOptimizer.init();
    });
} else {
    window.performanceOptimizer.init();
}
