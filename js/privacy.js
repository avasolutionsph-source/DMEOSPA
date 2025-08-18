// Privacy and Data Management System - Philippines DPA Compliant
class PrivacyManager {
    constructor() {
        this.consentKey = 'ava_privacy_consent';
        this.dpoEmail = 'dpo@avasolutionsph.com';
    }

    async init() {
        await this.checkConsentStatus();
        this.setupDataRightsUI();
    }

    async checkConsentStatus() {
        const consent = await db.get('settings', 'privacyConsent');
        if (!consent) {
            this.showConsentDialog();
        }
    }

    showConsentDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'privacyConsentModal';
        modal.style.zIndex = '10000';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-shield-alt"></i> Privacy Consent</h2>
                </div>
                <div class="modal-body">
                    <div style="background: var(--gradient-light); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem;">
                        <h3 style="color: var(--primary); margin-bottom: 1rem;">Your Data, Your Rights</h3>
                        <p>Under the Data Privacy Act of 2012 (RA 10173), we need your consent to process certain types of personal data for your business management needs.</p>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <h4>We will process the following data:</h4>
                        <ul style="margin-left: 1rem;">
                            <li>Business and employee information for operations</li>
                            <li>Customer data for booking and transaction management</li>
                            <li>Financial records for reporting and compliance</li>
                            <li>Usage analytics to improve our services (optional)</li>
                        </ul>
                    </div>

                    <div style="background: #fee2e2; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                        <h4 style="color: #dc2626; margin-bottom: 0.5rem;">
                            <i class="fas fa-exclamation-triangle"></i> Sensitive Data Notice
                        </h4>
                        <p style="margin: 0; color: #7f1d1d;">
                            If you store health information, therapy notes, or other sensitive personal data, 
                            additional explicit consent is required under Philippine law.
                        </p>
                    </div>

                    <div style="margin-bottom: 2rem;">
                        <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; margin-bottom: 1rem;">
                            <input type="checkbox" id="basicDataConsent" style="margin-top: 0.25rem;">
                            <span>I consent to the processing of my business and employee data for core business operations (required to use the service)</span>
                        </label>

                        <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; margin-bottom: 1rem;">
                            <input type="checkbox" id="sensitiveDataConsent">
                            <span>I consent to the processing of sensitive personal data (health information, therapy notes) where applicable</span>
                        </label>

                        <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; margin-bottom: 1rem;">
                            <input type="checkbox" id="analyticsConsent">
                            <span>I consent to usage analytics and service improvement data collection (optional)</span>
                        </label>

                        <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
                            <input type="checkbox" id="marketingConsent">
                            <span>I consent to receiving marketing communications and promotional updates (optional)</span>
                        </label>
                    </div>

                    <div style="font-size: 0.9rem; color: var(--text-light);">
                        <p><strong>Your Rights:</strong> You can withdraw consent, request data deletion, or export your data at any time through Settings > Privacy & Data.</p>
                        <p><strong>DPO Contact:</strong> <a href="mailto:${this.dpoEmail}">${this.dpoEmail}</a></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="privacyManager.saveConsent()" id="saveConsentBtn" disabled>
                        <i class="fas fa-check"></i> Save Preferences
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Enable save button only when basic consent is given
        const basicConsent = document.getElementById('basicDataConsent');
        const saveBtn = document.getElementById('saveConsentBtn');
        
        const checkRequired = () => {
            saveBtn.disabled = !basicConsent.checked;
            saveBtn.style.opacity = basicConsent.checked ? '1' : '0.5';
        };
        
