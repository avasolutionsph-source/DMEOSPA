/**
 * Resource-specific API clients
 * Replaces duplicate API patterns across different managers
 */

import { CRUDAPIClient, apiClient } from './base-api-client.js';
import { logInfo, logDebug } from './logger-helper.js';

// Products/Services API
export class ProductsAPI extends CRUDAPIClient {
    constructor() {
        super({ resourcePath: '/api/products' });
    }
    
    async getByCategory(category) {
        logDebug('Fetching products by category', {
            category: 'API',
            operation: 'get_products_by_category',
            data: { category }
        });
        return this.get(`${this.resourcePath}/category/${category}`);
    }
    
    async search(query, filters = {}) {
        const params = { q: query, ...filters };
        return this.get(this.buildUrlWithParams(`${this.resourcePath}/search`, params));
    }
    
    async updateStatus(id, status) {
        return this.patch(`${this.resourcePath}/${id}/status`, { status });
    }
    
    async getPopular(limit = 10) {
        return this.get(`${this.resourcePath}/popular?limit=${limit}`);
    }
}

// Inventory API
export class InventoryAPI extends CRUDAPIClient {
    constructor() {
        super({ resourcePath: '/api/inventory' });
    }
    
    async getLowStock(threshold = 10) {
        return this.get(`${this.resourcePath}/low-stock?threshold=${threshold}`);
    }
    
    async updateStock(id, quantity, operation = 'set') {
        return this.patch(`${this.resourcePath}/${id}/stock`, { 
            quantity, 
            operation // 'set', 'add', 'subtract'
        });
    }
    
    async bulkUpdateStock(updates) {
        return this.post(`${this.resourcePath}/bulk-stock-update`, { updates });
    }
    
    async getStockHistory(id, days = 30) {
        return this.get(`${this.resourcePath}/${id}/history?days=${days}`);
    }
    
    async getStockAlerts() {
        return this.get(`${this.resourcePath}/alerts`);
    }
}

// Employees API
export class EmployeesAPI extends CRUDAPIClient {
    constructor() {
        super({ resourcePath: '/api/employees' });
    }
    
    async getByRole(role) {
        return this.get(`${this.resourcePath}/role/${role}`);
    }
    
    async updateStatus(id, status) {
        return this.patch(`${this.resourcePath}/${id}/status`, { status });
    }
    
    async getSchedule(id, startDate, endDate) {
        const params = { startDate, endDate };
        return this.get(this.buildUrlWithParams(`${this.resourcePath}/${id}/schedule`, params));
    }
    
    async updateSchedule(id, schedule) {
        return this.put(`${this.resourcePath}/${id}/schedule`, { schedule });
    }
    
    async getPerformance(id, period = '30d') {
        return this.get(`${this.resourcePath}/${id}/performance?period=${period}`);
    }
}

// Transactions API
export class TransactionsAPI extends CRUDAPIClient {
    constructor() {
        super({ resourcePath: '/api/transactions' });
    }
    
    async getByDateRange(startDate, endDate, filters = {}) {
        const params = { startDate, endDate, ...filters };
        return this.get(this.buildUrlWithParams(this.resourcePath, params));
    }
    
    async getByEmployee(employeeId, startDate, endDate) {
        const params = { employeeId, startDate, endDate };
        return this.get(this.buildUrlWithParams(`${this.resourcePath}/by-employee`, params));
    }
    
    async getDailySummary(date) {
        return this.get(`${this.resourcePath}/daily-summary/${date}`);
    }
    
    async getMonthlySummary(year, month) {
        return this.get(`${this.resourcePath}/monthly-summary/${year}/${month}`);
    }
    
    async refund(id, amount, reason = '') {
        return this.post(`${this.resourcePath}/${id}/refund`, { amount, reason });
    }
    
    async void(id, reason = '') {
        return this.post(`${this.resourcePath}/${id}/void`, { reason });
    }
}

// Auth API
export class AuthAPI {
    constructor() {
        this.client = apiClient;
    }
    
