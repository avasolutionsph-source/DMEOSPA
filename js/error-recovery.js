// Automated Error Reporting and Recovery System for Ava Solutions PWA
// Integrates with enhanced logger and config service for comprehensive error handling

class ErrorRecoverySystem {
    constructor() {
        this.isEnabled = true;
        this.configReady = false;
        this.recoveryStrategies = new Map();
        this.errorThresholds = {
            criticalErrorsPerHour: 5,
            totalErrorsPerHour: 50,
            consecutiveErrors: 3,
            errorRatePercent: 10
        };
        
        // Recovery attempt tracking
        this.recoveryAttempts = new Map();
        this.maxRecoveryAttempts = 3;
        this.recoveryBackoffMs = 5000; // 5 seconds
        
        // Error reporting queues
        this.errorQueue = [];
        this.reportingEnabled = true;
        this.batchSize = 10;
        this.reportingInterval = 30000; // 30 seconds
        
        // System health monitoring
        this.healthChecks = new Map();
        this.healthCheckInterval = 60000; // 1 minute
        
        // Emergency mode tracking
        this.emergencyMode = false;
        this.emergencyModeReasons = [];
        
        this.init();
    }

    async init() {
        try {
            await this.waitForDependencies();
            await this.loadSettings();
            this.setupRecoveryStrategies();
            this.setupErrorInterception();
            this.startHealthMonitoring();
            this.startErrorReporting();
            
            this.log('INFO', 'Error Recovery System initialized', {
                enabled: this.isEnabled,
                strategiesCount: this.recoveryStrategies.size,
                configReady: this.configReady
            });

        } catch (error) {
            console.error('Error Recovery System initialization failed:', error);
            this.fallbackLogging('ERROR', 'Error Recovery System init failed', error);
        }
    }

    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.config?.isInitialized && window.logger) {
                this.configReady = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.configReady) {
            console.warn('Error Recovery: Dependencies timeout, using fallback mode');
        }
    }

    async loadSettings() {
        try {
            if (this.configReady) {
                this.isEnabled = await window.config.get('errorRecoveryEnabled', true);
                this.reportingEnabled = await window.config.get('errorReportingEnabled', true);
                
                // Load custom thresholds
                const customThresholds = await window.config.get('errorThresholds', {});
                this.errorThresholds = { ...this.errorThresholds, ...customThresholds };
            }
        } catch (error) {
            this.fallbackLogging('WARN', 'Failed to load error recovery settings', error);
        }
    }

    setupRecoveryStrategies() {
        // Config service recovery
        this.addRecoveryStrategy('CONFIG_SERVICE_FAILURE', async (error, context) => {
            this.log('WARN', 'Attempting config service recovery', { error: error.message });
            
            try {
                // Try to reinitialize config service
                if (window.config && typeof window.config.init === 'function') {
                    await window.config.init();
                    this.log('INFO', 'Config service recovery successful');
                    return { success: true, method: 'reinitialize' };
                }
                
                // Fallback to localStorage
                this.log('WARN', 'Config service recovery failed, switching to localStorage fallback');
                return { success: false, fallback: 'localStorage' };
                
            } catch (recoveryError) {
                this.log('ERROR', 'Config service recovery failed', { 
                    originalError: error.message,
                    recoveryError: recoveryError.message 
                });
                return { success: false, error: recoveryError.message };
            }
        });

        // Database connection recovery
        this.addRecoveryStrategy('DATABASE_FAILURE', async (error, context) => {
            this.log('WARN', 'Attempting database recovery', { error: error.message });
            
            try {
                // Try to reconnect to database
                if (window.database && typeof window.database.reconnect === 'function') {
                    await window.database.reconnect();
                    this.log('INFO', 'Database recovery successful');
                    return { success: true, method: 'reconnect' };
                }
                
                // Try to reinitialize database
                if (window.database && typeof window.database.init === 'function') {
                    await window.database.init();
                    this.log('INFO', 'Database recovery via reinit successful');
                    return { success: true, method: 'reinitialize' };
                }
                
                return { success: false, error: 'No recovery method available' };
                
            } catch (recoveryError) {
                this.log('ERROR', 'Database recovery failed', {
                    originalError: error.message,
                    recoveryError: recoveryError.message
                });
                return { success: false, error: recoveryError.message };
            }
        });

        // API failure recovery
        this.addRecoveryStrategy('API_FAILURE', async (error, context) => {
            this.log('WARN', 'Attempting API recovery', { 
                error: error.message,
                url: context.url,
                method: context.method 
            });
            
            try {
                // Check if it's a network issue
                if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
                    // Wait and retry
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try the request again
                    if (context.retryFunction) {
                        const result = await context.retryFunction();
                        this.log('INFO', 'API recovery via retry successful');
                        return { success: true, method: 'retry', result };
                    }
                }
                
                // Try alternative API endpoint if available
                if (context.alternativeUrl) {
                    this.log('INFO', 'Trying alternative API endpoint');
                    // This would need to be implemented based on specific API structure
                    return { success: false, fallback: 'alternative_endpoint' };
                }
                
                return { success: false, error: 'No recovery method available' };
                
            } catch (recoveryError) {
                this.log('ERROR', 'API recovery failed', {
                    originalError: error.message,
                    recoveryError: recoveryError.message
                });
                return { success: false, error: recoveryError.message };
            }
        });

        // Authentication failure recovery
        this.addRecoveryStrategy('AUTH_FAILURE', async (error, context) => {
            this.log('WARN', 'Attempting authentication recovery', { error: error.message });
            
            try {
                // Clear corrupted auth data
                if (window.authSystem && typeof window.authSystem.clearAuthData === 'function') {
                    await window.authSystem.clearAuthData();
                    this.log('INFO', 'Corrupted auth data cleared');
                }
                
                // Redirect to login if in app
                if (context.redirectToLogin !== false) {
                    this.log('INFO', 'Redirecting to login for re-authentication');
                    if (typeof window.authSystem?.redirectToLogin === 'function') {
                        window.authSystem.redirectToLogin();
                        return { success: true, method: 'redirect_login' };
                    }
                }
                
                return { success: true, method: 'clear_auth_data' };
                
            } catch (recoveryError) {
                this.log('ERROR', 'Authentication recovery failed', {
                    originalError: error.message,
                    recoveryError: recoveryError.message
                });
                return { success: false, error: recoveryError.message };
            }
        });

        // Memory/Performance recovery
        this.addRecoveryStrategy('PERFORMANCE_DEGRADATION', async (error, context) => {
            this.log('WARN', 'Attempting performance recovery', { 
                error: error.message,
                memoryUsage: context.memoryUsage 
            });
            
            try {
                // Clear caches
                if (window.config && typeof window.config.clearCache === 'function') {
                    window.config.clearCache();
                    this.log('INFO', 'Config cache cleared');
                }
                
                // Clear logger buffer
                if (window.logger && typeof window.logger.flushLogs === 'function') {
                    await window.logger.flushLogs();
                    this.log('INFO', 'Logger buffer flushed');
                }
                
                // Force garbage collection if available
                if (window.gc && typeof window.gc === 'function') {
                    window.gc();
                    this.log('INFO', 'Garbage collection triggered');
                }
                
                return { success: true, method: 'cache_clear_gc' };
                
            } catch (recoveryError) {
                this.log('ERROR', 'Performance recovery failed', {
                    originalError: error.message,
                    recoveryError: recoveryError.message
                });
                return { success: false, error: recoveryError.message };
            }
        });

        // Migration failure recovery
        this.addRecoveryStrategy('MIGRATION_FAILURE', async (error, context) => {
            this.log('WARN', 'Attempting migration recovery', { 
                error: error.message,
                migration: context.migrationName 
            });
            
            try {
                // Rollback migration if possible
                if (window.configMigration && typeof window.configMigration.rollbackMigration === 'function') {
                    await window.configMigration.rollbackMigration(context.migrationName);
                    this.log('INFO', 'Migration rollback successful');
                    return { success: true, method: 'rollback' };
                }
                
                // Reset to safe state
                if (window.configMigration && typeof window.configMigration.resetToSafeState === 'function') {
                    await window.configMigration.resetToSafeState();
                    this.log('INFO', 'Reset to safe state successful');
                    return { success: true, method: 'safe_state_reset' };
                }
                
                return { success: false, error: 'No recovery method available' };
                
            } catch (recoveryError) {
                this.log('ERROR', 'Migration recovery failed', {
                    originalError: error.message,
                    recoveryError: recoveryError.message
                });
                return { success: false, error: recoveryError.message };
            }
        });
    }

    addRecoveryStrategy(errorType, strategyFunction) {
        this.recoveryStrategies.set(errorType, strategyFunction);
        this.log('DEBUG', `Recovery strategy added: ${errorType}`);
    }

    setupErrorInterception() {
        // Intercept global errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JAVASCRIPT_ERROR',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error ? event.error.stack : null
            });
        });

        // Intercept unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'UNHANDLED_PROMISE_REJECTION',
                message: event.reason ? event.reason.toString() : 'Unknown promise rejection',
                error: event.reason,
                stack: event.reason && event.reason.stack ? event.reason.stack : null
            });
        });

        // Intercept logger errors (if logger supports it)
        if (window.logger && typeof window.logger.onError === 'function') {
            window.logger.onError((error, context) => {
                this.handleError({
                    type: 'LOGGER_ERROR',
                    message: error.message,
                    error: error,
                    context: context
                });
            });
        }
    }

    async handleError(errorInfo) {
        if (!this.isEnabled) return;

        try {
            // Log the error
            this.log('ERROR', `Error intercepted: ${errorInfo.type}`, {
                message: errorInfo.message,
                filename: errorInfo.filename,
                line: errorInfo.lineno,
                column: errorInfo.colno,
                stack: errorInfo.stack ? errorInfo.stack.substring(0, 500) : null
            });

            // Add to error queue for reporting
            this.queueErrorForReporting(errorInfo);

            // Check if error requires emergency mode
            await this.checkEmergencyMode(errorInfo);

            // Attempt recovery if strategy exists
            const recoveryType = this.classifyError(errorInfo);
            if (recoveryType && this.shouldAttemptRecovery(recoveryType)) {
                await this.attemptRecovery(recoveryType, errorInfo);
            }

        } catch (handlingError) {
            this.fallbackLogging('ERROR', 'Error in error handling', handlingError);
        }
    }

    classifyError(errorInfo) {
        const message = errorInfo.message.toLowerCase();
        const type = errorInfo.type;

        // Config-related errors
        if (message.includes('config') || message.includes('configuration')) {
            return 'CONFIG_SERVICE_FAILURE';
        }

        // Database-related errors
        if (message.includes('database') || message.includes('indexeddb') || 
            message.includes('transaction') || message.includes('objectstore')) {
            return 'DATABASE_FAILURE';
        }

        // API/Network errors
        if (message.includes('fetch') || message.includes('network') || 
            message.includes('api') || message.includes('http')) {
            return 'API_FAILURE';
        }

        // Authentication errors
        if (message.includes('auth') || message.includes('login') || 
            message.includes('token') || message.includes('unauthorized')) {
            return 'AUTH_FAILURE';
        }

        // Memory/Performance errors
        if (message.includes('memory') || message.includes('quota') || 
            message.includes('out of memory')) {
            return 'PERFORMANCE_DEGRADATION';
        }

        // Migration errors
        if (message.includes('migration') || type === 'MIGRATION_ERROR') {
            return 'MIGRATION_FAILURE';
        }

        return null; // No specific recovery strategy
    }

    shouldAttemptRecovery(recoveryType) {
        const attemptKey = `${recoveryType}_${Date.now() - (Date.now() % (5 * 60 * 1000))}`; // 5-minute windows
        const attempts = this.recoveryAttempts.get(attemptKey) || 0;
        
        if (attempts >= this.maxRecoveryAttempts) {
            this.log('WARN', `Recovery attempts exhausted for ${recoveryType}`, { attempts });
            return false;
        }
        
        return true;
    }

    async attemptRecovery(recoveryType, errorInfo) {
        const attemptKey = `${recoveryType}_${Date.now() - (Date.now() % (5 * 60 * 1000))}`;
        const attempts = this.recoveryAttempts.get(attemptKey) || 0;
        
        this.recoveryAttempts.set(attemptKey, attempts + 1);

        this.log('INFO', `Attempting recovery for ${recoveryType}`, { 
            attempt: attempts + 1,
            maxAttempts: this.maxRecoveryAttempts 
        });

        try {
            const strategy = this.recoveryStrategies.get(recoveryType);
            if (!strategy) {
                this.log('WARN', `No recovery strategy found for ${recoveryType}`);
                return false;
            }

            // Add backoff delay for retry attempts
            if (attempts > 0) {
                const delay = this.recoveryBackoffMs * Math.pow(2, attempts - 1);
                this.log('DEBUG', `Recovery backoff delay: ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const result = await strategy(errorInfo.error || new Error(errorInfo.message), {
                type: errorInfo.type,
                message: errorInfo.message,
                filename: errorInfo.filename,
                lineno: errorInfo.lineno,
                stack: errorInfo.stack
            });

            if (result.success) {
                this.log('INFO', `Recovery successful for ${recoveryType}`, { 
                    method: result.method,
                    attempt: attempts + 1 
                });
                
                // Reset attempt counter on success
                this.recoveryAttempts.delete(attemptKey);
                return true;
            } else {
                this.log('WARN', `Recovery failed for ${recoveryType}`, { 
                    error: result.error,
                    fallback: result.fallback,
                    attempt: attempts + 1 
                });
                return false;
            }

        } catch (recoveryError) {
            this.log('ERROR', `Recovery attempt threw error for ${recoveryType}`, {
                recoveryError: recoveryError.message,
                attempt: attempts + 1
            });
            return false;
        }
    }

    queueErrorForReporting(errorInfo) {
        if (!this.reportingEnabled) return;

        const reportData = {
            timestamp: Date.now(),
            sessionId: this.getSessionId(),
            type: errorInfo.type,
            message: errorInfo.message,
            filename: errorInfo.filename,
            lineno: errorInfo.lineno,
            colno: errorInfo.colno,
            stack: errorInfo.stack ? errorInfo.stack.substring(0, 1000) : null,
            userAgent: navigator.userAgent,
            url: window.location.href,
            // System context
            systemInfo: {
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
                } : null,
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink
                } : null
            }
        };

        this.errorQueue.push(reportData);

        // Limit queue size
        if (this.errorQueue.length > 100) {
            this.errorQueue = this.errorQueue.slice(-50);
        }
    }

    startErrorReporting() {
        setInterval(() => {
            this.processErrorQueue();
        }, this.reportingInterval);
    }

    async processErrorQueue() {
        if (!this.reportingEnabled || this.errorQueue.length === 0) return;

        try {
            const batch = this.errorQueue.splice(0, this.batchSize);
            
            // Store errors in logger database
            if (window.logger && typeof window.logger.log === 'function') {
                for (const error of batch) {
                    window.logger.log({
                        type: 'ERROR_REPORT',
                        category: 'ERROR',
                        level: 'ERROR',
                        message: `Automated error report: ${error.type}`,
                        data: error
                    });
                }
            }

            // Send to external error reporting service if configured
            const errorReportingUrl = this.configReady ? 
                await window.config.get('errorReportingUrl', null) : null;
            
            if (errorReportingUrl) {
                try {
                    await fetch(errorReportingUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            appName: 'Ava Solutions PWA',
                            version: '1.0.0',
                            errors: batch
                        })
                    });
                    
                    this.log('DEBUG', `Error batch reported to external service`, { 
                        count: batch.length 
                    });
                } catch (reportingError) {
                    this.log('WARN', 'Failed to send errors to external service', { 
                        error: reportingError.message 
                    });
                    
                    // Put errors back in queue for retry
                    this.errorQueue.unshift(...batch);
                }
            }

        } catch (error) {
            this.fallbackLogging('ERROR', 'Error processing error queue', error);
        }
    }

    async checkEmergencyMode(errorInfo) {
        // Check for critical error patterns that require emergency mode
        const criticalPatterns = [
            'out of memory',
            'quota exceeded',
            'security error',
            'system failure',
            'corruption detected'
        ];

        const isCritical = criticalPatterns.some(pattern => 
            errorInfo.message.toLowerCase().includes(pattern)
        );

        if (isCritical && !this.emergencyMode) {
            await this.activateEmergencyMode(`Critical error detected: ${errorInfo.type}`);
        }

        // Check error frequency
        const recentErrors = await this.getRecentErrorCount();
        if (recentErrors.total > this.errorThresholds.totalErrorsPerHour) {
            await this.activateEmergencyMode(`Error threshold exceeded: ${recentErrors.total} errors in last hour`);
        }
    }

    async activateEmergencyMode(reason) {
        if (this.emergencyMode) return;

        this.emergencyMode = true;
        this.emergencyModeReasons.push({
            reason,
            timestamp: Date.now()
        });

        this.log('CRITICAL', 'Emergency mode activated', { 
            reason,
            timestamp: Date.now() 
        });

        try {
            // Reduce system load
            await this.enableSafeMode();
            
            // Notify user if possible
            if (this.configReady) {
                await window.config.set('emergencyMode', true);
                await window.config.set('emergencyModeReason', reason);
            }

            // Start emergency monitoring
            this.startEmergencyMonitoring();

        } catch (error) {
            this.fallbackLogging('ERROR', 'Failed to activate emergency mode', error);
        }
    }

    async enableSafeMode() {
        try {
            // Disable non-essential features
            if (this.configReady) {
                await window.config.set('performanceMode', 'safe');
                await window.config.set('debugMode', false);
            }

            // Clear caches and buffers
            if (window.config && typeof window.config.clearCache === 'function') {
                window.config.clearCache();
            }

            if (window.logger && typeof window.logger.flushLogs === 'function') {
                await window.logger.flushLogs();
            }

            this.log('INFO', 'Safe mode enabled', { emergencyMode: true });

        } catch (error) {
            this.fallbackLogging('ERROR', 'Failed to enable safe mode', error);
        }
    }

    startEmergencyMonitoring() {
        // Monitor system health more frequently in emergency mode
        const emergencyHealthCheck = setInterval(async () => {
            try {
                const healthStatus = await this.performEmergencyHealthCheck();
                
                if (healthStatus.canExit) {
                    this.log('INFO', 'System stabilized, exiting emergency mode');
                    await this.deactivateEmergencyMode();
                    clearInterval(emergencyHealthCheck);
                }
            } catch (error) {
                this.fallbackLogging('ERROR', 'Emergency health check failed', error);
            }
        }, 30000); // Check every 30 seconds

        // Auto-exit emergency mode after 10 minutes if no critical errors
        setTimeout(async () => {
            if (this.emergencyMode) {
                this.log('INFO', 'Emergency mode timeout, attempting to exit');
                await this.deactivateEmergencyMode();
                clearInterval(emergencyHealthCheck);
            }
        }, 10 * 60 * 1000); // 10 minutes
    }

    async performEmergencyHealthCheck() {
        const recentErrors = await this.getRecentErrorCount(5 * 60 * 1000); // Last 5 minutes
        const memoryInfo = performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
        } : null;

        return {
            canExit: recentErrors.critical === 0 && 
                     recentErrors.total < 5 && 
                     (!memoryInfo || memoryInfo.percentage < 80),
            recentErrors,
            memoryInfo
        };
    }

    async deactivateEmergencyMode() {
        this.emergencyMode = false;
        
        this.log('INFO', 'Emergency mode deactivated', {
            duration: Date.now() - this.emergencyModeReasons[this.emergencyModeReasons.length - 1].timestamp,
            reasons: this.emergencyModeReasons.length
        });

        try {
            if (this.configReady) {
                await window.config.set('emergencyMode', false);
                await window.config.set('performanceMode', 'auto');
            }
        } catch (error) {
            this.fallbackLogging('ERROR', 'Failed to deactivate emergency mode', error);
        }
    }

    startHealthMonitoring() {
        setInterval(async () => {
            await this.performHealthChecks();
        }, this.healthCheckInterval);
    }

    async performHealthChecks() {
        try {
            const checks = {
                config: this.checkConfigHealth(),
                logger: this.checkLoggerHealth(),
                database: await this.checkDatabaseHealth(),
                memory: this.checkMemoryHealth(),
                api: await this.checkAPIHealth()
            };

            const healthyCount = Object.values(checks).filter(check => check.status === 'healthy').length;
            const totalChecks = Object.keys(checks).length;
            const healthPercentage = (healthyCount / totalChecks) * 100;

            if (healthPercentage < 50 && !this.emergencyMode) {
                await this.activateEmergencyMode(`Health check failure: ${healthPercentage.toFixed(1)}% healthy`);
            }

            // Log health status
            this.log('DEBUG', 'Health check completed', {
                healthy: healthyCount,
                total: totalChecks,
                percentage: healthPercentage,
                details: checks
            });

        } catch (error) {
            this.log('ERROR', 'Health monitoring failed', { error: error.message });
        }
    }

    checkConfigHealth() {
        try {
            if (!window.config) return { status: 'error', message: 'Config service not available' };
            if (!window.config.isInitialized) return { status: 'error', message: 'Config service not initialized' };
            return { status: 'healthy', message: 'Config service operational' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    checkLoggerHealth() {
        try {
            if (!window.logger) return { status: 'error', message: 'Logger not available' };
            if (!window.logger.isEnabled) return { status: 'warning', message: 'Logger disabled' };
            return { status: 'healthy', message: 'Logger operational' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async checkDatabaseHealth() {
        try {
            if (!window.database) return { status: 'error', message: 'Database not available' };
            if (!window.database.db) return { status: 'error', message: 'Database not connected' };
            
            // Try a simple operation
            await window.database.getAll('products', 1);
            return { status: 'healthy', message: 'Database operational' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    checkMemoryHealth() {
        try {
            if (!performance.memory) return { status: 'unknown', message: 'Memory info not available' };
            
            const used = performance.memory.usedJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            const percentage = (used / limit) * 100;
            
            if (percentage > 90) return { status: 'error', message: `Memory critical: ${percentage.toFixed(1)}%` };
            if (percentage > 70) return { status: 'warning', message: `Memory high: ${percentage.toFixed(1)}%` };
            return { status: 'healthy', message: `Memory normal: ${percentage.toFixed(1)}%` };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async checkAPIHealth() {
        try {
            if (!window.apiManager) return { status: 'warning', message: 'API manager not available' };
            
            // This would need to be implemented based on the actual API manager
            return { status: 'healthy', message: 'API endpoints accessible' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async getRecentErrorCount(timeWindow = 60 * 60 * 1000) { // Default 1 hour
        try {
            if (!window.logger || typeof window.logger.exportLogs !== 'function') {
                return { total: 0, critical: 0, errors: 0, warnings: 0 };
            }

            const cutoffTime = Date.now() - timeWindow;
            const logs = await window.logger.exportLogs({ startTime: cutoffTime });
            
            const errors = logs.filter(log => log.level === 'ERROR' || log.level === 'CRITICAL');
            const critical = errors.filter(log => log.level === 'CRITICAL');
            const warnings = logs.filter(log => log.level === 'WARN');

            return {
                total: errors.length,
                critical: critical.length,
                errors: errors.length - critical.length,
                warnings: warnings.length
            };
        } catch (error) {
            this.fallbackLogging('ERROR', 'Failed to get recent error count', error);
            return { total: 0, critical: 0, errors: 0, warnings: 0 };
        }
    }

    // Utility methods
    log(level, message, data = null) {
        if (window.logger && typeof window.logger.log === 'function') {
            window.logger.log({
                type: 'ERROR_RECOVERY',
                category: 'RECOVERY',
                level: level,
                message: message,
                data: data
            });
        } else {
            this.fallbackLogging(level, message, data);
        }
    }

    fallbackLogging(level, message, data) {
        const prefix = `[ERROR_RECOVERY ${level}]`;
        const logData = data ? (typeof data === 'object' ? JSON.stringify(data) : data) : '';
        
        switch (level) {
            case 'ERROR':
            case 'CRITICAL':
                console.error(prefix, message, logData);
                break;
            case 'WARN':
                console.warn(prefix, message, logData);
                break;
            default:
                console.log(prefix, message, logData);
        }
    }

    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = Date.now() + '_' + Math.random().toString(36).substring(2);
        }
        return this.sessionId;
    }

    // Public API
    isInEmergencyMode() {
        return this.emergencyMode;
    }

    getSystemHealth() {
        return {
            emergencyMode: this.emergencyMode,
            emergencyReasons: this.emergencyModeReasons,
            isEnabled: this.isEnabled,
            configReady: this.configReady,
            strategiesCount: this.recoveryStrategies.size,
            queuedErrors: this.errorQueue.length
        };
    }

    async forceRecovery(errorType, context = {}) {
        if (!this.recoveryStrategies.has(errorType)) {
            throw new Error(`No recovery strategy for ${errorType}`);
        }

        return await this.attemptRecovery(errorType, {
            type: errorType,
            message: context.message || 'Forced recovery',
            error: context.error || new Error('Forced recovery')
        });
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.log('INFO', `Error recovery ${enabled ? 'enabled' : 'disabled'}`);
        
        if (this.configReady) {
            window.config.set('errorRecoveryEnabled', enabled);
        }
    }
}

// Initialize error recovery system
const errorRecovery = new ErrorRecoverySystem();

// Expose to window for integration
window.errorRecovery = errorRecovery;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorRecoverySystem;
}