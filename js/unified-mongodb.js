// UNIFIED MONGODB CONFIGURATION
// Single source of truth for all three frontends:
// 1. Web App (PWA)
// 2. Marketing Website  
// 3. Booking Website
//
// All frontends read/write to the SAME MongoDB database

(function() {
    'use strict';
    
    console.log('🌐 Unified MongoDB Configuration Loading...');
    
    // Single MongoDB Backend URL - ALL frontends use this
    const MONGODB_API_URL = 'https://ava-pwa-backend.onrender.com/api';
    
    // Get auth token from any storage location
    function getAuthToken() {
        return localStorage.getItem('auth_token') || 
               localStorage.getItem('authToken') || 
               localStorage.getItem('userToken') ||
               sessionStorage.getItem('auth_token') ||
               '';
    }
    
    // Unified API handler
    async function mongoRequest(endpoint, method = 'GET', data = null) {
        const url = `${MONGODB_API_URL}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
                'Accept': 'application/json'
            },
            mode: 'cors'
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('MongoDB Request Error:', error);
            throw error;
        }
    }
    
    // UNIFIED DATABASE STRUCTURE
    // Same structure used by all three frontends
    window.UnifiedMongoDB = {
        
        // BUSINESSES Collection
        businesses: {
            // Get business by ID or current user's business
            get: async (businessId = null) => {
                if (businessId) {
                    return mongoRequest(`/businesses/${businessId}`);
                }
                return mongoRequest('/businesses/current');
            },
            
            // Update business info
            update: async (businessId, data) => {
                return mongoRequest(`/businesses/${businessId}`, 'PUT', data);
            },
            
            // List all businesses (for admin)
            list: async () => {
                return mongoRequest('/businesses');
            },
            
            // Create new business
            create: async (data) => {
                return mongoRequest('/businesses', 'POST', data);
            }
        },
        
        // USERS Collection (includes employees, owners, customers)
        users: {
            // Get all users for a business
            getAll: async (businessId = null) => {
                const query = businessId ? `?businessId=${businessId}` : '';
                return mongoRequest(`/users${query}`);
            },
            
            // Get single user
            get: async (userId) => {
                return mongoRequest(`/users/${userId}`);
            },
            
            // Create user (employee, customer, etc.)
            create: async (userData) => {
                return mongoRequest('/users', 'POST', userData);
            },
            
            // Update user
            update: async (userId, data) => {
                return mongoRequest(`/users/${userId}`, 'PUT', data);
            },
            
            // Delete user
            delete: async (userId) => {
                return mongoRequest(`/users/${userId}`, 'DELETE');
            },
            
            // Get employees only
            getEmployees: async (businessId = null) => {
                const query = businessId ? `&businessId=${businessId}` : '';
                return mongoRequest(`/users?role=employee${query}`);
            },
            
            // Get customers only
            getCustomers: async (businessId = null) => {
                const query = businessId ? `&businessId=${businessId}` : '';
                return mongoRequest(`/users?role=customer${query}`);
            }
        },
        
        // SERVICES Collection (products/services offered)
        services: {
            // Get all services for a business
            getAll: async (businessId = null) => {
                const query = businessId ? `?businessId=${businessId}` : '';
                return mongoRequest(`/services${query}`);
            },
            
            // Get single service
            get: async (serviceId) => {
                return mongoRequest(`/services/${serviceId}`);
            },
            
            // Create service
            create: async (serviceData) => {
                return mongoRequest('/services', 'POST', serviceData);
            },
            
            // Update service
            update: async (serviceId, data) => {
                return mongoRequest(`/services/${serviceId}`, 'PUT', data);
            },
            
            // Delete service
            delete: async (serviceId) => {
                return mongoRequest(`/services/${serviceId}`, 'DELETE');
            },
            
            // Get available services for booking
            getAvailable: async (businessId, date = null) => {
                const query = date ? `&date=${date}` : '';
                return mongoRequest(`/services?businessId=${businessId}&available=true${query}`);
            }
        },
        
        // BOOKINGS Collection
        bookings: {
            // Get all bookings
            getAll: async (businessId = null, filters = {}) => {
                let query = businessId ? `?businessId=${businessId}` : '?';
                if (filters.date) query += `&date=${filters.date}`;
                if (filters.status) query += `&status=${filters.status}`;
                if (filters.customerId) query += `&customerId=${filters.customerId}`;
                if (filters.employeeId) query += `&employeeId=${filters.employeeId}`;
                return mongoRequest(`/bookings${query}`);
            },
            
            // Get single booking
            get: async (bookingId) => {
                return mongoRequest(`/bookings/${bookingId}`);
            },
            
            // Create booking
            create: async (bookingData) => {
                return mongoRequest('/bookings', 'POST', bookingData);
            },
            
            // Update booking
            update: async (bookingId, data) => {
                return mongoRequest(`/bookings/${bookingId}`, 'PUT', data);
            },
            
            // Cancel booking
            cancel: async (bookingId) => {
                return mongoRequest(`/bookings/${bookingId}/cancel`, 'PUT');
            },
            
            // Complete booking
            complete: async (bookingId) => {
                return mongoRequest(`/bookings/${bookingId}/complete`, 'PUT');
            }
        },
        
        // INVENTORY Collection
        inventory: {
            // Get all inventory items
            getAll: async (businessId = null) => {
                const query = businessId ? `?businessId=${businessId}` : '';
                return mongoRequest(`/inventory${query}`);
            },
            
            // Get single item
            get: async (itemId) => {
                return mongoRequest(`/inventory/${itemId}`);
            },
            
            // Create item
            create: async (itemData) => {
                return mongoRequest('/inventory', 'POST', itemData);
            },
            
            // Update item
            update: async (itemId, data) => {
                return mongoRequest(`/inventory/${itemId}`, 'PUT', data);
            },
            
            // Delete item
            delete: async (itemId) => {
                return mongoRequest(`/inventory/${itemId}`, 'DELETE');
            },
            
            // Update stock
            updateStock: async (itemId, quantity, operation = 'add') => {
                return mongoRequest(`/inventory/${itemId}/stock`, 'PUT', { quantity, operation });
            }
        },
        
        // TRANSACTIONS Collection (POS, expenses, sales)
        transactions: {
            // Get all transactions
            getAll: async (businessId = null, filters = {}) => {
                let query = businessId ? `?businessId=${businessId}` : '?';
                if (filters.type) query += `&type=${filters.type}`;
                if (filters.startDate) query += `&startDate=${filters.startDate}`;
                if (filters.endDate) query += `&endDate=${filters.endDate}`;
                return mongoRequest(`/transactions${query}`);
            },
            
            // Get single transaction
            get: async (transactionId) => {
                return mongoRequest(`/transactions/${transactionId}`);
            },
            
            // Create transaction
            create: async (transactionData) => {
                return mongoRequest('/transactions', 'POST', transactionData);
            },
            
            // Update transaction
            update: async (transactionId, data) => {
                return mongoRequest(`/transactions/${transactionId}`, 'PUT', data);
            },
            
            // Delete transaction
            delete: async (transactionId) => {
                return mongoRequest(`/transactions/${transactionId}`, 'DELETE');
            },
            
            // Get sales only
            getSales: async (businessId, startDate, endDate) => {
                return mongoRequest(`/transactions?businessId=${businessId}&type=sale&startDate=${startDate}&endDate=${endDate}`);
            },
            
            // Get expenses only
            getExpenses: async (businessId, startDate, endDate) => {
                return mongoRequest(`/transactions?businessId=${businessId}&type=expense&startDate=${startDate}&endDate=${endDate}`);
            }
        },
        
        // ROOMS Collection
        rooms: {
            // Get all rooms
            getAll: async (businessId = null) => {
                const query = businessId ? `?businessId=${businessId}` : '';
                return mongoRequest(`/rooms${query}`);
            },
            
            // Get single room
            get: async (roomId) => {
                return mongoRequest(`/rooms/${roomId}`);
            },
            
            // Create room
            create: async (roomData) => {
                return mongoRequest('/rooms', 'POST', roomData);
            },
            
            // Update room
            update: async (roomId, data) => {
                return mongoRequest(`/rooms/${roomId}`, 'PUT', data);
            },
            
            // Delete room
            delete: async (roomId) => {
                return mongoRequest(`/rooms/${roomId}`, 'DELETE');
            },
            
            // Check availability
            checkAvailability: async (roomId, date, startTime, endTime) => {
                return mongoRequest(`/rooms/${roomId}/availability?date=${date}&startTime=${startTime}&endTime=${endTime}`);
            }
        },
        
        // SETTINGS Collection
        settings: {
            // Get settings for business
            get: async (businessId = null) => {
                const query = businessId ? `?businessId=${businessId}` : '';
                return mongoRequest(`/settings${query}`);
            },
            
            // Update settings
            update: async (settingsData) => {
                return mongoRequest('/settings', 'PUT', settingsData);
            }
        },
        
        // AUTHENTICATION
        auth: {
            // Login
            login: async (email, password) => {
                const response = await mongoRequest('/auth/login', 'POST', { email, password });
                if (response.token) {
                    localStorage.setItem('auth_token', response.token);
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('userToken', response.token);
                    localStorage.setItem('userData', JSON.stringify(response.user));
                }
                return response;
            },
            
            // Register
            register: async (userData) => {
                return mongoRequest('/auth/register', 'POST', userData);
            },
            
            // Logout
            logout: async () => {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                sessionStorage.clear();
            },
            
            // Get current user
            getCurrentUser: async () => {
                return mongoRequest('/auth/me');
            },
            
            // Verify token
            verifyToken: async () => {
                return mongoRequest('/auth/verify');
            }
        },
        
        // REPORTS & ANALYTICS
        reports: {
            // Get dashboard stats
            getDashboardStats: async (businessId = null) => {
                const query = businessId ? `?businessId=${businessId}` : '';
                return mongoRequest(`/reports/dashboard${query}`);
            },
            
            // Get sales report
            getSalesReport: async (businessId, startDate, endDate) => {
                return mongoRequest(`/reports/sales?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`);
            },
            
            // Get inventory report
            getInventoryReport: async (businessId) => {
                return mongoRequest(`/reports/inventory?businessId=${businessId}`);
            },
            
            // Get employee performance
            getEmployeePerformance: async (businessId, employeeId = null) => {
                const query = employeeId ? `&employeeId=${employeeId}` : '';
                return mongoRequest(`/reports/employees?businessId=${businessId}${query}`);
            }
        }
    };
    
    // Override the old db object with unified MongoDB
    window.db = window.UnifiedMongoDB;
    
    // Helper function to get current business ID
    window.getCurrentBusinessId = function() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.businessId || user.business_id || null;
            } catch (e) {
                return null;
            }
        }
        return null;
    };
    
    console.log('✅ Unified MongoDB Configuration Ready');
    console.log('📚 Available collections:', Object.keys(window.UnifiedMongoDB));
    console.log('🔗 All frontends now use the same MongoDB database');
    
})();