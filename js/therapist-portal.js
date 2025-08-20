// Therapist Portal Integration
class TherapistPortalManager {
    constructor() {
        this.currentUser = null;
        this.portalWindow = null;
    }

    async init() {
        console.log('🩺 Initializing Therapist Portal Manager');
        
        // Check if user is therapist
        const currentUser = window.authSystem?.currentUser;
        const isTherapist = this.isTherapistAccount();
        
        if (isTherapist) {
            this.showTherapistPortalNav();
        }
        
        this.currentUser = currentUser;
    }

    isTherapistAccount() {
        const currentUser = window.authSystem?.currentUser;
        const activeRole = window.roleManager?.activeEmployee?.role;
        const userRole = currentUser?.role;
        
        return (userRole && userRole.toLowerCase() === 'therapist') || 
               (activeRole && activeRole.toLowerCase() === 'therapist');
    }

    showTherapistPortalNav() {
        const portalNav = document.getElementById('therapistPortalNav');
        if (portalNav) {
            portalNav.style.display = '';
            console.log('✅ Therapist portal navigation shown');
        }
    }

    generatePortalUrl() {
        const currentUser = window.authSystem?.currentUser;
        const activeEmployee = window.roleManager?.activeEmployee;
        const token = window.authSystem?.authToken;
        
        const therapistData = {
            token: token || '',
            therapistId: activeEmployee?.id || currentUser?.id || '',
            name: activeEmployee?.name || currentUser?.employeeName || currentUser?.name || 'Therapist',
            email: currentUser?.email || ''
        };
        
        const params = new URLSearchParams(therapistData);
        const baseUrl = this.getPortalBaseUrl();
        
        return `${baseUrl}/therapist.html?${params.toString()}`;
    }
    
    getPortalBaseUrl() {
        // Determine the booking website URL based on current environment
        const currentHost = window.location.host;
        
        if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
            return `${window.location.protocol}//${window.location.host}/booking-website`;
        } else if (currentHost.includes('netlify.app')) {
            return 'https://ava-booking.netlify.app';
        } else {
            // Fallback to relative path
            return '/booking-website';
        }
    }

    async openPortal() {
        try {
            const portalUrl = this.generatePortalUrl();
            console.log('🚀 Opening therapist portal:', portalUrl);
            
            // Check if we can open in same tab (mobile) or new tab (desktop)
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // On mobile, open in same tab for better experience
                window.location.href = portalUrl;
            } else {
                // On desktop, open in new tab
                this.portalWindow = window.open(portalUrl, 'therapist-portal', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                
                if (!this.portalWindow) {
                    // Popup blocked, show alternative
                    this.showPopupBlockedMessage(portalUrl);
                }
            }
            
        } catch (error) {
            console.error('Failed to open therapist portal:', error);
            showNotification('Failed to open therapist portal', 'error');
        }
    }

    showPopupBlockedMessage(portalUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Popup Blocked</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Your browser blocked the therapist portal popup. You can:</p>
                    <div style="margin: 1rem 0;">
                        <button class="btn btn-primary" onclick="window.open('${portalUrl}'); this.closest('.modal').remove();">
                            <i class="fas fa-external-link-alt"></i> Try Opening Again
                        </button>
                        <a href="${portalUrl}" target="_blank" class="btn btn-secondary" style="margin-left: 0.5rem;">
                            <i class="fas fa-link"></i> Open in New Tab
                        </a>
                    </div>
                    <p><small>You can also allow popups for this site in your browser settings.</small></p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async loadPortalPage() {
        console.log('📄 Loading therapist portal page');
        
        // Update session info
        await this.updateSessionInfo();
        
        // Check portal status
        this.checkPortalConnection();
    }

    async updateSessionInfo() {
        const container = document.getElementById('therapistSessionInfo');
        if (!container) return;
        
        const currentUser = window.authSystem?.currentUser;
        const activeEmployee = window.roleManager?.activeEmployee;
        const isLoggedIn = window.authSystem?.isLoggedIn;
        
        container.innerHTML = `
            <div style="background: white; padding: 1rem; border-radius: 8px;">
                <strong><i class="fas fa-user"></i> Account</strong>
                <p style="margin: 0.5rem 0 0 0; color: #666;">
                    ${currentUser?.email || 'Not logged in'}
                </p>
            </div>
            <div style="background: white; padding: 1rem; border-radius: 8px;">
                <strong><i class="fas fa-id-badge"></i> Role</strong>
                <p style="margin: 0.5rem 0 0 0; color: #666;">
                    ${activeEmployee?.role || currentUser?.role || 'No role assigned'}
                </p>
            </div>
            <div style="background: white; padding: 1rem; border-radius: 8px;">
                <strong><i class="fas fa-building"></i> Workplace</strong>
                <p style="margin: 0.5rem 0 0 0; color: #666;">
                    ${currentUser?.businessName || 'Not specified'}
                </p>
            </div>
            <div style="background: white; padding: 1rem; border-radius: 8px;">
                <strong><i class="fas fa-signal"></i> Status</strong>
                <p style="margin: 0.5rem 0 0 0; color: ${isLoggedIn ? '#28a745' : '#dc3545'};">
                    ${isLoggedIn ? '✓ Connected' : '✗ Disconnected'}
                </p>
            </div>
        `;
    }

    checkPortalConnection() {
        // Check if the booking website is accessible
        const portalUrl = this.getPortalBaseUrl();
        
        fetch(`${portalUrl}/therapist.html`, { method: 'HEAD', mode: 'no-cors' })
            .then(() => {
                console.log('✅ Therapist portal is accessible');
            })
            .catch(() => {
                console.log('⚠️ Therapist portal may not be accessible');
                this.showConnectionWarning();
            });
    }

    showConnectionWarning() {
        const warning = document.createElement('div');
        warning.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        `;
        warning.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Connection Notice:</strong> The therapist portal may not be fully accessible. 
            If you experience issues, please check your internet connection or contact support.
        `;
        
        const container = document.querySelector('#therapist-portal .portal-options');
        if (container) {
            container.parentNode.insertBefore(warning, container.nextSibling);
        }
    }
}

// Global functions
window.loadTherapistPortal = async function() {
    if (!window.therapistPortalManager) {
        window.therapistPortalManager = new TherapistPortalManager();
    }
    await window.therapistPortalManager.loadPortalPage();
};

window.openTherapistPortal = function() {
    if (!window.therapistPortalManager) {
        window.therapistPortalManager = new TherapistPortalManager();
    }
    window.therapistPortalManager.openPortal();
};

// Initialize when auth system is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth system to load
    const checkAuth = setInterval(() => {
        if (window.authSystem && window.roleManager) {
            clearInterval(checkAuth);
            
            if (!window.therapistPortalManager) {
                window.therapistPortalManager = new TherapistPortalManager();
                window.therapistPortalManager.init();
            }
        }
    }, 100);
});

// Also check when auth state changes
window.addEventListener('authStateChanged', () => {
    if (window.therapistPortalManager) {
        window.therapistPortalManager.init();
    }
});
