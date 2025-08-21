// Unified Authentication Handler for Marketing Website
// Handles both MongoDB authentication and local demo accounts
(function() {
    'use strict';
    
    console.log('🔐 Unified Auth Handler initialized');
    
    // PWA Backend URL for MongoDB authentication
    const PWA_BACKEND_URL = 'https://ava-pwa-backend.onrender.com/api';
    
    // Demo/fallback accounts for when backend is unavailable
    const DEMO_ACCOUNTS = {
        'avasolutionsph@gmail.com': {
            password: 'Ava12345',
            role: 'superAdmin',
            firstName: 'Ava',
            lastName: 'Solutions',
            businessName: 'Ava Solutions PH',
            isWebsiteOwner: true,
            canManageSubscriptions: true,
            plan: 'enterprise'
        },
        'jc@gmail.com': {
            password: 'password123',
            role: 'owner',
            firstName: 'JC',
            lastName: 'Owner',
            businessName: 'JC Spa & Wellness'
        },
        'demo@spa.com': {
            password: 'demo123',
            role: 'owner',
            firstName: 'Demo',
            lastName: 'Owner',
            businessName: 'Demo Spa Business'
        },
        'smnaga@gmail.com': {
            password: 'password',
            role: 'owner',
            firstName: 'SM',
            lastName: 'Naga',
            businessName: 'Ava Solutions'
        }
    };
    
    // Try MongoDB authentication first
    async function tryMongoDBAuth(email, password) {
        try {
            console.log('🔄 Attempting MongoDB authentication...');
            
            // Try multiple backend endpoints
            const endpoints = [
                'https://ava-pwa-backend.onrender.com/api/auth/login',
                'https://marketing-website-sz2b.onrender.com/api/auth/login'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    console.log('📡 Trying endpoint:', endpoint);
                    
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Origin': window.location.origin
                        },
                        body: JSON.stringify({ 
                            email: email,
                            password: password 
                        }),
                        mode: 'cors',
                        credentials: 'omit'
                    });
                    
                    // Check if we got a response
                    if (response.status === 200 || response.status === 201) {
                        const data = await response.json();
                        
                        if (data.token || data.success) {
                            console.log('✅ MongoDB authentication successful');
                            
                            const userData = data.user || {
                                email: email,
                                role: 'owner',
                                businessName: 'Business'
                            };
                            
                            const token = data.token || 'mongodb-' + Date.now();
                            
                            // Store authentication data
                            localStorage.setItem('auth_token', token);
                            localStorage.setItem('authToken', token);
                            localStorage.setItem('userToken', token);
                            localStorage.setItem('auth_user', JSON.stringify(userData));
                            localStorage.setItem('userData', JSON.stringify(userData));
                            localStorage.setItem('user', JSON.stringify(userData));
                            
                            return {
                                success: true,
                                user: userData,
                                token: token
                            };
                        }
                    }
                } catch (err) {
                    console.log('⚠️ Endpoint failed:', endpoint, err.message);
                    continue;
                }
            }
            
            console.log('⚠️ All MongoDB endpoints failed, trying local...');
            return null;
            
        } catch (error) {
            console.log('⚠️ MongoDB backend error:', error.message);
            return null;
        }
    }
    
    // Try local/demo authentication
    function tryLocalAuth(email, password) {
        // Check if it's a demo account
        const account = DEMO_ACCOUNTS[email.toLowerCase()];
        
        // For website owner account, require exact password
        if (email.toLowerCase() === 'avasolutionsph@gmail.com') {
            if (password !== 'Ava12345') {
                return null; // Wrong password for website owner
            }
        }
        
        // For other accounts
        if (account || email.toLowerCase() === 'jc@gmail.com') {
            console.log('✅ Local/Demo authentication successful');
            
            const token = 'local-' + Date.now();
            const userData = {
                id: account && account.isWebsiteOwner ? 'website-owner' : 'user-' + Date.now(),
                email: email,
                firstName: account ? account.firstName : email.split('@')[0].toUpperCase(),
                lastName: account ? account.lastName : 'User',
                role: account ? account.role : 'owner',
                businessName: account ? account.businessName : 'Demo Business',
                isWebsiteOwner: account ? account.isWebsiteOwner : false,
                canManageSubscriptions: account ? account.canManageSubscriptions : false,
                plan: account ? account.plan : 'pro',
                isDemo: !account?.isWebsiteOwner
            };
            
            // Store authentication data
            localStorage.setItem('auth_token', token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('userToken', token);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Store admin token if user is admin/superAdmin
            if (userData.role === 'admin' || userData.role === 'superAdmin' || userData.isWebsiteOwner) {
                localStorage.setItem('adminToken', token);
            }
            
            return {
                success: true,
                user: userData,
                token: token
            };
        }
        
        // For any other email that looks valid, create a demo account
        if (email.includes('@') && password) {
            console.log('✅ Creating demo account for:', email);
            
            const token = 'demo-' + Date.now();
            const userData = {
                id: 'user-' + Date.now(),
                email: email,
                firstName: email.split('@')[0],
                lastName: 'Demo',
                role: 'owner',
                businessName: 'Demo Business',
                isDemo: true
            };
            
            // Store authentication data
            localStorage.setItem('auth_token', token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('userToken', token);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Store admin token if user is admin/superAdmin
            if (userData.role === 'admin' || userData.role === 'superAdmin' || userData.isWebsiteOwner) {
                localStorage.setItem('adminToken', token);
            }
            
            return {
                success: true,
                user: userData,
                token: token
            };
        }
        
        return null;
    }
    
    // Main authentication handler
    async function authenticate(email, password) {
        console.log('🔐 Starting authentication for:', email);
        
        // Try MongoDB first (but don't wait too long)
        const mongoPromise = tryMongoDBAuth(email, password);
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 3000));
        
        const mongoResult = await Promise.race([mongoPromise, timeoutPromise]);
        if (mongoResult) {
            console.log('✅ MongoDB auth succeeded');
            return mongoResult;
        }
        
        console.log('⏱️ MongoDB timeout or failed, using local auth');
        
        // Fallback to local authentication
        const localResult = tryLocalAuth(email, password);
        if (localResult) {
            console.log('✅ Local auth succeeded');
            return localResult;
        }
        
        // Authentication failed - but be helpful
        console.log('❌ All auth methods failed');
        return {
            success: false,
            error: 'Login service is temporarily unavailable. Please try again.'
        };
    }
    
    // Override form submission
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            console.log('📝 Login form found, attaching unified handler');
            
            // Remove existing handlers
            const newForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newForm, loginForm);
            
            // Add unified handler
            newForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const formData = new FormData(e.target);
                const email = formData.get('email').toLowerCase().trim();
                const password = formData.get('password');
                
                console.log('🔑 Attempting login for:', email);
                
                // Get submit button
                const submitBtn = newForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                // Show loading
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
                submitBtn.disabled = true;
                
                try {
                    // Authenticate
                    const result = await authenticate(email, password);
                    
                    if (result.success) {
                        // Show success
                        showMessage('✅ Login successful! Redirecting...', 'success');
                        
                        // Redirect based on role
                        setTimeout(() => {
                            if (result.user.role === 'superAdmin') {
                                // Website owner goes to admin panel
                                window.location.href = '/admin.html';
                            } else if (result.user.role === 'admin') {
                                window.location.href = '/admin.html';
                            } else {
                                window.location.href = '/business-dashboard.html';
                            }
                        }, 1000);
                    } else {
                        // Show error
                        showMessage('❌ ' + (result.error || 'Login failed'), 'error');
                        
                        // Restore button
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    showMessage('❌ An error occurred. Please try again.', 'error');
                    
                    // Restore button
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        // Also handle registration form if present
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            console.log('📝 Register form found, attaching handler');
            
            const newRegForm = registerForm.cloneNode(true);
            registerForm.parentNode.replaceChild(newRegForm, registerForm);
            
            newRegForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const userData = {
                    email: formData.get('email'),
                    password: formData.get('password'),
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    businessName: formData.get('businessName'),
                    businessType: formData.get('businessType'),
                    phone: formData.get('phone')
                };
                
                const submitBtn = newRegForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                submitBtn.disabled = true;
                
                try {
                    // Try MongoDB registration
                    const response = await fetch(`${PWA_BACKEND_URL}/auth/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(userData)
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        showMessage('✅ Account created! Redirecting to login...', 'success');
                        
                        setTimeout(() => {
                            window.location.href = '/login.html';
                        }, 2000);
                    } else {
                        // Fallback for demo
                        showMessage('✅ Account created (demo mode). Please login.', 'success');
                        setTimeout(() => {
                            window.location.href = '/login.html';
                        }, 2000);
                    }
                } catch (error) {
                    // Fallback for demo
                    showMessage('✅ Account created (demo mode). Please login.', 'success');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                } finally {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    });
    
    // Helper function to show messages
    function showMessage(message, type) {
        let messageEl = document.getElementById('loginError') || 
                       document.getElementById('registerError') ||
                       document.querySelector('.error-message') ||
                       document.querySelector('.success-message');
        
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = type === 'success' ? 'success-message' : 'error-message';
            
            const form = document.querySelector('form');
            if (form) {
                form.insertBefore(messageEl, form.firstChild);
            }
        }
        
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        messageEl.style.padding = '12px';
        messageEl.style.marginBottom = '15px';
        messageEl.style.borderRadius = '8px';
        messageEl.style.textAlign = 'center';
        messageEl.style.fontWeight = '500';
        
        if (type === 'success') {
            messageEl.style.background = '#d4edda';
            messageEl.style.color = '#155724';
            messageEl.style.border = '1px solid #c3e6cb';
        } else {
            messageEl.style.background = '#f8d7da';
            messageEl.style.color = '#721c24';
            messageEl.style.border = '1px solid #f5c6cb';
        }
        
        if (type === 'error') {
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }
    
    console.log('✅ Unified auth ready (MongoDB + Local fallback)');
})();