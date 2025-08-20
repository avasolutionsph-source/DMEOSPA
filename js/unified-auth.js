// Unified MongoDB Authentication System
class UnifiedAuth {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;
        this.apiBaseUrl = 'http://localhost:4000/api'; // PWA Backend
        this.marketingApiUrl = 'https://ava-marketing-api.onrender.com/api'; // Marketing API
        this.onAuthChange = null; // Callback for auth state changes
        
        console.log('🔐 Unified Auth System initialized');
    }

    // Initialize authentication system
    async init() {
        console.log('🚀 Initializing Unified Auth...');
        
        // Disable any competing auth systems first
        window.disableOldAuthSystems();
        
        // Check for existing session
        const sessionRestored = await this.checkExistingSession();
        console.log('🔍 Session restoration result:', sessionRestored);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Add page visibility change handler to prevent logout on tab switches
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('👁️ Page hidden - maintaining auth state');
            } else {
                console.log('👁️ Page visible - auth state maintained');
            }
        });
        
        console.log('✅ Unified Auth ready');
    }

    // Check for existing valid session
    async checkExistingSession() {
        try {
            // Prefer unified keys
            let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            let userData = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');

            // Legacy fallbacks (for users logged in before the update)
            if (!token) {
                token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') ||
                        localStorage.getItem('userToken') || sessionStorage.getItem('userToken') ||
                        localStorage.getItem('universal_token') || sessionStorage.getItem('universal_token') ||
                        localStorage.getItem('simple_token') || sessionStorage.getItem('simple_token');
            }
            if (!userData) {
                userData = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') ||
                           localStorage.getItem('userData') || sessionStorage.getItem('userData') ||
                           localStorage.getItem('universal_user') || sessionStorage.getItem('universal_user') ||
                           localStorage.getItem('simple_user') || sessionStorage.getItem('simple_user');
            }
            
            if (token && userData) {
                // IMMEDIATELY restore session for seamless experience
                this.authToken = token;
                this.currentUser = JSON.parse(userData);
                this.isLoggedIn = true;
                
                console.log('🚀 Session restored immediately (no logout flicker):', this.currentUser.email);
                this.updateUI();
                
                // Normalize storage to unified keys
                try {
                    localStorage.setItem('auth_token', token);
                    localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
                } catch (_) {}

                // Validate token in background (don't wait for it)
                this.validateTokenInBackground(token);

                // Sync business data for branch accounts (in background)
                if (this.currentUser.role !== 'owner' && this.currentUser.businessId) {
                    console.log('🔄 Branch account session restored, syncing latest data...');
                    db.syncBranchAccountData(this.currentUser).catch(error => {
                        console.warn('⚠️ Background sync failed (non-critical):', error);
                    });
                }
                
                return true;
            }
            
            // Clear invalid session data
            this.clearSession();
        } catch (error) {
            console.warn('Session restoration failed:', error);
            this.clearSession();
        }
        
        return false;
    }

    // Background token validation (doesn't affect UI immediately)
    async validateTokenInBackground(token) {
        try {
            console.log('🔍 Validating token in background...');
            const isValid = await this.validateToken(token);
            
            if (!isValid) {
                console.warn('⚠️ Background token validation failed - session will be cleared');
                this.showNotification('Session expired. Please log in again.', 'warning');
                setTimeout(() => {
                    this.clearSession();
                    this.updateUI();
                }, 3000); // Give user time to see the warning
            } else {
                console.log('✅ Background token validation successful');
            }
        } catch (error) {
            console.warn('Background token validation error:', error);
            // Don't clear session on network errors - keep user logged in
        }
    }

    // Validate token with backend (with offline support and multiple endpoints)
    async validateToken(token) {
        // First try local token expiry check (fastest)
        try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            const isExpired = tokenData.exp && tokenData.exp < now;
            
            if (isExpired) {
                console.log('❌ Token expired locally');
                return false;
            }
            
            console.log('✅ Token not expired locally, checking with backend...');
        } catch (parseError) {
            console.error('Failed to parse token locally:', parseError);
            // Continue to backend validation if local parsing fails
        }

        // Try PWA backend first
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.valid) {
                    console.log('✅ Token validated with PWA backend');
                    return true;
                }
            }
        } catch (pwaError) {
            console.warn('⚠️ PWA backend unavailable:', pwaError.message);
        }

        // Try marketing API as fallback
        try {
            const response = await fetch(`${this.marketingApiUrl}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.valid) {
                    console.log('✅ Token validated with Marketing API');
                    return true;
                }
            }
        } catch (marketingError) {
            console.warn('⚠️ Marketing API unavailable:', marketingError.message);
        }

        // If both backends are unavailable, keep session if token hasn't expired locally
        try {
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            const isExpired = tokenData.exp && tokenData.exp < now;
            
            if (!isExpired) {
                console.log('⚠️ All backends unavailable but token not expired - maintaining session (offline mode)');
                return true; // Keep session for offline use
            }
        } catch (parseError) {
            console.error('Failed to parse token for offline validation:', parseError);
        }

        console.log('❌ Token validation failed on all endpoints');
        return false;
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
        
        // Sync business data for branch accounts
        if (user.role !== 'owner' && user.businessId) {
            console.log('🔄 Branch account detected, syncing business data...');
            try {
                // Ensure database is ready before syncing
                if (window.ensureDBInit) {
                    await window.ensureDBInit();
                }
                
                if (db && db.syncBranchAccountData) {
                    await db.syncBranchAccountData(user);
                    console.log('✅ Branch data sync completed');
                } else {
                    console.warn('⚠️ Database not ready for branch sync');
                }
            } catch (syncError) {
                console.warn('⚠️ Branch data sync failed (non-critical):', syncError);
            }
        }
        
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
        
        // Emit event to reinitialize handlers
        if (window.eventBus) {
            window.eventBus.emit('auth:login', this.currentUser);
        }
        
        // Dispatch custom event for compatibility
        window.dispatchEvent(new CustomEvent('auth:ready', { detail: this.currentUser }));
        
        // Reinitialize handlers after a short delay
        setTimeout(() => {
            if (window.eventHandlerFix && window.eventHandlerFix.reinitialize) {
                window.eventHandlerFix.reinitialize();
            }
        }, 100);
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
            'expenses': permissions.expenses || permissions.pos, // Use explicit expenses permission or fallback to POS
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

// Create alias for compatibility
window.authSystem = window.unifiedAuth;

// Disable old auth systems immediately
window.disableOldAuthSystems = function() {
    // Keep window.authSystem as alias to unifiedAuth, don't null it
    console.log('✅ Using unified auth system');
    if (window.permanentAuth) {
        window.permanentAuth = null;
        console.log('🚫 Disabled permanentAuth');
    }
    if (window.universalLogin) {
        window.universalLogin = null;
        console.log('🚫 Disabled universalLogin');
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.disableOldAuthSystems();
        setTimeout(() => window.unifiedAuth.init(), 500);
    });
} else {
    window.disableOldAuthSystems();
    setTimeout(() => window.unifiedAuth.init(), 500);
}

// Global functions for easy access
window.login = () => window.unifiedAuth.showLoginModal();
window.logout = () => window.unifiedAuth.logout();

// Debug function to check auth state
window.debugAuth = function() {
    console.log('🔍 AUTH DEBUG:', {
        unifiedAuthExists: !!window.unifiedAuth,
        isLoggedIn: window.unifiedAuth?.isLoggedIn,
        currentUser: window.unifiedAuth?.currentUser,
        authToken: !!window.unifiedAuth?.authToken,
        localStorageToken: !!localStorage.getItem('auth_token'),
        sessionStorageToken: !!sessionStorage.getItem('auth_token'),
        localStorageUser: !!localStorage.getItem('auth_user'),
        sessionStorageUser: !!sessionStorage.getItem('auth_user'),
        conflictingAuthSystems: {
            authSystem: !!window.authSystem,
            permanentAuth: !!window.permanentAuth,
            universalLogin: !!window.universalLogin
        }
    });
};

console.log('🔐 Unified Auth System loaded');
console.log('💡 Use window.debugAuth() to troubleshoot login issues');
