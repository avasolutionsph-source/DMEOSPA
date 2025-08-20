// Logout Fix
// Ensures logout button works reliably

(function() {
    console.log('🔧 Initializing logout fix...');
    
    // Function to setup logout button
    function setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) {
            console.log('⚠️ Logout button not found in DOM');
            return;
        }
        
        // Remove any existing listeners first
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        // Add new click handler
        newLogoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🚪 Logout button clicked');
            
            try {
                // Try unified auth first
                if (window.unifiedAuth && typeof window.unifiedAuth.logout === 'function') {
                    console.log('Using unifiedAuth.logout()');
                    await window.unifiedAuth.logout();
                } 
                // Fallback to authSystem
                else if (window.authSystem && typeof window.authSystem.logout === 'function') {
                    console.log('Using authSystem.logout()');
                    await window.authSystem.logout();
                }
                // Last resort: manual cleanup
                else {
                    console.log('⚠️ No auth system found, performing manual logout');
                    
                    // Clear all auth-related storage
                    const authKeys = [
                        'auth_token', 'auth_user',
                        'userToken', 'userData', 'isLoggedIn',
                        'authToken', 'currentUser',
                        'universal_token', 'universal_user',
                        'simple_token', 'simple_user'
                    ];
                    
                    authKeys.forEach(key => {
                        localStorage.removeItem(key);
                        sessionStorage.removeItem(key);
                    });
                    
                    // Update UI
                    const showLoginBtn = document.getElementById('showLoginBtn');
                    const userInfo = document.getElementById('userInfo');
                    
                    if (showLoginBtn) showLoginBtn.style.display = 'block';
                    if (userInfo) userInfo.style.display = 'none';
                    
                    // Show notification
                    if (window.showNotification) {
                        window.showNotification('Logged out successfully', 'success');
                    }
                    
                    // Redirect to login after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
                
                console.log('✅ Logout complete');
            } catch (error) {
                console.error('❌ Logout error:', error);
                alert('Error during logout. Please refresh the page.');
            }
        });
        
        console.log('✅ Logout button handler attached');
    }
    
    // Setup when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLogoutButton);
    } else {
        // DOM already loaded
        setupLogoutButton();
    }
    
    // Also setup when auth system is ready
    window.addEventListener('auth:ready', setupLogoutButton);
    
    // Re-setup if page visibility changes (for PWA)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(setupLogoutButton, 100);
        }
    });
    
    // Export for debugging
    window.logoutFix = {
        setup: setupLogoutButton,
        testLogout: async () => {
            const btn = document.getElementById('logoutBtn');
            if (btn) {
                btn.click();
            } else {
                console.error('Logout button not found');
            }
        }
    };
})();