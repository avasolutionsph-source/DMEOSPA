// MongoDB Booking API - Direct connection to backend, no localStorage caching
class BookingAPI {
    constructor() {
        // Use the PWA backend for all booking operations
        this.apiUrl = 'https://ava-pwa-backend.onrender.com/api';
    }
    
    // Helper method for API requests
    async request(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
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
    
    // Get all businesses (public endpoint)
    async getBusinesses() {
        try {
            const businesses = await this.request('/businesses/public');
            return businesses || [];
        } catch (error) {
            console.error('Error fetching businesses:', error);
            return [];
        }
    }
    
    // Get business details
    async getBusinessDetails(businessId) {
        try {
            const business = await this.request(`/public/business-catalog/${businessId}`);
            return business;
        } catch (error) {
            console.error('Error fetching business details:', error);
            return null;
        }
    }
    
    // Get available services for a business
    async getBusinessServices(businessId) {
        try {
            const services = await this.request(`/businesses/${businessId}/services`);
            return services || [];
        } catch (error) {
            console.error('Error fetching services:', error);
            return [];
        }
    }
    
    // Get available time slots
    async getAvailableSlots(businessId, date, serviceId) {
        try {
            const slots = await this.request(`/bookings/availability?businessId=${businessId}&date=${date}&serviceId=${serviceId}`);
            return slots || [];
        } catch (error) {
            console.error('Error fetching available slots:', error);
            return [];
        }
    }
    
    // Create a booking
    async createBooking(bookingData) {
        try {
            const booking = await this.request('/bookings/public', 'POST', bookingData);
            return booking;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }
    
    // Get booking by confirmation code
    async getBookingByCode(confirmationCode) {
        try {
            const booking = await this.request(`/bookings/confirm/${confirmationCode}`);
            return booking;
        } catch (error) {
            console.error('Error fetching booking:', error);
            return null;
        }
    }
    
    // Cancel booking
    async cancelBooking(confirmationCode) {
        try {
            const result = await this.request(`/bookings/cancel/${confirmationCode}`, 'POST');
            return result;
        } catch (error) {
            console.error('Error canceling booking:', error);
            throw error;
        }
    }
    
    // Search businesses
    async searchBusinesses(query) {
        try {
            const results = await this.request(`/businesses/search?q=${encodeURIComponent(query)}`);
            return results || [];
        } catch (error) {
            console.error('Error searching businesses:', error);
            return [];
        }
    }
    
    // Get business reviews
    async getBusinessReviews(businessId) {
        try {
            const reviews = await this.request(`/businesses/${businessId}/reviews`);
            return reviews || [];
        } catch (error) {
            console.error('Error fetching reviews:', error);
            return [];
        }
    }
    
    // Submit a review
    async submitReview(businessId, reviewData) {
        try {
            const review = await this.request(`/businesses/${businessId}/reviews`, 'POST', reviewData);
            return review;
        } catch (error) {
            console.error('Error submitting review:', error);
            throw error;
        }
    }
}

// Create global instance
window.bookingAPI = new BookingAPI();

// Remove any localStorage caching
localStorage.removeItem('businessCatalog');
localStorage.removeItem('cachedBusinesses');
localStorage.removeItem('bookingCache');

console.log('✅ MongoDB Booking API initialized - All data from MongoDB');