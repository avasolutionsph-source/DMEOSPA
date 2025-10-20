/**
 * Component Loader - Loads HTML components dynamically
 * This replaces the large monolithic HTML structure with modular components
 */

class ComponentLoader {
    constructor() {
        this.loadedComponents = new Set();
        this.componentCache = new Map();
    }

    /**
     * Load an HTML component into a target element
     * @param {string} componentName - Name of the component file (without .html)
     * @param {string} targetSelector - CSS selector of target element
     * @param {boolean} append - Whether to append or replace content
     */
    async loadComponent(componentName, targetSelector, append = false) {
        console.log(`⚠️ Component loading DISABLED - ${componentName} not loaded (using embedded HTML)`);
        return false; // DISABLED: Stop 404 errors by not loading components
    }

    /**
     * Load multiple components
     * @param {Array} components - Array of {name, target, append} objects
     */
    async loadComponents(components) {
        console.log(`⚠️ Component loading DISABLED - ${components.length} components skipped (using embedded HTML)`);
        return components.map(() => false); // DISABLED: Return false for all components
    }

    /**
     * Check if component is loaded
     * @param {string} componentName 
     * @returns {boolean}
     */
    isLoaded(componentName) {
        return this.loadedComponents.has(componentName);
    }

    /**
     * Preload components for better performance
     * @param {Array} componentNames 
     */
    async preloadComponents(componentNames) {
        console.log(`⚠️ Component preloading DISABLED - using embedded HTML (${componentNames.length} components skipped)`);
        return; // DISABLED: Stop 404 errors by not loading components
    }

    /**
     * Clear cache for development
     */
    clearCache() {
        this.componentCache.clear();
        this.loadedComponents.clear();
        console.log('🧹 Component cache cleared');
    }
}

// Create global instance
window.componentLoader = new ComponentLoader();

