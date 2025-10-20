// SPA Auto-Updater System
// Automatically checks for and applies updates

class AutoUpdater {
    constructor() {
        this.version = '1.8.1'; // Updated to match service worker
        this.updateCheckInterval = 300000; // Check every 5 minutes instead of 30 seconds
        // FREEZE FIX: Disable auto-updater to prevent 404 network errors
        this.updateUrl = null; // 'https://raw.githubusercontent.com/avasolutionsph-source/AvasolutionsPH-PWA/master/updates.json';
        this.pendingUpdates = [];
        this.isUpdating = false;
        this.isFixingBug = false; // Prevent concurrent bug fixes
        this.serviceWorkerVersion = null;
        this.lastRefreshBugCheck = null;
        this.refreshBugDetected = false;
        this.intervalId = null; // Track the interval for cleanup
        this.maxCheckAttempts = 12; // Maximum 12 checks (1 hour at 5 min intervals)
        this.checkAttempts = 0;
    }

    async init() {
        console.log('🔄 Enhanced Auto-Updater initialized v' + this.version);
        
        // Set up service worker communication
        this.setupServiceWorkerCommunication();
        
        // Check for refresh bugs once (not repeatedly)
        setTimeout(async () => {
            if (!this.refreshBugDetected) {
                await this.checkForRefreshBugs();
            }
        }, 5000); // 5-second delay to allow full initialization
        
        // Check for updates immediately
        await this.checkForUpdates();
        
        // Set up periodic checks (with limits)
        this.startPeriodicCheck();
        
        // Add update indicator to UI
        this.addUpdateIndicator();
        
        // Setup cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    cleanup() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('🧹 Auto-updater cleaned up');
    }

