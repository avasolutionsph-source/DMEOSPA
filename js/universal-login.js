// Universal Login System - Accept Any Credentials
class UniversalLogin {
    constructor() {
        this.isActive = false;
    }

    // Take complete control of login
    takeControl() {
        console.log('🔥 UNIVERSAL LOGIN: Taking complete control...');
        
        this.isActive = true;
        
        // Override the main login button click
        this.overrideLoginButton();
        
        // Override form submission
        this.overrideFormSubmission();
        
        // Fix session persistence
        this.fixSessionPersistence();
        
        console.log('✅ Universal login system active');
    }

    // Override login button
    overrideLoginButton() {
        const loginBtn = document.getElementById('showLoginBtn');
        if (loginBtn) {
            // Remove all existing event listeners
            const newBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newBtn, loginBtn);
            
            // Add our own handler
            newBtn.onclick = () => {
                console.log('🔥 Universal login button clicked');
                this.showLoginModal();
            };
            
            console.log('✅ Login button overridden');
        }
    }

    // Override form submission
    overrideFormSubmission() {
        // Wait for form to exist
        const checkForm = setInterval(() => {
            const form = document.querySelector('#authLoginForm form, #loginForm');
            if (form) {
                clearInterval(checkForm);
                
                // Override form submission
                form.onsubmit = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔥 Universal login form submitted');
                    this.handleLogin();
                    return false;
                };
                
                console.log('✅ Form submission overridden');
            }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(() => clearInterval(checkForm), 5000);
    }

    // Show login modal
    showLoginModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            modal.style.zIndex = '9999';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            
            // Show login form
            const loginForm = document.getElementById('authLoginForm');
            const registerForm = document.getElementById('authRegisterForm');
            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
            
            // Focus email input
            setTimeout(() => {
                const emailInput = document.getElementById('loginEmail');
                if (emailInput) emailInput.focus();
            }, 100);
        }
    }

    // Handle login
    async handleLogin() {
        console.log('🔥 Universal login: handleLogin called');
        
        const email = document.getElementById('loginEmail')?.value?.trim();
        const password = document.getElementById('loginPassword')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;

        if (!email || !password) {
            this.showNotification('Please enter email and password', 'error');
            return;
        }

        // Show loading
        this.setLoading(true);

        try {
            console.log('🔥 Processing login for:', email);
            
            // Create/find user
            const user = await this.createOrFindUser(email, password);
            
            // Set session
            await this.setUserSession(user, rememberMe);
            
            // Update UI IMMEDIATELY
            this.immediateUpdateUI(user);
            
            // Close modal
            this.closeModal();
            
            this.showNotification(`Welcome, ${user.firstName}! (${user.role})`, 'success');
            
            console.log('✅ Universal login successful');
            
        } catch (error) {
            console.error('❌ Universal login failed:', error);
            this.showNotification(error.message || 'Login failed', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Create or find user (accepts any credentials)
    async createOrFindUser(email, password) {
        console.log('👤 Creating/finding user for:', email);
        
        // Determine role from email
        let role = 'owner'; // Default
        if (email.toLowerCase().includes('therapist')) role = 'therapist';
        else if (email.toLowerCase().includes('manager')) role = 'manager';
        else if (email.toLowerCase().includes('reception')) role = 'receptionist';
        else if (email.toLowerCase().includes('admin')) role = 'owner';
        
        // Create user
        const user = {
            id: `univ_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            email: email.toLowerCase(),
            role: role,
            firstName: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
            lastName: 'User',
            businessName: 'Your Spa Business',
            features: this.getFeaturesForRole(role),
            isActive: true,
            createdAt: new Date().toISOString(),
            autoCreated: true
        };

        console.log('✅ User created/found:', user.email, 'Role:', user.role);
        return user;
    }

    // Get features for role
    getFeaturesForRole(role) {
        const features = {
            owner: {
                dashboard: true, pos: true, inventory: true, employees: true,
                bookings: true, settings: true, products: true, rooms: true,
                chatbot: true, analytics: true, therapistPortal: false
            },
            manager: {
                dashboard: true, pos: true, inventory: true, employees: true,
                bookings: true, settings: true, products: true, rooms: true,
                chatbot: false, analytics: false, therapistPortal: false
            },
            therapist: {
                dashboard: true, bookings: true, settings: true, timer: true, therapistPortal: true,
                pos: false, inventory: false, employees: false, products: false,
                rooms: false, chatbot: false, analytics: false
            },
            receptionist: {
                dashboard: true, pos: true, bookings: true, rooms: true, settings: true,
                inventory: false, employees: false, products: false,
                chatbot: false, analytics: false, therapistPortal: false
            }
        };
        
        return features[role] || features.owner;
    }

    // Set user session
    async setUserSession(user, rememberMe) {
        console.log('🔐 Setting universal session...');
        
        // Clear all existing data first
        await this.clearAllExistingData();
        
        // Generate token
        const token = `univ_${user.role}_${Date.now()}_${Math.random().toString(36)}`;
        
        // Set in multiple storage locations for compatibility
        const storage = rememberMe ? localStorage : sessionStorage;
        
        storage.setItem('universal_user', JSON.stringify(user));
        storage.setItem('universal_token', token);
        storage.setItem('universal_login_time', Date.now().toString());
        
        // Also set for compatibility with other systems
        storage.setItem('currentUser', JSON.stringify(user));
        storage.setItem('authToken', token);
        storage.setItem('isLoggedIn', 'true');
        
        // Update all auth systems
        if (window.authSystem) {
            window.authSystem.currentUser = user;
            window.authSystem.authToken = token;
            window.authSystem.isLoggedIn = true;
        }
        
        if (window.permanentAuth) {
            window.permanentAuth.currentUser = user;
            window.permanentAuth.authToken = token;
            window.permanentAuth.isLoggedIn = true;
        }
        
        console.log('✅ Universal session set');
    }

    // Immediate UI update
    immediateUpdateUI(user) {
        console.log('🎨 IMMEDIATE: Updating UI for', user.email, 'Role:', user.role);
        
        // 1. Update authentication display
        const showLoginBtn = document.getElementById('showLoginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const businessName = document.getElementById('businessName');

        if (showLoginBtn) showLoginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (userName) userName.textContent = user.firstName;
        if (businessName) businessName.textContent = user.businessName;

        // 2. Update navigation based on role
        this.updateNavigationByRole(user.role);
        
        // 3. Update role manager
        this.updateRoleManager(user);
        
        // 4. Show success message
        this.showNotification(`Logged in as ${user.firstName} (${user.role})`, 'success');
        
        console.log('✅ IMMEDIATE UI update complete');
    }

    // Update navigation by role
    updateNavigationByRole(role) {
        console.log('🧭 Updating navigation for role:', role);
        
        const rolePermissions = {
            owner: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'chatbot', 'settings'],
            manager: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'settings'],
            therapist: ['dashboard', 'bookings', 'settings', 'timer', 'therapist-portal'],
            receptionist: ['dashboard', 'pos', 'bookings', 'rooms', 'settings']
        };

        const allowedPages = rolePermissions[role] || rolePermissions.owner;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            const isAllowed = allowedPages.includes(page);
            
            if (isAllowed) {
                item.style.display = '';
                item.style.visibility = 'visible';
                item.removeAttribute('aria-hidden');
                console.log(`✅ Showing ${page} for ${role}`);
            } else {
                item.style.display = 'none';
                item.style.visibility = 'hidden';
                item.setAttribute('aria-hidden', 'true');
                console.log(`🚫 Hiding ${page} for ${role}`);
            }
        });

        // Special handling for therapist portal
        const therapistNav = document.getElementById('therapistPortalNav');
        if (therapistNav) {
            therapistNav.style.display = role === 'therapist' ? '' : 'none';
        }
    }

    // Update role manager
    updateRoleManager(user) {
        if (window.roleManager) {
            if (user.role !== 'owner') {
                window.roleManager.activeEmployee = {
                    id: user.id,
                    name: user.firstName + ' ' + user.lastName,
                    role: user.role
                };
                localStorage.setItem('activeEmployeeRole', JSON.stringify(window.roleManager.activeEmployee));
            } else {
                window.roleManager.activeEmployee = null;
                localStorage.removeItem('activeEmployeeRole');
            }
            console.log('✅ Role manager updated for:', user.role);
        }
    }

    // Fix session persistence
    fixSessionPersistence() {
        // Save state on page unload
        window.addEventListener('beforeunload', () => {
            const user = this.getCurrentUser();
            if (user) {
                sessionStorage.setItem('universal_restore', JSON.stringify({
                    user: user,
                    timestamp: Date.now()
                }));
                console.log('💾 Session saved for restore');
            }
        });

        // Restore on page load
        window.addEventListener('load', () => {
            this.restoreSession();
        });

        // Also restore on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.restoreSession(), 200);
            });
        } else {
            setTimeout(() => this.restoreSession(), 200);
        }
    }

    // Restore session
    restoreSession() {
        console.log('🔄 Universal: Checking for session to restore...');
        
        // Check for immediate restore
        const restore = sessionStorage.getItem('universal_restore');
        if (restore) {
            try {
                const data = JSON.parse(restore);
                if (Date.now() - data.timestamp < 60000) { // 1 minute
                    console.log('✅ Restoring session from refresh');
                    this.immediateUpdateUI(data.user);
                    sessionStorage.removeItem('universal_restore');
                    return;
                }
            } catch (e) {}
        }

        // Check for stored session
        const storedUser = localStorage.getItem('universal_user') || sessionStorage.getItem('universal_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                console.log('✅ Restoring stored session for:', user.email);
                this.immediateUpdateUI(user);
                return;
            } catch (e) {}
        }

        console.log('❌ No session to restore');
    }

    // Get current user
    getCurrentUser() {
        const storedUser = localStorage.getItem('universal_user') || sessionStorage.getItem('universal_user');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // Clear all existing data
    async clearAllExistingData() {
        console.log('🧹 Clearing all existing auth data...');
        
        // Clear all possible auth keys
        const authKeys = [
            'userToken', 'authToken', 'userData', 'currentUser', 'isLoggedIn',
            'activeEmployeeRole', 'therapistAuth', 'businessConfig',
            'avas_auth_token', 'avas_session_info', 'immediate_session'
        ];
        
        authKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // Clear role manager
        if (window.roleManager) {
            window.roleManager.activeEmployee = null;
        }
    }

    // Utility functions
    setLoading(loading) {
        const btn = document.getElementById('loginBtn');
        if (btn) {
            btn.disabled = loading;
            btn.innerHTML = loading ? 
                '<i class="fas fa-spinner fa-spin"></i> Signing in...' : 
                '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }

    closeModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showNotification(message, type) {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }

    // Emergency functions
    emergencyLogin(email, role = 'owner') {
        console.log('🚨 EMERGENCY LOGIN:', email, 'as', role);
        
        const user = {
            id: `emergency_${Date.now()}`,
            email: email,
            role: role,
            firstName: email.split('@')[0],
            lastName: 'User',
            businessName: 'Emergency Business',
            features: this.getFeaturesForRole(role)
        };

        this.immediateUpdateUI(user);
        localStorage.setItem('universal_user', JSON.stringify(user));
        localStorage.setItem('universal_token', `emergency_${Date.now()}`);
        
        this.showNotification(`Emergency login successful: ${email} (${role})`, 'success');
    }

    emergencyReset() {
        console.log('🚨 EMERGENCY RESET');
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }
}

// Initialize Universal Login
window.universalLogin = new UniversalLogin();

// Take control when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.universalLogin.takeControl();
        }, 1000);
    });
} else {
    setTimeout(() => {
        window.universalLogin.takeControl();
    }, 1000);
}

// Emergency functions for console
window.emergencyLogin = (email, role) => window.universalLogin.emergencyLogin(email, role);
window.emergencyReset = () => window.universalLogin.emergencyReset();

console.log('🔥 UNIVERSAL LOGIN SYSTEM LOADED - accepts any credentials');
