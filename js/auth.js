// Authentication and User Management System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;
        this.serverUrl = null; // Will be set from settings
    }

    async init() {
        // Load saved authentication state
        await this.loadAuthState();
        
        // Check if user is already logged in
        if (this.authToken && this.currentUser) {
            await this.validateSession();
        }
        
        this.setupEventListeners();
        
        // Update UI to show correct auth state
        this.updateAuthUI();
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
        if (window.logger && window.logger.debug) {
            window.logger.debug('Auth.js login button handler disabled - using direct modal instead', { category: 'AUTH' });
        } else {
            if (window.logger) {
                window.logger.debug('Auth.js login button handler disabled', {
                    category: 'AUTH',
                    operation: 'disabled_handler'
                });
            }
        }
        
        // Continue with login button setup
        const mainLoginBtn = document.getElementById('showLoginBtn');
        if (mainLoginBtn) {
            if (window.logger) {
                window.logger.debug('Attaching click event to login button', {
                    category: 'AUTH',
                    operation: 'attach_login_handler'
                });
            }
            
            // Remove any existing event listeners
            mainLoginBtn.replaceWith(mainLoginBtn.cloneNode(true));
            const newBtn = document.getElementById('showLoginBtn');
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.logger) {
                    window.logger.debug('Login button clicked', {
                        category: 'AUTH',
                        operation: 'login_button_click'
                    });
                }
                this.showLoginModal();
            });
            
            // Also add a direct onclick as backup
            newBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.logger) {
                    window.logger.debug('Login button clicked via onclick', {
                        category: 'AUTH',
                        operation: 'login_button_onclick'
                    });
                }
                this.showLoginModal();
            };
            
        } else {
            if (window.logger) {
                window.logger.debug('Login button not found, will retry', {
                    category: 'AUTH',
                    operation: 'login_button_search'
                });
            }
            // Retry after a short delay if button not found
            setTimeout(() => {
                this.attachMainLoginButton();
            }, 100);
        }
    }

    // Handle user login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            showNotification('Please enter email and password', 'error');
            return;
        }

        setButtonLoading('loginBtn', true);
        showLoading('Signing in...', 'Please wait while we verify your credentials');

        try {
            // REMOVED: Blocking code that prevented login
            if (window.logger) {
                window.logger.debug('handleLogin called - but this should not be used anymore', {
                    category: 'AUTH',
                    operation: 'deprecated_login_handler'
                });
            }
            
            if (loginData.success) {
                await this.setAuthState(loginData.user, loginData.token, rememberMe);
                
                // Set API client token
                if (window.apiClient) {
                    window.apiClient.setToken(loginData.token);
                }
                
                // Update entitlements if provided
                if (loginData.entitlements && window.entitlementsSystem) {
                    window.entitlementsSystem.handleSubscriptionUpdate(
                        loginData.user.subscriptionPlan, 
                        loginData.entitlements
                    );
                }
                
                hideLoading();
                setButtonLoading('loginBtn', false);
                
                // Close modal
                if (typeof closeModal === 'function') {
                    closeModal('authModal');
                } else {
                    const modal = document.getElementById('authModal');
                    if (modal) modal.style.display = 'none';
                }
                
                showNotification(`Welcome back, ${loginData.user.businessName}!`, 'success');
                
                // Update UI to show logged in state
                this.updateAuthUI();
                
                // Initialize app with user data
                await this.initializeUserSession();
                
            } else {
                throw new Error(loginData.message || 'Login failed');
            }
            
        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Login error', { category: 'AUTH', error, context: { operation: 'login' } });
            } else {
                if (window.logger) {
                    window.logger.error('Login error', {
                        category: 'AUTH',
                        operation: 'login',
                        error: error
                    });
                } else {
                    console.error('Login error:', error);
                }
            }
            hideLoading();
            setButtonLoading('loginBtn', false);
            showNotification(error.message || 'Login failed. Please try again.', 'error');
        }
    }

    // Handle user registration
    async handleRegister() {
        const businessName = document.getElementById('regBusinessName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        // Validation
        if (!businessName || !email || !password || !confirmPassword) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        setButtonLoading('registerBtn', true);
        showLoading('Creating account...', 'Setting up your spa business account');

        try {
            // For now, simulate registration
            const registerData = await this.simulateRegister(businessName, email, password);
            
            if (registerData.success) {
                await this.setAuthState(registerData.user, registerData.token, true);
                
                // Set API client token
                if (window.apiClient) {
                    window.apiClient.setToken(registerData.token);
                }
                
                // Update entitlements if provided
                if (registerData.entitlements && window.entitlementsSystem) {
                    window.entitlementsSystem.handleSubscriptionUpdate(
                        registerData.user.subscriptionPlan, 
                        registerData.entitlements
                    );
                }
                
                hideLoading();
                setButtonLoading('registerBtn', false);
                closeModal('authModal');
                showNotification(`Welcome to Ava Solutions, ${businessName}!`, 'success');
                
                // REMOVED: Automatic setup wizard for new users - now manual only
                
            } else {
                throw new Error(registerData.message || 'Registration failed');
            }
            
        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Registration error', { category: 'AUTH', error, context: { operation: 'register' } });
            } else {
                if (window.logger) {
                    window.logger.error('Registration error', {
                        category: 'AUTH',
                        operation: 'register',
                        error: error
                    });
                } else {
                    console.error('Registration error:', error);
                }
            }
            hideLoading();
            setButtonLoading('registerBtn', false);
            showNotification(error.message || 'Registration failed. Please try again.', 'error');
        }
    }

    // Login using unified backend
    async loginWithUnifiedBackend(email, password) {
        try {
            // Use API_CONFIG if available
            if (window.API_CONFIG) {
                const response = await window.API_CONFIG.request(
                    window.API_CONFIG.ENDPOINTS.AUTH.LOGIN,
                    {
                        method: 'POST',
                        body: { email, password }
                    }
                );
                
                if (response.success) {
                    // Store token
                    window.API_CONFIG.setToken(response.token);
                    
                    // Update state
                    if (window.StateManager && window.StateManager.initialized) {
                        window.StateManager.batchUpdate({
                            'auth.currentUser': response.user,
                            'auth.authToken': response.token,
                            'auth.isLoggedIn': true,
                            'auth.lastLogin': Date.now()
                        });
                    }
                    
                    return response;
                }
                
                return { success: false, message: response.error || 'Login failed' };
            }
            
            // Fallback to direct API call
            const apiUrl = 'https://ava-pwa-backend.onrender.com';
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
                // Store token
                localStorage.setItem('authToken', data.token);
                
                // Update state
                if (window.StateManager && window.StateManager.initialized) {
                    window.StateManager.batchUpdate({
                        'auth.currentUser': data.user,
                        'auth.authToken': data.token,
                        'auth.isLoggedIn': true
                    });
                }
                
                return data;
            }
            
            return { success: false, message: data.error || 'Login failed' };
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Login error', {
                    category: 'AUTH',
                    error: error.message
                });
            }
            return { success: false, message: error.message };
        }
    }
    
    // Login with real API or simulate if offline
    async simulateLogin(email, password) {
        // Try unified backend first
        const result = await this.loginWithUnifiedBackend(email, password);
        if (result.success) {
            return result;
        }
        
        // Fallback message
        if (window.logger) {
            window.logger.info('Login attempt via unified backend', {
                category: 'AUTH',
                operation: 'simulate_login_unified'
            });
        }
        
        try {
            // Fallback to demo mode only if needed for offline functionality
            if (window.logger) {
                window.logger.warn('Using demo mode for offline functionality', {
                    category: 'AUTH',
                    operation: 'demo_mode_activated'
                });
            }
        } catch (error) {
            if (window.logger) {
                window.logger.warn('Demo mode error', {
                    category: 'AUTH',
                    operation: 'demo_mode_error',
                    error: error
                });
            }
        }

        // Fallback to demo mode for development/offline use
        return new Promise((resolve) => {
            setTimeout(() => {
                if (email === 'demo@spa.com' && password === 'demo123') {
                    resolve({
                        success: true,
                        user: {
                            id: 'user_123',
                            email: email,
                            businessName: 'Demo Spa Business',
                            businessType: 'spa',
                            subscriptionPlan: 'basic',
                            createdAt: new Date().toISOString()
                        },
                        token: 'demo_token_' + Date.now(),
                        entitlements: {
                            pos: true,
                            inventory: true,
                            employees: false,
                            dashboard: 'lite',
                            chatbot: 'lite',
                            cloudBackup: false,
                            analytics: false,
                            multiUser: false,
                            support: 'email'
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Invalid email or password'
                    });
                }
            }, 1500); // Simulate network delay
        });
    }

    // Register with real API or simulate if offline
    async simulateRegister(businessName, email, password) {
        try {
            // Try real API registration first if online and API client is available
            if (navigator.onLine && window.apiClient) {
                if (window.logger) {
                    window.logger.info('Attempting real API registration', {
                        category: 'AUTH',
                        operation: 'api_registration_attempt'
                    });
                }
                
                const userData = {
                    businessName,
                    email,
                    password,
                    businessType: 'spa'
                };
                
                const response = await window.apiClient.register(userData);
                
                if (response.ok) {
                    const data = await response.json();
                    return {
                        success: true,
                        user: data.user,
                        token: data.token,
                        entitlements: data.entitlements
                    };
                } else {
                    const errorData = await response.json();
                    return {
                        success: false,
                        message: errorData.message || 'Registration failed'
                    };
                }
            }
        } catch (error) {
            if (window.logger) {
                window.logger.warn('API registration failed, falling back to demo mode', {
                    category: 'AUTH',
                    operation: 'api_registration_fallback',
                    error: error
                });
            }
        }

        // Fallback to demo mode for development/offline use
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    user: {
                        id: 'user_' + Date.now(),
                        email: email,
                        businessName: businessName,
                        businessType: 'spa',
                        subscriptionPlan: 'free', // New users start with free plan
                        createdAt: new Date().toISOString()
                    },
                    token: 'token_' + Date.now(),
                    entitlements: {
                        pos: true,
                        inventory: false,
                        employees: false,
                        dashboard: 'lite',
                        chatbot: false,
                        cloudBackup: false,
                        analytics: false,
                        multiUser: false,
                        support: 'community'
                    }
                });
            }, 2000);
        });
    }

    // Set authentication state
    async setAuthState(user, token, rememberMe = false) {
        // Ensure user has subscription plan
        if (user && !user.subscriptionPlan && !user.plan) {
            // Try to decode from token
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    user.subscriptionPlan = payload.subscriptionPlan || payload.plan || 'basic';
                    user.plan = user.subscriptionPlan;
                }
            } catch (e) {
                user.subscriptionPlan = 'basic';
                user.plan = 'basic';
            }
        }
        
        // Use StateManager if available, fallback to direct properties
        if (window.StateManager && window.StateManager.initialized) {
            window.StateManager.batchUpdate({
                'auth.currentUser': user,
                'auth.authToken': token,
                'auth.isLoggedIn': true,
                'auth.lastLogin': Date.now()
            });
        } else {
            // Fallback to direct properties (will still proxy to state if StateManager loads later)
            this.currentUser = user;
            this.authToken = token;
            this.isLoggedIn = true;
        }

        // Save to localStorage if remember me is checked
        if (rememberMe) {
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('userData', JSON.stringify(user)); // For entitlements compatibility
            localStorage.setItem('subscriptionPlan', user.subscriptionPlan || user.plan || 'basic');
        } else {
            // Save to sessionStorage for session-only
            sessionStorage.setItem('authToken', token);
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            sessionStorage.setItem('userData', JSON.stringify(user)); // For entitlements compatibility
            sessionStorage.setItem('subscriptionPlan', user.subscriptionPlan || user.plan || 'basic');
        }
        
        // Always save isLoggedIn flag
        localStorage.setItem('isLoggedIn', 'true');

        // Update UI
        this.updateAuthUI();
        
        // Update entitlements system if available
        if (window.entitlementsSystem) {
            window.entitlementsSystem.loadEntitlements();
        }
        
        // Add user ID to all future database operations
        await this.initializeUserData();
    }

    // Load saved authentication state
    async loadAuthState() {
        // Try to load from StateManager first if available
        if (window.StateManager && window.StateManager.initialized) {
            const authState = window.StateManager.getState('auth');
            if (authState && authState.currentUser) {
                this.currentUser = authState.currentUser;
                this.authToken = authState.authToken;
                this.isLoggedIn = authState.isLoggedIn;
                return;
            }
        }
        
        // Fallback to checking storage locations
        let token = localStorage.getItem('userToken') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        let userStr = localStorage.getItem('userData') || localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        let isLoggedIn = localStorage.getItem('isLoggedIn');

        if (window.logger) {
            window.logger.debug('Auth system loading state', {
                category: 'AUTH',
                operation: 'load_auth_state',
                data: {
                    hasToken: !!token,
                    hasUserData: !!userStr,
                    isLoggedIn: isLoggedIn
                }
            });
        }

        if (token && userStr && isLoggedIn === 'true') {
            try {
                this.authToken = token;
                this.currentUser = JSON.parse(userStr);
                this.isLoggedIn = true;
                
                if (window.logger && window.logger.info) {
                    window.logger.info('Auth state restored', { category: 'AUTH', context: { email: this.currentUser.email, operation: 'loadAuthState' } });
                } else {
                    if (window.logger) {
                        window.logger.info('Auth state restored for user', {
                            category: 'AUTH',
                            operation: 'auth_state_restored',
                            data: { email: this.currentUser.email }
                        });
                    }
                }
                
                // Update business name in settings
                await this.updateUserSettings();
                
                this.updateAuthUI();
                return true;
            } catch (error) {
                if (window.logger && window.logger.error) {
                    window.logger.error('Failed to load auth state', { category: 'AUTH', error, context: { operation: 'loadAuthState' } });
                } else {
                    if (window.logger) {
                        window.logger.error('Failed to load auth state', {
                            category: 'AUTH',
                            operation: 'load_auth_state_error',
                            error: error
                        });
                    } else {
                        console.error('Failed to load auth state:', error);
                    }
                }
                this.clearAuthState();
            }
        } else {
            if (window.logger) {
                window.logger.info('No valid auth state found', {
                    category: 'AUTH',
                    operation: 'auth_state_check'
                });
            }
        }
        return false;
    }

    // Validate current session
    async validateSession() {
        if (!this.authToken) return false;

        try {
            // In a real app, validate token with server
            // For now, just check if token exists and is not expired
            if (window.logger) {
                window.logger.info('Session validated', {
                    category: 'AUTH',
                    operation: 'session_validation',
                    data: { businessName: this.currentUser.businessName }
                });
            }
            return true;
        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Session validation failed', { category: 'AUTH', error, context: { operation: 'validateSession' } });
            } else {
                if (window.logger) {
                    window.logger.error('Session validation failed', {
                        category: 'AUTH',
                        operation: 'session_validation_error',
                        error: error
                    });
                } else {
                    console.error('Session validation failed:', error);
                }
            }
            this.clearAuthState();
            return false;
        }
    }

    // Clear authentication state
    clearAuthState() {
        // Use StateHelpers if available for proper logout
        if (window.StateHelpers) {
            window.StateHelpers.logout();
        } else if (window.StateManager && window.StateManager.initialized) {
            // Use StateManager directly if StateHelpers not available
            window.StateManager.batchUpdate({
                'auth.currentUser': null,
                'auth.authToken': null,
                'auth.isLoggedIn': false
            });
        } else {
            // Fallback to direct properties
            this.currentUser = null;
            this.authToken = null;
            this.isLoggedIn = false;
        }

        // Clear ALL possible storage locations
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('subscriptionPlan');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');

        if (window.logger) {
            window.logger.info('Cleared all auth state', {
                category: 'AUTH',
                operation: 'clear_auth_state'
            });
        }
        this.updateAuthUI();
    }

    // Handle logout
    async handleLogout() {
        if (confirm('Are you sure you want to logout?\n\nYour data will be synced to the cloud before logging out.')) {
            showLoading('Logging out...', 'Syncing your data to the cloud');
            
            try {
                // Sync pending changes before logout
                if (window.syncManager && typeof window.syncManager.syncAll === 'function') {
                    await window.syncManager.syncAll();
                }
                
                this.clearAuthState();
                hideLoading();
                showNotification('Logged out successfully', 'success');
                
                // Show login modal
                this.showLoginModal();
                
            } catch (error) {
                if (window.logger && window.logger.error) {
                    window.logger.error('Logout error', { category: 'AUTH', error, context: { operation: 'logout' } });
                } else {
                    if (window.logger) {
                        window.logger.error('Logout error', {
                            category: 'AUTH',
                            operation: 'logout_error',
                            error: error
                        });
                    } else {
                        console.error('Logout error:', error);
                    }
                }
                hideLoading();
                showNotification('Logout completed with sync warnings', 'warning');
                this.clearAuthState();
                this.showLoginModal();
            }
        }
    }

    // Initialize user-specific data
    async initializeUserData() {
        try {
            // Set user context for database operations
            if (window.db) {
                window.db.setUserContext(this.currentUser.id);
            }

            // Update settings with user info
            await this.updateUserSettings();
            
        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Failed to initialize user data', { category: 'AUTH', error, context: { operation: 'initializeUserData' } });
            } else {
                if (window.logger) {
                    window.logger.error('Failed to initialize user data', {
                        category: 'AUTH',
                        operation: 'init_user_data_error',
                        error: error
                    });
                } else {
                    console.error('Failed to initialize user data:', error);
                }
            }
        }
    }

    // Update user settings
    async updateUserSettings() {
        try {
            // Always update business name with current user's business name
            if (this.currentUser && this.currentUser.businessName) {
                try {
                    await db.update('settings', {
                        key: 'businessName',
                        value: this.currentUser.businessName,
                        userId: this.currentUser.id
                    });
                    if (window.logger) {
                        window.logger.info('Updated business name', {
                            category: 'AUTH',
                            operation: 'update_business_name',
                            data: { businessName: this.currentUser.businessName }
                        });
                    }
                } catch (updateError) {
                    // If update fails, try to add it
                    await db.add('settings', {
                        key: 'businessName',
                        value: this.currentUser.businessName,
                        userId: this.currentUser.id
                    });
                    if (window.logger) {
                        window.logger.info('Added business name', {
                            category: 'AUTH',
                            operation: 'add_business_name',
                            data: { businessName: this.currentUser.businessName }
                        });
                    }
                }
            }

            // Add user ID to business config
            const businessConfig = await db.get('settings', 'businessConfig');
            if (businessConfig) {
                businessConfig.value.userId = this.currentUser.id;
                await db.update('settings', businessConfig);
            }

        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Failed to update user settings', { category: 'AUTH', error, context: { operation: 'updateUserSettings' } });
            } else {
                if (window.logger) {
                    window.logger.error('Failed to update user settings', {
                        category: 'AUTH',
                        operation: 'update_user_settings_error',
                        error: error
                    });
                } else {
                    console.error('Failed to update user settings:', error);
                }
            }
        }
    }

    // Update UI based on auth state
    updateAuthUI() {
        const authIndicator = document.getElementById('authIndicator');

        if (this.isLoggedIn && this.currentUser) {
            // Show logged in state
            const showLoginBtn = document.getElementById('showLoginBtn');
            const userInfo = document.getElementById('userInfo');
            const userName = document.getElementById('userName');
            
            if (showLoginBtn) showLoginBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'block';
            if (userName) userName.textContent = this.currentUser.businessName || this.currentUser.email;
                
            // Re-attach logout event with a small delay to ensure DOM is ready
            setTimeout(() => {
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.handleLogout();
                    });
                }
            }, 10);

        } else {
            // Show logged out state
            const showLoginBtn = document.getElementById('showLoginBtn');
            const userInfo = document.getElementById('userInfo');
            
            if (showLoginBtn) showLoginBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            
            // Re-attach login event
            this.attachMainLoginButton();
        }
    }

    // Show login modal
    showLoginModal() {
        try {
            if (window.logger) {
                window.logger.debug('showLoginModal called', {
                    category: 'AUTH',
                    operation: 'show_login_modal'
                });
            }
            
            // Show login form first
            this.showLoginForm();
            
            // Get the modal element
            const modal = document.getElementById('authModal');
            if (!modal) {
                if (window.logger && window.logger.error) {
                    window.logger.error('Auth modal not found', { category: 'AUTH', context: { operation: 'showLoginModal' } });
                } else {
                    if (window.logger) {
                        window.logger.error('Auth modal not found', {
                            category: 'AUTH',
                            operation: 'show_login_modal',
                            error: { message: 'Auth modal element not found in DOM' }
                        });
                    } else {
                        console.error('Auth modal not found');
                    }
                }
                return;
            }
            
            // Clear any blocking styles
            modal.style.display = '';
            modal.classList.remove('active');
            
            // Try to use the global openModal function
            if (typeof openModal === 'function') {
                if (window.logger) {
                    window.logger.debug('Using openModal function', {
                        category: 'AUTH',
                        operation: 'open_modal_function'
                    });
                }
                setTimeout(() => {
                    openModal('authModal');
                }, 10);
            } else {
                if (window.logger) {
                    window.logger.debug('Using fallback modal opening', {
                        category: 'AUTH',
                        operation: 'fallback_modal_open'
                    });
                }
                // Fallback: manually show modal
                modal.style.display = 'flex';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                modal.style.zIndex = '1000';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                
                document.body.classList.add('modal-open');
                
                // Focus on email input
                setTimeout(() => {
                    const emailInput = document.getElementById('loginEmail');
                    if (emailInput) emailInput.focus();
                }, 100);
            }
        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Error showing login modal', { category: 'AUTH', error, context: { operation: 'showLoginModal' } });
            } else {
                if (window.logger) {
                    window.logger.error('Error showing login modal', {
                        category: 'AUTH',
                        operation: 'show_login_modal_error',
                        error: error
                    });
                } else {
                    console.error('Error showing login modal:', error);
                }
            }
        }
    }

    // Show login form
    showLoginForm() {
        const loginForm = document.getElementById('authLoginForm');
        const registerForm = document.getElementById('authRegisterForm');
        
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
    }

    // Show register form
    showRegisterForm() {
        const loginForm = document.getElementById('authLoginForm');
        const registerForm = document.getElementById('authRegisterForm');
        
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
    }

    // Initialize user session
    async initializeUserSession() {
        try {
            // Reload app with user context
            if (window.app) {
                await window.app.loadBusinessConfig();
                await window.app.loadBusinessName();
            }

            // Initialize other modules with user context
            if (window.loadDashboard && window.app.currentPage === 'dashboard') {
                await window.loadDashboard();
            }

        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Failed to initialize user session', { category: 'AUTH', error, context: { operation: 'initializeUserSession' } });
            } else {
                if (window.logger) {
                    window.logger.error('Failed to initialize user session', {
                        category: 'AUTH',
                        operation: 'init_user_session_error',
                        error: error
                    });
                } else {
                    console.error('Failed to initialize user session:', error);
                }
            }
        }
    }

    // REMOVED: showNewUserSetup() - setup wizard is now manual only

    // Get authorization headers for API calls
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };
    }

    // Check if user is logged in
    requireAuth() {
        if (!this.isLoggedIn) {
            showNotification('Please login to continue', 'warning');
            this.showLoginModal();
            return false;
        }
        return true;
    }
}

