// Console Cleaner - Reduces console noise for production-like experience
// This will filter out excessive logging while keeping important messages

class ConsoleCleaner {
    constructor() {
        this.isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
        this.initializeCleanConsole();
    }

    initializeCleanConsole() {
        // In production-like mode, reduce console noise
        if (this.isProduction) {
            this.setupProductionConsole();
        } else {
            // In development, just reduce frequency of repetitive messages
            this.setupDevelopmentConsole();
        }
    }

    setupProductionConsole() {
        // Store original console methods
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        // Override console.log to be more selective
        console.log = (...args) => {
            const message = args.join(' ');
            
            // Only show important messages in production
            if (this.shouldShowInProduction(message)) {
                originalLog.apply(console, args);
            }
        };

        // Keep warnings and errors (important for debugging)
        console.warn = originalWarn;
        console.error = originalError;

        console.log('🔇 Console cleaned for production - showing only important messages');
    }

    setupDevelopmentConsole() {
        // In development, just reduce repetitive messages
        const messageCount = new Map();
        const originalLog = console.log;

        console.log = (...args) => {
            const message = args.join(' ');
            const key = this.getMessageKey(message);
            
            // Track message frequency
            const count = messageCount.get(key) || 0;
            messageCount.set(key, count + 1);

            // Show first few occurrences, then reduce frequency
            if (count < 3 || count % 10 === 0) {
                if (count >= 3) {
                    originalLog.apply(console, [...args, `(${count} times)`]);
                } else {
                    originalLog.apply(console, args);
                }
            }
        };

        console.log('🧹 Console cleaner active - reducing repetitive messages');
    }

    shouldShowInProduction(message) {
        // Show important messages only
        const importantKeywords = [
            'error', 'warning', 'failed', 'success', 
            'connected', 'disconnected', 'authenticated',
            'emergency', 'critical', '⚠️', '❌', '✅',
            'Memory Manager', 'Google'
        ];

        return importantKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    getMessageKey(message) {
        // Create a key for similar messages
        return message
            .replace(/\d+/g, 'X') // Replace numbers with X
            .replace(/\d{2}:\d{2}:\d{2}/g, 'TIME') // Replace timestamps
            .substring(0, 50); // First 50 chars
    }

    // Method to temporarily enable full logging
    enableVerboseLogging() {
        location.reload(); // Simple way to reset console
    }
}

// Initialize console cleaner
const consoleCleaner = new ConsoleCleaner();

// Make it available globally
window.consoleCleaner = consoleCleaner;