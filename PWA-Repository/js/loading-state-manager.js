/**
 * LoadingStateManager - Unified Loading State Coordination
 *
 * Purpose: Centralized management of loading states across all features.
 * Prevents duplicate loads, provides consistent loading indicators, and tracks what's currently loading.
 *
 * Features:
 * - Track loading state per feature
 * - Prevent duplicate/concurrent loads
 * - Global loading indicator management
 * - Custom loading messages per feature
 * - Loading history and analytics
 *
 * Usage:
 * ```javascript
 * // Start loading
 * window.loadingStateManager.startLoading('employees', 'Loading employees...');
 *
 * // Check if loading
 * if (window.loadingStateManager.isLoading('employees')) {
 *     console.log('Already loading, skip');
 *     return;
 * }
 *
 * // Stop loading
 * window.loadingStateManager.stopLoading('employees');
 *
 * // Get all currently loading features
 * const loading = window.loadingStateManager.getCurrentlyLoading();
 * console.log('Loading:', loading); // ['employees', 'products']
 * ```
 */

class LoadingStateManager {
    constructor() {
        this.loadingStates = new Map();
        this.loadingHistory = [];
        this.maxHistorySize = 50;

        console.log('✅ [LOADING-STATE-MANAGER] Initialized');
    }

    /**
     * Start loading for a feature
     * @param {string} feature - Feature identifier (e.g., 'employees', 'products')
     * @param {string} message - Loading message to display (default: 'Loading...')
     * @param {object} options - Additional options (showGlobalIndicator, timeout)
     */
    startLoading(feature, message = 'Loading...', options = {}) {
        const {
            showGlobalIndicator = false,
            timeout = null
        } = options;

        // Check if already loading
        if (this.isLoading(feature)) {
            console.warn(`⚠️ [LOADING-STATE-MANAGER] "${feature}" is already loading`);
            return false;
        }

        const loadingState = {
            feature,
            message,
            startTime: Date.now(),
            showGlobalIndicator,
            timeoutId: null
        };

        // Set timeout if specified
        if (timeout) {
            loadingState.timeoutId = setTimeout(() => {
                console.warn(`⏰ [LOADING-STATE-MANAGER] Loading timeout for "${feature}"`);
                this.stopLoading(feature);
            }, timeout);
        }

        this.loadingStates.set(feature, loadingState);
        this.updateUI(feature, true, message);

        // Show global loading indicator if requested
        if (showGlobalIndicator) {
            this.showGlobalLoadingIndicator();
        }

        console.log(`⏳ [LOADING-STATE-MANAGER] Started loading: "${feature}"`);
        return true;
    }

    /**
     * Stop loading for a feature
     * @param {string} feature - Feature identifier
     */
    stopLoading(feature) {
        const loadingState = this.loadingStates.get(feature);

        if (!loadingState) {
            console.warn(`⚠️ [LOADING-STATE-MANAGER] "${feature}" was not loading`);
            return false;
        }

        // Calculate load duration
        const duration = Date.now() - loadingState.startTime;

        // Clear timeout if exists
        if (loadingState.timeoutId) {
            clearTimeout(loadingState.timeoutId);
        }

        // Record to history
        this.addToHistory({
            feature,
            message: loadingState.message,
            duration,
            timestamp: new Date().toISOString()
        });

        this.loadingStates.delete(feature);
        this.updateUI(feature, false);

        // Hide global indicator if no more features loading
        if (this.loadingStates.size === 0) {
            this.hideGlobalLoadingIndicator();
        }

        console.log(`✅ [LOADING-STATE-MANAGER] Stopped loading: "${feature}" (${duration}ms)`);
        return true;
    }

    /**
     * Check if a feature is currently loading
     * @param {string} feature
     * @returns {boolean}
     */
    isLoading(feature) {
        return this.loadingStates.has(feature);
    }

    /**
     * Check if any feature is loading
     * @returns {boolean}
     */
    isAnyLoading() {
        return this.loadingStates.size > 0;
    }

