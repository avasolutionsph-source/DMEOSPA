// Session Persistence Fix - Maintain Login State on Refresh
class SessionPersistence {
    constructor() {
        this.initializeOnLoad = false;
    }

    // Initialize session persistence
    async init() {
        console.log('🔄 Initializing session persistence...');
        
        // Override window load to restore sessions
        this.setupSessionRestore();
        
        // Prevent logout on refresh
        this.preventRefreshLogout();
        
        // Monitor for session issues
        this.monitorSession();
    }

    // Setup session restore on page load
    setupSessionRestore() {
        const originalLoad = window.onload;
        
        window.addEventListener('load', async () => {
            console.log('📄 Page loaded, checking for existing session...');
            
            // Call original load handler if exists
            if (originalLoad) {
                originalLoad();
            }
            
            // Restore session if permanent auth is available
            if (window.permanentAuth) {
                const restored = await this.restoreSession();
                if (restored) {
                    console.log('✅ Session restored on page load');
                } else {
                    console.log('❌ No session to restore');
                }
            }
        });
    }

    // Restore session without logout
    async restoreSession() {
        try {
            const token = this.getStoredToken();
            if (!token) {
                console.log('❌ No token found for session restore');
                return false;
            }

            console.log('🔄 Attempting session restore with token...');
            
            // Validate session using permanent auth
            const isValid = await window.permanentAuth.validateSession();
            
            if (isValid && window.permanentAuth.currentUser) {
                console.log('✅ Session validation successful');
                
                // Force immediate UI updates
                this.forceCompleteUIRestore(window.permanentAuth.currentUser);
                
                return true;
            } else {
                console.log('❌ Session validation failed');
                return false;
            }
        } catch (error) {
            console.error('❌ Session restore error:', error);
            return false;
        }
    }

    // Force complete UI restoration
    forceCompleteUIRestore(user) {
        console.log('🎨 Force restoring complete UI for:', user.email, 'Role:', user.role);
        
        // 1. Update authentication UI immediately
        this.updateAuthUI(user);
        
        // 2. Apply role restrictions immediately
        this.applyRoleRestrictions(user);
        
        // 3. Update business context
        this.updateBusinessContext(user);
        
        // 4. Force navigation updates
        this.updateNavigationState(user);
        
        // 5. Update feature visibility
        this.updateFeatureVisibility(user);
        
        console.log('✅ Complete UI restore finished');
    }

    // Update authentication UI
    updateAuthUI(user) {
        const showLoginBtn = document.getElementById('showLoginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        
        if (showLoginBtn) {
            showLoginBtn.style.display = 'none';
        }
        
        if (userInfo) {
            userInfo.style.display = 'block';
        }
        
        if (userName) {
            userName.textContent = user.firstName || user.email.split('@')[0];
        }
        
        console.log('✅ Auth UI updated');
    }

    // Apply role restrictions
    applyRoleRestrictions(user) {
        if (window.roleManager) {
            // Set role data first
            if (user.role !== 'owner') {
                window.roleManager.activeEmployee = {
                    id: user.id,
                    name: user.firstName + ' ' + user.lastName || user.email.split('@')[0],
                    role: user.role
                };
            } else {
                window.roleManager.activeEmployee = null;
            }
            
            // Apply restrictions immediately
            window.roleManager.gateNavigationByRole();
            
            console.log('✅ Role restrictions applied for:', user.role);
        }
    }

    // Update business context
    updateBusinessContext(user) {
        const businessNameEl = document.getElementById('businessName');
        if (businessNameEl) {
            businessNameEl.textContent = user.businessName || 'Your Business';
        }
        
        // Update any business-specific elements
        document.querySelectorAll('.business-name').forEach(el => {
            el.textContent = user.businessName || 'Your Business';
        });
    }

    // Update navigation state
    updateNavigationState(user) {
        const rolePermissions = {
            owner: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'chatbot', 'settings'],
            manager: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'settings'],
            therapist: ['dashboard', 'bookings', 'settings', 'timer', 'therapist-portal'],
            receptionist: ['dashboard', 'pos', 'bookings', 'rooms', 'settings', 'inventory']
        };

