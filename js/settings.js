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
        this.addApiUrlInput();
        this.addSyncButton();
        this.addPublishCatalogButton();
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
                <label>Manager Assignment</label>
                <div style="display:flex; gap:.5rem; align-items:center;">
                    <input type="text" id="managerNameInput" class="form-input" placeholder="Manager name">
                    <input type="email" id="managerEmailInput" class="form-input" placeholder="Manager email">
                    <button class="btn btn-primary" id="assignManagerBtn">Assign</button>
                </div>
                <small class="form-hint">Until a manager is assigned, only Settings will be visible.</small>
            </div>
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

        // Assign manager handler
        const assignBtn = document.getElementById('assignManagerBtn');
        if (assignBtn) {
            assignBtn.onclick = async () => {
                const name = document.getElementById('managerNameInput').value.trim();
                const email = document.getElementById('managerEmailInput').value.trim();
                if (!name || !email) { showNotification('Enter manager name and email', 'warning'); return; }
                try {
                    // Create/update manager invite
                    if (employeeManager && employeeManager.inviteEmployee) {
                        await employeeManager.inviteEmployee(email, name, 'manager');
                    }
                    localStorage.setItem('managerAssigned', 'true');
                    showNotification('Manager assigned. Features are now unlocked.', 'success');
                    // Re-apply gates
                    if (window.entitlementsSystem) window.entitlementsSystem.updateUI();
                } catch (e) {
                    console.error(e);
                }
            };
        }
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
    // Keep a no-op method for backward compatibility so init() doesn't throw
    // and block subsequent sections (e.g., Sync and Booking Catalog) from rendering.
    addApiUrlInput() {
        return; // intentionally no UI
    }

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

    // Publish booking catalog (services + employees) to marketing API
    addPublishCatalogButton() {
        const dataSection = document.querySelectorAll('.settings-section')[1];
        if (!dataSection) return;

        if (document.getElementById('publishCatalogBtn')) return;

        const wrap = document.createElement('div');
        wrap.className = 'dynamic-content';
        wrap.innerHTML = `
            <h3 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">Booking Catalog</h3>
            <p style="color: var(--gray); margin-bottom: 0.5rem;">
                Publish your services and therapists so the booking website can load them.
            </p>
            <button class="btn btn-primary" id="publishCatalogBtn">
                <i class="fas fa-cloud-upload-alt"></i> Publish Booking Catalog
            </button>
        `;
        dataSection.appendChild(wrap);

        document.getElementById('publishCatalogBtn').addEventListener('click', async () => {
            await this.publishCatalog();
        });
    }

    async publishCatalog() {
        try {
            const btn = document.getElementById('publishCatalogBtn');
            const original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

            // 1) Gather from IndexedDB
            const allProducts = await db.getAll('products');
            const allEmployees = await db.getAll('employees');

            const services = (allProducts || [])
                .filter(p => (p.category === 'service') || (p.type === 'service'))
                .map(p => ({
                    id: String(p.id || p._id || ''),
                    name: String(p.name || ''),
                    category: 'service',
                    duration: Number(p.duration || 0),
                    price: Number(p.price || 0),
                    isActive: p.isActive !== false
                }));

            const employees = (allEmployees || [])
                .map(e => ({
                    id: String(e.id || e._id || ''),
                    name: String(e.name || ''),
                    position: String(e.position || ''),
                    email: String(e.email || ''),
                    phone: String(e.phone || '')
                }));

            // 2) Send to marketing API
            const marketingApi = 'https://ava-marketing-api.onrender.com';
            // Try get token from local/session storage first
            let token = localStorage.getItem('authToken') || localStorage.getItem('userToken') || sessionStorage.getItem('authToken') || sessionStorage.getItem('userToken');
            
            // If absent, try SSO token bridge from marketing site via postMessage
            if (!token) {
                token = await new Promise((resolve) => {
                    let resolved = false;
                    const listener = (event) => {
                        try {
                            if (!event || !event.data) return;
                            if (event.data.type === 'MARKETING_TOKEN_RESPONSE') {
                                window.removeEventListener('message', listener);
                                resolved = true;
                                resolve(event.data.token || null);
                            }
                        } catch(_) {}
                    };
                    window.addEventListener('message', listener);
                    // Open or focus marketing login in a hidden window to read existing token if logged in
                    const w = window.open('https://ava-solutions-marketing.netlify.app/login','ava_marketing_login');
                    try {
                        w && w.postMessage({ type: 'REQUEST_MARKETING_TOKEN' }, 'https://ava-solutions-marketing.netlify.app');
                    } catch(_){ }
                    // Timeout after 3s
                    setTimeout(() => { if (!resolved) { window.removeEventListener('message', listener); resolve(null); } }, 3000);
                });
                if (token) {
                    // Cache for next time
                    try { localStorage.setItem('authToken', token); } catch(_){ }
                }
            }

            if (!token) {
                btn.disabled = false; btn.innerHTML = original;
                showNotification('Please login on the marketing website first to obtain a token.', 'warning');
                window.open('https://ava-solutions-marketing.netlify.app/login', '_blank');
                return;
            }

            const res = await fetch(`${marketingApi}/api/public/publish-catalog`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ products: services, employees })
            });
            const data = await res.json();
            btn.disabled = false; btn.innerHTML = original;

            if (res.ok) {
                showNotification(`Published ${data.products || 0} services and ${data.employees || 0} employees for booking.`, 'success');
            } else {
                console.error('Publish failed:', data);
                showNotification(data.error || 'Publish failed', 'error');
            }
        } catch (error) {
            console.error('Publish catalog error:', error);
            showNotification('Publish failed. See console for details.', 'error');
            const btn = document.getElementById('publishCatalogBtn');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Publish Booking Catalog'; }
        }
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
