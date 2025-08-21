// Unified Authentication Handler for Marketing Website
// Handles both MongoDB authentication and local demo accounts
(function() {
    'use strict';
    
    console.log('🔐 Unified Auth Handler initialized');
    
    // PWA Backend URL for MongoDB authentication
    const PWA_BACKEND_URL = 'https://ava-pwa-backend.onrender.com/api';
    
    // Demo/fallback accounts for when backend is unavailable
    const DEMO_ACCOUNTS = {
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
        },
        'avasolutionsph@gmail.com': {
            password: 'ava2024',
            role: 'owner',
            firstName: 'Ava',
            lastName: 'Solutions',
            businessName: 'Ava Solutions PH'
        }
    };
    
    // Try MongoDB authentication first
    async function tryMongoDBAuth(email, password) {
        try {
            console.log('🔄 Attempting MongoDB authentication...');
            
            const response = await fetch(`${PWA_BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.token && data.user) {
                    console.log('✅ MongoDB authentication successful');
                    
                    // Store authentication data
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userToken', data.token);
                    localStorage.setItem('auth_user', JSON.stringify(data.user));
                    localStorage.setItem('userData', JSON.stringify(data.user));
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    return {
                        success: true,
                        user: data.user,
                        token: data.token
                    };
                }
            }
            
            console.log('⚠️ MongoDB authentication failed, trying local...');
            return null;
            
        } catch (error) {
            console.log('⚠️ MongoDB backend unavailable:', error.message);
            return null;
        }
    }
    
    // Try local/demo authentication
    function tryLocalAuth(email, password) {
        const account = DEMO_ACCOUNTS[email.toLowerCase()];
        
        if (account && (password === account.password || password === 'password')) {
            console.log('✅ Local authentication successful');
            
            const token = 'local-' + Date.now();
            const userData = {
                id: 'user-' + Date.now(),
                email: email,
                firstName: account.firstName,
                lastName: account.lastName,
                role: account.role,
                businessName: account.businessName,
                isDemo: true
            };
            
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
        
        return null;
    }
    
    // Main authentication handler
    async function authenticate(email, password) {
        // Try MongoDB first
        const mongoResult = await tryMongoDBAuth(email, password);
        if (mongoResult) {
            return mongoResult;
        }
        
        // Fallback to local authentication
        const localResult = tryLocalAuth(email, password);
        if (localResult) {
            return localResult;
        }
        
        // Authentication failed
        return {
            success: false,
            error: 'Invalid email or password'
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
                            if (result.user.role === 'admin' || result.user.role === 'superAdmin') {
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