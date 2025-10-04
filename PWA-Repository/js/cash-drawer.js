// Cash Drawer Management System
class CashDrawerManager {
    constructor() {
        this.currentSession = null;
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        
        // Listen for online/offline changes
        window.addEventListener('online', () => this.isOnline = true);
        window.addEventListener('offline', () => this.isOnline = false);
    }

    async init() {
        try {
            console.log('🏪 Initializing Cash Drawer Manager...');
            console.log('🏪 Database available:', !!window.db);
            console.log('🏪 StateManager available:', !!window.StateManager);
            
            // Wait for database to be ready
            await this.ensureDBReady();
            console.log('✅ Database is ready');
            
            // Load current session if exists
            await this.loadCurrentSession();
            console.log('✅ Current session loaded');
            
            // Setup event listeners
            this.setupEventListeners();
            console.log('✅ Event listeners setup');
            
            this.isInitialized = true;
            console.log('✅ Cash Drawer Manager initialized successfully');
            
            // Update UI with current status
            this.updateUI();
            console.log('✅ UI updated');
            
        } catch (error) {
            console.error('❌ Failed to initialize Cash Drawer Manager:', error);
            console.error('❌ Error details:', error.stack);
            throw error;
        }
    }

    async ensureDBReady() {
        if (!window.db || !window.db.db) {
            console.log('⏳ Waiting for database initialization...');
            await new Promise(resolve => {
                const checkDB = () => {
                    if (window.db && window.db.db) {
                        resolve();
                    } else {
                        setTimeout(checkDB, 100);
                    }
                };
                checkDB();
            });
        }

        // Check if cashDrawerSessions store exists
        if (window.db && window.db.db && !window.db.db.objectStoreNames.contains('cashDrawerSessions')) {
            console.warn('⚠️ cashDrawerSessions store not found - database may need upgrade');
            console.log('💡 You may need to clear browser data to force database upgrade from v15 to v16');
            console.log('💡 Or refresh the page to trigger database migration');
        } else if (window.db && window.db.db) {
            console.log('✅ cashDrawerSessions store is available');
        }
    }

    async loadCurrentSession() {
        try {
            // Check if the store exists first
            if (!window.db.db.objectStoreNames.contains('cashDrawerSessions')) {
                console.warn('⚠️ cashDrawerSessions store not available - skipping session load');
                return;
            }

            // Check for active session
            const sessions = await window.db.getAll('cashDrawerSessions');
            const activeSession = sessions.find(session => session.status === 'open');
            
            if (activeSession) {
                this.currentSession = activeSession;
                console.log('📝 Found active cash drawer session:', activeSession.id);
                
                // Update state manager if available
                if (window.StateManager) {
                    window.StateManager.setState('cashDrawer.currentSession', activeSession);
                    window.StateManager.setState('cashDrawer.isDrawerOpen', true);
                }
            } else {
                console.log('📪 No active cash drawer session found');
                if (window.StateManager) {
                    window.StateManager.setState('cashDrawer.isDrawerOpen', false);
                }
            }
        } catch (error) {
            console.error('❌ Error loading current session:', error);
            console.log('💡 This might be normal if the database is still upgrading or the store doesn\'t exist yet');
        }
    }

    setupEventListeners() {
        // Listen for page navigation to update UI
        document.addEventListener('pageChanged', () => {
            this.updateUI();
        });
    }

    async openDrawer(openingFloat, notes = '') {
        try {
            // Validate input
            if (!openingFloat || openingFloat < 0) {
                throw new Error('Opening float must be a positive number');
            }

            // Check if drawer is already open
            if (this.currentSession && this.currentSession.status === 'open') {
                throw new Error('Cash drawer is already open');
            }

            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            // Create new session
            const newSession = {
                id: this.generateSessionId(),
                openedBy: currentUser.email || currentUser.userId,
                openedByName: currentUser.name || currentUser.email,
                openedAt: new Date().toISOString(),
                openingFloat: parseFloat(openingFloat),
                expectedBalance: parseFloat(openingFloat),
                transactionCount: 0,
                totalCashSales: 0,
                status: 'open',
                notes: notes,
                syncStatus: 'pending',
                createdAt: new Date().toISOString()
            };

            // Save to local database
            await window.db.add('cashDrawerSessions', newSession);
            
            this.currentSession = newSession;

            // Update state manager
            if (window.StateManager) {
                window.StateManager.setState('cashDrawer.currentSession', newSession);
                window.StateManager.setState('cashDrawer.isDrawerOpen', true);
                window.StateManager.setState('cashDrawer.openingFloat', parseFloat(openingFloat));
            }

            // Sync to backend if online
            if (this.isOnline && window.HybridAPIClient) {
                try {
                    const result = await window.HybridAPIClient.post('/api/cash-drawer/sessions', newSession);
                    if (result.success && result.data) {
                        // Update with server ID
                        newSession.serverId = result.data._id;
                        newSession.syncStatus = 'synced';
                        await window.db.put('cashDrawerSessions', newSession);
                    }
                } catch (syncError) {
                    console.warn('⚠️ Failed to sync drawer session to server:', syncError);
                    // Continue with local operation
                }
            }

            // Update UI
            this.updateUI();

            console.log('✅ Cash drawer opened successfully:', newSession.id);
            
            if (window.showSuccess) {
                window.showSuccess(`Cash drawer opened with ₱${this.formatCurrency(openingFloat)} float`);
            }

            return newSession;

        } catch (error) {
            console.error('❌ Error opening cash drawer:', error);
            if (window.showError) {
                window.showError(error.message);
            }
            throw error;
        }
    }

