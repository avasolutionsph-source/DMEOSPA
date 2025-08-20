// SIMPLE LOGIN - ENABLED - Direct API Connection
// Bypasses all existing auth complexity for reliable login

class SimpleLogin {
    constructor() {
        // Try edge function first, then fallback to regular API
        this.edgeApiUrl = 'https://ava-solutions-marketing.netlify.app/api/edge';
        this.apiUrl = 'https://ava-solutions-marketing.netlify.app/api';
        this.isLoggedIn = false;
        this.currentUser = null;
        this.authToken = null;
        
        console.log('🔑 Simple Login System initialized with Edge Functions');
    }

    // Create and show simple login modal
    showLoginModal() {
        // Remove any existing modal
        const existingModal = document.getElementById('simpleLoginModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create new modal
        const modal = document.createElement('div');
        modal.id = 'simpleLoginModal';
        modal.innerHTML = `
            <div style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.8); display: flex; align-items: center;
                justify-content: center; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: white; padding: 30px; border-radius: 12px;
                    max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #333; font-size: 24px;">Quick Login</h2>
                        <button onclick="document.getElementById('simpleLoginModal').remove()" style="
                            background: none; border: none; font-size: 24px; cursor: pointer; color: #666;
                        ">&times;</button>
                    </div>
                    
                    <div id="simpleLoginError" style="
                        background: #fee; color: #c33; padding: 10px; border-radius: 6px; 
                        margin-bottom: 15px; display: none; font-size: 14px;
                    "></div>
                    
                    <form id="simpleLoginForm" style="display: flex; flex-direction: column; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">Email:</label>
                            <input type="email" id="simpleEmail" required style="
                                width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px;
                                font-size: 16px; box-sizing: border-box;
                            " placeholder="Enter your email">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">Password:</label>
                            <input type="password" id="simplePassword" required style="
                                width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px;
                                font-size: 16px; box-sizing: border-box;
                            " placeholder="Enter your password">
                        </div>
                        
                        <button type="submit" id="simpleLoginBtn" style="
                            background: #007cba; color: white; padding: 12px 20px; border: none;
                            border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;
                            transition: background 0.2s;
                        ">
                            <span id="simpleLoginText">Sign In</span>
                            <span id="simpleLoginLoading" style="display: none;">
                                <span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Signing in...
                            </span>
                        </button>
                    </form>
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
                        <small style="color: #666;">Use your registered email and password</small>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

        document.body.appendChild(modal);

        // Add form submission handler
        document.getElementById('simpleLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.performLogin();
        });

        // Focus email field
        document.getElementById('simpleEmail').focus();
    }

    // Perform login with direct API call
    async performLogin() {
        const email = document.getElementById('simpleEmail').value.trim();
        const password = document.getElementById('simplePassword').value;
        const errorDiv = document.getElementById('simpleLoginError');
        const loginBtn = document.getElementById('simpleLoginBtn');
        const loginText = document.getElementById('simpleLoginText');
        const loginLoading = document.getElementById('simpleLoginLoading');

        // Clear previous errors
        errorDiv.style.display = 'none';

        // Validate inputs
        if (!email || !password) {
            this.showError('Please enter both email and password');
            return;
        }

        // ADVANCED DEBUGGING - Check environment
        console.log('🔍 ADVANCED DEBUG: Login Environment Check');
        console.log('📍 Current URL:', window.location.href);
        console.log('🌐 Navigator online:', navigator.onLine);
        console.log('🏠 Origin:', window.location.origin);
        console.log('🎯 Target API URL:', this.apiUrl);
        console.log('📡 Connection status:', document.getElementById('connectionStatus')?.textContent);
        
        // Check if service worker is intercepting
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('🔧 Service Worker active:', navigator.serviceWorker.controller.scriptURL);
        } else {
            console.log('🔧 No active Service Worker');
        }

        // Check offline mode settings
        const isOfflineMode = localStorage.getItem('offlineMode') === 'true';
        console.log('📱 Offline mode enabled:', isOfflineMode);
        
        // Check if any cache interceptors exist
        if (window.caches) {
            const cacheNames = await caches.keys();
            console.log('💾 Available caches:', cacheNames);
        }

        // Show loading state
        loginBtn.disabled = true;
        loginText.style.display = 'none';
        loginLoading.style.display = 'inline';

        try {
            console.log('🔑 Simple Login: Attempting login for:', email);
            console.log('🔑 Using API URL:', this.apiUrl);

            // Force online mode for login
            if (isOfflineMode) {
                console.log('⚠️ Temporarily disabling offline mode for login');
                localStorage.setItem('offlineMode', 'false');
            }

            // Create request with detailed logging - Try Edge Function first
            const requestUrl = `${this.edgeApiUrl}/auth/login`;
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': window.location.origin,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                cache: 'no-cache',
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            };

            console.log('📤 Request URL:', requestUrl);
            console.log('📤 Request options:', requestOptions);

            // Test basic connectivity first
            console.log('🔍 Testing basic connectivity...');
            try {
                const testResponse = await fetch('https://httpbin.org/get', { 
                    method: 'GET',
                    cache: 'no-cache'
                });
                console.log('✅ Basic connectivity test:', testResponse.ok ? 'PASSED' : 'FAILED');
            } catch (testError) {
                console.log('❌ Basic connectivity test FAILED:', testError.message);
            }

            // Direct API call with comprehensive error handling
            console.log('🚀 Making API call...');
            const response = await fetch(requestUrl, requestOptions);

            console.log('📥 Response received:');
            console.log('📥 Status:', response.status);
            console.log('📥 Status text:', response.statusText);
            console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));
            console.log('📥 URL:', response.url);
            console.log('📥 Type:', response.type);

            const data = await response.json();
            console.log('📥 Response data:', data);

            if (response.ok && data.success && data.token) {
                // Success! Store auth data
                this.authToken = data.token;
                this.currentUser = data.user;
                this.isLoggedIn = true;

                // Store in localStorage with both old and new keys for compatibility
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('auth_user', JSON.stringify(data.user));
                localStorage.setItem('userToken', data.token); // Fallback for old system
                localStorage.setItem('userData', JSON.stringify(data.user)); // Fallback for old system
                localStorage.setItem('isLoggedIn', 'true');

                console.log('✅ Simple Login: Login successful for:', data.user.email);

                // Update UI
                this.updateLoginUI(data.user);

                // Close modal
                document.getElementById('simpleLoginModal').remove();

                // Show success message
                this.showSuccessMessage(data.user);

                // Reload page to ensure all systems recognize the login
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } else {
                // Login failed
                const errorMsg = data.error || data.message || 'Login failed. Please check your credentials.';
                console.error('🔑 Simple Login failed:', errorMsg);
                this.showError(errorMsg);
            }

        } catch (error) {
            console.error('❌ DETAILED ERROR ANALYSIS:');
            console.error('❌ Error type:', error.constructor.name);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            
            // Analyze specific error types
            let errorMessage = 'Connection failed. ';
            let debugInfo = '';
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage += 'Network request blocked. ';
                debugInfo = 'This could be: 1) Service Worker interference, 2) CORS policy, 3) Offline mode, 4) Ad blocker';
                
                // Try to diagnose further
                if (!navigator.onLine) {
                    errorMessage += 'Device appears offline. ';
                }
                
                // Check if service worker is interfering
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    errorMessage += 'Service Worker may be blocking request. ';
                    debugInfo += ' | Service Worker URL: ' + navigator.serviceWorker.controller.scriptURL;
                }
                
            } else if (error.message.includes('CORS')) {
                errorMessage += 'Cross-origin request blocked. ';
                debugInfo = 'CORS policy preventing access to API endpoint';
            } else if (error.message.includes('timeout')) {
                errorMessage += 'Request timed out. ';
                debugInfo = 'Server may be slow or unavailable';
            }
            
            console.error('❌ Analysis:', debugInfo);
            
            // Try alternative approaches
            await this.tryAlternativeLogin(email, password, errorMessage);
            
        } finally {
            // Reset button state
            loginBtn.disabled = false;
            loginText.style.display = 'inline';
            loginLoading.style.display = 'none';
            
            // Restore offline mode if it was enabled
            const wasOfflineMode = localStorage.getItem('wasOfflineMode') === 'true';
            if (wasOfflineMode) {
                localStorage.setItem('offlineMode', 'true');
                localStorage.removeItem('wasOfflineMode');
            }
        }
    }

    // Try alternative login methods
    async tryAlternativeLogin(email, password, originalError) {
        console.log('🔄 Attempting alternative login methods...');
        
        const alternatives = [
            // Try Edge Function FIRST - most reliable
            async () => {
                console.log('🔄 Method 1: Trying Netlify Edge Function...');
                return await fetch(`${this.edgeApiUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
            },
            // Try without cache headers
            async () => {
                console.log('🔄 Method 2: Trying regular API without cache headers...');
                return await fetch(`${this.apiUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
            },
            // Try with different endpoint
            async () => {
                console.log('🔄 Method 3: Trying direct function endpoint...');
                return await fetch('https://ava-solutions-marketing.netlify.app/.netlify/functions/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
            },
            // Try JSONP-style approach
            async () => {
                console.log('🔄 Method 4: Trying with no-cors mode...');
                return await fetch(`${this.apiUrl}/auth/login`, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
            }
        ];

        for (let i = 0; i < alternatives.length; i++) {
            try {
                console.log(`🔄 Alternative method ${i + 1}...`);
                const response = await alternatives[i]();
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Alternative method ${i + 1} SUCCESS!`);
                    
                    if (data.success && data.token) {
                        this.handleSuccessfulLogin(data);
                        return;
                    }
                }
            } catch (altError) {
                console.log(`❌ Alternative method ${i + 1} failed:`, altError.message);
            }
        }
        
