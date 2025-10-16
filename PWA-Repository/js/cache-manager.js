/**
 * CacheManager - Smart Caching with TTL Support
 *
 * Purpose: Centralized caching system to reduce redundant API calls and improve performance.
 * Supports configurable TTL (Time To Live) per cache entry and pattern-based invalidation.
 *
 * Features:
 * - TTL-based cache expiration (default: 30 seconds)
 * - Memory-efficient Map-based storage
 * - Pattern-based cache invalidation (e.g., 'employees:*')
 * - Automatic cleanup of expired entries
 * - Cache statistics and monitoring
 *
 * Usage:
 * ```javascript
 * // Set cache with default TTL (30s)
 * window.cacheManager.set('employees', employeeData);
 *
 * // Set cache with custom TTL (5 minutes)
 * window.cacheManager.set('products', productData, 300000);
 *
 * // Get cached data
 * const cached = window.cacheManager.get('employees');
 * if (cached) {
 *     console.log('Using cached data');
 * } else {
 *     console.log('Cache miss, fetching fresh data');
 * }
 *
 * // Invalidate specific cache
 * window.cacheManager.invalidate('employees');
 *
 * // Invalidate all caches matching pattern
 * window.cacheManager.invalidatePattern('employee');
 * ```
 */

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.ttlMap = new Map();
        this.accessLog = new Map(); // Track cache hits/misses
        this.defaultTTL = 30000; // 30 seconds default
        this.maxCacheSize = 100; // Prevent memory bloat
        this.cleanupInterval = null;

        // Start automatic cleanup every 60 seconds
        this.startAutomaticCleanup();

        console.log('✅ [CACHE-MANAGER] Initialized with TTL:', this.defaultTTL, 'ms');
    }

    /**
     * Set cache entry with TTL
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttlMs - Time to live in milliseconds (default: 30000)
     */
    set(key, value, ttlMs = this.defaultTTL) {
        // Check cache size limit
        if (this.cache.size >= this.maxCacheSize) {
            console.warn('⚠️ [CACHE-MANAGER] Cache limit reached, clearing oldest entries');
            this.clearOldestEntries(10); // Remove 10 oldest entries
        }

        const expiry = Date.now() + ttlMs;
        this.cache.set(key, value);
        this.ttlMap.set(key, expiry);

        console.log(`💾 [CACHE-MANAGER] Cached "${key}" with TTL: ${ttlMs}ms`);
    }

    /**
     * Get cached value if not expired
     * @param {string} key - Cache key
     * @returns {*|null} Cached value or null if expired/not found
     */
    get(key) {
        if (!this.cache.has(key)) {
            this.recordAccess(key, false);
            return null;
        }

        const expiry = this.ttlMap.get(key);
        if (Date.now() > expiry) {
            // Cache expired
            this.cache.delete(key);
            this.ttlMap.delete(key);
            this.recordAccess(key, false);
            console.log(`⏰ [CACHE-MANAGER] Cache expired: "${key}"`);
            return null;
        }

        this.recordAccess(key, true);
        console.log(`✅ [CACHE-MANAGER] Cache hit: "${key}"`);
        return this.cache.get(key);
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Invalidate (delete) specific cache entry
     * @param {string} key
     */
    invalidate(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.ttlMap.delete(key);
            console.log(`🗑️ [CACHE-MANAGER] Invalidated: "${key}"`);
        }
    }

    /**
     * Invalidate all cache entries matching pattern
     * @param {string} pattern - Pattern to match (substring match)
     * @example invalidatePattern('employee') // Clears 'employees', 'employee:123', etc.
     */
    invalidatePattern(pattern) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.invalidate(key);
                count++;
            }
        }
        console.log(`🗑️ [CACHE-MANAGER] Invalidated ${count} entries matching "${pattern}"`);
    }

    /**
     * Clear all cache entries
     */
    clearAll() {
        const size = this.cache.size;
        this.cache.clear();
        this.ttlMap.clear();
        this.accessLog.clear();
        console.log(`🗑️ [CACHE-MANAGER] Cleared all ${size} cache entries`);
    }

    /**
     * Remove oldest cache entries
     * @param {number} count - Number of entries to remove
     */
    clearOldestEntries(count) {
        const entries = Array.from(this.ttlMap.entries())
            .sort((a, b) => a[1] - b[1]) // Sort by expiry time (oldest first)
            .slice(0, count);

        entries.forEach(([key]) => {
            this.invalidate(key);
        });
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getStats() {
        let totalHits = 0;
        let totalMisses = 0;

        for (const [key, stats] of this.accessLog.entries()) {
            totalHits += stats.hits;
            totalMisses += stats.misses;
        }

        const hitRate = totalHits + totalMisses > 0
            ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
            : 0;

        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            totalHits,
            totalMisses,
            hitRate: `${hitRate}%`,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Record cache access for statistics
     * @param {string} key
     * @param {boolean} hit
     */
    recordAccess(key, hit) {
        if (!this.accessLog.has(key)) {
            this.accessLog.set(key, { hits: 0, misses: 0 });
        }

        const stats = this.accessLog.get(key);
        if (hit) {
            stats.hits++;
        } else {
            stats.misses++;
        }
    }

    /**
     * Start automatic cleanup of expired entries
     */
    startAutomaticCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.cleanupInterval = setInterval(() => {
            this.cleanupExpired();
        }, 60000); // Run every 60 seconds

        console.log('🧹 [CACHE-MANAGER] Automatic cleanup started');
    }

    /**
     * Stop automatic cleanup
     */
    stopAutomaticCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🛑 [CACHE-MANAGER] Automatic cleanup stopped');
        }
    }

    /**
     * Clean up all expired cache entries
     */
    cleanupExpired() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, expiry] of this.ttlMap.entries()) {
            if (now > expiry) {
                this.cache.delete(key);
                this.ttlMap.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 [CACHE-MANAGER] Cleaned up ${cleaned} expired entries`);
        }
    }

    /**
     * Get time until cache entry expires
     * @param {string} key
     * @returns {number|null} Milliseconds until expiry, or null if not cached
     */
    getTimeToExpiry(key) {
        if (!this.ttlMap.has(key)) {
            return null;
        }

        const expiry = this.ttlMap.get(key);
        const remaining = expiry - Date.now();
        return remaining > 0 ? remaining : 0;
    }

    /**
     * Set default TTL for new cache entries
     * @param {number} ttlMs - TTL in milliseconds
     */
    setDefaultTTL(ttlMs) {
        this.defaultTTL = ttlMs;
        console.log(`⚙️ [CACHE-MANAGER] Default TTL set to ${ttlMs}ms`);
    }

    /**
     * Set maximum cache size
     * @param {number} size
     */
    setMaxCacheSize(size) {
        this.maxCacheSize = size;
        console.log(`⚙️ [CACHE-MANAGER] Max cache size set to ${size}`);
    }
}

// Create singleton instance and expose globally
window.cacheManager = new CacheManager();

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}
