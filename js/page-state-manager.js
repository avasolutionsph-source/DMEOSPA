// Page State Manager - Maintains consistent state across refreshes
(function() {
    'use strict';
    
    console.log('📄 Page State Manager initializing...');
    
    // Default page configuration
    const DEFAULT_PAGE = 'dashboard';
    const PAGE_STATE_KEY = 'currentPage';
    const NAV_STATE_KEY = 'navState';
    
    class PageStateManager {
        constructor() {
            this.currentPage = this.loadPageState() || DEFAULT_PAGE;
            this.initialized = false;
            this.init();
        }
        
        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupPage());
            } else {
                this.setupPage();
            }
        }
        
        setupPage() {
            console.log('🔧 Setting up page state...');
            
            // Ensure all pages are hidden initially
            this.hideAllPages();
            
            // Show the current page
            this.showPage(this.currentPage);
            
            // Setup navigation handlers
            this.setupNavigation();
            
            // Mark active nav item
            this.updateActiveNav(this.currentPage);
            
            // Ensure dashboard initializes if it's the current page
            if (this.currentPage === 'dashboard') {
                this.initializeDashboard();
            }
            
            this.initialized = true;
            console.log('✅ Page state setup complete');
        }
        
        hideAllPages() {
            const pages = document.querySelectorAll('.page');
            pages.forEach(page => {
                page.style.display = 'none';
                page.classList.remove('active');
            });
        }
        
        showPage(pageId) {
            console.log(`📄 Showing page: ${pageId}`);
            
            // Hide all pages first
            this.hideAllPages();
            
            // Show the target page
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.style.display = 'block';
                targetPage.classList.add('active');
                
                // Save current page state
                this.savePageState(pageId);
                
                // Initialize page-specific features
                this.initializePageFeatures(pageId);
            } else {
                console.warn(`Page not found: ${pageId}`);
                // Fallback to dashboard
                this.showPage('dashboard');
            }
        }
        
        setupNavigation() {
            const navItems = document.querySelectorAll('.nav-item');
            
            navItems.forEach(item => {
                // Remove existing handlers
                const newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
                
                // Add click handler
                newItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const targetPage = newItem.getAttribute('data-page');
                    if (targetPage) {
                        this.navigateTo(targetPage);
                    }
                });
            });
            
            console.log('✅ Navigation handlers setup');
        }
        
        navigateTo(pageId) {
            console.log(`🔄 Navigating to: ${pageId}`);
            
            // Update current page
            this.currentPage = pageId;
            
            // Show the page
            this.showPage(pageId);
            
            // Update active nav
            this.updateActiveNav(pageId);
        }
        
        updateActiveNav(pageId) {
            // Remove active from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active to current nav item
            const activeNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
            if (activeNav) {
                activeNav.classList.add('active');
            }
        }
        
        initializePageFeatures(pageId) {
            switch(pageId) {
                case 'dashboard':
                    this.initializeDashboard();
                    break;
                case 'pos':
                    this.initializePOS();
                    break;
                case 'products':
                    this.initializeProducts();
                    break;
                case 'inventory':
                    this.initializeInventory();
                    break;
                case 'employees':
                    this.initializeEmployees();
                    break;
                case 'bookings':
                    this.initializeBookings();
                    break;
                case 'expenses':
                    this.initializeExpenses();
                    break;
                case 'rooms':
                    this.initializeRooms();
                    break;
                case 'chatbot':
                    this.initializeChatbot();
                    break;
                case 'settings':
                    this.initializeSettings();
                    break;
            }
        }
        
        initializeDashboard() {
            console.log('📊 Initializing dashboard...');
            
            // Load dashboard data
            if (window.loadDashboard && typeof window.loadDashboard === 'function') {
                window.loadDashboard();
            }
            
            // Initialize charts if available
            if (window.initCharts && typeof window.initCharts === 'function') {
                setTimeout(() => window.initCharts(), 100);
            }
            
            // Load recent transactions
            if (window.loadRecentTransactions && typeof window.loadRecentTransactions === 'function') {
                window.loadRecentTransactions();
            }
        }
        
        initializePOS() {
            console.log('💳 Initializing POS...');
            if (window.initPOS && typeof window.initPOS === 'function') {
                window.initPOS();
            }
        }
        
        initializeProducts() {
            console.log('📦 Initializing products...');
            if (window.loadProducts && typeof window.loadProducts === 'function') {
                window.loadProducts();
            }
        }
        
        initializeInventory() {
            console.log('📋 Initializing inventory...');
            if (window.loadInventory && typeof window.loadInventory === 'function') {
                window.loadInventory();
            }
        }
        
        initializeEmployees() {
            console.log('👥 Initializing employees...');
            if (window.loadEmployees && typeof window.loadEmployees === 'function') {
                window.loadEmployees();
            }
        }
        
        initializeBookings() {
            console.log('📅 Initializing bookings...');
            if (window.loadBookings && typeof window.loadBookings === 'function') {
                window.loadBookings();
            }
        }
        
        initializeExpenses() {
            console.log('💰 Initializing expenses...');
            if (window.loadExpenses && typeof window.loadExpenses === 'function') {
                window.loadExpenses();
            }
        }
        
        initializeRooms() {
            console.log('🚪 Initializing rooms...');
            if (window.loadRooms && typeof window.loadRooms === 'function') {
                window.loadRooms();
            }
        }
        
        initializeChatbot() {
            console.log('🤖 Initializing chatbot...');
            if (window.initChatbot && typeof window.initChatbot === 'function') {
                window.initChatbot();
            }
        }
        
        initializeSettings() {
            console.log('⚙️ Initializing settings...');
            if (window.loadSettings && typeof window.loadSettings === 'function') {
                window.loadSettings();
            }
        }
        
        savePageState(pageId) {
            try {
                localStorage.setItem(PAGE_STATE_KEY, pageId);
            } catch (e) {
                console.warn('Could not save page state:', e);
            }
        }
        
        loadPageState() {
            try {
                return localStorage.getItem(PAGE_STATE_KEY);
            } catch (e) {
                console.warn('Could not load page state:', e);
                return null;
            }
        }
    }
    
    // Create global instance
    window.pageStateManager = new PageStateManager();
    
    // Also expose navigation function globally
    window.navigateTo = function(pageId) {
        if (window.pageStateManager) {
            window.pageStateManager.navigateTo(pageId);
        }
    };
    
    // Override app navigation if it exists
    if (window.app) {
        const originalNavigate = window.app.navigateTo;
        window.app.navigateTo = function(pageId) {
            if (window.pageStateManager) {
                window.pageStateManager.navigateTo(pageId);
            } else if (originalNavigate) {
                originalNavigate.call(this, pageId);
            }
        };
    }
    
    console.log('✅ Page State Manager ready');
})();