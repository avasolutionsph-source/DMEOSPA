// Gift Certificate Management System
class GiftCertificateManager {
    constructor() {
        this.db = null;
        this.certificates = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        try {
            this.db = await this.openDatabase();
            await this.createTables();
            await this.loadCertificates();
            this.setupEventListeners();
            this.updateDashboard();
            console.log('✅ Gift Certificate Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Gift Certificate Manager:', error);
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('GiftCertificatesDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('certificates')) {
                    const store = db.createObjectStore('certificates', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('controlNumber', 'controlNumber', { unique: true });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('createdDate', 'createdDate', { unique: false });
                    store.createIndex('expiryDate', 'expiryDate', { unique: false });
                }
            };
        });
    }

    async createTables() {
        // Tables are created in openDatabase
    }

    generateControlNumber() {
        const prefix = 'GC';
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        return `${prefix}-${year}-${random}`;
    }

    async generateAIDesign(certificate) {
        // Generate AI-powered design based on certificate details
        const designs = [
            {
                template: 'elegant',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontFamily: 'Georgia, serif',
                borderStyle: 'double',
                pattern: 'url("data:image/svg+xml,%3Csvg width="20" height="20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Cpath d="M0 0h20L0 20z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            },
            {
                template: 'modern',
                background: 'linear-gradient(to right, #fa709a 0%, #fee140 100%)',
                fontFamily: 'Helvetica, Arial, sans-serif',
                borderStyle: 'solid',
                pattern: 'url("data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M0 40L40 0H20L0 20z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            },
            {
                template: 'luxury',
                background: 'linear-gradient(to right, #0f0c29, #302b63, #24243e)',
                fontFamily: 'Playfair Display, serif',
                borderStyle: 'ridge',
                pattern: 'url("data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23FFD700" fill-opacity="0.03"%3E%3Cpath d="M30 30l15-15 15 15-15 15z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            },
            {
                template: 'festive',
                background: 'linear-gradient(to top, #a8edea 0%, #fed6e3 100%)',
                fontFamily: 'Dancing Script, cursive',
                borderStyle: 'dotted',
                pattern: 'url("data:image/svg+xml,%3Csvg width="20" height="20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23FF69B4" fill-opacity="0.1"%3E%3Ccircle cx="10" cy="10" r="3"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            },
            {
                template: 'minimalist',
                background: 'linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)',
                fontFamily: 'Montserrat, sans-serif',
                borderStyle: 'none',
                pattern: 'none'
            }
        ];

        // Select design based on certificate value and occasion
        let selectedDesign;
        if (certificate.occasion && certificate.occasion.toLowerCase().includes('wedding')) {
            selectedDesign = designs[0]; // Elegant
        } else if (certificate.occasion && certificate.occasion.toLowerCase().includes('birthday')) {
            selectedDesign = designs[3]; // Festive
        } else if (certificate.value >= 5000) {
            selectedDesign = designs[2]; // Luxury
        } else if (certificate.value >= 2000) {
            selectedDesign = designs[1]; // Modern
        } else {
            selectedDesign = designs[Math.floor(Math.random() * designs.length)];
        }

        return selectedDesign;
    }

    async createCertificate(data) {
        const certificate = {
            controlNumber: this.generateControlNumber(),
            recipientName: data.recipientName,
            recipientEmail: data.recipientEmail || '',
            value: parseFloat(data.value),
            occasion: data.occasion || 'General',
            message: data.message || '',
            status: 'active',
            createdDate: new Date().toISOString(),
            expiryDate: data.expiryDate || this.calculateExpiryDate(data.validityDays || 365),
            issuedBy: localStorage.getItem('userName') || 'System',
            design: await this.generateAIDesign(data),
            usageHistory: [],
            remainingValue: parseFloat(data.value)
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['certificates'], 'readwrite');
            const store = transaction.objectStore('certificates');
            const request = store.add(certificate);

            request.onsuccess = () => {
                certificate.id = request.result;
                this.certificates.push(certificate);
                this.updateDashboard();
                resolve(certificate);
            };

            request.onerror = () => reject(request.error);
        });
    }

    calculateExpiryDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
    }

    async loadCertificates() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['certificates'], 'readonly');
            const store = transaction.objectStore('certificates');
            const request = store.getAll();

            request.onsuccess = () => {
                this.certificates = request.result;
                this.checkExpiredCertificates();
                resolve(this.certificates);
            };

            request.onerror = () => reject(request.error);
        });
    }

    checkExpiredCertificates() {
        const now = new Date();
        this.certificates.forEach(cert => {
            if (cert.status === 'active' && new Date(cert.expiryDate) < now) {
                this.updateCertificateStatus(cert.id, 'expired');
            }
        });
    }

    async updateCertificateStatus(id, status) {
        const certificate = this.certificates.find(c => c.id === id);
        if (!certificate) return;

        certificate.status = status;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['certificates'], 'readwrite');
            const store = transaction.objectStore('certificates');
            const request = store.put(certificate);

            request.onsuccess = () => {
                this.updateDashboard();
                resolve(certificate);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async redeemCertificate(controlNumber, amount) {
        const certificate = this.certificates.find(c => c.controlNumber === controlNumber);
        if (!certificate) {
            throw new Error('Certificate not found');
        }

        if (certificate.status !== 'active') {
            throw new Error(`Certificate is ${certificate.status}`);
        }

        if (certificate.remainingValue < amount) {
            throw new Error('Insufficient certificate balance');
        }

        certificate.remainingValue -= amount;
        certificate.usageHistory.push({
            date: new Date().toISOString(),
            amount: amount,
            remainingValue: certificate.remainingValue,
            redeemedBy: localStorage.getItem('userName') || 'System'
        });

        if (certificate.remainingValue === 0) {
            certificate.status = 'redeemed';
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['certificates'], 'readwrite');
            const store = transaction.objectStore('certificates');
            const request = store.put(certificate);

            request.onsuccess = () => {
                this.updateDashboard();
                resolve(certificate);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async validateCertificate(controlNumber) {
        const certificate = this.certificates.find(c => c.controlNumber === controlNumber);
        if (!certificate) {
            return { valid: false, message: 'Certificate not found' };
        }

        if (certificate.status === 'expired') {
            return { valid: false, message: 'Certificate has expired' };
        }

        if (certificate.status === 'redeemed') {
            return { valid: false, message: 'Certificate has been fully redeemed' };
        }

        if (certificate.status === 'cancelled') {
            return { valid: false, message: 'Certificate has been cancelled' };
        }

        return {
            valid: true,
            certificate: certificate,
            message: 'Certificate is valid'
        };
    }

    getFilteredCertificates() {
        if (this.currentFilter === 'all') {
            return this.certificates;
        }
        return this.certificates.filter(c => c.status === this.currentFilter);
    }

    updateDashboard() {
        const stats = {
            total: this.certificates.length,
            active: this.certificates.filter(c => c.status === 'active').length,
            redeemed: this.certificates.filter(c => c.status === 'redeemed').length,
            expired: this.certificates.filter(c => c.status === 'expired').length,
            totalValue: this.certificates.reduce((sum, c) => sum + c.value, 0),
            remainingValue: this.certificates.reduce((sum, c) => sum + c.remainingValue, 0)
        };

        // Update dashboard stats
        const elements = {
            'gc-total-count': stats.total,
            'gc-active-count': stats.active,
            'gc-redeemed-count': stats.redeemed,
            'gc-expired-count': stats.expired,
            'gc-total-value': `₱${stats.totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            'gc-remaining-value': `₱${stats.remainingValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        this.renderCertificatesList();
    }

    renderCertificatesList() {
        const container = document.getElementById('certificates-list');
        if (!container) {
            console.log('Certificate list container not found, will retry...');
            return;
        }

        const certificates = this.getFilteredCertificates();
        
        if (certificates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gift"></i>
                    <h3>No Gift Certificates</h3>
                    <p>Create your first gift certificate to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = certificates.map(cert => `
            <div class="certificate-card ${cert.status}" data-id="${cert.id}">
                <div class="certificate-preview" style="background: ${cert.design.background}; background-image: ${cert.design.pattern};">
                    <div class="certificate-header">
                        <h4>GIFT CERTIFICATE</h4>
                        <span class="control-number">${cert.controlNumber}</span>
                    </div>
                    <div class="certificate-value">₱${cert.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    <div class="certificate-recipient">${cert.recipientName}</div>
                </div>
                <div class="certificate-details">
                    <div class="detail-row">
                        <span class="label">Status:</span>
                        <span class="status-badge ${cert.status}">${cert.status.toUpperCase()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Remaining:</span>
                        <span class="value">₱${cert.remainingValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Expires:</span>
                        <span class="value">${new Date(cert.expiryDate).toLocaleDateString()}</span>
                    </div>
                    <div class="certificate-actions">
                        <button class="btn-view" onclick="giftCertificateManager.viewCertificate('${cert.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn-print" onclick="giftCertificateManager.printCertificate('${cert.id}')">
                            <i class="fas fa-print"></i> Print
                        </button>
                        ${cert.status === 'active' ? `
                            <button class="btn-redeem" onclick="giftCertificateManager.showRedeemModal('${cert.controlNumber}')">
                                <i class="fas fa-check-circle"></i> Redeem
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    viewCertificate(id) {
        const certificate = this.certificates.find(c => c.id == id);
        if (!certificate) return;

        const modal = document.createElement('div');
        modal.className = 'modal gc-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Gift Certificate Details</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="certificate-full-preview" style="background: ${certificate.design.background}; background-image: ${certificate.design.pattern}; font-family: ${certificate.design.fontFamily};">
                        <div class="certificate-border" style="border-style: ${certificate.design.borderStyle};">
                            <h1>GIFT CERTIFICATE</h1>
                            <div class="control-number">${certificate.controlNumber}</div>
                            <div class="recipient-section">
                                <p>This certificate is presented to</p>
                                <h2>${certificate.recipientName}</h2>
                            </div>
                            <div class="value-section">
                                <p>In the amount of</p>
                                <h1>₱${certificate.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</h1>
                            </div>
                            ${certificate.message ? `
                                <div class="message-section">
                                    <p>${certificate.message}</p>
                                </div>
                            ` : ''}
                            <div class="footer-section">
                                <p>Valid until ${new Date(certificate.expiryDate).toLocaleDateString()}</p>
                                <p>Issued by ${certificate.issuedBy}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="certificate-info">
                        <h3>Certificate Information</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Control Number:</label>
                                <span>${certificate.controlNumber}</span>
                            </div>
                            <div class="info-item">
                                <label>Status:</label>
                                <span class="status-badge ${certificate.status}">${certificate.status.toUpperCase()}</span>
                            </div>
                            <div class="info-item">
                                <label>Original Value:</label>
                                <span>₱${certificate.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="info-item">
                                <label>Remaining Value:</label>
                                <span>₱${certificate.remainingValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="info-item">
                                <label>Created Date:</label>
                                <span>${new Date(certificate.createdDate).toLocaleDateString()}</span>
                            </div>
                            <div class="info-item">
                                <label>Expiry Date:</label>
                                <span>${new Date(certificate.expiryDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        ${certificate.usageHistory.length > 0 ? `
                            <h3>Usage History</h3>
                            <div class="usage-history">
                                ${certificate.usageHistory.map(usage => `
                                    <div class="usage-item">
                                        <span>${new Date(usage.date).toLocaleDateString()}</span>
                                        <span>-₱${usage.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                        <span>Balance: ₱${usage.remainingValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                        <span>By: ${usage.redeemedBy}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    printCertificate(id) {
        const certificate = this.certificates.find(c => c.id == id);
        if (!certificate) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gift Certificate - ${certificate.controlNumber}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: ${certificate.design.fontFamily};
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: #f0f0f0;
                    }
                    .certificate {
                        width: 800px;
                        height: 500px;
                        background: ${certificate.design.background};
                        background-image: ${certificate.design.pattern};
                        padding: 40px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        position: relative;
                    }
                    .certificate-border {
                        border: 5px ${certificate.design.borderStyle} rgba(255,255,255,0.3);
                        height: 100%;
                        padding: 30px;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                    }
                    h1 {
                        color: white;
                        font-size: 36px;
                        margin-bottom: 10px;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    }
                    .control-number {
                        color: rgba(255,255,255,0.9);
                        font-size: 14px;
                        margin-bottom: 20px;
                    }
                    .recipient-section h2 {
                        color: white;
                        font-size: 28px;
                        margin: 10px 0;
                    }
                    .value-section h1 {
                        color: #FFD700;
                        font-size: 48px;
                        margin: 20px 0;
                    }
                    p {
                        color: rgba(255,255,255,0.9);
                        font-size: 16px;
                    }
                    @media print {
                        body {
                            background: white;
                        }
                        .certificate {
                            box-shadow: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="certificate">
                    <div class="certificate-border">
                        <div>
                            <h1>GIFT CERTIFICATE</h1>
                            <div class="control-number">${certificate.controlNumber}</div>
                        </div>
                        <div class="recipient-section">
                            <p>This certificate is presented to</p>
                            <h2>${certificate.recipientName}</h2>
                        </div>
                        <div class="value-section">
                            <p>In the amount of</p>
                            <h1>₱${certificate.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</h1>
                        </div>
                        ${certificate.message ? `
                            <div class="message-section">
                                <p>${certificate.message}</p>
                            </div>
                        ` : ''}
                        <div>
                            <p>Valid until ${new Date(certificate.expiryDate).toLocaleDateString()}</p>
                            <p>Issued by ${certificate.issuedBy}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    showRedeemModal(controlNumber) {
        const modal = document.createElement('div');
        modal.className = 'modal gc-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Redeem Gift Certificate</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Control Number</label>
                        <input type="text" id="redeem-control-number" value="${controlNumber}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Amount to Redeem</label>
                        <input type="number" id="redeem-amount" placeholder="Enter amount" step="0.01" min="0.01">
                    </div>
                    <div class="form-actions">
                        <button class="btn-primary" onclick="giftCertificateManager.processRedemption()">
                            Redeem
                        </button>
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async processRedemption() {
        const controlNumber = document.getElementById('redeem-control-number').value;
        const amount = parseFloat(document.getElementById('redeem-amount').value);

        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            const result = await this.redeemCertificate(controlNumber, amount);
            alert(`Successfully redeemed ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Remaining balance: ₱${result.remainingValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
            document.querySelector('.modal').remove();
        } catch (error) {
            alert(error.message);
        }
    }

    setupEventListeners() {
        // Wait for DOM to be ready
        setTimeout(() => {
            // Filter buttons
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.currentFilter = e.target.dataset.filter;
                    this.renderCertificatesList();
                });
            });

            // Create certificate button
            const createBtn = document.getElementById('create-certificate-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.showCreateModal());
            }

            // Validate certificate button
            const validateBtn = document.getElementById('validate-certificate-btn');
            if (validateBtn) {
                validateBtn.addEventListener('click', () => this.showValidateModal());
            }

            // Export button
            const exportBtn = document.getElementById('export-certificates-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportCertificates());
            }
        }, 100);
    }

    showCreateModal() {
        const modal = document.createElement('div');
        modal.className = 'modal gc-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create Gift Certificate</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="create-certificate-form">
                        <div class="form-group">
                            <label>Recipient Name *</label>
                            <input type="text" name="recipientName" required>
                        </div>
                        <div class="form-group">
                            <label>Recipient Email</label>
                            <input type="email" name="recipientEmail">
                        </div>
                        <div class="form-group">
                            <label>Value (₱) *</label>
                            <input type="number" name="value" step="0.01" min="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Occasion</label>
                            <select name="occasion">
                                <option value="General">General</option>
                                <option value="Birthday">Birthday</option>
                                <option value="Wedding">Wedding</option>
                                <option value="Anniversary">Anniversary</option>
                                <option value="Christmas">Christmas</option>
                                <option value="Graduation">Graduation</option>
                                <option value="Thank You">Thank You</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Personal Message</label>
                            <textarea name="message" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Validity (Days)</label>
                            <input type="number" name="validityDays" value="365" min="1">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Create Certificate</button>
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('create-certificate-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                const certificate = await this.createCertificate(data);
                alert(`Gift Certificate created successfully! Control Number: ${certificate.controlNumber}`);
                modal.remove();
                this.viewCertificate(certificate.id);
            } catch (error) {
                alert('Failed to create certificate: ' + error.message);
            }
        });
    }

    showValidateModal() {
        const modal = document.createElement('div');
        modal.className = 'modal gc-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Validate Gift Certificate</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Control Number</label>
                        <input type="text" id="validate-control-number" placeholder="Enter control number">
                    </div>
                    <div id="validation-result"></div>
                    <div class="form-actions">
                        <button class="btn-primary" onclick="giftCertificateManager.performValidation()">
                            Validate
                        </button>
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async performValidation() {
        const controlNumber = document.getElementById('validate-control-number').value;
        const resultDiv = document.getElementById('validation-result');

        if (!controlNumber) {
            resultDiv.innerHTML = '<div class="alert alert-error">Please enter a control number</div>';
            return;
        }

        const result = await this.validateCertificate(controlNumber);
        
        if (result.valid) {
            const cert = result.certificate;
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <h4>✓ Certificate is Valid</h4>
                    <div class="validation-details">
                        <p><strong>Recipient:</strong> ${cert.recipientName}</p>
                        <p><strong>Original Value:</strong> ₱${cert.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        <p><strong>Remaining Value:</strong> ₱${cert.remainingValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        <p><strong>Expires:</strong> ${new Date(cert.expiryDate).toLocaleDateString()}</p>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-error">
                    <h4>✗ Certificate Invalid</h4>
                    <p>${result.message}</p>
                </div>
            `;
        }
    }

    async exportCertificates() {
        const certificates = this.getFilteredCertificates();
        const csv = [
            ['Control Number', 'Recipient', 'Value', 'Remaining Value', 'Status', 'Created Date', 'Expiry Date'].join(','),
            ...certificates.map(c => [
                c.controlNumber,
                c.recipientName,
                c.value,
                c.remainingValue,
                c.status,
                new Date(c.createdDate).toLocaleDateString(),
                new Date(c.expiryDate).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gift-certificates-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }
}

// Initialize the manager when the page loads
let giftCertificateManager;
window.loadGiftCertificates = async () => {
    giftCertificateManager = new GiftCertificateManager();
};

// Export for use in other modules
window.GiftCertificateManager = GiftCertificateManager;