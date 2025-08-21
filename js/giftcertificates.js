// Gift Certificate Management System
class GiftCertificateManager {
    constructor() {
        this.giftCertificates = [];
    }

    async init() {
        await this.loadGiftCertificates();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Generate new GC button
        const generateBtn = document.getElementById('generateGCBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.showGenerateModal());
        }

        // Generate GC form
        const generateForm = document.getElementById('generateGCForm');
        if (generateForm) {
            generateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateGiftCertificate();
            });
        }
    }

    async loadGiftCertificates() {
        try {
            this.giftCertificates = await db.getAll('giftCertificates');
            this.displayGiftCertificates();
        } catch (error) {
            console.error('Failed to load gift certificates:', error);
        }
    }

    displayGiftCertificates() {
        const container = document.getElementById('gcList');
        if (!container) return;

        if (this.giftCertificates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gift" style="font-size: 3rem; color: #ddd;"></i>
                    <h3>No Gift Certificates</h3>
                    <p>Generate your first gift certificate to get started</p>
                </div>
            `;
            return;
        }

        // Sort by date, newest first
        const sorted = [...this.giftCertificates].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        container.innerHTML = sorted.map(gc => {
            const statusColor = gc.status === 'active' ? 'success' : 
                               gc.status === 'used' ? 'warning' : 'danger';
            const statusIcon = gc.status === 'active' ? 'check-circle' : 
                              gc.status === 'used' ? 'check-square' : 'times-circle';

            return `
                <div class="gc-card">
                    <div class="gc-header">
                        <div class="gc-control-number">
                            <strong>Control #:</strong> ${gc.controlNumber}
                        </div>
                        <div class="gc-status ${statusColor}">
                            <i class="fas fa-${statusIcon}"></i> ${gc.status.toUpperCase()}
                        </div>
                    </div>
                    <div class="gc-details">
                        <div class="gc-amount">
                            <i class="fas fa-peso-sign"></i> ${app.formatCurrency(gc.amount)}
                        </div>
                        <div class="gc-info">
                            <div><strong>Issued:</strong> ${new Date(gc.createdAt).toLocaleDateString()}</div>
                            ${gc.recipient ? `<div><strong>Recipient:</strong> ${gc.recipient}</div>` : ''}
                            ${gc.expiryDate ? `<div><strong>Expires:</strong> ${new Date(gc.expiryDate).toLocaleDateString()}</div>` : ''}
                            ${gc.status === 'used' ? `
                                <div><strong>Used:</strong> ${new Date(gc.usedDate).toLocaleDateString()}</div>
                                ${gc.usedInTransaction ? `<div><strong>Transaction:</strong> #${gc.usedInTransaction}</div>` : ''}
                            ` : ''}
                        </div>
                    </div>
                    <div class="gc-actions">
                        ${gc.status === 'active' ? `
                            <button class="btn btn-sm btn-secondary" onclick="gcManager.printGC('${gc.id}')">
                                <i class="fas fa-print"></i> Print
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="gcManager.voidGC('${gc.id}')">
                                <i class="fas fa-ban"></i> Void
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-info" onclick="gcManager.viewGCHistory('${gc.id}')">
                            <i class="fas fa-history"></i> History
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    showGenerateModal() {
        // Reset form
        document.getElementById('gcAmount').value = '';
        document.getElementById('gcRecipient').value = '';
        document.getElementById('gcExpiryDate').value = '';
        document.getElementById('gcNotes').value = '';
        
        openModal('generateGCModal');
    }

    async generateGiftCertificate() {
        const amount = parseFloat(document.getElementById('gcAmount').value);
        const recipient = document.getElementById('gcRecipient').value.trim();
        const expiryDate = document.getElementById('gcExpiryDate').value;
        const notes = document.getElementById('gcNotes').value.trim();

        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return;
        }

        // Generate unique control number
        const controlNumber = this.generateControlNumber();

        // Check if control number already exists (unlikely but important)
        const existing = await db.getByIndex('giftCertificates', 'controlNumber', controlNumber);
        if (existing && existing.length > 0) {
            showNotification('Control number conflict. Please try again.', 'error');
            return;
        }

        const giftCertificate = {
            controlNumber: controlNumber,
            amount: amount,
            recipient: recipient || null,
            expiryDate: expiryDate || null,
            notes: notes || null,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: window.app?.currentUser?.email || 'admin',
            usedDate: null,
            usedInTransaction: null,
            syncStatus: 'pending',
            auditLog: [{
                action: 'created',
                date: new Date().toISOString(),
                by: window.app?.currentUser?.email || 'admin',
                details: `Generated GC worth ${app.formatCurrency(amount)}`
            }]
        };

        try {
            await db.add('giftCertificates', giftCertificate);
            showNotification(`Gift Certificate ${controlNumber} generated successfully!`, 'success');
            closeModal('generateGCModal');
            await this.loadGiftCertificates();
            
            // Auto-print option
            if (confirm('Would you like to print the gift certificate now?')) {
                setTimeout(() => this.printGC(giftCertificate.id), 500);
            }
        } catch (error) {
            console.error('Failed to generate gift certificate:', error);
            showNotification('Failed to generate gift certificate', 'error');
        }
    }

    generateControlNumber() {
        // Format: GC-YYYYMMDD-XXXXX (where X is random alphanumeric)
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Generate random 5-character alphanumeric string
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let random = '';
        for (let i = 0; i < 5; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return `GC-${year}${month}${day}-${random}`;
    }

    async voidGC(gcId) {
        if (!confirm('Are you sure you want to void this gift certificate? This action cannot be undone.')) {
            return;
        }

        try {
            const gc = await db.get('giftCertificates', parseInt(gcId));
            if (!gc) {
                showNotification('Gift certificate not found', 'error');
                return;
            }

            if (gc.status === 'used') {
                showNotification('Cannot void a used gift certificate', 'error');
                return;
            }

            gc.status = 'voided';
            gc.voidedDate = new Date().toISOString();
            gc.voidedBy = window.app?.currentUser?.email || 'admin';
            
            // Add to audit log
            if (!gc.auditLog) gc.auditLog = [];
            gc.auditLog.push({
                action: 'voided',
                date: new Date().toISOString(),
                by: window.app?.currentUser?.email || 'admin',
                details: 'Gift certificate voided'
            });

            await db.update('giftCertificates', gc);
            showNotification(`Gift Certificate ${gc.controlNumber} has been voided`, 'info');
            await this.loadGiftCertificates();
        } catch (error) {
            console.error('Failed to void gift certificate:', error);
            showNotification('Failed to void gift certificate', 'error');
        }
    }

    async printGC(gcId) {
        try {
            const gc = await db.get('giftCertificates', parseInt(gcId));
            if (!gc) {
                showNotification('Gift certificate not found', 'error');
                return;
            }

            // Create print window
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            
            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Gift Certificate - ${gc.controlNumber}</title>
                    <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        }
                        .gc-container {
                            background: white;
                            border-radius: 15px;
                            padding: 30px;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                            text-align: center;
                        }
                        .gc-header {
                            border-bottom: 2px solid #667eea;
                            padding-bottom: 20px;
                            margin-bottom: 20px;
                        }
                        .business-name {
                            font-size: 24px;
                            font-weight: bold;
                            color: #667eea;
                            margin-bottom: 10px;
                        }
                        .gc-title {
                            font-size: 20px;
                            color: #333;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                        }
                        .gc-amount {
                            font-size: 48px;
                            font-weight: bold;
                            color: #764ba2;
                            margin: 30px 0;
                        }
                        .control-number {
                            background: #f7f7f7;
                            padding: 15px;
                            border-radius: 10px;
                            font-size: 18px;
                            font-weight: bold;
                            margin: 20px 0;
                            font-family: 'Courier New', monospace;
                        }
                        .recipient {
                            font-size: 16px;
                            margin: 15px 0;
                        }
                        .expiry {
                            font-size: 14px;
                            color: #666;
                            margin-top: 20px;
                        }
                        .footer {
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px dashed #ccc;
                            font-size: 12px;
                            color: #999;
                        }
                        @media print {
                            body { background: white; }
                        }
                    </style>
                </head>
                <body>
                    <div class="gc-container">
                        <div class="gc-header">
                            <div class="business-name">${window.app?.businessName || 'Ava Solutions'}</div>
                            <div class="gc-title">Gift Certificate</div>
                        </div>
                        
                        <div class="gc-amount">₱${gc.amount.toLocaleString('en-PH')}</div>
                        
                        <div class="control-number">
                            Control Number<br>
                            <strong>${gc.controlNumber}</strong>
                        </div>
                        
                        ${gc.recipient ? `
                            <div class="recipient">
                                <strong>For:</strong> ${gc.recipient}
                            </div>
                        ` : ''}
                        
                        ${gc.expiryDate ? `
                            <div class="expiry">
                                Valid until: ${new Date(gc.expiryDate).toLocaleDateString('en-PH', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </div>
                        ` : '<div class="expiry">No expiration</div>'}
                        
                        <div class="footer">
                            <div>This certificate is valid for products and services</div>
                            <div>Present this certificate at checkout</div>
                            <div style="margin-top: 10px;">Issued: ${new Date(gc.createdAt).toLocaleDateString('en-PH')}</div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Wait for content to load then print
            printWindow.onload = function() {
                printWindow.print();
            };

        } catch (error) {
            console.error('Failed to print gift certificate:', error);
            showNotification('Failed to print gift certificate', 'error');
        }
    }

    async viewGCHistory(gcId) {
        try {
            const gc = await db.get('giftCertificates', parseInt(gcId));
            if (!gc || !gc.auditLog) {
                showNotification('No history available', 'info');
                return;
            }

            const historyHtml = gc.auditLog.map(log => `
                <div class="history-item">
                    <div class="history-date">${new Date(log.date).toLocaleString()}</div>
                    <div class="history-action"><strong>${log.action.toUpperCase()}</strong></div>
                    <div class="history-details">${log.details}</div>
                    <div class="history-by">By: ${log.by}</div>
                </div>
            `).join('');

            // You would show this in a modal
            alert(`Gift Certificate History:\n\n${gc.auditLog.map(log => 
                `${new Date(log.date).toLocaleString()}: ${log.action} - ${log.details} (by ${log.by})`
            ).join('\n')}`);

        } catch (error) {
            console.error('Failed to view history:', error);
        }
    }
}

// Initialize Gift Certificate Manager
const gcManager = new GiftCertificateManager();

// Load when page is shown
window.loadGiftCertificates = async function() {
    await gcManager.init();
    
    // Generate sample GCs for testing (only once)
    const existingGCs = await db.getAll('giftCertificates');
    if (existingGCs.length === 0) {
        // Add sample GCs
        const sampleGCs = [
            {
                controlNumber: 'GC-20240101-TEST1',
                amount: 500,
                recipient: 'Sample Customer',
                status: 'active',
                createdAt: new Date().toISOString(),
                createdBy: 'system',
                auditLog: [{
                    action: 'created',
                    date: new Date().toISOString(),
                    by: 'system',
                    details: 'Sample GC for testing'
                }]
            },
            {
                controlNumber: 'GC-20240101-TEST2',
                amount: 1000,
                status: 'active',
                createdAt: new Date().toISOString(),
                createdBy: 'system',
                auditLog: [{
                    action: 'created',
                    date: new Date().toISOString(),
                    by: 'system',
                    details: 'Sample GC for testing'
                }]
            }
        ];
        
        for (const gc of sampleGCs) {
            await db.add('giftCertificates', gc);
        }
        
        await gcManager.loadGiftCertificates();
    }
};