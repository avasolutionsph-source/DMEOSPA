// Unified MongoDB Authentication System
class UnifiedAuth {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;
        this.apiBaseUrl = 'http://localhost:4000/api'; // PWA Backend
        this.onAuthChange = null; // Callback for auth state changes
        
        console.log('🔐 Unified Auth System initialized');
    }

    // Initialize authentication system
    async init() {
        console.log('🚀 Initializing Unified Auth...');
        
        // Check for existing session
        await this.checkExistingSession();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('✅ Unified Auth ready');
    }

    // Check for existing valid session
    async checkExistingSession() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const userData = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
            
            if (token && userData) {
                // Validate token with backend
                const isValid = await this.validateToken(token);
                if (isValid) {
                    this.authToken = token;
                    this.currentUser = JSON.parse(userData);
                    this.isLoggedIn = true;
                    
                    console.log('✅ Existing session restored:', this.currentUser.email);
                    this.updateUI();
                    return true;
                }
            }
            
            // Clear invalid session data
            this.clearSession();
        } catch (error) {
            console.warn('Session restoration failed:', error);
            this.clearSession();
        }
        
        return false;
    }

    // Validate token with backend
    async validateToken(token) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            return response.ok && data.success && data.valid;
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    }

    // Set up event listeners
    setupEventListeners() {
        // Override any existing login button
        const loginButton = document.getElementById('showLoginBtn');
        if (loginButton) {
            // Remove old listeners and add new one
            const newButton = loginButton.cloneNode(true);
            loginButton.parentNode.replaceChild(newButton, loginButton);
            newButton.addEventListener('click', () => this.showLoginModal());
        }

        // Look for login form when DOM changes
        this.observeForLoginForm();
    }

    // Observe DOM for login form
    observeForLoginForm() {
        const observer = new MutationObserver(() => {
            const loginForm = document.querySelector('#authLoginForm form, #loginForm form');
            if (loginForm && !loginForm.hasUnifiedAuth) {
                loginForm.hasUnifiedAuth = true;
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleLogin();
                });
                console.log('✅ Login form captured');
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Show login modal
    showLoginModal() {
        console.log('📱 Showing login modal');
        
        // Clear any previous errors
        this.clearLoginErrors();
        
        // Show the modal
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Show login form, hide register form
            const loginForm = document.getElementById('authLoginForm');
            const registerForm = document.getElementById('authRegisterForm');
            
            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
            
            // Focus on email input
            setTimeout(() => {
                const emailInput = document.getElementById('loginEmail');
                if (emailInput) emailInput.focus();
            }, 100);
        }
    }

    // Handle login
    async handleLogin() {
        console.log('🔐 Processing login...');
        
        const email = document.getElementById('loginEmail')?.value?.trim();
        const password = document.getElementById('loginPassword')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;

        // Validation
        if (!email || !password) {
            this.showError('Please enter email and password');
            return;
        }

        // Set loading state
        this.setLoginLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Login successful
                await this.setAuthState(data.user, data.token, rememberMe);
                
                this.hideLoginModal();
                this.showNotification(`Welcome back, ${data.user.firstName}! (${data.user.role})`, 'success');
                
                console.log('✅ Login successful');
            } else {
                // Login failed
                this.showError(data.error || 'Login failed');
                console.error('❌ Login failed:', data.error);
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            this.showError('Connection failed. Please check your network.');
        } finally {
            this.setLoginLoading(false);
        }
    }

    // Handle registration
    async handleRegister() {
        console.log('📝 Processing registration...');
        
        const email = document.getElementById('registerEmail')?.value?.trim();
        const password = document.getElementById('registerPassword')?.value;
        const firstName = document.getElementById('registerFirstName')?.value?.trim();
        const lastName = document.getElementById('registerLastName')?.value?.trim();
        const businessName = document.getElementById('registerBusinessName')?.value?.trim();
        const phone = document.getElementById('registerPhone')?.value?.trim();

        // Validation
        if (!email || !password || !firstName || !lastName || !businessName) {
            this.showError('Please fill in all required fields');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }

        // Set loading state
        this.setRegisterLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    firstName,
                    lastName,
                    businessName,
                    phone,
                    role: 'owner' // Default to owner for new registrations
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Registration successful
                await this.setAuthState(data.user, data.token, true);
                
                this.hideLoginModal();
                this.showNotification(`Welcome to Ava Solutions, ${data.user.firstName}!`, 'success');
                
                console.log('✅ Registration successful');
            } else {
                // Registration failed
                this.showError(data.error || 'Registration failed');
                console.error('❌ Registration failed:', data.error);
            }

        } catch (error) {
            console.error('❌ Registration error:', error);
            this.showError('Connection failed. Please check your network.');
        } finally {
            this.setRegisterLoading(false);
        }
    }

    // Set authentication state
    async setAuthState(user, token, remember = false) {
        this.currentUser = user;
        this.authToken = token;
        this.isLoggedIn = true;
        
        // Store in appropriate storage
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('auth_token', token);
        storage.setItem('auth_user', JSON.stringify(user));
        
        // Clear the other storage
        const otherStorage = remember ? sessionStorage : localStorage;
        otherStorage.removeItem('auth_token');
        otherStorage.removeItem('auth_user');
        
        // Update UI
        this.updateUI();
        
        // Notify other systems
        if (this.onAuthChange) {
            this.onAuthChange(this.currentUser);
        }
        
        // Clear all old auth data
        this.clearLegacyAuthData();
        
        console.log('🔐 Auth state set for:', user.email, 'Role:', user.role);
    }

    // Update UI based on auth state
    updateUI() {
        if (this.isLoggedIn && this.currentUser) {
            this.updateLoggedInUI();
        } else {
            this.updateLoggedOutUI();
        }
    }

    // Update UI for logged in state
    updateLoggedInUI() {
        console.log('🎨 Updating UI for logged in user:', this.currentUser.role);
        
        // Update user info display
        const showLoginBtn = document.getElementById('showLoginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const businessName = document.getElementById('businessName');
        
        if (showLoginBtn) showLoginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (userName) userName.textContent = this.currentUser.firstName;
        if (businessName) businessName.textContent = this.currentUser.businessName;
        
        // Update navigation based on permissions
        this.updateNavigation();
        
        // Update role-specific elements
        this.updateRoleElements();
    }

    // Update UI for logged out state
    updateLoggedOutUI() {
        console.log('🎨 Updating UI for logged out state');
        
        const showLoginBtn = document.getElementById('showLoginBtn');
        const userInfo = document.getElementById('userInfo');
        const businessName = document.getElementById('businessName');
        
        if (showLoginBtn) showLoginBtn.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (businessName) businessName.textContent = 'Ava Solutions';
        
        // Show all navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.style.display = '';
        });
    }

    // Update navigation based on user permissions
    updateNavigation() {
        if (!this.currentUser || !this.currentUser.permissions) return;
        
        const permissions = this.currentUser.permissions;
        
        // Map navigation items to permissions
        const navPermissions = {
            'dashboard': permissions.dashboard,
            'pos': permissions.pos,
            'expenses': permissions.pos, // POS users can view expenses
            'bookings': permissions.bookings,
            'products': permissions.products,
            'inventory': permissions.inventory,
            'employees': permissions.employees,
            'rooms': permissions.rooms,
            'chatbot': permissions.chatbot,
            'settings': permissions.settings,
            'therapist-portal': permissions.therapistPortal,
            'timer': permissions.timer
        };
        
        // Update navigation visibility
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            const hasPermission = navPermissions[page];
            
            if (hasPermission !== undefined) {
                item.style.display = hasPermission ? '' : 'none';
                console.log(`${hasPermission ? '✅' : '🚫'} ${page} for ${this.currentUser.role}`);
            }
        });
        
        console.log('🧭 Navigation updated for role:', this.currentUser.role);
    }

    // Update role-specific elements
    updateRoleElements() {
        // Update therapist portal link
        if (this.currentUser.role === 'therapist') {
            // Enable therapist portal features
            console.log('👩‍⚕️ Therapist features enabled');
        }
        
        // Update manager features
        if (['owner', 'manager'].includes(this.currentUser.role)) {
            // Enable management features
            console.log('👔 Management features enabled');
        }
    }

    // Logout
    async logout() {
        console.log('🚪 Logging out...');
        
        try {
            // Could call backend logout endpoint if needed
            // await fetch(`${this.apiBaseUrl}/auth/logout`, { ... });
            
            this.clearSession();
            this.updateUI();
            
            this.showNotification('Logged out successfully', 'info');
            console.log('✅ Logout complete');
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if backend call fails
            this.clearSession();
            this.updateUI();
        }
    }

    // Clear session data
    clearSession() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;
        
        // Clear all storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        
        // Clear legacy auth data
        this.clearLegacyAuthData();
    }

    // Clear legacy authentication data
    clearLegacyAuthData() {
        const legacyKeys = [
            'universal_user', 'universal_token', 'universal_login_time',
            'simple_user', 'simple_token',
            'currentUser', 'authToken', 'isLoggedIn',
            'activeEmployeeRole', 'therapistAuth', 'userToken',
            'userData', 'avas_auth_token', 'avas_session_info',
            'immediate_session', 'activeUserId'
        ];
        
        legacyKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        console.log('🧹 Legacy auth data cleared');
    }

    // Hide login modal
    hideLoginModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Clear form inputs
        this.clearLoginForm();
    }

    // Clear login form
    clearLoginForm() {
        const inputs = document.querySelectorAll('#authLoginForm input, #authRegisterForm input');
        inputs.forEach(input => {
            if (input.type !== 'checkbox') {
                input.value = '';
            } else {
                input.checked = false;
            }
        });
    }

    // Show error message
    showError(message) {
        console.error('Auth Error:', message);
        
        // Try to use existing notification system
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            // Fallback alert
            alert('Error: ' + message);
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Clear login errors
    clearLoginErrors() {
        // Could implement error display clearing here
    }

    // Set login loading state
    setLoginLoading(loading) {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.disabled = loading;
            loginBtn.innerHTML = loading 
                ? '<i class="fas fa-spinner fa-spin"></i> Signing in...'
                : '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }

    // Set register loading state
    setRegisterLoading(loading) {
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.disabled = loading;
            registerBtn.innerHTML = loading 
                ? '<i class="fas fa-spinner fa-spin"></i> Creating account...'
                : '<i class="fas fa-user-plus"></i> Create Account';
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get auth token
    getAuthToken() {
        return this.authToken;
    }

    // Check if user is logged in
    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    // Check if user has permission
    hasPermission(permission) {
        if (!this.currentUser || !this.currentUser.permissions) return false;
        return this.currentUser.permissions[permission] === true;
    }

    // Check if user has role
    hasRole(role) {
        if (!this.currentUser) return false;
        if (Array.isArray(role)) {
            return role.includes(this.currentUser.role);
        }
        return this.currentUser.role === role;
    }
}

// Create global instance
window.unifiedAuth = new UnifiedAuth();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.unifiedAuth.init(), 500);
    });
} else {
    setTimeout(() => window.unifiedAuth.init(), 500);
}

// Global functions for easy access
window.login = () => window.unifiedAuth.showLoginModal();
window.logout = () => window.unifiedAuth.logout();

console.log('🔐 Unified Auth System loaded');
