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
            const currentUser = this.getCurrentUser();
            const currentUserName = currentUser ? (currentUser.name || currentUser.email) : 'Unknown';
            const isDifferentUser = currentUserName !== session.openedByName;
            
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
                    ${isDifferentUser ? `
                    <div class="stat-item">
                        <span class="label">Operating As:</span>
                        <span class="value current-operator">${currentUserName}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="drawer-actions">
                    <button class="btn btn-primary btn-sm" onclick="window.cashDrawerManager.showTransferModal()">
                        <i class="fas fa-exchange-alt"></i> Transfer
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.cashDrawerManager.showCloseDrawerModal()">
                        <i class="fas fa-lock"></i> Close Drawer
                    </button>
                </div>
            `;
        } else {
            // Show recent session history when drawer is closed
            this.showRecentSessionInWidget(widgetElement);
        }
    }

    async showRecentSessionInWidget(widgetElement) {
        try {
            // Get the most recent closed session
            const sessions = await this.getSessionHistory(5);
            const recentSession = sessions.find(session => session.status === 'closed');
            
            if (recentSession && recentSession.closedByName) {
                const sessionDuration = this.calculateSessionDuration(recentSession.openedAt, recentSession.closedAt);
                widgetElement.innerHTML = `
                    <h4><i class="fas fa-cash-register"></i> Cash Drawer</h4>
                    <div class="drawer-closed">
                        <div class="recent-session">
                            <h5>Last Session:</h5>
                            <div class="session-details">
                                <div class="session-line">
                                    <span class="session-action">Opened by:</span> 
                                    <span class="session-user">${recentSession.openedByName}</span>
                                </div>
                                <div class="session-line">
                                    <span class="session-action">Closed by:</span> 
                                    <span class="session-user">${recentSession.closedByName}</span>
                                </div>
                                <div class="session-line">
                                    <span class="session-action">Duration:</span> 
                                    <span class="session-duration">${sessionDuration}</span>
                                </div>
                                <div class="session-line">
                                    <span class="session-action">Final Amount:</span> 
                                    <span class="session-amount">₱${this.formatCurrency(recentSession.closingBalance)}</span>
                                </div>
                                ${recentSession.variance !== 0 ? `
                                <div class="session-line">
                                    <span class="session-action">Variance:</span> 
                                    <span class="session-variance ${recentSession.variance > 0 ? 'positive' : 'negative'}">
                                        ₱${this.formatCurrency(Math.abs(recentSession.variance))} ${recentSession.variance > 0 ? '(Over)' : '(Short)'}
                                    </span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        <button class="btn btn-success btn-sm" onclick="window.cashDrawerManager.showOpenDrawerModal()">
                            <i class="fas fa-unlock"></i> Open Drawer
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
        } catch (error) {
            console.error('Error loading recent session:', error);
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

    calculateSessionDuration(openedAt, closedAt) {
        if (!openedAt || !closedAt) return 'Unknown';
        
        const start = new Date(openedAt);
        const end = new Date(closedAt);
        const diffMs = end - start;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
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

        // Clear any existing click handlers
        posStatusElement.onclick = null;

        const currentUser = this.getCurrentUser();
        const currentUserName = currentUser ? (currentUser.name || currentUser.email || 'Unknown') : 'Unknown';
        
        if (this.isDrawerOpen()) {
            const session = this.currentSession;
            const isDifferentUser = currentUserName !== (session.openedByName || '');
            
            posStatusElement.innerHTML = `
                <span class="badge badge-success clickable-status" title="Click to close drawer">
                    <i class="fas fa-cash-register"></i> Drawer Open
                    <div class="pos-user-info">
                        ${isDifferentUser ? 
                            `<small>Operating: ${currentUserName}</small>` : 
                            `<small>Operator: ${currentUserName}</small>`
                        }
                    </div>
                    <i class="fas fa-chevron-down status-action-icon"></i>
                </span>
            `;
            
            // Add click handler to close drawer
            posStatusElement.onclick = () => {
                console.log('🏪 [POS] Close drawer clicked from status indicator');
                this.showCloseDrawerModal();
            };
            
            console.log('✅ [POS] Status updated to: Drawer Open (clickable to close)');
        } else {
            posStatusElement.innerHTML = `
                <span class="badge badge-danger clickable-status" title="Click to open drawer">
                    <i class="fas fa-lock"></i> Drawer Closed
                    <div class="pos-user-info">
                        <small>User: ${currentUserName}</small>
                    </div>
                    <i class="fas fa-chevron-down status-action-icon"></i>
                </span>
            `;
            
            // Add click handler to open drawer
            posStatusElement.onclick = () => {
                console.log('🏪 [POS] Open drawer clicked from status indicator');
                this.showOpenDrawerModal();
            };
            
            console.log('✅ [POS] Status updated to: Drawer Closed (clickable to open)');
        }

        // Make sure the element is visible and styled properly
        posStatusElement.style.display = 'flex';
        posStatusElement.style.visibility = 'visible';
        posStatusElement.style.cursor = 'pointer';
    }

    showOpenDrawerModal() {
        if (window.openModal) {
            // Update modal header with current user info
            this.updateOpenDrawerModalHeader();
            window.openModal('openDrawerModal');
        }
    }

    updateOpenDrawerModalHeader() {
        const currentUser = this.getCurrentUser();
        const modalHeader = document.querySelector('#openDrawerModal .modal-header h3');
        
        if (modalHeader && currentUser) {
            const userName = currentUser.name || currentUser.email || 'Unknown User';
            modalHeader.innerHTML = `
                <i class="fas fa-unlock"></i> Open Cash Drawer
                <div class="current-user-info">
                    <i class="fas fa-user-circle"></i>
                    <span class="opening-as">Opening as: <strong>${userName}</strong></span>
                </div>
            `;
        }
    }

    showCloseDrawerModal() {
        if (window.openModal) {
            // Pre-populate expected balance
            const expectedBalanceInput = document.getElementById('expectedBalance');
            if (expectedBalanceInput && this.currentSession) {
                expectedBalanceInput.value = this.currentSession.expectedBalance.toFixed(2);
            }
            
            // Update modal header with current user info
            this.updateCloseDrawerModalHeader();
            window.openModal('closeDrawerModal');
        }
    }

    updateCloseDrawerModalHeader() {
        const currentUser = this.getCurrentUser();
        const modalHeader = document.querySelector('#closeDrawerModal .modal-header h3');
        
        if (modalHeader && currentUser && this.currentSession) {
            const userName = currentUser.name || currentUser.email || 'Unknown User';
            const openerName = this.currentSession.openedByName || 'Unknown';
            const isDifferentUser = (currentUser.name || currentUser.email) !== this.currentSession.openedByName;
            
            modalHeader.innerHTML = `
                <i class="fas fa-lock"></i> Close Cash Drawer
                <div class="current-user-info">
                    <i class="fas fa-user-circle"></i>
                    <span class="closing-as">Closing as: <strong>${userName}</strong></span>
                    ${isDifferentUser ? `<small class="session-opener">Session opened by: ${openerName}</small>` : ''}
                </div>
            `;
        }
    }

    showTransferModal() {
        if (window.openModal) {
            // Pre-populate transfer modal with current session data
            this.populateTransferModal();
            window.openModal('transferDrawerModal');
        }
    }

    populateTransferModal() {
        const session = this.currentSession;
        if (!session) return;

        // Current session summary
        const currentSessionElement = document.getElementById('currentSessionSummary');
        if (currentSessionElement) {
            currentSessionElement.innerHTML = `
                <div class="session-summary">
                    <div class="summary-row">
                        <span class="label">Opened By:</span>
                        <span class="value">${session.openedByName}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Opening Float:</span>
                        <span class="value">₱${this.formatCurrency(session.openingFloat)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Current Expected:</span>
                        <span class="value">₱${this.formatCurrency(session.expectedBalance)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Transactions:</span>
                        <span class="value">${session.transactionCount}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Total Sales:</span>
                        <span class="value">₱${this.formatCurrency(session.totalCashSales)}</span>
                    </div>
                </div>
            `;
        }

        // Pre-populate cash count with expected balance
        const cashCountInput = document.getElementById('transferCashCount');
        if (cashCountInput) {
            cashCountInput.value = session.expectedBalance.toFixed(2);
        }

        // Populate employee dropdown
        this.populateEmployeeDropdown();
    }

    async populateEmployeeDropdown() {
        const selectElement = document.getElementById('transferToEmployee');
        if (!selectElement) return;

        try {
            // Clear existing options
            selectElement.innerHTML = '<option value="">Select employee...</option>';

            // Try to get employees from various sources
            let employees = [];

            // Check if employees are available in state manager
            if (window.StateManager) {
                employees = window.StateManager.getState('employees.list') || [];
            }

            // If no employees in state, try to fetch from database
            if (employees.length === 0 && window.db) {
                try {
                    employees = await window.db.getAll('employees') || [];
                } catch (e) {
                    console.warn('Could not fetch employees from IndexedDB:', e);
                }
            }

            // If still no employees, try to fetch from API
            if (employees.length === 0 && window.HybridAPIClient) {
                try {
                    const response = await window.HybridAPIClient.get('/api/business/employees');
                    if (response.success && response.data) {
                        employees = response.data;
                    }
                } catch (e) {
                    console.warn('Could not fetch employees from API:', e);
                }
            }

            // Filter out current user if possible
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                employees = employees.filter(emp => 
                    emp.email !== currentUser.email && 
                    emp.id !== currentUser.id &&
                    emp._id !== currentUser.id
                );
            }

            // Populate dropdown
            employees.forEach(employee => {
                const option = document.createElement('option');
                option.value = employee.id || employee._id;
                option.textContent = `${employee.name} (${employee.position || 'Staff'})`;
                selectElement.appendChild(option);
            });

            if (employees.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No employees available';
                option.disabled = true;
                selectElement.appendChild(option);
            }

        } catch (error) {
            console.error('Error populating employee dropdown:', error);
            selectElement.innerHTML = '<option value="">Error loading employees</option>';
        }
    }

    async transferDrawer(toEmployeeId, toEmployeeName, actualCashCount, handoverNotes = '') {
        try {
            if (!this.currentSession || this.currentSession.status !== 'open') {
                throw new Error('No active cash drawer session to transfer');
            }

            if (!toEmployeeId || !toEmployeeName) {
                throw new Error('Target employee is required for transfer');
            }

            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            // Validate cash count
            const cashCount = parseFloat(actualCashCount);
            if (isNaN(cashCount) || cashCount < 0) {
                throw new Error('Valid cash count is required');
            }

            // Calculate variance from expected balance
            const variance = cashCount - this.currentSession.expectedBalance;
            
            // Create transfer record
            const transferData = {
                fromSessionId: this.currentSession.id,
                fromEmployee: {
                    id: currentUser.email || currentUser.userId,
                    name: currentUser.name || currentUser.email
                },
                toEmployee: {
                    id: toEmployeeId,
                    name: toEmployeeName
                },
                transferredAt: new Date().toISOString(),
                handoverAmount: cashCount,
                expectedAmount: this.currentSession.expectedBalance,
                variance: variance,
                handoverNotes: handoverNotes,
                sessionSummary: {
                    openingFloat: this.currentSession.openingFloat,
                    totalSales: this.currentSession.totalCashSales,
                    transactionCount: this.currentSession.transactionCount,
                    sessionDuration: new Date() - new Date(this.currentSession.openedAt)
                }
            };

            // Close current session with actual cash count
            const closedSession = await this.closeDrawerForTransfer(cashCount, variance, `Transfer to ${toEmployeeName}. ${handoverNotes}`);
            
            // Create new session for receiving employee
            const newSession = await this.openDrawerForTransfer(toEmployeeId, toEmployeeName, cashCount, `Received from ${currentUser.name || currentUser.email}. ${handoverNotes}`);

            // Record the transfer relationship
            transferData.toSessionId = newSession.id;
            transferData.fromSessionClosed = closedSession.id;

            // Save transfer record to IndexedDB
            if (window.db) {
                try {
                    await window.db.add('cashDrawerTransfers', {
                        id: this.generateTransferId(),
                        ...transferData,
                        createdAt: new Date().toISOString(),
                        syncStatus: 'pending'
                    });
                } catch (e) {
                    console.warn('Failed to save transfer record to IndexedDB:', e);
                }
            }

            // Sync transfer to backend if online
            if (this.isOnline && window.HybridAPIClient) {
                try {
                    await window.HybridAPIClient.post('/api/cash-drawer/transfers', transferData);
                } catch (syncError) {
                    console.warn('⚠️ Failed to sync transfer to server:', syncError);
                }
            }

            console.log('✅ Cash drawer transferred successfully');
            
            if (window.showSuccess) {
                const varianceText = variance !== 0 ? ` (Variance: ₱${this.formatCurrency(Math.abs(variance))})` : '';
                window.showSuccess(`Cash drawer transferred to ${toEmployeeName} with ₱${this.formatCurrency(cashCount)}${varianceText}`);
            }

            return {
                closedSession,
                newSession,
                transferData
            };

        } catch (error) {
            console.error('❌ Error transferring cash drawer:', error);
            if (window.showError) {
                window.showError(error.message);
            }
            throw error;
        }
    }

    async closeDrawerForTransfer(actualAmount, variance, notes) {
        // Close current session without UI updates (internal transfer)
        this.currentSession.closedBy = this.currentSession.openedBy;
        this.currentSession.closedByName = this.currentSession.openedByName;
        this.currentSession.closedAt = new Date().toISOString();
        this.currentSession.closingBalance = parseFloat(actualAmount);
        this.currentSession.variance = parseFloat(variance);
        this.currentSession.status = 'closed';
        this.currentSession.notes = notes;
        this.currentSession.syncStatus = 'pending';
        this.currentSession.transferType = 'outgoing';

        // Save to local database
        await window.db.put('cashDrawerSessions', this.currentSession);

        // Sync to backend if online
        if (this.isOnline && window.HybridAPIClient) {
            try {
                await window.HybridAPIClient.put(`/api/cash-drawer/sessions/${this.currentSession.serverId || this.currentSession.id}`, this.currentSession);
            } catch (syncError) {
                console.warn('⚠️ Failed to sync closed transfer session to server:', syncError);
            }
        }

        const closedSession = { ...this.currentSession };
        this.currentSession = null;
        return closedSession;
    }

    async openDrawerForTransfer(employeeId, employeeName, openingFloat, notes) {
        // Create new session for receiving employee
        const newSession = {
            id: this.generateSessionId(),
            openedBy: employeeId,
            openedByName: employeeName,
            openedAt: new Date().toISOString(),
            openingFloat: parseFloat(openingFloat),
            expectedBalance: parseFloat(openingFloat),
            transactionCount: 0,
            totalCashSales: 0,
            status: 'open',
            notes: notes,
            syncStatus: 'pending',
            transferType: 'incoming',
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
                    newSession.serverId = result.data._id;
                    newSession.syncStatus = 'synced';
                    await window.db.put('cashDrawerSessions', newSession);
                }
            } catch (syncError) {
                console.warn('⚠️ Failed to sync new transfer session to server:', syncError);
            }
        }

        return newSession;
    }

    async handleTransferForm() {
        try {
            const toEmployeeId = document.getElementById('transferToEmployee').value;
            const actualCashCount = document.getElementById('transferCashCount').value;
            const handoverNotes = document.getElementById('transferNotes').value;

            if (!toEmployeeId) {
                throw new Error('Please select an employee to transfer to');
            }

            if (!actualCashCount) {
                throw new Error('Cash count is required');
            }

            // Get employee name from dropdown
            const employeeSelect = document.getElementById('transferToEmployee');
            const selectedOption = employeeSelect.options[employeeSelect.selectedIndex];
            const toEmployeeName = selectedOption.textContent.split(' (')[0]; // Extract name without position

            await this.transferDrawer(toEmployeeId, toEmployeeName, parseFloat(actualCashCount), handoverNotes);
            
            if (window.closeModal) {
                window.closeModal('transferDrawerModal');
            }

            // Clear form
            document.getElementById('transferToEmployee').value = '';
            document.getElementById('transferCashCount').value = '';
            document.getElementById('transferNotes').value = '';

            // Update UI to reflect new session
            this.updateUI();

        } catch (error) {
            console.error('❌ Error in transfer form:', error);
            if (window.showError) {
                window.showError(error.message);
            }
        }
    }

    generateTransferId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `transfer_${timestamp}_${random}`;
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