    async login(email, password) {
        logInfo('Attempting user login', {
            category: 'AUTH',
            operation: 'login_attempt',
            data: { email }
        });
        
        const response = await this.client.post('/api/auth/login', { 
            email, 
            password 
        });
        
        // Set token for future requests
        if (response.token) {
            this.client.setToken(response.token);
        }
        
        return response;
    }
    
    async register(userData) {
        logInfo('Attempting user registration', {
            category: 'AUTH',
            operation: 'register_attempt',
            data: { email: userData.email }
        });
        
        return this.client.post('/api/auth/register', userData);
    }
    
    async logout() {
        logInfo('User logout', {
            category: 'AUTH',
            operation: 'logout'
        });
        
        try {
            await this.client.post('/api/auth/logout');
        } catch (error) {
            // Logout endpoint might not exist or fail, but we still clear the token
            logDebug('Logout endpoint failed, but clearing token anyway', {
                category: 'AUTH',
                operation: 'logout_endpoint_failed',
                error
            });
        }
        
        this.client.clearToken();
    }
    
    async validateSession() {
        return this.client.get('/api/auth/validate');
    }
    
    async refreshToken() {
        const response = await this.client.post('/api/auth/refresh');
        
        if (response.token) {
            this.client.setToken(response.token);
        }
        
        return response;
    }
    
    async forgotPassword(email) {
        return this.client.post('/api/auth/forgot-password', { email });
    }
    
    async resetPassword(token, password) {
        return this.client.post('/api/auth/reset-password', { token, password });
    }
    
    async updatePassword(currentPassword, newPassword) {
        return this.client.put('/api/auth/password', { 
            currentPassword, 
            newPassword 
        });
    }
}

// Business/Settings API
export class BusinessAPI {
    constructor() {
        this.client = apiClient;
    }
    
    async getSettings() {
        return this.client.get('/api/business/settings');
    }
    
    async updateSettings(settings) {
        return this.client.put('/api/business/settings', settings);
    }
    
    async getSubscription() {
        return this.client.get('/api/business/subscription');
    }
    
    async updateSubscription(planId) {
        return this.client.put('/api/business/subscription', { planId });
    }
    
    async getAnalytics(period = '30d') {
        return this.client.get(`/api/analytics?period=${period}`);
    }
    
    async exportData(type, startDate, endDate) {
        return this.client.get(this.client.buildUrlWithParams('/api/business/export', {
            type,
            startDate,
            endDate
        }));
    }
}

// Sync API
export class SyncAPI {
    constructor() {
        this.client = apiClient;
    }
    
    async syncAll() {
        logInfo('Starting full sync operation', {
            category: 'SYNC',
            operation: 'sync_all'
        });
        
        return this.client.post('/api/sync/full');
    }
    
    async syncPartial(resources) {
        return this.client.post('/api/sync/partial', { resources });
    }
    
    async getSyncStatus() {
        return this.client.get('/api/sync/status');
    }
    
    async pushPendingChanges(changes) {
        return this.client.post('/api/sync/push', { changes });
    }
    
    async pullUpdates(lastSyncTime) {
        return this.client.get(`/api/sync/pull?since=${lastSyncTime}`);
    }
    
    async resolveSyncConflict(conflictId, resolution) {
        return this.client.post(`/api/sync/conflicts/${conflictId}/resolve`, { 
            resolution 
        });
    }
}

// Create singleton instances
export const productsAPI = new ProductsAPI();
export const inventoryAPI = new InventoryAPI();
export const employeesAPI = new EmployeesAPI();
export const transactionsAPI = new TransactionsAPI();
export const authAPI = new AuthAPI();
export const businessAPI = new BusinessAPI();
export const syncAPI = new SyncAPI();

// Export all APIs as a single object for convenience
export const APIs = {
    products: productsAPI,
    inventory: inventoryAPI,
    employees: employeesAPI,
    transactions: transactionsAPI,
    auth: authAPI,
    business: businessAPI,
    sync: syncAPI
};

export default APIs;