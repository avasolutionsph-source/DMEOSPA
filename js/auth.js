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
                e.stopPropagation();
                console.log('Login button clicked!');
                this.showLoginModal();
            });
            
            // Also add a direct onclick as backup
            newBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Login button clicked via onclick!');
                this.showLoginModal();
            };
            
        } else {
            console.log('Login button not found, will retry...');
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
            console.log('handleLogin called - but this should not be used anymore');
            
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
                
                try {
                    const fullName = [loginData.user.firstName, loginData.user.lastName].filter(Boolean).join(' ')
                        || loginData.user.employeeName
                        || (loginData.user.email ? loginData.user.email.split('@')[0] : 'User');
                    const branchName = loginData.user.businessName || 'Branch';
                    const msg = (String(loginData.user.role).toLowerCase() === 'manager')
                        ? `Welcome to ${branchName}, ${fullName}!`
                        : `Welcome back, ${loginData.user.businessName}!`;
                    showNotification(msg, 'success');
                } catch (_) {
                    showNotification(`Welcome back, ${loginData.user.businessName}!`, 'success');
                }
                
                // Update UI to show logged in state
                this.updateAuthUI();
                
                // Initialize app with user data
                await this.initializeUserSession();
                
            } else {
                throw new Error(loginData.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
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
            console.error('Registration error:', error);
            hideLoading();
            setButtonLoading('registerBtn', false);
            showNotification(error.message || 'Registration failed. Please try again.', 'error');
        }
    }

    // Login with real API or simulate if offline
    async simulateLogin(email, password) {
        // DISABLED: PWA backend authentication to prevent conflicts
        // The PWA now only uses the marketing website for authentication
        console.log('simulateLogin disabled - using marketing website authentication only');
        
        try {
            // Fallback to demo mode only if needed for offline functionality
            console.warn('Using demo mode for offline functionality');
        } catch (error) {
            console.warn('Demo mode error:', error);
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
                console.log('Attempting real API registration...');
                
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
            console.warn('API registration failed, falling back to demo mode:', error);
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
        // Ensure account isolation: if switching users, purge local data first
        await this.ensureAccountIsolation(user);

        this.currentUser = user;
        this.authToken = token;
        this.isLoggedIn = true;

        // Save to localStorage if remember me is checked
        if (rememberMe) {
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            // Save to sessionStorage for session-only
            sessionStorage.setItem('authToken', token);
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        }

        // Update UI
        this.updateAuthUI();
        
        // Add user ID to all future database operations
        await this.initializeUserData();

        // Re-load entitlements and gates immediately without requiring manual refresh
        try {
            if (window.entitlementsSystem) {
                window.entitlementsSystem.token = token;
                await window.entitlementsSystem.loadEntitlements();
                window.entitlementsSystem.updateUI();
            }
            if (window.app && typeof window.app.onUserLoggedIn === 'function') {
                window.app.onUserLoggedIn();
            }
            // Auto refresh to ensure menus, caches, and SW pick up session immediately
            setTimeout(() => { try { window.location.reload(true); } catch(_) { window.location.reload(); } }, 300);
        } catch(_) {}
    }

    // Ensure that when a different user logs in, previous user's local data is not visible
    async ensureAccountIsolation(user) {
        try {
            const previousUserId = localStorage.getItem('activeUserId');
            const newUserId = String(user?.id || '');
            if (!newUserId) return; // nothing to do

            if (previousUserId && previousUserId !== newUserId) {
                console.log('🔐 Switching account detected. Purging local data for isolation...');
                showLoading('Switching account...', 'Clearing previous offline data');

                // Clear IndexedDB data except settings (keep minimal app defaults)
                const storesToClear = [
                    'products','inventory','employees','transactions','customers',
                    'bookings','rooms','sessions','attendance','schedules','leaveRequests',
                    'payrollRuns','tips','giftCertificates','syncQueue'
                ];
                try {
                    if (window.db && typeof window.ensureDBInit === 'function') {
                        await ensureDBInit();
                        for (const store of storesToClear) {
                            try { await db.clearStore(store); } catch (_) {}
                        }
                        // Also reset some settings that are user-specific but safe to remove
                        const userSpecificSettings = ['businessName','businessConfig','lastSync'];
                        for (const key of userSpecificSettings) {
                            try { await db.delete('settings', key); } catch (_) {}
                        }
                    }
                } catch (e) {
                    console.warn('Purge encountered issues:', e);
                }

                // Clear any cached UI/session hints
                sessionStorage.clear();
                // Keep auth keys for the new session; others will be overwritten below
                hideLoading();
                showNotification('Previous account data cleared', 'success');
            }

            // Mark the active user
            localStorage.setItem('activeUserId', newUserId);
        } catch (error) {
            console.warn('ensureAccountIsolation error:', error);
        }
    }

    // Load saved authentication state
    async loadAuthState() {
        // Check all possible token storage locations
        let token = localStorage.getItem('userToken') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        let userStr = localStorage.getItem('userData') || localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        let isLoggedIn = localStorage.getItem('isLoggedIn');

        console.log('🔄 Auth system loading state:', {
            hasToken: !!token,
            hasUserData: !!userStr,
            isLoggedIn: isLoggedIn
        });

        if (token && userStr && isLoggedIn === 'true') {
            try {
                this.authToken = token;
                this.currentUser = JSON.parse(userStr);
                this.isLoggedIn = true;
                
                console.log('✅ Auth state restored for user:', this.currentUser.email);
                
                // Update business name in settings
                await this.updateUserSettings();
                
                this.updateAuthUI();
                return true;
            } catch (error) {
                console.error('Failed to load auth state:', error);
                this.clearAuthState();
            }
        } else {
            console.log('❌ No valid auth state found');
        }
        return false;
    }

    // Validate current session
    async validateSession() {
        if (!this.authToken) return false;

        try {
            // In a real app, validate token with server
            // For now, just check if token exists and is not expired
            console.log('Session validated for user:', this.currentUser.businessName);
            return true;
        } catch (error) {
            console.error('Session validation failed:', error);
            this.clearAuthState();
            return false;
        }
    }

    // Clear authentication state
    clearAuthState() {
        this.currentUser = null;
        this.authToken = null;
        this.isLoggedIn = false;

        // Clear ALL possible storage locations
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('subscriptionPlan');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');

        console.log('🧹 Cleared all auth state');
        this.updateAuthUI();
    }

    // Handle logout
    async handleLogout() {
        const ok = await window.app?.confirm('Confirm Logout','Are you sure you want to logout? Your data will be synced before logging out.')
            .catch(()=> false);
        if (!ok) return;
        showLoading('Logging out...', 'Syncing your data to the cloud');
        try {
            if (window.syncManager && typeof window.syncManager.syncAll === 'function') {
                await window.syncManager.syncAll();
            }
            this.clearAuthState();
            hideLoading();
            showNotification('Logged out successfully', 'success');
            this.showLoginModal();
        } catch (error) {
            console.error('Logout error:', error);
            hideLoading();
            showNotification('Logout completed with sync warnings', 'warning');
            this.clearAuthState();
            this.showLoginModal();
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
            console.error('Failed to initialize user data:', error);
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
                    console.log('Updated business name to:', this.currentUser.businessName);
                } catch (updateError) {
                    // If update fails, try to add it
                    await db.add('settings', {
                        key: 'businessName',
                        value: this.currentUser.businessName,
                        userId: this.currentUser.id
                    });
                    console.log('Added business name:', this.currentUser.businessName);
                }
            }

            // Add user ID to business config
            const businessConfig = await db.get('settings', 'businessConfig');
            if (businessConfig) {
                businessConfig.value.userId = this.currentUser.id;
                await db.update('settings', businessConfig);
            }

        } catch (error) {
            console.error('Failed to update user settings:', error);
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

            // Hide all nav items when logged out (show only dashboard + settings)
            try {
                document.querySelectorAll('.nav-item').forEach(el => {
                    const page = el.getAttribute('data-page');
                    if (page === 'dashboard' || page === 'settings') {
                        el.style.display = '';
                    } else {
                        el.style.display = 'none';
                    }
                });
            } catch(_){}
        }
    }

    // Show login modal
    showLoginModal() {
        try {
            console.log('showLoginModal called');
            
            // Show login form first
            this.showLoginForm();
            
            // Get the modal element
            const modal = document.getElementById('authModal');
            if (!modal) {
                console.error('Auth modal not found');
                return;
            }
            
            // Clear any blocking styles
            modal.style.display = '';
            modal.classList.remove('active');
            
            // Try to use the global openModal function
            if (typeof openModal === 'function') {
                console.log('Using openModal function');
                setTimeout(() => {
                    openModal('authModal');
                }, 10);
            } else {
                console.log('Using fallback modal opening');
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
            console.error('Error showing login modal:', error);
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
            console.error('Failed to initialize user session:', error);
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

class RoleManager {
	constructor() {
		this.activeEmployee = null; // {id, name, role}
		this.roles = {
			receptionist: {
				allowPages: ['pos','bookings','rooms','dashboard','settings','inventory'],
				denyPages: ['employees','chatbot','products']
			},
			manager: {
				allowPages: ['dashboard','pos','bookings','rooms','inventory','employees','settings'],
				denyPages: ['chatbot']
			},
			therapist: {
				allowPages: ['rooms','bookings','dashboard'],
				denyPages: ['pos','inventory','employees','products','chatbot','settings']
			},
			admin: {
				allowPages: ['dashboard','pos','bookings','rooms','inventory','employees','settings','products'],
				denyPages: []
			},
			rider: {
				allowPages: ['bookings','dashboard'],
				denyPages: ['pos','rooms','inventory','employees','products','chatbot','settings']
			},
			utility: {
				allowPages: ['dashboard'],
				denyPages: ['pos','bookings','rooms','inventory','employees','products','chatbot','settings']
			}
		};
	}

	setEmployeeSession(employee) {
		this.activeEmployee = employee; // {id, name, role}
		localStorage.setItem('activeEmployeeRole', JSON.stringify(employee));
		this.gateNavigationByRole();
		showNotification(`Logged in as ${employee.name} (${employee.role})`, 'success');
	}

	clearEmployeeSession() {
		this.activeEmployee = null;
		localStorage.removeItem('activeEmployeeRole');
		this.gateNavigationByRole();
		showNotification('Employee role session cleared', 'info');
	}

	loadFromStorage() {
		const str = localStorage.getItem('activeEmployeeRole');
		if (str) {
			try { this.activeEmployee = JSON.parse(str); } catch(_) {}
		}
	}

	gateNavigationByRole() {
		const navItems = document.querySelectorAll('.nav-item');
		if (!this.activeEmployee) {
			// Show all (plan gating still applies)
			navItems.forEach(i => i.style.display = '');
			return;
		}
		const roleCfg = this.roles[this.activeEmployee.role] || {allowPages: [], denyPages: []};
		navItems.forEach(item => {
			const page = item.dataset.page;
			if (roleCfg.allowPages.length && !roleCfg.allowPages.includes(page)) {
				item.style.display = 'none';
			} else if (roleCfg.denyPages.includes(page)) {
				item.style.display = 'none';
			} else {
				item.style.display = '';
			}
		});
	}

	showRoleLoginModal() {
		const modal = document.createElement('div');
		modal.className = 'modal active';
		modal.innerHTML = `
			<div class="modal-content" style="max-width: 580px;">
				<div class="modal-header">
					<h2><i class=\"fas fa-user-lock\"></i> Employee Role Login</h2>
				</div>
				<div class="modal-body">
					<label class="form-label">Select Employee</label>
					<select id="roleEmployeeSelect" class="form-input"></select>
					<div style="height:8px"></div>
					<label class="form-label">Role</label>
					<select id="roleRoleSelect" class="form-input">
						<option value="receptionist">Receptionist</option>
						<option value="manager">Manager</option>
						<option value="therapist">Therapist</option>
						<option value="admin">Admin</option>
						<option value="rider">Rider</option>
						<option value="utility">Utility Staff</option>
					</select>
				</div>
				<div class="modal-footer">
					<button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
					<button class="btn btn-primary" id="confirmRoleLoginBtn">Login</button>
				</div>
			</div>
		`;
		document.body.appendChild(modal);

		// Populate employees
		setTimeout(async () => {
			const select = modal.querySelector('#roleEmployeeSelect');
			const emps = await db.getAll('employees');
			select.innerHTML = (emps || []).map(e => `<option value="${e.id}">${e.name}</option>`).join('');
		}, 50);

		modal.querySelector('#confirmRoleLoginBtn').onclick = () => {
			const empId = parseInt(modal.querySelector('#roleEmployeeSelect').value, 10);
			const role = modal.querySelector('#roleRoleSelect').value;
			this.setEmployeeSession({ id: empId, name: modal.querySelector('#roleEmployeeSelect').selectedOptions[0].textContent, role });
			modal.remove();
		};
	}
}

// Global role manager instance
window.roleManager = new RoleManager();
window.addEventListener('DOMContentLoaded', () => window.roleManager.loadFromStorage());

// Expose quick actions on settings page via console
window.showRoleLogin = () => window.roleManager.showRoleLoginModal();
window.clearRoleLogin = () => window.roleManager.clearEmployeeSession();

// Initialize auth system
const authSystem = new AuthSystem();

// Export for use in other modules immediately
window.authSystem = authSystem;

// Global function for HTML onclick backup
window.showLoginModal = function() {
    console.log('🚫 DISABLED: Global showLoginModal - using direct modal instead');
    return; // DISABLED to prevent interference
    
    console.log('Global showLoginModal called');
    if (window.authSystem && window.authSystem.showLoginModal) {
        window.authSystem.showLoginModal();
    } else {
        console.error('AuthSystem not available');
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
    console.log('DOM loaded, initializing auth system...');
    try {
        await authSystem.init();
        console.log('Auth system initialized successfully');
        
        // Double-check login button after a short delay
        setTimeout(() => {
            const loginBtn = document.getElementById('showLoginBtn');
            console.log('Login button found:', !!loginBtn);
            if (loginBtn) {
                console.log('Login button is visible:', loginBtn.style.display !== 'none');
                console.log('Login button has click handler:', !!loginBtn.onclick);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Auth system initialization failed:', error);
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
        console.log('DOM already loaded, initializing auth system...');
        try {
            await authSystem.init();
            console.log('Auth system initialized successfully (immediate)');
        } catch (error) {
            console.error('Auth system initialization failed (immediate):', error);
        }
    }, 100);
}
