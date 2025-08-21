// UNIFIED MONGODB FOR MARKETING WEBSITE
// Uses the same MongoDB database as webapp and booking site

(function() {
    'use strict';
    
    const MONGODB_API_URL = 'https://ava-pwa-backend.onrender.com/api';
    
    function getAuthToken() {
        return localStorage.getItem('auth_token') || 
               localStorage.getItem('authToken') || 
               localStorage.getItem('userToken') || '';
    }
    
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
            return await response.json();
        } catch (error) {
            console.error('MongoDB Request Error:', error);
            throw error;
        }
    }
    
    // Marketing website specific endpoints
    window.MarketingDB = {
        // Get business info for display
        getBusinessInfo: async (businessId) => {
            return mongoRequest(`/businesses/${businessId}`);
        },
        
        // Get services for public display
        getPublicServices: async (businessId) => {
            return mongoRequest(`/services?businessId=${businessId}&public=true`);
        },
        
        // Create customer account
        createCustomer: async (customerData) => {
            return mongoRequest('/users', 'POST', { ...customerData, role: 'customer' });
        },
        
        // Get business stats for dashboard
        getBusinessStats: async (businessId) => {
            return mongoRequest(`/reports/dashboard?businessId=${businessId}`);
        },
        
        // Get employees for display
        getEmployees: async (businessId) => {
            return mongoRequest(`/users?businessId=${businessId}&role=employee`);
        }
    };
    
    // Use same unified MongoDB structure
    window.db = window.UnifiedMongoDB || window.MarketingDB;
    
    console.log('✅ Marketing Website connected to unified MongoDB');
})();