/**
 * Initialize core components when DOM is ready
 * DISABLED: Component system causing 404 errors - PWA uses embedded HTML
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏗️ Component loader DISABLED - using embedded HTML structure');
    console.log('📋 DOM ready, checking app container...');
    
    // Wait for CSS to be loaded
    await waitForCSS();
    
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) {
        console.error('❌ CRITICAL: .app-container not found in DOM!');
        return;
    }
    console.log('✅ App container found:', appContainer);
    
    try {
        // DISABLED: Component loading causes 404 errors - all HTML is now embedded in index.html
        console.log('⚠️ Component loading DISABLED - using embedded HTML structure');
        
        // Skip component loading entirely - directly check what's in embedded HTML
        setTimeout(() => {
            console.log('🔍 Component check after loading:');
            console.log(`   - .app-container: ${!!document.querySelector('.app-container')}`);
            console.log(`   - .sidebar: ${!!document.querySelector('.sidebar')}`);
            console.log(`   - .main-content: ${!!document.querySelector('.main-content')}`);
            console.log(`   - .nav-item count: ${document.querySelectorAll('.nav-item').length}`);
            
            // Debug: Show actual DOM content
            const appContainer = document.querySelector('.app-container');
            console.log('📋 App container HTML:', appContainer?.innerHTML.substring(0, 200) + '...');
            console.log('📋 App container children:', Array.from(appContainer?.children || []).map(c => c.tagName + '.' + c.className));
        }, 100);
        
        // DISABLED: Component loading fallbacks - HTML is embedded
        console.log('⚠️ Component fallback creation DISABLED - using embedded HTML');
        
        // Wait a bit for DOM to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // DISABLED: Dashboard and component preloading - using embedded HTML
        console.log('⚠️ Dashboard and component preloading DISABLED - using embedded HTML');
        const dashboardLoaded = true; // Assume dashboard is embedded in HTML
        
        console.log('✅ Component system initialized (embedded HTML mode)');
        
        // Initialize app immediately since all HTML is embedded
        if (typeof initializeApp === 'function') {
            try {
                console.log('📋 Component loader calling initializeApp (embedded mode)...');
                await initializeApp();
                console.log('✅ initializeApp completed successfully');
                
                // Give a small delay to ensure everything is ready
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('❌ Error during app initialization from component loader:', error);
                // Continue anyway since HTML is embedded
                console.log('⚠️ Continuing with embedded HTML structure...');
            }
        } else {
            console.warn('⚠️ initializeApp function not available - continuing with embedded HTML');
        }
        
        // Setup navigation immediately since HTML is embedded
        console.log('🧭 Setting up navigation for embedded HTML...');
        const sidebarExists = document.querySelector('.sidebar');
        const navItemsExist = document.querySelectorAll('.nav-item').length > 0;
        
        console.log(`🧭 Navigation check:`)
        console.log(`   - Sidebar exists: ${!!sidebarExists}`);
        console.log(`   - Nav items count: ${document.querySelectorAll('.nav-item').length}`);
        console.log(`   - window.app exists: ${!!window.app}`);
        console.log(`   - window.app.setupNavigation exists: ${!!(window.app && window.app.setupNavigation)}`);
        
        if (sidebarExists && navItemsExist && window.app && typeof window.app.setupNavigation === 'function') {
            try {
                console.log('🧭 Setting up navigation with embedded HTML...');
                window.app.setupNavigation();
                console.log('🧭 Navigation setup complete for embedded HTML');
            } catch (error) {
                console.error('❌ Error during navigation setup:', error);
                console.log('🔧 Creating manual navigation fallback...');
                createManualNavigation();
            }
        } else {
            console.warn('⚠️ Navigation requirements not met - creating manual fallback');
            console.log(`   - Missing: ${!sidebarExists ? 'sidebar ' : ''}${!navItemsExist ? 'nav-items ' : ''}${!window.app ? 'window.app ' : ''}${!window.app?.setupNavigation ? 'setupNavigation' : ''}`);
            createManualNavigation();
        }
        
        // After everything is loaded, check authentication if user came from login
        setTimeout(() => {
            if (window.checkAuthenticationAfterLoad) {
                console.log('🔐 Running post-initialization auth check...');
                window.checkAuthenticationAfterLoad();
            }
        }, 2000); // Give time for everything to initialize
        
    } catch (error) {
        console.error('❌ Error during component initialization:', error);
    }
});

/**
 * Wait for CSS to be loaded
 */
async function waitForCSS() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 100; // 5 seconds max
        
        const checkCSS = () => {
            attempts++;
            
            // Check if stylesheets are loaded
            const stylesheets = document.styleSheets;
            let cssLoaded = false;
            
            try {
                // Try to access CSS rules - if they're loaded, we can access them
                for (let i = 0; i < stylesheets.length; i++) {
                    const sheet = stylesheets[i];
                    if (sheet.href && sheet.href.includes('main.css')) {
                        // Try to access rules - this will work if CSS is loaded
                        if (sheet.cssRules || sheet.rules) {
                            cssLoaded = true;
                            break;
                        }
                    }
                }
                
                // Fallback: check if app-container class has expected styles
                if (!cssLoaded) {
                    const testElement = document.createElement('div');
                    testElement.className = 'app-container';
                    testElement.style.position = 'absolute';
                    testElement.style.visibility = 'hidden';
                    document.body.appendChild(testElement);
                    
                    const styles = window.getComputedStyle(testElement);
                    // Check if it has any non-default styling
                    cssLoaded = styles.display !== 'block' || 
                               styles.margin !== '0px' || 
                               styles.padding !== '0px';
                    
                    document.body.removeChild(testElement);
                }
            } catch (e) {
                // CSS might still be loading
            }
            
            if (cssLoaded || attempts >= maxAttempts) {
                console.log('✅ CSS loaded and ready');
                resolve();
            } else {
                setTimeout(checkCSS, 50);
            }
        };
        
        // Start checking immediately if DOM is ready, otherwise wait a bit
        setTimeout(checkCSS, document.readyState === 'complete' ? 10 : 100);
    });
}

/**
 * Utility function to reload a component
 * @param {string} componentName 
 * @param {string} targetSelector 
 */
