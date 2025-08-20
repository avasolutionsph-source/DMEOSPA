// Comprehensive Data Cleaner - Clear All User Data While Preserving Code
class DataCleaner {
    constructor() {
        this.clearingInProgress = false;
        this.clearedItems = [];
    }

    // Main data clearing function
    async clearAllUserData() {
        if (this.clearingInProgress) {
            console.log('⚠️ Data clearing already in progress');
            return;
        }

        this.clearingInProgress = true;
        console.log('🧹 COMPREHENSIVE DATA CLEAR: Starting...');

        try {
            // Step 1: Clear all browser storage
            await this.clearBrowserStorage();
            
            // Step 2: Clear IndexedDB
            await this.clearIndexedDB();
            
            // Step 3: Clear Service Worker caches
            await this.clearServiceWorkerCaches();
            
            // Step 4: Clear application-specific data
            await this.clearApplicationData();
            
            // Step 5: Reset UI state
            this.resetUIState();
            
            // Step 6: Clear any remaining cached data
            await this.clearRemainingCache();
            
            console.log('✅ COMPREHENSIVE DATA CLEAR: Complete!');
            console.log('📋 Items cleared:', this.clearedItems);
            
            return {
                success: true,
                clearedItems: this.clearedItems,
                message: 'All user data cleared successfully'
            };
            
        } catch (error) {
            console.error('❌ Data clearing failed:', error);
            return {
                success: false,
                error: error.message,
                clearedItems: this.clearedItems
            };
        } finally {
            this.clearingInProgress = false;
        }
    }

    // Clear all browser storage
    async clearBrowserStorage() {
        console.log('🧹 Clearing browser storage...');
        
        // Get all localStorage keys before clearing
        const localKeys = Object.keys(localStorage);
        const sessionKeys = Object.keys(sessionStorage);
        
        // Clear localStorage
        localStorage.clear();
        this.clearedItems.push(`localStorage (${localKeys.length} items): ${localKeys.join(', ')}`);
        
        // Clear sessionStorage
        sessionStorage.clear();
        this.clearedItems.push(`sessionStorage (${sessionKeys.length} items): ${sessionKeys.join(', ')}`);
        
        console.log('✅ Browser storage cleared');
    }

    // Clear IndexedDB databases
    async clearIndexedDB() {
        console.log('🧹 Clearing IndexedDB databases...');
        
        if ('indexedDB' in window) {
            try {
                const databases = await indexedDB.databases();
                
                for (const dbInfo of databases) {
                    console.log(`🗑️ Deleting database: ${dbInfo.name}`);
                    indexedDB.deleteDatabase(dbInfo.name);
                    this.clearedItems.push(`IndexedDB: ${dbInfo.name}`);
                }
                
                console.log('✅ IndexedDB databases cleared');
            } catch (error) {
                console.warn('⚠️ Could not clear some IndexedDB databases:', error);
                this.clearedItems.push(`IndexedDB: Partial clear (${error.message})`);
            }
        }
    }

    // Clear Service Worker caches
    async clearServiceWorkerCaches() {
        console.log('🧹 Clearing Service Worker caches...');
        
        if ('serviceWorker' in navigator && 'caches' in window) {
            try {
                const cacheNames = await caches.keys();
                
                for (const cacheName of cacheNames) {
                    console.log(`🗑️ Deleting cache: ${cacheName}`);
                    await caches.delete(cacheName);
                    this.clearedItems.push(`Cache: ${cacheName}`);
                }
                
                console.log('✅ Service Worker caches cleared');
            } catch (error) {
                console.warn('⚠️ Could not clear some caches:', error);
                this.clearedItems.push(`Caches: Partial clear (${error.message})`);
            }
        }
    }

