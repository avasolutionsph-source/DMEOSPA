// Email Validation for Booking Website
// Prevents duplicate emails when customers book appointments

(function() {
    const apiUrl = 'https://ava-marketing-api.onrender.com/api';
    let validationTimeout = null;

    // Check email uniqueness
    async function checkEmailUniqueness(email) {
        try {
            const response = await fetch(`${apiUrl}/auth/check-email?email=${encodeURIComponent(email)}`);
            if (!response.ok) throw new Error('Validation service unavailable');
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn('Email validation error:', error);
            return { success: false, available: true }; // Allow booking on error
        }
    }

    // Add email validation to booking forms
    function addEmailValidation() {
        const emailInputs = document.querySelectorAll('input[type="email"]');
        
        emailInputs.forEach(input => {
            // Skip if already has validation
            if (input.hasAttribute('data-email-validated')) return;
            input.setAttribute('data-email-validated', 'true');

            // Create feedback element
            const feedbackEl = document.createElement('div');
            feedbackEl.className = 'email-validation-feedback';
            feedbackEl.style.cssText = `
                font-size: 0.875rem;
                margin-top: 0.25rem;
                padding: 0.25rem 0;
                display: none;
            `;
            input.parentNode.appendChild(feedbackEl);

            // Add input listener with debouncing
            input.addEventListener('input', (e) => {
                const email = e.target.value.trim();
                
                if (validationTimeout) {
                    clearTimeout(validationTimeout);
                }

                if (!email) {
                    hideFeedback(feedbackEl);
                    return;
                }

                // Basic format validation
                if (!isValidEmail(email)) {
                    showFeedback(feedbackEl, 'Please enter a valid email address', 'error');
                    return;
                }

                // Debounce server validation
                validationTimeout = setTimeout(async () => {
                    await validateEmail(email, feedbackEl);
                }, 500);
            });

            // Also validate on blur
            input.addEventListener('blur', async (e) => {
                const email = e.target.value.trim();
                if (email && isValidEmail(email)) {
                    await validateEmail(email, feedbackEl);
                }
            });
        });
    }

    // Validate email with server
    async function validateEmail(email, feedbackEl) {
        showFeedback(feedbackEl, 'Checking email...', 'checking');
        
        const result = await checkEmailUniqueness(email);
        
        if (result.success) {
            if (result.exists) {
                const message = result.details ? 
                    `Email already registered as ${result.details.userType}` :
                    'Email already in use';
                showFeedback(feedbackEl, message, 'error');
            } else {
                showFeedback(feedbackEl, 'Email is available', 'success');
            }
        } else {
            showFeedback(feedbackEl, 'Unable to verify email', 'warning');
        }
    }

    // Basic email format validation
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Show feedback message
    function showFeedback(element, message, type) {
        element.textContent = message;
        element.style.display = 'block';
        
        const colors = {
            error: '#dc3545',
            success: '#28a745',
            warning: '#ffc107',
            checking: '#6c757d'
        };
        
        element.style.color = colors[type] || '#6c757d';
        element.className = `email-validation-feedback ${type}`;
    }

    // Hide feedback message
    function hideFeedback(element) {
        element.style.display = 'none';
        element.textContent = '';
    }

    // Prevent form submission with duplicate emails
    function preventDuplicateSubmissions() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                const emailInput = form.querySelector('input[type="email"]');
                if (!emailInput) return;

                const email = emailInput.value.trim();
                if (!email) return;

                // Check for existing error state
                const feedbackEl = emailInput.parentNode.querySelector('.email-validation-feedback.error');
                if (feedbackEl && feedbackEl.style.display !== 'none') {
                    e.preventDefault();
                    emailInput.focus();
                    console.log('❌ Form submission prevented - email already in use');
                    return;
                }

                // Double-check email before submission
                const validation = await checkEmailUniqueness(email);
                if (validation.success && validation.exists) {
                    e.preventDefault();
                    
                    const message = validation.details ? 
                        `Email already registered as ${validation.details.userType}` :
                        'Email already in use';
                    
                    showFeedback(
                        emailInput.parentNode.querySelector('.email-validation-feedback'),
                        message,
                        'error'
                    );
                    
                    emailInput.focus();
                    console.log('❌ Form submission prevented - email validation failed');
                }
            });
        });
    }

    // Initialize when DOM is ready
    function init() {
        addEmailValidation();
        preventDuplicateSubmissions();
        console.log('✅ Email validation initialized for booking website');
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-initialize when new content is loaded (for SPAs)
    const observer = new MutationObserver(() => {
        addEmailValidation();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Export for debugging
    window.bookingEmailValidation = {
        checkEmail: checkEmailUniqueness,
        reinitialize: init
    };
})();