    setupServiceWorkerCommunication() {
        if ('serviceWorker' in navigator) {
            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'VERSION_UPDATE') {
                    console.log('🔄 Service Worker version update:', event.data.version);
                    this.serviceWorkerVersion = event.data.version;
                    this.handleServiceWorkerUpdate(event.data);
                }
            });
            
            // Get current service worker version
            this.getServiceWorkerVersion();
        }
    }

    async getServiceWorkerVersion() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
                if (event.data.type === 'VERSION_RESPONSE') {
                    this.serviceWorkerVersion = event.data.version;
                    console.log('📱 Service Worker version:', event.data.version);
                }
            };
            
            navigator.serviceWorker.controller.postMessage(
                { type: 'GET_VERSION' },
                [channel.port2]
            );
        }
    }

    async checkForRefreshBugs() {
        console.log('🔍 Checking for refresh bugs...');
        
        const now = Date.now();
        this.lastRefreshBugCheck = now;
        
        // Check for database failures (skip if repair is in progress or recently completed)
        const repairInProgress = localStorage.getItem('database_repair_in_progress');
        const repairCompleted = localStorage.getItem('database_repair_completed');
        const timeSinceRepair = repairCompleted ? (Date.now() - parseInt(repairCompleted)) : Infinity;
        
        // Check if database was recently initialized successfully
        const dbInitialized = localStorage.getItem('database_initialized');
        const timeSinceInit = dbInitialized ? (Date.now() - parseInt(dbInitialized)) : Infinity;
        
        // Skip detection if repair is in progress or completed within last 2 minutes, or if recently initialized
        if (window.db && !window.db.db && !repairInProgress && timeSinceRepair > 120000 && timeSinceInit > 30000) {
            // Give database one more chance to initialize before showing notification
            console.log('⚠️ Database appears uninitialized, attempting recovery init...');
            try {
                await window.ensureDBInit();
                if (window.db && window.db.db) {
                    console.log('✅ Database initialized successfully on retry');
                    return;
                }
            } catch (error) {
                console.error('❌ Database recovery init failed:', error);
            }
            
            console.warn('⚠️ Database refresh bug detected after retry');
            this.refreshBugDetected = true;
            this.showRefreshBugNotification('database');
            return;
        } else if (window.db && !window.db.db && timeSinceRepair <= 120000) {
            console.log('🔧 Database repair was recent, skipping detection for 2 minutes');
        }
        
        // Check for missing critical elements
        const criticalElements = [
            '#sidebar',
            '#main-content', 
            '.page'
        ];
        
        const missingElements = criticalElements.filter(selector => 
            !document.querySelector(selector)
        );
        
        // UI notification system disabled - skip missing element checks
        if (missingElements.length > 0) {
            console.log('ℹ️ Some UI elements not found, but notifications disabled:', missingElements);
        }
        
        // Check for JavaScript errors in console
        const errorCheck = localStorage.getItem('app_errors');
        if (errorCheck && JSON.parse(errorCheck).length > 0) {
            console.warn('⚠️ JavaScript errors detected');
            this.refreshBugDetected = true;
            this.showRefreshBugNotification('javascript');
            return;
        }
        
        console.log('✅ No refresh bugs detected');
    }

    showRefreshBugNotification(type) {
        // Check if we already showed this notification recently (prevent spam)
        const lastNotification = localStorage.getItem('last_refresh_bug_notification');
        const now = Date.now();
        
        if (lastNotification) {
            const timeSinceLastNotification = now - parseInt(lastNotification);
            if (timeSinceLastNotification < 30000) { // 30 seconds cooldown
                console.log('🚫 Refresh bug notification on cooldown, skipping...');
                return;
            }
        }
        
        localStorage.setItem('last_refresh_bug_notification', now.toString());
        
        const messages = {
            database: {
                title: '🗄️ Database Issue Detected',
                message: 'The database failed to initialize properly.',
                action: 'Fix Database'
            },
            javascript: {
                title: '⚠️ Script Error Detected',
                message: 'JavaScript errors are affecting functionality.',
                action: 'Clear Errors'
            }
        };
        
        const config = messages[type] || messages.database;
        
        const notification = document.createElement('div');
        notification.id = 'refreshBugNotification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 10002;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease;
            text-align: center;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-right: 10px;"></i>
                <strong style="font-size: 18px;">${config.title}</strong>
            </div>
            <p style="margin: 10px 0; opacity: 0.95;">${config.message}</p>
            <p style="margin: 10px 0; font-size: 14px; opacity: 0.8;">This can be fixed automatically:</p>
            <div style="display: flex; gap: 10px; margin-top: 15px; justify-content: center;">
                <button onclick="autoUpdater.fixRefreshBug('${type}')" style="
                    background: white;
                    color: #e74c3c;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: bold;
                    cursor: pointer;
                ">${config.action}</button>
            </div>
        `;
        
        // Remove existing notification
        const existing = document.getElementById('refreshBugNotification');
        if (existing) existing.remove();
        
        document.body.appendChild(notification);
    }

    async fixRefreshBug(type) {
        console.log('🔧 Fixing refresh bug type:', type);
        
        // Prevent multiple concurrent fixes
        if (this.isFixingBug) {
            console.log('🚫 Bug fix already in progress, skipping...');
            return;
        }
        
        this.isFixingBug = true;
        
        const notification = document.getElementById('refreshBugNotification');
        if (notification) {
            notification.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-sync fa-spin" style="font-size: 32px; color: white; margin-bottom: 10px;"></i>
                    <p>Applying fix...</p>
                </div>
            `;
        }
        
        try {
            switch (type) {
                case 'database':
                    // Set a flag to prevent re-detection during repair
                    localStorage.setItem('database_repair_in_progress', 'true');
                    
                    if (window.repairDatabase) {
                        const repairResult = await window.repairDatabase();
                        console.log('🔧 Repair result:', repairResult);
                        
                        // Give it more time to complete and verify properly
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
                        // Force database verification
                        if (window.ensureDBInit) {
                            await window.ensureDBInit();
                        }
                        
                        // Verify database is working
                        if (window.db && window.db.db) {
                            console.log('✅ Database repair completed successfully and verified');
                            // Set a flag to prevent immediate re-detection
                            localStorage.setItem('database_repair_completed', Date.now().toString());
                        } else {
                            console.error('❌ Database repair failed - connection not established');
                            throw new Error('Database connection not established after repair');
                        }
                    }
                    
                    localStorage.removeItem('database_repair_in_progress');
                    localStorage.removeItem('last_refresh_bug_notification'); // Allow new notifications
                    break;
                case 'javascript':
                    localStorage.removeItem('app_errors');
                    location.reload();
                    break;
            }
            
            if (notification) {
                notification.innerHTML = `
                    <div style="text-align: center;">
                        <i class="fas fa-check-circle" style="font-size: 32px; color: white; margin-bottom: 10px;"></i>
                        <p>Fix applied successfully!</p>
                        <button onclick="location.reload()" style="
                            background: white;
                            color: #27ae60;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            margin-top: 10px;
                            cursor: pointer;
                        ">Refresh Now</button>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('❌ Fix failed:', error);
            localStorage.removeItem('database_repair_in_progress');
            
            if (notification) {
                notification.innerHTML = `
                    <div style="text-align: center;">
                        <i class="fas fa-times-circle" style="font-size: 32px; color: white; margin-bottom: 10px;"></i>
                        <p>Fix failed. Please refresh the page manually.</p>
                    </div>
                `;
            }
        } finally {
            // Always reset the fixing flag
            this.isFixingBug = false;
        }
    }

    setupEmergencyUpdates() {
        // Check for emergency updates only once after initialization
        setTimeout(() => {
            this.checkEmergencyUpdates();
        }, 10000); // Single check after 10 seconds
    }

    async checkEmergencyUpdates() {
        try {
            const response = await fetch(this.updateUrl + '?emergency=' + Date.now());
            const updates = await response.json();
            
            if (updates.emergency && updates.emergency.length > 0) {
                console.log('🚨 Emergency updates found:', updates.emergency.length);
                this.showEmergencyUpdateNotification(updates.emergency);
            }
        } catch (error) {
            // Silent fail for emergency checks
        }
    }

    showEmergencyUpdateNotification(emergencyUpdates) {
        const notification = document.createElement('div');
        notification.id = 'emergencyUpdateNotification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            z-index: 10003;
            max-width: 400px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.4);
            text-align: center;
            animation: emergencyPulse 1s ease-in-out infinite;
        `;
        
        notification.innerHTML = `
            <div style="margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <h3 style="margin: 0;">🚨 Critical Update Required</h3>
            </div>
            <p style="margin: 15px 0;">A critical bug fix is available that resolves major functionality issues.</p>
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                ${emergencyUpdates.map(update => `• ${update.title}`).join('<br>')}
            </div>
            <button onclick="autoUpdater.applyEmergencyUpdates()" style="
                width: 100%;
                background: white;
                color: #e74c3c;
                border: none;
                padding: 15px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                margin-top: 15px;
            ">
                Apply Critical Updates Now
            </button>
        `;
        
        document.body.appendChild(notification);
    }

    startPeriodicCheck() {
        // Clear any existing interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        this.intervalId = setInterval(() => {
            this.checkAttempts++;
            
            // Stop after max attempts
            if (this.checkAttempts >= this.maxCheckAttempts) {
                console.log('🛑 Auto-updater reached maximum check attempts, stopping periodic checks');
                clearInterval(this.intervalId);
                this.intervalId = null;
                return;
            }
            
            // Only check for updates, not refresh bugs (too aggressive)
            this.checkForUpdates();
            
        }, this.updateCheckInterval);
        
        console.log(`🔄 Auto-updater will check ${this.maxCheckAttempts} times over ${(this.maxCheckAttempts * this.updateCheckInterval / 60000).toFixed(1)} minutes`);
    }

    async checkForUpdates() {
        // FREEZE FIX: Disable update checking to prevent 404 errors
        if (!this.updateUrl) {
            console.log('📱 Auto-updater disabled for performance');
            return;
        }
        
        try {
            // Get current version from localStorage
            const currentVersion = localStorage.getItem('appVersion') || '1.0.0';
            console.log(`📱 Current version: ${currentVersion}`);
            
            // Check updates.json for available updates
            const response = await fetch(this.updateUrl + '?t=' + Date.now());
            if (!response.ok) {
                // If updates.json doesn't exist, create it locally
                this.createLocalUpdateRegistry();
                return;
            }
            
            const updates = await response.json();
            
            // Find updates newer than current version
            const availableUpdates = updates.updates.filter(update => 
                this.compareVersions(update.version, currentVersion) > 0
            );
            
            if (availableUpdates.length > 0) {
                console.log(`🎉 Found ${availableUpdates.length} updates available`);
                this.pendingUpdates = availableUpdates;
                this.showUpdateNotification(availableUpdates);
            } else {
                console.log('✅ System is up to date');
            }
            
        } catch (error) {
            console.log('📦 Checking for local updates...');
            this.checkLocalUpdates();
        }
    }

    checkLocalUpdates() {
        // Check for specific features that might be missing
        const missingFeatures = [];
        
        // Check for Rooms feature
        if (!document.querySelector('[data-page="rooms"]')) {
            missingFeatures.push({
                name: 'Rooms Management',
                script: 'quick-rooms-fix.js',
                description: 'Room management with timers'
            });
        }
        
        // Check for Gift Certificates in database
        if (window.db && window.db.version < 2) {
            missingFeatures.push({
                name: 'Database Upgrade',
                script: 'update-database.js',
                description: 'Gift certificates and enhanced features'
            });
        }
        
        if (missingFeatures.length > 0) {
            this.showMissingFeaturesNotification(missingFeatures);
        }
    }

    showUpdateNotification(updates) {
        const updateCount = updates.length;
        const latestUpdate = updates[updates.length - 1];
        const updateList = updates.slice(-3).map(u => `• ${u.title}`).join('\n');
        
        // Create update notification
        const notification = document.createElement('div');
        notification.id = 'updateNotification';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <i class="fas fa-download" style="font-size: 24px; margin-right: 10px;"></i>
                <strong style="font-size: 18px;">Updates Available!</strong>
                ${latestUpdate.criticalUpdate ? '<span style="background: red; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 10px;">CRITICAL</span>' : ''}
            </div>
            <p style="margin: 10px 0; opacity: 0.95;">Version ${latestUpdate.version} - ${updateCount} new update(s):</p>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 14px;">
                ${updateList.replace(/\n/g, '<br>')}
            </div>
            ${latestUpdate.features ? `
                <div style="font-size: 12px; opacity: 0.9; margin: 10px 0;">
                    <strong>New Features:</strong><br>
                    ${latestUpdate.features.slice(0, 3).map(f => `• ${f}`).join('<br>')}
                </div>
            ` : ''}
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button onclick="autoUpdater.applyUpdates()" style="
                    flex: 1;
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 10px;
                    border-radius: 6px;
                    font-weight: bold;
                    cursor: pointer;
                ">Install Now</button>
                <button onclick="document.getElementById('updateNotification').remove()" style="
                    flex: 1;
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                ">Later</button>
            </div>
        `;
        
        // Remove existing notification
        const existing = document.getElementById('updateNotification');
        if (existing) existing.remove();
        
        document.body.appendChild(notification);
        
        // Update the indicator
        this.updateIndicator('available');
    }

    showMissingFeaturesNotification(features) {
        const notification = document.createElement('div');
        notification.id = 'featureNotification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <i class="fas fa-puzzle-piece" style="font-size: 24px; margin-right: 10px;"></i>
                <strong style="font-size: 18px;">Missing Features Detected</strong>
            </div>
            <p style="margin: 10px 0; opacity: 0.95;">Click to install these features:</p>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin: 10px 0;">
                ${features.map(f => `• ${f.name}`).join('<br>')}
            </div>
            <button onclick="autoUpdater.installMissingFeatures()" style="
                width: 100%;
                background: white;
                color: #f5576c;
                border: none;
                padding: 12px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                margin-top: 10px;
            ">
                <i class="fas fa-magic"></i> Auto-Install Features
            </button>
        `;
        
        // Remove existing
        const existing = document.getElementById('featureNotification');
        if (existing) existing.remove();
        
        document.body.appendChild(notification);
    }

    async applyUpdates() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        console.log('🚀 Applying updates...');
        
        // Show progress
        this.showUpdateProgress();
        
        for (const update of this.pendingUpdates) {
            try {
                await this.applyUpdate(update);
            } catch (error) {
                console.error(`Failed to apply update ${update.version}:`, error);
            }
        }
        
        // Update version
        const latestVersion = this.pendingUpdates[this.pendingUpdates.length - 1].version;
        localStorage.setItem('appVersion', latestVersion);
        
        // Clear pending updates
        this.pendingUpdates = [];
        this.isUpdating = false;
        
        // Show success
        this.showUpdateSuccess();
    }

    async applyUpdate(update) {
        console.log(`📦 Applying update: ${update.title}`);
        
        // Load and execute update script
        if (update.script) {
            const response = await fetch(update.script + '?t=' + Date.now());
            const script = await response.text();
            eval(script);
        }
        
        // Apply DOM changes if specified
        if (update.domChanges) {
            this.applyDOMChanges(update.domChanges);
        }
    }

    applyDOMChanges(changes) {
        changes.forEach(change => {
            switch (change.action) {
                case 'add':
                    const element = document.querySelector(change.target);
                    if (element && !document.querySelector(change.checkSelector)) {
                        element.insertAdjacentHTML(change.position, change.html);
                    }
                    break;
                case 'remove':
                    const toRemove = document.querySelector(change.selector);
                    if (toRemove) toRemove.remove();
                    break;
                case 'modify':
                    const toModify = document.querySelector(change.selector);
                    if (toModify) {
                        Object.assign(toModify.style, change.styles);
                    }
                    break;
            }
        });
    }

    async installMissingFeatures() {
        console.log('🔧 Installing missing features...');
        
        // Install Rooms feature
        if (!document.querySelector('[data-page="rooms"]')) {
            const script = document.createElement('script');
            script.src = 'quick-rooms-fix.js?t=' + Date.now();
            document.head.appendChild(script);
        }
        
        // Remove notification
        const notification = document.getElementById('featureNotification');
        if (notification) notification.remove();
        
        // Show success
        setTimeout(() => {
            if (window.showNotification) {
                window.showNotification('✅ Missing features have been installed!', 'success');
            }
        }, 2000);
    }

    showUpdateProgress() {
        const progress = document.createElement('div');
        progress.id = 'updateProgress';
        progress.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 50px rgba(0,0,0,0.3);
            z-index: 10001;
            text-align: center;
        `;
        
        progress.innerHTML = `
            <i class="fas fa-sync fa-spin" style="font-size: 48px; color: #667eea; margin-bottom: 20px;"></i>
            <h3>Installing Updates...</h3>
            <p style="color: #666;">Please wait while we update your system</p>
            <div style="
                width: 200px;
                height: 4px;
                background: #e0e0e0;
                border-radius: 2px;
                margin: 20px auto;
                overflow: hidden;
            ">
                <div style="
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    animation: progress 2s ease-in-out infinite;
                "></div>
            </div>
        `;
        
        document.body.appendChild(progress);
    }

    showUpdateSuccess() {
        const progress = document.getElementById('updateProgress');
        if (progress) {
            progress.innerHTML = `
                <i class="fas fa-check-circle" style="font-size: 48px; color: #27ae60; margin-bottom: 20px;"></i>
                <h3>Update Complete!</h3>
                <p style="color: #666;">Your system has been updated successfully</p>
                <button onclick="location.reload()" style="
                    background: #27ae60;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    margin-top: 20px;
                    cursor: pointer;
                    font-weight: bold;
                ">Refresh Page</button>
            `;
        }
        
        // Update indicator
        this.updateIndicator('updated');
        
        // Remove notification
        const notification = document.getElementById('updateNotification');
        if (notification) notification.remove();
    }

    addUpdateIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'updateIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        `;
        
        indicator.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>System Up to Date</span>
        `;
        
        indicator.onclick = () => this.checkForUpdates();
        
        document.body.appendChild(indicator);
    }

    updateIndicator(status) {
        const indicator = document.getElementById('updateIndicator');
        if (!indicator) return;
        
        switch (status) {
            case 'available':
                indicator.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                indicator.innerHTML = `
                    <i class="fas fa-download"></i>
                    <span>Updates Available</span>
                `;
                break;
            case 'updating':
                indicator.style.background = '#f39c12';
                indicator.innerHTML = `
                    <i class="fas fa-sync fa-spin"></i>
                    <span>Updating...</span>
                `;
                break;
            case 'updated':
                indicator.style.background = '#27ae60';
                indicator.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>Updated!</span>
                `;
                setTimeout(() => this.updateIndicator('default'), 3000);
                break;
            default:
                indicator.style.background = '#27ae60';
                indicator.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>System Up to Date</span>
                `;
        }
    }

    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        
        return 0;
    }

    createLocalUpdateRegistry() {
        // Create a local registry of available updates
        const updates = {
            version: '1.1.0',
            updates: [
                {
                    version: '1.0.1',
                    title: 'Rooms Management System',
                    description: 'Add room tracking with timers',
                    script: 'quick-rooms-fix.js',
                    date: '2024-01-20'
                },
                {
                    version: '1.0.2',
                    title: 'Gift Certificate System',
                    description: 'Control numbers and validation',
                    script: 'update-gift-certificates.js',
                    date: '2024-01-20'
                },
                {
                    version: '1.0.3',
                    title: 'Enhanced POS Discounts',
                    description: 'Senior/PWD and promo discounts',
                    script: 'update-pos-discounts.js',
                    date: '2024-01-20'
                }
            ]
        };
        
        localStorage.setItem('localUpdates', JSON.stringify(updates));
    }
}

// Create global instance
window.autoUpdater = new AutoUpdater();

// Add manual update check function
window.checkForUpdates = () => {
    console.log('🔍 Manually checking for updates...');
    window.autoUpdater.checkForUpdates();
};

// Add function to reset version for testing
window.resetAppVersion = () => {
    localStorage.setItem('appVersion', '1.0.0');
    console.log('📱 App version reset to 1.0.0 - reload page to see updates');
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.autoUpdater.init();
    });
} else {
    window.autoUpdater.init();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes progress {
        0% {
            transform: translateX(-100%);
        }
        50% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Auto-Updater loaded and running');