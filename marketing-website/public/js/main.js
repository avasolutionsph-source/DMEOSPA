// Ava Solutions Marketing Website JavaScript
// No ES6 modules - pure JavaScript for compatibility

// Configuration
const PWA_URL = 'https://ava-solutions-pwa.netlify.app';
const API_BASE = 'https://ava-pwa-backend.onrender.com';

// Redirect to PWA application
function redirectToApp() {
    window.location.href = PWA_URL;
}

// Smooth scroll to section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Mobile navigation toggle
function toggleMobileNav() {
    const navMenu = document.querySelector('.nav-menu');
    const hamburger = document.querySelector('.hamburger');
    
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

// Contact form handling
async function handleContactForm(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    
    try {
        const contactData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            business: formData.get('business'),
            message: formData.get('message'),
            source: 'marketing-website',
            timestamp: new Date().toISOString()
        };
        
        const response = await fetch(`${API_BASE}/api/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactData)
        });
        
        const result = await response.json();
        
        if (result.success || response.ok) {
            // Success
            showNotification('Thank you! Your message has been sent successfully. We\'ll get back to you soon.', 'success');
            form.reset();
        } else {
            throw new Error(result.error?.message || 'Failed to send message');
        }
        
    } catch (error) {
        console.error('Contact form error:', error);
        showNotification('Sorry, there was an error sending your message. Please try again or email us directly.', 'error');
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
    }
}

// Simple notification system for marketing site
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.marketing-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `marketing-notification marketing-notification-${type}`;
    notification.innerHTML = `
        <div class="marketing-notification-content">
            <span class="marketing-notification-message">${message}</span>
            <button class="marketing-notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#marketing-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'marketing-notification-styles';
        styles.textContent = `
            .marketing-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                animation: slideInRight 0.3s ease;
            }
            
            .marketing-notification-success {
                background: #059669;
                color: white;
            }
            
            .marketing-notification-error {
                background: #dc2626;
                color: white;
            }
            
            .marketing-notification-info {
                background: #1e3a8a;
                color: white;
            }
            
            .marketing-notification-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
            }
            
            .marketing-notification-message {
                flex: 1;
                margin-right: 12px;
            }
            
            .marketing-notification-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                opacity: 0.8;
            }
            
            .marketing-notification-close:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.1);
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Analytics and tracking (placeholder)
function trackEvent(eventName, properties = {}) {
    // Placeholder for analytics tracking
    console.log('Track Event:', eventName, properties);
    
    // Example: Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, properties);
    }
    
    // Example: Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, properties);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌐 Ava Solutions Marketing Website Loaded');
    
    // Setup mobile navigation
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', toggleMobileNav);
    }
    
    // Setup contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
    
    // Setup smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
            
            // Close mobile menu if open
            const navMenu = document.querySelector('.nav-menu');
            const hamburger = document.querySelector('.hamburger');
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            }
        });
    });
    
    // Track page view
    trackEvent('page_view', {
        page: 'marketing_home',
        referrer: document.referrer
    });
    
    // Track CTA clicks
    const ctaButtons = document.querySelectorAll('[onclick*="redirectToApp"]');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.textContent.trim();
            trackEvent('cta_click', {
                button_text: buttonText,
                page: 'marketing_home'
            });
        });
    });
    
    // Intersection Observer for animations (optional)
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        const animateElements = document.querySelectorAll('.feature-card, .pricing-card');
        animateElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    // Close mobile menu on resize to desktop
    if (window.innerWidth > 768) {
        const navMenu = document.querySelector('.nav-menu');
        const hamburger = document.querySelector('.hamburger');
        if (navMenu && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    }
});

// Export functions for global access (for onclick handlers)
window.redirectToApp = redirectToApp;
window.scrollToSection = scrollToSection;