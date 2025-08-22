// Enhanced Settings Management with Configuration Service
// Maintains backward compatibility while using unified config service

class SettingsManager {
    constructor() {
        this.settings = {};
        this.configReady = false;
        this.fallbackMode = false; // If config service fails, use old methods
    }

    async init() {
        // Clear any existing dynamic content first
        this.clearDynamicContent();
        
        // Wait for config service to be ready
        await this.waitForConfigService();
        
        await this.loadSettings();
        this.setupEventListeners();
        this.addBusinessTypeSection();
        this.addPerformanceSection();
        this.addLoggingSection();
        this.addSyncButton();
        this.addImportButton();
        this.addThemeSection(); // New theme management
        this.addConfigValidationSection(); // New validation section
        this.displaySyncStatus();
    }

    async waitForConfigService() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds timeout
        
        while (attempts < maxAttempts) {
            if (window.config && window.config.isInitialized) {
                this.configReady = true;
                console.log('✅ Settings Manager: Config service ready');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('⚠️ Settings Manager: Config service timeout, using fallback mode');
        this.fallbackMode = true;
    }

    // Enhanced configuration getters/setters with fallbacks
    async getConfig(key, defaultValue = null) {
        if (this.configReady && !this.fallbackMode) {
            try {
                return await window.config.get(key, defaultValue);
            } catch (error) {
                console.warn(`Config service error for ${key}, falling back:`, error);
                this.fallbackMode = true;
            }
        }
        
        // Fallback to old methods
        return this.getConfigFallback(key, defaultValue);
    }

    async setConfig(key, value) {
        if (this.configReady && !this.fallbackMode) {
            try {
                const success = await window.config.set(key, value);
                if (success) return true;
                console.warn(`Config service failed for ${key}, falling back`);
                this.fallbackMode = true;
            } catch (error) {
                console.warn(`Config service error for ${key}, falling back:`, error);
                this.fallbackMode = true;
            }
        }
        
        // Fallback to old methods
        return this.setConfigFallback(key, value);
    }

    getConfigFallback(key, defaultValue) {
        // Map config keys to old storage locations
        const keyMap = {
            'businessName': () => {
                if (window.database) {
                    return window.database.get('settings', 'businessName').then(r => r?.value);
                }
                return localStorage.getItem('businessName');
            },
            'performanceMode': () => localStorage.getItem('perfMode') || 'auto',
            'theme': () => localStorage.getItem('theme') || 'auto',
            'apiUrl': () => {
                if (window.database) {
                    return window.database.get('settings', 'apiUrl').then(r => r?.value);
                }
                return 'https://ava-marketing-api.onrender.com';
            },
            'loggingEnabled': () => localStorage.getItem('ava_logging_enabled') === 'true',
            'debugMode': () => localStorage.getItem('debugMode') === 'true',
            'businessConfig': () => {
                if (window.database) {
                    return window.database.get('settings', 'businessConfig').then(r => r?.value);
                }
                return null;
            }
        };

        const getter = keyMap[key];
        if (getter) {
            const result = getter();
            return Promise.resolve(result).then(val => val !== null ? val : defaultValue);
        }
        
        return Promise.resolve(defaultValue);
    }

    async setConfigFallback(key, value) {
        try {
            // Map config keys to old storage methods
            switch (key) {
                case 'businessName':
                    if (window.database) {
                        await window.database.update('settings', { key: 'businessName', value });
                    }
                    localStorage.setItem('businessName', value);
                    break;
                    
                case 'performanceMode':
                    localStorage.setItem('perfMode', value);
                    break;
                    
                case 'theme':
                    localStorage.setItem('theme', value);
                    break;
                    
                case 'apiUrl':
                    if (window.database) {
                        await window.database.update('settings', { key: 'apiUrl', value });
                    }
                    break;
                    
                case 'loggingEnabled':
                    localStorage.setItem('ava_logging_enabled', String(value));
                    break;
                    
                case 'debugMode':
                    localStorage.setItem('debugMode', String(value));
                    break;
                    
                case 'businessConfig':
                    if (window.database) {
                        await window.database.update('settings', { key: 'businessConfig', value });
                    }
                    break;
                    
                default:
                    console.warn(`No fallback setter for config key: ${key}`);
                    return false;
            }
            return true;
        } catch (error) {
            console.error(`Fallback setter failed for ${key}:`, error);
            return false;
        }
    }

    setupEventListeners() {
        // Save settings button
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn && !saveBtn.hasAttribute('data-listener')) {
            saveBtn.addEventListener('click', async () => {
                await this.saveSettings();
            });
            saveBtn.setAttribute('data-listener', 'true');
        }

        // Export data button
        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn && !exportBtn.hasAttribute('data-listener')) {
            exportBtn.addEventListener('click', async () => {
                await this.exportData();
            });
            exportBtn.setAttribute('data-listener', 'true');
        }

        // Clear data button
        const clearBtn = document.getElementById('clearDataBtn');
        if (clearBtn && !clearBtn.hasAttribute('data-listener')) {
            clearBtn.addEventListener('click', async () => {
                await this.clearAllData();
            });
            clearBtn.setAttribute('data-listener', 'true');
        }

        // Force refresh button
        const forceRefreshBtn = document.getElementById('forceRefreshBtn');
        if (forceRefreshBtn && !forceRefreshBtn.hasAttribute('data-listener')) {
            forceRefreshBtn.addEventListener('click', async () => {
                if (confirm('This will refresh the app and clear all cached files to load the latest updates. Continue?')) {
                    if (window.app && window.app.forceRefresh) {
                        await window.app.forceRefresh();
                    } else {
                        showNotification('Force refresh not available. Please try a hard browser refresh (Ctrl+Shift+R)', 'warning');
                    }
                }
            });
            forceRefreshBtn.setAttribute('data-listener', 'true');
        }

