// App.js Console to Logger Migration Helper
// This script contains the replacement patterns for app.js

const replacements = [
    // Navigation related
    {
        old: "console.log(`🖱️ Nav item clicked: ${page}`);",
        new: `if (window.logger) {
                    window.logger.debug('Navigation item clicked', { 
                        category: 'APP', 
                        operation: 'nav_click',
                        data: { page: page }
                    });
                }`
    },
    {
        old: "console.log(`Navigating to page: ${pageName}`);",
        new: `if (window.logger) {
            window.logger.info('Navigating to page', { 
                category: 'APP', 
                operation: 'page_navigation',
                data: { page: pageName }
            });
        }`
    },
    {
        old: "console.error(`Page element not found: ${pageName}`);",
        new: `if (window.logger) {
            window.logger.error('Page element not found', { 
                category: 'APP', 
                operation: 'page_navigation',
                error: { message: 'Page element not found', page: pageName }
            });
        } else {
            console.error(\`Page element not found: \${pageName}\`);
        }`
    },
    {
        old: "console.log(`🔄 loadPageData called for: ${pageName}`);",
        new: `if (window.logger) {
            window.logger.debug('Loading page data', { 
                category: 'APP', 
                operation: 'load_page_data',
                data: { page: pageName }
            });
        }`
    },
    // Gift certificates related
    {
        old: "console.log('🎁 Gift certificates case matched!');",
        new: `if (window.logger) {
                    window.logger.debug('Gift certificates page matched', { 
                        category: 'APP', 
                        operation: 'page_route',
                        data: { page: 'giftcertificates' }
                    });
                }`
    },
    {
        old: "console.log('🎁 Loading Gift Certificates page...');",
        new: `if (window.logger) {
            window.logger.info('Loading Gift Certificates page', { 
                category: 'APP', 
                operation: 'load_gift_certificates'
            });
        }`
    },
    // Error handling
    {
        old: "console.error('Failed to load business name:', error);",
        new: `if (window.logger) {
            window.logger.error('Failed to load business name', { 
                category: 'APP', 
                operation: 'load_business_name',
                error: error
            });
        } else {
            console.error('Failed to load business name:', error);
        }`
    },
    {
        old: "console.error('Failed to load business config:', error);",
        new: `if (window.logger) {
            window.logger.error('Failed to load business config', { 
                category: 'APP', 
                operation: 'load_business_config',
                error: error
            });
        } else {
            console.error('Failed to load business config:', error);
        }`
    },
    // User state
    {
        old: "console.log('User logged in - updating app state');",
        new: `if (window.logger) {
            window.logger.info('User logged in - updating app state', { 
                category: 'APP', 
                operation: 'user_login'
            });
        }`
    },
    {
        old: "console.log('User logged out - resetting app state');",
        new: `if (window.logger) {
            window.logger.info('User logged out - resetting app state', { 
                category: 'APP', 
                operation: 'user_logout'
            });
        }`
    },
    // Cache and updates
    {
        old: "console.log('🔄 Force refreshing application cache...');",
        new: `if (window.logger) {
            window.logger.info('Force refreshing application cache', { 
                category: 'APP', 
                operation: 'cache_refresh'
            });
        }`
    },
    {
        old: "console.error('Error during force refresh:', error);",
        new: `if (window.logger) {
            window.logger.error('Error during force refresh', { 
                category: 'APP', 
                operation: 'cache_refresh',
                error: error
            });
        } else {
            console.error('Error during force refresh:', error);
        }`
    }
];

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = replacements;
}