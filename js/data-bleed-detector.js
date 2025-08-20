// Data Bleed Detection and Prevention System
class DataBleedDetector {
    constructor() {
        this.lastUserEmail = null;
        this.lastUserRole = null;
        this.sessionStartTime = Date.now();
        this.warningShown = false;
    }

    // Check for potential data bleed when user changes
    detectUserSwitch(newUser) {
        if (!newUser) return false;

        const currentEmail = newUser.email?.toLowerCase();
        const currentRole = newUser.role?.toLowerCase();

        // First login - establish baseline
        if (!this.lastUserEmail) {
            this.lastUserEmail = currentEmail;
            this.lastUserRole = currentRole;
            console.log('🔐 User session baseline established:', currentEmail, currentRole);
            return false;
        }

        // Check for user switch
        if (this.lastUserEmail !== currentEmail) {
            console.warn('⚠️ POTENTIAL DATA BLEED: User switch detected!');
            console.warn(`Previous: ${this.lastUserEmail} (${this.lastUserRole})`);
            console.warn(`Current: ${currentEmail} (${currentRole})`);
            
            this.handleUserSwitch(newUser);
            return true;
        }

        // Check for role change for same user
        if (this.lastUserRole !== currentRole) {
            console.warn('⚠️ ROLE CHANGE: Same user, different role detected!');
            console.warn(`${currentEmail}: ${this.lastUserRole} → ${currentRole}`);
            
            this.handleRoleChange(newUser);
            return true;
        }

        return false;
    }

    // Handle user switch - aggressive cleanup
    async handleUserSwitch(newUser) {
        console.log('🧹 EMERGENCY CLEANUP: Preventing data bleed...');
        
        // Show warning to user
        this.showDataBleedWarning(newUser);
        
        // Aggressive local data cleanup
        await this.emergencyDataCleanup();
        
        // Force server validation
        await this.forceServerRevalidation();
        
        // Update baseline
        this.lastUserEmail = newUser.email?.toLowerCase();
        this.lastUserRole = newUser.role?.toLowerCase();
        this.sessionStartTime = Date.now();
    }

    // Handle role change for same user
    async handleRoleChange(user) {
        console.log('🔄 ROLE CHANGE: Updating permissions...');
        
        // Clear role-specific cached data
        await this.clearRoleSpecificData();
        
        // Force fresh entitlements load
        if (window.entitlementsSystem) {
            await window.entitlementsSystem.refreshEntitlements();
        }
        
        // Update role manager
        if (window.roleManager) {
            window.roleManager.activeEmployee = null;
            localStorage.removeItem('activeEmployeeRole');
        }
        
        this.lastUserRole = user.role?.toLowerCase();
    }

    // Emergency cleanup of all local data
    async emergencyDataCleanup() {
        console.log('🚨 EMERGENCY: Clearing ALL local data to prevent bleed');
        
        // Clear all localStorage except token
        const tokenBackup = localStorage.getItem('authToken');
        localStorage.clear();
        if (tokenBackup) {
            localStorage.setItem('authToken', tokenBackup);
        }
        
        // Clear all sessionStorage
        sessionStorage.clear();
        
        // Clear IndexedDB stores
        try {
            if (window.db) {
                const allStores = [
                    'products', 'inventory', 'employees', 'transactions',
                    'customers', 'bookings', 'rooms', 'sessions',
                    'attendance', 'schedules', 'leaveRequests',
                    'payrollRuns', 'tips', 'giftCertificates', 'syncQueue'
                ];
                
                for (const store of allStores) {
                    try {
                        await window.db.clearStore(store);
                        console.log(`🗑️ Emergency cleared: ${store}`);
                    } catch (e) {
                        console.warn(`Could not clear ${store}:`, e);
                    }
                }
            }
        } catch (error) {
            console.error('Emergency cleanup error:', error);
        }
        
        // Clear any cached DOM elements with user data
        this.clearDOMCache();
    }

    // Clear DOM elements that might contain cached user data
    clearDOMCache() {
        // Clear business name displays
        document.querySelectorAll('#businessName, .business-name').forEach(el => {
            el.textContent = 'Loading...';
        });
        
        // Clear user info displays
        document.querySelectorAll('#userName, .user-name').forEach(el => {
            el.textContent = 'User';
        });
        
        // Clear any cached lists
        document.querySelectorAll('.cached-data').forEach(el => {
            el.innerHTML = '';
        });
        
        // Reset active navigation
        document.querySelectorAll('.nav-item.active').forEach(el => {
            el.classList.remove('active');
        });
        document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add('active');
    }

