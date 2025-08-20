// Enhanced Logout with Confirmation and Animation

class LogoutManager {
    constructor() {
        this.isLoggingOut = false;
        this.init();
    }

    init() {
        // Create modal and overlay elements
        this.createLogoutModal();
        this.createLogoutAnimation();
        
        // Setup logout button
        this.setupLogoutButton();
    }

    createLogoutModal() {
        // Check if modal already exists
        if (document.getElementById('logoutConfirmModal')) return;

        // Get user info for personalization
        const userInfo = this.getUserInfo();
        const userName = userInfo.name || userInfo.email || 'User';
        const userInitial = userName.charAt(0).toUpperCase();

        const modal = document.createElement('div');
        modal.id = 'logoutConfirmModal';
        modal.className = 'logout-modal';
        modal.innerHTML = `
            <div class="logout-modal-content">
                <div class="logout-icon">
                    <i class="fas fa-sign-out-alt"></i>
                </div>
                <h3>Ready to Leave, ${userName}?</h3>
                <p>Are you sure you want to log out of your account?</p>
                <div class="logout-modal-buttons">
                    <button class="logout-cancel-btn" id="logoutCancelBtn">Stay Logged In</button>
                    <button class="logout-confirm-btn" id="logoutConfirmBtn">
                        <i class="fas fa-sign-out-alt"></i> Yes, Log Out
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('logoutCancelBtn').addEventListener('click', () => {
            this.hideConfirmModal();
        });

        document.getElementById('logoutConfirmBtn').addEventListener('click', () => {
            this.proceedWithLogout();
        });

        // Close modal on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideConfirmModal();
            }
        });
    }

    createLogoutAnimation() {
        // Check if animation overlay already exists
        if (document.getElementById('logoutAnimationOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'logoutAnimationOverlay';
        overlay.className = 'logout-animation-overlay';
        overlay.innerHTML = `
            <div class="logout-animation-content">
                <div class="logout-spinner" id="logoutSpinner"></div>
                <div class="logout-success" id="logoutSuccess" style="display: none;">
                    <div class="logout-success-circle"></div>
                    <div class="logout-success-check"></div>
                </div>
                <div class="logout-message" id="logoutMessage">Logging you out...</div>
                <div class="logout-submessage" id="logoutSubmessage">Saving your progress</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    getUserInfo() {
        // Try to get user info from various sources
        try {
            // Try unified auth
            if (window.unifiedAuth && window.unifiedAuth.currentUser) {
                return window.unifiedAuth.currentUser;
            }
            
            // Try auth system
            if (window.authSystem && window.authSystem.currentUser) {
                return window.authSystem.currentUser;
            }
            
            // Try localStorage
            const authUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
            if (authUser) {
                return JSON.parse(authUser);
            }
            
            // Try other storage keys
            const userData = localStorage.getItem('userData');
            if (userData) {
                return JSON.parse(userData);
            }
        } catch (e) {
            console.warn('Could not get user info:', e);
        }
        
        return { name: 'User', email: '' };
    }

    setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) {
            console.log('⚠️ Logout button not found');
            return;
        }

        // Remove existing listeners by cloning
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

