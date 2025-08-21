// Ava Solutions Auto-Updater System
// Automatically checks for and applies updates

class AutoUpdater {
    constructor() {
        this.version = '1.0.0';
        this.updateCheckInterval = 60000; // Check every minute
        this.updateUrl = 'https://raw.githubusercontent.com/avasolutionsph-source/AvaSolutionsPH-August-8/main/updates.json';
        this.pendingUpdates = [];
        this.isUpdating = false;
    }

    async init() {
        console.log('🔄 Auto-Updater initialized');
        
        // Check for updates immediately
        await this.checkForUpdates();
        
        // Set up periodic checks
        this.startPeriodicCheck();
        
        // Add update indicator to UI
        this.addUpdateIndicator();
    }

    startPeriodicCheck() {
        setInterval(() => {
            this.checkForUpdates();
        }, this.updateCheckInterval);
    }

    async checkForUpdates() {
        try {
            // Get current version from localStorage
            const currentVersion = localStorage.getItem('appVersion') || '1.0.0';
            
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
        const updateList = updates.map(u => `• ${u.title}`).join('\n');
        
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
            </div>
            <p style="margin: 10px 0; opacity: 0.95;">${updateCount} new update(s) ready to install:</p>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 14px;">
                ${updateList.replace(/\n/g, '<br>')}
            </div>
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