    /**
     * Get all currently loading features
     * @returns {string[]} Array of feature names
     */
    getCurrentlyLoading() {
        return Array.from(this.loadingStates.keys());
    }

    /**
     * Get loading state details for a feature
     * @param {string} feature
     * @returns {object|null}
     */
    getLoadingState(feature) {
        return this.loadingStates.get(feature) || null;
    }

    /**
     * Stop all loading states (emergency cleanup)
     */
    stopAll() {
        const features = Array.from(this.loadingStates.keys());
        features.forEach(feature => this.stopLoading(feature));
        console.log(`🛑 [LOADING-STATE-MANAGER] Stopped all loading (${features.length})`);
    }

    /**
     * Update UI loading indicator for specific feature
     * @param {string} feature
     * @param {boolean} loading
     * @param {string} message
     */
    updateUI(feature, loading, message = '') {
        // Try to find feature-specific loading indicator
        const indicators = [
            document.getElementById(`${feature}LoadingIndicator`),
            document.getElementById(`${feature}-loading`),
            document.getElementById(`loading-${feature}`),
            document.querySelector(`[data-loading="${feature}"]`)
        ];

        for (const indicator of indicators) {
            if (indicator) {
                indicator.style.display = loading ? 'block' : 'none';
                if (message && indicator.textContent !== undefined) {
                    indicator.textContent = message;
                }
                break;
            }
        }
    }

    /**
     * Show global loading indicator
     */
    showGlobalLoadingIndicator() {
        const globalIndicators = [
            document.getElementById('globalLoadingIndicator'),
            document.getElementById('app-loading'),
            document.querySelector('.global-loading')
        ];

        for (const indicator of globalIndicators) {
            if (indicator) {
                indicator.style.display = 'block';
                break;
            }
        }
    }

    /**
     * Hide global loading indicator
     */
    hideGlobalLoadingIndicator() {
        const globalIndicators = [
            document.getElementById('globalLoadingIndicator'),
            document.getElementById('app-loading'),
            document.querySelector('.global-loading')
        ];

        for (const indicator of globalIndicators) {
            if (indicator) {
                indicator.style.display = 'none';
                break;
            }
        }
    }

    /**
     * Add loading event to history
     * @param {object} record
     */
    addToHistory(record) {
        this.loadingHistory.unshift(record);

        // Trim history if too large
        if (this.loadingHistory.length > this.maxHistorySize) {
            this.loadingHistory = this.loadingHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Get loading history
     * @param {number} limit - Number of recent entries to return (default: 10)
     * @returns {object[]}
     */
    getHistory(limit = 10) {
        return this.loadingHistory.slice(0, limit);
    }

    /**
     * Get average loading time for a feature
     * @param {string} feature
     * @returns {number} Average duration in milliseconds
     */
    getAverageLoadTime(feature) {
        const records = this.loadingHistory.filter(r => r.feature === feature);

        if (records.length === 0) return 0;

        const total = records.reduce((sum, r) => sum + r.duration, 0);
        return Math.round(total / records.length);
    }

    /**
     * Get loading statistics
     * @returns {object}
     */
    getStats() {
        const currentlyLoading = this.getCurrentlyLoading();
        const totalLoads = this.loadingHistory.length;

        // Calculate average load times per feature
        const avgTimesByFeature = {};
        const uniqueFeatures = [...new Set(this.loadingHistory.map(r => r.feature))];

        uniqueFeatures.forEach(feature => {
            avgTimesByFeature[feature] = this.getAverageLoadTime(feature);
        });

        return {
            currentlyLoading,
            activeLoadCount: this.loadingStates.size,
            totalLoadsRecorded: totalLoads,
            averageLoadTimes: avgTimesByFeature,
            recentHistory: this.getHistory(5)
        };
    }

    /**
     * Clear loading history
     */
    clearHistory() {
        this.loadingHistory = [];
        console.log('🗑️ [LOADING-STATE-MANAGER] History cleared');
    }
}

// Create singleton instance and expose globally
window.loadingStateManager = new LoadingStateManager();

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingStateManager;
}
