// Force Logout - Clears ALL authentication data aggressively
function forceLogout() {
    console.log('🔴 FORCE LOGOUT INITIATED');
    
    // 1. Clear all localStorage items related to auth
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
        if (key.includes('auth') || key.includes('token') || key.includes('user') || 
            key.includes('login') || key.includes('session') || key === 'isLoggedIn') {
            localStorage.removeItem(key);
            console.log(`❌ Removed localStorage: ${key}`);
        }
    });
    
    // 2. Clear all sessionStorage items
    sessionStorage.clear();
    console.log('❌ Cleared all sessionStorage');
    
    // 3. Clear specific known auth keys
    const authKeys = [
        'auth_token', 'auth_user', 'authToken', 'userData', 
        'isLoggedIn', 'token', 'user', 'currentUser', 'userToken',
        'universal_token', 'universal_user', 'simple_token', 'simple_user',
        'activeEmployeeRole', 'therapistAuth', 'avas_auth_token', 
        'avas_session_info', 'immediate_session', 'activeUserId'
    ];
    
    authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
    
    // 4. Clear IndexedDB databases
    if ('indexedDB' in window) {
        // Try to get list of databases
        indexedDB.databases().then(databases => {
            databases.forEach(db => {
                indexedDB.deleteDatabase(db.name);
                console.log(`🗑️ Deleted IndexedDB: ${db.name}`);
            });
        }).catch(err => {
            // Fallback: Try to delete known database names
            const knownDbs = ['AvaDB', 'AuthDB', 'UserDB', 'SessionDB'];
            knownDbs.forEach(dbName => {
                try {
                    indexedDB.deleteDatabase(dbName);
                    console.log(`🗑️ Attempted to delete: ${dbName}`);
                } catch (e) {
                    // Silent fail
                }
            });
        });
    }
    
    // 5. Clear cookies (if any)
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // 6. Clear any in-memory auth objects
    if (window.unifiedAuth) {
        window.unifiedAuth.currentUser = null;
        window.unifiedAuth.authToken = null;
        window.unifiedAuth.isLoggedIn = false;
    }
    
    if (window.directAuth) {
        window.directAuth.isAuthenticated = false;
        window.directAuth.currentUser = null;
        window.directAuth.authToken = null;
    }
    
    if (window.simpleLogin) {
        window.simpleLogin.isLoggedIn = false;
        window.simpleLogin.currentUser = null;
        window.simpleLogin.authToken = null;
    }
    
    // 7. Unregister service workers (they might cache auth)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
                console.log('🔧 Unregistered service worker');
            }
        });
    }
    
    // 8. Clear caches
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
                console.log(`🗑️ Deleted cache: ${name}`);
            });
        });
    }
    
    console.log('✅ FORCE LOGOUT COMPLETE');
    
    // 9. Redirect to login page
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// Add force logout to window for easy access
window.forceLogout = forceLogout;

// Also enhance the regular logout to be more thorough
document.addEventListener('DOMContentLoaded', function() {
    // Override the logout button to use force logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout button clicked - using FORCE LOGOUT');
            forceLogout();
        };
    }
});

console.log('💪 Force Logout system loaded - use forceLogout() to clear everything');