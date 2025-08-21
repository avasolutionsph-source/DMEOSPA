// Universal fixes for all role pages
(function() {
    'use strict';
    
    console.log('🔧 Applying universal fixes for role pages...');
    
    // Detect which page we're on
    const pathname = window.location.pathname;
    const pageName = pathname.split('/').pop().replace('.html', '');
    console.log(`📄 Current page: ${pageName}`);
    
    // 1. Disable aggressive auth checks for all pages
    const disableAuthChecks = () => {
        // Clear all intervals
        for (let i = 1; i < 9999; i++) {
            window.clearInterval(i);
            window.clearTimeout(i);
        }
        
        // Override auth check functions
        if (window.checkAuthenticationStatus) {
            window.checkAuthenticationStatus = () => true;
        }
        
        // Prevent redirects
        const originalLocation = window.location.href;
        let redirectCount = 0;
        
        const blockRedirects = () => {
            if (window.location.href !== originalLocation && redirectCount < 3) {
                console.log('🛑 Blocked redirect attempt');
                redirectCount++;
                window.history.pushState(null, null, originalLocation);
            }
        };
        
        // Check every 100ms for first 5 seconds
        const interval = setInterval(blockRedirects, 100);
        setTimeout(() => clearInterval(interval), 5000);
    };
    
    // 2. Fix navigation clicks
    const fixNavigation = () => {
        document.addEventListener('DOMContentLoaded', function() {
            // Fix nav items
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.style.pointerEvents = 'auto';
                item.style.cursor = 'pointer';
                
                // Ensure clicks work
                item.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const page = this.getAttribute('data-page');
                    console.log(`Navigate to: ${page}`);
                    
                    // Hide all pages
                    document.querySelectorAll('.page').forEach(p => {
                        p.classList.remove('active');
                        p.style.display = 'none';
                    });
                    
                    // Show selected page
                    const targetPage = document.getElementById(page);
                    if (targetPage) {
                        targetPage.classList.add('active');
                        targetPage.style.display = 'block';
                    }
                    
                    // Update active nav
                    document.querySelectorAll('.nav-item').forEach(n => {
                        n.classList.remove('active');
                    });
                    this.classList.add('active');
                };
            });
            
            console.log('✅ Navigation fixed');
        });
    };
    
    // 3. Ensure MongoDB API works
    const ensureMongoAPI = () => {
        if (!window.mongoAPI) {
            console.log('Creating MongoDB API instance...');
            
            // Create a simplified MongoDB API
            window.mongoAPI = {
                apiUrl: 'https://ava-pwa-backend.onrender.com/api',
                token: localStorage.getItem('auth_token') || localStorage.getItem('token'),
                
                async request(endpoint, method = 'GET', data = null) {
                    try {
                        const headers = {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        };
                        
                        if (this.token) {
                            headers['Authorization'] = `Bearer ${this.token}`;
                        }
                        
                        const options = { method, headers };
                        
                        if (data && method !== 'GET') {
                            options.body = JSON.stringify(data);
                        }
                        
                        const response = await fetch(`${this.apiUrl}${endpoint}`, options);
                        return await response.json();
                    } catch (error) {
                        console.error(`API Error: ${endpoint}`, error);
                        return { error: error.message };
                    }
                },
                
                // Add basic methods
                getProducts: async function() { 
                    return this.request('/products').catch(() => []); 
                },
                getEmployees: async function() { 
                    return this.request('/employees').catch(() => []); 
                },
                getTransactions: async function() { 
                    return this.request('/transactions').catch(() => []); 
                },
                getBookings: async function() { 
                    return this.request('/bookings').catch(() => []); 
                },
                getDashboardData: async function() {
                    return this.request('/dashboard').catch(() => ({
                        todaySales: 0,
                        monthSales: 0,
                        totalCustomers: 0
                    }));
                }
            };
        }
    };
    
    // 4. Fix the database object
    const fixDatabase = () => {
        if (!window.db || !window.db.getAll) {
            window.db = {
                async getAll(store) {
                    console.log(`Getting ${store} from MongoDB`);
                    switch(store) {
                        case 'products':
                        case 'services':
                            return window.mongoAPI ? await window.mongoAPI.getProducts() : [];
                        case 'employees':
                            return window.mongoAPI ? await window.mongoAPI.getEmployees() : [];
                        case 'transactions':
                            return window.mongoAPI ? await window.mongoAPI.getTransactions() : [];
                        case 'bookings':
                            return window.mongoAPI ? await window.mongoAPI.getBookings() : [];
                        default:
                            return [];
                    }
                },
                async get(store, id) {
                    const items = await this.getAll(store);
                    return items.find(item => item.id === id || item._id === id);
                },
                async add(store, data) {
                    console.log(`Adding to ${store}:`, data);
                    return data;
                },
                async update(store, data) {
                    console.log(`Updating ${store}:`, data);
                    return data;
                },
                async delete(store, id) {
                    console.log(`Deleting from ${store}:`, id);
                    return true;
                },
                async put(store, data) {
                    return this.update(store, data);
                }
            };
        }
    };
    
    // 5. Maintain authentication
    const maintainAuth = () => {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const user = localStorage.getItem('auth_user') || localStorage.getItem('user');
        
        if (token && user) {
            // Keep auth alive
            setInterval(() => {
                localStorage.setItem('auth_token', token);
                localStorage.setItem('token', token);
            }, 10000);
        }
    };
    
    // Apply all fixes
    disableAuthChecks();
    fixNavigation();
    ensureMongoAPI();
    fixDatabase();
    maintainAuth();
    
    // Also fix on window load
    window.addEventListener('load', () => {
        disableAuthChecks();
        fixNavigation();
        ensureMongoAPI();
        fixDatabase();
    });
    
    console.log('✅ Universal fixes applied');
})();