        // Fix Storage button
        const fixStorageBtn = document.getElementById('fixStorageBtn');
        if (fixStorageBtn && !fixStorageBtn.hasAttribute('data-listener')) {
            fixStorageBtn.addEventListener('click', async () => {
                await this.fixStorageIssues();
            });
            fixStorageBtn.setAttribute('data-listener', 'true');
        }

        // Migration test button
        const migrationBtn = document.getElementById('testMigrationBtn');
        if (migrationBtn && !migrationBtn.hasAttribute('data-listener')) {
            migrationBtn.addEventListener('click', async () => {
                await this.testConfigMigration();
            });
            migrationBtn.setAttribute('data-listener', 'true');
        }
    }

    addPerformanceSection() {
        if (document.getElementById('perfModeSelect')) return;
        const settingsSection = document.querySelector('.settings-section');
        if (!settingsSection) return;

        const perf = document.createElement('div');
        perf.className = 'dynamic-content';
        perf.innerHTML = `
            <h3 style="margin-top:2rem;">Performance</h3>
            <div class="form-group">
                <label>Performance Mode</label>
                <select id="perfModeSelect" class="form-select">
                    <option value="auto">Auto (recommended)</option>
                    <option value="low">Low (max battery/perf)</option>
                    <option value="balanced">Balanced</option>
                    <option value="high">High (best visuals)</option>
                </select>
                <small style="color: var(--gray); display:block; margin-top:0.5rem;">
                    Changes apply immediately. Using ${this.configReady ? 'unified config service' : 'legacy storage'}.
                </small>
            </div>`;
        settingsSection.appendChild(perf);

        // Initialize with current value
        this.initializePerformanceSelect();
    }

    async initializePerformanceSelect() {
        const select = document.getElementById('perfModeSelect');
        if (!select) return;

        try {
            const saved = await this.getConfig('performanceMode', 'auto');
            select.value = saved;
            
            select.onchange = async (e) => {
                const mode = e.target.value;
                await this.setConfig('performanceMode', mode);
                
                // Apply immediately (maintain existing behavior)
                this.applyPerformanceMode(mode);
                showNotification('Performance mode updated', 'success');
            };
        } catch (error) {
            console.error('Failed to initialize performance select:', error);
            select.value = 'auto';
        }
    }

    applyPerformanceMode(mode) {
        if (mode === 'low') {
            document.documentElement.classList.add('perf-low');
            window.performanceProfile = 'low';
        } else if (mode === 'balanced') {
            document.documentElement.classList.remove('perf-low');
            window.performanceProfile = 'balanced';
        } else if (mode === 'high') {
            document.documentElement.classList.remove('perf-low');
            window.performanceProfile = 'high';
        } else {
            // Auto - recompute
            if (window.app && typeof window.app.detectPerformanceProfile === 'function') {
                const profile = window.app.detectPerformanceProfile();
                window.performanceProfile = profile;
                if (profile === 'low') {
                    document.documentElement.classList.add('perf-low');
                } else {
                    document.documentElement.classList.remove('perf-low');
                }
            }
        }
    }

    // New theme management section
    addThemeSection() {
        if (document.getElementById('themeSelect')) return;
        const settingsSection = document.querySelector('.settings-section');
        if (!settingsSection) return;

        const theme = document.createElement('div');
        theme.className = 'dynamic-content';
        theme.innerHTML = `
            <h3 style="margin-top:2rem;">Appearance</h3>
            <div class="form-group">
                <label>Theme</label>
                <select id="themeSelect" class="form-select">
                    <option value="auto">Auto (system)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
                <small style="color: var(--gray); display:block; margin-top:0.5rem;">
                    Theme changes apply immediately.
                </small>
            </div>`;
        settingsSection.appendChild(theme);

        this.initializeThemeSelect();
    }

    async initializeThemeSelect() {
        const select = document.getElementById('themeSelect');
        if (!select) return;

        try {
            const saved = await this.getConfig('theme', 'auto');
            select.value = saved;
            
            select.onchange = async (e) => {
                const theme = e.target.value;
                await this.setConfig('theme', theme);
                this.applyTheme(theme);
                showNotification('Theme updated', 'success');
            };
        } catch (error) {
            console.error('Failed to initialize theme select:', error);
            select.value = 'auto';
        }
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark-theme');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark-theme');
        } else {
            // Auto theme - detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.classList.add('dark-theme');
            } else {
                document.documentElement.classList.remove('dark-theme');
            }
        }
    }

    // Enhanced config validation section
    addConfigValidationSection() {
        if (document.getElementById('configValidationSection')) return;
        const settingsSection = document.querySelector('.settings-section');
        if (!settingsSection) return;

        const validation = document.createElement('div');
        validation.className = 'dynamic-content';
        validation.id = 'configValidationSection';
        validation.innerHTML = `
            <h3 style="margin-top:2rem;">
                <i class="fas fa-shield-alt"></i> Configuration Management
            </h3>
            <div class="form-group">
                <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div><strong>Config Service Status:</strong> <span id="configServiceStatus">Checking...</span></div>
                    <div><strong>Storage Mode:</strong> <span id="storageMode">Detecting...</span></div>
                    <div><strong>Validation:</strong> <span id="validationStatus">Pending...</span></div>
                </div>
                
                <div class="btn-group" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="button" class="btn btn-primary" id="validateConfigBtn">
                        <i class="fas fa-check-circle"></i> Validate Configuration
                    </button>
                    <button type="button" class="btn btn-secondary" id="testMigrationBtn">
                        <i class="fas fa-exchange-alt"></i> Test Migration
                    </button>
                    <button type="button" class="btn btn-warning" id="repairConfigBtn">
                        <i class="fas fa-wrench"></i> Repair Configuration
                    </button>
                    <button type="button" class="btn btn-info" id="exportConfigBtn">
                        <i class="fas fa-download"></i> Export Config
                    </button>
                </div>
            </div>
            
            <div id="configValidationResults" style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; font-family: monospace; font-size: 12px; display: none;">
                Validation results will appear here...
            </div>
        `;
        settingsSection.appendChild(validation);

        this.setupConfigValidationListeners();
        this.updateConfigStatus();
    }

    setupConfigValidationListeners() {
        const validateBtn = document.getElementById('validateConfigBtn');
        if (validateBtn && !validateBtn.hasAttribute('data-listener')) {
            validateBtn.addEventListener('click', async () => {
                await this.validateConfiguration();
            });
            validateBtn.setAttribute('data-listener', 'true');
        }

        const repairBtn = document.getElementById('repairConfigBtn');
        if (repairBtn && !repairBtn.hasAttribute('data-listener')) {
            repairBtn.addEventListener('click', async () => {
                await this.repairConfiguration();
            });
            repairBtn.setAttribute('data-listener', 'true');
        }

        const exportConfigBtn = document.getElementById('exportConfigBtn');
        if (exportConfigBtn && !exportConfigBtn.hasAttribute('data-listener')) {
            exportConfigBtn.addEventListener('click', async () => {
                await this.exportConfiguration();
            });
            exportConfigBtn.setAttribute('data-listener', 'true');
        }
    }

    updateConfigStatus() {
        const statusEl = document.getElementById('configServiceStatus');
        const modeEl = document.getElementById('storageMode');
        const validationEl = document.getElementById('validationStatus');

        if (statusEl) {
            if (this.configReady && !this.fallbackMode) {
                statusEl.textContent = '✅ Active';
                statusEl.style.color = '#10b981';
            } else if (this.fallbackMode) {
                statusEl.textContent = '⚠️ Fallback Mode';
                statusEl.style.color = '#f59e0b';
            } else {
                statusEl.textContent = '❌ Not Available';
                statusEl.style.color = '#ef4444';
            }
        }

        if (modeEl) {
            modeEl.textContent = this.fallbackMode ? 'Legacy Storage' : 'Unified Config Service';
            modeEl.style.color = this.fallbackMode ? '#f59e0b' : '#10b981';
        }

        if (validationEl) {
            validationEl.textContent = 'Click "Validate Configuration" to check';
            validationEl.style.color = '#64748b';
        }
    }

    async validateConfiguration() {
        const resultsEl = document.getElementById('configValidationResults');
        const validationEl = document.getElementById('validationStatus');
        
        if (!resultsEl) return;
        
        resultsEl.style.display = 'block';
        resultsEl.textContent = 'Running configuration validation...\n';

        let results = '=== CONFIGURATION VALIDATION REPORT ===\n\n';
        let isValid = true;

        try {
            // Test critical configurations
            const criticalConfigs = [
                'businessName',
                'performanceMode', 
                'theme',
                'apiUrl',
                'loggingEnabled'
            ];

            results += '1. CRITICAL CONFIGURATION CHECK:\n';
            for (const config of criticalConfigs) {
                try {
                    const value = await this.getConfig(config);
                    const isSet = value !== null && value !== undefined;
                    results += `   ${config}: ${isSet ? '✅ SET' : '❌ MISSING'} (${JSON.stringify(value)})\n`;
                    if (!isSet) isValid = false;
                } catch (error) {
                    results += `   ${config}: ❌ ERROR (${error.message})\n`;
                    isValid = false;
                }
            }

            // Check storage consistency
            results += '\n2. STORAGE CONSISTENCY CHECK:\n';
            if (this.configReady && !this.fallbackMode) {
                const businessNameConfig = await window.config.get('businessName');
                const businessNameFallback = await this.getConfigFallback('businessName');
                const consistent = businessNameConfig === businessNameFallback;
                results += `   Config service vs Legacy: ${consistent ? '✅ CONSISTENT' : '⚠️ INCONSISTENT'}\n`;
                if (!consistent) {
                    results += `     Config: ${JSON.stringify(businessNameConfig)}\n`;
                    results += `     Legacy: ${JSON.stringify(businessNameFallback)}\n`;
                }
            }

            // Check config service functionality
            results += '\n3. CONFIG SERVICE FUNCTIONALITY:\n';
            if (this.configReady) {
                try {
                    const testKey = 'validationTest';
                    const testValue = Date.now();
                    await window.config.set(testKey, testValue);
                    const retrieved = await window.config.get(testKey);
                    const writeReadWorks = retrieved === testValue;
                    results += `   Write/Read Test: ${writeReadWorks ? '✅ PASSED' : '❌ FAILED'}\n`;
                    if (!writeReadWorks) isValid = false;
                } catch (error) {
                    results += `   Write/Read Test: ❌ ERROR (${error.message})\n`;
                    isValid = false;
                }
            } else {
                results += `   Service Status: ❌ NOT AVAILABLE\n`;
                isValid = false;
            }

            // Check migration status
            results += '\n4. MIGRATION STATUS:\n';
            if (this.configReady && window.config.isMigrationComplete) {
                const migrations = [
                    'localStorage_to_unified_v1',
                    'theme_settings_v1', 
                    'performance_settings_v1'
                ];
                
                for (const migration of migrations) {
                    try {
                        const complete = await window.config.isMigrationComplete(migration);
                        results += `   ${migration}: ${complete ? '✅ COMPLETE' : '⚠️ PENDING'}\n`;
                    } catch (error) {
                        results += `   ${migration}: ❌ ERROR (${error.message})\n`;
                    }
                }
            }

            results += `\n=== VALIDATION ${isValid ? 'PASSED' : 'FAILED'} ===\n`;
            results += `Timestamp: ${new Date().toISOString()}\n`;

            if (validationEl) {
                validationEl.textContent = isValid ? '✅ Valid' : '❌ Issues Found';
                validationEl.style.color = isValid ? '#10b981' : '#ef4444';
            }

        } catch (error) {
            results += `\nFATAL ERROR: ${error.message}\n`;
            isValid = false;
            
            if (validationEl) {
                validationEl.textContent = '❌ Validation Failed';
                validationEl.style.color = '#ef4444';
            }
        }

        resultsEl.textContent = results;
        
        // Show notification
        showNotification(
            isValid ? 'Configuration validation passed' : 'Configuration issues found - check results',
            isValid ? 'success' : 'warning'
        );
    }

    async repairConfiguration() {
        const resultsEl = document.getElementById('configValidationResults');
        if (!resultsEl) return;
        
        resultsEl.style.display = 'block';
        resultsEl.textContent = 'Repairing configuration...\n';

        let results = '=== CONFIGURATION REPAIR ===\n\n';

        try {
            // Ensure config service is working
            if (!this.configReady) {
                results += '1. Attempting to reconnect to config service...\n';
                await this.waitForConfigService();
                if (this.configReady) {
                    results += '   ✅ Config service reconnected\n';
                } else {
                    results += '   ❌ Config service still unavailable\n';
                }
            }

            // Set missing configurations to defaults
            results += '\n2. Setting missing configurations to defaults...\n';
            const defaults = {
                'businessName': 'Ava Solutions',
                'performanceMode': 'auto',
                'theme': 'auto',
                'apiUrl': 'https://ava-marketing-api.onrender.com',
                'loggingEnabled': true
            };

            for (const [key, defaultValue] of Object.entries(defaults)) {
                try {
                    const current = await this.getConfig(key);
                    if (current === null || current === undefined) {
                        await this.setConfig(key, defaultValue);
                        results += `   ✅ Set ${key} to default: ${JSON.stringify(defaultValue)}\n`;
                    } else {
                        results += `   ✓ ${key} already set: ${JSON.stringify(current)}\n`;
                    }
                } catch (error) {
                    results += `   ❌ Failed to repair ${key}: ${error.message}\n`;
                }
            }

            // Force migration if config service is available
            if (this.configReady && window.config.runMigrations) {
                results += '\n3. Running migrations...\n';
                try {
                    await window.config.runMigrations();
                    results += '   ✅ Migrations completed\n';
                } catch (error) {
                    results += `   ❌ Migration failed: ${error.message}\n`;
                }
            }

            results += '\n=== REPAIR COMPLETED ===\n';
            showNotification('Configuration repair completed', 'success');

        } catch (error) {
            results += `\nREPAIR FAILED: ${error.message}\n`;
            showNotification('Configuration repair failed', 'error');
        }

        resultsEl.textContent = results;
        
        // Update status after repair
        setTimeout(() => {
            this.updateConfigStatus();
        }, 1000);
    }

    async exportConfiguration() {
        try {
            let exportData = {
                timestamp: Date.now(),
                date: new Date().toISOString(),
                source: this.configReady && !this.fallbackMode ? 'config-service' : 'legacy-storage',
                configurations: {}
            };

            // Export configurations using current method
            const configKeys = [
                'businessName', 'performanceMode', 'theme', 'apiUrl', 
                'loggingEnabled', 'debugMode', 'businessConfig'
            ];

            for (const key of configKeys) {
                try {
                    const value = await this.getConfig(key);
                    if (value !== null && value !== undefined) {
                        exportData.configurations[key] = value;
                    }
                } catch (error) {
                    console.warn(`Failed to export ${key}:`, error);
                }
            }

            // Create download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ava-config-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('Configuration exported successfully', 'success');

        } catch (error) {
            console.error('Export failed:', error);
            showNotification('Configuration export failed', 'error');
        }
    }

    async testConfigMigration() {
        const resultsEl = document.getElementById('configValidationResults');
        if (!resultsEl) return;
        
        resultsEl.style.display = 'block';
        resultsEl.textContent = 'Testing configuration migration...\n';

        let results = '=== MIGRATION TEST ===\n\n';

        try {
            // Test 1: Write to old storage and read from new
            results += '1. BACKWARD COMPATIBILITY TEST:\n';
            const testValue = 'MigrationTest-' + Date.now();
            
            // Write to localStorage
            localStorage.setItem('businessName', testValue);
            
            // Read via config service
            const configValue = await this.getConfig('businessName');
            const backwardCompatible = configValue === testValue;
            
            results += `   Write to localStorage, read via config: ${backwardCompatible ? '✅ PASSED' : '❌ FAILED'}\n`;
            results += `   Expected: "${testValue}", Got: "${configValue}"\n`;

            // Test 2: Write to new and read from old
            results += '\n2. FORWARD COMPATIBILITY TEST:\n';
            const testValue2 = 'ConfigTest-' + Date.now();
            
            // Write via config service
            await this.setConfig('businessName', testValue2);
            
            // Read from localStorage
            const legacyValue = localStorage.getItem('businessName');
            const forwardCompatible = legacyValue === testValue2;
            
            results += `   Write via config, read from localStorage: ${forwardCompatible ? '✅ PASSED' : '❌ FAILED'}\n`;
            results += `   Expected: "${testValue2}", Got: "${legacyValue}"\n`;

            // Test 3: Migration function
            results += '\n3. MIGRATION FUNCTION TEST:\n';
            if (this.configReady && window.config.runMigrations) {
                try {
                    await window.config.runMigrations();
                    results += '   Migration function: ✅ EXECUTED\n';
                } catch (error) {
                    results += `   Migration function: ❌ ERROR (${error.message})\n`;
                }
            } else {
                results += '   Migration function: ❌ NOT AVAILABLE\n';
            }

            results += '\n=== MIGRATION TEST COMPLETED ===\n';
            showNotification('Migration test completed', 'success');

        } catch (error) {
            results += `\nMIGRATION TEST FAILED: ${error.message}\n`;
            showNotification('Migration test failed', 'error');
        }

        resultsEl.textContent = results;
    }

    async loadSettings() {
        try {
            // Load using enhanced config methods
            const businessName = await this.getConfig('businessName');
            const theme = await this.getConfig('theme');
            const performanceMode = await this.getConfig('performanceMode');

            // Update UI if elements exist
            const businessNameInput = document.getElementById('businessNameInput');
            if (businessNameInput && businessName) {
                businessNameInput.value = businessName;
            }

            // Store settings for reference
            this.settings = {
                businessName: businessName || 'Ava Solutions',
                theme: theme || 'auto',
                performanceMode: performanceMode || 'auto'
            };

        } catch (error) {
            console.error('Failed to load settings:', error);
            // Fallback to empty settings
            this.settings = {
                businessName: 'Ava Solutions',
                theme: 'auto',
                performanceMode: 'auto'
            };
        }
    }

    async saveSettings() {
        try {
            const businessName = document.getElementById('businessNameInput')?.value || this.settings.businessName;
            const businessType = document.getElementById('businessTypeSelect')?.value || 'spa';
            const requireEmployee = document.getElementById('requireEmployeeFeature')?.checked || false;
            const commissionTracking = document.getElementById('commissionTrackingFeature')?.checked || false;
            const serviceDuration = document.getElementById('serviceDurationFeature')?.checked || false;
            
            const businessConfig = {
                businessType: businessType,
                modules: {
                    dashboard: true,
                    pos: true,
                    services: true,
                    inventory: true,
                    employees: true,
                    chatbot: true,
                    settings: true
                },
                features: {
                    requireEmployeeForServices: requireEmployee,
                    showInventoryInPOS: false,
                    enableCommissionTracking: commissionTracking,
                    showServiceDuration: serviceDuration
                }
            };

            // Save using enhanced config methods
            await this.setConfig('businessName', businessName);
            await this.setConfig('businessConfig', businessConfig);

            // Update UI
            const businessNameDisplay = document.getElementById('businessName');
            if (businessNameDisplay) {
                businessNameDisplay.textContent = businessName;
            }
            
            document.title = `${businessName} - Business Management System`;
            
            // Apply new configuration if app supports it
            if (window.app && typeof window.app.loadBusinessConfig === 'function') {
                await window.app.loadBusinessConfig();
            }

            showNotification('Settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            showNotification('Failed to save settings - check console for details', 'error');
        }
    }

    // Keep all other existing methods unchanged for compatibility
    addBusinessTypeSection() {
        // Check if business type section already exists
        if (document.getElementById('businessTypeSelect')) return;
        
        const settingsSection = document.querySelector('.settings-section');
        if (!settingsSection) return;

        const businessSection = document.createElement('div');
        businessSection.className = 'dynamic-content';
        businessSection.innerHTML = `
            <div class="form-group" style="margin-top: 1.5rem;">
                <label>Business Type</label>
                <select id="businessTypeSelect" class="form-select">
                    <option value="spa">Spa & Wellness Center</option>
                    <option value="restaurant" disabled style="color: #ccc;">Restaurant (Coming Soon)</option>
                    <option value="retail" disabled style="color: #ccc;">Retail Store (Coming Soon)</option>
                    <option value="salon" disabled style="color: #ccc;">Hair Salon (Coming Soon)</option>
                </select>
                <small style="color: var(--gray); display: block; margin-top: 0.5rem;">
                    Choose your business type to show only relevant features. More types coming soon!
                </small>
            </div>
            
            <div class="form-group" style="margin-top: 1rem;">
                <h4 style="margin-bottom: 0.75rem;">Spa Features</h4>
                <div style="display: grid; gap: 0.5rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="requireEmployeeFeature" checked>
                        <span>Require employee selection for service checkout</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="commissionTrackingFeature" checked>
                        <span>Enable commission tracking for employees</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="serviceDurationFeature" checked>
                        <span>Show service duration in spa services</span>
                    </label>
                </div>
            </div>
        `;

        settingsSection.appendChild(businessSection);
        
        // Load current business config
        this.loadBusinessConfigUI();
    }

    async loadBusinessConfigUI() {
        try {
            const businessConfig = await this.getConfig('businessConfig');
            if (businessConfig) {
                // Set business type
                const typeSelect = document.getElementById('businessTypeSelect');
                if (typeSelect) {
                    typeSelect.value = businessConfig.businessType || 'spa';
                }
                
                // Set feature checkboxes
                const requireEmployeeCheck = document.getElementById('requireEmployeeFeature');
                if (requireEmployeeCheck) {
                    requireEmployeeCheck.checked = businessConfig.features?.requireEmployeeForServices || false;
                }
                
                const commissionCheck = document.getElementById('commissionTrackingFeature');
                if (commissionCheck) {
                    commissionCheck.checked = businessConfig.features?.enableCommissionTracking || false;
                }
                
                const durationCheck = document.getElementById('serviceDurationFeature');
                if (durationCheck) {
                    durationCheck.checked = businessConfig.features?.showServiceDuration || false;
                }
            }
        } catch (error) {
            console.error('Failed to load business config UI:', error);
        }
    }

    // Keep all existing methods for backward compatibility
    addLoggingSection() {
        if (document.getElementById('loggingSection')) return;
        const settingsSection = document.querySelector('.settings-section');
        if (!settingsSection) return;

        const loggingDiv = document.createElement('div');
        loggingDiv.className = 'dynamic-content';
        loggingDiv.id = 'loggingSection';
        loggingDiv.innerHTML = `
            <h3 style="margin-top:2rem;">
                <i class="fas fa-chart-line"></i> Development & Logging
            </h3>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="enableLogging" ${window.logger && window.logger.isEnabled ? 'checked' : ''}>
                    Enable Application Logging
                </label>
                <small style="color: var(--gray); display:block; margin-top:0.5rem;">
                    Captures database operations, API calls, state changes, and errors for debugging.
                    Using ${this.configReady ? 'unified config service' : 'legacy storage'}.
                </small>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" id="openLoggingDashboard">
                    <i class="fas fa-external-link-alt"></i> Open Logging Dashboard
                </button>
                <small style="color: var(--gray); display:block; margin-top:0.5rem;">
                    View detailed logs, error reports, and performance metrics
                </small>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-secondary" id="exportLogs">
                    <i class="fas fa-download"></i> Export Logs
                </button>
                <button type="button" class="btn btn-danger" id="clearLogs" style="margin-left: 10px;">
                    <i class="fas fa-trash"></i> Clear Logs
                </button>
            </div>
            <div id="loggingStats" style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; font-size: 0.875rem;">
                <div><strong>Logging Status:</strong> <span id="loggingStatus">Checking...</span></div>
                <div><strong>Total Logs:</strong> <span id="totalLogsCount">-</span></div>
                <div><strong>Errors (24h):</strong> <span id="recentErrorsCount">-</span></div>
                <div><strong>Storage Used:</strong> <span id="loggingStorage">-</span></div>
            </div>
        `;
        settingsSection.appendChild(loggingDiv);

        // Setup event listeners
        this.setupLoggingEventListeners();
        this.updateLoggingStats();
    }

    setupLoggingEventListeners() {
        // Enable/disable logging with config service integration
        const enableLogging = document.getElementById('enableLogging');
        if (enableLogging && !enableLogging.hasAttribute('data-listener')) {
            enableLogging.addEventListener('change', async (e) => {
                const enabled = e.target.checked;
                
                // Save to config service
                await this.setConfig('loggingEnabled', enabled);
                
                // Update logger if available
                if (window.logger) {
                    window.logger.setEnabled(enabled);
                }
                
                this.updateLoggingStats();
                showNotification(
                    `Logging ${enabled ? 'enabled' : 'disabled'}`,
                    'success'
                );
            });
            enableLogging.setAttribute('data-listener', 'true');
        }

        // Rest of the logging event listeners remain the same...
        const openDashboard = document.getElementById('openLoggingDashboard');
        if (openDashboard && !openDashboard.hasAttribute('data-listener')) {
            openDashboard.addEventListener('click', () => {
                window.open('logging-dashboard.html', '_blank');
            });
            openDashboard.setAttribute('data-listener', 'true');
        }

        const exportLogs = document.getElementById('exportLogs');
        if (exportLogs && !exportLogs.hasAttribute('data-listener')) {
            exportLogs.addEventListener('click', async () => {
                try {
                    if (!window.logger) {
                        showNotification('Logger not available', 'error');
                        return;
                    }

                    const logs = await window.logger.exportLogs();
                    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ava-logs-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    showNotification('Logs exported successfully', 'success');
                } catch (error) {
                    console.error('Failed to export logs:', error);
                    showNotification('Failed to export logs', 'error');
                }
            });
            exportLogs.setAttribute('data-listener', 'true');
        }

        const clearLogs = document.getElementById('clearLogs');
        if (clearLogs && !clearLogs.hasAttribute('data-listener')) {
            clearLogs.addEventListener('click', async () => {
                if (!confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
                    return;
                }

                try {
                    if (!window.logger) {
                        showNotification('Logger not available', 'error');
                        return;
                    }

                    await window.logger.clearLogs();
                    this.updateLoggingStats();
                    showNotification('Logs cleared successfully', 'success');
                } catch (error) {
                    console.error('Failed to clear logs:', error);
                    showNotification('Failed to clear logs', 'error');
                }
            });
            clearLogs.setAttribute('data-listener', 'true');
        }
    }

    async updateLoggingStats() {
        try {
            const statusEl = document.getElementById('loggingStatus');
            const totalLogsEl = document.getElementById('totalLogsCount');
            const errorsEl = document.getElementById('recentErrorsCount');
            const storageEl = document.getElementById('loggingStorage');

            if (!statusEl) return;

            if (!window.logger) {
                statusEl.textContent = 'Not Available';
                statusEl.style.color = '#ef4444';
                return;
            }

            // Update status
            if (window.logger.isEnabled) {
                statusEl.textContent = 'Active';
                statusEl.style.color = '#10b981';
            } else {
                statusEl.textContent = 'Disabled';
                statusEl.style.color = '#f59e0b';
            }

            // Get statistics
            const logs = await window.logger.exportLogs();
            const errorReport = await window.logger.getErrorReport();
            
            if (totalLogsEl) totalLogsEl.textContent = logs.length.toLocaleString();
            if (errorsEl) errorsEl.textContent = errorReport.totalErrors.toLocaleString();

            // Estimate storage usage
            if (storageEl) {
                const estimatedSize = JSON.stringify(logs).length;
                const sizeInKB = Math.round(estimatedSize / 1024);
                const sizeInMB = Math.round(sizeInKB / 1024);
                
                if (sizeInMB > 0) {
                    storageEl.textContent = `${sizeInMB} MB`;
                } else {
                    storageEl.textContent = `${sizeInKB} KB`;
                }
            }

        } catch (error) {
            console.error('Failed to update logging stats:', error);
            const statusEl = document.getElementById('loggingStatus');
            if (statusEl) {
                statusEl.textContent = 'Error';
                statusEl.style.color = '#ef4444';
            }
        }
    }

    // Keep all other existing methods for full backward compatibility
    addSyncButton() {
        // Check if sync section already exists
        if (document.getElementById('syncNowBtn')) return;
        
        const dataSection = document.querySelectorAll('.settings-section')[1];
        if (!dataSection) return;

        const syncSection = document.createElement('div');
        syncSection.className = 'dynamic-content';
        syncSection.innerHTML = `
            <h3 style="margin-top: 2rem; margin-bottom: 1rem;">Synchronization</h3>
            <div id="syncStatus" style="margin-bottom: 1rem;"></div>
            <button class="btn btn-primary" id="syncNowBtn" style="margin-right: 1rem;">
                <i class="fas fa-sync"></i> Sync Now
            </button>
            <button class="btn btn-secondary" id="viewSyncQueueBtn">
                <i class="fas fa-list"></i> View Sync Queue
            </button>
            <button class="btn btn-info" id="debugEmployeesBtn" style="margin-left: 0.5rem;">
                <i class="fas fa-bug"></i> Debug Employees
            </button>
        `;

        dataSection.appendChild(syncSection);

        // Add event listeners
        document.getElementById('syncNowBtn').addEventListener('click', async () => {
            await this.manualSync();
        });

        document.getElementById('viewSyncQueueBtn').addEventListener('click', async () => {
            await this.viewSyncQueue();
        });

        document.getElementById('debugEmployeesBtn').addEventListener('click', async () => {
            await this.debugEmployees();
        });
    }

    // Keep all existing sync methods unchanged
    async displaySyncStatus() {
        const statusDiv = document.getElementById('syncStatus');
        if (!statusDiv) return;

        try {
            const stats = await window.syncManager.getSyncStats();
            const lastSync = await this.getConfig('lastSync');
            
            let html = '<div style="background: var(--light); padding: 1rem; border-radius: 8px;">';
            html += '<h4 style="margin-bottom: 0.75rem;">Sync Status</h4>';
            
            if (lastSync) {
                html += `<p><strong>Last Sync:</strong> ${app.formatDateTime(lastSync)}</p>`;
            } else {
                html += '<p><strong>Last Sync:</strong> Never</p>';
            }

            html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem;">';
            
            // Products
            html += '<div>';
            html += `<strong>Products:</strong><br>`;
            html += `Pending: ${stats.products.pending}<br>`;
            html += `Synced: ${stats.products.synced}`;
            html += '</div>';

            // Inventory
            html += '<div>';
            html += `<strong>Inventory:</strong><br>`;
            html += `Pending: ${stats.inventory.pending}<br>`;
            html += `Synced: ${stats.inventory.synced}`;
            html += '</div>';

            // Employees
            html += '<div>';
            html += `<strong>Employees:</strong><br>`;
            html += `Pending: ${stats.employees.pending}<br>`;
            html += `Synced: ${stats.employees.synced}`;
            html += '</div>';

            // Transactions
            html += '<div>';
            html += `<strong>Transactions:</strong><br>`;
            html += `Pending: ${stats.transactions.pending}<br>`;
            html += `Synced: ${stats.transactions.synced}`;
            html += '</div>';

            html += '</div>';
            
            if (stats.queueSize > 0) {
                html += `<p style="margin-top: 1rem; color: var(--warning-color);">
                    <i class="fas fa-exclamation-circle"></i> ${stats.queueSize} items in sync queue
                </p>`;
            }

            html += '</div>';
            
            statusDiv.innerHTML = html;
        } catch (error) {
            console.error('Failed to display sync status:', error);
        }
    }

    async manualSync() {
        if (!window.syncManager) {
            showNotification('Sync manager not available', 'error');
            return;
        }

        const btn = document.getElementById('syncNowBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Syncing...';
        btn.disabled = true;

        try {
            await window.syncManager.manualSync();
            await this.displaySyncStatus();
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async viewSyncQueue() {
        try {
            const queue = await db.getAll('syncQueue');
            
            if (queue.length === 0) {
                showNotification('Sync queue is empty', 'info');
                return;
            }

            let message = `Sync Queue (${queue.length} items):\n\n`;
            queue.forEach(item => {
                message += `• ${item.type} - ${item.entity}\n`;
                message += `  Status: ${item.status}\n`;
                message += `  Time: ${app.formatDateTime(item.timestamp)}\n`;
                if (item.retryCount > 0) {
                    message += `  Retries: ${item.retryCount}\n`;
                }
                message += '\n';
            });

            alert(message);
        } catch (error) {
            console.error('Failed to view sync queue:', error);
        }
    }

    async debugEmployees() {
        try {
            console.log('🔍 Starting employee debug...');
            
            // Get all employees from IndexedDB
            const employees = await db.getAll('employees');
            console.log('👥 All employees in PWA:', employees);
            
            // Get pending employees
            const pendingEmployees = await db.getByIndex('employees', 'syncStatus', 'pending');
            console.log('⏳ Pending employees:', pendingEmployees);
            
            // Get synced employees
            const syncedEmployees = await db.getByIndex('employees', 'syncStatus', 'synced');
            console.log('✅ Synced employees:', syncedEmployees);
            
            // Get API URL
            const apiUrl = await this.getConfig('apiUrl', 'Not set');
            console.log('🌐 API URL:', apiUrl);
            
            // Check if sync manager is available
            const syncManagerAvailable = !!window.syncManager;
            console.log('🔄 Sync Manager Available:', syncManagerAvailable);
            
            // Create debug report
            let report = `🔍 EMPLOYEE DEBUG REPORT\n\n`;
            report += `👥 Total Employees: ${employees.length}\n`;
            report += `⏳ Pending Sync: ${pendingEmployees.length}\n`;
            report += `✅ Already Synced: ${syncedEmployees.length}\n`;
            report += `🌐 API URL: ${apiUrl}\n`;
            report += `🔄 Sync Manager: ${syncManagerAvailable ? 'Available' : 'Not Available'}\n\n`;
            
            if (employees.length > 0) {
                report += `EMPLOYEE DETAILS:\n`;
                employees.forEach((emp, index) => {
                    report += `${index + 1}. ${emp.name || 'No Name'}\n`;
                    report += `   Position: ${emp.position || 'No Position'}\n`;
                    report += `   Email: ${emp.email || 'No Email'}\n`;
                    report += `   Sync Status: ${emp.syncStatus || 'No Status'}\n`;
                    report += `   Total Sales: ₱${(emp.totalSales || 0).toLocaleString()}\n\n`;
                });
            } else {
                report += `❌ NO EMPLOYEES FOUND!\n`;
                report += `This might be why sync isn't working.\n`;
                report += `Try adding an employee first.\n`;
            }
            
            alert(report);
            
            // Also test a manual employee sync
            if (employees.length > 0 && window.syncManager) {
                const testSync = confirm('Would you like to test employee sync now?');
                if (testSync) {
                    console.log('🧪 Testing employee sync...');
                    await window.syncManager.syncEmployees();
                    showNotification('Employee sync test completed. Check console for results.', 'info');
                }
            }
            
        } catch (error) {
            console.error('Employee debug failed:', error);
            alert('Employee debug failed: ' + error.message);
        }
    }

    // Keep all other existing methods for full compatibility...
    async exportData() {
        try {
            const data = await db.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ava_solutions_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            showNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export data:', error);
            showNotification('Failed to export data', 'error');
        }
    }

    async clearAllData() {
        const confirmMessage = `⚠️ WARNING: This will delete ALL data including:
        
• All products and services
• All inventory items
• All employees
• All transactions
• All settings

This action cannot be undone!

Type "DELETE" to confirm:`;

        const confirmation = prompt(confirmMessage);
        
        if (confirmation !== 'DELETE') {
            showNotification('Data deletion cancelled', 'info');
            return;
        }

        try {
            // Clear all stores
            await db.clearStore('products');
            await db.clearStore('inventory');
            await db.clearStore('employees');
            await db.clearStore('transactions');
            await db.clearStore('syncQueue');
            
            // Reset settings to defaults using config service
            await this.setConfig('businessName', 'Ava Solutions');
            await this.setConfig('apiUrl', 'https://ava-marketing-api.onrender.com');
            await this.setConfig('lastSync', null);

            showNotification('All data cleared successfully', 'success');
            
            // Reload the page to reset everything
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Failed to clear data:', error);
            showNotification('Failed to clear data', 'error');
        }
    }

    async fixStorageIssues() {
        if (!confirm('This will fix common app issues by clearing temporary files and cache.\n\nYour business data (products, inventory, transactions, employees) will be kept safe.\n\nContinue?')) {
            return;
        }

        try {
            showNotification('Fixing app issues...', 'info');
            
            // Step 1: Save important business data
            console.log('Backing up business data...');
            const businessData = {
                products: await db.getAll('products'),
                inventory: await db.getAll('inventory'),
                employees: await db.getAll('employees'),
                transactions: await db.getAll('transactions'),
                rooms: await db.getAll('rooms'),
                activeServices: await db.getAll('activeServices'),
                settings: await db.getAll('settings')
            };
            
            // Save essential settings using config service
            const businessName = await this.getConfig('businessName');
            const theme = await this.getConfig('theme');
            const performanceMode = await this.getConfig('performanceMode');
            
            // Step 2: Clear problematic storage
            console.log('Clearing problematic storage...');
            
            // Clear all localStorage except essential data
            const keysToKeep = ['businessName', 'authToken', 'userData'];
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            // Clear sessionStorage
            sessionStorage.clear();
            
            // Unregister service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                    console.log('Service worker unregistered');
                }
            }
            
            // Clear caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }
            
            // Step 3: Restore essential data using config service
            console.log('Restoring business data...');
            if (businessName) await this.setConfig('businessName', businessName);
            if (theme) await this.setConfig('theme', theme);
            if (performanceMode) await this.setConfig('performanceMode', performanceMode);
            
            showNotification('App issues fixed! The page will reload...', 'success');
            
            // Reload after a short delay
            setTimeout(() => {
                window.location.reload(true); // Force reload from server
            }, 1500);
            
        } catch (error) {
            console.error('Failed to fix storage issues:', error);
            showNotification('Failed to fix issues. Please try clearing browser cache manually.', 'error');
        }
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const success = await db.importData(text);
                
                if (success) {
                    showNotification('Data imported successfully', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showNotification('Failed to import data', 'error');
                }
            } catch (error) {
                console.error('Import error:', error);
                showNotification('Invalid backup file', 'error');
            }
        };
        
        input.click();
    }

    addImportButton() {
        // Check if import button already exists
        if (document.querySelector('button[data-action="import"]')) return;
        
        const dataSection = document.querySelectorAll('.settings-section')[1];
        if (!dataSection) return;

        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn-secondary dynamic-content';
        importBtn.innerHTML = '<i class="fas fa-upload"></i> Import Data';
        importBtn.style.marginLeft = '1rem';
        importBtn.setAttribute('data-action', 'import');
        importBtn.onclick = () => this.importData();

        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn) {
            exportBtn.parentNode.insertBefore(importBtn, exportBtn.nextSibling);
        }
    }

    clearDynamicContent() {
        const dynamicElements = document.querySelectorAll('.dynamic-content');
        dynamicElements.forEach(element => element.remove());
    }
}

// Initialize enhanced settings manager
const settingsManager = new SettingsManager();

// Load settings when page is shown
window.loadSettings = async function() {
    await settingsManager.init();
};

// Export for external use
window.settingsManager = settingsManager;