        // All alternatives failed
        this.showError(originalError + ' All alternative methods failed. Check console for details.');
    }

    // Handle successful login (extracted for reuse)
    handleSuccessfulLogin(data) {
        this.authToken = data.token;
        this.currentUser = data.user;
        this.isLoggedIn = true;

        // Store in localStorage with both old and new keys for compatibility
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');

        console.log('✅ Simple Login: Login successful for:', data.user.email);

        // Update UI
        this.updateLoginUI(data.user);

        // Close modal
        document.getElementById('simpleLoginModal').remove();

        // Show success message
        this.showSuccessMessage(data.user);

        // Reload page to ensure all systems recognize the login
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }

    // Show error message
    showError(message) {
        const errorDiv = document.getElementById('simpleLoginError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    // Update UI after successful login
    updateLoginUI(user) {
        // Hide both login buttons
        const showLoginBtn = document.getElementById('showLoginBtn');
        const simpleLoginBtn = document.getElementById('simpleLoginBtn');
        if (showLoginBtn) showLoginBtn.style.display = 'none';
        if (simpleLoginBtn) simpleLoginBtn.style.display = 'none';

        // Show user info
        const userInfo = document.getElementById('userInfo');
        if (userInfo) userInfo.style.display = 'block';

        // Update user name
        const userName = document.getElementById('userName');
        if (userName) {
            const displayName = user.businessName || user.firstName || user.email.split('@')[0];
            userName.textContent = displayName;
        }
    }

    // Show success message
    showSuccessMessage(user) {
        const displayName = user.businessName || user.firstName || user.email.split('@')[0];
        
        // Create success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 100000;
            background: #4caf50; color: white; padding: 15px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 500; max-width: 300px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">✅</span>
                <div>
                    <div>Login Successful!</div>
                    <div style="font-size: 14px; opacity: 0.9;">Welcome back, ${displayName}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Create global instance
window.simpleLogin = new SimpleLogin();

// WORKING SIMPLE LOGIN SYSTEM
(function() {
    console.log('🔑 SIMPLE LOGIN ENABLED - Creating reliable login button');
    return; // Skip the old disabled code below
    
    // Remove the broken modal completely
    function removeModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.remove();
            console.log('✅ Removed broken modal');
        }
        document.body.classList.remove('modal-open');
    }

    // Create simple inline login form
    function createSimpleLoginForm() {
        const sidebar = document.querySelector('.sidebar');
        const authIndicator = document.getElementById('authIndicator');
        
        if (authIndicator) {
            authIndicator.innerHTML = `
                <div id="simpleLoginForm" style="background: white; padding: 1rem; border-radius: 8px; margin: 1rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 1rem 0; color: #333;">Quick Login</h4>
                    <input type="email" id="simpleEmail" placeholder="Your email" 
                           style="width: 100%; padding: 0.5rem; margin: 0.25rem 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <input type="password" id="simplePassword" placeholder="Password" 
                           style="width: 100%; padding: 0.5rem; margin: 0.25rem 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <button id="simpleLoginBtn" onclick="simpleLogin()" 
                            style="width: 100%; padding: 0.75rem; margin: 0.5rem 0; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        LOGIN
                    </button>
                    <div style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">
                        Any email + password creates account<br>
                        <strong>Quick test:</strong> test@spa.com / test123
                    </div>
                </div>
                <div id="userInfo" style="display: none;" class="user-info">
                    <span id="userName">User</span>
                    <button id="logoutBtn" onclick="simpleLogout()" class="btn btn-secondary">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            `;
            
            console.log('✅ Simple login form created');
        }
    }

    // Simple login function
    window.simpleLogin = function() {
        const email = document.getElementById('simpleEmail')?.value?.trim();
        const password = document.getElementById('simplePassword')?.value?.trim();
        
        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        console.log('🔥 Simple login for:', email);
        
        // Determine role from email
        let role = 'owner';
        if (email.toLowerCase().includes('therapist')) role = 'therapist';
        else if (email.toLowerCase().includes('manager')) role = 'manager';
        else if (email.toLowerCase().includes('reception')) role = 'receptionist';
        
        // Create user
        const user = {
            id: `simple_${Date.now()}`,
            email: email,
            role: role,
            firstName: email.split('@')[0],
            lastName: 'User',
            businessName: 'Your Spa Business'
        };

        // Set session
        localStorage.setItem('simple_user', JSON.stringify(user));
        localStorage.setItem('simple_token', `token_${Date.now()}`);
        localStorage.setItem('isLoggedIn', 'true');
        
        // Update UI immediately
        updateUIForUser(user);
        
        alert(`Welcome ${user.firstName}! Logged in as ${role}`);
        console.log('✅ Simple login successful');
    };

    // Simple logout
    window.simpleLogout = function() {
        localStorage.removeItem('simple_user');
        localStorage.removeItem('simple_token');
        localStorage.removeItem('isLoggedIn');
        
        // Reset UI
        const simpleForm = document.getElementById('simpleLoginForm');
        const userInfo = document.getElementById('userInfo');
        
        if (simpleForm) simpleForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        
        // Show all navigation (reset)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.style.display = '';
        });
        
        const businessName = document.getElementById('businessName');
        if (businessName) businessName.textContent = 'Ava Solutions';
        
        console.log('✅ Simple logout complete');
    };

    // Update UI for logged in user
    function updateUIForUser(user) {
        console.log('🎨 Updating UI for:', user.email, 'Role:', user.role);
        
        // Hide login form, show user info
        const simpleForm = document.getElementById('simpleLoginForm');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const businessName = document.getElementById('businessName');
        
        if (simpleForm) simpleForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (userName) userName.textContent = user.firstName;
        if (businessName) businessName.textContent = user.businessName;
        
        // Update navigation based on role
        const permissions = {
            owner: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'chatbot', 'settings'],
            manager: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'settings'],
            therapist: ['dashboard', 'bookings', 'settings', 'timer', 'therapist-portal'],
            receptionist: ['dashboard', 'pos', 'bookings', 'rooms', 'settings']
        };

        const allowed = permissions[user.role] || permissions.owner;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            if (allowed.includes(page)) {
                item.style.display = '';
                console.log(`✅ Showing ${page} for ${user.role}`);
            } else {
                item.style.display = 'none';
                console.log(`🚫 Hiding ${page} for ${user.role}`);
            }
        });

        // Show therapist portal for therapists
        const therapistNav = document.getElementById('therapistPortalNav');
        if (therapistNav) {
            therapistNav.style.display = user.role === 'therapist' ? '' : 'none';
        }
        
        console.log('✅ UI updated successfully');
    }

    // Check for existing session on load
    function checkExistingSession() {
        const storedUser = localStorage.getItem('simple_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                console.log('🔄 Restoring simple session for:', user.email);
                updateUIForUser(user);
            } catch (e) {
                console.warn('Could not restore simple session:', e);
            }
        }
    }

    // Initialize
    setTimeout(() => {
        removeModal();
        createSimpleLoginForm();
        checkExistingSession();
    }, 1000);

    console.log('🔥 SIMPLE LOGIN READY - no modal required!');
})();
