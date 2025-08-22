// Logger Utility Functions for Ava Solutions PWA Components
// This file provides easy-to-use logging functions for all components

// Component wrapper class for automatic logging
class LoggedComponent {
    constructor(name, originalComponent) {
        this.componentName = name;
        this.original = originalComponent;
        this.logger = window.logger;
        
        // Wrap all methods with logging
        this.wrapMethods();
        
        if (this.logger) {
            this.logger.log({
                type: 'COMPONENT',
                category: 'LIFECYCLE',
                level: 'INFO',
                message: `Component ${name} created`,
                data: { component: name }
            });
        }
    }

    wrapMethods() {
        if (!this.original) return;
        
        Object.getOwnPropertyNames(Object.getPrototypeOf(this.original)).forEach(methodName => {
            if (methodName !== 'constructor' && typeof this.original[methodName] === 'function') {
                const original = this.original[methodName].bind(this.original);
                
                this.original[methodName] = async (...args) => {
                    const startTime = performance.now();
                    
                    try {
                        // Log method call
                        if (this.logger) {
                            await this.logger.log({
                                type: 'COMPONENT',
                                category: 'METHOD_CALL',
                                level: 'DEBUG',
                                message: `${this.componentName}.${methodName}() called`,
                                data: {
                                    component: this.componentName,
                                    method: methodName,
                                    argsCount: args.length,
                                    argsTypes: args.map(arg => typeof arg)
                                }
                            });
                        }
                        
                        const result = await original(...args);
                        const duration = performance.now() - startTime;
                        
                        // Log successful completion
                        if (this.logger && duration > 10) { // Only log if method took more than 10ms
                            await this.logger.logPerformance(
                                `${this.componentName}.${methodName}`,
                                duration,
                                { 
                                    component: this.componentName,
                                    method: methodName,
                                    success: true
                                }
                            );
                        }
                        
                        return result;
                    } catch (error) {
                        const duration = performance.now() - startTime;
                        
                        // Log error
                        if (this.logger) {
                            await this.logger.logError(error, {
                                component: this.componentName,
                                method: methodName,
                                args: args.length,
                                duration
                            }, this.componentName);
                        }
                        
                        throw error;
                    }
                };
            }
        });
    }
}

// Utility function to create a state proxy that logs all changes
function createLoggedState(initialState, componentName) {
    if (!window.logger) return initialState;
    
    return new Proxy(initialState, {
        set(target, property, value) {
            const oldValue = target[property];
            
            // Log state change
            window.logger.logStateChange(
                componentName,
                property,
                oldValue,
                value,
                'proxy_setter'
            );
            
            target[property] = value;
            return true;
        },
        
        get(target, property) {
            const value = target[property];
            
            // Log property access (only for complex objects to avoid noise)
            if (typeof value === 'object' && value !== null) {
                window.logger.log({
                    type: 'STATE',
                    category: 'ACCESS',
                    level: 'DEBUG',
                    message: `${componentName}.${property} accessed`,
                    data: {
                        component: componentName,
                        property,
                        valueType: typeof value
                    }
                });
            }
            
            return value;
        }
    });
}

// Function to log data flow between components
function logDataFlow(fromComponent, toComponent, data, method = 'unknown') {
    if (window.logger) {
        window.logger.logDataFlow(fromComponent, toComponent, data, method);
    }
}

// Function to wrap async operations with performance logging
function loggedAsyncOperation(operationName, component) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args) {
            const startTime = performance.now();
            
            try {
                const result = await originalMethod.apply(this, args);
                const duration = performance.now() - startTime;
                
                if (window.logger) {
                    await window.logger.logPerformance(
                        `${component}.${operationName}`,
                        duration,
                        { 
                            component,
                            operation: operationName,
                            success: true 
                        }
                    );
                }
                
                return result;
            } catch (error) {
                const duration = performance.now() - startTime;
                
                if (window.logger) {
                    await window.logger.logError(error, {
                        component,
                        operation: operationName,
                        duration
                    }, component);
                }
                
                throw error;
            }
        };
        
        return descriptor;
    };
}

// Helper function to log user interactions
function logUserInteraction(element, action, data = {}) {
    if (!window.logger) return;
    
    window.logger.log({
        type: 'USER',
        category: 'INTERACTION',
        level: 'INFO',
        message: `User ${action} on ${element}`,
        data: {
            element,
            action,
            timestamp: Date.now(),
            url: window.location.href,
            ...data
        }
    });
}

// Helper function to log form submissions
function logFormSubmission(formName, formData) {
    if (!window.logger) return;
    
    // Remove sensitive data
    const sanitizedData = {};
    for (const [key, value] of Object.entries(formData)) {
        if (/password|secret|token/i.test(key)) {
            sanitizedData[key] = '[REDACTED]';
        } else {
            sanitizedData[key] = value;
        }
    }
    
    window.logger.log({
        type: 'USER',
        category: 'FORM_SUBMIT',
        level: 'INFO',
        message: `Form submitted: ${formName}`,
        data: {
            formName,
            fieldCount: Object.keys(formData).length,
            fields: Object.keys(formData),
            data: sanitizedData
        }
    });
}

// Helper function to log navigation events
function logNavigation(fromPage, toPage) {
    if (!window.logger) return;
    
    window.logger.log({
        type: 'NAVIGATION',
        category: 'PAGE_CHANGE',
        level: 'INFO',
        message: `Navigation: ${fromPage} → ${toPage}`,
        data: {
            fromPage,
            toPage,
            timestamp: Date.now(),
            url: window.location.href
        }
    });
}

