// Enhanced Authentication and User Management System
// Uses unified configuration service with backward compatibility

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;
        this.serverUrl = null;
        this.configReady = false;
        this.fallbackMode = false;
    }

    async init() {
        // Wait for config service to be ready
        await this.waitForConfigService();
        
        // Load saved authentication state
        await this.loadAuthState();
        
        // Check if user is already logged in
        if (this.authToken && this.currentUser) {
            await this.validateSession();
        }
        
        this.setupEventListeners();
        
        // Update UI to show correct auth state
        this.updateAuthUI();
        
        console.log('🔐 Enhanced Auth system initialized');
    }

    async waitForConfigService() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        while (attempts < maxAttempts) {
            if (window.config && window.config.isInitialized) {
                this.configReady = true;
                console.log('✅ Auth System: Config service ready');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('⚠️ Auth System: Config service timeout, using fallback mode');
        this.fallbackMode = true;
    }

    // Enhanced configuration methods with fallbacks
    async getAuthConfig(key, defaultValue = null) {
        if (this.configReady && !this.fallbackMode) {
            try {
                return await window.config.get(key, defaultValue);
            } catch (error) {
                console.warn(`Auth config error for ${key}, falling back:`, error);
                this.fallbackMode = true;
            }
        }
        
        // Fallback to old methods
        return this.getAuthConfigFallback(key, defaultValue);
    }

    async setAuthConfig(key, value) {
        if (this.configReady && !this.fallbackMode) {
            try {
                const success = await window.config.set(key, value);
                if (success) return true;
                console.warn(`Auth config failed for ${key}, falling back`);
                this.fallbackMode = true;
            } catch (error) {
                console.warn(`Auth config error for ${key}, falling back:`, error);
                this.fallbackMode = true;
            }
        }
        
        // Fallback to old methods
        return this.setAuthConfigFallback(key, value);
    }

    getAuthConfigFallback(key, defaultValue) {
        // Map auth config keys to old storage locations
        const keyMap = {
            'userToken': () => {
                return localStorage.getItem('userToken') || 
                       localStorage.getItem('authToken') || 
                       sessionStorage.getItem('authToken');
            },
            'currentUser': () => {
                const userStr = localStorage.getItem('userData') || 
                               localStorage.getItem('currentUser') || 
                               sessionStorage.getItem('currentUser');
                try {
                    return userStr ? JSON.parse(userStr) : null;
                } catch {
                    return null;
                }
            },
            'isLoggedIn': () => {
                const value = localStorage.getItem('isLoggedIn');
                return value === 'true';
            },
            'subscriptionPlan': () => {
                return localStorage.getItem('subscriptionPlan') || 'unpaid';
            }
        };

        const getter = keyMap[key];
        if (getter) {
            const result = getter();
            return Promise.resolve(result !== null ? result : defaultValue);
        }
        
        return Promise.resolve(defaultValue);
    }

    async setAuthConfigFallback(key, value) {
        try {
            switch (key) {
                case 'userToken':
                    localStorage.setItem('userToken', value);
                    localStorage.setItem('authToken', value); // Also store in authToken for compatibility
                    sessionStorage.setItem('authToken', value);
                    break;
                    
                case 'currentUser':
                    const userStr = JSON.stringify(value);
                    localStorage.setItem('userData', userStr);
                    localStorage.setItem('currentUser', userStr);
                    sessionStorage.setItem('currentUser', userStr);
                    break;
                    
                case 'isLoggedIn':
                    localStorage.setItem('isLoggedIn', String(value));
                    break;
                    
                case 'subscriptionPlan':
                    localStorage.setItem('subscriptionPlan', value);
                    break;
                    
                default:
                    console.warn(`No fallback setter for auth config key: ${key}`);
                    return false;
            }
            return true;
        } catch (error) {
            console.error(`Auth fallback setter failed for ${key}:`, error);
            return false;
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
        console.log('🚫 DISABLED: Auth.js login button handler - using direct modal instead');
        return; // DISABLED to prevent interference
        
        const mainLoginBtn = document.getElementById('showLoginBtn');
        if (mainLoginBtn) {
            console.log('Attaching click event to login button');
            
            // Remove any existing event listeners
            mainLoginBtn.replaceWith(mainLoginBtn.cloneNode(true));
            const newBtn = document.getElementById('showLoginBtn');
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Login button clicked - showing modal');
                this.showLoginModal();
            });
        }
    }

    async loadAuthState() {
        console.log('🔄 Enhanced Auth system loading state...');
        
        try {
            // Load auth state using enhanced config methods
            const token = await this.getAuthConfig('userToken');
            const currentUser = await this.getAuthConfig('currentUser');
            const isLoggedIn = await this.getAuthConfig('isLoggedIn', false);

            console.log('🔄 Auth state loaded:', {
                hasToken: !!token,
                hasUserData: !!currentUser,
                isLoggedIn: isLoggedIn,
                configMode: this.fallbackMode ? 'fallback' : 'unified'
            });

            if (token) {
                this.authToken = token;
            }

            if (currentUser) {
                this.currentUser = currentUser;
                console.log('👤 Current user loaded:', {
                    name: currentUser.name,
                    email: currentUser.email,
                    plan: currentUser.subscriptionPlan
                });
            }

            this.isLoggedIn = isLoggedIn && !!token && !!currentUser;
            
            console.log('✅ Final auth state:', {
                isLoggedIn: this.isLoggedIn,
                hasToken: !!this.authToken,
                hasUser: !!this.currentUser
            });

        } catch (error) {
            console.error('❌ Failed to load auth state:', error);
            // Reset to safe defaults
            this.authToken = null;
            this.currentUser = null;
            this.isLoggedIn = false;
        }
    }

    async saveAuthState() {
        try {
            console.log('💾 Saving auth state:', {
                hasToken: !!this.authToken,
                hasUser: !!this.currentUser,
                isLoggedIn: this.isLoggedIn,
                configMode: this.fallbackMode ? 'fallback' : 'unified'
            });

            // Save auth state using enhanced config methods
            if (this.authToken) {
                await this.setAuthConfig('userToken', this.authToken);
            }

            if (this.currentUser) {
                await this.setAuthConfig('currentUser', this.currentUser);
                
                // Also save subscription plan separately for easy access
                const plan = this.currentUser.subscriptionPlan || 'unpaid';
                await this.setAuthConfig('subscriptionPlan', plan);
            }

            await this.setAuthConfig('isLoggedIn', this.isLoggedIn);

            console.log('✅ Auth state saved successfully');

        } catch (error) {
            console.error('❌ Failed to save auth state:', error);
        }
    }

    async clearAuthState() {
        try {
            console.log('🗑️ Clearing auth state...');

            // Clear using config service
            await this.setAuthConfig('userToken', null);
            await this.setAuthConfig('currentUser', null);
            await this.setAuthConfig('isLoggedIn', false);
            
            // Also clear from fallback storage locations
            localStorage.removeItem('userToken');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');

            // Reset instance variables
            this.authToken = null;
            this.currentUser = null;
            this.isLoggedIn = false;

            console.log('✅ Auth state cleared');

        } catch (error) {
            console.error('❌ Failed to clear auth state:', error);
        }
    }

    async validateSession() {
        if (!this.authToken) {
            console.log('❌ No token to validate');
            return false;
        }

        try {
            console.log('🔍 Validating session...');
            
            // Get API URL from config service
            const apiUrl = await this.getAuthConfig('apiUrl') || 
                          (window.config ? await window.config.get('apiUrl') : null) ||
                          'https://ava-marketing-api.onrender.com';

            const response = await fetch(`${apiUrl}/api/auth/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Session validation successful');
                
                // Update user data if provided
                if (data.user && Object.keys(data.user).length > 0) {
                    this.currentUser = { ...this.currentUser, ...data.user };
                    await this.saveAuthState();
                }
                
                this.isLoggedIn = true;
                return true;
            } else {
                console.log('❌ Session validation failed - clearing auth state');
                await this.clearAuthState();
                return false;
            }

        } catch (error) {
            console.error('❌ Session validation error:', error);
            // Don't clear auth state on network errors, just mark as not validated
            return false;
        }
    }

    async login(email, password) {
        try {
            console.log('🔐 Attempting login for:', email);

            // Get API URL from config service
            const apiUrl = await this.getAuthConfig('apiUrl') || 
                          (window.config ? await window.config.get('apiUrl') : null) ||
                          'https://ava-marketing-api.onrender.com';

            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Login successful');
                
                // Store auth data
                this.authToken = data.token;
                this.currentUser = data.user;
                this.isLoggedIn = true;

                // Save to storage using enhanced methods
                await this.saveAuthState();

                // Update UI
                this.updateAuthUI();
                
                // Close login modal if it exists
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    loginModal.style.display = 'none';
                }

                // Show success message
                if (window.showNotification) {
                    window.showNotification(`Welcome back, ${data.user.name}!`, 'success');
                }

                // Trigger login event for other systems
                window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                    detail: { user: this.currentUser, token: this.authToken } 
                }));

                return { success: true, user: data.user, token: data.token };

            } else {
                console.log('❌ Login failed:', data.message);
                return { success: false, message: data.message || 'Login failed' };
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, message: 'Network error - please try again' };
        }
    }

    async logout() {
        try {
            console.log('🚪 Logging out...');

            // Try to notify server about logout
            if (this.authToken) {
                try {
                    const apiUrl = await this.getAuthConfig('apiUrl') || 
                                  (window.config ? await window.config.get('apiUrl') : null) ||
                                  'https://ava-marketing-api.onrender.com';

                    await fetch(`${apiUrl}/api/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.warn('Server logout notification failed:', error);
                }
            }

            // Clear local auth state
            await this.clearAuthState();

            // Update UI
            this.updateAuthUI();

            // Show message
            if (window.showNotification) {
                window.showNotification('Logged out successfully', 'info');
            }

            // Trigger logout event
            window.dispatchEvent(new CustomEvent('userLoggedOut'));

            // Redirect to home or login page if needed
            if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                window.location.href = 'index.html';
            }

            console.log('✅ Logout completed');

        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    }

    async register(userData) {
        try {
            console.log('📝 Attempting registration for:', userData.email);

            // Get API URL from config service
            const apiUrl = await this.getAuthConfig('apiUrl') || 
                          (window.config ? await window.config.get('apiUrl') : null) ||
                          'https://ava-marketing-api.onrender.com';

            const response = await fetch(`${apiUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Registration successful');

                // Store auth data
                this.authToken = data.token;
                this.currentUser = data.user;
                this.isLoggedIn = true;

                // Save to storage using enhanced methods
                await this.saveAuthState();

                // Update UI
                this.updateAuthUI();

                // Close registration modal if it exists
                const registerModal = document.getElementById('registerModal');
                if (registerModal) {
                    registerModal.style.display = 'none';
                }

                // Show success message
                if (window.showNotification) {
                    window.showNotification(`Welcome, ${data.user.name}! Your account has been created.`, 'success');
                }

                // Trigger registration event
                window.dispatchEvent(new CustomEvent('userRegistered', { 
                    detail: { user: this.currentUser, token: this.authToken } 
                }));

                return { success: true, user: data.user, token: data.token };

            } else {
                console.log('❌ Registration failed:', data.message);
                return { success: false, message: data.message || 'Registration failed' };
            }

        } catch (error) {
            console.error('❌ Registration error:', error);
            return { success: false, message: 'Network error - please try again' };
        }
    }

    // Enhanced user info methods
    async getCurrentUser() {
        if (!this.currentUser) {
            // Try to load from config service
            this.currentUser = await this.getAuthConfig('currentUser');
        }
        return this.currentUser;
    }

    async getAuthToken() {
        if (!this.authToken) {
            // Try to load from config service
            this.authToken = await this.getAuthConfig('userToken');
        }
        return this.authToken;
    }

    async isUserLoggedIn() {
        if (!this.isLoggedIn) {
            // Check config service
            this.isLoggedIn = await this.getAuthConfig('isLoggedIn', false);
        }
        return this.isLoggedIn && !!this.authToken && !!this.currentUser;
    }

    async getSubscriptionPlan() {
        // Try to get from current user first
        if (this.currentUser && this.currentUser.subscriptionPlan) {
            return this.currentUser.subscriptionPlan;
        }
        
        // Fall back to config service
        return await this.getAuthConfig('subscriptionPlan', 'unpaid');
    }

    // Enhanced validation methods
    async validateAndRefreshAuth() {
        try {
            const isValid = await this.validateSession();
            if (isValid) {
                await this.saveAuthState(); // Ensure state is saved
                this.updateAuthUI();
            }
            return isValid;
        } catch (error) {
            console.error('Auth validation and refresh failed:', error);
            return false;
        }
    }

    async refreshUserData() {
        if (!this.authToken) {
            console.log('No auth token for refresh');
            return false;
        }

        try {
            const apiUrl = await this.getAuthConfig('apiUrl') || 
                          (window.config ? await window.config.get('apiUrl') : null) ||
                          'https://ava-marketing-api.onrender.com';

            const response = await fetch(`${apiUrl}/api/user/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    this.currentUser = { ...this.currentUser, ...data.user };
                    await this.saveAuthState();
                    this.updateAuthUI();
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error('Failed to refresh user data:', error);
            return false;
        }
    }

    updateAuthUI() {
        // Update login/logout button text and visibility
        const loginBtn = document.getElementById('showLoginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const logoutBtn = document.getElementById('logoutBtn');

        if (this.isLoggedIn && this.currentUser) {
            // User is logged in
            if (loginBtn) {
                loginBtn.style.display = 'none';
            }
            
            if (userInfo) {
                userInfo.style.display = 'block';
            }
            
            if (userName) {
                userName.textContent = this.currentUser.name || this.currentUser.email;
            }
            
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
                logoutBtn.onclick = () => this.logout();
            }

            // Update subscription plan display
            const planDisplay = document.getElementById('subscriptionPlan');
            if (planDisplay) {
                const plan = this.currentUser.subscriptionPlan || 'unpaid';
                planDisplay.textContent = plan.toUpperCase();
                planDisplay.className = `plan-badge ${plan}`;
            }

            // Update any other user-specific UI elements
            this.updateUserSpecificUI();

        } else {
            // User is not logged in
            if (loginBtn) {
                loginBtn.style.display = 'block';
            }
            
            if (userInfo) {
                userInfo.style.display = 'none';
            }
            
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }

            // Hide user-specific elements
            this.hideUserSpecificUI();
        }

        console.log('🎨 Auth UI updated. Logged in:', this.isLoggedIn);
    }

    updateUserSpecificUI() {
        // Update UI elements that should only be visible to logged-in users
        const protectedElements = document.querySelectorAll('[data-auth-required="true"]');
        protectedElements.forEach(element => {
            element.style.display = 'block';
        });

        // Update subscription-specific elements
        const plan = this.currentUser?.subscriptionPlan || 'unpaid';
        const proElements = document.querySelectorAll('[data-plan-required="pro"]');
        proElements.forEach(element => {
            element.style.display = plan === 'pro' ? 'block' : 'none';
        });
    }

    hideUserSpecificUI() {
        // Hide UI elements that should only be visible to logged-in users
        const protectedElements = document.querySelectorAll('[data-auth-required="true"]');
        protectedElements.forEach(element => {
            element.style.display = 'none';
        });

        // Hide all subscription-specific elements
        const proElements = document.querySelectorAll('[data-plan-required="pro"]');
        proElements.forEach(element => {
            element.style.display = 'none';
        });
    }

    // Modal management methods (keep existing functionality)
    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Login modal shown');
        } else {
            console.log('Login modal not found');
        }
    }

    showRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Register modal shown');
        } else {
            console.log('Register modal not found');
        }
    }

    showLoginForm() {
        this.showLoginModal();
    }

    showRegisterForm() {
        this.showRegisterModal();
    }

    // Form handlers (keep existing functionality with enhancements)
    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            if (window.showNotification) {
                window.showNotification('Please enter both email and password', 'error');
            }
            return;
        }

        // Show loading state
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');
        const originalText = loginBtn?.textContent;
        if (loginBtn) {
            loginBtn.textContent = 'Logging in...';
            loginBtn.disabled = true;
        }

        try {
            const result = await this.login(email, password);
            
            if (!result.success) {
                if (window.showNotification) {
                    window.showNotification(result.message, 'error');
                }
            }
        } finally {
            // Restore button state
            if (loginBtn) {
                loginBtn.textContent = originalText;
                loginBtn.disabled = false;
            }
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName')?.value;
        const email = document.getElementById('registerEmail')?.value;
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('registerConfirmPassword')?.value;

        if (!name || !email || !password || !confirmPassword) {
            if (window.showNotification) {
                window.showNotification('Please fill in all fields', 'error');
            }
            return;
        }

        if (password !== confirmPassword) {
            if (window.showNotification) {
                window.showNotification('Passwords do not match', 'error');
            }
            return;
        }

        if (password.length < 6) {
            if (window.showNotification) {
                window.showNotification('Password must be at least 6 characters', 'error');
            }
            return;
        }

        // Show loading state
        const registerBtn = document.querySelector('#registerForm button[type="submit"]');
        const originalText = registerBtn?.textContent;
        if (registerBtn) {
            registerBtn.textContent = 'Creating account...';
            registerBtn.disabled = true;
        }

        try {
            const result = await this.register({
                name,
                email,
                password,
                subscriptionPlan: 'unpaid' // Default plan
            });
            
            if (!result.success) {
                if (window.showNotification) {
                    window.showNotification(result.message, 'error');
                }
            }
        } finally {
            // Restore button state
            if (registerBtn) {
                registerBtn.textContent = originalText;
                registerBtn.disabled = false;
            }
        }
    }

    // Utility methods for migration testing
    async testMigration() {
        console.log('🧪 Testing auth system migration...');
        
        const testResults = {
            configService: this.configReady && !this.fallbackMode,
            backwardCompatibility: false,
            forwardCompatibility: false,
            statePersistence: false
        };

        try {
            // Test 1: Backward compatibility (old storage -> new reading)
            const testToken = 'test-token-' + Date.now();
            localStorage.setItem('userToken', testToken);
            const readToken = await this.getAuthConfig('userToken');
            testResults.backwardCompatibility = readToken === testToken;

            // Test 2: Forward compatibility (new storage -> old reading)
            const testToken2 = 'test-token-2-' + Date.now();
            await this.setAuthConfig('userToken', testToken2);
            const oldReadToken = localStorage.getItem('userToken');
            testResults.forwardCompatibility = oldReadToken === testToken2;

            // Test 3: State persistence
            const testUser = { name: 'Test User', email: 'test@example.com' };
            await this.setAuthConfig('currentUser', testUser);
            const persistedUser = await this.getAuthConfig('currentUser');
            testResults.statePersistence = JSON.stringify(persistedUser) === JSON.stringify(testUser);

            console.log('🧪 Auth migration test results:', testResults);
            
            // Clean up test data
            localStorage.removeItem('userToken');
            
            return testResults;

        } catch (error) {
            console.error('Auth migration test failed:', error);
            return { ...testResults, error: error.message };
        }
    }

    // Get debug info
    getDebugInfo() {
        return {
            configReady: this.configReady,
            fallbackMode: this.fallbackMode,
            isLoggedIn: this.isLoggedIn,
            hasToken: !!this.authToken,
            hasUser: !!this.currentUser,
            userName: this.currentUser?.name,
            userEmail: this.currentUser?.email,
            subscriptionPlan: this.currentUser?.subscriptionPlan
        };
    }
}

// Initialize enhanced auth system
const authSystem = new AuthSystem();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        authSystem.init();
    });
} else {
    authSystem.init();
}

// Expose to window for external access
window.authSystem = authSystem;

// For backward compatibility, expose the individual methods
window.login = (email, password) => authSystem.login(email, password);
window.logout = () => authSystem.logout();
window.register = (userData) => authSystem.register(userData);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}