    async closeDrawer(closingBalance, variance = 0, notes = '') {
        try {
            if (!this.currentSession || this.currentSession.status !== 'open') {
                throw new Error('No active cash drawer session to close');
            }

            if (closingBalance < 0) {
                throw new Error('Closing balance cannot be negative');
            }

            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            // Calculate variance if not provided
            if (variance === 0) {
                variance = closingBalance - this.currentSession.expectedBalance;
            }

            // Update session
            this.currentSession.closedBy = currentUser.email || currentUser.userId;
            this.currentSession.closedByName = currentUser.name || currentUser.email;
            this.currentSession.closedAt = new Date().toISOString();
            this.currentSession.closingBalance = parseFloat(closingBalance);
            this.currentSession.variance = parseFloat(variance);
            this.currentSession.status = 'closed';
            this.currentSession.notes = notes;
            this.currentSession.syncStatus = 'pending';

            // Save to local database
            await window.db.put('cashDrawerSessions', this.currentSession);

            // Update state manager
            if (window.StateManager) {
                window.StateManager.setState('cashDrawer.currentSession', null);
                window.StateManager.setState('cashDrawer.isDrawerOpen', false);
            }

            // Sync to backend if online
            if (this.isOnline && window.HybridAPIClient) {
                try {
                    const result = await window.HybridAPIClient.put(`/api/cash-drawer/sessions/${this.currentSession.serverId || this.currentSession.id}`, this.currentSession);
                    if (result.success) {
                        this.currentSession.syncStatus = 'synced';
                        await window.db.put('cashDrawerSessions', this.currentSession);
                    }
                } catch (syncError) {
                    console.warn('⚠️ Failed to sync closed drawer session to server:', syncError);
                }
            }

            const closedSession = { ...this.currentSession };
            this.currentSession = null;

            // Update UI
            this.updateUI();

            console.log('✅ Cash drawer closed successfully:', closedSession.id);
            
            if (window.showSuccess) {
                const varianceText = variance !== 0 ? ` (Variance: ₱${this.formatCurrency(Math.abs(variance))})` : '';
                window.showSuccess(`Cash drawer closed with ₱${this.formatCurrency(closingBalance)}${varianceText}`);
            }

            return closedSession;

        } catch (error) {
            console.error('❌ Error closing cash drawer:', error);
            if (window.showError) {
                window.showError(error.message);
            }
            throw error;
        }
    }

    async addCashTransaction(transactionAmount) {
        if (!this.currentSession || this.currentSession.status !== 'open') {
            return; // No active session
        }

        try {
            // Update session totals
            this.currentSession.totalCashSales += parseFloat(transactionAmount);
            this.currentSession.expectedBalance += parseFloat(transactionAmount);
            this.currentSession.transactionCount += 1;

            // Save updated session
            await window.db.put('cashDrawerSessions', this.currentSession);

            // Update state manager
            if (window.StateManager) {
                window.StateManager.setState('cashDrawer.currentSession', this.currentSession);
            }

            console.log(`💰 Added cash transaction: ₱${this.formatCurrency(transactionAmount)} to drawer session`);

        } catch (error) {
            console.error('❌ Error adding cash transaction to drawer:', error);
        }
    }

