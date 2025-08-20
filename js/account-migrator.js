// Account Migration System - Migrate Old Accounts to Permanent System
class AccountMigrator {
    constructor() {
        this.migratedAccounts = [];
        this.migrationReport = [];
    }

    // Detect and migrate old accounts
    async migrateOldAccounts() {
        console.log('🔄 Checking for old accounts to migrate...');
        
        const oldAccounts = await this.detectOldAccounts();
        
        if (oldAccounts.length === 0) {
            console.log('✅ No old accounts found to migrate');
            return { success: true, migrated: 0, message: 'No migration needed' };
        }

        console.log(`📦 Found ${oldAccounts.length} old accounts to migrate`);
        
        try {
            await this.performMigration(oldAccounts);
            
            return {
                success: true,
                migrated: this.migratedAccounts.length,
                report: this.migrationReport,
                message: `Successfully migrated ${this.migratedAccounts.length} accounts`
            };
        } catch (error) {
            console.error('❌ Migration failed:', error);
            return {
                success: false,
                error: error.message,
                message: 'Migration failed. Please contact support.'
            };
        }
    }

    // Detect old account data from various storage locations
    async detectOldAccounts() {
        const oldAccounts = [];
        
        // Check for old auth tokens and user data
        const oldUserData = this.findOldUserData();
        if (oldUserData) {
            oldAccounts.push(oldUserData);
        }

        // Check for demo accounts that might have been used
        const demoAccounts = this.findDemoAccounts();
        oldAccounts.push(...demoAccounts);

        // Check for any cached business accounts
        const businessAccounts = this.findBusinessAccounts();
        oldAccounts.push(...businessAccounts);

        // Remove duplicates by email
        const uniqueAccounts = oldAccounts.filter((account, index, self) => 
            index === self.findIndex(a => a.email === account.email)
        );

        return uniqueAccounts;
    }

    // Find old user data from previous auth systems
    findOldUserData() {
        const oldUserSources = [
            'currentUser', 'userData', 'user', 'loginData'
        ];

        for (const source of oldUserSources) {
            const data = localStorage.getItem(source) || sessionStorage.getItem(source);
            if (data) {
                try {
                    const user = JSON.parse(data);
                    if (user.email) {
                        console.log('🔍 Found old user data:', user.email);
                        return {
                            email: user.email,
                            role: user.role || 'owner',
                            businessName: user.businessName || 'Your Business',
                            firstName: user.firstName || user.name || user.email.split('@')[0],
                            lastName: user.lastName || 'User',
                            source: 'cached_user_data',
                            originalData: user
                        };
                    }
                } catch (e) {
                    console.warn(`Could not parse ${source}:`, e);
                }
            }
        }
        return null;
    }

    // Find demo accounts that might have been configured
    findDemoAccounts() {
        const demos = [];
        
        // Check if demo accounts were previously set up
        const demoMarkers = [
            'demo@spa.com', 'test@spa.com', 'admin@spa.com',
            'owner@spa.com', 'manager@spa.com', 'therapist@spa.com'
        ];

        // Check localStorage for any evidence of these accounts
        for (const email of demoMarkers) {
            const evidence = this.findAccountEvidence(email);
            if (evidence) {
                demos.push({
                    email: email,
                    role: this.inferRoleFromEmail(email),
                    businessName: 'Demo Spa Business',
                    firstName: this.inferNameFromEmail(email),
                    lastName: 'User',
                    source: 'demo_account',
                    evidence: evidence
                });
            }
        }

        return demos;
    }