        const allowedPages = rolePermissions[user.role] || rolePermissions.owner;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            
            if (allowedPages.includes(page)) {
                item.style.display = '';
                item.style.visibility = 'visible';
                item.removeAttribute('aria-hidden');
            } else {
                item.style.display = 'none';
                item.style.visibility = 'hidden';
                item.setAttribute('aria-hidden', 'true');
            }
        });

        // Special handling for therapist portal nav
        const therapistPortalNav = document.getElementById('therapistPortalNav');
        if (therapistPortalNav) {
            if (user.role === 'therapist') {
                therapistPortalNav.style.display = '';
            } else {
                therapistPortalNav.style.display = 'none';
            }
        }
    }

    // Update feature visibility
    updateFeatureVisibility(user) {
        const features = user.features || window.permanentAuth.getFeaturesForRole(user.role);
        
        // Update feature-gated elements
        document.querySelectorAll('[data-feature]').forEach(element => {
            const featureName = element.dataset.feature;
            
            if (features[featureName]) {
                element.classList.remove('feature-locked');
                element.classList.add('feature-available');
                element.removeAttribute('disabled');
            } else {
                element.classList.add('feature-locked');
                element.classList.remove('feature-available');
                element.setAttribute('disabled', 'true');
            }
        });
        
        console.log('✅ Feature visibility updated');
    }

    // Prevent refresh logout
    preventRefreshLogout() {
        // Override window beforeunload to maintain session
        window.addEventListener('beforeunload', () => {
            if (window.permanentAuth?.currentUser) {
                // Save current session state for restore
                const sessionState = {
                    user: window.permanentAuth.currentUser,
                    token: window.permanentAuth.authToken,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('avas_session_restore', JSON.stringify(sessionState));
            }
        });

        // Restore session state on page load
        const restoreState = sessionStorage.getItem('avas_session_restore');
        if (restoreState) {
            try {
                const state = JSON.parse(restoreState);
                // Verify it's recent (within 30 seconds)
                if (Date.now() - state.timestamp < 30000) {
                    console.log('🔄 Restoring session state from refresh...');
                    
                    if (window.permanentAuth) {
                        window.permanentAuth.currentUser = state.user;
                        window.permanentAuth.authToken = state.token;
                        window.permanentAuth.isLoggedIn = true;
                        
                        // Force UI update
                        setTimeout(() => {
                            this.forceCompleteUIRestore(state.user);
                        }, 100);
                    }
                }
                
                // Clean up restore data
                sessionStorage.removeItem('avas_session_restore');
            } catch (error) {
                console.warn('Could not restore session state:', error);
            }
        }
    }

    // Monitor session health
    monitorSession() {
        // Check session every 30 seconds
        setInterval(async () => {
            if (window.permanentAuth?.isLoggedIn) {
                const isStillValid = await window.permanentAuth.validateSession();
                if (!isStillValid) {
                    console.log('⚠️ Session became invalid, forcing logout');
                    await window.permanentAuth.clearSession();
                }
            }
        }, 30000);
        
        console.log('🔍 Session monitoring started');
    }

    // Get stored token
    getStoredToken() {
        return localStorage.getItem('avas_auth_token') || sessionStorage.getItem('avas_auth_token');
    }

    // Force session restore (emergency function)
    async forceRestore() {
        console.log('🚨 Force restoring session...');
        
        const token = this.getStoredToken();
        if (token && window.permanentAuth) {
            const restored = await window.permanentAuth.validateSession();
            if (restored) {
                this.forceCompleteUIRestore(window.permanentAuth.currentUser);
                showNotification('Session restored successfully', 'success');
            } else {
                showNotification('Could not restore session - please login again', 'error');
            }
        }
    }
}

// Global session persistence
window.sessionPersistence = new SessionPersistence();

// Initialize session persistence immediately
window.sessionPersistence.init();

// Expose force restore for debugging
window.forceRestoreSession = () => window.sessionPersistence.forceRestore();

console.log('🔄 Session Persistence System loaded - prevents refresh logout');
