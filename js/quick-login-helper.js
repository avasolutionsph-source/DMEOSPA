// Quick Login Helper - Auto-fills demo credentials
(function() {
    // Check for quick login parameters
    const params = new URLSearchParams(location.search);
    
    if (params.get('quickLogin') === 'true') {
        const email = localStorage.getItem('quickLoginEmail');
        const password = localStorage.getItem('quickLoginPassword');
        
        if (email && password) {
            console.log('🔄 Quick login detected, auto-filling credentials...');
            
            // Wait for page to load then auto-fill
            window.addEventListener('load', () => {
                setTimeout(() => {
                    // Open login modal if not already open
                    if (window.authSystem && typeof window.authSystem.showLoginModal === 'function') {
                        window.authSystem.showLoginModal();
                        
                        // Fill in credentials after modal opens
                        setTimeout(() => {
                            const emailField = document.getElementById('loginEmail');
                            const passwordField = document.getElementById('loginPassword');
                            const loginBtn = document.getElementById('loginBtn');
                            
                            if (emailField && passwordField) {
                                emailField.value = email;
                                passwordField.value = password;
                                console.log('✅ Credentials auto-filled');
                                
                                // Auto-submit after brief delay
                                setTimeout(() => {
                                    if (loginBtn) {
                                        loginBtn.click();
                                        console.log('🔄 Auto-submitting login...');
                                    }
                                }, 500);
                            }
                        }, 300);
                    }
                    
                    // Clear the quick login data
                    localStorage.removeItem('quickLoginEmail');
                    localStorage.removeItem('quickLoginPassword');
                    
                }, 1000);
            });
        }
    }

    // Show login help link when no user is logged in
    document.addEventListener('DOMContentLoaded', () => {
        const checkLoginStatus = () => {
            const isLoggedIn = window.authSystem?.isLoggedIn;
            const loginHelp = document.getElementById('loginHelp');
            const showLoginBtn = document.getElementById('showLoginBtn');
            
            if (loginHelp) {
                if (!isLoggedIn && showLoginBtn && showLoginBtn.style.display !== 'none') {
                    loginHelp.style.display = 'block';
                } else {
                    loginHelp.style.display = 'none';
                }
            }
        };
        
        // Check initially
        setTimeout(checkLoginStatus, 1000);
        
        // Check periodically
        setInterval(checkLoginStatus, 5000);
    });

    // Add demo credentials hint to login modal
    const addDemoHint = () => {
        const modal = document.getElementById('authModal');
        if (modal && !modal.querySelector('.demo-hint')) {
            const loginForm = document.getElementById('authLoginForm');
            if (loginForm) {
                const hint = document.createElement('div');
                hint.className = 'demo-hint';
                hint.style.cssText = `
                    background: #e7f3ff;
                    border: 1px solid #b3d9ff;
                    padding: 1rem;
                    border-radius: 6px;
                    margin: 1rem 0;
                    font-size: 0.9rem;
                `;
                hint.innerHTML = `
                    <strong>💡 Demo Accounts:</strong><br>
                    <small>
                        • Owner: <code>demo@spa.com</code> / <code>demo123</code><br>
                        • Therapist: <code>therapist@spa.com</code> / <code>therapist123</code><br>
                        • Manager: <code>manager@spa.com</code> / <code>manager123</code>
                    </small>
                `;
                
                loginForm.appendChild(hint);
            }
        }
    };

    // Add hint when modal opens
    const originalShowLoginModal = window.showLoginModal;
    window.showLoginModal = function() {
        if (originalShowLoginModal) {
            originalShowLoginModal();
        }
        setTimeout(addDemoHint, 200);
    };

    console.log('🔄 Quick login helper loaded');
})();
