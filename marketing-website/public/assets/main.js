// Enhanced Main JavaScript for Ava Solutions Website with Modern UX
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
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target); // animate once
            }
        });
    }, observerOptions);

    // Lightweight initial state
    const animated = document.querySelectorAll('.feature-card, .pricing-card, .stat-card, .laptop-device, .hero-text > *');
    animated.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        // keep transitions short and GPU friendly
        el.style.transition = `opacity 420ms ease-out ${i * 35}ms, transform 420ms ease-out ${i * 35}ms`;
        observer.observe(el);
    });

    // Subtle hero entrance (no heavy repaint)
    if (!prefersReduced) {
        const hero = document.querySelector('.hero-text');
        if (hero) {
            hero.style.willChange = 'transform, opacity';
        }
    }
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
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!laptop || window.innerWidth <= 768 || prefersReduced) return;

    let lastY = 0;
    let ticking = false;

    const update = () => {
        const rate = lastY * -0.15; // very subtle
        laptop.style.transform = `translateY(${rate}px) rotateY(-8deg) rotateX(4deg)`;
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        lastY = window.pageYOffset;
        if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
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
    const navAuth = document.getElementById('navAuth');
    
    if (token && navAuth) {
        navAuth.innerHTML = `
            <a href="/dashboard" class="btn-secondary">Dashboard</a>
            <button onclick="logout()" class="btn-primary">Logout</button>
        `;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    window.location.href = '/';
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
