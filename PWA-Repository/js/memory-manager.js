// Memory Manager - Prevents Chrome "Aw, Snap!" crashes
// This prevents memory leaks and manages resources efficiently

class MemoryManager {
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
        this.eventListeners = new Map();
        this.observers = new Set();
        this.cleanupInterval = null;
        this.gcInterval = null;
        this.memoryMonitorInterval = null;
        this.cleanup();
        this.startMonitoring();
    }

    // Cleanup function to prevent memory leaks
    cleanup() {
        // Clear all intervals and timeouts periodically
        this.cleanupInterval = setInterval(() => {
            this.clearUnusedResources();
        }, 60000); // Every minute

        // Force garbage collection every 5 minutes
        this.gcInterval = setInterval(() => {
            this.forceGarbageCollection();
        }, 300000); // Every 5 minutes

        // Monitor memory usage
        this.memoryMonitorInterval = setInterval(() => {
            this.monitorMemory();
        }, 30000); // Every 30 seconds
    }

    // Start monitoring system
    startMonitoring() {
        console.log('🧠 Memory Manager initialized');
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseNonEssentialOperations();
            } else {
                this.resumeOperations();
            }
        });

        // Listen for low memory warnings (if supported)
        if ('memory' in performance) {
            this.monitorMemoryPressure();
        }
    }

    // Clear unused resources
    clearUnusedResources() {
        // Clear old IndexedDB connections
        if (window.database && typeof window.database.cleanup === 'function') {
            window.database.cleanup();
        }

        // Clear unused state manager subscriptions
        if (window.StateManager && typeof window.StateManager.cleanup === 'function') {
            window.StateManager.cleanup();
        }

        // Clear console logs to free memory
        if (console.clear) {
            console.clear();
        }

        // Only log cleanup if in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🧹 Memory cleanup completed');
        }
    }

    // Force garbage collection (if available)
    forceGarbageCollection() {
        if (window.gc) {
            window.gc();
            console.log('♻️ Forced garbage collection');
        } else {
            // Alternative: create and destroy objects to trigger GC
            for (let i = 0; i < 100; i++) {
                const temp = new Array(1000);
            }
        }
    }

    // Monitor memory usage (less verbose)
    monitorMemory() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
            
            // Adaptive threshold based on performance mode
            const performanceMode = window.performanceSettings?.settings?.enabled;
            const threshold = performanceMode ? 0.70 : 0.90; // 70% for performance mode, 90% normal
            
            const usagePercent = used / limit;
            if (usagePercent > threshold) {
                console.warn(`⚠️ Critical memory usage: ${used}MB (${Math.round(usagePercent * 100)}%) - running emergency cleanup`);
                this.emergencyCleanup();
            } else if (usagePercent > 0.70) {  // Changed from 0.5 to 0.70
                console.warn(`⚠️ High memory usage: ${used}MB (${Math.round(usagePercent * 100)}%) - consider closing other tabs`);
                
                // Auto-enable performance mode for high memory usage
                if (window.performanceSettings && !window.performanceSettings.settings.enabled) {
                    console.warn('🐢 Auto-enabling performance mode due to high memory usage');
                    window.performanceSettings.enablePerformanceMode();
                }
            } else if (usagePercent > 0.5) {
                console.log(`💾 Memory: ${used}MB (${Math.round(usagePercent * 100)}%)`);
            }
            // Below 50% usage = no logging (quiet operation)
        }
    }

    // Monitor memory pressure
    monitorMemoryPressure() {
        // This would use the Memory API if fully supported
        // For now, just monitor heap size
        setInterval(() => {
            if ('memory' in performance) {
                const memory = performance.memory;
                const usagePercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
                
                if (usagePercent > 0.9) {
                    this.emergencyCleanup();
                }
            }
        }, 10000); // Check every 10 seconds
    }

    // Pause non-essential operations when tab is hidden
    pauseNonEssentialOperations() {
        // Pause animations, polling, etc.
        document.body.classList.add('tab-hidden');
        console.log('⏸️ Pausing non-essential operations');
    }

    // Resume operations when tab becomes visible
    resumeOperations() {
        document.body.classList.remove('tab-hidden');
        console.log('▶️ Resuming operations');
    }

    // Emergency cleanup when memory is critically high
    emergencyCleanup() {
        console.warn('🚨 Emergency memory cleanup initiated');
        
        // Clear expired auth tokens first (fixes cascading auth failures)
        if (window.authSystem && typeof window.authSystem.isTokenExpired === 'function') {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (token && window.authSystem.isTokenExpired(token)) {
                console.warn('🔐 Clearing expired token during emergency cleanup');
                window.authSystem.logout();
            }
        }
        
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    if (name.includes('spa')) {
                        caches.delete(name);
                    }
                });
            });
        }

        // Clear localStorage except essential items
        // CRITICAL: Include attendance records to prevent data loss
        const essentialKeys = [
            'userToken', 
            'userData', 
            'settings',
            'attendance_attendanceRecords',      // Today's attendance records
            'attendance_allAttendanceRecords',   // Historical attendance records  
            'attendance_lastSyncDate',           // Sync tracking
            'attendance_pendingSync',            // Pending sync data
            'employees',                         // Employee list needed for attendance
            'rooms',                              // Room assignments
            'giftCertificates',                  // Gift certificates
            'customers',                         // Customer data
            'inventory',                         // Inventory items
            'transactions'                       // Transaction history
        ];
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!essentialKeys.includes(key)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Force immediate garbage collection
        this.forceGarbageCollection();
        
        // Reload page if still critically high
        setTimeout(() => {
            if ('memory' in performance) {
                const memory = performance.memory;
                const usagePercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
                
                if (usagePercent > 0.95) {
                    console.warn('🔄 Memory still critical - reloading page');
                    location.reload();
                }
            }
        }, 5000);
    }

    // Register tracked interval
    setTrackedInterval(callback, delay) {
        const interval = setInterval(callback, delay);
        this.intervals.add(interval);
        return interval;
    }

    // Register tracked timeout
    setTrackedTimeout(callback, delay) {
        const timeout = setTimeout(() => {
            callback();
            this.timeouts.delete(timeout);
        }, delay);
        this.timeouts.add(timeout);
        return timeout;
    }

    // Clear all tracked resources
    clearAllTracked() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.intervals.clear();
        this.timeouts.clear();
    }

    // Destroy memory manager and clear its own intervals
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        if (this.gcInterval) {
            clearInterval(this.gcInterval);
            this.gcInterval = null;
        }
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }
        this.clearAllTracked();
    }
}

// Initialize memory manager
const memoryManager = new MemoryManager();

// Export for global access
window.memoryManager = memoryManager;

console.log('🧠 Memory Manager loaded and active');