    // Clear role-specific cached data
    async clearRoleSpecificData() {
        const roleKeys = [
            'therapistAuth', 'therapistIdentifiers', 'activeEmployeeRole',
            'managerData', 'receptionistData'
        ];
        
        roleKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        // Clear role-specific database stores
        try {
            if (window.db) {
                const roleStores = ['bookings', 'sessions', 'attendance'];
                for (const store of roleStores) {
                    await window.db.clearStore(store);
                }
            }
        } catch (error) {
            console.warn('Role-specific cleanup error:', error);
        }
    }

    // Force server revalidation
    async forceServerRevalidation() {
        console.log('🌐 FORCE: Server revalidation to prevent data bleed');
        
        try {
            if (window.secureLoginManager) {
                const isValid = await window.secureLoginManager.validateSession();
                if (!isValid) {
                    console.error('❌ Server validation failed during bleed prevention');
                    await window.secureLoginManager.clearSession();
                    return;
                }
            }
            
            // Force fresh entitlements
            if (window.entitlementsSystem) {
                await window.entitlementsSystem.loadEntitlementsFromServer();
            }
            
        } catch (error) {
            console.error('❌ Force revalidation failed:', error);
            // If validation fails, clear everything for safety
            if (window.secureLoginManager) {
                await window.secureLoginManager.clearSession();
            }
        }
    }

    // Show data bleed warning to user
    showDataBleedWarning(newUser) {
        if (this.warningShown) return;
        this.warningShown = true;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; background: #fff3cd; border: 2px solid #ffc107;">
                <div class="modal-header" style="background: #ffc107; color: #000;">
                    <h2><i class="fas fa-exclamation-triangle"></i> Account Switch Detected</h2>
                </div>
                <div class="modal-body">
                    <p><strong>We detected a change in your account login.</strong></p>
                    <p>To prevent data mixing between accounts, we're clearing all local data and loading fresh information from our secure servers.</p>
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <p><strong>New Account:</strong> ${newUser.email}<br>
                        <strong>Role:</strong> ${newUser.role}</p>
                    </div>
                    <p><small><i class="fas fa-shield-alt"></i> This security measure ensures your data remains private and accurate.</small></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove(); window.location.reload();">
                        <i class="fas fa-check"></i> Continue with Fresh Data
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
                window.location.reload();
            }
        }, 10000);
    }

    // Monitor for suspicious local data patterns
    detectSuspiciousData() {
        const suspiciousPatterns = [];
        
        // Check for multiple user emails in localStorage
        Object.keys(localStorage).forEach(key => {
            const value = localStorage.getItem(key);
            if (value && typeof value === 'string') {
                // Look for email patterns
                const emails = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                if (emails && emails.length > 1) {
                    suspiciousPatterns.push(`Multiple emails in ${key}: ${emails.join(', ')}`);
                }
                
                // Look for role conflicts
                const roles = ['owner', 'manager', 'therapist', 'receptionist', 'admin'];
                const foundRoles = roles.filter(role => value.toLowerCase().includes(role));
                if (foundRoles.length > 1) {
                    suspiciousPatterns.push(`Multiple roles in ${key}: ${foundRoles.join(', ')}`);
                }
            }
        });
        
        if (suspiciousPatterns.length > 0) {
            console.warn('⚠️ SUSPICIOUS DATA PATTERNS DETECTED:');
            suspiciousPatterns.forEach(pattern => console.warn(`- ${pattern}`));
            return true;
        }
        
        return false;
    }

    // Regular monitoring function
    startMonitoring() {
        // Check every 30 seconds for suspicious patterns
        setInterval(() => {
            if (this.detectSuspiciousData()) {
                console.warn('🚨 Data bleed risk detected - consider clearing local data');
            }
        }, 30000);
        
        console.log('🔍 Data bleed monitoring started');
    }

    // Get monitoring report
    getReport() {
        return {
            lastUser: this.lastUserEmail,
            lastRole: this.lastUserRole,
            sessionDuration: Date.now() - this.sessionStartTime,
            warningShown: this.warningShown,
            suspiciousData: this.detectSuspiciousData()
        };
    }
}

// Global data bleed detector
window.dataBleedDetector = new DataBleedDetector();

// Hook into authentication system
if (window.authSystem) {
    const originalSetAuthState = window.authSystem.setAuthState;
    window.authSystem.setAuthState = async function(user, token, rememberMe) {
        // Check for data bleed before setting new auth state
        window.dataBleedDetector.detectUserSwitch(user);
        
        // Call original method
        return originalSetAuthState.call(this, user, token, rememberMe);
    };
}

// Start monitoring when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dataBleedDetector.startMonitoring();
});

console.log('🛡️ Data Bleed Detector activated - monitoring for account mixing');
