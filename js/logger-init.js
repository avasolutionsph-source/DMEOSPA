// Logger Initialization Script
// This script automatically enhances existing components with logging capabilities

(function() {
    'use strict';

    // Wait for logger to be ready
    function waitForLogger(callback) {
        if (window.logger && window.logger.isEnabled) {
            callback();
        } else {
            setTimeout(() => waitForLogger(callback), 100);
        }
    }

    // Initialize logging when ready
    waitForLogger(() => {
        console.log('🔧 Initializing logging enhancements...');
        
        // Enhance existing global objects
        enhanceGlobalObjects();
        
        // Setup component monitoring
        setupComponentMonitoring();
        
        // Setup state change monitoring
        setupStateMonitoring();
        
        // Setup navigation logging
        setupNavigationLogging();
        
        // Setup performance monitoring
        setupPerformanceMonitoring();
        
        // Setup error boundaries
        setupErrorBoundaries();
        
        console.log('✅ Logging system fully initialized');
    });

    function enhanceGlobalObjects() {
        // Enhance Database class
        if (window.Database && window.database) {
            enhanceDatabase();
        }
        
        // Enhance APIClient class
        if (window.APIClient && window.apiClient) {
            enhanceAPIClient();
        }
        
        // Enhance App class
        if (window.App && window.app) {
            enhanceApp();
        }
        
        // Monitor auth system
        if (window.authSystem) {
            enhanceAuthSystem();
        }
    }

    function enhanceDatabase() {
        console.log('🗄️ Enhancing Database with logging...');
        
        const originalMethods = {
            init: window.database.init,
            add: window.database.add,
            get: window.database.get,
            getAll: window.database.getAll,
            update: window.database.update,
            delete: window.database.delete
        };

        // Enhance init method
        if (originalMethods.init) {
            window.database.init = async function(...args) {
                const logger = window.logDatabaseOperation('init', 'database', args);
                logger.start();
                
                try {
                    const result = await originalMethods.init.apply(this, args);
                    logger.success(result);
                    return result;
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            };
        }

        // Enhance CRUD operations
        ['add', 'get', 'getAll', 'update', 'delete'].forEach(method => {
            if (originalMethods[method]) {
                window.database[method] = async function(storeName, data, ...args) {
                    const logger = window.logDatabaseOperation(method, storeName, data);
                    logger.start();
                    
                    try {
                        const result = await originalMethods[method].apply(this, [storeName, data, ...args]);
                        logger.success(result);
                        return result;
                    } catch (error) {
                        logger.error(error);
                        throw error;
                    }
                };
            }
        });
    }

    function enhanceAPIClient() {
        console.log('🌐 Enhancing API Client with logging...');
        
        if (window.apiClient && window.apiClient.request) {
            const originalRequest = window.apiClient.request.bind(window.apiClient);
            
            window.apiClient.request = async function(method, endpoint, data, options = {}) {
                const fullUrl = `${this.baseUrl}${endpoint}`;
                const logger = window.logAPICall(method, fullUrl, { body: data, ...options });
                logger.start();
                
                try {
                    const response = await originalRequest(method, endpoint, data, options);
                    logger.success(response, response.data);
                    return response;
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            };
        }
    }

    function enhanceApp() {
        console.log('📱 Enhancing App with logging...');
        
        if (window.app && window.app.showPage) {
            const originalShowPage = window.app.showPage.bind(window.app);
            let currentPage = window.app.currentPage;
            
            window.app.showPage = function(page) {
                window.logNavigation(currentPage, page);
                currentPage = page;
                return originalShowPage(page);
            };
        }
        
        // Monitor cart changes
        if (window.app && window.app.cart) {
            const originalCart = window.app.cart;
            window.app.cart = new Proxy(originalCart, {
                set(target, property, value) {
                    if (property === 'length' || typeof property === 'string') {
                        window.logger && window.logger.logStateChange(
                            'app',
                            `cart.${property}`,
                            target[property],
                            value,
                            'proxy'
                        );
                    }
                    target[property] = value;
                    return true;
                }
            });
        }
    }

    function enhanceAuthSystem() {
        console.log('🔐 Enhancing Auth System with logging...');
        
        if (window.authSystem) {
            // Monitor login/logout
            const originalLogin = window.authSystem.login;
            const originalLogout = window.authSystem.logout;
            
            if (originalLogin) {
                window.authSystem.login = async function(...args) {
                    window.logger && window.logger.log({
                        type: 'AUTH',
                        category: 'LOGIN_ATTEMPT',
                        level: 'INFO',
                        message: 'User login attempt',
                        data: { timestamp: Date.now() }
                    });
                    
                    try {
                        const result = await originalLogin.apply(this, args);
                        window.logger && window.logger.log({
                            type: 'AUTH',
                            category: 'LOGIN_SUCCESS',
                            level: 'INFO',
                            message: 'User login successful',
                            data: { userId: result.user?.id || 'unknown' }
                        });
                        return result;
                    } catch (error) {
                        window.logger && window.logger.logError(error, {
                            operation: 'login'
                        }, 'authSystem');
                        throw error;
                    }
                };
            }
            
            if (originalLogout) {
                window.authSystem.logout = function(...args) {
                    window.logger && window.logger.log({
                        type: 'AUTH',
                        category: 'LOGOUT',
                        level: 'INFO',
                        message: 'User logged out',
                        data: { timestamp: Date.now() }
                    });
                    return originalLogout.apply(this, args);
                };
            }
        }
    }

    function setupComponentMonitoring() {
        console.log('🔍 Setting up component monitoring...');
        
        // Monitor POS operations
        if (window.POS) {
            monitorComponent('POS', window.POS);
        }
        
        // Monitor Inventory operations
        if (window.Inventory) {
            monitorComponent('Inventory', window.Inventory);
        }
        
        // Monitor Employee operations
        if (window.Employee) {
            monitorComponent('Employee', window.Employee);
        }
        
        // Monitor Products operations
        if (window.Products) {
            monitorComponent('Products', window.Products);
        }
    }

    function monitorComponent(name, component) {
        if (!component) return;
        
        // Wrap common methods
        const methodsToWrap = ['add', 'update', 'delete', 'load', 'save', 'refresh'];
        
        methodsToWrap.forEach(methodName => {
            if (typeof component[methodName] === 'function') {
                const original = component[methodName].bind(component);
                
                component[methodName] = async function(...args) {
                    const startTime = performance.now();
                    
                    window.logger && window.logger.log({
                        type: 'COMPONENT',
                        category: 'METHOD_CALL',
                        level: 'DEBUG',
                        message: `${name}.${methodName}() called`,
                        data: {
                            component: name,
                            method: methodName,
                            argsCount: args.length
                        }
                    });
                    
                    try {
                        const result = await original(...args);
                        const duration = performance.now() - startTime;
                        
                        if (duration > 10) {
                            window.logger && window.logger.logPerformance(
                                `${name}.${methodName}`,
                                duration,
                                { component: name, method: methodName }
                            );
                        }
                        
                        return result;
                    } catch (error) {
                        window.logger && window.logger.logError(error, {
                            component: name,
                            method: methodName
                        }, name);
                        throw error;
                    }
                };
            }
        });
    }

    function setupStateMonitoring() {
        console.log('📊 Setting up state monitoring...');
        
        // Monitor localStorage changes
        const originalSetItem = localStorage.setItem;
        const originalRemoveItem = localStorage.removeItem;
        const originalClear = localStorage.clear;
        
        localStorage.setItem = function(key, value) {
            window.logger && window.logger.logGlobalVarAccess(
                `localStorage.${key}`,
                'write',
                value,
                'localStorage'
            );
            return originalSetItem.call(this, key, value);
        };
        
        localStorage.removeItem = function(key) {
            window.logger && window.logger.logGlobalVarAccess(
                `localStorage.${key}`,
                'delete',
                null,
                'localStorage'
            );
            return originalRemoveItem.call(this, key);
        };
        
        localStorage.clear = function() {
            window.logger && window.logger.log({
                type: 'GLOBAL_VAR',
                category: 'CLEAR',
                level: 'INFO',
                message: 'localStorage cleared',
                data: { operation: 'clear', storage: 'localStorage' }
            });
            return originalClear.call(this);
        };
        
        // Monitor sessionStorage changes
        const originalSessionSetItem = sessionStorage.setItem;
        const originalSessionRemoveItem = sessionStorage.removeItem;
        const originalSessionClear = sessionStorage.clear;
        
        sessionStorage.setItem = function(key, value) {
            window.logger && window.logger.logGlobalVarAccess(
                `sessionStorage.${key}`,
                'write',
                value,
                'sessionStorage'
            );
            return originalSessionSetItem.call(this, key, value);
        };
        
        sessionStorage.removeItem = function(key) {
            window.logger && window.logger.logGlobalVarAccess(
                `sessionStorage.${key}`,
                'delete',
                null,
                'sessionStorage'
            );
            return originalSessionRemoveItem.call(this, key);
        };
        
        sessionStorage.clear = function() {
            window.logger && window.logger.log({
                type: 'GLOBAL_VAR',
                category: 'CLEAR',
                level: 'INFO',
                message: 'sessionStorage cleared',
                data: { operation: 'clear', storage: 'sessionStorage' }
            });
            return originalSessionClear.call(this);
        };
    }

    function setupNavigationLogging() {
        console.log('🧭 Setting up navigation logging...');
        
        // Monitor hash changes
        window.addEventListener('hashchange', (event) => {
            window.logger && window.logger.log({
                type: 'NAVIGATION',
                category: 'HASH_CHANGE',
                level: 'INFO',
                message: 'Hash changed',
                data: {
                    oldURL: event.oldURL,
                    newURL: event.newURL,
                    hash: window.location.hash
                }
            });
        });
        
        // Monitor page visibility
        document.addEventListener('visibilitychange', () => {
            window.logger && window.logger.log({
                type: 'USER',
                category: 'VISIBILITY',
                level: 'INFO',
                message: `Page ${document.hidden ? 'hidden' : 'visible'}`,
                data: {
                    hidden: document.hidden,
                    visibilityState: document.visibilityState,
                    timestamp: Date.now()
                }
            });
        });
        
        // Monitor focus/blur
        window.addEventListener('focus', () => {
            window.logger && window.logger.log({
                type: 'USER',
                category: 'FOCUS',
                level: 'DEBUG',
                message: 'Window gained focus',
                data: { timestamp: Date.now() }
            });
        });
        
        window.addEventListener('blur', () => {
            window.logger && window.logger.log({
                type: 'USER',
                category: 'FOCUS',
                level: 'DEBUG',
                message: 'Window lost focus',
                data: { timestamp: Date.now() }
            });
        });
    }

    function setupPerformanceMonitoring() {
        console.log('⚡ Setting up performance monitoring...');
        
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.duration > 50) { // Long task threshold
                            window.logger && window.logger.logPerformance(
                                'long-task',
                                entry.duration,
                                {
                                    type: entry.entryType,
                                    startTime: entry.startTime,
                                    name: entry.name || 'unknown'
                                }
                            );
                        }
                    });
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                console.log('Long task observer not supported');
            }
        }
        
        // Monitor memory usage (if available)
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                window.logger && window.logger.log({
                    type: 'PERFORMANCE',
                    category: 'MEMORY',
                    level: 'DEBUG',
                    message: 'Memory usage snapshot',
                    data: {
                        usedJSHeapSize: memory.usedJSHeapSize,
                        totalJSHeapSize: memory.totalJSHeapSize,
                        jsHeapSizeLimit: memory.jsHeapSizeLimit,
                        timestamp: Date.now()
                    }
                });
            }, 60000); // Every minute
        }
    }

    function setupErrorBoundaries() {
        console.log('🛡️ Setting up error boundaries...');
        
        // Global error handler
        window.addEventListener('error', (event) => {
            window.logger && window.logger.logError(event.error || new Error(event.message), {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                type: 'global_error'
            }, 'global');
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            window.logger && window.logger.logError(
                new Error(`Unhandled Promise Rejection: ${event.reason}`),
                {
                    reason: event.reason,
                    type: 'unhandled_promise_rejection'
                },
                'global'
            );
        });
        
        // Network errors
        window.addEventListener('offline', () => {
            window.logger && window.logger.log({
                type: 'SYSTEM',
                category: 'NETWORK',
                level: 'WARN',
                message: 'Network went offline',
                data: { timestamp: Date.now() }
            });
        });
        
        window.addEventListener('online', () => {
            window.logger && window.logger.log({
                type: 'SYSTEM',
                category: 'NETWORK',
                level: 'INFO',
                message: 'Network came online',
                data: { timestamp: Date.now() }
            });
        });
    }

    // Expose utility functions
    window.LoggerInit = {
        enhanceGlobalObjects,
        setupComponentMonitoring,
        setupStateMonitoring,
        setupNavigationLogging,
        setupPerformanceMonitoring,
        setupErrorBoundaries,
        monitorComponent
    };

})();