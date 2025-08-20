// Redirect from index.html to role-specific page
(function() {
    'use strict';
    
    // Only run on index.html
    if (!window.location.pathname.endsWith('index.html') && 
        !window.location.pathname.endsWith('/')) {
        return;
    }
    
    function redirectToRolePage() {
        const userData = localStorage.getItem('auth_user') || 
                        localStorage.getItem('userData') || 
                        localStorage.getItem('user') ||
                        localStorage.getItem('currentUser') ||
                        sessionStorage.getItem('auth_user') ||
                        sessionStorage.getItem('userData');
        
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const userRole = user.role || 'employee';
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
                
                console.log(`🔄 Redirecting ${userRole} to ${targetPage}`);
                window.location.href = targetPage;
            } catch (e) {
                console.error('Error parsing user data:', e);
                window.location.href = 'login.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    }
    
    // Redirect immediately
    redirectToRolePage();
})();