// Authentication and User Management System

// Simple utility functions to replace missing imports
function logDebug(msg, data) { console.log('[DEBUG]', msg, data); }
function logInfo(msg, data) { console.log('[INFO]', msg, data); }
function logError(msg, data) { console.error('[ERROR]', msg, data); }
function logWarn(msg, data) { console.warn('[WARN]', msg, data); }
function showSuccess(msg) { alert('✅ ' + msg); }
function showError(msg) { alert('❌ ' + msg); }
function showWarning(msg) { alert('⚠️ ' + msg); }
function showInfo(msg) { alert('ℹ️ ' + msg); }
function safeAsyncOperation(fn) { return fn(); }
function withErrorHandling(fn, config) { 
    try { 
        return Promise.resolve(fn()); 
    } catch(e) { 
        console.error(config.operation, e); 
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
        // Load saved authentication state
        await this.loadAuthState();
        
        // Check if user is already logged in
        if (this.authToken && this.currentUser) {
            // Try to validate session, but don't fail if it doesn't work
            await withErrorHandling(
                () => this.validateSession(),
                {
                    category: 'AUTH',
                    operation: 'validate_session',
                    type: ErrorTypes.AUTHENTICATION,
                    userMessage: 'Session validation failed, but you remain logged in'
                }
            ).catch(() => {
                // Keep user logged in even if validation fails
                this.isLoggedIn = true;
            });
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

    // Show login modal (called from sync system and other components)
    showLoginModal() {
        logInfo('AuthSystem.showLoginModal called', {
            category: 'AUTH',
            operation: 'show_login_modal'
        });
        
        // Show the auth modal
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
        }
        
        // Make sure login form is visible (not register)
        this.showLoginForm();
        
        // Focus on email field for better UX
        setTimeout(() => {
            const emailField = document.getElementById('loginEmail');
            if (emailField) {
                emailField.focus();
            }
        }, 100);
    }

    showRegisterForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
    }

    // Handle user login
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
            const serverUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://ava-pwa-backend.onrender.com';
            
            console.log('🔐 Attempting login to unified backend:', serverUrl);
            
            const response = await fetch(`${serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('🔐 Login response:', data);

            if (response.ok && data.success && data.token) {
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
                if (data.user.subscriptionPlan && window.entitlementsSystem) {
                    window.entitlementsSystem.loadEntitlements();
                }

                setButtonLoading('loginBtn', false);
                
                // Close modal
                const modal = document.getElementById('authModal');
                if (modal) modal.style.display = 'none';

                showSuccess(`Welcome back, ${data.user.firstName || data.user.businessName}!`);
                
                // Update UI
                this.updateAuthUI();
                
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
        const plan = document.getElementById('selectedPlan')?.value || 'basic';

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
            const serverUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://ava-pwa-backend.onrender.com';
            
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
                    phone,
                    plan
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
        if (!this.authToken) return false;

        try {
            // Use unified backend URL from API_CONFIG
            const serverUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://ava-pwa-backend.onrender.com';
            
            const response = await fetch(`${serverUrl}/api/auth/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentUser = data.user;
                    this.isLoggedIn = true;
                    return true;
                }
            }

            // Only logout if we get a clear authentication error (401/403)
            // Don't logout for server errors (404, 500) which might be temporary
            if (response.status === 401 || response.status === 403) {
                console.warn('Session expired or invalid, logging out');
                await this.logout();
                return false;
            } else {
                // For other errors (404, 500), keep user logged in but warn
                console.warn(`Session validation failed with status ${response.status}, keeping user logged in`);
                // Keep existing user data, just mark as validated for this session
                this.isLoggedIn = true;
                return true;
            }
        } catch (error) {
            console.error('Session validation error:', error);
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
                const serverUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://ava-pwa-backend.onrender.com';
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

            // Show login modal
            if (typeof showLoginModal === 'function') {
                showLoginModal();
            }
        }
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
                this.authToken = authToken;
                this.currentUser = JSON.parse(currentUser);
                this.isLoggedIn = true;
                
                console.log('✅ Auth state restored:', {
                    user: this.currentUser?.firstName || this.currentUser?.businessName || 'Unknown User',
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
                userInfo.innerHTML = `
                    <div class="user-profile">
                        <span class="user-name">${this.currentUser.businessName || this.currentUser.firstName}</span>
                        <span class="user-plan">${this.currentUser.subscriptionPlan || 'Basic'} Plan</span>
                        <button onclick="authSystem.logout()" class="btn-logout">Logout</button>
                    </div>
                `;
            }
            
            // Update business name display
            if (businessNameElement) {
                businessNameElement.textContent = this.currentUser.businessName || 'My Business';
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
            if (window.dataSync) {
                await window.dataSync.syncAll();
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
        this.serverUrl = 'https://ava-pwa-backend.onrender.com';
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