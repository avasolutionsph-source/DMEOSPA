// Logger Loader Script for Ava Solutions PWA
// Ensures the complete logger is properly initialized and replaces the existing logger

(function() {
    'use strict';

    // Check if we should load the complete logger
    const shouldLoadCompleteLogger = () => {
        // Load complete logger if:
        // 1. No logger exists yet, OR
        // 2. Existing logger doesn't have all required methods, OR  
        // 3. Config service is available and we want to integrate
        
        if (!window.logger) {
            console.log('📝 No logger found, loading complete logger...');
            return true;
        }

        // Check if current logger has all required methods
        const requiredMethods = [
            'log', 'logError', 'logPerformance', 'startPerformanceTimer', 
            'endPerformanceTimer', 'exportLogs', 'clearLogs', 'getErrorReport', 
            'getDebugInfo', 'setEnabled', 'isEnabled'
        ];

        const missingMethods = requiredMethods.filter(method => 
            typeof window.logger[method] !== 'function'
        );

        if (missingMethods.length > 0) {
            console.log(`📝 Current logger missing methods: ${missingMethods.join(', ')}, loading complete logger...`);
            return true;
        }

        // Check if config service is available and current logger doesn't integrate
        if (window.config?.isInitialized && !window.logger.configReady) {
            console.log('📝 Config service available but logger not integrated, loading complete logger...');
            return true;
        }

        return false;
    };

    // Backup existing logger if it exists
    const backupExistingLogger = () => {
        if (window.logger) {
            window.loggerBackup = window.logger;
            console.log('📝 Existing logger backed up to window.loggerBackup');
        }
    };

    // Wait for required dependencies
    const waitForDependencies = (callback, timeout = 10000) => {
        const startTime = Date.now();
        const checkInterval = 100;

        const check = () => {
            // Dependencies: config service (optional), database (optional)
            const configReady = !window.config || window.config.isInitialized;
            const databaseReady = !window.database || window.database.db;
            
            if (configReady && databaseReady) {
                callback();
            } else if (Date.now() - startTime > timeout) {
                console.warn('📝 Logger dependencies timeout, proceeding anyway...');
                callback();
            } else {
                setTimeout(check, checkInterval);
            }
        };

        check();
    };

    // Initialize the complete logger
    const initializeCompleteLogger = () => {
        console.log('📝 Initializing Complete Logger System...');
        
        // The FixedLogger/CompleteLogger should already be loaded by logger-complete.js
        const LoggerClass = window.FixedLogger || window.CompleteLogger;
        
        if (LoggerClass) {
            // Backup existing logger
            backupExistingLogger();
            
            // Create new complete logger instance
            window.logger = new LoggerClass();
            
            console.log('✅ Complete Logger System initialized and ready');
            
            // Emit event for other systems
            if (typeof CustomEvent !== 'undefined') {
                window.dispatchEvent(new CustomEvent('loggerReady', {
                    detail: { logger: window.logger }
                }));
            }
            
        } else {
            console.error('❌ FixedLogger/CompleteLogger class not found. Make sure logger-complete.js is loaded first.');
        }
    };

    // Integration with existing systems
    const integrateWithExistingSystems = () => {
        // Wait a bit for other systems to initialize
        setTimeout(() => {
            console.log('🔧 Integrating logger with existing systems...');
            
            // Notify error recovery system
            if (window.errorRecovery && typeof window.errorRecovery.log === 'function') {
                console.log('🔗 Logger integrated with error recovery system');
            }
            
            // Notify feature flags system
            if (window.featureFlags && typeof window.featureFlags.log === 'function') {
                console.log('🔗 Logger integrated with feature flags system');
            }
            
            // Notify backup system
            if (window.backupSystem) {
                console.log('🔗 Logger available for backup system');
            }
            
            // Initialize automatic enhancements if logger-init is available
            if (window.LoggerInit && typeof window.LoggerInit.enhanceGlobalObjects === 'function') {
                console.log('🔧 Activating automatic logging enhancements...');
                window.LoggerInit.enhanceGlobalObjects();
                window.LoggerInit.setupComponentMonitoring();
                window.LoggerInit.setupStateMonitoring();
                window.LoggerInit.setupNavigationLogging();
                window.LoggerInit.setupPerformanceMonitoring();
                window.LoggerInit.setupErrorBoundaries();
            }
            
            console.log('✅ Logger integration complete');
            
        }, 1000);
    };

    // Main initialization
    const init = () => {
        if (shouldLoadCompleteLogger()) {
            waitForDependencies(() => {
                initializeCompleteLogger();
                integrateWithExistingSystems();
            });
        } else {
            console.log('📝 Existing logger is sufficient, skipping complete logger load');
            integrateWithExistingSystems();
        }
    };

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM is already loaded
        setTimeout(init, 100);
    }

    // Expose utilities
    window.LoggerLoader = {
        init: init,
        shouldLoadCompleteLogger: shouldLoadCompleteLogger,
        backupExistingLogger: backupExistingLogger,
        integrateWithExistingSystems: integrateWithExistingSystems
    };

})();

console.log('📝 Logger Loader ready');