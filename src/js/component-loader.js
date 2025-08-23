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
            const targetElement = document.querySelector(targetSelector);
            if (!targetElement) {
                console.warn(`Target element not found: ${targetSelector}`);
                return false;
            }

            // Check cache first
            let html;
            if (this.componentCache.has(componentName)) {
                html = this.componentCache.get(componentName);
            } else {
                // Fetch component HTML
                const response = await fetch(`src/components/${componentName}.html`);
                if (!response.ok) {
                    throw new Error(`Failed to load component: ${componentName}`);
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
    
    // Load essential components first
    const coreComponents = [
        { name: 'sidebar', target: '.app-container', append: false },
        { name: 'dashboard', target: '.main-content', append: false },
        { name: 'modals', target: 'body', append: true }
    ];

    await window.componentLoader.loadComponents(coreComponents);
    
    // Preload other components for faster navigation
    const preloadComponents = [
        'pos', 'inventory', 'employees', 'rooms', 'settings'
    ];
    
    await window.componentLoader.preloadComponents(preloadComponents);
    
    console.log('✅ Component system initialized');
    
    // Initialize app after components are loaded
    if (typeof initializeApp === 'function') {
        initializeApp();
    }
});

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

export default ComponentLoader;