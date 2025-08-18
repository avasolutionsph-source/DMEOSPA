// Cookie Consent Banner - Philippines DPA Compliant
class CookieConsent {
    constructor() {
        this.consentKey = 'ava_cookie_consent';
        this.analyticsKey = 'ava_analytics_consent';
        this.marketingKey = 'ava_marketing_consent';
        this.hasShown = false;
    }

    init() {
        // Check if consent already given
        const consent = localStorage.getItem(this.consentKey);
        if (!consent) {
            this.showBanner();
        } else {
            this.applyConsent(JSON.parse(consent));
        }
    }

    showBanner() {
        if (this.hasShown) return;
        this.hasShown = true;

        const banner = document.createElement('div');
        banner.id = 'cookieBanner';
        banner.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(30, 58, 138, 0.98);
            color: white;
            padding: 1.5rem;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border-top: 3px solid var(--accent, #f97316);
            box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
        `;

        banner.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">
                        <i class="fas fa-cookie-bite" style="margin-right: 0.5rem; color: var(--accent, #f97316);"></i>
                        Cookie Preferences
                    </h3>
                    <p style="margin: 0; font-size: 0.9rem; opacity: 0.9; line-height: 1.4;">
                        We use cookies to enhance your experience. Essential cookies are required for core functionality. 
                        Analytics and marketing cookies require your consent under the Data Privacy Act.
                    </p>
                </div>
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <button onclick="cookieConsent.showPreferences()" 
                            style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                        <i class="fas fa-cog"></i> Preferences
                    </button>
                    <button onclick="cookieConsent.acceptEssential()" 
                            style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                        Essential Only
                    </button>
                    <button onclick="cookieConsent.acceptAll()" 
                            style="background: var(--accent, #f97316); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
                        <i class="fas fa-check"></i> Accept All
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
    }

    showPreferences() {
        const modal = document.createElement('div');
        modal.className = 'cookie-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 1rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
                <div style="padding: 2rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="margin: 0; color: var(--primary, #1e3a8a);">
                        <i class="fas fa-shield-alt" style="margin-right: 0.5rem;"></i>
                        Cookie Preferences
                    </h2>
                </div>
                <div style="padding: 2rem;">
                    <div style="margin-bottom: 2rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <h3 style="margin: 0; color: #374151;">Essential Cookies</h3>
                            <span style="background: #10b981; color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem;">Required</span>
                        </div>
                        <p style="color: #6b7280; margin: 0; font-size: 0.9rem;">
                            Required for the website to function properly. These cookies enable core functionality like authentication, security, and accessibility.
                        </p>
                    </div>

                    <div style="margin-bottom: 2rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <h3 style="margin: 0; color: #374151;">Analytics Cookies</h3>
                            <label style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                <input type="checkbox" id="analyticsToggle" style="opacity: 0; width: 0; height: 0;">
                                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                            </label>
                        </div>
                        <p style="color: #6b7280; margin: 0; font-size: 0.9rem;">
                            Help us understand how you use our website to improve performance and user experience. No personal data is shared with third parties.
                        </p>
                    </div>

                    <div style="margin-bottom: 2rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <h3 style="margin: 0; color: #374151;">Marketing Cookies</h3>
                            <label style="position: relative; display: inline-block; width: 50px; height: 24px;">
                                <input type="checkbox" id="marketingToggle" style="opacity: 0; width: 0; height: 0;">
                                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;"></span>
                                <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                            </label>
                        </div>
                        <p style="color: #6b7280; margin: 0; font-size: 0.9rem;">
                            Allow us to show you relevant content and advertisements. You can withdraw consent at any time in your account settings.
                        </p>
                    </div>
                </div>
                <div style="padding: 1.5rem 2rem; border-top: 1px solid #e5e7eb; display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="cookieConsent.closePreferences()" 
                            style="background: #f3f4f6; color: #374151; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer;">
                        Cancel
                    </button>
                    <button onclick="cookieConsent.savePreferences()" 
                            style="background: var(--primary, #1e3a8a); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">
                        Save Preferences
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Style the toggles
        const style = document.createElement('style');
        style.textContent = `
            #analyticsToggle:checked + span { background-color: var(--primary, #1e3a8a); }
            #analyticsToggle:checked + span + span { transform: translateX(26px); }
            #marketingToggle:checked + span { background-color: var(--primary, #1e3a8a); }
            #marketingToggle:checked + span + span { transform: translateX(26px); }
        `;
        document.head.appendChild(style);

        // Load current preferences
        const analytics = localStorage.getItem(this.analyticsKey) === 'true';
        const marketing = localStorage.getItem(this.marketingKey) === 'true';
        document.getElementById('analyticsToggle').checked = analytics;
        document.getElementById('marketingToggle').checked = marketing;
    }

    closePreferences() {
        const modal = document.querySelector('.cookie-modal');
        if (modal) modal.remove();
    }

    savePreferences() {
        const analytics = document.getElementById('analyticsToggle').checked;
        const marketing = document.getElementById('marketingToggle').checked;

        const consent = {
            essential: true,
            analytics: analytics,
            marketing: marketing,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(this.consentKey, JSON.stringify(consent));
        localStorage.setItem(this.analyticsKey, analytics.toString());
        localStorage.setItem(this.marketingKey, marketing.toString());

        this.applyConsent(consent);
        this.hideBanner();
        this.closePreferences();

        // Show confirmation
        this.showToast('Cookie preferences saved successfully', 'success');
    }

    acceptAll() {
        const consent = {
            essential: true,
            analytics: true,
            marketing: true,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(this.consentKey, JSON.stringify(consent));
        localStorage.setItem(this.analyticsKey, 'true');
        localStorage.setItem(this.marketingKey, 'true');

        this.applyConsent(consent);
        this.hideBanner();
        this.showToast('All cookies accepted', 'success');
    }

    acceptEssential() {
        const consent = {
            essential: true,
            analytics: false,
            marketing: false,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(this.consentKey, JSON.stringify(consent));
        localStorage.setItem(this.analyticsKey, 'false');
        localStorage.setItem(this.marketingKey, 'false');

        this.applyConsent(consent);
        this.hideBanner();
        this.showToast('Essential cookies only', 'info');
    }

    applyConsent(consent) {
        // Enable/disable analytics based on consent
        if (consent.analytics) {
            this.enableAnalytics();
        } else {
            this.disableAnalytics();
        }

        // Enable/disable marketing tracking
        if (consent.marketing) {
            this.enableMarketing();
        } else {
            this.disableMarketing();
        }
    }

    enableAnalytics() {
        // Add your analytics code here (Google Analytics, etc.)
        console.log('Analytics enabled');
        
        // Example: Google Analytics
        // gtag('consent', 'update', {
        //     analytics_storage: 'granted'
        // });
    }

    disableAnalytics() {
        console.log('Analytics disabled');
        
        // Example: Google Analytics
        // gtag('consent', 'update', {
        //     analytics_storage: 'denied'
        // });
    }

    enableMarketing() {
        console.log('Marketing cookies enabled');
        
        // Example: Facebook Pixel, Google Ads
        // gtag('consent', 'update', {
        //     ad_storage: 'granted'
        // });
    }

    disableMarketing() {
        console.log('Marketing cookies disabled');
        
        // Example: Facebook Pixel, Google Ads
        // gtag('consent', 'update', {
        //     ad_storage: 'denied'
        // });
    }

    hideBanner() {
        const banner = document.getElementById('cookieBanner');
        if (banner) {
            banner.style.transform = 'translateY(100%)';
            setTimeout(() => banner.remove(), 300);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10002;
            transform: translateX(400px);
            transition: transform 0.3s ease-out;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => toast.style.transform = 'translateX(0)', 100);

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Public method to revoke consent
    revokeConsent() {
        localStorage.removeItem(this.consentKey);
        localStorage.removeItem(this.analyticsKey);
        localStorage.removeItem(this.marketingKey);
        
        this.disableAnalytics();
        this.disableMarketing();
        
        this.showToast('All cookie consent revoked', 'info');
        
        // Show banner again
        setTimeout(() => {
            this.hasShown = false;
            this.showBanner();
        }, 1000);
    }

    // Get current consent status
    getConsent() {
        const consent = localStorage.getItem(this.consentKey);
        return consent ? JSON.parse(consent) : null;
    }
}

// Initialize on page load
const cookieConsent = new CookieConsent();
document.addEventListener('DOMContentLoaded', () => {
    cookieConsent.init();
});

// Expose globally for settings page
window.cookieConsent = cookieConsent;
