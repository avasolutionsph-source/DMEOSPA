// Gift Certificate Management System
// Check if already defined
if (!window.GiftCertificateManager) {

class GiftCertificateManager {
    constructor() {
        this.db = null;
        this.certificates = [];
        this.currentFilter = 'all';
        // Don't call init() in constructor - it's async
    }

    async init() {
        try {
            console.log('Initializing Gift Certificate Manager...');
            this.db = await this.openDatabase();
            await this.createTables();
            await this.loadCertificates();
            // Setup immediately, no delay needed
            this.setupEventListeners();
            this.updateDashboard();
            console.log('✅ Gift Certificate Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Gift Certificate Manager:', error);
        }
    }

    openDatabase() {
        // Use the main app database instead of separate database
        return window.db;
    }

    async createTables() {
        // Tables are created by main app database initialization
        // Gift certificates will use the main 'products' table with type: 'gift_certificate'
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
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                fontFamily: 'Playfair Display, serif',
                borderStyle: '8px double rgba(255,215,0,0.8)',
                pattern: 'url("data:image/svg+xml,%3Csvg width="60" height="60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23FFD700" fill-opacity="0.15"%3E%3Cpath d="M30 0l30 30-30 30-30-30z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                decorativeCorners: true,
                shadowEffect: '0 15px 35px rgba(26, 26, 46, 0.6)',
                textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
                accentColor: '#FFD700',
                titleColor: '#FFFFFF',
                textColor: 'rgba(255,255,255,0.95)'
            },
            {
                template: 'modern',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #8e44ad 100%)',
                fontFamily: 'Inter, sans-serif',
                borderStyle: '4px solid rgba(255,255,255,0.7)',
                pattern: 'url("data:image/svg+xml,%3Csvg width="80" height="80" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23FFFFFF" fill-opacity="0.12"%3E%3Ccircle cx="40" cy="40" r="20"/%3E%3Ccircle cx="0" cy="0" r="20"/%3E%3Ccircle cx="80" cy="80" r="20"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                decorativeCorners: false,
                shadowEffect: '0 20px 40px rgba(102, 126, 234, 0.4)',
                textShadow: '2px 2px 6px rgba(0,0,0,0.6)',
                accentColor: '#FFFFFF',
                titleColor: '#FFFFFF',
                textColor: 'rgba(255,255,255,0.95)'
            },
            {
                template: 'luxury',
                background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
                fontFamily: 'Cinzel, serif',
                borderStyle: '6px ridge #FFD700',
                pattern: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23FFD700" fill-opacity="0.12"%3E%3Cpath d="M50 0l25 25-25 25-25-25z M0 50l25 25-25 25-25-25z M100 50l25 25-25 25-25-25z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                decorativeCorners: true,
                shadowEffect: '0 25px 50px rgba(15, 12, 41, 0.8)',
                textShadow: '3px 3px 8px rgba(0,0,0,0.8)',
                accentColor: '#FFD700',
                luxuryFrame: true,
                titleColor: '#FFD700',
                textColor: 'rgba(255,255,255,0.95)'
            },
            {
                template: 'festive',
                background: 'linear-gradient(135deg, #e74c3c 0%, #f39c12 50%, #e67e22 100%)',
                fontFamily: 'Dancing Script, cursive',
                borderStyle: '5px dashed rgba(255,255,255,0.9)',
                pattern: 'url("data:image/svg+xml,%3Csvg width="50" height="50" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23FFFFFF" fill-opacity="0.2"%3E%3Ccircle cx="25" cy="25" r="8"/%3E%3Ccircle cx="0" cy="0" r="4"/%3E%3Ccircle cx="50" cy="50" r="4"/%3E%3Cpath d="M12 35l6 6 6-6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                decorativeCorners: false,
                shadowEffect: '0 15px 30px rgba(231, 76, 60, 0.5)',
                textShadow: '3px 3px 6px rgba(0,0,0,0.7)',
                accentColor: '#FFFFFF',
                celebrationTheme: true,
                titleColor: '#FFFFFF',
                textColor: 'rgba(255,255,255,0.95)'
            },
            {
                template: 'professional',
                background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
                fontFamily: 'Roboto, sans-serif',
                borderStyle: '3px solid rgba(52, 152, 219, 0.8)',
                pattern: 'url("data:image/svg+xml,%3Csvg width="120" height="120" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%233498db" fill-opacity="0.08"%3E%3Cpath d="M0 0h60v60H0zM60 60h60v60H60z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                decorativeCorners: false,
                shadowEffect: '0 12px 24px rgba(44, 62, 80, 0.5)',
                textShadow: '2px 2px 5px rgba(0,0,0,0.7)',
                accentColor: '#3498db',
                titleColor: '#FFFFFF',
                textColor: 'rgba(255,255,255,0.95)'
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
            id: Date.now(), // Add ID for main database
            controlNumber: this.generateControlNumber(),
            recipientName: data.recipientName,
            recipientEmail: data.recipientEmail || '',
            value: parseFloat(data.value),
            occasion: data.occasion || 'General',
            message: data.personalMessage || '', // Use personalMessage from form
            status: 'active',
            createdDate: new Date().toISOString(),
            expiryDate: data.expiryDate || this.calculateExpiryDate(data.validityDays || 365),
            issuedBy: localStorage.getItem('userName') || 'System',
            design: await this.generateAIDesign(data),
            usageHistory: [],
            remainingValue: parseFloat(data.value),
            type: 'gift_certificate' // Add type for main database
        };

        try {
            // Use main app database add method
            await window.db.add('products', certificate);
            this.certificates.push(certificate);
            this.updateDashboard();
            this.renderCertificatesList();
            return certificate;
        } catch (error) {
            console.error('Error creating certificate:', error);
            throw error;
        }
    }

    calculateExpiryDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
    }

    async loadCertificates() {
        try {
            // Load gift certificates from main database
            const allProducts = await window.db.getAll('products');
            this.certificates = allProducts.filter(item => item.type === 'gift_certificate');
            this.checkExpiredCertificates();
            return this.certificates;
        } catch (error) {
            console.error('Error loading certificates:', error);
            this.certificates = [];
            return [];
        }
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
            const transaction = window.db.transaction(['certificates'], 'readwrite');
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
            const transaction = window.db.transaction(['certificates'], 'readwrite');
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
                <div class="certificate-preview" style="
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                    background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23FFD700&quot; fill-opacity=&quot;0.15&quot;%3E%3Cpath d=&quot;M30 0l30 30-30 30-30-30z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');
                    box-shadow: 0 15px 35px rgba(26, 26, 46, 0.6);
                    border: 4px double rgba(255,215,0,0.8);
                    position: relative;
                ">
                    <div class="decorative-corner top-left" style="
                        position: absolute;
                        top: 8px;
                        left: 8px;
                        width: 25px;
                        height: 25px;
                        background: linear-gradient(45deg, rgba(255,215,0,0.6), transparent);
                        clip-path: polygon(0 0, 100% 0, 0 100%);
                        z-index: 2;
                    "></div>
                    <div class="decorative-corner top-right" style="
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        width: 25px;
                        height: 25px;
                        background: linear-gradient(-45deg, rgba(255,215,0,0.6), transparent);
                        clip-path: polygon(100% 0, 100% 100%, 0 0);
                        z-index: 2;
                    "></div>
                    <div class="decorative-corner bottom-left" style="
                        position: absolute;
                        bottom: 8px;
                        left: 8px;
                        width: 25px;
                        height: 25px;
                        background: linear-gradient(135deg, rgba(255,215,0,0.6), transparent);
                        clip-path: polygon(0 0, 100% 100%, 0 100%);
                        z-index: 2;
                    "></div>
                    <div class="decorative-corner bottom-right" style="
                        position: absolute;
                        bottom: 8px;
                        right: 8px;
                        width: 25px;
                        height: 25px;
                        background: linear-gradient(-135deg, rgba(255,215,0,0.6), transparent);
                        clip-path: polygon(100% 0, 100% 100%, 0 100%);
                        z-index: 2;
                    "></div>
                    <div class="certificate-header">
                        <h4 style="
                            color: #FFFFFF;
                            text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
                            font-weight: 300;
                            letter-spacing: 2px;
                        ">GIFT CERTIFICATE</h4>
                        <span class="control-number" style="
                            color: #FFD700;
                            text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
                            font-weight: 600;
                        ">${cert.controlNumber}</span>
                    </div>
                    <div class="certificate-value" style="
                        color: #FFD700;
                        text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
                        font-weight: 700;
                    ">₱${cert.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                    <div class="certificate-recipient" style="
                        color: rgba(255,255,255,0.95);
                        text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
                    ">${cert.recipientName}</div>
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
                        <button class="btn-view" data-action="view" data-cert-id="${cert.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn-print" data-action="print" data-cert-id="${cert.id}">
                            <i class="fas fa-print"></i> Print
                        </button>
                        ${cert.status === 'active' ? `
                            <button class="btn-redeem" data-action="redeem" data-control-number="${cert.controlNumber}">
                                <i class="fas fa-check-circle"></i> Redeem
                            </button>
                        ` : ''}
                        <button class="btn-delete" data-action="delete" data-cert-id="${cert.id}" style="
                            background: #e74c3c;
                            color: white;
                            flex: 1;
                            padding: 8px 12px;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                            font-weight: 500;
                            transition: all 0.2s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 4px;
                        ">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    generateCertificateHTML(certificate, isPrint = false) {
        // Use the elegant design for all certificates to ensure consistency
        const elegantDesign = {
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            pattern: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23FFD700\\" fill-opacity=\\"0.15\\"%3E%3Cpath d=\\"M30 0l30 30-30 30-30-30z\\"/\\%3E%3C/g\\%3E%3C/g\\%3E%3C/svg\\%3E")',
            borderStyle: '8px double rgba(255,215,0,0.8)',
            shadowEffect: '0 15px 35px rgba(26, 26, 46, 0.6)',
            textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
            accentColor: '#FFD700',
            titleColor: '#FFFFFF',
            textColor: 'rgba(255,255,255,0.95)',
            decorativeCorners: true,
            luxuryFrame: false
        };

        const containerClass = isPrint ? 'certificate' : 'certificate-full-preview';
        const cornerSize = isPrint ? '60px' : '40px';
        const cornerOffset = isPrint ? '0px' : '20px';
        
        return `
            <div class="${containerClass}" style="
                background: ${elegantDesign.background};
                background-image: ${elegantDesign.pattern};
                ${isPrint ? `
                    width: 900px;
                    height: 600px;
                    padding: 50px;
                    border-radius: 15px;
                    overflow: hidden;
                ` : `
                    padding: 40px;
                    border-radius: 15px;
                    overflow: hidden;
                `}
                box-shadow: ${elegantDesign.shadowEffect};
                position: relative;
                font-family: 'Playfair Display', serif;
            ">
                <div class="decorative-corner top-left" style="
                    position: absolute;
                    top: ${cornerOffset};
                    left: ${cornerOffset};
                    width: ${cornerSize};
                    height: ${cornerSize};
                    background: linear-gradient(45deg, ${elegantDesign.accentColor}60, transparent);
                    clip-path: polygon(0 0, 100% 0, 0 100%);
                    z-index: 2;
                "></div>
                <div class="decorative-corner top-right" style="
                    position: absolute;
                    top: ${cornerOffset};
                    right: ${cornerOffset};
                    width: ${cornerSize};
                    height: ${cornerSize};
                    background: linear-gradient(-45deg, ${elegantDesign.accentColor}60, transparent);
                    clip-path: polygon(100% 0, 100% 100%, 0 0);
                    z-index: 2;
                "></div>
                <div class="decorative-corner bottom-left" style="
                    position: absolute;
                    bottom: ${cornerOffset};
                    left: ${cornerOffset};
                    width: ${cornerSize};
                    height: ${cornerSize};
                    background: linear-gradient(135deg, ${elegantDesign.accentColor}60, transparent);
                    clip-path: polygon(0 0, 100% 100%, 0 100%);
                    z-index: 2;
                "></div>
                <div class="decorative-corner bottom-right" style="
                    position: absolute;
                    bottom: ${cornerOffset};
                    right: ${cornerOffset};
                    width: ${cornerSize};
                    height: ${cornerSize};
                    background: linear-gradient(-135deg, ${elegantDesign.accentColor}60, transparent);
                    clip-path: polygon(100% 0, 100% 100%, 0 100%);
                    z-index: 2;
                "></div>
                <div class="certificate-border" style="
                    border: ${elegantDesign.borderStyle};
                    height: 100%;
                    padding: 40px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                    border-radius: 10px;
                ">
                    <div class="certificate-header">
                        <h1 style="
                            color: ${elegantDesign.titleColor};
                            font-size: 48px;
                            margin-bottom: 15px;
                            text-shadow: ${elegantDesign.textShadow};
                            letter-spacing: 6px;
                            font-weight: 300;
                        ">GIFT CERTIFICATE</h1>
                        <div class="control-number" style="
                            color: ${elegantDesign.accentColor};
                            font-size: 18px;
                            font-weight: 600;
                            letter-spacing: 3px;
                            margin-bottom: 30px;
                            text-shadow: ${elegantDesign.textShadow};
                        ">${certificate.controlNumber}</div>
                    </div>
                    
                    <div class="recipient-section">
                        <p style="
                            color: ${elegantDesign.textColor};
                            font-size: 20px;
                            margin-bottom: 15px;
                            font-style: italic;
                            text-shadow: ${elegantDesign.textShadow};
                        ">This certificate is presented to</p>
                        <h2 style="
                            color: ${elegantDesign.accentColor};
                            font-size: 36px;
                            margin: 15px 0;
                            text-shadow: ${elegantDesign.textShadow};
                            font-weight: 400;
                            text-decoration: underline;
                            text-decoration-color: rgba(255,255,255,0.5);
                        ">${certificate.recipientName}</h2>
                    </div>
                    
                    <div class="value-section">
                        <p style="
                            color: ${elegantDesign.textColor};
                            font-size: 20px;
                            margin-bottom: 20px;
                            font-style: italic;
                            text-shadow: ${elegantDesign.textShadow};
                        ">In the amount of</p>
                        <h1 style="
                            color: ${elegantDesign.accentColor};
                            font-size: 64px;
                            margin: 25px 0;
                            text-shadow: ${elegantDesign.textShadow};
                            font-weight: 700;
                            letter-spacing: 3px;
                        ">₱${certificate.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</h1>
                    </div>
                    
                    ${certificate.message ? `
                        <div class="message-section" style="
                            margin: 30px 0;
                            padding: 20px;
                            background: rgba(0,0,0,0.3);
                            border-radius: 12px;
                            border: 1px solid rgba(255,255,255,0.3);
                        ">
                            <p style="
                                color: ${elegantDesign.textColor};
                                font-size: 18px;
                                font-style: italic;
                                line-height: 1.6;
                                text-shadow: ${elegantDesign.textShadow};
                            ">"${certificate.message}"</p>
                        </div>
                    ` : ''}
                    
                    <div class="footer">
                        <p style="
                            color: ${elegantDesign.textColor};
                            font-size: 16px;
                            text-shadow: ${elegantDesign.textShadow};
                        ">Valid until ${new Date(certificate.expiryDate).toLocaleDateString()}</p>
                        <p style="
                            color: ${elegantDesign.textColor};
                            font-size: 16px;
                            text-shadow: ${elegantDesign.textShadow};
                        ">Issued by ${certificate.issuedBy}</p>
                    </div>
                </div>
            </div>
        `;
    }

    viewCertificate(id) {
        const certificate = this.certificates.find(c => c.id == id);
        if (!certificate) return;

        const modal = document.createElement('div');
        modal.className = 'modal gc-modal active';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Gift Certificate Details</h2>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-body">
                    ${this.generateCertificateHTML(certificate, false)}
                    
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
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;700&display=swap" rel="stylesheet">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: #f0f0f0;
                        padding: 20px;
                    }
                    .footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 25px 0;
                        border-top: 2px solid rgba(255,255,255,0.5);
                        margin-top: 20px;
                    }
                    @media print {
                        body {
                            background: white;
                            padding: 0;
                        }
                        .certificate {
                            box-shadow: none;
                            width: 100%;
                            height: 100vh;
                        }
                    }
                </style>
            </head>
            <body>
                ${this.generateCertificateHTML(certificate, true)}
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
        modal.className = 'modal gc-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Redeem Gift Certificate</h2>
                    <button class="close-modal">×</button>
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
                        <button class="btn-primary" data-action="process-redemption">
                            Redeem
                        </button>
                        <button class="btn-secondary" data-action="close-modal">
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
        console.log('Setting up Gift Certificate event listeners...');
        
        // Prevent multiple event listeners - check if already attached
        if (window.gcEventListenerAttached) {
            console.log('Event listeners already attached, skipping...');
            return;
        }
        
        const self = this; // Store reference to this
        
        // Mark as attached
        window.gcEventListenerAttached = true;
        
        // Use document-level event delegation for reliability
        document.addEventListener('click', function(e) {
            // Handle clicks within gift certificates area OR within gc-modal
            if (!e.target.closest('#gift-certificates') && !e.target.closest('.gc-modal')) return;
            console.log('Click detected in gift certificates container');
            console.log('Clicked element:', e.target);
            console.log('Clicked element tag:', e.target.tagName);
            console.log('Clicked element classes:', e.target.className);
            
            // Check if we clicked on a button or its child (like icon)
            let target = e.target;
            if (target.tagName === 'I' || target.tagName === 'SPAN') {
                target = target.closest('button');
            }
            
            if (!target || target.tagName !== 'BUTTON') {
                console.log('Not a button click, ignoring');
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            // Handle filter buttons
            if (target.classList.contains('filter-btn')) {
                console.log('Filter button clicked:', target.dataset.filter);
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                self.currentFilter = target.dataset.filter;
                self.renderCertificatesList();
                return;
            }
            
            // Handle action buttons by ID or data-action
            const buttonId = target.id;
            const action = target.dataset.action;
            console.log('Button clicked with ID:', buttonId, 'Action:', action);
            
            // Handle main buttons by ID
            switch(buttonId) {
                case 'create-certificate-btn':
                    console.log('Opening create modal...');
                    self.showCreateModal();
                    break;
                case 'validate-certificate-btn':
                    console.log('Opening validate modal...');
                    self.showValidateModal();
                    break;
                case 'export-certificates-btn':
                    console.log('Exporting certificates...');
                    self.exportCertificates();
                    break;
                case 'perform-validation-btn':
                    console.log('Performing validation...');
                    self.performValidation();
                    break;
                default:
                    // Handle data-action buttons
                    switch(action) {
                        case 'view':
                            const certId = target.dataset.certId;
                            console.log('Viewing certificate:', certId);
                            self.viewCertificate(certId);
                            break;
                        case 'print':
                            const printCertId = target.dataset.certId;
                            console.log('Printing certificate:', printCertId);
                            self.printCertificate(printCertId);
                            break;
                        case 'redeem':
                            const controlNumber = target.dataset.controlNumber;
                            console.log('Redeeming certificate:', controlNumber);
                            self.showRedeemModal(controlNumber);
                            break;
                        case 'delete':
                            const deleteCertId = target.dataset.certId;
                            console.log('Deleting certificate:', deleteCertId);
                            self.showDeleteConfirmation(deleteCertId);
                            break;
                        case 'confirm-delete':
                            const confirmDeleteId = target.dataset.certId;
                            console.log('Confirming deletion of certificate:', confirmDeleteId);
                            self.deleteCertificate(confirmDeleteId).then(() => {
                                const modal = target.closest('.modal');
                                if (modal) modal.remove();
                                alert('Certificate deleted successfully!');
                            }).catch(error => {
                                alert('Failed to delete certificate: ' + error.message);
                            });
                            break;
                        case 'process-redemption':
                            console.log('Processing redemption...');
                            self.processRedemption();
                            break;
                        case 'close-modal':
                            console.log('Closing modal...');
                            const modal = target.closest('.modal');
                            if (modal) modal.remove();
                            break;
                        default:
                            console.log('Unknown action:', action);
                    }
            }
            
            // Handle close modal buttons
            if (target.classList.contains('close-modal')) {
                console.log('Closing modal via close button...');
                const modal = target.closest('.modal');
                if (modal) modal.remove();
            }
            
            // Handle form submissions
            if (target.type === 'submit' && target.closest('form')) {
                const form = target.closest('form');
                if (form.id === 'create-certificate-form') {
                    console.log('Processing certificate creation...');
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData);
                    
                    self.createCertificate(data).then(certificate => {
                        alert(`Gift Certificate created successfully! Control Number: ${certificate.controlNumber}`);
                        const modal = target.closest('.modal');
                        if (modal) modal.remove();
                        self.viewCertificate(certificate.id);
                    }).catch(error => {
                        alert('Failed to create certificate: ' + error.message);
                    });
                }
            }
        });
        
        console.log('Event delegation setup complete on container');
    }

    showCreateModal() {
        console.log('Opening create certificate modal');
        const modal = document.createElement('div');
        modal.className = 'modal gc-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create Gift Certificate</h2>
                    <button class="close-modal">×</button>
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
                            <button type="button" class="btn-secondary" data-action="close-modal">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showValidateModal() {
        console.log('Opening validate certificate modal');
        const modal = document.createElement('div');
        modal.className = 'modal gc-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Validate Gift Certificate</h2>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Control Number</label>
                        <input type="text" id="validate-control-number" placeholder="Enter control number">
                    </div>
                    <div id="validation-result"></div>
                    <div class="form-actions">
                        <button class="btn-primary" id="perform-validation-btn">
                            Validate
                        </button>
                        <button class="btn-secondary" id="close-validate-btn">
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

    showDeleteConfirmation(certificateId) {
        const certificate = this.certificates.find(c => c.id == certificateId);
        if (!certificate) return;

        const modal = document.createElement('div');
        modal.className = 'modal gc-modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Delete Gift Certificate</h2>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-error" style="margin-bottom: 20px;">
                        <h4>⚠️ Confirm Deletion</h4>
                        <p>Are you sure you want to delete this gift certificate?</p>
                    </div>
                    <div class="certificate-summary">
                        <p><strong>Control Number:</strong> ${certificate.controlNumber}</p>
                        <p><strong>Recipient:</strong> ${certificate.recipientName}</p>
                        <p><strong>Value:</strong> ₱${certificate.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                        <p><strong>Status:</strong> ${certificate.status.toUpperCase()}</p>
                    </div>
                    <p style="color: #721c24; font-weight: bold; margin-top: 15px;">
                        This action cannot be undone!
                    </p>
                    <div class="form-actions">
                        <button class="btn-primary" data-action="confirm-delete" data-cert-id="${certificateId}" style="
                            background: #e74c3c;
                            border-color: #e74c3c;
                        ">
                            <i class="fas fa-trash"></i> Delete Certificate
                        </button>
                        <button class="btn-secondary" data-action="close-modal">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async deleteCertificate(certificateId) {
        try {
            // Remove from database
            await window.db.delete('products', parseInt(certificateId));
            
            // Remove from local array
            this.certificates = this.certificates.filter(c => c.id != certificateId);
            
            // Update UI
            this.updateDashboard();
            this.renderCertificatesList();
            
            console.log('Certificate deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting certificate:', error);
            throw error;
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

// Export for use in other modules
window.GiftCertificateManager = GiftCertificateManager;

} // End of if statement preventing duplicate declaration

// Initialize the manager when the page loads
window.loadGiftCertificates = window.loadGiftCertificates || async function() {
    console.log('Loading Gift Certificates...');
    try {
        // Check if class exists
        if (!window.GiftCertificateManager) {
            console.error('GiftCertificateManager class not defined!');
            return;
        }
        
        // Destroy old instance if exists
        if (window.giftCertificateManager) {
            console.log('Destroying old Gift Certificate Manager instance');
            // Reset event listener flag to allow reattachment
            window.gcEventListenerAttached = false;
            window.giftCertificateManager = null;
        }
        
        // Create new instance
        window.giftCertificateManager = new window.GiftCertificateManager();
        console.log('Gift Certificate Manager created and attached to window');
        
        // Initialize the manager (now done after construction)
        await window.giftCertificateManager.init();
        console.log('Gift Certificate Manager initialized');
        
        // Verify methods exist
        const requiredMethods = ['showCreateModal', 'showValidateModal', 'exportCertificates', 'renderCertificatesList'];
        const missingMethods = requiredMethods.filter(method => 
            typeof window.giftCertificateManager[method] !== 'function'
        );
        
        if (missingMethods.length > 0) {
            console.error('Missing methods on manager:', missingMethods);
        } else {
            console.log('✅ All required methods available');
            
            // Make methods globally accessible as fallback
            window.showGCCreateModal = () => window.giftCertificateManager.showCreateModal();
            window.showGCValidateModal = () => window.giftCertificateManager.showValidateModal();
            window.exportGCCertificates = () => window.giftCertificateManager.exportCertificates();
            
            console.log('Global helper functions created');
        }
    } catch (error) {
        console.error('Error creating Gift Certificate Manager:', error);
    }
};

// Gift Certificate System Ready