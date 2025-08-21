// Main booking website functionality - MongoDB version
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Booking website loading from MongoDB...');
    
    // Load businesses from MongoDB
    async function loadBusinesses() {
        try {
            const businesses = await window.bookingAPI.getBusinesses();
            displayBusinesses(businesses);
        } catch (error) {
            console.error('Error loading businesses:', error);
            displayError('Unable to load businesses. Please try again later.');
        }
    }
    
    // Display businesses in the UI
    function displayBusinesses(businesses) {
        const container = document.getElementById('businessList') || document.querySelector('.business-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (businesses.length === 0) {
            container.innerHTML = '<p class="no-results">No businesses available at the moment.</p>';
            return;
        }
        
        businesses.forEach(business => {
            const card = createBusinessCard(business);
            container.appendChild(card);
        });
    }
    
    // Create a business card element
    function createBusinessCard(business) {
        const card = document.createElement('div');
        card.className = 'biz-card';
        
        card.innerHTML = `
            <img src="${business.image || '/images/default-spa.jpg'}" alt="${business.name}">
            <div class="biz-info">
                <h3>${business.name}</h3>
                <p class="biz-type">${business.type || 'Spa & Wellness'}</p>
                <p class="biz-address">${business.address || 'Location not specified'}</p>
                <div class="biz-rating">
                    ${generateStars(business.rating || 5)}
                    <span>(${business.reviewCount || 0} reviews)</span>
                </div>
                <button class="btn-book" onclick="bookNow('${business._id || business.id}')">
                    Book Now
                </button>
            </div>
        `;
        
        return card;
    }
    
    // Generate star rating HTML
    function generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '⭐';
            } else {
                stars += '☆';
            }
        }
        return stars;
    }
    
    // Display error message
    function displayError(message) {
        const container = document.getElementById('businessList') || document.querySelector('.business-list');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }
    
    // Book now function
    window.bookNow = async function(businessId) {
        try {
            // Get business details
            const business = await window.bookingAPI.getBusinessDetails(businessId);
            
            // Get available services
            const services = await window.bookingAPI.getBusinessServices(businessId);
            
            // Show booking modal
            showBookingModal(business, services);
        } catch (error) {
            console.error('Error starting booking:', error);
            alert('Unable to start booking. Please try again.');
        }
    };
    
    // Show booking modal
    function showBookingModal(business, services) {
        // Remove existing modal if any
        const existingModal = document.getElementById('bookingModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'bookingModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeBookingModal()">&times;</span>
                <h2>Book at ${business.name}</h2>
                
                <form id="bookingForm">
                    <div class="form-group">
                        <label>Select Service:</label>
                        <select id="serviceSelect" required>
                            <option value="">Choose a service...</option>
                            ${services.map(s => `
                                <option value="${s._id || s.id}" data-price="${s.price}">
                                    ${s.name} - ₱${s.price}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Select Date:</label>
                        <input type="date" id="bookingDate" required min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <div class="form-group">
                        <label>Select Time:</label>
                        <select id="timeSlot" required>
                            <option value="">Select date first...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Your Name:</label>
                        <input type="text" id="customerName" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="customerEmail" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Phone:</label>
                        <input type="tel" id="customerPhone" required>
                    </div>
                    
                    <button type="submit" class="btn-primary">Confirm Booking</button>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Add event listeners
        document.getElementById('bookingDate').addEventListener('change', async (e) => {
            const date = e.target.value;
            const serviceId = document.getElementById('serviceSelect').value;
            if (date && serviceId) {
                await loadTimeSlots(business._id || business.id, date, serviceId);
            }
        });
        
        document.getElementById('serviceSelect').addEventListener('change', async (e) => {
            const serviceId = e.target.value;
            const date = document.getElementById('bookingDate').value;
            if (date && serviceId) {
                await loadTimeSlots(business._id || business.id, date, serviceId);
            }
        });
        
        document.getElementById('bookingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitBooking(business);
        });
    }
    
    // Load available time slots
    async function loadTimeSlots(businessId, date, serviceId) {
        try {
            const slots = await window.bookingAPI.getAvailableSlots(businessId, date, serviceId);
            const select = document.getElementById('timeSlot');
            
            select.innerHTML = '<option value="">Select time...</option>';
            
            if (slots.length === 0) {
                select.innerHTML = '<option value="">No slots available</option>';
                return;
            }
            
            slots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot.time;
                option.textContent = slot.time;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading time slots:', error);
        }
    }
    
    // Submit booking
    async function submitBooking(business) {
        try {
            const bookingData = {
                businessId: business._id || business.id,
                serviceId: document.getElementById('serviceSelect').value,
                date: document.getElementById('bookingDate').value,
                time: document.getElementById('timeSlot').value,
                customerName: document.getElementById('customerName').value,
                customerEmail: document.getElementById('customerEmail').value,
                customerPhone: document.getElementById('customerPhone').value
            };
            
            const booking = await window.bookingAPI.createBooking(bookingData);
            
            // Show success message
            alert(`Booking confirmed! Your confirmation code is: ${booking.confirmationCode}`);
            
            // Close modal
            closeBookingModal();
            
        } catch (error) {
            console.error('Error submitting booking:', error);
            alert('Unable to complete booking. Please try again.');
        }
    }
    
    // Close booking modal
    window.closeBookingModal = function() {
        const modal = document.getElementById('bookingModal');
        if (modal) {
            modal.remove();
        }
    };
    
    // Search functionality
    const searchInput = document.getElementById('searchInput') || document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            if (query.length === 0) {
                loadBusinesses();
                return;
            }
            
            if (query.length < 2) return;
            
            try {
                const results = await window.bookingAPI.searchBusinesses(query);
                displayBusinesses(results);
            } catch (error) {
                console.error('Search error:', error);
            }
        });
    }
    
    // Initialize
    loadBusinesses();
});

console.log('✅ Booking website initialized with MongoDB');