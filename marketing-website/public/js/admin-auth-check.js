// ADMIN AUTHENTICATION CHECK
// Ensures only authorized users can access admin panel

(function() {
    'use strict';
    
    console.log('🔒 Admin Auth Check Running...');
    
    // Check authentication
    function checkAdminAuth() {
        const token = localStorage.getItem('adminToken') || 
                     localStorage.getItem('auth_token') || 
                     localStorage.getItem('authToken');
        
        const userData = localStorage.getItem('userData') || 
                        localStorage.getItem('auth_user');
        
        if (!token || !userData) {
            console.log('❌ No authentication found, redirecting to login...');
            window.location.href = '/admin-login.html';
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            
            // Check if user has admin privileges
            if (user.role !== 'admin' && user.role !== 'superAdmin' && !user.isWebsiteOwner) {
                console.log('❌ User does not have admin privileges');
                window.location.href = '/admin-login.html';
                return false;
            }
            
            console.log('✅ Admin authenticated:', user.email);
            
            // Update UI with user info
            updateAdminUI(user);
            
            return true;
        } catch (e) {
            console.error('Error parsing user data:', e);
            window.location.href = '/admin-login.html';
            return false;
        }
    }
    
    // Update admin UI with user info
    function updateAdminUI(user) {
        // Update user name display
        const userNameEl = document.querySelector('.admin-user-name');
        if (userNameEl) {
            userNameEl.textContent = user.firstName + ' ' + user.lastName;
        }
        
        // Update user email display
        const userEmailEl = document.querySelector('.admin-user-email');
        if (userEmailEl) {
            userEmailEl.textContent = user.email;
        }
        
        // Show website owner features
        if (user.isWebsiteOwner || user.email === 'avasolutionsph@gmail.com') {
            console.log('👑 Website owner detected - enabling subscription management');
            
            // Add subscription management menu if not exists
            const adminMenu = document.querySelector('.admin-menu');
            if (adminMenu && !document.querySelector('[data-page="subscriptions"]')) {
                const subscriptionItem = document.createElement('a');
                subscriptionItem.href = '#';
                subscriptionItem.className = 'admin-menu-item';
                subscriptionItem.setAttribute('data-page', 'subscriptions');
                subscriptionItem.innerHTML = '<i class="fas fa-credit-card"></i> Manage Subscriptions';
                subscriptionItem.onclick = function(e) {
                    e.preventDefault();
                    showPage('subscriptions');
                };
                
                // Add before logout if exists, otherwise at the end
                const logoutItem = adminMenu.querySelector('[onclick*="logout"]');
                if (logoutItem) {
                    adminMenu.insertBefore(subscriptionItem, logoutItem);
                } else {
                    adminMenu.appendChild(subscriptionItem);
                }
            }
        }
    }
    
    // Add logout handler
    window.adminLogout = function() {
        console.log('🚪 Logging out...');
        
        // Clear all auth data
        localStorage.removeItem('adminToken');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        
        // Redirect to login
        window.location.href = '/admin-login.html';
    };
    
    // Run auth check on page load
    if (window.location.pathname.includes('admin.html')) {
        checkAdminAuth();
    }
    
    console.log('✅ Admin auth check ready');
    
})();