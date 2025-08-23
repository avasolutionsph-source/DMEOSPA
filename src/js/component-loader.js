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
        try {
            console.log(`🔍 Loading component: ${componentName} into ${targetSelector}`);
            const targetElement = document.querySelector(targetSelector);
            if (!targetElement) {
                console.error(`❌ Target element not found: ${targetSelector}`);
                return false;
            }

            // Check cache first
            let html;
            if (this.componentCache.has(componentName)) {
                html = this.componentCache.get(componentName);
            } else {
                // Fetch component HTML
                console.log(`📡 Fetching component: src/components/${componentName}.html`);
                const response = await fetch(`src/components/${componentName}.html`);
                if (!response.ok) {
                    console.error(`❌ HTTP ${response.status}: Failed to fetch component: ${componentName}`);
                    throw new Error(`Failed to load component: ${componentName} (HTTP ${response.status})`);
                }
                html = await response.text();
                
                // Cache the component
                this.componentCache.set(componentName, html);
            }

            // Insert HTML
            if (append) {
                targetElement.insertAdjacentHTML('beforeend', html);
            } else {
                targetElement.innerHTML = html;
            }

            // Mark as loaded
            this.loadedComponents.add(componentName);
            
            // Dispatch custom event for component loaded
            document.dispatchEvent(new CustomEvent('componentLoaded', {
                detail: { componentName, targetSelector }
            }));

            console.log(`✅ Component loaded: ${componentName}`);
            return true;

        } catch (error) {
            console.error(`❌ Error loading component ${componentName}:`, error);
            return false;
        }
    }

    /**
     * Load multiple components
     * @param {Array} components - Array of {name, target, append} objects
     */
    async loadComponents(components) {
        const promises = components.map(comp => 
            this.loadComponent(comp.name, comp.target, comp.append)
        );
        
        const results = await Promise.all(promises);
        const loaded = results.filter(Boolean).length;
        
        console.log(`📦 Loaded ${loaded}/${components.length} components`);
        return results;
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
        const promises = componentNames.map(async name => {
            if (!this.componentCache.has(name)) {
                try {
                    const response = await fetch(`src/components/${name}.html`);
                    if (response.ok) {
                        const html = await response.text();
                        this.componentCache.set(name, html);
                        console.log(`📋 Preloaded: ${name}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to preload: ${name}`, error);
                }
            }
        });

        await Promise.all(promises);
        console.log(`🚀 Preloaded ${componentNames.length} components`);
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
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏗️ Loading core components...');
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
        // Load essential components first with error handling
        const coreComponents = [
            { name: 'main-content', target: '.app-container', append: false },
            { name: 'sidebar', target: '.app-container', append: true },
            { name: 'modals', target: 'body', append: true }
        ];
        
        const coreResults = await window.componentLoader.loadComponents(coreComponents);
        const coreLoaded = coreResults.filter(Boolean).length;
        
        if (coreLoaded < coreComponents.length) {
            console.warn(`⚠️ Only ${coreLoaded}/${coreComponents.length} core components loaded`);
            
            // Check which components failed and create fallbacks
            if (!document.querySelector('.sidebar')) {
                console.log('📋 Creating fallback sidebar...');
                createFallbackSidebar();
            }
            if (!document.querySelector('.main-content')) {
                console.log('📋 Creating fallback main-content...');
                const appContainer = document.querySelector('.app-container');
                if (appContainer) {
                    appContainer.innerHTML = '<main class="main-content"></main>' + appContainer.innerHTML;
                }
            }
        }
        
        // Wait a bit for DOM to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load dashboard after main-content exists
        const dashboardLoaded = await window.componentLoader.loadComponent('dashboard', '.main-content', false);
        if (!dashboardLoaded) {
            console.error('❌ Failed to load dashboard component - creating fallback');
            createFallbackDashboard();
        }
        
        // Preload other components for faster navigation
        const preloadComponents = [
            'pos', 'products', 'inventory', 'employees', 'rooms', 'chatbot', 'gift-certificates', 'settings'
        ];
        
        await window.componentLoader.preloadComponents(preloadComponents);
        
        console.log('✅ Component system initialized');
        
        // Initialize app after components are loaded
        if (typeof initializeApp === 'function') {
            await initializeApp();
        }
        
        // Wait for app to be fully initialized before setting up navigation
        let navigationAttempts = 0;
        const maxNavigationAttempts = 20;
        
        const setupNavigationWhenReady = async () => {
            if (window.app && window.app.setupNavigation) {
                console.log('🧭 Setting up navigation after component loading');
                window.app.setupNavigation();
                console.log('🧭 Navigation setup complete');
                return true;
            } else {
                navigationAttempts++;
                if (navigationAttempts < maxNavigationAttempts) {
                    console.log(`🧭 Waiting for app to be ready... (${navigationAttempts}/${maxNavigationAttempts})`);
                    setTimeout(setupNavigationWhenReady, 200);
                } else {
                    console.error('❌ Failed to set up navigation - app not ready');
                }
                return false;
            }
        };
        
        await setupNavigationWhenReady();
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
    window.componentLoader.componentCache.delete(componentName);
    window.componentLoader.loadedComponents.delete(componentName);
    return await window.componentLoader.loadComponent(componentName, targetSelector);
};

/**
 * Utility function for page navigation with component loading
 * @param {string} pageName 
 */
window.loadPage = async (pageName) => {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page or load if not exists
    let targetPage = document.getElementById(pageName);
    if (!targetPage) {
        // Load page component
        await window.componentLoader.loadComponent(pageName, '.main-content', true);
        targetPage = document.getElementById(pageName);
    }
    
    if (targetPage) {
        targetPage.classList.add('active');
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
                    <h3>Welcome to Ava Solutions</h3>
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
                <h2>Ava Solutions</h2>
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

export default ComponentLoader;