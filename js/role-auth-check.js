// Role-based Authentication Check - Redirects to login if not authenticated or wrong role
(function() {
    'use strict';
    
    // Don't run on login page or service worker
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('sw.js') ||
        window.location.pathname.includes('service-worker')) {
        return;
    }
    
    // Flag to prevent multiple redirects
    let isRedirecting = false;
    
    function getRoleFromPage() {
        const pathname = window.location.pathname;
        if (pathname.includes('owner.html')) return 'owner';
        if (pathname.includes('admin.html')) return 'admin';
        if (pathname.includes('manager.html')) return 'manager';
        if (pathname.includes('employee.html')) return 'employee';
        if (pathname.includes('therapist.html')) return 'therapist';
        if (pathname.includes('receptionist.html')) return 'receptionist';
        // Default to index.html for backward compatibility
        return null;
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
            // Don't redirect if we're already redirecting
            if (isRedirecting) return false;
            
            console.log('🔒 No authentication found, redirecting to login...');
            isRedirecting = true;
            
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
        
        // Check if user has the right role for this page
        const requiredRole = getRoleFromPage();
        if (requiredRole) {
            try {
                const user = JSON.parse(userData);
                const userRole = user.role || 'employee';
                
                // Check if user role matches page role
                if (userRole !== requiredRole) {
                    // Special cases: riders and utility workers can access employee page
                    if (requiredRole === 'employee' && (userRole === 'rider' || userRole === 'utility')) {
                        console.log('✅ Special role access granted');
                        return true;
                    }
                    
                    console.log(`🔒 Wrong role. User is ${userRole}, but page requires ${requiredRole}`);
                    
                    // Don't redirect if we're already redirecting
                    if (isRedirecting) return false;
                    isRedirecting = true;
                    
                    // Redirect to correct page based on user's actual role
                    const rolePages = {
                        'owner': 'owner.html',
                        'admin': 'admin.html',
                        'manager': 'manager.html',
                        'employee': 'employee.html',
                        'therapist': 'therapist.html',
                        'receptionist': 'receptionist.html',
                        'rider': 'employee.html',
                        'utility': 'employee.html'
                    };
                    const targetPage = rolePages[userRole] || 'employee.html';
                    window.location.href = targetPage;
                    return false;
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        
        console.log('✅ Authentication found, user can access this page');
        return true;
    }
    
    // Check authentication after a small delay to allow auth to be set
    // This prevents immediate logout after login
    setTimeout(() => {
        checkAuthentication();
    }, 1000);
    
    // Also check on visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkAuthentication();
        }
    });
    
    // Check auth status periodically (every 30 seconds instead of 5)
    // Reduced frequency to prevent false logouts
    setInterval(() => {
        // Only check if document is visible to avoid issues
        if (!document.hidden) {
            checkAuthentication();
        }
    }, 30000);
    
    // Also expose function globally for other scripts to use
    window.checkAuthenticationStatus = checkAuthentication;
})();