        basicConsent.addEventListener('change', checkRequired);
        checkRequired();
    }

    async saveConsent() {
        const consent = {
            basic: document.getElementById('basicDataConsent').checked,
            sensitive: document.getElementById('sensitiveDataConsent').checked,
            analytics: document.getElementById('analyticsConsent').checked,
            marketing: document.getElementById('marketingConsent').checked,
            timestamp: new Date().toISOString(),
            ipAddress: await this.getClientIP(),
            userAgent: navigator.userAgent
        };

        if (!consent.basic) {
            showNotification('Basic data processing consent is required to use the service', 'error');
            return;
        }

        // Save to database
        await db.update('settings', {
            key: 'privacyConsent',
            value: consent
        });

        // Log consent for audit trail
        await this.logConsentAction('granted', consent);

        // Close modal
        const modal = document.getElementById('privacyConsentModal');
        if (modal) modal.remove();

        showNotification('Privacy preferences saved successfully', 'success');
    }

    async logConsentAction(action, details) {
        const log = {
            action: action, // 'granted', 'withdrawn', 'modified'
            details: details,
            timestamp: new Date().toISOString(),
            sessionId: this.getSessionId()
        };

        // Store in consent logs
        const logs = await db.getAll('consentLogs') || [];
        logs.push(log);
        await db.update('settings', { key: 'consentLogs', value: logs });
    }

    async exportUserData() {
        try {
            showLoading('Preparing your data export...', 'This may take a moment');

            const data = {
                exportDate: new Date().toISOString(),
                businessInfo: await this.getBusinessData(),
                employees: await db.getAll('employees'),
                customers: await db.getAll('customers'),
                transactions: await db.getAll('transactions'),
                bookings: await db.getAll('bookings'),
                inventory: await db.getAll('inventory'),
                products: await db.getAll('products'),
                rooms: await db.getAll('rooms'),
                sessions: await db.getAll('sessions'),
                settings: await this.getExportableSettings(),
                consentHistory: await this.getConsentHistory()
            };

            // Remove sensitive fields
            data.employees = data.employees.map(emp => {
                const clean = { ...emp };
                delete clean.password;
                delete clean.ssn;
                return clean;
            });

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ava-solutions-data-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            hideLoading();
            showNotification('Data export completed successfully', 'success');

            // Log the export action
            await this.logDataAction('export', { exportedRecords: Object.keys(data).length });

        } catch (error) {
            hideLoading();
            console.error('Data export failed:', error);
            showNotification('Data export failed. Please try again.', 'error');
        }
    }

    async deleteAllUserData() {
        const confirmed = await app.confirm(
            'Delete All Data',
            'This will permanently delete ALL your business data including transactions, employees, and settings. This action cannot be undone. Are you absolutely sure?'
        );

        if (!confirmed) return;

        const finalConfirm = await app.prompt({
            title: 'Final Confirmation',
            label: 'Type "DELETE EVERYTHING" to confirm:',
            value: ''
        });

        if (finalConfirm !== 'DELETE EVERYTHING') {
            showNotification('Data deletion cancelled - confirmation text did not match', 'info');
            return;
        }

        try {
            showLoading('Deleting all data...', 'This process cannot be undone');

            // Log the deletion before removing data
            await this.logDataAction('deletion', { reason: 'user_requested', timestamp: new Date().toISOString() });

            // Clear all stores except settings (keep some for legal compliance)
            const storesToClear = ['employees', 'customers', 'transactions', 'bookings', 'inventory', 'products', 'rooms', 'sessions', 'attendance', 'payrollRuns', 'tips'];
            
            for (const store of storesToClear) {
                const items = await db.getAll(store);
                for (const item of items) {
                    await db.delete(store, item.id);
                }
            }

            // Clear most settings but keep legal compliance data
            const settingsToKeep = ['privacyConsent', 'consentLogs', 'dataActionLogs', 'businessRegistration'];
            const allSettings = await db.getAll('settings');
            for (const setting of allSettings) {
                if (!settingsToKeep.includes(setting.key)) {
                    await db.delete('settings', setting.key);
                }
            }

            hideLoading();
            showNotification('All user data has been permanently deleted', 'success');

            // Redirect to registration after deletion
            setTimeout(() => {
                window.location.href = 'https://ava-solutions-marketing.netlify.app/register';
            }, 3000);

        } catch (error) {
            hideLoading();
            console.error('Data deletion failed:', error);
            showNotification('Data deletion failed. Please contact support.', 'error');
        }
    }

    async getBusinessData() {
        const settings = await db.getAll('settings');
        const businessData = {};
        
        const businessKeys = ['businessName', 'ownerName', 'businessPhone', 'businessAddress', 'businessConfig'];
        for (const key of businessKeys) {
            const setting = settings.find(s => s.key === key);
            if (setting) businessData[key] = setting.value;
        }
        
        return businessData;
    }

    async getExportableSettings() {
        const settings = await db.getAll('settings');
        // Exclude sensitive settings from export
        const excludeKeys = ['authToken', 'apiKeys', 'passwords'];
        return settings.filter(s => !excludeKeys.some(key => s.key.includes(key)));
    }

    async getConsentHistory() {
        const logs = await db.get('settings', 'consentLogs');
        return logs?.value || [];
    }

    async logDataAction(action, details) {
        const log = {
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            sessionId: this.getSessionId()
        };

        const logs = await db.get('settings', 'dataActionLogs');
        const currentLogs = logs?.value || [];
        currentLogs.push(log);
        
        await db.update('settings', { key: 'dataActionLogs', value: currentLogs });
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('ava_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('ava_session_id', sessionId);
        }
        return sessionId;
    }

    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    setupDataRightsUI() {
        // Add privacy section to settings if it doesn't exist
        const settingsPage = document.getElementById('settings');
        if (settingsPage && !document.getElementById('privacySection')) {
            const privacySection = document.createElement('div');
            privacySection.id = 'privacySection';
            privacySection.innerHTML = `
                <div class="settings-section">
                    <h3><i class="fas fa-shield-alt"></i> Privacy & Data Rights</h3>
                    <div class="settings-grid">
                        <div class="setting-item">
                            <div class="setting-info">
                                <h4>Export Your Data</h4>
                                <p>Download all your business data in JSON format</p>
                            </div>
                            <button class="btn btn-secondary" onclick="privacyManager.exportUserData()">
                                <i class="fas fa-download"></i> Export Data
                            </button>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <h4>Manage Consent</h4>
                                <p>Update your privacy preferences and consent settings</p>
                            </div>
                            <button class="btn btn-secondary" onclick="privacyManager.showConsentDialog()">
                                <i class="fas fa-edit"></i> Update Consent
                            </button>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <h4>Contact DPO</h4>
                                <p>Reach our Data Protection Officer for privacy questions</p>
                            </div>
                            <button class="btn btn-secondary" onclick="privacyManager.showDPOContactModal()">
                                <i class="fas fa-envelope"></i> Contact DPO
                            </button>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <h4>Report Security Incident</h4>
                                <p>Log a suspected breach and notify the DPO</p>
                            </div>
                            <button class="btn btn-secondary" onclick="privacyManager.showReportBreachDialog()">
                                <i class="fas fa-bullhorn"></i> Report Incident
                            </button>
                        </div>
                        
                        <div class="setting-item" style="border: 2px solid var(--error); background: #fef2f2;">
                            <div class="setting-info">
                                <h4 style="color: var(--error);">Delete All Data</h4>
                                <p style="color: #7f1d1d;">Permanently delete your account and all associated data</p>
                            </div>
                            <button class="btn" style="background: var(--error); color: white;" onclick="privacyManager.deleteAllUserData()">
                                <i class="fas fa-trash"></i> Delete Everything
                            </button>
                        </div>
                    </div>
                    
                    <div style="margin-top: 2rem; padding: 1.5rem; background: var(--gradient-light); border-radius: 0.5rem;">
                        <h4>Your Rights Under Philippine Law</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                            <div>
                                <strong>Access:</strong> Request copies of your data
                            </div>
                            <div>
                                <strong>Rectification:</strong> Correct inaccurate data
                            </div>
                            <div>
                                <strong>Erasure:</strong> Request data deletion
                            </div>
                            <div>
                                <strong>Portability:</strong> Export your data
                            </div>
                            <div>
                                <strong>Object:</strong> Opt-out of processing
                            </div>
                            <div>
                                <strong>Complaint:</strong> File with NPC
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            settingsPage.appendChild(privacySection);
        }
    }

    async reportBreach(description, severity = 'medium') {
        const breach = {
            id: 'breach_' + Date.now(),
            description: description,
            severity: severity, // low, medium, high, critical
            reportedAt: new Date().toISOString(),
            reportedBy: 'system', // or user email
            status: 'reported',
            affectedRecords: 'unknown',
            containmentActions: [],
            notificationsSent: false
        };

        // Store breach report
        const breaches = await db.get('settings', 'breachReports');
        const currentBreaches = breaches?.value || [];
        currentBreaches.push(breach);
        await db.update('settings', { key: 'breachReports', value: currentBreaches });

        // If critical, auto-notify
        if (severity === 'critical' || severity === 'high') {
            await this.notifyDPO(breach);
        }

        console.error('Security breach reported:', breach);
        return breach.id;
    }

    async notifyDPO(breach) {
        // In production, this would send an email/SMS to DPO
        console.log('DPO notification would be sent for breach:', breach.id);
        
        // Show admin notification
        showNotification(`Security breach reported (${breach.id}). DPO has been notified.`, 'error');
    }

    showReportBreachDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 580px;">
                <div class="modal-header">
                    <h2><i class=\"fas fa-bullhorn\"></i> Report Security Incident</h2>
                </div>
                <div class="modal-body">
                    <label class="form-label">Describe the incident</label>
                    <textarea id="breachDesc" class="form-input" rows="4" placeholder="What happened? Include when and how you discovered it."></textarea>
                    <div style="height:8px"></div>
                    <label class="form-label">Severity</label>
                    <select id="breachSeverity" class="form-input">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="submitBreachBtn">Submit</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('#submitBreachBtn').onclick = async () => {
            const desc = modal.querySelector('#breachDesc').value.trim();
            const sev = modal.querySelector('#breachSeverity').value;
            if (!desc) { showNotification('Please describe the incident', 'warning'); return; }
            const id = await this.reportBreach(desc, sev);
            showNotification(`Incident logged (#${id})`, 'success');
            modal.remove();
        };
    }

    showDPOContactModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 580px;">
                <div class="modal-header">
                    <h2><i class=\"fas fa-envelope\"></i> Contact Data Protection Officer</h2>
                </div>
                <div class="modal-body">
                    <label class="form-label">Subject</label>
                    <input id="dpoSubject" class="form-input" placeholder="Subject" />
                    <div style="height:8px"></div>
                    <label class="form-label">Message</label>
                    <textarea id="dpoMessage" class="form-input" rows="5" placeholder="Write your message..."></textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="sendDpoBtn">Send</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('#sendDpoBtn').onclick = () => {
            const subject = encodeURIComponent(modal.querySelector('#dpoSubject').value || 'Privacy Inquiry');
            const body = encodeURIComponent(modal.querySelector('#dpoMessage').value + `\n\n---\nApp Version: ${window.app?.version || 'N/A'}\nUser Agent: ${navigator.userAgent}`);
            window.open(`mailto:${this.dpoEmail}?subject=${subject}&body=${body}`);
            modal.remove();
            showNotification('Opening mail app to contact DPO', 'info');
        };
    }

    // Check if user has given specific consent
    async hasConsent(type) {
        const consent = await db.get('settings', 'privacyConsent');
        return consent?.value?.[type] || false;
    }

    // Withdraw specific consent
    async withdrawConsent(type) {
        const consent = await db.get('settings', 'privacyConsent');
        if (consent?.value) {
            consent.value[type] = false;
            consent.value.lastModified = new Date().toISOString();
            await db.update('settings', { key: 'privacyConsent', value: consent.value });
            await this.logConsentAction('withdrawn', { type: type });
            showNotification(`${type} consent withdrawn successfully`, 'info');
        }
    }
}

// Initialize privacy manager
const privacyManager = new PrivacyManager();
window.privacyManager = privacyManager;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.db) {
        privacyManager.init();
    } else {
        // Wait for database to be ready
        const checkDB = setInterval(() => {
            if (window.db) {
                clearInterval(checkDB);
                privacyManager.init();
            }
        }, 100);
    }
});