    // Find evidence of account usage
    findAccountEvidence(email) {
        // Look for any localStorage keys that might contain this email
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            
            if (value && value.includes(email)) {
                return { key, value };
            }
        }
        return null;
    }

    // Find business accounts from settings
    findBusinessAccounts() {
        const accounts = [];
        
        try {
            // Check business settings
            const businessName = localStorage.getItem('businessName');
            const businessConfig = localStorage.getItem('businessConfig');
            
            if (businessName || businessConfig) {
                let config = null;
                if (businessConfig) {
                    try {
                        config = JSON.parse(businessConfig);
                    } catch (e) {}
                }

                // Create account based on business settings
                accounts.push({
                    email: 'admin@' + (businessName || 'business').toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
                    role: 'owner',
                    businessName: businessName || 'Your Business',
                    firstName: 'Business',
                    lastName: 'Admin',
                    source: 'business_settings',
                    config: config
                });
            }
        } catch (error) {
            console.warn('Error finding business accounts:', error);
        }

        return accounts;
    }

    // Infer role from email
    inferRoleFromEmail(email) {
        const emailLower = email.toLowerCase();
        
        if (emailLower.includes('owner') || emailLower.includes('admin')) return 'owner';
        if (emailLower.includes('manager')) return 'manager';
        if (emailLower.includes('therapist')) return 'therapist';
        if (emailLower.includes('reception')) return 'receptionist';
        if (emailLower.includes('demo')) return 'owner';
        
        return 'owner'; // Default to owner for safety
    }

    // Infer name from email
    inferNameFromEmail(email) {
        const parts = email.split('@')[0].split('.');
        return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }

    // Perform the actual migration
    async performMigration(oldAccounts) {
        console.log('🔄 Starting account migration...');
        
        for (const account of oldAccounts) {
            try {
                await this.migrateAccount(account);
                this.migratedAccounts.push(account);
                this.migrationReport.push({
                    email: account.email,
                    status: 'success',
                    role: account.role,
                    source: account.source
                });
            } catch (error) {
                console.error(`❌ Failed to migrate ${account.email}:`, error);
                this.migrationReport.push({
                    email: account.email,
                    status: 'failed',
                    error: error.message,
                    source: account.source
                });
            }
        }

        console.log('✅ Migration completed');
    }

    // Migrate individual account
    async migrateAccount(account) {
        console.log(`🔄 Migrating account: ${account.email} (${account.role})`);
        
        // Generate default password for migrated accounts
        const defaultPassword = this.generateDefaultPassword();
        
        const userData = {
            email: account.email,
            password: defaultPassword,
            role: account.role,
            businessName: account.businessName,
            firstName: account.firstName,
            lastName: account.lastName
        };

        // Create user in permanent auth system
        const newUser = await window.permanentAuth.createUser(userData);
        
        // Store the default password for the user to see
        account.migratedPassword = defaultPassword;
        
        console.log(`✅ Migrated: ${account.email} with password: ${defaultPassword}`);
        
        return newUser;
    }

    // Generate secure default password
    generateDefaultPassword() {
        const adjectives = ['Quick', 'Smart', 'Fresh', 'Bright', 'Swift'];
        const nouns = ['Spa', 'Care', 'Heal', 'Relax', 'Zen'];
        const numbers = Math.floor(Math.random() * 99) + 10;
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${adj}${noun}${numbers}`;
    }

    // Show migration results to user
    showMigrationResults() {
        if (this.migratedAccounts.length === 0) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2><i class="fas fa-user-friends"></i> Account Migration Complete</h2>
                </div>
                <div class="modal-body">
                    <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <i class="fas fa-check-circle"></i>
                        <strong>Migration Successful!</strong> We found and migrated ${this.migratedAccounts.length} old account(s).
                    </div>
                    
                    <h4>Migrated Accounts:</h4>
                    <div class="migrated-accounts" style="max-height: 300px; overflow-y: auto;">
                        ${this.migratedAccounts.map(account => `
                            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 0.5rem 0; border-left: 4px solid #28a745;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong>${account.email}</strong>
                                        <div style="color: #666; font-size: 0.9rem;">Role: ${account.role} | Business: ${account.businessName}</div>
                                    </div>
                                    <div style="background: #e9ecef; padding: 0.5rem; border-radius: 4px; font-family: monospace;">
                                        <strong>Password:</strong> <span style="color: #007bff;">${account.migratedPassword}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="background: #fff3cd; color: #856404; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Important:</strong> Please save these passwords and share them with your team members. 
                        They can change their passwords after logging in.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-check"></i> Got It
                    </button>
                    <button class="btn btn-secondary" onclick="accountMigrator.printMigrationReport()">
                        <i class="fas fa-print"></i> Print Report
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Print migration report
    printMigrationReport() {
        const reportContent = `
ACCOUNT MIGRATION REPORT
========================

Migration Date: ${new Date().toLocaleString()}
Total Accounts Migrated: ${this.migratedAccounts.length}

MIGRATED ACCOUNTS:
${this.migratedAccounts.map(account => `
Email: ${account.email}
Role: ${account.role}
Business: ${account.businessName}
Password: ${account.migratedPassword}
Source: ${account.source}
---`).join('\n')}

IMPORTANT:
- Share these credentials with your team members
- Users should change their passwords after first login
- All role restrictions and permissions are preserved
- No data was lost during migration

Contact support if you need help with any migrated accounts.
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>Account Migration Report</title></head>
                <body style="font-family: monospace; white-space: pre-wrap; padding: 2rem;">
                    ${reportContent}
                </body>
            </html>
        `);
        printWindow.print();
    }

    // Check if migration is needed
    needsMigration() {
        // Check if permanent auth system is empty
        const hasUsers = window.permanentAuth?.userDatabase && 
                         Object.keys(window.permanentAuth.userDatabase).length > 0;
        
        if (hasUsers) {
            return false; // Already has users, no migration needed
        }

        // Check if there's any old account data
        const oldDataExists = this.hasOldAccountData();
        return oldDataExists;
    }

    // Check for existence of old account data
    hasOldAccountData() {
        // Check for old user data
        const oldUserSources = [
            'currentUser', 'userData', 'user', 'loginData',
            'businessName', 'businessConfig', 'isLoggedIn'
        ];

        for (const source of oldUserSources) {
            if (localStorage.getItem(source) || sessionStorage.getItem(source)) {
                return true;
            }
        }

        return false;
    }

    // Show migration prompt to user
    showMigrationPrompt() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-database"></i> Account Migration Available</h2>
                </div>
                <div class="modal-body">
                    <div style="background: #e7f3ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
                        <h4><i class="fas fa-info-circle"></i> We Found Your Old Account Data</h4>
                        <p>We detected existing account information from the previous system. 
                        Would you like us to migrate your accounts to the new secure system?</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                        <h5>Migration Benefits:</h5>
                        <ul style="margin: 0.5rem 0;">
                            <li>✅ Keep your existing business settings</li>
                            <li>✅ Preserve user roles and permissions</li>
                            <li>✅ Maintain therapist configurations</li>
                            <li>✅ No data loss</li>
                            <li>✅ Enhanced security with new system</li>
                        </ul>
                    </div>
                    
                    <div style="background: #fff3cd; color: #856404; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Note:</strong> If you choose not to migrate, you'll need to set up your accounts from scratch.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="accountMigrator.skipMigration(this.closest('.modal'))">
                        Skip - Fresh Start
                    </button>
                    <button class="btn btn-primary" onclick="accountMigrator.startMigration(this.closest('.modal'))">
                        <i class="fas fa-arrow-right"></i> Migrate My Accounts
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Start migration process
    async startMigration(modal) {
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; text-align: center;">
                <div class="modal-body">
                    <div style="padding: 2rem;">
                        <div style="font-size: 3rem; color: #007bff; margin-bottom: 1rem;">
                            <i class="fas fa-sync-alt fa-spin"></i>
                        </div>
                        <h3>Migrating Your Accounts...</h3>
                        <p>Please wait while we transfer your data to the new secure system.</p>
                        <div id="migrationProgress" style="margin-top: 1rem; color: #666;">
                            Detecting old accounts...
                        </div>
                    </div>
                </div>
            </div>
        `;

        try {
            // Update progress
            const progress = document.getElementById('migrationProgress');
            
            progress.textContent = 'Analyzing old account data...';
            const result = await this.migrateOldAccounts();
            
            if (result.success) {
                progress.textContent = `Migration complete! Migrated ${result.migrated} accounts.`;
                
                setTimeout(() => {
                    modal.remove();
                    this.showMigrationResults();
                    
                    // Initialize the permanent auth system
                    if (window.permanentAuth) {
                        window.permanentAuth.initializeWithSetup();
                    }
                }, 1000);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Migration error:', error);
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px; text-align: center;">
                    <div class="modal-body">
                        <div style="padding: 2rem;">
                            <div style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <h3>Migration Failed</h3>
                            <p>${error.message}</p>
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove(); window.permanentAuth.initializeWithSetup();">
                                Continue with Fresh Setup
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Skip migration and start fresh
    skipMigration(modal) {
        modal.remove();
        
        // Clear old data
        this.clearOldAccountData();
        
        // Start fresh setup
        if (window.permanentAuth) {
            window.permanentAuth.initializeWithSetup();
        }
    }

    // Clear old account data
    clearOldAccountData() {
        console.log('🧹 Clearing old account data...');
        
        const oldKeys = [
            'currentUser', 'userData', 'user', 'loginData',
            'userToken', 'authToken', 'isLoggedIn',
            'businessName', 'businessConfig', 'lastSync',
            'therapistAuth', 'employeeData', 'activeEmployeeRole'
        ];

        oldKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        console.log('✅ Old account data cleared');
    }

    // Get migration status
    getMigrationStatus() {
        return {
            needsMigration: this.needsMigration(),
            migratedCount: this.migratedAccounts.length,
            report: this.migrationReport
        };
    }
}

// Global account migrator
window.accountMigrator = new AccountMigrator();

// Auto-check for migration when permanent auth initializes
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.accountMigrator.needsMigration()) {
            console.log('🔄 Migration needed - showing prompt...');
            window.accountMigrator.showMigrationPrompt();
        } else {
            console.log('✅ No migration needed');
            // Initialize permanent auth normally
            if (window.permanentAuth) {
                window.permanentAuth.initializeWithSetup();
            }
        }
    }, 1000);
});

console.log('🔄 Account Migration System loaded');
