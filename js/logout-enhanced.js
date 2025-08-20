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

    injectStyles() {
        // Check if styles already injected
        if (document.getElementById('logout-enhanced-styles')) return;

        const style = document.createElement('style');
        style.id = 'logout-enhanced-styles';
        style.textContent = `
            .logout-modal.show {
                opacity: 1 !important;
                visibility: visible !important;
            }
            
            .logout-modal.show .logout-modal-content {
                transform: scale(1) translateY(0) !important;
            }
            
            .logout-cancel-btn:hover {
                background: #e0e0e0 !important;
            }
            
            .logout-confirm-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
            }
            
            @keyframes pulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
                }
                70% {
                    box-shadow: 0 0 0 20px rgba(102, 126, 234, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0);
                }
            }
            
            .logout-icon {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }

    createLogoutModal() {
        // Check if modal already exists
        if (document.getElementById('logoutConfirmModal')) return;

        // Add styles directly if CSS isn't loaded
        this.injectStyles();

        // Get user info for personalization
        const userInfo = this.getUserInfo();
        const userName = userInfo.name || userInfo.email || 'User';
        const userInitial = userName.charAt(0).toUpperCase();

        const modal = document.createElement('div');
        modal.id = 'logoutConfirmModal';
        modal.className = 'logout-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            backdrop-filter: blur(5px);
        `;
        
        modal.innerHTML = `
            <div class="logout-modal-content" style="
                background: white;
                border-radius: 20px;
                padding: 2rem;
                max-width: 400px;
                width: 90%;
                text-align: center;
                transform: scale(0.8) translateY(20px);
                transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            ">
                <div class="logout-icon" style="
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fas fa-sign-out-alt" style="font-size: 2rem; color: white;"></i>
                </div>
                <h3 style="color: #333; margin-bottom: 0.5rem; font-size: 1.5rem;">Ready to Leave, ${userName}?</h3>
                <p style="color: #666; margin-bottom: 1.5rem; font-size: 1rem;">Are you sure you want to log out of your account?</p>
                <div class="logout-modal-buttons" style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="logout-cancel-btn" id="logoutCancelBtn" style="
                        padding: 0.75rem 2rem;
                        border: none;
                        border-radius: 50px;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-weight: 600;
                        background: #f0f0f0;
                        color: #333;
                    ">Stay Logged In</button>
                    <button class="logout-confirm-btn" id="logoutConfirmBtn" style="
                        padding: 0.75rem 2rem;
                        border: none;
                        border-radius: 50px;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-weight: 600;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    ">
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
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        `;
        
        overlay.innerHTML = `
            <div class="logout-animation-content" style="text-align: center; color: white;">
                <div class="logout-spinner" id="logoutSpinner" style="
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 2rem;
                    position: relative;
                    border: 4px solid rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 1s linear infinite;
                "></div>
                <div class="logout-success" id="logoutSuccess" style="
                    display: none;
                    width: 100px;
                    height: 100px;
                    margin: 0 auto 2rem;
                    position: relative;
                ">
                    <div class="logout-success-circle" style="
                        width: 100%;
                        height: 100%;
                        border: 4px solid white;
                        border-radius: 50%;
                        position: absolute;
                        top: 0;
                        left: 0;
                    "></div>
                    <div class="logout-success-check" style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 40px;
                        height: 20px;
                        border-left: 4px solid white;
                        border-bottom: 4px solid white;
                        transform: translate(-50%, -60%) rotate(-45deg);
                    "></div>
                </div>
                <div class="logout-message" id="logoutMessage" style="
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                ">Logging you out...</div>
                <div class="logout-submessage" id="logoutSubmessage" style="
                    font-size: 1rem;
                    opacity: 0.8;
                ">Saving your progress</div>
            </div>
        `;
        
        // Add keyframe animation for spinner
        if (!document.getElementById('logout-spinner-animation')) {
            const spinStyle = document.createElement('style');
            spinStyle.id = 'logout-spinner-animation';
            spinStyle.textContent = `
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .logout-animation-overlay.show {
                    opacity: 1 !important;
                    visibility: visible !important;
                }
            `;
            document.head.appendChild(spinStyle);
        }
        
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

            // Redirect to login page
            window.location.href = 'login.html';

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