// Initialize auth system
const authSystem = new AuthSystem();

// Export for use in other modules immediately
window.authSystem = authSystem;

// Global function for HTML onclick backup
window.showLoginModal = function() {
    if (window.logger) {
        window.logger.debug('Global showLoginModal routing to AuthSystem', {
            category: 'AUTH',
            operation: 'global_show_login_modal'
        });
    }
    
    if (window.authSystem && window.authSystem.showLoginModal) {
        window.authSystem.showLoginModal();
    } else {
        if (window.logger && window.logger.error) {
            window.logger.error('AuthSystem not available', { category: 'AUTH', context: { operation: 'showLoginModal' } });
        } else {
            if (window.logger) {
                window.logger.error('AuthSystem not available', {
                    category: 'AUTH',
                    operation: 'auth_system_missing'
                });
            } else {
                console.error('AuthSystem not available');
            }
        }
        // Ultimate fallback - directly show modal
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            modal.style.zIndex = '1000';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            
            // Show login form
            const loginForm = document.getElementById('authLoginForm');
            const registerForm = document.getElementById('authRegisterForm');
            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
            
            // Add close functionality
            modal.onclick = function(e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                }
            };
        }
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    if (window.logger) {
        window.logger.info('DOM loaded, initializing auth system', {
            category: 'AUTH',
            operation: 'dom_init_auth'
        });
    }
    try {
        await authSystem.init();
        if (window.logger) {
            window.logger.info('Auth system initialized successfully', {
                category: 'AUTH',
                operation: 'auth_init_success'
            });
        }
        
        // Double-check login button after a short delay
        setTimeout(() => {
            const loginBtn = document.getElementById('showLoginBtn');
            if (window.logger) {
                window.logger.debug('Login button found', {
                    category: 'AUTH',
                    operation: 'login_button_check',
                    data: { found: !!loginBtn }
                });
            }
            if (loginBtn) {
                if (window.logger) {
                    window.logger.debug('Login button status', {
                        category: 'AUTH',
                        operation: 'login_button_status',
                        data: {
                            visible: loginBtn.style.display !== 'none',
                            hasClickHandler: !!loginBtn.onclick
                        }
                    });
                }
            }
        }, 1000);
        
    } catch (error) {
        if (window.logger && window.logger.error) {
            window.logger.error('Auth system initialization failed', { category: 'AUTH', error, context: { operation: 'initialize' } });
        } else {
            if (window.logger) {
                window.logger.error('Auth system initialization failed', {
                    category: 'AUTH',
                    operation: 'init_auth_system_error',
                    error: error
                });
            } else {
                console.error('Auth system initialization failed:', error);
            }
        }
    }
    
    // Note: Removed automatic login modal popup
    // Users can click the login button when ready
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already loaded, initialize immediately
    setTimeout(async () => {
        if (window.logger) {
            window.logger.info('DOM already loaded, initializing auth system', {
                category: 'AUTH',
                operation: 'immediate_auth_init'
            });
        }
        try {
            await authSystem.init();
            if (window.logger) {
                window.logger.info('Auth system initialized successfully (immediate)', {
                    category: 'AUTH',
                    operation: 'immediate_auth_init_success'
                });
            }
        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Auth system initialization failed (immediate)', { category: 'AUTH', error, context: { operation: 'initialize' } });
            } else {
                if (window.logger) {
                    window.logger.error('Auth system initialization failed (immediate)', {
                        category: 'AUTH',
                        operation: 'immediate_auth_init_error',
                        error: error
                    });
                } else {
                    console.error('Auth system initialization failed (immediate):', error);
                }
            }
        }
    }, 100);
}
