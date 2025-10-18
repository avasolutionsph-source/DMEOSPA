// Cash Drawer Management System
class CashDrawerManager {
    constructor() {
        this.currentSession = null;
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.statusPollInterval = null;
        this.pollFrequency = 30000; // 30 seconds
        this.lastKnownDrawerState = null;
        this.lastCloseTimestamp = null; // Track when drawer was closed to prevent false warnings

        // Listen for online/offline changes
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.startStatusPolling(); // Resume polling when coming online
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.stopStatusPolling(); // Stop polling when offline
        });
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

            // Start real-time status polling for cross-device awareness
            this.startStatusPolling();
            console.log('✅ Status polling started');

        } catch (error) {
            console.error('❌ Failed to initialize Cash Drawer Manager:', error);
            console.error('❌ Error details:', error.stack);
            throw error;
        }
    }

    startStatusPolling() {
        // Clear any existing polling interval
        if (this.statusPollInterval) {
            clearInterval(this.statusPollInterval);
        }

        // Only start polling if online
        if (!this.isOnline) {
            console.log('📡 Status polling skipped - currently offline');
            return;
        }

        console.log('📡 Starting drawer status polling (every 30 seconds)...');

        // Immediate first check
        this.checkDrawerStatus();

        // Set up recurring polling
        this.statusPollInterval = setInterval(async () => {
            if (this.isOnline && window.HybridAPIClient) {
                await this.checkDrawerStatus();
            }
        }, this.pollFrequency);

        console.log('✅ Drawer status polling started');
    }

    stopStatusPolling() {
        if (this.statusPollInterval) {
            clearInterval(this.statusPollInterval);
            this.statusPollInterval = null;
            console.log('⏹️ Drawer status polling stopped');
        }
    }

    async checkDrawerStatus() {
        try {
            console.log('🔍 Checking drawer status from server...');

            const availability = await window.HybridAPIClient.get('/api/cash-drawer/availability');

            if (!availability.success) {
                console.warn('⚠️ Failed to check drawer status:', availability.error);
                return;
            }

            const currentState = {
                available: availability.available,
                openedBy: availability.openSession?.openedByName || null,
                sessionId: availability.openSession?.sessionId || null,
                openedAt: availability.openSession?.openedAt || null
            };

            // Check if state changed from last check
            if (this.hasDrawerStateChanged(currentState)) {
                console.log('🔄 Drawer state changed:', currentState);

                // FIX: Check if the drawer is open by the SAME USER (not just same device)
                const currentUser = this.getCurrentUser();
                const currentUserIdentifier = currentUser?.email || currentUser?.userId || currentUser?.name;
                const drawerOpenByCurrentUser = currentState.openedBy &&
                                               currentUserIdentifier &&
                                               (currentState.openedBy === currentUserIdentifier ||
                                                currentState.openedBy === currentUser?.email ||
                                                currentState.openedBy === currentUser?.userId);

                console.log('🔍 [SAME USER CHECK]', {
                    currentUserIdentifier,
                    drawerOpenedBy: currentState.openedBy,
                    isSameUser: drawerOpenByCurrentUser,
                    hasLocalSession: this.isDrawerOpen()
                });

                // If drawer is open by someone else (different user) and we don't have a local session
                if (!currentState.available && !this.isDrawerOpen() && !drawerOpenByCurrentUser) {
                    // FIX: Don't show warning if we just closed drawer in last 60 seconds
                    // This prevents false warnings during the backend sync delay period
                    const recentlyClosedByUs = this.lastCloseTimestamp &&
                                               (Date.now() - this.lastCloseTimestamp) < 60000; // 60 seconds

                    if (!recentlyClosedByUs) {
                        this.showDrawerInUseWarning(availability.openSession);
                    } else {
                        console.log('⏭️ [STATUS CHECK] Skipping warning - drawer recently closed by us, waiting for backend sync');
                    }
                } else if (!currentState.available && !this.isDrawerOpen() && drawerOpenByCurrentUser) {
                    // FIX: Drawer is open by SAME USER on different device/browser - load the session locally
                    console.log('✅ [SAME USER] Drawer is open by same user on different device - syncing session locally');
                    await this.loadCurrentSession();
                    this.hideDrawerInUseWarning();
                    this.updateUI();
                }

                // If drawer is now available but we thought it was open, clear local session
                if (currentState.available && this.isDrawerOpen()) {
                    console.warn('⚠️ Drawer closed remotely - clearing local session');

                    // Clear the session from memory
                    this.currentSession = null;

                    // Update state manager
                    if (window.StateManager) {
                        window.StateManager.setState('cashDrawer.currentSession', null);
                        window.StateManager.setState('cashDrawer.isDrawerOpen', false);
                    }

                    this.hideDrawerInUseWarning();
                    this.updateUI();

                    console.log('✅ Local session cleared due to remote closure');
                }

                // If drawer is open by us (either locally or by same user remotely), hide any warnings
                if (!currentState.available && (this.isDrawerOpen() || drawerOpenByCurrentUser)) {
                    this.hideDrawerInUseWarning();
                }

                this.lastKnownDrawerState = currentState;
            }

        } catch (error) {
            console.warn('⚠️ Error checking drawer status:', error);
        }
    }

    hasDrawerStateChanged(newState) {
        if (!this.lastKnownDrawerState) {
            this.lastKnownDrawerState = newState;
            return true;
        }

        const changed =
            this.lastKnownDrawerState.available !== newState.available ||
            this.lastKnownDrawerState.sessionId !== newState.sessionId ||
            this.lastKnownDrawerState.openedBy !== newState.openedBy;

        return changed;
    }

    showDrawerInUseWarning(openSession) {
        console.log('⚠️ Showing drawer in use warning:', openSession);

        // Create warning banner if it doesn't exist
        let warningBanner = document.getElementById('drawer-in-use-warning');

        if (!warningBanner) {
            warningBanner = document.createElement('div');
            warningBanner.id = 'drawer-in-use-warning';
            warningBanner.style.cssText = `
                position: fixed;
                top: 60px;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%);
                color: white;
                padding: 12px 20px;
                text-align: center;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 9998;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                animation: slideDown 0.3s ease-out;
            `;

            document.body.appendChild(warningBanner);
        }

        const openedAt = new Date(openSession.openedAt).toLocaleString();

        warningBanner.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 18px;"></i>
            <span>
                <strong>Cash Drawer In Use:</strong> Currently opened by
                <strong>${openSession.openedByName}</strong> since ${openedAt}
            </span>
        `;

        warningBanner.style.display = 'flex';
    }

    hideDrawerInUseWarning() {
        const warningBanner = document.getElementById('drawer-in-use-warning');
        if (warningBanner) {
            warningBanner.style.display = 'none';
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

            // Step 1: Check for active session in local IndexedDB
            const sessions = await window.db.getAll('cashDrawerSessions');
            let activeSession = sessions.find(session => session.status === 'open');

            if (activeSession) {
                this.currentSession = activeSession;
                console.log('📝 Found active cash drawer session in IndexedDB:', activeSession.id);

                // Update state manager if available
                if (window.StateManager) {
                    window.StateManager.setState('cashDrawer.currentSession', activeSession);
                    window.StateManager.setState('cashDrawer.isDrawerOpen', true);
                }
                return; // Session found locally, we're done
            }

            // Step 2: No local session found - check backend if online
            if (this.isOnline && window.HybridAPIClient) {
                console.log('📡 No local session found - checking backend for active session...');

                try {
                    const availability = await window.HybridAPIClient.get('/api/cash-drawer/availability');

                    if (availability.success && !availability.available && availability.openSession) {
                        // There's an active session on the backend
                        const currentUser = this.getCurrentUser();
                        const currentUserIdentifier = currentUser?.email || currentUser?.userId || currentUser?.name;
                        const sessionOpenedBy = availability.openSession.openedByName;

                        // Check if it belongs to the current user
                        const isMySession = currentUserIdentifier &&
                                          (sessionOpenedBy === currentUserIdentifier ||
                                           sessionOpenedBy === currentUser?.email ||
                                           sessionOpenedBy === currentUser?.userId ||
                                           sessionOpenedBy === currentUser?.name);

                        if (isMySession) {
                            console.log('✅ Found my active session on backend - syncing locally');

                            // Create local copy of the remote session
                            const remoteSession = {
                                id: availability.openSession.sessionId || availability.openSession.id,
                                serverId: availability.openSession._id || availability.openSession.id,
                                openedBy: currentUser.userId || currentUser.email,
                                openedByName: currentUser.name || currentUser.email,
                                openedAt: availability.openSession.openedAt,
                                openingFloat: availability.openSession.openingFloat || 0,
                                expectedBalance: availability.openSession.expectedBalance || availability.openSession.openingFloat || 0,
                                transactionCount: availability.openSession.transactionCount || 0,
                                totalCashSales: availability.openSession.totalCashSales || 0,
                                status: 'open',
                                notes: availability.openSession.notes || '',
                                syncStatus: 'synced',
                                createdAt: availability.openSession.createdAt || availability.openSession.openedAt
                            };

                            // Save to local IndexedDB
                            await window.db.add('cashDrawerSessions', remoteSession);
                            this.currentSession = remoteSession;

                            // Update state manager
                            if (window.StateManager) {
                                window.StateManager.setState('cashDrawer.currentSession', remoteSession);
                                window.StateManager.setState('cashDrawer.isDrawerOpen', true);
                            }

                            console.log('✅ Remote session synced to local storage');
                            return;
                        } else {
                            console.log('📪 Backend has active session but it belongs to different user:', sessionOpenedBy);
                        }
                    } else {
                        console.log('📪 No active session on backend either');
                    }
                } catch (backendError) {
                    console.warn('⚠️ Could not check backend for active session:', backendError);
                }
            }

            // Step 3: No session found anywhere
            console.log('📪 No active cash drawer session found (local or remote)');
            this.currentSession = null;
            if (window.StateManager) {
                window.StateManager.setState('cashDrawer.isDrawerOpen', false);
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

            // CRITICAL: Check backend for ANY open sessions (cross-device check)
            console.log('🔍 Checking drawer availability across all devices...');

            if (this.isOnline && window.HybridAPIClient) {
                try {
                    const availability = await window.HybridAPIClient.get('/api/cash-drawer/availability');

                    if (availability.success && !availability.available) {
                        const openedBy = availability.openSession.openedByName;
                        const openedAt = new Date(availability.openSession.openedAt).toLocaleString();
                        const sessionId = availability.openSession.sessionId;

                        console.error('❌ Drawer already open by another device:', availability.openSession);

                        throw new Error(
                            `Cash drawer is already open!\n\n` +
                            `Opened by: ${openedBy}\n` +
                            `Since: ${openedAt}\n` +
                            `Session: ${sessionId}\n\n` +
                            `Please ask them to close the drawer first, or use Force Close if you have manager permissions.`
                        );
                    }

                    console.log('✅ Drawer availability confirmed - proceeding with opening');
                } catch (availError) {
                    // If availability check fails, warn but allow local check to proceed
                    console.warn('⚠️ Could not check drawer availability from server:', availError);

                    // If it's a clear "drawer open" error, re-throw it
                    if (availError.message && availError.message.includes('already open')) {
                        throw availError;
                    }

                    // Otherwise, continue with local check
                    console.log('📱 Falling back to local drawer check...');
                }
            }

            // Check if drawer is already open locally (backup check)
            if (this.currentSession && this.currentSession.status === 'open') {
                throw new Error('Cash drawer is already open on this device');
            }

            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            console.log('🏪 [DEBUG] Creating session with user:', {
                name: currentUser.name,
                email: currentUser.email,
                userId: currentUser.userId
            });

            // Create new session with robust user data
            const newSession = {
                id: this.generateSessionId(),
                openedBy: currentUser.userId || currentUser.email || 'Unknown User ID',
                openedByName: currentUser.name || currentUser.email || currentUser.userId || 'Unknown User',
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

            console.log('🏪 [DEBUG] New session created:', {
                id: newSession.id,
                openedBy: newSession.openedBy,
                openedByName: newSession.openedByName
            });

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
            await this.syncSessionToBackend(newSession, 'create');

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
                // Handle both API error format {error: "message"} and JavaScript Error objects {message: "message"}
                const errorMessage = error.error || error.message || error.toString() || 'Unknown error occurred';
                window.showError(errorMessage);
            }
            throw error;
        }
    }

    async closeDrawer(closingBalance, variance = 0, notes = '') {
        const startTime = Date.now();
        const sessionId = this.currentSession?.id || 'unknown';
        
        console.log('🔒 [CLOSE DEBUG] Starting cash drawer close operation', {
            sessionId,
            closingBalance,
            variance,
            notes,
            timestamp: new Date().toISOString()
        });

        try {
            // Step 1: Validate current session
            console.log('🔒 [CLOSE DEBUG] Step 1: Validating current session...');
            if (!this.currentSession) {
                throw new Error('No current session found - drawer may already be closed');
            }
            
            if (this.currentSession.status !== 'open') {
                throw new Error(`Session status is '${this.currentSession.status}' - expected 'open'`);
            }

            console.log('✅ [CLOSE DEBUG] Current session validation passed', {
                sessionId: this.currentSession.id,
                status: this.currentSession.status,
                openedAt: this.currentSession.openedAt,
                openedBy: this.currentSession.openedByName
            });

            // Step 2: Validate closing balance
            console.log('🔒 [CLOSE DEBUG] Step 2: Validating closing balance...');
            if (closingBalance < 0) {
                throw new Error('Closing balance cannot be negative');
            }

            if (isNaN(parseFloat(closingBalance))) {
                throw new Error('Closing balance must be a valid number');
            }

            console.log('✅ [CLOSE DEBUG] Closing balance validation passed', {
                closingBalance: parseFloat(closingBalance),
                expectedBalance: this.currentSession.expectedBalance
            });

            // Step 3: Validate user authentication
            console.log('🔒 [CLOSE DEBUG] Step 3: Validating user authentication...');
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated - cannot close drawer');
            }

            console.log('✅ [CLOSE DEBUG] User authentication passed', {
                name: currentUser.name,
                email: currentUser.email,
                userId: currentUser.userId
            });

            // Step 4: Calculate variance
            console.log('🔒 [CLOSE DEBUG] Step 4: Calculating variance...');
            if (variance === 0) {
                variance = parseFloat(closingBalance) - this.currentSession.expectedBalance;
            }

            console.log('✅ [CLOSE DEBUG] Variance calculated', {
                expectedBalance: this.currentSession.expectedBalance,
                closingBalance: parseFloat(closingBalance),
                calculatedVariance: variance
            });

            // Step 5: Update session data
            console.log('🔒 [CLOSE DEBUG] Step 5: Updating session data...');
            const originalSession = { ...this.currentSession };
            
            this.currentSession.closedBy = currentUser.userId || currentUser.email || 'Unknown User ID';
            this.currentSession.closedByName = currentUser.name || currentUser.email || currentUser.userId || 'Unknown User';
            this.currentSession.closedAt = new Date().toISOString();
            this.currentSession.closingBalance = parseFloat(closingBalance);
            this.currentSession.variance = parseFloat(variance);
            this.currentSession.status = 'closed';
            this.currentSession.notes = notes;
            this.currentSession.syncStatus = 'pending';

            console.log('✅ [CLOSE DEBUG] Session data updated', {
                sessionId: this.currentSession.id,
                oldStatus: originalSession.status,
                newStatus: this.currentSession.status,
                closedBy: this.currentSession.closedBy,
                closedByName: this.currentSession.closedByName,
                closedAt: this.currentSession.closedAt,
                closingBalance: this.currentSession.closingBalance,
                variance: this.currentSession.variance
            });

            // Step 6: Save to local database
            console.log('🔒 [CLOSE DEBUG] Step 6: Saving to IndexedDB...');
            if (!window.db) {
                throw new Error('IndexedDB not available - cannot save session');
            }

            const saveStartTime = Date.now();
            await window.db.put('cashDrawerSessions', this.currentSession);
            const saveTime = Date.now() - saveStartTime;

            console.log('✅ [CLOSE DEBUG] Session saved to IndexedDB', {
                sessionId: this.currentSession.id,
                saveTimeMs: saveTime,
                sessionData: {
                    id: this.currentSession.id,
                    status: this.currentSession.status,
                    closingBalance: this.currentSession.closingBalance,
                    variance: this.currentSession.variance
                }
            });

            // Step 7: Update StateManager
            console.log('🔒 [CLOSE DEBUG] Step 7: Updating StateManager...');
            if (window.StateManager) {
                window.StateManager.setState('cashDrawer.currentSession', null);
                window.StateManager.setState('cashDrawer.isDrawerOpen', false);
                console.log('✅ [CLOSE DEBUG] StateManager updated successfully');
            } else {
                console.warn('⚠️ [CLOSE DEBUG] StateManager not available - state may be inconsistent');
            }

            // Step 8: Sync to backend if online
            console.log('🔒 [CLOSE DEBUG] Step 8: Syncing to backend...');
            await this.syncSessionToBackend(this.currentSession, 'close');

            // Step 9: Verify the session was saved correctly
            console.log('🔒 [CLOSE DEBUG] Step 9: Verifying session save...');
            const verificationSuccess = await this.verifySessionClosed(this.currentSession.id);
            if (!verificationSuccess) {
                throw new Error('Session verification failed - drawer may not be properly closed');
            }

            console.log('✅ [CLOSE DEBUG] Session verification passed');

            // Step 10: Final cleanup and state update
            console.log('🔒 [CLOSE DEBUG] Step 10: Final cleanup...');
            const closedSession = { ...this.currentSession };
            this.currentSession = null;
            this.lastCloseTimestamp = Date.now(); // FIX: Track when drawer was closed

            // Update UI
            this.updateUI();

            // FIX: Immediately hide the warning banner after closing drawer
            this.hideDrawerInUseWarning();
            console.log('✅ [CLOSE DEBUG] Warning banner hidden after drawer close');

            // FIX: Reset last known state to force fresh check on next poll
            this.lastKnownDrawerState = {
                available: true,  // We just closed it
                openedBy: null,
                sessionId: null,
                openedAt: null
            };
            console.log('✅ [CLOSE DEBUG] Local drawer state reset to available');

            // FIX: Trigger immediate status check (don't wait 30 seconds)
            setTimeout(async () => {
                if (this.isOnline && window.HybridAPIClient) {
                    await this.checkDrawerStatus();
                    console.log('✅ [CLOSE DEBUG] Immediate post-close status check completed');
                }
            }, 2000); // Wait 2 seconds for backend sync to complete

            const totalTime = Date.now() - startTime;
            console.log('✅ [CLOSE DEBUG] Cash drawer closed successfully', {
                sessionId: closedSession.id,
                totalTimeMs: totalTime,
                finalStatus: closedSession.status,
                closingBalance: closedSession.closingBalance,
                variance: closedSession.variance,
                closedBy: closedSession.closedByName
            });

            if (window.showSuccess) {
                const varianceText = variance !== 0 ? ` (Variance: ₱${this.formatCurrency(Math.abs(variance))})` : '';
                window.showSuccess(`✅ Cash drawer closed successfully with ₱${this.formatCurrency(closingBalance)}${varianceText}`);
            }

            return closedSession;

        } catch (error) {
            const totalTime = Date.now() - startTime;
            console.error('❌ [CLOSE DEBUG] Cash drawer close operation failed', {
                sessionId,
                error: error.message || error.error,
                stack: error.stack,
                totalTimeMs: totalTime,
                currentSessionStatus: this.currentSession?.status || 'no session'
            });

            if (window.showError) {
                // Handle both API error format {error: "message"} and JavaScript Error objects {message: "message"}
                const errorMessage = error.error || error.message || error.toString() || 'Unknown error occurred';
                window.showError(`Failed to close cash drawer: ${errorMessage}`);
            }
            throw error;
        }
    }

    async verifySessionClosed(sessionId) {
        try {
            console.log('🔍 [VERIFY] Verifying session was saved as closed...', { sessionId });
            
            if (!window.db) {
                console.error('❌ [VERIFY] IndexedDB not available for verification');
                return false;
            }

            // Retrieve the session from IndexedDB to verify it was saved correctly
            const savedSession = await window.db.get('cashDrawerSessions', sessionId);
            
            if (!savedSession) {
                console.error('❌ [VERIFY] Session not found in IndexedDB', { sessionId });
                return false;
            }

            const isCorrectlyClosed = savedSession.status === 'closed' && 
                                    savedSession.closedAt && 
                                    savedSession.closingBalance !== undefined &&
                                    savedSession.closedBy &&
                                    savedSession.closedByName;

            if (isCorrectlyClosed) {
                console.log('✅ [VERIFY] Session verified as properly closed', {
                    sessionId: savedSession.id,
                    status: savedSession.status,
                    closedAt: savedSession.closedAt,
                    closingBalance: savedSession.closingBalance,
                    closedBy: savedSession.closedByName,
                    variance: savedSession.variance
                });
                return true;
            } else {
                console.error('❌ [VERIFY] Session found but not properly closed', {
                    sessionId: savedSession.id,
                    status: savedSession.status,
                    hasClosedAt: !!savedSession.closedAt,
                    hasClosingBalance: savedSession.closingBalance !== undefined,
                    hasClosedBy: !!savedSession.closedBy,
                    hasClosedByName: !!savedSession.closedByName
                });
                return false;
            }

        } catch (error) {
            console.error('❌ [VERIFY] Error during session verification', {
                sessionId,
                error: error.message
            });
            return false;
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
        console.log('🔍 [DEBUG] Getting current user...');
        
        // Get current user from various sources
        if (window.StateManager) {
            const user = window.StateManager.getState('auth.currentUser');
            if (user) {
                console.log('🔍 [DEBUG] User from StateManager:', user);
                console.log('🔍 [DEBUG] Available user fields:', Object.keys(user));
                return this.normalizeUserData(user);
            }
        }
        
        if (window.tokenManager && window.tokenManager.getUser) {
            const user = window.tokenManager.getUser();
            if (user) {
                console.log('🔍 [DEBUG] User from tokenManager:', user);
                console.log('🔍 [DEBUG] Available user fields:', Object.keys(user));
                return this.normalizeUserData(user);
            }
        }

        // Fallback to localStorage
        const authData = localStorage.getItem('authData');
        if (authData) {
            try {
                const user = JSON.parse(authData);
                console.log('🔍 [DEBUG] User from localStorage:', user);
                console.log('🔍 [DEBUG] Available user fields:', Object.keys(user));
                return this.normalizeUserData(user);
            } catch (e) {
                console.warn('Failed to parse auth data from localStorage');
            }
        }

        console.warn('🔍 [DEBUG] No user found in any source');
        return null;
    }

    normalizeUserData(user) {
        if (!user) return null;

        // Try different possible name fields in order of preference
        const possibleNameFields = ['name', 'displayName', 'fullName', 'firstName', 'username'];
        const possibleEmailFields = ['email', 'emailAddress', 'userEmail'];
        const possibleIdFields = ['id', 'userId', '_id', 'user_id'];

        let userName = null;
        let userEmail = null;
        let userId = null;

        // Find the best name field
        for (const field of possibleNameFields) {
            if (user[field] && typeof user[field] === 'string' && user[field].trim() !== '') {
                userName = user[field].trim();
                console.log(`🔍 [DEBUG] Found user name in field '${field}':`, userName);
                break;
            }
        }

        // Find the best email field
        for (const field of possibleEmailFields) {
            if (user[field] && typeof user[field] === 'string' && user[field].trim() !== '') {
                userEmail = user[field].trim();
                console.log(`🔍 [DEBUG] Found user email in field '${field}':`, userEmail);
                break;
            }
        }

        // Find the best ID field
        for (const field of possibleIdFields) {
            if (user[field] && user[field].toString().trim() !== '') {
                userId = user[field].toString().trim();
                console.log(`🔍 [DEBUG] Found user ID in field '${field}':`, userId);
                break;
            }
        }

        // If we have firstName and lastName separately, combine them
        if (!userName && user.firstName && user.lastName) {
            userName = `${user.firstName} ${user.lastName}`.trim();
            console.log('🔍 [DEBUG] Combined firstName + lastName:', userName);
        }

        // Create normalized user object
        const normalizedUser = {
            ...user, // Keep all original fields
            name: userName || userEmail || userId || 'User',
            email: userEmail || userId || 'No Email',
            userId: userId || userEmail || 'No ID'
        };

        console.log('🔍 [DEBUG] Normalized user data:', {
            name: normalizedUser.name,
            email: normalizedUser.email,
            userId: normalizedUser.userId
        });

        return normalizedUser;
    }

    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `drawer_${timestamp}_${random}`;
    }

    async debugCurrentState() {
        console.log('🔍 [STATE DEBUG] === CASH DRAWER STATE DIAGNOSIS ===');
        
        try {
            // Check current session in memory
            console.log('🔍 [STATE DEBUG] 1. Memory State:', {
                hasCurrentSession: !!this.currentSession,
                sessionId: this.currentSession?.id || 'none',
                sessionStatus: this.currentSession?.status || 'none',
                isDrawerOpen: this.isDrawerOpen()
            });

            // Check StateManager state
            if (window.StateManager) {
                const stateManagerSession = window.StateManager.getState('cashDrawer.currentSession');
                const stateManagerIsOpen = window.StateManager.getState('cashDrawer.isDrawerOpen');
                
                console.log('🔍 [STATE DEBUG] 2. StateManager State:', {
                    hasSession: !!stateManagerSession,
                    sessionId: stateManagerSession?.id || 'none',
                    isDrawerOpen: stateManagerIsOpen
                });
            } else {
                console.log('🔍 [STATE DEBUG] 2. StateManager: Not available');
            }

            // Check IndexedDB for active sessions
            if (window.db) {
                const allSessions = await window.db.getAll('cashDrawerSessions');
                const activeSessions = allSessions.filter(session => session.status === 'open');
                const recentSessions = allSessions
                    .sort((a, b) => new Date(b.createdAt || b.openedAt) - new Date(a.createdAt || a.openedAt))
                    .slice(0, 3);

                console.log('🔍 [STATE DEBUG] 3. IndexedDB State:', {
                    totalSessions: allSessions.length,
                    activeSessions: activeSessions.length,
                    activeSessionIds: activeSessions.map(s => s.id),
                    recentSessions: recentSessions.map(s => ({
                        id: s.id,
                        status: s.status,
                        openedAt: s.openedAt,
                        closedAt: s.closedAt
                    }))
                });

                // Check for specific session if provided
                if (this.currentSession?.id) {
                    const specificSession = await window.db.get('cashDrawerSessions', this.currentSession.id);
                    console.log('🔍 [STATE DEBUG] 4. Current Session in DB:', {
                        found: !!specificSession,
                        status: specificSession?.status,
                        closedAt: specificSession?.closedAt,
                        closingBalance: specificSession?.closingBalance
                    });
                }
            } else {
                console.log('🔍 [STATE DEBUG] 3. IndexedDB: Not available');
            }

            // Check UI state
            const drawerStatusElements = document.querySelectorAll('.cash-drawer-status');
            const posStatus = document.getElementById('pos-drawer-status');
            
            console.log('🔍 [STATE DEBUG] 5. UI State:', {
                statusElementsCount: drawerStatusElements.length,
                posStatusExists: !!posStatus,
                posStatusText: posStatus?.textContent?.trim() || 'none'
            });

            console.log('🔍 [STATE DEBUG] === END STATE DIAGNOSIS ===');

        } catch (error) {
            console.error('❌ [STATE DEBUG] Error during state diagnosis:', error);
        }
    }

    async getCurrentDrawerStatus() {
        // Public method to get comprehensive drawer status
        const status = {
            isOpen: this.isDrawerOpen(),
            currentSession: this.currentSession ? {
                id: this.currentSession.id,
                status: this.currentSession.status,
                openedAt: this.currentSession.openedAt,
                openedBy: this.currentSession.openedByName
            } : null,
            timestamp: new Date().toISOString()
        };

        // Add StateManager state if available
        if (window.StateManager) {
            status.stateManager = {
                isDrawerOpen: window.StateManager.getState('cashDrawer.isDrawerOpen'),
                hasSession: !!window.StateManager.getState('cashDrawer.currentSession')
            };
        }

        // Add IndexedDB state if available
        if (window.db) {
            try {
                const activeSessions = await window.db.getAll('cashDrawerSessions');
                status.database = {
                    activeSessions: activeSessions.filter(s => s.status === 'open').length,
                    totalSessions: activeSessions.length
                };
            } catch (error) {
                status.database = { error: error.message };
            }
        }

        return status;
    }

    async syncSessionToBackend(session, operation = 'update') {
        if (!this.isOnline || !window.HybridAPIClient) {
            console.log(`🔒 [SYNC ${operation.toUpperCase()}] Skipping backend sync - offline or API client not available`);
            return { success: false, reason: 'offline' };
        }

        const startTime = Date.now();
        console.log(`🔒 [SYNC ${operation.toUpperCase()}] Starting backend sync for session ${session.id}...`);

        try {
            let result;
            let apiEndpoint;
            let requestMethod;

            if (operation === 'create') {
                // For creating new sessions
                apiEndpoint = '/api/cash-drawer/sessions';
                requestMethod = 'post';
                
                console.log(`🔒 [SYNC CREATE] Creating new session via POST ${apiEndpoint}`);
                result = await window.HybridAPIClient.post(apiEndpoint, session);
                
            } else if (operation === 'close' || operation === 'update') {
                // For updating/closing existing sessions
                // Try multiple possible identifiers for backend compatibility
                const possibleIds = [
                    session.serverId,    // Server-assigned ID from creation
                    session.sessionId,   // Custom session ID
                    session.id,          // Local ID
                    session._id          // MongoDB ID
                ].filter(id => id && id.toString().trim() !== '');

                console.log(`🔒 [SYNC ${operation.toUpperCase()}] Attempting sync with possible IDs:`, possibleIds);

                let lastError = null;
                let syncSuccess = false;

                // Try each possible ID until one works
                for (const tryId of possibleIds) {
                    try {
                        apiEndpoint = `/api/cash-drawer/sessions/${tryId}`;
                        console.log(`🔒 [SYNC ${operation.toUpperCase()}] Trying PUT ${apiEndpoint}...`);
                        
                        result = await window.HybridAPIClient.put(apiEndpoint, session);
                        
                        if (result.success) {
                            console.log(`✅ [SYNC ${operation.toUpperCase()}] Success with ID: ${tryId}`);
                            syncSuccess = true;
                            break;
                        } else {
                            console.warn(`⚠️ [SYNC ${operation.toUpperCase()}] Failed with ID ${tryId}:`, result);
                            lastError = result;
                        }
                        
                    } catch (error) {
                        console.warn(`⚠️ [SYNC ${operation.toUpperCase()}] Error with ID ${tryId}:`, error.message);
                        lastError = error;
                        
                        // If it's a 404, try the next ID
                        if (error.status === 404) {
                            continue;
                        } else {
                            // For other errors, break and handle
                            break;
                        }
                    }
                }

                if (!syncSuccess) {
                    // If all PUT attempts failed, try creating as a new session
                    console.log(`🔒 [SYNC ${operation.toUpperCase()}] All PUT attempts failed, trying POST as new session...`);
                    try {
                        result = await window.HybridAPIClient.post('/api/cash-drawer/sessions', session);
                        if (result.success) {
                            console.log(`✅ [SYNC ${operation.toUpperCase()}] Success via POST (created as new session)`);
                            syncSuccess = true;
                        }
                    } catch (createError) {
                        console.error(`❌ [SYNC ${operation.toUpperCase()}] POST fallback also failed:`, createError);
                        throw lastError || createError;
                    }
                }

                if (!syncSuccess) {
                    throw lastError || new Error('All sync attempts failed');
                }
            }

            const syncTime = Date.now() - startTime;

            if (result.success) {
                // Update session with server data
                if (result.data) {
                    session.serverId = result.data._id || result.data.id;
                    session.syncStatus = 'synced';
                    session.lastSyncAt = new Date().toISOString();
                }

                // Save updated session to IndexedDB
                await window.db.put('cashDrawerSessions', session);

                console.log(`✅ [SYNC ${operation.toUpperCase()}] Backend sync successful`, {
                    sessionId: session.id,
                    serverId: session.serverId,
                    syncTimeMs: syncTime,
                    operation: operation
                });

                return { success: true, data: result.data, syncTime };

            } else {
                console.warn(`⚠️ [SYNC ${operation.toUpperCase()}] Backend returned failure`, {
                    sessionId: session.id,
                    result: result
                });

                // Mark as pending for retry later
                session.syncStatus = 'pending';
                session.lastSyncError = result.error || 'Unknown error';
                await window.db.put('cashDrawerSessions', session);

                return { success: false, error: result.error };
            }

        } catch (error) {
            const syncTime = Date.now() - startTime;
            
            console.error(`❌ [SYNC ${operation.toUpperCase()}] Backend sync failed`, {
                sessionId: session.id,
                error: error.message,
                syncTimeMs: syncTime,
                status: error.status
            });

            // Mark as pending for retry later
            session.syncStatus = 'pending';
            session.lastSyncError = error.message;
            session.lastSyncAttempt = new Date().toISOString();
            
            try {
                await window.db.put('cashDrawerSessions', session);
            } catch (dbError) {
                console.error('❌ [SYNC] Failed to update session with error status:', dbError);
            }

            return { success: false, error: error.message, status: error.status };
        }
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
        console.log('🔒 [FORM DEBUG] Starting close drawer form submission...');
        
        // Get form elements for validation and user feedback
        const closingBalanceInput = document.getElementById('closingBalance');
        const notesInput = document.getElementById('closeDrawerNotes');
        const submitButton = document.querySelector('#closeDrawerModal .btn-danger');
        
        try {
            // Step 1: Validate form inputs
            console.log('🔒 [FORM DEBUG] Step 1: Validating form inputs...');
            
            const closingBalance = closingBalanceInput?.value;
            const notes = notesInput?.value || '';

            if (!closingBalance || closingBalance.trim() === '') {
                throw new Error('Closing balance is required - please enter the actual cash amount');
            }

            const numericBalance = parseFloat(closingBalance);
            if (isNaN(numericBalance) || numericBalance < 0) {
                throw new Error('Closing balance must be a valid positive number');
            }

            console.log('✅ [FORM DEBUG] Form validation passed', {
                closingBalance: numericBalance,
                notes: notes || 'No notes provided'
            });

            // Step 2: Show loading state
            console.log('🔒 [FORM DEBUG] Step 2: Setting loading state...');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Closing Drawer...';
                submitButton.disabled = true;
            }

            // Step 3: Close the drawer
            console.log('🔒 [FORM DEBUG] Step 3: Calling closeDrawer method...');
            const closedSession = await this.closeDrawer(numericBalance, 0, notes);
            
            console.log('✅ [FORM DEBUG] Close drawer operation completed successfully', {
                sessionId: closedSession.id,
                finalStatus: closedSession.status
            });

            // Step 4: Close modal and clear form
            console.log('🔒 [FORM DEBUG] Step 4: Closing modal and clearing form...');
            if (window.closeModal) {
                window.closeModal('closeDrawerModal');
            }

            // Clear form
            if (closingBalanceInput) closingBalanceInput.value = '';
            if (notesInput) notesInput.value = '';

            console.log('✅ [FORM DEBUG] Close drawer form completed successfully');

        } catch (error) {
            console.error('❌ [FORM DEBUG] Close drawer form failed', {
                error: error.message,
                stack: error.stack,
                formData: {
                    closingBalance: closingBalanceInput?.value,
                    notes: notesInput?.value
                }
            });
            
            // Show detailed error to user
            if (window.showError) {
                let errorMessage = `Failed to close cash drawer: ${error.message}`;
                
                // Add helpful hints for common errors
                if (error.message.includes('required')) {
                    errorMessage += '\n\nPlease ensure all required fields are filled out.';
                } else if (error.message.includes('authentication')) {
                    errorMessage += '\n\nPlease try logging out and logging back in.';
                } else if (error.message.includes('IndexedDB')) {
                    errorMessage += '\n\nThere may be a storage issue. Please try refreshing the page.';
                }
                
                window.showError(errorMessage);
            }
        } finally {
            // Reset button state
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-lock"></i> Close Drawer';
                submitButton.disabled = false;
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