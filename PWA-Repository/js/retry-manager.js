/**
 * RetryManager - Intelligent Retry Logic with Exponential Backoff
 *
 * Purpose: Centralized retry mechanism for failed network requests and operations.
 * Implements exponential backoff strategy to avoid overwhelming servers.
 *
 * Features:
 * - Automatic retry with exponential backoff (1s → 2s → 4s → 8s)
 * - Configurable retry limits and delays
 * - Network-aware (skips retry if offline)
 * - Callback hooks for retry events
 * - Retry statistics and monitoring
 *
 * Usage:
 * ```javascript
 * // Simple retry
 * const result = await window.retryManager.executeWithRetry(async () => {
 *     const response = await fetch('/api/employees');
 *     if (!response.ok) throw new Error('HTTP ' + response.status);
 *     return response.json();
 * });
 *
 * // With custom options
 * const result = await window.retryManager.executeWithRetry(
 *     async () => { ... },
 *     {
 *         maxRetries: 5,
 *         baseDelay: 2000,
 *         maxDelay: 30000,
 *         onRetry: (attempt, delay, error) => {
 *             console.log(`Retry ${attempt} after ${delay}ms due to:`, error);
 *         }
 *     }
 * );
 * ```
 */

class RetryManager {
    constructor() {
        this.retryHistory = [];
        this.maxHistorySize = 100;
        this.isOnline = navigator.onLine;

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('📶 [RETRY-MANAGER] Network online');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📵 [RETRY-MANAGER] Network offline');
        });

        console.log('✅ [RETRY-MANAGER] Initialized');
    }

    /**
     * Execute function with automatic retry on failure
     * @param {Function} fn - Async function to execute
     * @param {object} options - Retry configuration
     * @returns {Promise<*>} Result from successful execution
     */
    async executeWithRetry(fn, options = {}) {
        const {
            maxRetries = 3,
            baseDelay = 1000,
            maxDelay = 10000,
            skipIfOffline = true,
            retryOn = null, // Function to determine if error should be retried
            onRetry = null,
            onSuccess = null,
            onFailure = null
        } = options;

        let lastError;
        const startTime = Date.now();

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Check if we should skip due to offline status
                if (skipIfOffline && !this.isOnline && attempt > 0) {
                    console.warn('📵 [RETRY-MANAGER] Skipping retry - network offline');
                    throw new Error('Network offline - retry cancelled');
                }

                // Execute the function
                const result = await fn();

                // Success
                if (attempt > 0) {
                    const duration = Date.now() - startTime;
                    this.recordRetry({
                        success: true,
                        attempts: attempt + 1,
                        duration,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`✅ [RETRY-MANAGER] Succeeded after ${attempt} retries (${duration}ms)`);
                }

                if (onSuccess) {
                    onSuccess(result, attempt);
                }

                return result;

            } catch (error) {
                lastError = error;

                // Check if this error should be retried
                if (retryOn && !retryOn(error)) {
                    console.log('🚫 [RETRY-MANAGER] Error not retryable:', error.message);
                    throw error;
                }

                // If this was the last attempt, throw the error
                if (attempt >= maxRetries) {
                    const duration = Date.now() - startTime;
                    this.recordRetry({
                        success: false,
                        attempts: attempt + 1,
                        duration,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });

                    console.error(`❌ [RETRY-MANAGER] Failed after ${attempt + 1} attempts (${duration}ms)`, error);

                    if (onFailure) {
                        onFailure(error, attempt + 1);
                    }

                    throw error;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    baseDelay * Math.pow(2, attempt),
                    maxDelay
                );

                // Add random jitter (±25%) to prevent thundering herd
                const jitter = delay * 0.25 * (Math.random() * 2 - 1);
                const delayWithJitter = Math.round(delay + jitter);

                console.warn(
                    `⏳ [RETRY-MANAGER] Attempt ${attempt + 1}/${maxRetries + 1} failed, ` +
                    `retrying in ${delayWithJitter}ms...`,
                    error.message
                );

                if (onRetry) {
                    onRetry(attempt + 1, delayWithJitter, error);
                }

                // Wait before retrying
                await this.sleep(delayWithJitter);
            }
        }

        // Should never reach here, but just in case
        throw lastError;
    }

    /**
     * Sleep for specified duration
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry with linear backoff (constant delay between retries)
     * @param {Function} fn
     * @param {object} options
     * @returns {Promise<*>}
     */
    async executeWithLinearRetry(fn, options = {}) {
        const {
            maxRetries = 3,
            delay = 1000,
            ...otherOptions
        } = options;

        return this.executeWithRetry(fn, {
            ...otherOptions,
            maxRetries,
            baseDelay: delay,
            maxDelay: delay // Same delay each time (linear)
        });
    }

    /**
     * Retry only on specific HTTP status codes
     * @param {Function} fn
     * @param {number[]} retryCodes - HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504])
     * @param {object} options
     * @returns {Promise<*>}
     */
    async retryOnHttpStatus(fn, retryCodes = [408, 429, 500, 502, 503, 504], options = {}) {
        return this.executeWithRetry(fn, {
            ...options,
            retryOn: (error) => {
                // Check if error has HTTP status code
                if (error.status || error.statusCode) {
                    const status = error.status || error.statusCode;
                    return retryCodes.includes(status);
                }

                // Check if error message contains status code
                const statusMatch = error.message.match(/HTTP (\d+)/);
                if (statusMatch) {
                    const status = parseInt(statusMatch[1]);
                    return retryCodes.includes(status);
                }

                // Retry network errors by default
                return error.message.includes('network') ||
                       error.message.includes('fetch') ||
                       error.message.includes('timeout');
            }
        });
    }

    /**
     * Record retry event to history
     * @param {object} record
     */
    recordRetry(record) {
        this.retryHistory.unshift(record);

        // Trim history if too large
        if (this.retryHistory.length > this.maxHistorySize) {
            this.retryHistory = this.retryHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Get retry statistics
     * @returns {object}
     */
    getStats() {
        const totalRetries = this.retryHistory.length;
        const successful = this.retryHistory.filter(r => r.success).length;
        const failed = this.retryHistory.filter(r => !r.success).length;

        const successRate = totalRetries > 0
            ? ((successful / totalRetries) * 100).toFixed(2)
            : 0;

        // Calculate average attempts for successful retries
        const successfulRetries = this.retryHistory.filter(r => r.success && r.attempts > 1);
        const avgAttempts = successfulRetries.length > 0
            ? (successfulRetries.reduce((sum, r) => sum + r.attempts, 0) / successfulRetries.length).toFixed(2)
            : 0;

        // Calculate average duration
        const avgDuration = totalRetries > 0
            ? Math.round(this.retryHistory.reduce((sum, r) => sum + r.duration, 0) / totalRetries)
            : 0;

        return {
            totalRetries,
            successful,
            failed,
            successRate: `${successRate}%`,
            avgAttempts: parseFloat(avgAttempts),
            avgDuration: `${avgDuration}ms`,
            recentRetries: this.getHistory(5)
        };
    }

    /**
     * Get retry history
     * @param {number} limit - Number of recent entries to return
     * @returns {object[]}
     */
    getHistory(limit = 10) {
        return this.retryHistory.slice(0, limit);
    }

    /**
     * Clear retry history
     */
    clearHistory() {
        this.retryHistory = [];
        console.log('🗑️ [RETRY-MANAGER] History cleared');
    }

    /**
     * Check if network is online
     * @returns {boolean}
     */
    checkOnlineStatus() {
        return this.isOnline;
    }
}

// Create singleton instance and expose globally
window.retryManager = new RetryManager();

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RetryManager;
}
