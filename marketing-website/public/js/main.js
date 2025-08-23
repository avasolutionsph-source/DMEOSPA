// Ava Solutions Marketing Website JavaScript
// Navigation and Routing Functions

// PWA Application URL - Points to the main PWA application
const PWA_URL = window.location.hostname === 'localhost' 
    ? '../index.html'  // Local development
    : 'https://ava-solutions-pwa.netlify.app';  // Production PWA URL

// Routing Functions
function redirectToLogin() {
    // Direct to the PWA login page
    window.location.href = PWA_URL + '/auth/login.html';
}

function redirectToSignup() {
    // Direct to the PWA signup page
    window.location.href = PWA_URL + '/auth/signup.html';
}

function redirectToApp() {
    window.location.href = PWA_URL;
}

function startFreeTrial(plan = 'professional') {
    // Track the selected plan and redirect to signup
    window.location.href = `${PWA_URL}/auth/signup.html?plan=${plan}&trial=true`;
}

function requestDemo() {
    // Redirect to contact page with demo inquiry pre-selected
    window.location.href = 'contact.html?subject=demo';
}

// Navigation Enhancement
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide/show navbar on scroll
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    // Mobile navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Contact form subject pre-selection from URL
    const urlParams = new URLSearchParams(window.location.search);
    const subject = urlParams.get('subject');
    if (subject) {
        const subjectSelect = document.querySelector('select[name="subject"]');
        if (subjectSelect) {
            subjectSelect.value = subject;
        }
    }

    // Plan parameter handling for pricing page
    const plan = urlParams.get('plan');
    if (plan && window.location.pathname.includes('pricing')) {
        highlightPlan(plan);
    }

    // Animation on scroll
    observeElements();
});

// Plan highlighting for pricing page
function highlightPlan(planName) {
    const plans = document.querySelectorAll('.pricing-card');
    plans.forEach(plan => {
        if (plan.textContent.toLowerCase().includes(planName.toLowerCase())) {
            plan.style.transform = 'scale(1.05)';
            plan.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
            plan.style.border = '2px solid var(--primary)';
        }
    });
}

// Intersection Observer for animations
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe elements for animation
    const animatedElements = document.querySelectorAll(
        '.feature-card, .pricing-card, .faq-item, .contact-item, .stat-card, .hero-features'
    );
    
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

// Utility Functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add notification styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                border-left: 4px solid var(--success);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                z-index: 10000;
                max-width: 400px;
                animation: slideInRight 0.3s ease-out;
            }
            
            .notification-error {
                border-left-color: var(--error);
            }
            
            .notification i:first-child {
                color: var(--success);
                font-size: 1.2rem;
            }
            
            .notification-error i:first-child {
                color: var(--error);
            }
            
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Analytics and Tracking (placeholder)
function trackEvent(eventName, properties = {}) {
    // Integrate with your analytics service
    console.log('Event:', eventName, properties);
    
    // Example: Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, properties);
    }
    
    // Example: Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, properties);
    }
}

// Track button clicks
document.addEventListener('click', function(e) {
    const button = e.target.closest('button, .btn-primary, .btn-secondary');
    if (button) {
        const buttonText = button.textContent.trim();
        trackEvent('button_click', {
            button_text: buttonText,
            page: window.location.pathname
        });
    }
});

// Performance monitoring
window.addEventListener('load', function() {
    // Simple performance tracking
    const loadTime = performance.now();
    trackEvent('page_load', {
        load_time: Math.round(loadTime),
        page: window.location.pathname
    });
});

// Super Admin Functions (as requested)
function showSuperAdminLogin() {
    const modal = document.createElement('div');
    modal.className = 'super-admin-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <h3>Super Admin Access</h3>
            <form id="superAdminForm">
                <div class="form-group">
                    <label>Admin Key</label>
                    <input type="password" id="adminKey" required placeholder="Enter admin key">
                </div>
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.super-admin-modal').remove()">Cancel</button>
                    <button type="submit">Access Dashboard</button>
                </div>
            </form>
        </div>
    `;
    
    // Add modal styles
    if (!document.querySelector('#super-admin-styles')) {
        const styles = document.createElement('style');
        styles.id = 'super-admin-styles';
        styles.textContent = `
            .super-admin-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
            }
            
            .modal-content {
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                z-index: 1;
                width: 90%;
                max-width: 400px;
            }
            
            .form-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
                margin-top: 1rem;
            }
            
            .form-actions button {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 0.25rem;
                cursor: pointer;
            }
            
            .form-actions button[type="button"] {
                background: var(--text-light);
                color: white;
            }
            
            .form-actions button[type="submit"] {
                background: var(--primary);
                color: white;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('superAdminForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const adminKey = document.getElementById('adminKey').value;
        
        // Simple admin key check (in production, this should be more secure)
        if (adminKey === 'avasolutions2024admin') {
            modal.remove();
            window.location.href = PWA_URL + '?admin=true';
        } else {
            showNotification('Invalid admin key', 'error');
        }
    });
}

// Keyboard shortcut for super admin (Ctrl+Alt+A)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.altKey && e.key === 'A') {
        showSuperAdminLogin();
    }
});

// Export functions for use in other scripts
window.AvaMarketing = {
    redirectToLogin,
    redirectToSignup,
    redirectToApp,
    startFreeTrial,
    requestDemo,
    showNotification,
    trackEvent,
    showSuperAdminLogin
};