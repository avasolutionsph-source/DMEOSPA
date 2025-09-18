// Performance Settings Manager for Old/Slow Devices
// Optimizes the PWA for devices with limited resources

class PerformanceSettings {
    constructor() {
        this.settings = {
            enabled: false,
            reducedAnimations: true,
            simplifiedUI: false,
            aggressiveCaching: true,
            reducedRefreshRate: true,
            limitDataLoad: true,
            disableBackgroundSync: false,
            lowMemoryMode: false
        };
        
        this.loadSettings();
        this.detectDeviceCapabilities();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('performanceMode');
        if (saved) {
            try {
                this.settings = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load performance settings:', e);
            }
        }
    }
    
    saveSettings() {
        localStorage.setItem('performanceMode', JSON.stringify(this.settings));
        this.applySettings();
    }
    
    detectDeviceCapabilities() {
        // Auto-detect if device needs performance mode
        const memory = navigator.deviceMemory || 4; // GB of RAM
        const cores = navigator.hardwareConcurrency || 4;
        const connection = navigator.connection;
        
        // Auto-enable for low-end devices
        if (memory <= 2 || cores <= 2) {
            console.log('🐢 Low-end device detected, suggesting performance mode');
            this.suggestPerformanceMode();
        }
        
        // Check connection speed
        if (connection && connection.effectiveType) {
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                console.log('📶 Slow connection detected');
                this.settings.aggressiveCaching = true;
            }
        }
    }
    
    suggestPerformanceMode() {
        // Only suggest once
        if (localStorage.getItem('performanceModeSuggested')) return;
        
        localStorage.setItem('performanceModeSuggested', 'true');
        
        // Show suggestion after page loads
        setTimeout(() => {
            if (confirm('We detected you might be using an older device. Would you like to enable Performance Mode for a smoother experience?')) {
                this.enablePerformanceMode();
            }
        }, 3000);
    }
    
    enablePerformanceMode() {
        this.settings.enabled = true;
        this.settings.reducedAnimations = true;
        this.settings.simplifiedUI = true;
        this.settings.aggressiveCaching = true;
        this.settings.reducedRefreshRate = true;
        this.settings.limitDataLoad = true;
        this.settings.lowMemoryMode = true;
        
        this.saveSettings();
        console.log('⚡ Performance mode enabled');
        
        // Show success message
        if (window.showSuccess) {
            window.showSuccess('Performance mode enabled! The app will run smoother on your device.');
        }
    }
    
    disablePerformanceMode() {
        this.settings.enabled = false;
        this.saveSettings();
        console.log('🚀 Performance mode disabled');
        
        if (window.showSuccess) {
            window.showSuccess('Performance mode disabled. All features restored.');
        }
    }
    
    applySettings() {
        if (!this.settings.enabled) {
            this.restoreNormalMode();
            return;
        }
        
        // Reduce animations
        if (this.settings.reducedAnimations) {
            document.body.classList.add('reduce-animations');
            this.addReducedAnimationStyles();
        }
        
        // Simplify UI
        if (this.settings.simplifiedUI) {
            document.body.classList.add('simplified-ui');
        }
        
        // Reduce refresh rates
        if (this.settings.reducedRefreshRate) {
            this.adjustRefreshRates();
        }
        
        // Limit data loading
        if (this.settings.limitDataLoad) {
            this.setDataLimits();
        }
        
        // Low memory mode
        if (this.settings.lowMemoryMode) {
            this.enableLowMemoryMode();
        }
    }
    
    restoreNormalMode() {
        document.body.classList.remove('reduce-animations', 'simplified-ui');
        
        // Restore normal refresh rates
        if (window.dashboardManager) {
            window.dashboardManager.updateFrequency = 240000; // 4 minutes
        }
        
        // Restore normal data limits
        if (window.customerManager) {
            window.customerManager.pageSize = 20;
        }
        if (window.productsManager) {
            window.productsManager.pageSize = 20;
        }
    }
    
    addReducedAnimationStyles() {
        if (document.getElementById('performance-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'performance-styles';
        style.textContent = `
            .reduce-animations * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }
            
            .reduce-animations .modal {
                animation: none !important;
            }
            
            .simplified-ui .card-shadow,
            .simplified-ui .shadow-sm,
            .simplified-ui .shadow-md,
            .simplified-ui .shadow-lg {
                box-shadow: none !important;
            }
            
            .simplified-ui .gradient-bg {
                background: var(--primary-color) !important;
            }
            
            .simplified-ui img {
                filter: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    adjustRefreshRates() {
        // Reduce dashboard refresh to 10 minutes
        if (window.enhancedDashboardManager) {
            window.enhancedDashboardManager.updateFrequency = 600000; // 10 minutes
        }
        
        // Reduce sync frequency
        if (window.syncManager) {
            window.syncManager.syncInterval = 600000; // 10 minutes
        }
    }
    
    setDataLimits() {
        // Reduce page sizes for pagination
        if (window.customerManager) {
            window.customerManager.pageSize = 10;
        }
        if (window.productsManager) {
            window.productsManager.pageSize = 10;
        }
        if (window.employeeManager) {
            window.employeeManager.pageSize = 10;
        }
        
        // Limit transaction history to 7 days
        if (window.HybridAPIClient) {
            window.HybridAPIClient.maxTransactionDays = 7;
        }
    }
    
    enableLowMemoryMode() {
        // More aggressive memory cleanup
        if (window.memoryManager) {
            window.memoryManager.cleanupInterval = 30000; // Every 30 seconds
            window.memoryManager.gcInterval = 120000; // Every 2 minutes
        }
        
        // Clear caches more frequently
        setInterval(() => {
            if (window.HybridAPIClient && window.HybridAPIClient.cache) {
                window.HybridAPIClient.cache.clear();
                console.log('🧹 Cache cleared for low memory mode');
            }
        }, 300000); // Every 5 minutes
    }
    
    // UI Toggle Component
    createToggleUI() {
        return `
            <div class="performance-settings">
                <h3>Performance Settings</h3>
                <p>Optimize the app for older or slower devices</p>
                
                <div class="setting-group">
                    <label class="toggle-switch">
                        <input type="checkbox" id="performanceModeToggle" 
                               ${this.settings.enabled ? 'checked' : ''}
                               onchange="window.performanceSettings.togglePerformanceMode(this.checked)">
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Performance Mode</span>
                    </label>
                    <small>Reduces animations and optimizes for speed</small>
                </div>
                
                ${this.settings.enabled ? `
                    <div class="performance-options" style="margin-top: 20px; padding-left: 20px;">
                        <label>
                            <input type="checkbox" ${this.settings.reducedAnimations ? 'checked' : ''}
                                   onchange="window.performanceSettings.updateSetting('reducedAnimations', this.checked)">
                            Reduce Animations
                        </label><br>
                        
                        <label>
                            <input type="checkbox" ${this.settings.simplifiedUI ? 'checked' : ''}
                                   onchange="window.performanceSettings.updateSetting('simplifiedUI', this.checked)">
                            Simplified UI
                        </label><br>
                        
                        <label>
                            <input type="checkbox" ${this.settings.aggressiveCaching ? 'checked' : ''}
                                   onchange="window.performanceSettings.updateSetting('aggressiveCaching', this.checked)">
                            Aggressive Caching
                        </label><br>
                        
                        <label>
                            <input type="checkbox" ${this.settings.reducedRefreshRate ? 'checked' : ''}
                                   onchange="window.performanceSettings.updateSetting('reducedRefreshRate', this.checked)">
                            Slower Refresh Rates
                        </label><br>
                        
                        <label>
                            <input type="checkbox" ${this.settings.limitDataLoad ? 'checked' : ''}
                                   onchange="window.performanceSettings.updateSetting('limitDataLoad', this.checked)">
                            Limit Data Loading
                        </label><br>
                        
                        <label>
                            <input type="checkbox" ${this.settings.lowMemoryMode ? 'checked' : ''}
                                   onchange="window.performanceSettings.updateSetting('lowMemoryMode', this.checked)">
                            Low Memory Mode
                        </label>
                    </div>
                ` : ''}
                
                <div class="device-info" style="margin-top: 20px; font-size: 0.9em; color: #666;">
                    <strong>Device Info:</strong><br>
                    RAM: ${navigator.deviceMemory || 'Unknown'} GB<br>
                    CPU Cores: ${navigator.hardwareConcurrency || 'Unknown'}<br>
                    Connection: ${navigator.connection?.effectiveType || 'Unknown'}
                </div>
            </div>
        `;
    }
    
    togglePerformanceMode(enabled) {
        if (enabled) {
            this.enablePerformanceMode();
        } else {
            this.disablePerformanceMode();
        }
        
        // Refresh the settings UI
        this.refreshSettingsUI();
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }
    
    refreshSettingsUI() {
        const container = document.getElementById('performanceSettingsContainer');
        if (container) {
            container.innerHTML = this.createToggleUI();
        }
    }
}

// Initialize performance settings
const performanceSettings = new PerformanceSettings();
window.performanceSettings = performanceSettings;

// Apply settings on load
document.addEventListener('DOMContentLoaded', () => {
    performanceSettings.applySettings();
});

console.log('⚡ Performance Settings Manager loaded');