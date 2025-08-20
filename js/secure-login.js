// Secure Login Manager - No Local Data Caching
class SecureLoginManager {
    constructor() {
        this.apiUrl = 'https://ava-marketing-api.onrender.com';
        this.currentSession = null;
    }

    // Secure login that always checks MongoDB first
    async secureLogin(email, password, rememberMe = false) {
        console.log('🔐 Starting secure login process...');
        
        try {
            // Step 1: Clear any existing local data to prevent bleed
            await this.clearAllLocalData();
            
            // Step 2: Authenticate with MongoDB
            const response = await fetch(`${this.apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password: password
                })
            });

            const loginData = await response.json();

            if (response.ok && loginData.success) {
                console.log('✅ MongoDB authentication successful');
                console.log('👤 User data from MongoDB:', {
                    email: loginData.user.email,
                    role: loginData.user.role,
                    businessName: loginData.user.businessName,
                    features: loginData.features
                });

                // Step 3: Set session with server data only
                await this.setSecureSession(loginData, rememberMe);
                
                return {
                    success: true,
                    user: loginData.user,
                    token: loginData.token,
                    features: loginData.features
                };
            } else {
                console.log('❌ MongoDB authentication failed:', loginData.message);
                return {
                    success: false,
                    message: loginData.message || 'Invalid credentials'
                };
            }
        } catch (error) {
            console.error('❌ Secure login error:', error);
            return {
                success: false,
                message: 'Login failed. Please check your connection and try again.'
            };
        }
    }

    // Set session with server data (no local user caching)
    async setSecureSession(loginData, rememberMe) {
        console.log('🔐 Setting secure session...');
        
        // Only store the token - never store user data locally
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('authToken', loginData.token);
        
        // Clear any cached user data
        this.clearUserDataCache();
        
        // Set current session in memory only
        this.currentSession = {
            user: loginData.user,
            token: loginData.token,
            features: loginData.features,
            loginTime: Date.now()
        };
        
        console.log('✅ Secure session established');
    }

    // Get current user data (always from server)
    async getCurrentUser() {
        const token = this.getToken();
        if (!token) {
            return null;
        }

        try {
            console.log('🌐 Fetching current user from server...');
            const response = await fetch(`${this.apiUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('✅ Fresh user data from server:', userData.user.role);
                return userData;
            } else {
                console.log('❌ Server rejected token, clearing session');
                await this.clearSession();
                return null;
            }
        } catch (error) {
            console.error('❌ Error fetching user data:', error);
            return null;
        }
    }

    // Validate session with server
    async validateSession() {
        const token = this.getToken();
        if (!token) {
            return false;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/auth/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update session with fresh data
                    this.currentSession = {
                        user: data.user,
                        token: token,
                        features: data.features,
                        loginTime: this.currentSession?.loginTime || Date.now()
                    };
                    return true;
                }
            }
            
            console.log('❌ Session validation failed');
            await this.clearSession();
            return false;
        } catch (error) {
            console.error('❌ Session validation error:', error);
            await this.clearSession();
            return false;
        }
    }

    // Get features for current user (from server)
    async getUserFeatures() {
        const userData = await this.getCurrentUser();
        return userData?.features || {};
    }

    // Get user role (from server)
    async getUserRole() {
        const userData = await this.getCurrentUser();
        return userData?.user?.role || null;
    }

    // Clear all local data to prevent data bleed
    async clearAllLocalData() {
        console.log('🧹 Clearing all local data...');
        
        // Clear storage
        const allKeys = [
            'authToken', 'userToken', 'currentUser', 'userData', 
            'isLoggedIn', 'subscriptionPlan', 'businessName',
            'businessConfig', 'lastSync', 'therapistAuth',
            'employeeData', 'activeEmployeeRole', 'managerAssigned'
        ];
        
        allKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // Clear in-memory session
        this.currentSession = null;

        // Clear role manager
        if (window.roleManager) {
            window.roleManager.activeEmployee = null;
        }

        // Clear database
        try {
            if (window.db) {
                const stores = [
                    'products', 'inventory', 'employees', 'transactions',
                    'customers', 'bookings', 'rooms', 'sessions'
                ];
                for (const store of stores) {
                    await window.db.clearStore(store);
                }
            }
        } catch (error) {
            console.warn('Could not clear some database stores:', error);
        }
    }

    // Clear user data cache only
    clearUserDataCache() {
        const userDataKeys = [
            'currentUser', 'userData', 'businessName', 'businessConfig'
        ];
        
        userDataKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    // Get token from storage
    getToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    // Clear session
    async clearSession() {
        console.log('🧹 Clearing session...');
        await this.clearAllLocalData();
        
        // Redirect to login
        if (window.location.pathname !== '/login.html') {
            setTimeout(() => {
                if (window.authSystem && typeof window.authSystem.showLoginModal === 'function') {
                    window.authSystem.showLoginModal();
                }
            }, 100);
        }
    }

    // Secure logout
    async logout() {
        const token = this.getToken();
        
        if (token) {
            try {
                // Notify server of logout
                await fetch(`${this.apiUrl}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.warn('Could not notify server of logout:', error);
            }
        }

        await this.clearSession();
        console.log('✅ Secure logout completed');
    }

    // Check if user is logged in (always validate with server)
    async isLoggedIn() {
        return await this.validateSession();
    }
}

// Global secure login manager
window.secureLoginManager = new SecureLoginManager();

// Override the auth system login to use secure login
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
        showLoading('Signing in...', 'Validating with secure server...');

        try {
            const result = await window.secureLoginManager.secureLogin(email, password, rememberMe);
            
            if (result.success) {
                // Set auth state with server data
                await this.setAuthState(result.user, result.token, rememberMe);
                
                hideLoading();
                setButtonLoading('loginBtn', false);
                
                // Close modal
                try { closeModal('authModal'); } catch(_) {
                    const modal = document.getElementById('authModal');
                    if (modal) modal.style.display = 'none';
                }
                
                showNotification(`Welcome back, ${result.user.businessName || result.user.email}!`, 'success');
                
                // Update UI and initialize session
                this.updateAuthUI();
                await this.initializeUserSession();
                
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Secure login failed:', error);
            hideLoading();
            setButtonLoading('loginBtn', false);
            showNotification(error.message || 'Login failed. Please try again.', 'error');
        }
    };
}

console.log('🔐 Secure Login Manager loaded - no local data caching enabled');
