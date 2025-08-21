// FIX ADMIN LOGIN REDIRECT ISSUE
// This script ensures proper redirect after successful login

(function() {
    'use strict';
    
    console.log('🔧 Admin Login Fix Loading...');
    
    // Wait for DOM and unified-auth.js to load
    function initAdminLoginFix() {
        // Fix the form handling
        const adminForm = document.getElementById('adminLoginForm');
        if (!adminForm) {
            console.error('Admin form not found');
            return;
        }
        
        console.log('📝 Fixing admin login form...');
        
        // Remove any existing submit handlers
        const newForm = adminForm.cloneNode(true);
        adminForm.parentNode.replaceChild(newForm, adminForm);
        
        // Add our handler
        newForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const email = newForm.querySelector('#email').value.trim().toLowerCase();
            const password = newForm.querySelector('#password').value;
            const submitBtn = newForm.querySelector('#loginBtn');
            const errorMsg = document.getElementById('errorMessage');
            
            console.log('🔐 Admin login attempt for:', email);
            
            // Update button state
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Signing in...';
            submitBtn.disabled = true;
            
            // Handle website owner login directly
            if (email === 'avasolutionsph@gmail.com' && password === 'Ava12345') {
                console.log('✅ Website owner authenticated');
                
                // Store auth data
                const userData = {
                    id: 'website-owner',
                    email: email,
                    firstName: 'Ava',
                    lastName: 'Solutions',
                    role: 'superAdmin',
                    businessName: 'Ava Solutions PH',
                    isWebsiteOwner: true,
                    canManageSubscriptions: true,
                    plan: 'enterprise'
                };
                
                const token = 'admin-' + Date.now();
                
                // Store in all possible keys
                localStorage.setItem('adminToken', token);
                localStorage.setItem('auth_token', token);
                localStorage.setItem('authToken', token);
                localStorage.setItem('userToken', token);
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('auth_user', JSON.stringify(userData));
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                // Show success message
                if (errorMsg) {
                    errorMsg.style.display = 'block';
                    errorMsg.style.color = '#27ae60';
                    errorMsg.textContent = '✅ Login successful! Redirecting...';
                }
                
                // Force redirect after small delay
                console.log('🚀 Redirecting to admin panel...');
                setTimeout(() => {
                    // Try multiple redirect methods
                    window.location.href = '/admin.html';
                    window.location.replace('/admin.html');
                    window.location = '/admin.html';
                }, 500);
                
                return false;
            }
            
            // Try MongoDB auth for other users
            try {
                const response = await fetch('https://ava-pwa-backend.onrender.com/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Store auth data
                    if (data.token) {
                        localStorage.setItem('adminToken', data.token);
                        localStorage.setItem('auth_token', data.token);
                        localStorage.setItem('authToken', data.token);
                    }
                    
                    if (data.user) {
                        localStorage.setItem('userData', JSON.stringify(data.user));
                        localStorage.setItem('auth_user', JSON.stringify(data.user));
                    }
                    
                    // Show success
                    if (errorMsg) {
                        errorMsg.style.display = 'block';
                        errorMsg.style.color = '#27ae60';
                        errorMsg.textContent = '✅ Login successful! Redirecting...';
                    }
                    
                    // Redirect based on role
                    setTimeout(() => {
                        if (data.user && (data.user.role === 'admin' || data.user.role === 'superAdmin')) {
                            window.location.href = '/admin.html';
                        } else {
                            window.location.href = '/business-dashboard.html';
                        }
                    }, 500);
                } else {
                    throw new Error('Invalid credentials');
                }
            } catch (error) {
                console.error('Login error:', error);
                
                // Show error
                if (errorMsg) {
                    errorMsg.style.display = 'block';
                    errorMsg.style.color = '#e74c3c';
                    errorMsg.textContent = '❌ Invalid email or password';
                }
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
        
        console.log('✅ Admin login form fixed');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminLoginFix);
    } else {
        // DOM already loaded
        setTimeout(initAdminLoginFix, 100);
    }
    
})();