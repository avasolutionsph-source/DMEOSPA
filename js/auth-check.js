// Authentication Check - Redirects to login if not authenticated
(function() {
    'use strict';
    
    // Don't run on login page
    if (window.location.pathname.includes('login.html')) {
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
            // Redirect to login page
            window.location.href = 'login.html';
            return false;
        }
        
        console.log('✅ Authentication found, user can access dashboard');
        return true;
    }
    
    // Check authentication immediately
    checkAuthentication();
    
    // Also expose function globally for other scripts to use
    window.checkAuthenticationStatus = checkAuthentication;
})();