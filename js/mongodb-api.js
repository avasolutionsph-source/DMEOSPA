// MongoDB API Service - Direct connection to backend, no IndexedDB
class MongoDBAPI {
    constructor() {
        // Use the PWA backend as the single source of truth
        this.apiUrl = 'https://ava-pwa-backend.onrender.com/api';
        this.token = null;
        this.user = null;
        this.init();
    }
    
    init() {
        // Load auth from localStorage
        this.token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const userData = localStorage.getItem('auth_user') || localStorage.getItem('user');
        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
    }
    
    // Helper method for API requests
    async request(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const options = {
            method,
            headers
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(`${this.apiUrl}${endpoint}`, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }
            
            return result;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }
    
    // Authentication Methods
    async login(email, password) {
        const result = await this.request('/auth/login', 'POST', { email, password });
        if (result.token) {
            this.token = result.token;
            this.user = result.user;
            
            // Store in localStorage
            localStorage.setItem('auth_token', this.token);
            localStorage.setItem('auth_user', JSON.stringify(this.user));
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));
        }
        return result;
    }
    
    async logout() {
        // Clear local storage
        const authKeys = ['auth_token', 'auth_user', 'token', 'user', 'authToken', 'userData'];
        authKeys.forEach(key => localStorage.removeItem(key));
        
        this.token = null;
        this.user = null;
        
        // Redirect to login
        window.location.href = 'login.html';
    }
    
    // Product/Service Methods
    async getProducts() {
        return await this.request('/products');
    }
    
    async createProduct(product) {
        return await this.request('/products', 'POST', product);
    }
    
    async updateProduct(id, product) {
        return await this.request(`/products/${id}`, 'PUT', product);
    }
    
    async deleteProduct(id) {
        return await this.request(`/products/${id}`, 'DELETE');
    }
    
    // Inventory Methods
    async getInventory() {
        return await this.request('/inventory');
    }
    
    async createInventoryItem(item) {
        return await this.request('/inventory', 'POST', item);
    }
    
    async updateInventoryItem(id, item) {
        return await this.request(`/inventory/${id}`, 'PUT', item);
    }
    
    async deleteInventoryItem(id) {
        return await this.request(`/inventory/${id}`, 'DELETE');
    }
    
    // Employee Methods
    async getEmployees() {
        return await this.request('/employees');
    }
    
    async createEmployee(employee) {
        return await this.request('/employees', 'POST', employee);
    }
    
    async updateEmployee(id, employee) {
        return await this.request(`/employees/${id}`, 'PUT', employee);
    }
    
    async deleteEmployee(id) {
        return await this.request(`/employees/${id}`, 'DELETE');
    }
    
    // Transaction Methods
    async getTransactions(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return await this.request(`/transactions${query ? '?' + query : ''}`);
    }
    
    async createTransaction(transaction) {
        return await this.request('/transactions', 'POST', transaction);
    }
    
    async getTransactionById(id) {
        return await this.request(`/transactions/${id}`);
    }
    
    // Booking Methods
    async getBookings(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return await this.request(`/bookings${query ? '?' + query : ''}`);
    }
    
    async createBooking(booking) {
        return await this.request('/bookings', 'POST', booking);
    }
    
    async updateBooking(id, booking) {
        return await this.request(`/bookings/${id}`, 'PUT', booking);
    }
    
    async deleteBooking(id) {
        return await this.request(`/bookings/${id}`, 'DELETE');
    }
    
    // Expense Methods
    async getExpenses(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return await this.request(`/expenses${query ? '?' + query : ''}`);
    }
    
    async createExpense(expense) {
        return await this.request('/expenses', 'POST', expense);
    }
    
    async updateExpense(id, expense) {
        return await this.request(`/expenses/${id}`, 'PUT', expense);
    }
    
    async deleteExpense(id) {
        return await this.request(`/expenses/${id}`, 'DELETE');
    }
    
    // Room Methods
    async getRooms() {
        return await this.request('/rooms');
    }
    
    async createRoom(room) {
        return await this.request('/rooms', 'POST', room);
    }
    
    async updateRoom(id, room) {
        return await this.request(`/rooms/${id}`, 'PUT', room);
    }
    
    async deleteRoom(id) {
        return await this.request(`/rooms/${id}`, 'DELETE');
    }
    
    // Dashboard/Analytics Methods
    async getDashboardData() {
        return await this.request('/dashboard');
    }
    
    async getAnalytics(period = 'month') {
        return await this.request(`/analytics?period=${period}`);
    }
    
    // Business Settings
    async getBusinessSettings() {
        return await this.request('/business/settings');
    }
    
    async updateBusinessSettings(settings) {
        return await this.request('/business/settings', 'PUT', settings);
    }
}

// Create global instance
window.mongoAPI = new MongoDBAPI();

console.log('✅ MongoDB API initialized - All data now stored in MongoDB');