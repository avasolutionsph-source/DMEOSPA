// Cookie Consent Management System - Philippines Compliant
// Complies with Data Privacy Act of 2012 (RA 10173)

(function() {
    'use strict';

    // Check if consent has already been given
    function hasConsent() {
        return localStorage.getItem('cookieConsent') || getCookie('cookie_consent');
    }

    // Get cookie by name
    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    }

    // Set cookie
    function setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }

    // Create consent banner HTML
    function createConsentBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookieConsentBanner';
        banner.innerHTML = `
            <style>
                #cookieConsentBanner {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
                    color: white;
                    padding: 20px;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                    z-index: 9999;
                    font-family: 'Inter', sans-serif;
                    animation: slideUp 0.3s ease-out;
                }
                
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                
                .consent-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 20px;
                }
                
                .consent-text {
                    flex: 1;
                    min-width: 300px;
                }
                
                .consent-text h3 {
                    margin: 0 0 10px 0;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .consent-text p {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #e2e8f0;
                }
                
                .consent-links {
                    display: flex;
                    gap: 15px;
                    margin-top: 5px;
                }
                
                .consent-links a {
                    color: #90cdf4;
                    text-decoration: none;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .consent-links a:hover {
                    color: #63b3ed;
                    text-decoration: underline;
                }
                
                .consent-buttons {
                    display: flex;
                    gap: 15px;
                    flex-wrap: wrap;
                }
                
                .consent-btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .btn-accept-all {
                    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                    color: white;
                }
                
                .btn-accept-all:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
                }
                
                .btn-customize {
                    background: transparent;
                    color: white;
                    border: 2px solid #4a5568;
                }
                
                .btn-customize:hover {
                    background: #4a5568;
                }
                
                .btn-reject {
                    background: #4a5568;
                    color: white;
                }
                
                .btn-reject:hover {
                    background: #2d3748;
                }
                
                .philippines-flag {
                    width: 20px;
                    height: 15px;
                    display: inline-block;
                    margin-right: 5px;
                }
                
                .npc-badge {
                    display: inline-flex;
                    align-items: center;
                    background: rgba(255,255,255,0.1);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-left: 10px;
                }
                
                @media (max-width: 768px) {
                    .consent-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    
                    .consent-buttons {
                        width: 100%;
                    }
                    
                    .consent-btn {
                        flex: 1;
                        justify-content: center;
                    }
                }
            </style>
            
            <div class="consent-container">
                <div class="consent-text">
                    <h3>
                        <i class="fas fa-cookie-bite"></i>
                        We value your privacy
                        <span class="npc-badge">RA 10173 Compliant</span>
                    </h3>
                    <p>
                        In compliance with the Philippine Data Privacy Act of 2012, we use cookies to enhance your browsing experience, 
                        analyze site traffic, and personalize content. Your data is protected according to Philippine law.
                    </p>
                    <div class="consent-links">
                        <a href="/privacy-policy" target="_blank">
                            <i class="fas fa-shield-alt"></i> Privacy Policy
                        </a>
                        <a href="/cookie-policy" target="_blank">
                            <i class="fas fa-info-circle"></i> Cookie Policy
                        </a>
                        <a href="/terms" target="_blank">
                            <i class="fas fa-file-contract"></i> Terms
                        </a>
                    </div>
                </div>
                
                <div class="consent-buttons">
                    <button class="consent-btn btn-customize" onclick="customizeCookies()">
                        <i class="fas fa-cog"></i> Customize
                    </button>
                    <button class="consent-btn btn-reject" onclick="rejectCookies()">
                        <i class="fas fa-times"></i> Reject All
                    </button>
                    <button class="consent-btn btn-accept-all" onclick="acceptAllCookies()">
                        <i class="fas fa-check"></i> Accept All
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
    }

    // Create customization modal
    function createCustomizationModal() {
        const modal = document.createElement('div');
        modal.id = 'cookieCustomizeModal';
        modal.innerHTML = `
            <style>
                #cookieCustomizeModal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                
                #cookieCustomizeModal.show {
                    display: flex;
                }
                
                .customize-content {
                    background: white;
                    border-radius: 12px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    padding: 30px;
                }
                
                .customize-header {
                    margin-bottom: 20px;
                }
                
                .customize-header h2 {
                    margin: 0 0 10px 0;
                    color: #1a202c;
                }
                
                .cookie-category {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 15px;
                }
                
                .category-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .category-title {
                    font-weight: 600;
                    color: #2d3748;
                }
                
                .category-description {
                    color: #718096;
                    font-size: 14px;
                    line-height: 1.5;
                }
                
                .switch {
                    position: relative;
                    width: 50px;
                    height: 24px;
                }
                
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e0;
                    transition: .4s;
                    border-radius: 24px;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .slider {
                    background-color: #48bb78;
                }
                
                input:checked + .slider:before {
                    transform: translateX(26px);
                }
                
                input:disabled + .slider {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .modal-buttons {
                    display: flex;
                    gap: 15px;
                    margin-top: 25px;
                    justify-content: flex-end;
                }
            </style>
            
            <div class="customize-content">
                <div class="customize-header">
                    <h2>Cookie Preferences</h2>
                    <p style="color: #718096;">Manage your cookie settings in compliance with Philippine Data Privacy Act</p>
                </div>
                
                <div class="cookie-category">
                    <div class="category-header">
                        <div>
                            <div class="category-title">Strictly Necessary</div>
                            <div class="category-description">
                                Essential cookies required for the website to function. These cannot be disabled.
                            </div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" checked disabled>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="cookie-category">
                    <div class="category-header">
                        <div>
                            <div class="category-title">Functional Cookies</div>
                            <div class="category-description">
                                Enable enhanced functionality like remembering your preferences and settings.
                            </div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="functionalCookies" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="cookie-category">
                    <div class="category-header">
                        <div>
                            <div class="category-title">Analytics Cookies</div>
                            <div class="category-description">
                                Help us understand how you use our website to improve your experience.
                            </div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="analyticsCookies">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="cookie-category">
                    <div class="category-header">
                        <div>
                            <div class="category-title">Marketing Cookies</div>
                            <div class="category-description">
                                Used to deliver personalized advertisements relevant to your interests.
                            </div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="marketingCookies">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="modal-buttons">
                    <button class="consent-btn btn-customize" onclick="closeCustomization()">
                        Cancel
                    </button>
                    <button class="consent-btn btn-accept-all" onclick="savePreferences()">
                        Save Preferences
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Global functions
    window.acceptAllCookies = function() {
        const consent = {
            necessary: true,
            functional: true,
            analytics: true,
            marketing: true,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('cookieConsent', JSON.stringify(consent));
        setCookie('cookie_consent', JSON.stringify(consent), 365);
        
        // Enable all tracking
        enableTracking(consent);
        
        // Hide banner
        document.getElementById('cookieConsentBanner').style.display = 'none';
        
        // Log consent for compliance
        logConsent(consent, 'accept-all');
    };

    window.rejectCookies = function() {
        const consent = {
            necessary: true,
            functional: false,
            analytics: false,
            marketing: false,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('cookieConsent', JSON.stringify(consent));
        setCookie('cookie_consent', JSON.stringify(consent), 365);
        
        // Disable tracking
        disableTracking();
        
        // Hide banner
        document.getElementById('cookieConsentBanner').style.display = 'none';
        
        // Log consent for compliance
        logConsent(consent, 'reject-all');
    };

    window.customizeCookies = function() {
        if (!document.getElementById('cookieCustomizeModal')) {
            createCustomizationModal();
        }
        document.getElementById('cookieCustomizeModal').classList.add('show');
    };

    window.closeCustomization = function() {
        document.getElementById('cookieCustomizeModal').classList.remove('show');
    };

    window.savePreferences = function() {
        const consent = {
            necessary: true,
            functional: document.getElementById('functionalCookies').checked,
            analytics: document.getElementById('analyticsCookies').checked,
            marketing: document.getElementById('marketingCookies').checked,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('cookieConsent', JSON.stringify(consent));
        setCookie('cookie_consent', JSON.stringify(consent), 365);
        
        // Apply tracking based on preferences
        if (consent.analytics || consent.marketing) {
            enableTracking(consent);
        } else {
            disableTracking();
        }
        
        // Hide modal and banner
        document.getElementById('cookieCustomizeModal').classList.remove('show');
        document.getElementById('cookieConsentBanner').style.display = 'none';
        
        // Log consent for compliance
        logConsent(consent, 'custom');
    };

    // Enable tracking based on consent
    function enableTracking(consent) {
        if (consent.analytics) {
            // Enable Google Analytics
            if (window.gtag) {
                gtag('consent', 'update', {
                    'analytics_storage': 'granted'
                });
            }
        }
        
        if (consent.marketing) {
            // Enable marketing cookies
            if (window.fbq) {
                fbq('consent', 'grant');
            }
            if (window.gtag) {
                gtag('consent', 'update', {
                    'ad_storage': 'granted',
                    'ad_user_data': 'granted',
                    'ad_personalization': 'granted'
                });
            }
        }
    }

    // Disable tracking
    function disableTracking() {
        // Disable Google Analytics
        window['ga-disable-GA_MEASUREMENT_ID'] = true;
        
        if (window.gtag) {
            gtag('consent', 'update', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied'
            });
        }
        
        // Remove marketing cookies
        document.cookie.split(";").forEach(function(c) {
            const eqPos = c.indexOf("=");
            const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
            if (name.match(/^(_ga|_gid|_fbp|IDE)/)) {
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + window.location.hostname;
            }
        });
    }

    // Log consent for compliance (Philippine Data Privacy Act requirement)
    function logConsent(consent, action) {
        // Send to backend for logging
        fetch('/api/cookie-consent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                consent: consent,
                action: action,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            })
        }).catch(err => console.error('Failed to log consent:', err));
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we need to show consent banner
        if (!hasConsent()) {
            createConsentBanner();
            
            // Set default consent mode for Google tags
            if (window.gtag) {
                gtag('consent', 'default', {
                    'analytics_storage': 'denied',
                    'ad_storage': 'denied',
                    'ad_user_data': 'denied',
                    'ad_personalization': 'denied',
                    'wait_for_update': 500
                });
            }
        } else {
            // Apply existing consent
            const consent = JSON.parse(localStorage.getItem('cookieConsent') || '{}');
            if (consent.analytics || consent.marketing) {
                enableTracking(consent);
            }
        }
    });

})();