    // Clear application-specific data
    async clearApplicationData() {
        console.log('🧹 Clearing application data...');
        
        // Reset global variables
        const globalVarsToReset = [
            'authSystem', 'permanentAuth', 'universalLogin', 'immediateFix',
            'userManagement', 'roleManager', 'bookingsManager', 'dashboardManager'
        ];

        globalVarsToReset.forEach(varName => {
            if (window[varName]) {
                if (typeof window[varName].clearSession === 'function') {
                    try {
                        window[varName].clearSession();
                        this.clearedItems.push(`Global: ${varName}.clearSession()`);
                    } catch (e) {}
                }
                
                if (typeof window[varName].reset === 'function') {
                    try {
                        window[varName].reset();
                        this.clearedItems.push(`Global: ${varName}.reset()`);
                    } catch (e) {}
                }
            }
        });

        console.log('✅ Application data cleared');
    }

    // Reset UI state
    resetUIState() {
        console.log('🧹 Resetting UI state...');
        
        try {
            // Reset business name
            const businessNameEl = document.getElementById('businessName');
            if (businessNameEl) {
                businessNameEl.textContent = 'Ava Solutions';
            }
            
            // Reset user info
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = 'User';
            }
            
            // Show login button, hide user info
            const showLoginBtn = document.getElementById('showLoginBtn');
            const userInfo = document.getElementById('userInfo');
            
            if (showLoginBtn) showLoginBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            
            // Reset navigation visibility
            document.querySelectorAll('.nav-item').forEach(item => {
                item.style.display = '';
                item.style.visibility = 'visible';
                item.removeAttribute('aria-hidden');
            });
            
            // Reset page to dashboard
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            const dashboardPage = document.getElementById('dashboard');
            if (dashboardPage) {
                dashboardPage.classList.add('active');
            }
            
            // Remove modal-open class
            document.body.classList.remove('modal-open');
            
            this.clearedItems.push('UI state reset');
            console.log('✅ UI state reset');
            
        } catch (error) {
            console.warn('⚠️ Could not reset all UI state:', error);
        }
    }

    // Clear any remaining cached data
    async clearRemainingCache() {
        console.log('🧹 Clearing remaining cache...');
        
        // Clear any performance caches
        if (window.performanceOptimizer) {
            try {
                window.performanceOptimizer.clearCache();
                this.clearedItems.push('Performance cache');
            } catch (e) {}
        }
        
        // Clear any data bleed detector data
        if (window.dataBleedDetector) {
            try {
                window.dataBleedDetector.lastUserEmail = null;
                window.dataBleedDetector.lastUserRole = null;
                window.dataBleedDetector.warningShown = false;
                this.clearedItems.push('Data bleed detector reset');
            } catch (e) {}
        }
        
        // Clear any therapist portal cache
        if (window.therapistPortalManager) {
            try {
                window.therapistPortalManager.currentUser = null;
                window.therapistPortalManager.portalWindow = null;
                this.clearedItems.push('Therapist portal cache');
            } catch (e) {}
        }
        
        console.log('✅ Remaining cache cleared');
    }

    // Quick clear function (for console use)
    async quickClear() {
        console.log('🚨 QUICK CLEAR: Emergency data wipe');
        
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear IndexedDB
        try {
            const databases = await indexedDB.databases();
            databases.forEach(db => indexedDB.deleteDatabase(db.name));
        } catch (e) {}
        
        // Clear caches
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (e) {}
        
        // Reset UI
        this.resetUIState();
        
        console.log('✅ Quick clear complete - refresh page for fresh start');
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('All data cleared! Refresh page for fresh start.', 'success');
        }
        
        return true;
    }

    // Generate clearing report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            clearedItems: this.clearedItems,
            browserInfo: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                localStorage: Object.keys(localStorage).length,
                sessionStorage: Object.keys(sessionStorage).length
            }
        };
        
        console.log('📋 Data clearing report:', report);
        return report;
    }
}

// Global data cleaner
window.dataCleaner = new DataCleaner();

// Expose functions for console use
window.clearAllData = () => window.dataCleaner.clearAllUserData();
window.quickClear = () => window.dataCleaner.quickClear();
window.clearingReport = () => window.dataCleaner.generateReport();

console.log('🧹 Data Cleaner loaded - ready for comprehensive data clearing');
