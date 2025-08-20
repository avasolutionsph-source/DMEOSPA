// Therapist Portal JavaScript
(function() {
    const isLocal = ['localhost','127.0.0.1'].some(h => location.hostname.startsWith(h));
    const marketingApi = 'https://ava-marketing-api.onrender.com';
    const apiBase = () => `${marketingApi}/api`;

    let currentTherapist = null;
    let todayBookings = [];
    let upcomingBookings = [];
    let serviceTimer = null;
    let timerStartTime = null;
    let timerInterval = null;

    // Initialize the therapist portal
    async function init() {
        console.log('🩺 Initializing Therapist Portal');
        
        // Check if therapist is logged in
        await loadTherapistAuth();
        
        if (!currentTherapist) {
            // Redirect to login or show login modal
            showTherapistLogin();
            return;
        }

        // Setup UI
        setupUI();
        setupEventListeners();
        
        // Load data
        await loadTherapistData();
        
        console.log('✅ Therapist Portal initialized');
    }

    async function loadTherapistAuth() {
        // Check URL parameters first (direct link from main app)
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const therapistId = params.get('therapistId');
        const therapistName = params.get('name');
        const therapistEmail = params.get('email');

        if (token && (therapistId || therapistName || therapistEmail)) {
            currentTherapist = {
                token: token,
                id: therapistId,
                name: therapistName || therapistEmail?.split('@')[0] || 'Therapist',
                email: therapistEmail,
                role: 'therapist'
            };
            
            // Store for future sessions
            localStorage.setItem('therapistAuth', JSON.stringify(currentTherapist));
            
            // Clean up URL
            const cleanUrl = location.pathname;
            history.replaceState({}, document.title, cleanUrl);
            
            return;
        }

        // Check localStorage
        const stored = localStorage.getItem('therapistAuth');
        if (stored) {
            try {
                currentTherapist = JSON.parse(stored);
                
                // Validate token is still good
                if (await validateTherapistToken(currentTherapist.token)) {
                    return;
                } else {
                    localStorage.removeItem('therapistAuth');
                    currentTherapist = null;
                }
            } catch (e) {
                localStorage.removeItem('therapistAuth');
            }
        }
    }

    async function validateTherapistToken(token) {
        try {
            const response = await fetch(`${apiBase()}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    function setupUI() {
        const welcomeName = document.getElementById('welcomeName');
        const therapistName = document.getElementById('therapistName');
        
        if (welcomeName) welcomeName.textContent = currentTherapist.name;
        if (therapistName) therapistName.textContent = currentTherapist.name;
    }

    function setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Timer controls
        const startTimerBtn = document.getElementById('startTimerBtn');
        const stopTimerBtn = document.getElementById('stopTimerBtn');
        const pauseTimerBtn = document.getElementById('pauseTimerBtn');

        if (startTimerBtn) startTimerBtn.addEventListener('click', startServiceTimer);
        if (stopTimerBtn) stopTimerBtn.addEventListener('click', stopServiceTimer);
        if (pauseTimerBtn) pauseTimerBtn.addEventListener('click', pauseServiceTimer);

        // Mobile navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.dataset.section) {
                    e.preventDefault();
                    switchSection(item.dataset.section);
                    
                    // Update active state
                    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });
    }

    async function loadTherapistData() {
        try {
            showLoading('Loading your schedule...');
            
            // Load today's bookings
            await loadTodayBookings();
            
            // Load upcoming bookings
            await loadUpcomingBookings();
            
            // Update stats
            updateStats();
            
            hideLoading();
        } catch (error) {
            console.error('Failed to load therapist data:', error);
            showError('Failed to load your schedule. Please refresh the page.');
            hideLoading();
        }
    }

    async function loadTodayBookings() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const response = await fetch(`${apiBase()}/bookings/therapist`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentTherapist.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    therapistId: currentTherapist.id,
                    therapistEmail: currentTherapist.email,
                    therapistName: currentTherapist.name,
                    date: today
                })
            });

            if (response.ok) {
                const data = await response.json();
                todayBookings = data.bookings || [];
            } else {
                // Fallback to demo data for testing
                todayBookings = generateDemoBookings(today);
            }

            displayTodayBookings();
            
        } catch (error) {
            console.error('Failed to load today bookings:', error);
            // Fallback to demo data
            todayBookings = generateDemoBookings(new Date().toISOString().split('T')[0]);
            displayTodayBookings();
        }
    }

    async function loadUpcomingBookings() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const nextWeekStr = nextWeek.toISOString().split('T')[0];

            const response = await fetch(`${apiBase()}/bookings/therapist`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentTherapist.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    therapistId: currentTherapist.id,
                    therapistEmail: currentTherapist.email,
                    therapistName: currentTherapist.name,
                    startDate: tomorrowStr,
                    endDate: nextWeekStr
                })
            });

            if (response.ok) {
                const data = await response.json();
                upcomingBookings = data.bookings || [];
            } else {
                upcomingBookings = generateDemoBookings(tomorrowStr, 3);
            }

            displayUpcomingBookings();
            
        } catch (error) {
            console.error('Failed to load upcoming bookings:', error);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            upcomingBookings = generateDemoBookings(tomorrow.toISOString().split('T')[0], 3);
            displayUpcomingBookings();
        }
    }

    function generateDemoBookings(date, count = 5) {
        const services = ['Deep Tissue Massage', 'Swedish Massage', 'Hot Stone Massage', 'Aromatherapy', 'Reflexology'];
        const customers = ['Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Kim', 'Lisa Wang'];
        const bookings = [];
        
        for (let i = 0; i < count; i++) {
            const hour = 9 + i * 2;
            const startTime = `${date}T${hour.toString().padStart(2, '0')}:00:00`;
            
            bookings.push({
                id: `demo_${Date.now()}_${i}`,
                customerName: customers[i % customers.length],
                serviceName: services[i % services.length],
                startTime: startTime,
                duration: 60,
                status: 'confirmed',
                therapistName: currentTherapist.name,
                isDemo: true
            });
        }
        
        return bookings;
    }

    function displayTodayBookings() {
        const container = document.getElementById('todayBookings');
        if (!container) return;

        if (todayBookings.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No appointments scheduled for today</p>';
            return;
        }

        container.innerHTML = todayBookings.map(booking => {
            const startTime = new Date(booking.startTime);
            const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="booking-item">
                    <div class="booking-time">${timeStr}</div>
                    <div class="booking-details">
                        <div class="booking-service">${booking.serviceName}</div>
                        <div class="booking-customer">${booking.customerName}</div>
                    </div>
                    <div class="booking-actions">
                        <button class="btn-small btn-start" onclick="startService('${booking.id}')">
                            <i class="fas fa-play"></i> Start
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function displayUpcomingBookings() {
        const container = document.getElementById('upcomingBookings');
        if (!container) return;

        if (upcomingBookings.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No upcoming appointments</p>';
            return;
        }

        container.innerHTML = upcomingBookings.map(booking => {
            const startTime = new Date(booking.startTime);
            const dateStr = startTime.toLocaleDateString();
            const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="booking-item">
                    <div class="booking-time">
                        <div>${dateStr}</div>
                        <div style="font-size: 0.8rem; color: #666;">${timeStr}</div>
                    </div>
                    <div class="booking-details">
                        <div class="booking-service">${booking.serviceName}</div>
                        <div class="booking-customer">${booking.customerName}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateStats() {
        const todayBookingsEl = document.getElementById('todayBookings');
        const totalHoursEl = document.getElementById('totalHours');
        const nextBookingEl = document.getElementById('nextBooking');

        // Update today's bookings count
        if (todayBookingsEl) {
            const statsEl = document.querySelector('.stat-card .stat-value');
            if (statsEl) statsEl.textContent = todayBookings.length;
        }

        // Calculate total hours
        const totalMinutes = todayBookings.reduce((sum, booking) => sum + (booking.duration || 60), 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (totalHoursEl) {
            totalHoursEl.textContent = `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        }

        // Find next booking
        const now = new Date();
        const upcoming = [...todayBookings, ...upcomingBookings]
            .filter(booking => new Date(booking.startTime) > now)
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        if (nextBookingEl) {
            if (upcoming.length > 0) {
                const nextTime = new Date(upcoming[0].startTime);
                const isToday = nextTime.toDateString() === now.toDateString();
                nextBookingEl.textContent = isToday 
                    ? nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : nextTime.toLocaleDateString();
            } else {
                nextBookingEl.textContent = 'None';
            }
        }
    }

    // Service Timer Functions
    window.startService = function(bookingId) {
        const booking = todayBookings.find(b => b.id === bookingId);
        if (!booking) return;

        startServiceTimer(booking);
    };

    function startServiceTimer(booking = null) {
        serviceTimer = {
            booking: booking,
            startTime: new Date(),
            duration: booking ? booking.duration : 60,
            isPaused: false
        };

        const timerSection = document.getElementById('timerSection');
        const activeServiceName = document.getElementById('activeServiceName');
        const startBtn = document.getElementById('startTimerBtn');
        const stopBtn = document.getElementById('stopTimerBtn');
        const pauseBtn = document.getElementById('pauseTimerBtn');

        if (timerSection) timerSection.style.display = 'block';
        if (activeServiceName) {
            activeServiceName.textContent = booking ? 
                `${booking.serviceName} - ${booking.customerName}` : 
                'Manual Service Timer';
        }
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        if (pauseBtn) pauseBtn.style.display = 'inline-block';

        // Start timer interval
        timerInterval = setInterval(updateTimerDisplay, 1000);
        updateTimerDisplay();

        showNotification('Service timer started!', 'success');
    }

    function stopServiceTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        const timerSection = document.getElementById('timerSection');
        const startBtn = document.getElementById('startTimerBtn');
        const stopBtn = document.getElementById('stopTimerBtn');
        const pauseBtn = document.getElementById('pauseTimerBtn');

        if (timerSection) timerSection.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'none';

        serviceTimer = null;
        showNotification('Service completed!', 'success');
    }

    function pauseServiceTimer() {
        if (!serviceTimer) return;

        serviceTimer.isPaused = !serviceTimer.isPaused;
        const pauseBtn = document.getElementById('pauseTimerBtn');
        
        if (serviceTimer.isPaused) {
            clearInterval(timerInterval);
            if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
        } else {
            timerInterval = setInterval(updateTimerDisplay, 1000);
            if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        }
    }

    function updateTimerDisplay() {
        if (!serviceTimer) return;

        const now = new Date();
        const elapsed = Math.floor((now - serviceTimer.startTime) / 1000);
        
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;

        const display = document.getElementById('timerDisplay');
        if (display) {
            display.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        // Check if service time is complete
        const totalMinutes = Math.floor(elapsed / 60);
        if (totalMinutes >= serviceTimer.duration) {
            if (display) display.style.color = '#dc3545'; // Red color
            
            // Show completion notification (only once)
            if (!serviceTimer.notificationShown) {
                showNotification('⏰ Service time completed!', 'warning');
                serviceTimer.notificationShown = true;
            }
        }
    }

    function switchSection(section) {
        // This could hide/show different sections of the UI
        console.log('Switching to section:', section);
    }

    function logout() {
        localStorage.removeItem('therapistAuth');
        
        // Check if this was opened from the main PWA
        if (window.opener) {
            // Close this window and return to PWA
            window.close();
        } else {
            // Redirect to PWA redirect page
            window.location.href = '/pwa-redirect.html';
        }
    }

    function showTherapistLogin() {
        // Simple redirect to login for now
        window.location.href = `/login.html?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    }

    function showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            max-width: 300px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    function showLoading(message) {
        console.log('Loading:', message);
    }

    function hideLoading() {
        console.log('Loading complete');
    }

    function showError(message) {
        showNotification(message, 'error');
    }

    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', init);
})();
