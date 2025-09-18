// Console Cleaner - Disables console logging in production for better performance
// This significantly improves performance by eliminating console overhead

class ConsoleCleaner {
    constructor() {
        this.isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug,
            trace: console.trace,
            time: console.time,
            timeEnd: console.timeEnd
        };
        this.initializeCleanConsole();
    }

    initializeCleanConsole() {
        // In production, completely disable console for maximum performance
        if (this.isProduction) {
            this.setupProductionConsole();
        } else {
            // In development, keep all console messages for debugging
            this.setupDevelopmentConsole();
        }
    }

    setupProductionConsole() {
        // Create no-op function for maximum performance
        const noop = () => {};
        
        // Disable all console methods except error (for critical issues)
        console.log = noop;
        console.info = noop;
        console.debug = noop;
        console.trace = noop;
        console.time = noop;
        console.timeEnd = noop;
        
        // Keep only warnings and errors for critical issues
        console.warn = (...args) => {
            const message = args.join(' ');
            // Only show critical warnings
            if (message.toLowerCase().includes('critical') || 
                message.toLowerCase().includes('security')) {
                this.originalConsole.warn.apply(console, args);
            }
        };
        
        // Always keep errors visible
        console.error = this.originalConsole.error;
    }

    setupDevelopmentConsole() {
        // In development, keep full console functionality
        // No changes needed - use default console methods
        console.log('🔧 Development mode - full console logging enabled');
    }

    // Method to temporarily restore console for debugging
    enableVerboseLogging() {
        if (this.originalConsole) {
            Object.keys(this.originalConsole).forEach(method => {
                console[method] = this.originalConsole[method];
            });
            console.log('🔊 Console logging restored');
        }
    }
    
    // Method to disable console again after debugging
    disableLogging() {
        this.initializeCleanConsole();
    }
}

// Initialize console cleaner
const consoleCleaner = new ConsoleCleaner();

// Make it available globally
window.consoleCleaner = consoleCleaner;