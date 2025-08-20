// SIMPLE LOGIN - DISABLED (Replaced by unified-auth.js)
(function() {
    console.log('⚠️  SIMPLE LOGIN: DISABLED - Using unified MongoDB authentication instead');
    return; // Exit early - this system is disabled
    
    // Remove the broken modal completely
    function removeModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.remove();
            console.log('✅ Removed broken modal');
        }
        document.body.classList.remove('modal-open');
    }

    // Create simple inline login form
    function createSimpleLoginForm() {
        const sidebar = document.querySelector('.sidebar');
        const authIndicator = document.getElementById('authIndicator');
        
        if (authIndicator) {
            authIndicator.innerHTML = `
                <div id="simpleLoginForm" style="background: white; padding: 1rem; border-radius: 8px; margin: 1rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 1rem 0; color: #333;">Quick Login</h4>
                    <input type="email" id="simpleEmail" placeholder="Your email" 
                           style="width: 100%; padding: 0.5rem; margin: 0.25rem 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <input type="password" id="simplePassword" placeholder="Password" 
                           style="width: 100%; padding: 0.5rem; margin: 0.25rem 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <button id="simpleLoginBtn" onclick="simpleLogin()" 
                            style="width: 100%; padding: 0.75rem; margin: 0.5rem 0; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        LOGIN
                    </button>
                    <div style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">
                        Any email + password creates account<br>
                        <strong>Quick test:</strong> test@spa.com / test123
                    </div>
                </div>
                <div id="userInfo" style="display: none;" class="user-info">
                    <span id="userName">User</span>
                    <button id="logoutBtn" onclick="simpleLogout()" class="btn btn-secondary">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            `;
            
            console.log('✅ Simple login form created');
        }
    }

    // Simple login function
    window.simpleLogin = function() {
        const email = document.getElementById('simpleEmail')?.value?.trim();
        const password = document.getElementById('simplePassword')?.value?.trim();
        
        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        console.log('🔥 Simple login for:', email);
        
        // Determine role from email
        let role = 'owner';
        if (email.toLowerCase().includes('therapist')) role = 'therapist';
        else if (email.toLowerCase().includes('manager')) role = 'manager';
        else if (email.toLowerCase().includes('reception')) role = 'receptionist';
        
        // Create user
        const user = {
            id: `simple_${Date.now()}`,
            email: email,
            role: role,
            firstName: email.split('@')[0],
            lastName: 'User',
            businessName: 'Your Spa Business'
        };

        // Set session
        localStorage.setItem('simple_user', JSON.stringify(user));
        localStorage.setItem('simple_token', `token_${Date.now()}`);
        localStorage.setItem('isLoggedIn', 'true');
        
        // Update UI immediately
        updateUIForUser(user);
        
        alert(`Welcome ${user.firstName}! Logged in as ${role}`);
        console.log('✅ Simple login successful');
    };

    // Simple logout
    window.simpleLogout = function() {
        localStorage.removeItem('simple_user');
        localStorage.removeItem('simple_token');
        localStorage.removeItem('isLoggedIn');
        
        // Reset UI
        const simpleForm = document.getElementById('simpleLoginForm');
        const userInfo = document.getElementById('userInfo');
        
        if (simpleForm) simpleForm.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        
        // Show all navigation (reset)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.style.display = '';
        });
        
        const businessName = document.getElementById('businessName');
        if (businessName) businessName.textContent = 'Ava Solutions';
        
        console.log('✅ Simple logout complete');
    };

    // Update UI for logged in user
    function updateUIForUser(user) {
        console.log('🎨 Updating UI for:', user.email, 'Role:', user.role);
        
        // Hide login form, show user info
        const simpleForm = document.getElementById('simpleLoginForm');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const businessName = document.getElementById('businessName');
        
        if (simpleForm) simpleForm.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (userName) userName.textContent = user.firstName;
        if (businessName) businessName.textContent = user.businessName;
        
        // Update navigation based on role
        const permissions = {
            owner: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'chatbot', 'settings'],
            manager: ['dashboard', 'pos', 'expenses', 'bookings', 'products', 'inventory', 'employees', 'rooms', 'settings'],
            therapist: ['dashboard', 'bookings', 'settings', 'timer', 'therapist-portal'],
            receptionist: ['dashboard', 'pos', 'bookings', 'rooms', 'settings']
        };

        const allowed = permissions[user.role] || permissions.owner;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            if (allowed.includes(page)) {
                item.style.display = '';
                console.log(`✅ Showing ${page} for ${user.role}`);
            } else {
                item.style.display = 'none';
                console.log(`🚫 Hiding ${page} for ${user.role}`);
            }
        });

        // Show therapist portal for therapists
        const therapistNav = document.getElementById('therapistPortalNav');
        if (therapistNav) {
            therapistNav.style.display = user.role === 'therapist' ? '' : 'none';
        }
        
        console.log('✅ UI updated successfully');
    }

    // Check for existing session on load
    function checkExistingSession() {
        const storedUser = localStorage.getItem('simple_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                console.log('🔄 Restoring simple session for:', user.email);
                updateUIForUser(user);
            } catch (e) {
                console.warn('Could not restore simple session:', e);
            }
        }
    }

    // Initialize
    setTimeout(() => {
        removeModal();
        createSimpleLoginForm();
        checkExistingSession();
    }, 1000);

    console.log('🔥 SIMPLE LOGIN READY - no modal required!');
})();
