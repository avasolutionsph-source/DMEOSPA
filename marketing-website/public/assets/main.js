// Enhanced Main JavaScript for Daet Massage and Spa Website with Modern UX

// API Configuration - Updated to use deployed backend
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:4001' 
    : 'https://daetspa-backend.onrender.com';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all enhancements
    initScrollEffects();
    initAnimations();
    initInteractiveElements();
    initMobileNav();
    initContactForm();
    addSmoothScrolling();
    initParallaxEffects();
    checkAuthStatus();
    initVideoSection();
});


// Enhanced scroll effects with navbar changes
function initScrollEffects() {
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // Add scrolled class for navbar styling
        if (currentScrollY > 100) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
        
        // Hide/show navbar on scroll (optional - can be disabled)
        if (currentScrollY > lastScrollY && currentScrollY > 300) {
            navbar?.style.setProperty('transform', 'translateY(-100%)');
        } else {
            navbar?.style.setProperty('transform', 'translateY(0)');
        }
        
        lastScrollY = currentScrollY;
    });
}

// Advanced intersection observer with staggered animations
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Staggered animation delay
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, index * 100);
            }
        });
    }, observerOptions);

    // Apply initial styles and observe elements
    document.querySelectorAll('.feature-card, .pricing-card, .stat-card, .laptop-device').forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`;
        observer.observe(el);
    });
}

// Interactive elements with enhanced feedback
function initInteractiveElements() {
    // Enhanced button interactions
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.02)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Card hover effects (lightweight version)
    document.querySelectorAll('.feature-card, .pricing-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Mobile navigation
function initMobileNav() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }
}

// Enhanced contact form
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            }
            
            // Simulate form submission
            setTimeout(() => {
                alert('Thank you for your message! We will get back to you soon.');
                contactForm.reset();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
                }
            }, 2000);
        });
    }
}

// Parallax effects for hero section (lightweight)
function initParallaxEffects() {
    const laptop = document.querySelector('.laptop-device');
    
    if (laptop && window.innerWidth > 768) { // Only on desktop
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.3; // Reduced for performance
            laptop.style.transform = `translateY(${rate}px) rotateY(-10deg) rotateX(5deg)`;
        });
    }
}

// Enhanced smooth scrolling
function addSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
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
}

// Check if user is logged in
function checkAuthStatus() {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    const navAuth = document.getElementById('navAuth');
    
    if (token && userData && navAuth) {
        try {
            const user = JSON.parse(userData);
            
            // Update navigation for logged-in users
            if (user.role === 'client') {
                // For clients, show "My Profile" instead of welcome message
                navAuth.innerHTML = `
                    <a href="/profile" class="btn-secondary">My Profile</a>
                    <button onclick="logout()" class="btn-primary">Logout</button>
                `;
            } else {
                // For business users and admins
                const dashboardText = user.role === 'superAdmin' ? 'Admin Panel' : 
                                      user.role === 'admin' ? 'Dashboard' : 
                                      'Business';
                
                const dashboardUrl = user.role === 'superAdmin' ? '/admin' :
                                     user.role === 'admin' ? '/admin-dashboard' : 
                                     '/business-dashboard';
                
                navAuth.innerHTML = `
                    <span class="user-welcome">Welcome, ${user.firstName}</span>
                    <a href="${dashboardUrl}" class="btn-secondary">${dashboardText}</a>
                    <button onclick="logout()" class="btn-primary">Logout</button>
                `;
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            // Clear corrupted data
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
        }
    }
}

// Logout function
function logout() {
    // Remove all authentication tokens and user data
    localStorage.removeItem('userToken');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userData');
    
    // Redirect to marketing website homepage (completely logged out)
    window.location.href = '/';
}

// Video Section Functionality
function initVideoSection() {
    const videoPlaceholder = document.querySelector('.video-placeholder');
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', function() {
            // For now, just call the booking number since we don't have an actual video
            // Later, you can replace this with actual video playback
            const bookingButton = document.querySelector('.book-now-btn');
            if (bookingButton) {
                bookingButton.click();
            }
        });

        // Add some visual feedback
        videoPlaceholder.addEventListener('mouseenter', function() {
            const playIcon = this.querySelector('.play-icon');
            if (playIcon) {
                playIcon.style.transform = 'scale(1.1)';
            }
        });

        videoPlaceholder.addEventListener('mouseleave', function() {
            const playIcon = this.querySelector('.play-icon');
            if (playIcon) {
                playIcon.style.transform = 'scale(1)';
            }
        });
    }
}


// Add CSS for animations (performance optimized)
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
    
    .feature-card,
    .pricing-card {
        will-change: transform;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .navbar {
        will-change: transform;
    }
    
    .laptop-device {
        will-change: transform;
    }
    
    /* Super Admin Dashboard Styles */
    .admin-dashboard-container {
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
        background: #f8fafc;
        min-height: 100vh;
    }
    
    .admin-header {
        text-align: center;
        margin-bottom: 3rem;
    }
    
    .admin-header h1 {
        color: #1e293b;
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
    }
    
    .admin-header p {
        color: #64748b;
        font-size: 1.1rem;
    }
    
    .admin-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 3rem;
    }
    
    .admin-stat-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .stat-icon {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 1rem;
        color: white;
        font-size: 1.5rem;
    }
    
    .stat-content h3 {
        font-size: 2rem;
        font-weight: bold;
        color: #1e293b;
        margin: 0 0 0.25rem 0;
    }
    
    .stat-content p {
        color: #64748b;
        margin: 0;
        font-size: 0.9rem;
    }
    
    .admin-sections {
        display: grid;
        gap: 2rem;
    }
    
    .admin-section {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    
    .section-header h2 {
        color: #1e293b;
        margin: 0;
        font-size: 1.5rem;
    }
    
    .admin-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .admin-table th,
    .admin-table td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .admin-table th {
        background: #f8fafc;
        font-weight: 600;
        color: #374151;
    }
    
    .user-info {
        display: flex;
        flex-direction: column;
    }
    
    .user-name {
        font-weight: 600;
        color: #1e293b;
    }
    
    .user-email {
        font-size: 0.9rem;
        color: #64748b;
    }
    
    .role-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: capitalize;
    }
    
    .role-superAdmin {
        background: #fee2e2;
        color: #dc2626;
    }
    
    .role-admin {
        background: #dbeafe;
        color: #2563eb;
    }
    
    .role-branch {
        background: #dcfce7;
        color: #16a34a;
    }
    
    .filter-select {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        margin-bottom: 1rem;
        font-size: 1rem;
    }
    
    .branch-data-card {
        background: #f8fafc;
        border-radius: 8px;
        padding: 1.5rem;
        margin-top: 1rem;
    }
    
    .branch-data-card h3 {
        color: #1e293b;
        margin-bottom: 1rem;
    }
    
    .business-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .metric {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem;
        background: white;
        border-radius: 6px;
    }
    
    .metric-label {
        color: #64748b;
        font-size: 0.9rem;
    }
    
    .metric-value {
        font-weight: 600;
        color: #1e293b;
    }
    
    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: #64748b;
    }
    
    .empty-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .loading {
        text-align: center;
        padding: 2rem;
        color: #64748b;
    }
    
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s;
    }
    
    .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn-secondary {
        background: #f8fafc;
        color: #374151;
        border: 1px solid #d1d5db;
    }
    
    .btn-secondary:hover {
        background: #f1f5f9;
    }
    
    .user-welcome {
        color: #374151;
        font-weight: 500;
        margin-right: 1rem;
    }
    
    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
`;
document.head.appendChild(style);
