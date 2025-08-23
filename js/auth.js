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
                
                // Use showLoginModal directly since it's defined in HTML
                if (typeof showLoginModal === 'function') {
                    showLoginModal();
                } else {
                    console.error('showLoginModal function not available');
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
            showNotification('Please enter email and password', 'error');
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

                showNotification(`Welcome back, ${data.user.firstName || data.user.businessName}!`, 'success');
                
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
            showNotification(error.message || 'Login failed. Please try again.', 'error');
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
            showNotification('Please fill in all required fields', 'error');
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

                showNotification('Registration successful! Welcome to Ava Solutions!', 'success');
                
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
            showNotification(error.message || 'Registration failed. Please try again.', 'error');
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

            // Invalid session
            await this.logout();
            return false;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
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
    async saveAuthState(rememberMe = false) {
        const storage = rememberMe ? localStorage : sessionStorage;
        
        storage.setItem('authToken', this.authToken);
        storage.setItem('currentUser', JSON.stringify(this.currentUser));
        storage.setItem('isLoggedIn', 'true');
        
        // Also save to localStorage for persistence
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
        }
    }

    // Load authentication state
    async loadAuthState() {
        // Check both storages
        let authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        let currentUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        let isLoggedIn = localStorage.getItem('isLoggedIn') || sessionStorage.getItem('isLoggedIn');
        
        if (authToken && currentUser && isLoggedIn === 'true') {
            this.authToken = authToken;
            this.currentUser = JSON.parse(currentUser);
            this.isLoggedIn = true;
            
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