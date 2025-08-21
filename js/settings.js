// Settings Management
class SettingsManager {
    constructor() {
        this.settings = {};
    }

    async init() {
        // Clear any existing dynamic content first
        this.clearDynamicContent();
        
        await this.loadSettings();
        this.setupEventListeners();
        this.addBusinessTypeSection();
        // this.addApiUrlInput(); // Commented out - method needs to be implemented
        this.addSyncButton();
        this.addImportButton();
        this.addPerformanceSection();
        this.displaySyncStatus();
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

        // Fix Storage button - Clears problematic storage but keeps business data
        const fixStorageBtn = document.getElementById('fixStorageBtn');
        if (fixStorageBtn && !fixStorageBtn.hasAttribute('data-listener')) {
            fixStorageBtn.addEventListener('click', async () => {
                await this.fixStorageIssues();
            });
            fixStorageBtn.setAttribute('data-listener', 'true');
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
                <small style="color: var(--gray); display:block; margin-top:0.5rem;">Changes apply immediately.</small>
            </div>`;
        settingsSection.appendChild(perf);

        // initialize
        const select = document.getElementById('perfModeSelect');
        const saved = localStorage.getItem('perfMode') || 'auto';
        select.value = saved;
        select.onchange = (e) => {
            const mode = e.target.value;
            localStorage.setItem('perfMode', mode);
            // Apply immediately
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
                    if (profile === 'low') document.documentElement.classList.add('perf-low'); else document.documentElement.classList.remove('perf-low');
                }
            }
            showNotification('Performance mode updated', 'success');
        };
    }

    async loadSettings() {
        try {
            const businessName = await db.get('settings', 'businessName');
            const lastSync = await db.get('settings', 'lastSync');

            if (businessName) {
                document.getElementById('businessNameInput').value = businessName.value;
            }

            this.settings = {
                businessName: businessName?.value || 'Ava Solutions',
                lastSync: lastSync?.value || null
            };

        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            const businessName = document.getElementById('businessNameInput').value;
            
            // Save business configuration
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
                    showInventoryInPOS: false, // Always false for spa
                    enableCommissionTracking: commissionTracking,
                    showServiceDuration: serviceDuration
                }
            };

            // Update business name
            await db.update('settings', {
                key: 'businessName',
                value: businessName
            });
            
            // Update business config
            await db.update('settings', {
                key: 'businessConfig',
                value: businessConfig
            });

            // API URL is now hardcoded in production - no need to save it

            // Update UI
            document.getElementById('businessName').textContent = businessName;
            document.title = `${businessName} - Business Management System`;
            
            // Apply new feature flags
            if (window.app) {
                await window.app.loadBusinessConfig();
            }

            showNotification('Settings and business configuration saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            showNotification('Failed to save settings', 'error');
        }
    }

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
            const config = await db.get('settings', 'businessConfig');
            if (config && config.value) {
                const businessConfig = config.value;
                
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

    // API URL input removed - now hardcoded for production deployment

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

    async displaySyncStatus() {
        const statusDiv = document.getElementById('syncStatus');
        if (!statusDiv) return;

        try {
            const stats = await window.syncManager.getSyncStats();
            const lastSync = await db.get('settings', 'lastSync');
            
            let html = '<div style="background: var(--light); padding: 1rem; border-radius: 8px;">';
            html += '<h4 style="margin-bottom: 0.75rem;">Sync Status</h4>';
            
            if (lastSync && lastSync.value) {
                html += `<p><strong>Last Sync:</strong> ${app.formatDateTime(lastSync.value)}</p>`;
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
            const apiUrlSetting = await db.get('settings', 'apiUrl');
            const apiUrl = apiUrlSetting?.value || 'Not set';
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
            
            // Reset settings to defaults
            await db.update('settings', {
                key: 'businessName',
                value: 'Ava Solutions'
            });
            await db.update('settings', {
                key: 'apiUrl',
                value: ''
            });
            await db.update('settings', {
                key: 'lastSync',
                value: null
            });

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

    // Fix storage issues while keeping business data
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
            
            // Save business name and essential settings
            const businessName = localStorage.getItem('businessName');
            const authToken = localStorage.getItem('authToken');
            const userData = localStorage.getItem('userData');
            
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
            
            // Step 3: Restore essential data
            console.log('Restoring business data...');
            if (businessName) localStorage.setItem('businessName', businessName);
            if (authToken) localStorage.setItem('authToken', authToken);
            if (userData) localStorage.setItem('userData', userData);
            
            // Note: IndexedDB business data is already preserved (we didn't clear it)
            
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

    // Import data from backup
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

    // Add import button to settings
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

    // Clear all dynamic content to prevent duplicates
    clearDynamicContent() {
        const dynamicElements = document.querySelectorAll('.dynamic-content');
        dynamicElements.forEach(element => element.remove());
    }
}

// Initialize settings manager
const settingsManager = new SettingsManager();

// Load settings when page is shown
window.loadSettings = async function() {
    await settingsManager.init();
};
