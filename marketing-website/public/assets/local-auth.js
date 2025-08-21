// Local Authentication Handler for Marketing Website
(function() {
    'use strict';
    
    console.log('🔐 Local Auth Handler initialized');
    
    // Demo accounts database
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
        'admin@test.com': {
            password: 'admin123',
            role: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            businessName: 'Admin Portal'
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
    
    // Override form submission on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            console.log('📝 Login form found, attaching local handler');
            
            // Remove all existing handlers
            const newForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newForm, loginForm);
            
            // Add our local handler
            newForm.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const formData = new FormData(e.target);
                const email = formData.get('email').toLowerCase().trim();
                const password = formData.get('password');
                
                console.log('🔑 Attempting local login for:', email);
                
                // Get submit button
                const submitBtn = newForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                // Show loading
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
                submitBtn.disabled = true;
                
                // Simulate async operation
                setTimeout(() => {
                    // Check if account exists
                    const account = DEMO_ACCOUNTS[email];
                    
                    if (account && (password === account.password || password === 'password')) {
                        // Success - create session
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
                        
                        // Store in all possible keys
                        localStorage.setItem('auth_token', token);
                        localStorage.setItem('authToken', token);
                        localStorage.setItem('userToken', token);
                        localStorage.setItem('auth_user', JSON.stringify(userData));
                        localStorage.setItem('userData', JSON.stringify(userData));
                        localStorage.setItem('user', JSON.stringify(userData));
                        
                        // Show success message
                        showMessage('✅ Login successful! Redirecting...', 'success');
                        
                        // Redirect based on role
                        setTimeout(() => {
                            if (account.role === 'admin') {
                                window.location.href = '/admin.html';
                            } else {
                                window.location.href = '/business-dashboard.html';
                            }
                        }, 1000);
                        
                    } else {
                        // Failed - show error
                        showMessage('❌ Invalid email or password', 'error');
                        
                        // Restore button
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }
                }, 500);
            });
        }
    });
    
    // Helper function to show messages
    function showMessage(message, type) {
        // Find or create message element
        let messageEl = document.getElementById('loginError') || 
                       document.querySelector('.error-message') ||
                       document.querySelector('.success-message');
        
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = type === 'success' ? 'success-message' : 'error-message';
            
            const form = document.getElementById('loginForm');
            if (form) {
                form.insertBefore(messageEl, form.firstChild);
            }
        }
        
        // Style the message
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
        
        // Auto-hide error messages
        if (type === 'error') {
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }
    
    console.log('✅ Local auth handler ready');
})();