// Enhanced database operation logger
function logDatabaseOperation(operation, table, data, options = {}) {
    if (!window.logger) return;
    
    const startTime = performance.now();
    
    return {
        start: () => {
            window.logger.log({
                type: 'DATABASE',
                category: 'OPERATION_START',
                level: 'DEBUG',
                message: `Starting ${operation} on ${table}`,
                data: {
                    operation,
                    table,
                    recordCount: Array.isArray(data) ? data.length : 1,
                    options
                }
            });
        },
        
        success: (result) => {
            const duration = performance.now() - startTime;
            window.logger.logDBOperation(operation, table, result, duration, true);
        },
        
        error: (error) => {
            const duration = performance.now() - startTime;
            window.logger.logDBOperation(operation, table, data, duration, false);
            window.logger.logError(error, {
                operation,
                table,
                duration
            }, 'database');
        }
    };
}

// Enhanced API call logger
function logAPICall(method, url, options = {}) {
    if (!window.logger) return;
    
    const startTime = performance.now();
    
    return {
        start: () => {
            window.logger.log({
                type: 'API',
                category: 'REQUEST_START',
                level: 'DEBUG',
                message: `Starting ${method} ${url}`,
                data: {
                    method,
                    url,
                    hasBody: !!options.body,
                    contentType: options.headers && options.headers['Content-Type']
                }
            });
        },
        
        success: (response, responseData) => {
            const duration = performance.now() - startTime;
            window.logger.logAPICall(method, url, response.status, duration, options.body, responseData);
        },
        
        error: (error) => {
            const duration = performance.now() - startTime;
            window.logger.logAPICall(method, url, 0, duration, options.body, null);
            window.logger.logError(error, {
                method,
                url,
                duration
            }, 'api');
        }
    };
}

// Function to create logging decorators for classes
function withLogging(componentName) {
    return function(constructor) {
        // Store original constructor
        const original = constructor;
        
        // Create wrapper constructor
        function LoggedConstructor(...args) {
            // Call original constructor
            const instance = new original(...args);
            
            // Create logged component wrapper
            new LoggedComponent(componentName, instance);
            
            return instance;
        }
        
        // Copy prototype and static properties
        LoggedConstructor.prototype = original.prototype;
        Object.setPrototypeOf(LoggedConstructor, original);
        
        return LoggedConstructor;
    };
}

// Global error boundary for components
function createErrorBoundary(componentName) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = function(...args) {
            try {
                const result = originalMethod.apply(this, args);
                
                // Handle async methods
                if (result && typeof result.then === 'function') {
                    return result.catch(error => {
                        if (window.logger) {
                            window.logger.logError(error, {
                                component: componentName,
                                method: propertyKey,
                                async: true
                            }, componentName);
                        }
                        throw error;
                    });
                }
                
                return result;
            } catch (error) {
                if (window.logger) {
                    window.logger.logError(error, {
                        component: componentName,
                        method: propertyKey,
                        async: false
                    }, componentName);
                }
                throw error;
            }
        };
        
        return descriptor;
    };
}

// Function to monitor DOM changes
function setupDOMLogging() {
    if (!window.logger || !window.MutationObserver) return;
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        window.logger.log({
                            type: 'DOM',
                            category: 'ELEMENT_ADDED',
                            level: 'DEBUG',
                            message: `Element added: ${node.tagName || 'unknown'}`,
                            data: {
                                tagName: node.tagName,
                                className: node.className,
                                id: node.id
                            }
                        });
                    }
                });
            }
            
            if (mutation.type === 'attributes') {
                window.logger.log({
                    type: 'DOM',
                    category: 'ATTRIBUTE_CHANGED',
                    level: 'DEBUG',
                    message: `Attribute changed: ${mutation.attributeName}`,
                    data: {
                        element: mutation.target.tagName,
                        attribute: mutation.attributeName,
                        newValue: mutation.target.getAttribute(mutation.attributeName)
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true
    });
}

// Setup event listeners for automatic logging
function setupEventLogging() {
    if (!window.logger) return;
    
    // Log clicks
    document.addEventListener('click', (event) => {
        logUserInteraction(
            event.target.tagName + (event.target.id ? `#${event.target.id}` : ''),
            'click',
            {
                x: event.clientX,
                y: event.clientY,
                target: event.target.outerHTML.substring(0, 200)
            }
        );
    });
    
    // Log form submissions
    document.addEventListener('submit', (event) => {
        const form = event.target;
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        logFormSubmission(
            form.id || form.className || 'unnamed-form',
            data
        );
    });
    
    // Log page visibility changes
    document.addEventListener('visibilitychange', () => {
        window.logger.log({
            type: 'USER',
            category: 'VISIBILITY',
            level: 'INFO',
            message: `Page ${document.hidden ? 'hidden' : 'visible'}`,
            data: {
                hidden: document.hidden,
                visibilityState: document.visibilityState
            }
        });
    });
}

// Initialize automatic logging when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupEventLogging();
        setupDOMLogging();
    });
} else {
    setupEventLogging();
    setupDOMLogging();
}

// Export utility functions
window.LoggerUtils = {
    LoggedComponent,
    createLoggedState,
    logDataFlow,
    loggedAsyncOperation,
    logUserInteraction,
    logFormSubmission,
    logNavigation,
    logDatabaseOperation,
    logAPICall,
    withLogging,
    createErrorBoundary,
    setupDOMLogging,
    setupEventLogging
};

// Make individual functions available globally for easier access
window.logDataFlow = logDataFlow;
window.logUserInteraction = logUserInteraction;
window.logFormSubmission = logFormSubmission;
window.logNavigation = logNavigation;
window.logDatabaseOperation = logDatabaseOperation;
window.logAPICall = logAPICall;