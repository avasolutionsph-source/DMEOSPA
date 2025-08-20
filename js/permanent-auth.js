// Permanent Authentication System - Self-Contained and Reliable
class PermanentAuthSystem {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;
        this.userDatabase = this.initializeUserDatabase();
    }

    // Initialize built-in user database
    initializeUserDatabase() {
        // Check if users database exists in localStorage
        let users = localStorage.getItem('avas_users_db');
        if (users) {
            try {
                return JSON.parse(users);
            } catch (e) {
                console.warn('Corrupted user database, reinitializing...');
            }
        }

        // Create default user database
        const defaultUsers = {
            'owner@spa.com': {
                id: 'user_owner_001',
                email: 'owner@spa.com',
                passwordHash: this.hashPassword('owner123'),
                role: 'owner',
                businessName: 'Your Spa Business',
                firstName: 'Business',
                lastName: 'Owner',
                createdAt: new Date().toISOString(),
                features: {
                    dashboard: true, pos: true, inventory: true, employees: true,
                    bookings: true, settings: true, products: true, rooms: true, 
                    chatbot: true, analytics: true, reports: true
                },
                isActive: true
            }
        };

        this.saveUserDatabase(defaultUsers);
        return defaultUsers;
    }

    // Simple password hashing (for demo - use proper hashing in production)
    hashPassword(password) {
        // Simple hash for demo purposes - replace with bcrypt in production
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Save user database to localStorage
    saveUserDatabase(users) {
        localStorage.setItem('avas_users_db', JSON.stringify(users));
    }

    // Permanent login system
    async login(email, password, rememberMe = false) {
        console.log('🔐 Permanent auth: Login attempt for:', email);
        
        try {
            // Clear any previous session data first
            await this.clearPreviousSession();

            // Check credentials against local database
            const users = this.userDatabase;
            const user = users[email.toLowerCase()];

            if (!user) {
                return {
                    success: false,
                    message: 'Account not found. Please contact admin to create your account.'
                };
            }

            if (!user.isActive) {
                return {
                    success: false,
                    message: 'Account is deactivated. Please contact admin.'
                };
            }

            // Verify password
            const passwordHash = this.hashPassword(password);
            if (user.passwordHash !== passwordHash) {
                return {
                    success: false,
                    message: 'Invalid password.'
                };
            }

            // Generate secure session token
            const token = this.generateSecureToken(user);
            
            // Set authentication state
            await this.setAuthenticationState(user, token, rememberMe);

            console.log('✅ Permanent auth successful for:', user.email, 'Role:', user.role);

            return {
                success: true,
                user: user,
                token: token,
                features: user.features
            };

        } catch (error) {
            console.error('❌ Permanent auth error:', error);
            return {
                success: false,
                message: 'Login failed. Please try again.'
            };
        }
    }

    // Generate secure token
    generateSecureToken(user) {
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2);
        const userPart = user.email.split('@')[0];
        const rolePart = user.role.substring(0, 3);
        
        return `avas_${rolePart}_${userPart}_${timestamp}_${randomPart}`;
    }

    // Set authentication state
    async setAuthenticationState(user, token, rememberMe) {
        console.log('🔐 Setting permanent authentication state...');
        
        this.currentUser = user;
        this.authToken = token;
        this.isLoggedIn = true;

        // Store only the token and minimal session info
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('avas_auth_token', token);
        storage.setItem('avas_session_start', Date.now().toString());
        
        // Store session info for validation (not user data)
        const sessionInfo = {
            tokenCreated: Date.now(),
            userId: user.id,
            userEmail: user.email,
            userRole: user.role
        };
        storage.setItem('avas_session_info', JSON.stringify(sessionInfo));

        // Update auth system references
        if (window.authSystem) {
            window.authSystem.currentUser = user;
            window.authSystem.authToken = token;
            window.authSystem.isLoggedIn = true;
            window.authSystem.updateAuthUI();
        }

        // Set role manager data
        if (window.roleManager && user.role !== 'owner') {
            window.roleManager.activeEmployee = {
                id: user.id,
                name: user.firstName + ' ' + user.lastName || user.email.split('@')[0],
                role: user.role
            };
            localStorage.setItem('activeEmployeeRole', JSON.stringify(window.roleManager.activeEmployee));
        }

        console.log('✅ Authentication state set successfully');
    }

    // Validate session
    async validateSession() {
        const token = this.getStoredToken();
        if (!token) {
            return false;
        }

        try {
            // Parse token to get user info
            const parts = token.split('_');
            if (parts.length < 5 || parts[0] !== 'avas') {
                console.log('❌ Invalid token format');
                return false;
            }

            const sessionInfo = this.getSessionInfo();
            if (!sessionInfo) {
                console.log('❌ No session info found');
                return false;
            }

            // Check if token is expired (24 hours)
            const tokenAge = Date.now() - sessionInfo.tokenCreated;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (tokenAge > maxAge) {
                console.log('❌ Token expired');
                await this.clearSession();
                return false;
            }

            // Get user from database
            const user = this.userDatabase[sessionInfo.userEmail];
            if (!user || !user.isActive) {
                console.log('❌ User not found or inactive');
                await this.clearSession();
                return false;
            }

            // Restore authentication state
            this.currentUser = user;
            this.authToken = token;
            this.isLoggedIn = true;

            // Update auth system references
            if (window.authSystem) {
                window.authSystem.currentUser = user;
                window.authSystem.authToken = token;
                window.authSystem.isLoggedIn = true;
            }

            console.log('✅ Session validated for user:', user.email, 'Role:', user.role);
            return true;

        } catch (error) {
            console.error('❌ Session validation error:', error);
            await this.clearSession();
            return false;
        }
    }

    // Get stored token
    getStoredToken() {
        return localStorage.getItem('avas_auth_token') || sessionStorage.getItem('avas_auth_token');
    }

    // Get session info
    getSessionInfo() {
        const sessionStr = localStorage.getItem('avas_session_info') || sessionStorage.getItem('avas_session_info');
        if (sessionStr) {
            try {
                return JSON.parse(sessionStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // Clear previous session
    async clearPreviousSession() {
        console.log('🧹 Clearing previous session...');
        
        // Clear all authentication data
        const authKeys = [
            'avas_auth_token', 'avas_session_info', 'avas_session_start',
            'authToken', 'userToken', 'currentUser', 'userData', 'isLoggedIn',
            'activeEmployeeRole', 'therapistAuth', 'businessConfig'
        ];
        
        authKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // Clear role manager
        if (window.roleManager) {
            window.roleManager.activeEmployee = null;
        }

        // Clear user-specific database stores
        try {
            if (window.db) {
                const userStores = [
                    'bookings', 'transactions', 'employees', 'customers',
                    'inventory', 'products', 'sessions', 'attendance'
                ];
                for (const store of userStores) {
                    await window.db.clearStore(store);
                }
            }
        } catch (error) {
            console.warn('Could not clear some stores:', error);
        }

        console.log('✅ Previous session cleared');
    }

    // Clear current session
    async clearSession() {
        console.log('🧹 Clearing current session...');
        
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;

        await this.clearPreviousSession();

        // Update UI
        if (window.authSystem) {
            window.authSystem.currentUser = null;
            window.authSystem.authToken = null;
            window.authSystem.isLoggedIn = false;
            window.authSystem.updateAuthUI();
        }

        console.log('✅ Session cleared');
    }

    // Logout
    async logout() {
        console.log('🚪 Logging out...');
        await this.clearSession();
        
        // Show login modal
        setTimeout(() => {
            if (window.authSystem && typeof window.authSystem.showLoginModal === 'function') {
                window.authSystem.showLoginModal();
            }
        }, 100);
    }

    // Create new user account
    async createUser(userData) {
        console.log('👤 Creating new user account...');
        
        const { email, password, role, businessName, firstName, lastName } = userData;
        
        // Validate input
        if (!email || !password || !role) {
            throw new Error('Email, password, and role are required');
        }

        // Check if user already exists
        if (this.userDatabase[email.toLowerCase()]) {
            throw new Error('User already exists');
        }

        // Create user object
        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            email: email.toLowerCase(),
            passwordHash: this.hashPassword(password),
            role: role,
            businessName: businessName || 'Spa Business',
            firstName: firstName || email.split('@')[0],
            lastName: lastName || 'User',
            createdAt: new Date().toISOString(),
            features: this.getFeaturesForRole(role),
            isActive: true
        };

        // Add to database
        this.userDatabase[email.toLowerCase()] = newUser;
        this.saveUserDatabase(this.userDatabase);

        console.log('✅ User created successfully:', email, 'Role:', role);
        return newUser;
    }

    // Get features based on role
    getFeaturesForRole(role) {
        const roleFeatures = {
            owner: {
                dashboard: true, pos: true, inventory: true, employees: true,
                bookings: true, settings: true, products: true, rooms: true,
                chatbot: true, analytics: true, reports: true, therapistPortal: false
            },
            manager: {
                dashboard: true, pos: true, inventory: true, employees: true,
                bookings: true, settings: true, products: true, rooms: true,
                chatbot: false, analytics: true, reports: false, therapistPortal: false
            },
            therapist: {
                dashboard: true, bookings: true, settings: true, timer: true, therapistPortal: true,
                pos: false, inventory: false, employees: false, products: false,
                rooms: false, chatbot: false, analytics: false, reports: false
            },
            receptionist: {
                dashboard: true, pos: true, bookings: true, rooms: true, settings: true,
                inventory: false, employees: false, products: false, chatbot: false,
                analytics: false, reports: false, therapistPortal: false, timer: false
            }
        };

        return roleFeatures[role] || roleFeatures.therapist;
    }

    // Change user password
    async changePassword(email, oldPassword, newPassword) {
        const user = this.userDatabase[email.toLowerCase()];
        if (!user) {
            throw new Error('User not found');
        }

        const oldHash = this.hashPassword(oldPassword);
        if (user.passwordHash !== oldHash) {
            throw new Error('Current password is incorrect');
        }

        user.passwordHash = this.hashPassword(newPassword);
        this.saveUserDatabase(this.userDatabase);

        console.log('✅ Password changed for:', email);
    }

    // Update user role
    async updateUserRole(email, newRole) {
        const user = this.userDatabase[email.toLowerCase()];
        if (!user) {
            throw new Error('User not found');
        }

        user.role = newRole;
        user.features = this.getFeaturesForRole(newRole);
        this.saveUserDatabase(this.userDatabase);

        console.log('✅ Role updated for:', email, 'New role:', newRole);
    }

    // Deactivate user
    async deactivateUser(email) {
        const user = this.userDatabase[email.toLowerCase()];
        if (!user) {
            throw new Error('User not found');
        }

        user.isActive = false;
        this.saveUserDatabase(this.userDatabase);

        console.log('✅ User deactivated:', email);
    }

    // Get all users (admin function)
    getAllUsers() {
        return Object.values(this.userDatabase).map(user => ({
            id: user.id,
            email: user.email,
            role: user.role,
            businessName: user.businessName,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt,
            isActive: user.isActive
        }));
    }

    // Initialize with first-time setup
    async initializeWithSetup() {
        console.log('🔧 Initializing permanent auth system...');
        
        // Check if this is first run
        const hasUsers = Object.keys(this.userDatabase).length > 0;
        
        if (!hasUsers) {
            // Show setup wizard for first user
            this.showFirstTimeSetup();
        } else {
            // Try to restore existing session
            const isValid = await this.validateSession();
            if (isValid) {
                console.log('✅ Existing session restored');
                this.updateAuthUI();
                this.applyRoleRestrictions();
            } else {
                console.log('❌ No valid session, showing login');
                this.showLoginModal();
            }
        }
    }

    // First-time setup wizard
    showFirstTimeSetup() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-rocket"></i> Welcome to Ava Solutions</h2>
                </div>
                <div class="modal-body">
                    <p>Let's set up your first admin account to get started:</p>
                    
                    <div class="form-group">
                        <label>Business Name</label>
                        <input type="text" id="setupBusinessName" class="form-input" placeholder="Your Spa Business" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Admin Email</label>
                        <input type="email" id="setupEmail" class="form-input" placeholder="admin@yourbusiness.com" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="setupPassword" class="form-input" placeholder="Choose a secure password" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" id="setupConfirmPassword" class="form-input" placeholder="Confirm your password" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Your Name</label>
                        <input type="text" id="setupFirstName" class="form-input" placeholder="First Name" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="completeSetupBtn">
                        <i class="fas fa-check"></i> Create Admin Account
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle setup completion
        document.getElementById('completeSetupBtn').onclick = async () => {
            await this.completeFirstTimeSetup(modal);
        };
    }

    // Complete first-time setup
    async completeFirstTimeSetup(modal) {
        try {
            const businessName = document.getElementById('setupBusinessName').value.trim();
            const email = document.getElementById('setupEmail').value.trim();
            const password = document.getElementById('setupPassword').value;
            const confirmPassword = document.getElementById('setupConfirmPassword').value;
            const firstName = document.getElementById('setupFirstName').value.trim();

            // Validation
            if (!businessName || !email || !password || !firstName) {
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

            // Create admin user
            const adminUser = await this.createUser({
                email: email,
                password: password,
                role: 'owner',
                businessName: businessName,
                firstName: firstName,
                lastName: 'Admin'
            });

            // Auto-login the new admin user
            const token = this.generateSecureToken(adminUser);
            await this.setAuthenticationState(adminUser, token, true);

            modal.remove();
            showNotification(`Welcome to Ava Solutions, ${firstName}!`, 'success');
            
            // Initialize the app
            this.updateAuthUI();
            this.applyRoleRestrictions();

        } catch (error) {
            console.error('Setup error:', error);
            showNotification(error.message || 'Setup failed. Please try again.', 'error');
        }
    }

    // Show login modal
    showLoginModal() {
        if (window.authSystem && typeof window.authSystem.showLoginModal === 'function') {
            window.authSystem.showLoginModal();
        }
    }

    // Update authentication UI
    updateAuthUI() {
        if (window.authSystem && typeof window.authSystem.updateAuthUI === 'function') {
            window.authSystem.updateAuthUI();
        }
    }

    // Apply role restrictions
    applyRoleRestrictions() {
        if (window.roleManager && this.currentUser?.role !== 'owner') {
            console.log('🔒 Applying role restrictions for:', this.currentUser.role);
            window.roleManager.gateNavigationByRole();
        }
    }

    // Get current user (from memory, not storage)
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user has feature
    hasFeature(feature) {
        return this.currentUser?.features?.[feature] || false;
    }

    // Admin function: List all users
    listAllUsers() {
        if (this.currentUser?.role !== 'owner') {
            throw new Error('Access denied. Admin only.');
        }
        return this.getAllUsers();
    }

    // Admin function: Reset user password
    async resetUserPassword(email, newPassword) {
        if (this.currentUser?.role !== 'owner') {
            throw new Error('Access denied. Admin only.');
        }

        const user = this.userDatabase[email.toLowerCase()];
        if (!user) {
            throw new Error('User not found');
        }

        user.passwordHash = this.hashPassword(newPassword);
        this.saveUserDatabase(this.userDatabase);

        console.log('✅ Password reset for:', email);
    }
}

// Replace existing auth systems
window.permanentAuth = new PermanentAuthSystem();

// Override the existing auth system
window.addEventListener('DOMContentLoaded', () => {
    // Replace auth system methods
    if (window.authSystem) {
        const originalHandleLogin = window.authSystem.handleLogin;
        window.authSystem.handleLogin = async function() {
            const email = document.getElementById('loginEmail')?.value?.trim();
            const password = document.getElementById('loginPassword')?.value;
            const rememberMe = document.getElementById('rememberMe')?.checked;

            if (!email || !password) {
                showNotification('Please enter email and password', 'error');
                return;
            }

            setButtonLoading('loginBtn', true);
            showLoading('Signing in...', 'Authenticating with permanent system...');

            try {
                const result = await window.permanentAuth.login(email, password, rememberMe);
                
                if (result.success) {
                    hideLoading();
                    setButtonLoading('loginBtn', false);
                    
                    // Close modal
                    try { closeModal('authModal'); } catch(_) {
                        const modal = document.getElementById('authModal');
                        if (modal) modal.style.display = 'none';
                    }
                    
                    showNotification(`Welcome back, ${result.user.businessName}!`, 'success');
                    
                    // Apply role restrictions immediately
                    setTimeout(() => {
                        window.permanentAuth.applyRoleRestrictions();
                    }, 100);
                    
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Login failed:', error);
                hideLoading();
                setButtonLoading('loginBtn', false);
                showNotification(error.message || 'Login failed. Please try again.', 'error');
            }
        };

        // Override logout
        const originalHandleLogout = window.authSystem.handleLogout;
        window.authSystem.handleLogout = async function() {
            await window.permanentAuth.logout();
        };

        // Override auth state loading
        const originalLoadAuthState = window.authSystem.loadAuthState;
        window.authSystem.loadAuthState = async function() {
            return await window.permanentAuth.validateSession();
        };
    }
});

console.log('🔐 Permanent Authentication System loaded - self-contained and reliable');
