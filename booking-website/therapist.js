// Therapist Portal JavaScript - MongoDB Auth Enabled
(function() {
    const isLocal = ['localhost','127.0.0.1'].some(h => location.hostname.startsWith(h));
    const pwaBackendApi = 'https://ava-solutions-marketing.netlify.app/api'; // Marketing Website API (unified backend) 
    const apiBase = () => isLocal ? 'http://localhost:4000/api' : pwaBackendApi;

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
        console.log('🔐 Loading therapist authentication...');
        
        // Check URL parameters first (direct link from main app)
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const therapistId = params.get('therapistId');
        const therapistName = params.get('name');
        const therapistEmail = params.get('email');

        if (token && (therapistId || therapistName || therapistEmail)) {
            console.log('📱 Auth from URL parameters');
            
            // Validate the token with MongoDB backend
            const userData = await validateTherapistToken(token);
            if (userData) {
                currentTherapist = {
                    token: token,
                    id: userData.id,
                    name: userData.firstName + ' ' + userData.lastName,
                    email: userData.email,
                    role: userData.role,
                    permissions: userData.permissions,
                    therapistDetails: userData.therapistDetails
                };
                
                // Store for future sessions
                localStorage.setItem('therapistAuth', JSON.stringify(currentTherapist));
                
                // Clean up URL
                const cleanUrl = location.pathname;
                history.replaceState({}, document.title, cleanUrl);
                
                console.log('✅ Therapist authenticated from URL:', currentTherapist.email);
                return;
            }
        }

        // Check stored authentication
        const stored = localStorage.getItem('therapistAuth');
        if (stored) {
            try {
                currentTherapist = JSON.parse(stored);
                
                // Validate stored token
                const userData = await validateTherapistToken(currentTherapist.token);
                if (userData) {
                    // Update with latest user data
                    currentTherapist.permissions = userData.permissions;
                    currentTherapist.therapistDetails = userData.therapistDetails;
                    localStorage.setItem('therapistAuth', JSON.stringify(currentTherapist));
                    console.log('✅ Therapist session restored:', currentTherapist.email);
                    return;
                } else {
                    console.warn('❌ Stored token invalid, clearing session');
                    localStorage.removeItem('therapistAuth');
                    currentTherapist = null;
                }
            } catch (e) {
                console.error('Error parsing stored auth:', e);
                localStorage.removeItem('therapistAuth');
                currentTherapist = null;
            }
        }

        console.log('❌ No valid therapist authentication found');
    }

    async function validateTherapistToken(token) {
        try {
            console.log('🔍 Validating therapist token with MongoDB backend...');
            
            const response = await fetch(`${apiBase()}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.valid && data.user) {
                    // Check if user is actually a therapist
                    if (data.user.role === 'therapist') {
                        console.log('✅ Valid therapist token:', data.user.email);
                        return data.user;
                    } else {
                        console.warn('❌ User is not a therapist, role:', data.user.role);
                        return null;
                    }
                }
            }
            
            console.warn('❌ Token validation failed');
            return null;
        } catch (error) {
            console.error('❌ Token validation error:', error);
            return null;
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
        console.log('🔐 Redirecting to therapist login...');
        
        // Create a simple login form for therapists
        showTherapistLoginModal();
    }

    function showTherapistLoginModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('therapistLoginModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create login modal
        const modal = document.createElement('div');
        modal.id = 'therapistLoginModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                max-width: 400px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2 style="margin: 0 0 0.5rem 0; color: #333;">
                        <i class="fas fa-user-md" style="color: #667eea; margin-right: 0.5rem;"></i>
                        Therapist Login
                    </h2>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">
                        Access your personalized therapist portal
                    </p>
                </div>

                <form id="therapistLoginForm" style="margin-bottom: 1rem;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Email</label>
                        <input type="email" id="therapistEmail" required
                               placeholder="your.email@spa.com"
                               style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box;">
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333;">Password</label>
                        <input type="password" id="therapistPassword" required
                               placeholder="Your password"
                               style="width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px; font-size: 1rem; box-sizing: border-box;">
                    </div>

                    <button type="submit" id="therapistLoginBtn" 
                            style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-bottom: 1rem;">
                        <i class="fas fa-sign-in-alt"></i> Sign In as Therapist
                    </button>
                </form>

                <div id="therapistLoginError" style="display: none; background: #fee; color: #c33; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem;"></div>

                <div style="text-align: center; font-size: 0.85rem; color: #666; margin-top: 1rem;">
                    Don't have an account? Contact your spa manager.
                </div>

                <button onclick="closeTherapistLoginModal()" 
                        style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5rem; color: #999; cursor: pointer;">
                    ×
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        const form = document.getElementById('therapistLoginForm');
        form.addEventListener('submit', handleTherapistLogin);

        // Focus email input
        setTimeout(() => {
            document.getElementById('therapistEmail').focus();
        }, 100);

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeTherapistLoginModal();
            }
        });
    }

    async function handleTherapistLogin(event) {
        event.preventDefault();
        console.log('🔐 Processing therapist login...');

        const email = document.getElementById('therapistEmail').value.trim();
        const password = document.getElementById('therapistPassword').value;
        const errorDiv = document.getElementById('therapistLoginError');
        const loginBtn = document.getElementById('therapistLoginBtn');

        // Clear previous errors
        errorDiv.style.display = 'none';

        if (!email || !password) {
            showTherapistError('Please enter both email and password');
            return;
        }

        // Set loading state
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

        try {
            const response = await fetch(`${apiBase()}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success && data.user) {
                // Check if user is a therapist
                if (data.user.role === 'therapist') {
                    // Store therapist data
                    currentTherapist = {
                        token: data.token,
                        id: data.user.id,
                        name: `${data.user.firstName} ${data.user.lastName}`,
                        email: data.user.email,
                        role: data.user.role,
                        permissions: data.user.permissions,
                        therapistDetails: data.user.therapistDetails
                    };

                    localStorage.setItem('therapistAuth', JSON.stringify(currentTherapist));

                    // Close modal and initialize portal
                    closeTherapistLoginModal();
                    
                    // Reload the portal with authenticated user
                    await setupUI();
                    await setupEventListeners();
                    await loadTherapistData();

                    showNotification(`Welcome back, ${data.user.firstName}!`, 'success');
                    console.log('✅ Therapist login successful');
                } else {
                    showTherapistError(`Access denied. Your account role is "${data.user.role}". Only therapist accounts can access this portal.`);
                }
            } else {
                showTherapistError(data.error || 'Login failed. Please check your credentials.');
            }

        } catch (error) {
            console.error('❌ Therapist login error:', error);
            showTherapistError('Connection failed. Please check your network and try again.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Therapist';
        }
    }

    function showTherapistError(message) {
        const errorDiv = document.getElementById('therapistLoginError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    window.closeTherapistLoginModal = function() {
        const modal = document.getElementById('therapistLoginModal');
        if (modal) {
            modal.remove();
        }
    };

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
