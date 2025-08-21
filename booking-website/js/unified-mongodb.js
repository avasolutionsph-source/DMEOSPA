// UNIFIED MONGODB FOR BOOKING WEBSITE
// Uses the same MongoDB database as webapp and marketing site

(function() {
    'use strict';
    
    const MONGODB_API_URL = 'https://ava-pwa-backend.onrender.com/api';
    
    // Booking website doesn't require auth for public booking
    async function mongoRequest(endpoint, method = 'GET', data = null) {
        const url = `${MONGODB_API_URL}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
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
    
    // Booking website specific endpoints
    window.BookingDB = {
        // Get business info
        getBusiness: async (businessId) => {
            return mongoRequest(`/public/business-catalog/${businessId}`);
        },
        
        // Get available services
        getServices: async (businessId) => {
            return mongoRequest(`/services?businessId=${businessId}&available=true`);
        },
        
        // Get available therapists
        getTherapists: async (businessId) => {
            return mongoRequest(`/users?businessId=${businessId}&role=therapist&available=true`);
        },
        
        // Get available time slots
        getAvailableSlots: async (businessId, date, serviceId) => {
            return mongoRequest(`/bookings/slots?businessId=${businessId}&date=${date}&serviceId=${serviceId}`);
        },
        
        // Create booking (no auth required for customers)
        createBooking: async (bookingData) => {
            return mongoRequest('/bookings/public', 'POST', bookingData);
        },
        
        // Get booking by confirmation code
        getBookingByCode: async (confirmationCode) => {
            return mongoRequest(`/bookings/confirm/${confirmationCode}`);
        },
        
        // Cancel booking by confirmation code
        cancelBooking: async (confirmationCode) => {
            return mongoRequest(`/bookings/confirm/${confirmationCode}/cancel`, 'PUT');
        },
        
        // Get business hours
        getBusinessHours: async (businessId) => {
            return mongoRequest(`/businesses/${businessId}/hours`);
        },
        
        // Check if slot is available
        checkSlotAvailability: async (businessId, date, time, serviceId) => {
            return mongoRequest(`/bookings/check?businessId=${businessId}&date=${date}&time=${time}&serviceId=${serviceId}`);
        }
    };
    
    // Override old catalog system
    window.catalog = {
        services: [],
        therapists: [],
        
        // Load services from MongoDB
        loadServices: async function(businessId) {
            try {
                const services = await BookingDB.getServices(businessId || 'default');
                this.services = services;
                return services;
            } catch (error) {
                console.error('Failed to load services:', error);
                return [];
            }
        },
        
        // Load therapists from MongoDB
        loadTherapists: async function(businessId) {
            try {
                const therapists = await BookingDB.getTherapists(businessId || 'default');
                this.therapists = therapists;
                return therapists;
            } catch (error) {
                console.error('Failed to load therapists:', error);
                return [];
            }
        },
        
        // Get service by ID
        getService: function(serviceId) {
            return this.services.find(s => s._id === serviceId || s.id === serviceId);
        },
        
        // Get therapist by ID
        getTherapist: function(therapistId) {
            return this.therapists.find(t => t._id === therapistId || t.id === therapistId);
        }
    };
    
    // Initialize on load
    window.addEventListener('DOMContentLoaded', async function() {
        // Get business ID from URL or use default
        const urlParams = new URLSearchParams(window.location.search);
        const businessId = urlParams.get('business') || 'default';
        
        // Load initial data
        await catalog.loadServices(businessId);
        await catalog.loadTherapists(businessId);
        
        console.log('✅ Booking website connected to unified MongoDB');
        console.log('📚 Services loaded:', catalog.services.length);
        console.log('👥 Therapists loaded:', catalog.therapists.length);
    });
    
})();