// Authentication Check - Redirects to login if not authenticated
(function() {
    'use strict';
    
    // Don't run on login page or service worker
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('sw.js') ||
        window.location.pathname.includes('service-worker')) {
        return;
    }
    
    function checkAuthentication() {
        // Check for any valid authentication token
        const authToken = localStorage.getItem('auth_token') || 
                         localStorage.getItem('authToken') || 
                         localStorage.getItem('token') ||
                         localStorage.getItem('userToken') ||
                         sessionStorage.getItem('auth_token') ||
                         sessionStorage.getItem('authToken');
        
        const userData = localStorage.getItem('auth_user') || 
                        localStorage.getItem('userData') || 
                        localStorage.getItem('user') ||
                        localStorage.getItem('currentUser') ||
                        sessionStorage.getItem('auth_user') ||
                        sessionStorage.getItem('userData');
        
        if (!authToken || !userData) {
            console.log('🔒 No authentication found, redirecting to login...');
            // Clear any partial auth data
            const authKeys = [
                'auth_token', 'auth_user', 'authToken', 'userData', 
                'isLoggedIn', 'token', 'user', 'currentUser', 'userToken'
            ];
            authKeys.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });
            // Redirect to login page
            window.location.href = 'login.html';
            return false;
        }
        
        console.log('✅ Authentication found, user can access dashboard');
        return true;
    }
    
    // Check authentication immediately
    checkAuthentication();
    
    // Also check on visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkAuthentication();
        }
    });
    
    // Check auth status periodically (every 30 seconds instead of 5)
    // Reduced frequency to prevent false logouts
    setInterval(() => {
        // Only check if document is visible
        if (!document.hidden) {
            checkAuthentication();
        }
    }, 30000);
    
    // Also expose function globally for other scripts to use
    window.checkAuthenticationStatus = checkAuthentication;
})();