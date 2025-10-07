// Authentication and User Management System

// Simple utility functions with conditional logging
function logDebug(msg, data) { 
    if (window.API_CONFIG?.log) {
        window.API_CONFIG.log('debug', msg, { category: 'AUTH', ...data });
    } else {
        console.log('[DEBUG]', msg, data);
    }
}
function logInfo(msg, data) { 
    if (window.API_CONFIG?.log) {
        window.API_CONFIG.log('info', msg, { category: 'AUTH', ...data });
    } else {
        console.log('[INFO]', msg, data);
    }
}
function logError(msg, data) { 
    if (window.API_CONFIG?.log) {
        window.API_CONFIG.log('error', msg, { category: 'AUTH', ...data });
    } else {
        console.error('[ERROR]', msg, data);
    }
}
function logWarn(msg, data) { 
    if (window.API_CONFIG?.log) {
        window.API_CONFIG.log('warn', msg, { category: 'AUTH', ...data });
    } else {
        console.warn('[WARN]', msg, data);
    }
}
function showSuccess(msg) { alert('✅ ' + msg); }
function showError(msg) { alert('❌ ' + msg); }
function showWarning(msg) { alert('⚠️ ' + msg); }
function showInfo(msg) { alert('ℹ️ ' + msg); }
function safeAsyncOperation(fn) { return fn(); }
function withErrorHandling(fn, config) { 
    try { 
        return Promise.resolve(fn()); 
    } catch(e) { 
        logError(config.operation, { error: e.message, stack: e.stack }); 
        throw e; 
    } 
}
const ErrorTypes = { AUTHENTICATION: 'auth', NETWORK: 'network' };

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;
        this.serverUrl = null; // Will be set from settings
    }

    async init() {
        // Update initialization state
        if (window.initState) {
            window.initState.auth = 'initializing';
        }
        
        const startTime = Date.now();
        
        try {
            // Load saved authentication state
            await this.loadAuthState();
            
            // Check if user is already logged in
            if (this.authToken && this.currentUser) {
                // PERFORMANCE FIX: Assume user is logged in immediately, validate in background
                this.isLoggedIn = true;
                
                // Validate session in background without blocking PWA startup
                // INCREASED DELAY: Give more time for login process to complete fully
                setTimeout(() => {
                    this.validateSessionWithRetry().catch(() => {
                        // Keep user logged in even if validation fails  
                        console.log('Background session validation failed after retries, keeping user logged in');
                    });
                }, 3000); // Increased from 1000ms to 3000ms for better stability
            }
            
            this.setupEventListeners();
            
            // Update UI to show correct auth state
            this.updateAuthUI();
            
            // Update menu based on role if logged in
            if (this.isLoggedIn) {
                this.updateMenuForRole();
            }
            
            // Update initialization state
            if (window.initState) {
                window.initState.auth = 'ready';
                window.initState.authInitTime = Date.now() - startTime;
                console.log(`✅ Auth system initialized in ${window.initState.authInitTime}ms`);
            }
        } catch (error) {
            if (window.initState) {
                window.initState.auth = 'failed';
            }
            console.error('Auth initialization failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Login form - DISABLED: Using HTML inline handler instead
        // const loginForm = document.getElementById('loginForm');
        // if (loginForm) {
        //     loginForm.addEventListener('submit', (e) => {
        //         e.preventDefault();
        //         this.handleLogin();
        //     });
        // }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Switch between login/register
        const showRegisterBtn = document.getElementById('showRegister');
        const showLoginBtn = document.getElementById('showLogin');
        
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }
        
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Main login button (in sidebar)
        this.attachMainLoginButton();
    }

    // Attach event listener to main login button
    attachMainLoginButton() {
        logDebug('Auth.js login button handler disabled - using direct modal instead', {
            category: 'AUTH',
            operation: 'disabled_handler'
        });
        
        // Continue with login button setup
        const mainLoginBtn = document.getElementById('showLoginBtn');
        if (mainLoginBtn) {
            logDebug('Attaching click event to login button', {
                category: 'AUTH',
                operation: 'attach_login_handler'
            });
            
            // Remove any existing event listeners
            mainLoginBtn.replaceWith(mainLoginBtn.cloneNode(true));
            const newBtn = document.getElementById('showLoginBtn');
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                logDebug('Login button clicked', {
                    category: 'AUTH',
                    operation: 'login_button_click'
                });
                
                // Use showLoginModal directly since it's defined in HTML
                if (typeof showLoginModal === 'function') {
                    showLoginModal();
                } else {
                    logError('showLoginModal function not available', {
                        category: 'AUTH',
                        operation: 'login_modal_missing'
                    });
                }
            });
        }
    }

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
    }

    // Redirect to login page instead of showing modal
    showLoginModal() {
        logInfo('AuthSystem.showLoginModal called - redirecting to login.html', {
            category: 'AUTH',
            operation: 'redirect_to_login'
        });
        
        // Save current page to return after login
        const currentHash = window.location.hash;
        if (currentHash && currentHash !== '#login') {
            sessionStorage.setItem('returnToPage', currentHash);
        }
        
        // Redirect to login page
        window.location.href = 'login.html';
    }

    showRegisterForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
    }

    // Handle user login (owner or employee) with auto-detection
    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            showError('Please enter email and password');
            return;
        }

        setButtonLoading('loginBtn', true);

        try {
            // Use unified backend URL from API_CONFIG
            const serverUrl = window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com';
            
            // Auto-detection: Try owner login first, then employee if it fails
            console.log('🔐 Attempting auto-detection login for:', email);
            
            // First try branch owner login
            console.log('1️⃣ Trying OWNER login endpoint...');
            let response = await fetch(`${serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            let data = await response.json();
            console.log('   Owner login response:', data);
            
            // If owner login failed with invalid credentials, try employee login
            if (!data.success && (data.error === 'Invalid email or password' || data.error === 'Invalid credentials')) {
                console.log('2️⃣ Owner login failed, trying EMPLOYEE login endpoint...');
                
                response = await fetch(`${serverUrl}/api/auth/employee/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                data = await response.json();
                console.log('   Employee login response:', data);
            }

            if (response.ok && data.success && data.token) {
                console.log('✅ LOGIN SUCCESSFUL!');
                console.log('   User type:', data.user.type || 'owner');
                console.log('   User email:', data.user.email);
                console.log('   User role:', data.user.role);
                console.log('   Current pathname:', window.location.pathname);
                
                // Check if we're on the login page (handle various URL patterns)
                const isLoginPage = window.location.pathname.includes('login.html') || 
                                   window.location.pathname.endsWith('/login') ||
                                   window.location.pathname === '/' ||
                                   !window.location.pathname.includes('index.html');
                
                console.log('   Is login page?', isLoginPage);
                
                if (isLoginPage) {
                    // Show success message
                    if (window.showSuccess) {
                        window.showSuccess('Login successful! Redirecting...');
                    }
                    
                    setTimeout(() => {
                        const returnTo = sessionStorage.getItem('returnToPage');
                        if (returnTo) {
                            sessionStorage.removeItem('returnToPage');
                            window.location.href = 'index.html' + returnTo;
                        } else {
                            // Redirect based on user type
                            if (data.user.type === 'employee') {
                                window.location.href = 'index.html#attendance';
                            } else {
                                window.location.href = 'index.html#dashboard';
                            }
                        }
                    }, 1500);
                }
                
                // Store authentication
                this.authToken = data.token;
                this.currentUser = data.user;
                this.isLoggedIn = true;

                // Save authentication state
                await this.saveAuthState(rememberMe);

                // Set API client token
                if (window.apiClient) {
                    window.apiClient.setToken(data.token);
                }
                
                // Set API_CONFIG token
                if (window.API_CONFIG) {
                    window.API_CONFIG.setToken(data.token);
                }
                
                // Update StateManager
                if (window.StateManager && window.StateManager.initialized) {
                    window.StateManager.setState('auth.authToken', data.token);
                    window.StateManager.setState('auth.currentUser', data.user);
                    window.StateManager.setState('auth.isLoggedIn', true);
                }

                // Update entitlements if available
                if (window.entitlementsSystem) {
                    window.entitlementsSystem.loadEntitlements();
                }

                setButtonLoading('loginBtn', false);
                
                // Close modal
                const modal = document.getElementById('authModal');
                if (modal) modal.style.display = 'none';

                showSuccess(`Welcome back to Daet Massage and Spa, ${data.user.firstName}!`);
                
                // Update UI
                this.updateAuthUI();
                
                // Update menu based on role
                this.updateMenuForRole();
                
                // Initialize user session
                await this.initializeUserSession();

            } else {
                throw new Error(data.error || data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setButtonLoading('loginBtn', false);
            showError(error.message || 'Login failed. Please try again.');
        }
    }

    // Handle user registration
    async handleRegister() {
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const businessName = document.getElementById('businessName').value.trim();
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const phone = document.getElementById('phone').value.trim();

        // Validation
        if (!email || !password || !businessName || !firstName || !lastName) {
            showError('Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        setButtonLoading('registerBtn', true);

        try {
            // Use unified backend URL from API_CONFIG
            const serverUrl = window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com';
            
            const response = await fetch(`${serverUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    businessName,
                    firstName,
                    lastName,
                    phone
                })
            });

            const data = await response.json();

            if (response.ok && data.success && data.token) {
                // Auto-login after registration
                this.authToken = data.token;
                this.currentUser = data.user;
                this.isLoggedIn = true;

                // Save authentication state
                await this.saveAuthState(true);

                // Set API client token
                if (window.apiClient) {
                    window.apiClient.setToken(data.token);
                }
                
                // Set API_CONFIG token
                if (window.API_CONFIG) {
                    window.API_CONFIG.setToken(data.token);
                }
                
                // Update StateManager
                if (window.StateManager && window.StateManager.initialized) {
                    window.StateManager.setState('auth.authToken', data.token);
                    window.StateManager.setState('auth.currentUser', data.user);
                    window.StateManager.setState('auth.isLoggedIn', true);
                }

                setButtonLoading('registerBtn', false);
                
                // Close modal
                const modal = document.getElementById('authModal');
                if (modal) modal.style.display = 'none';

                showSuccess('Registration successful! Welcome to Ava Solutions!');
                
                // Update UI
                this.updateAuthUI();
                
                // Update menu based on role
                this.updateMenuForRole();
                
                // Initialize user session
                await this.initializeUserSession();

            } else {
                throw new Error(data.error || data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setButtonLoading('registerBtn', false);
            showError(error.message || 'Registration failed. Please try again.');
        }
    }

    // Validate current session
    async validateSession() {
        console.log('🔍 [SESSION-DEBUG] Starting session validation...');
        
        if (!this.authToken) {
            console.log('🔍 [SESSION-DEBUG] No auth token found, skipping validation');
            return false;
        }

        try {
            // Use unified backend URL from API_CONFIG
            const serverUrl = window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com';
            
            console.log('🔍 [SESSION-DEBUG] Validation request details:', {
                serverUrl,
                endpoint: `${serverUrl}/api/auth/verify`,
                tokenLength: this.authToken.length,
                tokenPreview: this.authToken.substring(0, 20) + '...',
                hasCurrentUser: !!this.currentUser,
                userEmail: this.currentUser?.email
            });
            
            const requestStart = Date.now();
            const response = await fetch(`${serverUrl}/api/auth/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const requestTime = Date.now() - requestStart;

            console.log('🔍 [SESSION-DEBUG] Validation response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                requestTime: `${requestTime}ms`,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (response.ok) {
                const data = await response.json();
                console.log('🔍 [SESSION-DEBUG] Validation response data:', {
                    success: data.success,
                    hasUser: !!data.user,
                    userEmail: data.user?.email,
                    userId: data.user?.id
                });
                
                if (data.success) {
                    console.log('✅ [SESSION-DEBUG] Session validation successful');
                    this.currentUser = data.user;
                    this.isLoggedIn = true;
                    return true;
                }
            }

            // Get response text for debugging
            let responseText = '';
            try {
                responseText = await response.text();
            } catch (e) {
                responseText = 'Could not read response text';
            }
            
            console.log('🔍 [SESSION-DEBUG] Validation failed, response text:', responseText);

            // Only logout if we get a clear authentication error (401/403)
            // Don't logout for server errors (404, 500) which might be temporary
            if (response.status === 401 || response.status === 403) {
                console.warn('⚠️ [SESSION-DEBUG] Session expired or invalid (401/403), logging out');
                console.log('🔍 [SESSION-DEBUG] About to trigger logout due to auth failure');
                await this.logout();
                return false;
            } else {
                // For other errors (404, 500), keep user logged in but warn
                console.warn(`⚠️ [SESSION-DEBUG] Session validation failed with status ${response.status}, keeping user logged in`);
                console.log('🔍 [SESSION-DEBUG] Non-auth error - preserving login state');
                // Keep existing user data, just mark as validated for this session
                this.isLoggedIn = true;
                return true;
            }
        } catch (error) {
            console.error('❌ [SESSION-DEBUG] Session validation error:', error);
            // For network errors, keep user logged in
            console.warn('Network error during session validation, keeping user logged in');
            this.isLoggedIn = true;
            return true;
        }
    }

    // Logout user
    async logout() {
        try {
            // Call logout endpoint if available
            if (this.authToken) {
                const serverUrl = window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com';
                await fetch(`${serverUrl}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear auth state
            this.authToken = null;
            this.currentUser = null;
            this.isLoggedIn = false;

            // Clear stored auth
            await this.clearAuthState();

            // Clear API client token
            if (window.apiClient) {
                window.apiClient.clearToken();
            }
            
            // Clear API_CONFIG token
            if (window.API_CONFIG) {
                window.API_CONFIG.clearToken();
            }
            
            // Clear StateManager
            if (window.StateManager && window.StateManager.initialized) {
                window.StateManager.setState('auth.authToken', null);
                window.StateManager.setState('auth.currentUser', null);
                window.StateManager.setState('auth.isLoggedIn', false);
            }

            // Update UI
            this.updateAuthUI();

            // Redirect to login page
            console.log('🔄 Redirecting to login page...');
            window.location.href = '/login.html';
        }
    }

    // Validate session with retry logic for better reliability
    async validateSessionWithRetry(maxRetries = 2) {
        console.log('🔍 [SESSION-DEBUG] Starting session validation with retry logic');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔍 [SESSION-DEBUG] Validation attempt ${attempt}/${maxRetries}`);
            
            try {
                const result = await this.validateSession();
                if (result) {
                    console.log('✅ [SESSION-DEBUG] Session validation successful on attempt', attempt);
                    return true;
                }
                
                // If validation failed, check if we should retry
                if (attempt < maxRetries) {
                    console.log(`🔍 [SESSION-DEBUG] Validation failed, retrying in 2 seconds... (attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    console.log('⚠️ [SESSION-DEBUG] All validation attempts failed, but keeping user logged in');
                    // Don't logout on validation failure - keep user logged in
                    this.isLoggedIn = true;
                    return false;
                }
            } catch (error) {
                console.error(`❌ [SESSION-DEBUG] Validation attempt ${attempt} error:`, error);
                if (attempt < maxRetries) {
                    console.log(`🔍 [SESSION-DEBUG] Retrying due to error... (attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    console.log('⚠️ [SESSION-DEBUG] All validation attempts failed with errors, keeping user logged in');
                    // Don't logout on network errors - keep user logged in
                    this.isLoggedIn = true;
                    return false;
                }
            }
        }
        
        return false;
    }

    // Save authentication state
    async saveAuthState(rememberMe = true) {
        // Always save to localStorage for better persistence in PWA
        localStorage.setItem('authToken', this.authToken);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
        
        // Also save to sessionStorage as backup
        sessionStorage.setItem('authToken', this.authToken);
        sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        sessionStorage.setItem('isLoggedIn', 'true');
    }

    // Load authentication state
    async loadAuthState() {
        console.log('🔄 Loading auth state...');
        
        // Check both storages
        let authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        let currentUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        let isLoggedIn = localStorage.getItem('isLoggedIn') || sessionStorage.getItem('isLoggedIn');
        let demoMode = localStorage.getItem('demoMode') || sessionStorage.getItem('demoMode');
        
        console.log('📁 Auth state found:', {
            hasToken: !!authToken,
            hasUser: !!currentUser,
            isLoggedIn: isLoggedIn === 'true',
            demoMode: demoMode === 'true',
            tokenPreview: authToken ? authToken.substring(0, 10) + '...' : null
        });
        
        if (authToken && currentUser && isLoggedIn === 'true') {
            try {
                // Check if token is expired before using it
                if (this.isTokenExpired(authToken)) {
                    console.log('🔐 Token expired, clearing auth state');
                    this.logout();
                    return;
                }
                
                this.authToken = authToken;
                // PERFORMANCE: Cache parsed user to avoid repeated JSON.parse
                if (!this._cachedUser || this._cachedUserString !== currentUser) {
                    this.currentUser = JSON.parse(currentUser);
                    this._cachedUser = this.currentUser;
                    this._cachedUserString = currentUser;
                } else {
                    this.currentUser = this._cachedUser;
                }
                this.isLoggedIn = true;
                
                console.log('✅ Auth state restored:', {
                    user: this.currentUser?.firstName || 'Daet Spa User',
                    tokenLength: authToken.length,
                    userObject: this.currentUser
                });
                
                // Set API client token
                if (window.apiClient) {
                    window.apiClient.setToken(authToken);
                }
                
                // Set API_CONFIG token
                if (window.API_CONFIG) {
                    window.API_CONFIG.setToken(authToken);
                }
                
                // Update StateManager
                if (window.StateManager && window.StateManager.initialized) {
                    window.StateManager.setState('auth.authToken', authToken);
                    window.StateManager.setState('auth.currentUser', this.currentUser);
                    window.StateManager.setState('auth.isLoggedIn', true);
                }
            } catch (error) {
                console.error('❌ Failed to restore auth state:', error);
                // Clear corrupted data
                await this.clearAuthState();
            }
        } else {
            console.log('ℹ️ No valid auth state found');
        }
    }

    // Check if JWT token is expired
    isTokenExpired(token) {
        if (!token) return true;
        
        try {
            // Decode JWT payload (second part after split by '.')
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // Check if token has expiry time and if it's expired
            if (payload.exp) {
                const currentTime = Date.now() / 1000; // Convert to seconds
                return payload.exp < currentTime;
            }
            
            // If no expiry time, consider it valid
            return false;
        } catch (error) {
            console.warn('🔐 Invalid token format, treating as expired:', error);
            return true; // If can't decode, treat as expired
        }
    }

    // Clear authentication state
    async clearAuthState() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');
    }

    // Update UI based on auth state
    updateAuthUI() {
        const loginBtn = document.getElementById('showLoginBtn');
        const userInfo = document.getElementById('userInfo');
        const businessNameElement = document.getElementById('businessName');
        const userMenuTrigger = document.querySelector('.user-menu-trigger');
        
        if (this.isLoggedIn && this.currentUser) {
            // Hide login button
            if (loginBtn) loginBtn.style.display = 'none';
            
            // Show user info
            if (userInfo) {
                userInfo.style.display = 'block';
                
                // Get saved profile image from localStorage
                const savedProfileImage = localStorage.getItem('userProfileImage');
                const profileImageHtml = savedProfileImage 
                    ? `<img src="${savedProfileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`
                    : `<i class="fas fa-user" style="color: #4b5563; font-size: 1.25rem;"></i>`;
                
                userInfo.innerHTML = `
                    <div class="user-profile" style="
                        padding: 1rem;
                        text-align: center;
                    ">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: #f3f4f6;
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 0.75rem auto;
                            position: relative;
                            cursor: pointer;
                            overflow: hidden;
                        " id="profileImageContainer" title="Click to upload image">
                            ${profileImageHtml}
                            <input type="file" id="profileImageInput" accept="image/*" style="display: none;">
                        </div>
                        <span class="user-name" style="
                            display: block;
                            color: #ffffff;
                            font-weight: 600;
                            font-size: 0.95rem;
                            margin-bottom: 0.25rem;
                        ">Daet Massage and Spa</span>
                        <button onclick="authSystem.logout()" class="btn-logout" style="
                            background: #1e293b;
                            color: white;
                            border: 1px solid #334155;
                            border-radius: 8px;
                            padding: 0.5rem 1rem;
                            font-size: 0.85rem;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            width: 100%;
                            justify-content: center;
                        " onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                `;
                
                // Add click handler for profile image upload
                const profileImageContainer = document.getElementById('profileImageContainer');
                const profileImageInput = document.getElementById('profileImageInput');
                
                if (profileImageContainer && profileImageInput) {
                    profileImageContainer.addEventListener('click', () => {
                        profileImageInput.click();
                    });
                    
                    profileImageInput.addEventListener('change', (e) => {
                        const file = e.target.files[0];
                        if (file && file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const imageData = e.target.result;
                                localStorage.setItem('userProfileImage', imageData);
                                
                                // Update the image display
                                profileImageContainer.innerHTML = `
                                    <img src="${imageData}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
                                    <input type="file" id="profileImageInput" accept="image/*" style="display: none;">
                                `;
                                
                                // Re-attach the input element
                                const newInput = profileImageContainer.querySelector('#profileImageInput');
                                newInput.addEventListener('change', arguments.callee);
                            };
                            reader.readAsDataURL(file);
                        }
                    });
                }
            }
            
            // Update business name display - hardcoded for Daet Massage and Spa
            if (businessNameElement) {
                businessNameElement.textContent = 'Daet Massage and Spa';
            }
            
            // Show user menu
            if (userMenuTrigger) {
                userMenuTrigger.style.display = 'flex';
            }
        } else {
            // Show login button
            if (loginBtn) loginBtn.style.display = 'block';
            
            // Hide user info
            if (userInfo) userInfo.style.display = 'none';
            
            // Hide user menu
            if (userMenuTrigger) {
                userMenuTrigger.style.display = 'none';
            }
        }
    }

    // Initialize user session after login
    async initializeUserSession() {
        try {
            
            // Load user-specific data
            if (window.syncManager) {
                await window.syncManager.syncAll();
            }
            
            // Load entitlements
            if (window.entitlementsSystem) {
                await window.entitlementsSystem.loadEntitlements();
            }
            
            // Navigate to dashboard if on login page
            if (window.location.pathname === '/login' || window.location.pathname === '/') {
                if (typeof navigateToPage === 'function') {
                    navigateToPage('dashboard');
                }
            }
        } catch (error) {
            console.error('Error initializing user session:', error);
        }
    }

    // Get server URL
    async getServerUrl() {
        // Use unified backend URL from API_CONFIG
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            this.serverUrl = window.API_CONFIG.BASE_URL;
            return this.serverUrl;
        }

        // Default to production unified backend URL
        this.serverUrl = window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com';
        return this.serverUrl;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.isLoggedIn && this.authToken !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get auth token
    getAuthToken() {
        return this.authToken;
    }

    // Update menu based on user role
    updateMenuForRole() {
        // Define what pages each role can access
        const rolePermissions = {
            // Therapist roles can only see their own data - they use payroll-requests instead of payroll
            'senior_therapist': ['appointments', 'attendance', 'payroll', 'rooms'],
            'junior_therapist': ['appointments', 'attendance', 'payroll', 'rooms'],
            'new_therapist': ['appointments', 'attendance', 'payroll', 'rooms'],

            // Receptionist has broader access - also uses payroll-requests
            'receptionist': ['pos', 'products', 'inventory', 'customers', 'appointments', 'attendance', 'payroll', 'rooms', 'expenses'],

            // Manager can read everything - uses full payroll page
            'manager': ['dashboard', 'pos', 'products', 'inventory', 'employees', 'customers',
                       'appointments', 'attendance', 'payroll', 'rooms', 'gift-certificates', 'expenses', 'chatbot', 'settings'],

            // Other staff limited access - uses payroll-requests
            'other_staff': ['attendance', 'payroll']
        };
        
        // Get all menu items
        const menuItems = document.querySelectorAll('.nav-link');
        
        if (!this.currentUser) return;
        
        // If user is an owner (not employee), show everything
        if (this.currentUser.type !== 'employee') {
            menuItems.forEach(item => {
                item.style.display = 'flex';
                if (item.parentElement) {
                    item.parentElement.style.display = 'block';
                }
            });
            return;
        }
        
        // For employees, filter based on role
        const userRole = this.currentUser.role;
        const allowedPages = rolePermissions[userRole] || [];
        
        console.log('🔐 Role-based menu filtering:', {
            user: this.currentUser.email,
            role: userRole,
            type: this.currentUser.type,
            allowedPages: allowedPages
        });
        
        menuItems.forEach(item => {
            const page = item.getAttribute('data-page');
            
            // Check if this page is allowed for the user's role
            if (allowedPages.includes(page)) {
                item.style.display = 'flex';
                if (item.parentElement) {
                    item.parentElement.style.display = 'block';
                }
            } else {
                item.style.display = 'none';
                if (item.parentElement) {
                    item.parentElement.style.display = 'none';
                }
            }
        });
        
        // After filtering, activate the first visible menu item
        const visibleItems = Array.from(menuItems).filter(item => 
            item.style.display !== 'none' && item.getAttribute('data-page') !== 'chatbot'
        );
        
        if (visibleItems.length > 0) {
            // Remove active class from all items
            menuItems.forEach(item => item.classList.remove('active'));
            
            // Set first visible item as active and navigate to it
            const firstPage = visibleItems[0].getAttribute('data-page');
            visibleItems[0].classList.add('active');
            
            // Navigate to the first allowed page
            if (typeof navigateToPage === 'function') {
                setTimeout(() => navigateToPage(firstPage), 100);
            }
        }
    }
    
    // Check if user has permission for a specific page
    hasPagePermission(page) {
        if (!this.currentUser) return false;
        
        // Owners have all permissions
        if (this.currentUser.type !== 'employee') return true;
        
        // Special handling for payroll-requests page - all employees can access
        if (page === 'payroll-requests' && this.currentUser.type === 'employee') {
            return true;
        }
        
        // Define permissions (same as above)
        const rolePermissions = {
            'senior_therapist': ['appointments', 'attendance', 'payroll-requests', 'rooms'],
            'junior_therapist': ['appointments', 'attendance', 'payroll-requests', 'rooms'],
            'new_therapist': ['appointments', 'attendance', 'payroll-requests', 'rooms'],
            'receptionist': ['pos', 'products', 'inventory', 'customers', 'appointments', 'attendance', 'payroll-requests', 'rooms', 'expenses'],
            'manager': ['dashboard', 'pos', 'products', 'inventory', 'employees', 'customers',
                       'appointments', 'attendance', 'payroll', 'rooms', 'gift-certificates', 'expenses', 'chatbot', 'settings'],
            'other_staff': ['attendance', 'payroll-requests']
        };
        
        const userRole = this.currentUser.role;
        const allowedPages = rolePermissions[userRole] || [];
        
        return allowedPages.includes(page);
    }
}

// Initialize auth system
const authSystem = new AuthSystem();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => authSystem.init());
} else {
    authSystem.init();
}

// Export to window
window.authSystem = authSystem;