    async getSessionHistory(limit = 50) {
        try {
            const sessions = await window.db.getAll('cashDrawerSessions');
            return sessions
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);
        } catch (error) {
            console.error('❌ Error getting session history:', error);
            return [];
        }
    }

    isDrawerOpen() {
        return this.currentSession && this.currentSession.status === 'open';
    }

    getCurrentSession() {
        return this.currentSession;
    }

    getExpectedBalance() {
        return this.currentSession ? this.currentSession.expectedBalance : 0;
    }

    getTotalTransactions() {
        return this.currentSession ? this.currentSession.transactionCount : 0;
    }

    getCurrentUser() {
        // Get current user from various sources
        if (window.StateManager) {
            const user = window.StateManager.getState('auth.currentUser');
            if (user) return user;
        }
        
        if (window.tokenManager && window.tokenManager.getUser) {
            const user = window.tokenManager.getUser();
            if (user) return user;
        }

        // Fallback to localStorage
        const authData = localStorage.getItem('authData');
        if (authData) {
            try {
                return JSON.parse(authData);
            } catch (e) {
                console.warn('Failed to parse auth data from localStorage');
            }
        }

        return null;
    }

    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `drawer_${timestamp}_${random}`;
    }

    formatCurrency(amount) {
        if (window.formatCurrency && typeof window.formatCurrency === 'function') {
            return window.formatCurrency(amount || 0);
        }
        return (amount || 0).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    updateUI() {
        // Update cash drawer status indicators
        this.updateDrawerStatusIndicators();
        this.updateDashboardWidget();
        this.updatePOSStatus();
    }

    updateDrawerStatusIndicators() {
        const statusElements = document.querySelectorAll('.cash-drawer-status');
        const isOpen = this.isDrawerOpen();
        
        statusElements.forEach(element => {
            if (isOpen) {
                element.innerHTML = `
                    <i class="fas fa-cash-register text-success"></i>
                    <span class="text-success">Drawer Open</span>
                `;
            } else {
                element.innerHTML = `
                    <i class="fas fa-lock text-danger"></i>
                    <span class="text-danger">Drawer Closed</span>
                `;
            }
        });
    }

    updateDashboardWidget() {
        const widgetElement = document.getElementById('cash-drawer-widget');
        if (!widgetElement) return;

        if (this.isDrawerOpen()) {
            const session = this.currentSession;
            widgetElement.innerHTML = `
                <h4><i class="fas fa-cash-register"></i> Cash Drawer</h4>
                <div class="drawer-stats">
                    <div class="stat-item">
                        <span class="label">Opening Float:</span>
                        <span class="value">₱${this.formatCurrency(session.openingFloat)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">Expected Balance:</span>
                        <span class="value">₱${this.formatCurrency(session.expectedBalance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">Transactions:</span>
                        <span class="value">${session.transactionCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">Opened By:</span>
                        <span class="value">${session.openedByName}</span>
                    </div>
                </div>
                <div class="drawer-actions">
                    <button class="btn btn-danger btn-sm" onclick="window.cashDrawerManager.showCloseDrawerModal()">
                        <i class="fas fa-lock"></i> Close Drawer
                    </button>
                </div>
            `;
        } else {
            widgetElement.innerHTML = `
                <h4><i class="fas fa-cash-register"></i> Cash Drawer</h4>
                <div class="drawer-closed">
                    <p class="text-muted">No active cash drawer session</p>
                    <button class="btn btn-success btn-sm" onclick="window.cashDrawerManager.showOpenDrawerModal()">
                        <i class="fas fa-unlock"></i> Open Drawer
                    </button>
                </div>
            `;
        }
    }

    updatePOSStatus() {
        console.log('🏪 [POS] Updating POS status...');
        const posStatusElement = document.getElementById('pos-drawer-status');
        
        if (!posStatusElement) {
            console.warn('⚠️ [POS] pos-drawer-status element not found in DOM');
            return;
        }

        console.log('🏪 [POS] Found pos-drawer-status element, drawer open:', this.isDrawerOpen());

        if (this.isDrawerOpen()) {
            posStatusElement.innerHTML = `
                <span class="badge badge-success">
                    <i class="fas fa-cash-register"></i> Drawer Open
                </span>
            `;
            console.log('✅ [POS] Status updated to: Drawer Open');
        } else {
            posStatusElement.innerHTML = `
                <span class="badge badge-danger">
                    <i class="fas fa-lock"></i> Drawer Closed
                </span>
            `;
            console.log('✅ [POS] Status updated to: Drawer Closed');
        }

        // Make sure the element is visible
        posStatusElement.style.display = 'flex';
        posStatusElement.style.visibility = 'visible';
    }

    showOpenDrawerModal() {
        if (window.openModal) {
            window.openModal('openDrawerModal');
        }
    }

    showCloseDrawerModal() {
        if (window.openModal) {
            // Pre-populate expected balance
            const expectedBalanceInput = document.getElementById('expectedBalance');
            if (expectedBalanceInput && this.currentSession) {
                expectedBalanceInput.value = this.currentSession.expectedBalance.toFixed(2);
            }
            window.openModal('closeDrawerModal');
        }
    }

    async handleOpenDrawerForm() {
        try {
            const openingFloat = document.getElementById('openingFloat').value;
            const notes = document.getElementById('openDrawerNotes').value;

            if (!openingFloat) {
                throw new Error('Opening float is required');
            }

            await this.openDrawer(parseFloat(openingFloat), notes);
            
            if (window.closeModal) {
                window.closeModal('openDrawerModal');
            }

            // Clear form
            document.getElementById('openingFloat').value = '';
            document.getElementById('openDrawerNotes').value = '';

        } catch (error) {
            console.error('❌ Error in open drawer form:', error);
            if (window.showError) {
                window.showError(error.message);
            }
        }
    }

    async handleCloseDrawerForm() {
        try {
            const closingBalance = document.getElementById('closingBalance').value;
            const notes = document.getElementById('closeDrawerNotes').value;

            if (!closingBalance) {
                throw new Error('Closing balance is required');
            }

            await this.closeDrawer(parseFloat(closingBalance), 0, notes);
            
            if (window.closeModal) {
                window.closeModal('closeDrawerModal');
            }

            // Clear form
            document.getElementById('closingBalance').value = '';
            document.getElementById('closeDrawerNotes').value = '';

        } catch (error) {
            console.error('❌ Error in close drawer form:', error);
            if (window.showError) {
                window.showError(error.message);
            }
        }
    }

    calculateVariance() {
        const closingBalanceInput = document.getElementById('closingBalance');
        const expectedBalanceInput = document.getElementById('expectedBalance');
        const varianceDisplay = document.getElementById('varianceDisplay');

        if (!closingBalanceInput || !expectedBalanceInput || !varianceDisplay) return;

        const closingBalance = parseFloat(closingBalanceInput.value) || 0;
        const expectedBalance = parseFloat(expectedBalanceInput.value) || 0;
        const variance = closingBalance - expectedBalance;

        let varianceClass = 'text-success';
        let varianceIcon = 'fa-check-circle';
        
        if (variance > 0) {
            varianceClass = 'text-primary';
            varianceIcon = 'fa-arrow-up';
        } else if (variance < 0) {
            varianceClass = 'text-danger';
            varianceIcon = 'fa-arrow-down';
        }

        varianceDisplay.innerHTML = `
            <i class="fas ${varianceIcon} ${varianceClass}"></i>
            <span class="${varianceClass}">₱${this.formatCurrency(Math.abs(variance))}</span>
            ${variance > 0 ? ' (Over)' : variance < 0 ? ' (Short)' : ' (Perfect!)'}
        `;
    }
}