window.reloadComponent = async (componentName, targetSelector) => {
    console.log(`⚠️ Component reloading DISABLED - ${componentName} not reloaded (using embedded HTML)`);
    return false; // DISABLED: Stop 404 errors
};

/**
 * Utility function for page navigation with component loading
 * @param {string} pageName 
 */
window.loadPage = async (pageName) => {
    console.log(`🧭 Loading page: ${pageName} (embedded HTML mode)`);
    
    // Clean up dashboard when navigating away from it
    const currentActivePage = document.querySelector('.page.active');
    if (currentActivePage && currentActivePage.id === 'dashboard' && pageName !== 'dashboard') {
        if (window.unloadDashboard && typeof window.unloadDashboard === 'function') {
            console.log('🧹 Cleaning up dashboard before navigation...');
            window.unloadDashboard();
        }
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page (should be embedded in HTML)
    let targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
        console.log(`✅ Page loaded: ${pageName}`);
    } else {
        console.warn(`⚠️ Page not found: ${pageName} - check if it's embedded in HTML`);
    }
};

/**
 * Create fallback dashboard if component loading fails
 */
function createFallbackDashboard() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    const fallbackHTML = `
        <div id="dashboard" class="page active" style="padding: 20px;">
            <div class="page-header">
                <h1>Dashboard</h1>
                <p style="color: #666;">Loading components...</p>
            </div>
            <div class="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3>Welcome to SPA</h3>
                    <p>Your spa management system is starting up...</p>
                </div>
            </div>
        </div>
    `;
    
    mainContent.innerHTML = fallbackHTML;
    console.log('✅ Fallback dashboard created');
    
    // Dispatch event to hide loader
    document.dispatchEvent(new CustomEvent('componentLoaded', {
        detail: { componentName: 'dashboard', targetSelector: '.main-content' }
    }));
}

/**
 * Create fallback sidebar if component loading fails
 */
function createFallbackSidebar() {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) return;
    
    const fallbackHTML = `
        <aside class="sidebar" style="width: 250px; background: #2c3e50; color: white; height: 100vh; padding: 20px;">
            <div class="logo" style="margin-bottom: 30px;">
                <h2>SPA</h2>
            </div>
            <nav class="nav-menu">
                <a href="#" class="nav-item active" style="display: block; padding: 10px; color: white; text-decoration: none; margin-bottom: 10px;">
                    Dashboard
                </a>
                <p style="color: #bdc3c7; font-size: 14px;">Loading navigation...</p>
            </nav>
        </aside>
    `;
    
    appContainer.insertAdjacentHTML('beforeend', fallbackHTML);
    console.log('✅ Fallback sidebar created');
    
    // Reinitialize navigation for fallback sidebar
    setTimeout(() => {
        if (window.app && window.app.setupNavigation) {
            window.app.setupNavigation();
            console.log('🧭 Navigation reinitialized for fallback sidebar');
        }
    }, 100);
}

/**
 * Create manual navigation as a fallback when automatic setup fails
 */
function createManualNavigation() {
    console.log('🔧 Creating manual navigation fallback...');
    
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`🔍 Found ${navItems.length} nav items to set up manually`);
    
    navItems.forEach((item, index) => {
        const page = item.dataset.page;
        console.log(`🔧 Setting up manual navigation for: ${page}`);
        
        // Remove any existing event listeners
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Add click handler
        newItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`🧭 Manual navigation clicked: ${page}`);
            
            // Manual page switching logic
            // Hide all pages
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active');
            });
            
            // Show target page
            const targetPage = document.getElementById(page);
            if (targetPage) {
                targetPage.classList.add('active');
                console.log(`✅ Manual navigation successful: ${page}`);
            } else {
                console.warn(`⚠️ Page not found: ${page} - should be embedded in HTML`);
                // DISABLED: Component loading - pages should be embedded in HTML
            }
            
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            newItem.classList.add('active');
        });
    });
    
    console.log('✅ Manual navigation setup complete');
}

// export default ComponentLoader; // Commented out for compatibility