        // Add new enhanced click handler
        newLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showConfirmModal();
        });

        // Mark button as enhanced
        newLogoutBtn.setAttribute('data-enhanced-logout', 'true');
        console.log('✅ Enhanced logout button initialized with modal and animation');
    }

    showConfirmModal() {
        const modal = document.getElementById('logoutConfirmModal');
        if (modal) {
            modal.classList.add('show');
            
            // Play a subtle sound if available
            this.playSound('confirm');
        }
    }

    hideConfirmModal() {
        const modal = document.getElementById('logoutConfirmModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async proceedWithLogout() {
        if (this.isLoggingOut) return;
        this.isLoggingOut = true;

        // Hide confirmation modal
        this.hideConfirmModal();

        // Show animation overlay
        const overlay = document.getElementById('logoutAnimationOverlay');
        const spinner = document.getElementById('logoutSpinner');
        const success = document.getElementById('logoutSuccess');
        const message = document.getElementById('logoutMessage');
        const submessage = document.getElementById('logoutSubmessage');

        if (overlay) {
            overlay.classList.add('show');
        }

        try {
            // Step 1: Save any pending data
            await this.savePendingData();
            
            // Update animation message
            if (submessage) {
                submessage.textContent = 'Clearing session...';
            }

            // Step 2: Perform logout
            await this.performLogout();

            // Show success animation
            if (spinner) spinner.style.display = 'none';
            if (success) {
                success.style.display = 'block';
                success.classList.add('show');
            }
            if (message) message.textContent = 'Logged out successfully!';
            if (submessage) submessage.textContent = 'Redirecting...';

            // Play success sound
            this.playSound('success');

            // Wait for animation to complete
            await this.wait(2000);

            // Redirect or reload
            window.location.reload();

        } catch (error) {
            console.error('Logout error:', error);
            
            // Show error state
            if (message) message.textContent = 'Logout failed';
            if (submessage) submessage.textContent = 'Please try again';
            
            // Hide overlay after error
            setTimeout(() => {
                if (overlay) overlay.classList.remove('show');
                this.isLoggingOut = false;
            }, 2000);
        }
    }

    async savePendingData() {
        // Save any unsaved data before logout
        console.log('💾 Saving pending data...');
        
        // Check if there's a sync manager
        if (window.syncManager && window.syncManager.syncAll) {
            try {
                await window.syncManager.syncAll();
            } catch (error) {
                console.warn('Sync failed during logout:', error);
            }
        }

        // Save current state
        if (window.app && window.app.saveState) {
            try {
                await window.app.saveState();
            } catch (error) {
                console.warn('State save failed during logout:', error);
            }
        }

        await this.wait(500); // Give time for saves to complete
    }

    async performLogout() {
        console.log('🚪 Performing logout...');

        // Try unified auth first
        if (window.unifiedAuth && typeof window.unifiedAuth.logout === 'function') {
            console.log('Using unifiedAuth.logout()');
            await window.unifiedAuth.logout();
            return;
        }

        // Try authSystem
        if (window.authSystem && typeof window.authSystem.logout === 'function') {
            console.log('Using authSystem.logout()');
            await window.authSystem.logout();
            return;
        }

        // Manual logout as fallback
        console.log('Performing manual logout');
        
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

        // Clear cookies if any
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });

        // Notify app about logout
        if (window.app && typeof window.app.onUserLoggedOut === 'function') {
            window.app.onUserLoggedOut();
        }

        // Emit logout event
        if (window.eventBus) {
            window.eventBus.emit('auth:logout');
        }
    }

    playSound(type) {
        // Optional: Play subtle UI sounds
        try {
            const audio = new Audio();
            switch(type) {
                case 'confirm':
                    // Soft click sound
                    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS2Oy9diMFl2+z';
                    break;
                case 'success':
                    // Success chime
                    audio.src = 'data:audio/wav;base64,UklGRuIGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQgGAACEgIB9eHx9eHl7fX18fIGKlJSLfnqAfYGDg4OEhIaGh4mKiYeFhISEhYWHiYmJiImLjI2OjpCOj5CRkZGSkpOVlZWWmJqbnJ6fn6CgoKGhoqOlpqamp6eoqKmqqqutrq+wsLGysrKztLa2t7e4ubm6u7u8vb6+v8HBwsPDxMXFxsfHyMjJycvLzM3Nzs/Q0dHR0tLU1NXV1tfX2NjZ2dra29zc3d3e3t/f4ODh4uLi4+Tj5OXl5ebm5+fo6Ojp6enq6+zs7Ozs7e3u7u7u7+/v8PDw8fHx8fHy8vLy8vLy8vLy8vLy8fHx8fHx8PDw8PDv7+/v7u7u7e3t7Ozs7Ozr6+vq6urp6Ojo5+fn5ubl5OTj4+Li4uHg4N/f3t7d3NzbGhra';
                    break;
            }
            audio.volume = 0.1; // Keep it subtle
            audio.play().catch(() => {}); // Ignore if sound fails
        } catch (e) {
            // Sound is optional, ignore errors
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export the class globally
window.LogoutManager = LogoutManager;

// Initialize enhanced logout when DOM is ready
let logoutManager;

function initEnhancedLogout() {
    if (!window.logoutManager) {
        logoutManager = new LogoutManager();
        window.logoutManager = logoutManager;
        console.log('✨ Enhanced logout system initialized');
    } else {
        console.log('✅ Logout manager already initialized');
        window.logoutManager.setupLogoutButton();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancedLogout);
} else {
    initEnhancedLogout();
}

// Re-initialize when page becomes visible (for PWA)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(initEnhancedLogout, 100);
    }
});

// Re-initialize on auth events
window.addEventListener('auth:ready', () => {
    setTimeout(initEnhancedLogout, 200);
});

if (window.eventBus) {
    window.eventBus.on('auth:login', () => {
        setTimeout(initEnhancedLogout, 200);
    });
}