// Auto-initialize when DOM is ready
console.log('🏪 Cash Drawer Manager script loading...');
console.log('🏪 Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🏪 DOM Content Loaded - initializing CashDrawerManager');
        if (!window.cashDrawerManager) {
            window.cashDrawerManager = new CashDrawerManager();
            console.log('✅ CashDrawerManager instance created');
        } else {
            console.log('⚠️ CashDrawerManager already exists');
        }
    });
} else {
    console.log('🏪 DOM already ready - initializing CashDrawerManager immediately');
    if (!window.cashDrawerManager) {
        window.cashDrawerManager = new CashDrawerManager();
        console.log('✅ CashDrawerManager instance created');
    } else {
        console.log('⚠️ CashDrawerManager already exists');
    }
}

console.log('🏪 Cash Drawer Manager class loaded and setup complete');

// Fallback initialization after a delay to ensure everything is loaded
setTimeout(() => {
    console.log('🏪 [FALLBACK] Checking cash drawer manager initialization...');
    if (!window.cashDrawerManager) {
        console.log('🏪 [FALLBACK] No cash drawer manager found, creating one...');
        window.cashDrawerManager = new CashDrawerManager();
        window.cashDrawerManager.init().catch(e => 
            console.warn('⚠️ [FALLBACK] Cash Drawer Manager init failed:', e)
        );
    } else if (!window.cashDrawerManager.isInitialized) {
        console.log('🏪 [FALLBACK] Cash drawer manager exists but not initialized, initializing...');
        window.cashDrawerManager.init().catch(e => 
            console.warn('⚠️ [FALLBACK] Cash Drawer Manager re-init failed:', e)
        );
    } else {
        console.log('✅ [FALLBACK] Cash drawer manager already initialized');
        // Force UI update in case it was missed
        window.cashDrawerManager.updateUI();
    }
}, 2000); // Wait 2 seconds for everything to load