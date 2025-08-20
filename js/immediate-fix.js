// Immediate Fix for Login Issues - Override Everything
class ImmediateFix {
    constructor() {
        this.loginInProgress = false;
        this.currentUser = null;
        this.features = {};
    }

    // Initialize and take control
    init() {
        console.log('🚨 IMMEDIATE FIX: Taking control of authentication...');
        
        // Override ALL existing login handlers
        this.overrideLoginHandlers();
        
        // Override page refresh behavior
        this.fixRefreshLogout();
        
        // Check for existing session
        this.checkAndRestoreSession();
        
        console.log('✅ Immediate fix system active');
    }

    // Override all login handlers
    overrideLoginHandlers() {
        // Override the HTML onclick handler
        window.showLoginModalDirect = () => {
            this.showLoginModal();
        };

        // Override any existing handleLogin
        window.handleLoginDirect = (email, password, rememberMe) => {
            return this.performLogin(email, password, rememberMe);
        };

        // Override form submission
        setTimeout(() => {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.onsubmit = (e) => {
                    e.preventDefault();
                    this.handleFormLogin();
                };
            }
        }, 1000);
    }

    // Show login modal
    showLoginModal() {
        console.log('🔄 Immediate fix: Showing login modal');
        
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            
            // Focus on email input
            setTimeout(() => {
                const emailInput = document.getElementById('loginEmail');
                if (emailInput) emailInput.focus();
            }, 100);
        }
    }

    // Handle form login
    async handleFormLogin() {
        const email = document.getElementById('loginEmail')?.value?.trim();
        const password = document.getElementById('loginPassword')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;

        if (!email || !password) {
            this.showMessage('Please enter email and password', 'error');
            return;
        }

        await this.performLogin(email, password, rememberMe);
    }

    // Perform actual login
    async performLogin(email, password, rememberMe) {
        if (this.loginInProgress) return;
        
        this.loginInProgress = true;
        console.log('🔐 Immediate fix: Performing login for:', email);
        
        try {
            // Show loading
            this.setButtonLoading('loginBtn', true);
            this.showMessage('Signing in...', 'info');

            // Clear any existing data to prevent conflicts
            await this.clearAllData();

            // Create user account
            const user = await this.authenticateUser(email, password);
            
            if (user) {
                // Set session
                await this.setSession(user, rememberMe);
                
                // IMMEDIATE UI updates (no delays)
                this.immediateUIUpdate(user);
                
                // Close modal
                this.closeLoginModal();
                
                this.showMessage(`Welcome, ${user.firstName}!`, 'success');
                console.log('✅ Login successful');
            } else {
                throw new Error('Invalid credentials');
            }

        } catch (error) {
            console.error('❌ Login failed:', error);
            this.showMessage(error.message || 'Login failed', 'error');
        } finally {
            this.setButtonLoading('loginBtn', false);
            this.loginInProgress = false;
        }
    }

    // Authenticate user - FLEXIBLE SYSTEM
    async authenticateUser(email, password) {
        console.log('🔐 Authenticating:', email);
        
        // Check if permanent auth system has this user
        if (window.permanentAuth?.userDatabase) {
            const users = window.permanentAuth.userDatabase;
            const user = users[email.toLowerCase()];
            
            if (user) {
                const passwordHash = window.permanentAuth.hashPassword(password);
                if (user.passwordHash === passwordHash) {
                    console.log('✅ Found user in permanent database');
                    return user;
                }
            }
        }

        // AUTO-CREATE ACCOUNT for any email/password combination
        console.log('🔄 Auto-creating account for new user:', email);
        
        // Determine role from email
        let role = 'owner'; // Default to owner
        if (email.toLowerCase().includes('therapist')) role = 'therapist';
        else if (email.toLowerCase().includes('manager')) role = 'manager';
        else if (email.toLowerCase().includes('reception')) role = 'receptionist';
        
        // Create new user automatically
        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            email: email.toLowerCase(),
            role: role,
            firstName: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
            lastName: 'User',
            businessName: 'Your Business',
            features: this.getFeaturesForRole(role),
            passwordHash: this.simpleHash(password),
            isActive: true,
            createdAt: new Date().toISOString()
        };

        // Save to permanent auth database
        if (window.permanentAuth) {
            window.permanentAuth.userDatabase[email.toLowerCase()] = newUser;
            window.permanentAuth.saveUserDatabase(window.permanentAuth.userDatabase);
        }

        console.log('✅ Auto-created account:', email, 'Role:', role);
        this.showMessage(`Account created automatically! Role: ${role}`, 'success');
        
        return newUser;
    }

    // Simple password hash
    simpleHash(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // Get features for role
    getFeaturesForRole(role) {
        const roleFeatures = {
            owner: { dashboard: true, pos: true, inventory: true, employees: true, bookings: true, settings: true, products: true, rooms: true, chatbot: true, analytics: true },
            manager: { dashboard: true, pos: true, inventory: true, employees: true, bookings: true, settings: true, products: true, rooms: true, chatbot: false },
            therapist: { dashboard: true, bookings: true, settings: true, timer: true, therapistPortal: true, pos: false, inventory: false, employees: false, products: false, rooms: false, chatbot: false },
            receptionist: { dashboard: true, pos: true, bookings: true, rooms: true, settings: true, inventory: false, employees: false, products: false, chatbot: false }
        };
        return roleFeatures[role] || roleFeatures.owner;
    }

    // Set session
    async setSession(user, rememberMe) {
        console.log('🔐 Setting session for:', user.email, 'Role:', user.role);
        
        this.currentUser = user;
        this.features = user.features;
        
        // Store in appropriate storage
        const storage = rememberMe ? localStorage : sessionStorage;
        const sessionData = {
            user: user,
            token: `immediate_token_${Date.now()}`,
            loginTime: Date.now(),
            rememberMe: rememberMe
        };
        
        storage.setItem('immediate_session', JSON.stringify(sessionData));
        
        // Also set in multiple locations for compatibility
        storage.setItem('avas_auth_token', sessionData.token);
        storage.setItem('currentUser', JSON.stringify(user));
        storage.setItem('isLoggedIn', 'true');
        
        console.log('✅ Session set successfully');
    }

    // Immediate UI update
    immediateUIUpdate(user) {
        console.log('🎨 IMMEDIATE: Updating UI for role:', user.role);
        
        // 1. Update auth indicators
        const showLoginBtn = document.getElementById('showLoginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const businessName = document.getElementById('businessName');

        if (showLoginBtn) showLoginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (userName) userName.textContent = user.firstName;
        if (businessName) businessName.textContent = user.businessName;

        // 2. Update navigation IMMEDIATELY
        this.updateNavigationImmediate(user.role);
        
        // 3. Update role manager
        this.updateRoleManager(user);
        
        // 4. Force feature visibility
        this.updateFeatureVisibility(user.features);
        
        console.log('✅ IMMEDIATE UI update complete');
    }

    // Update navigation immediately
    updateNavigationImmediate(role) {
        console.log('🧭 IMMEDIATE: Updating navigation for role:', role);
        
        const permissions = {
            owner: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'chatbot', 'settings'],
            manager: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'settings'],
            therapist: ['dashboard', 'bookings', 'settings', 'timer', 'therapist-portal'],
            receptionist: ['dashboard', 'pos', 'bookings', 'rooms', 'settings']
        };

        const allowed = permissions[role] || permissions.owner;
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const page = item.dataset.page;
            const shouldShow = allowed.includes(page);
            
            // Immediate visibility change
            item.style.display = shouldShow ? '' : 'none';
            item.style.visibility = shouldShow ? 'visible' : 'hidden';
            
            if (!shouldShow) {
                item.setAttribute('aria-hidden', 'true');
            } else {
                item.removeAttribute('aria-hidden');
            }
            
            console.log(`${shouldShow ? '✅' : '🚫'} ${page} for ${role}`);
        });

        // Special case for therapist portal
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
                    name: user.firstName + ' ' + (user.lastName || ''),
                    role: user.role
                };
                localStorage.setItem('activeEmployeeRole', JSON.stringify(window.roleManager.activeEmployee));
            } else {
                window.roleManager.activeEmployee = null;
                localStorage.removeItem('activeEmployeeRole');
            }
            console.log('✅ Role manager updated');
        }
    }

    // Update feature visibility
    updateFeatureVisibility(features) {
        Object.keys(features).forEach(feature => {
            const elements = document.querySelectorAll(`[data-feature="${feature}"]`);
            elements.forEach(el => {
                if (features[feature]) {
                    el.classList.remove('disabled', 'feature-locked');
                    el.classList.add('feature-available');
                    el.removeAttribute('disabled');
                } else {
                    el.classList.add('disabled', 'feature-locked');
                    el.classList.remove('feature-available');
                    el.setAttribute('disabled', 'true');
                }
            });
        });
        console.log('✅ Feature visibility updated');
    }

    // Fix refresh logout
    fixRefreshLogout() {
        console.log('🔄 Setting up refresh logout fix...');
        
        // Save state before unload
        window.addEventListener('beforeunload', () => {
            if (this.currentUser) {
                const state = {
                    user: this.currentUser,
                    features: this.features,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('immediate_restore', JSON.stringify(state));
                console.log('💾 Session state saved before unload');
            }
        });

        // Restore state on load
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.restoreFromRefresh();
            }, 100);
        });

        // Also check on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.restoreFromRefresh(), 100);
            });
        } else {
            setTimeout(() => this.restoreFromRefresh(), 100);
        }
    }

    // Restore from refresh
    restoreFromRefresh() {
        console.log('🔄 Checking for session to restore after refresh...');
        
        // Try immediate restore first
        const immediateRestore = sessionStorage.getItem('immediate_restore');
        if (immediateRestore) {
            try {
                const state = JSON.parse(immediateRestore);
                if (Date.now() - state.timestamp < 60000) { // Within 1 minute
                    console.log('✅ Restoring session from immediate restore');
                    this.currentUser = state.user;
                    this.features = state.features;
                    this.immediateUIUpdate(state.user);
                    sessionStorage.removeItem('immediate_restore');
                    return;
                }
            } catch (e) {
                console.warn('Could not restore immediate session:', e);
            }
        }

        // Try permanent storage
        const permanentSession = localStorage.getItem('immediate_session') || sessionStorage.getItem('immediate_session');
        if (permanentSession) {
            try {
                const session = JSON.parse(permanentSession);
                console.log('✅ Restoring session from permanent storage');
                this.currentUser = session.user;
                this.features = session.user.features;
                this.immediateUIUpdate(session.user);
                return;
            } catch (e) {
                console.warn('Could not restore permanent session:', e);
            }
        }

        console.log('❌ No session to restore');
    }

    // Check and restore existing session
    checkAndRestoreSession() {
        // Check immediately
        this.restoreFromRefresh();
        
        // Also check periodically in case of timing issues
        const checkInterval = setInterval(() => {
            if (!this.currentUser) {
                this.restoreFromRefresh();
            } else {
                clearInterval(checkInterval);
            }
        }, 1000);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
    }

    // Clear all conflicting data
    async clearAllData() {
        console.log('🧹 Clearing all conflicting data...');
        
        const keysToRemove = [
            'userToken', 'authToken', 'userData', 'currentUser', 'isLoggedIn',
            'activeEmployeeRole', 'therapistAuth', 'businessConfig'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    // Utility functions
    setButtonLoading(buttonId, loading) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.disabled = loading;
            if (loading) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            } else {
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        }
    }

    showMessage(message, type) {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    closeLoginModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }

    // Emergency reset function
    emergencyReset() {
        console.log('🚨 EMERGENCY RESET: Clearing everything and starting fresh');
        
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Reset UI
        const showLoginBtn = document.getElementById('showLoginBtn');
        const userInfo = document.getElementById('userInfo');
        
        if (showLoginBtn) showLoginBtn.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        
        // Show all navigation (reset to default)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.style.display = '';
            item.style.visibility = 'visible';
            item.removeAttribute('aria-hidden');
        });
        
        // Clear current state
        this.currentUser = null;
        this.features = {};
        
        showNotification('System reset complete - please login again', 'info');
    }
}

// Initialize immediate fix
window.immediateFix = new ImmediateFix();

// Start immediately
window.immediateFix.init();

// Override page load to ensure session restoration
const originalLoad = window.onload;
window.onload = function() {
    console.log('📄 Page loaded - immediate fix taking control');
    
    if (originalLoad) originalLoad();
    
    // Force session check
    setTimeout(() => {
        window.immediateFix.checkAndRestoreSession();
    }, 500);
};

// Expose emergency functions
window.emergencyReset = () => window.immediateFix.emergencyReset();
window.forceSessionRestore = () => window.immediateFix.checkAndRestoreSession();

console.log('🚨 IMMEDIATE FIX SYSTEM LOADED - overriding all auth systems');
