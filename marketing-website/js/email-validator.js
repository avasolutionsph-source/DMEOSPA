// Real-time Email Validation for Marketing Website
// Prevents duplicate emails across the entire system

class EmailValidator {
    constructor() {
        this.apiUrl = 'https://ava-solutions-marketing.netlify.app/api';
        this.debounceTimer = null;
        this.lastCheckedEmail = '';
    }

    // Real-time email validation with debouncing
    validateEmailField(inputElement, errorElement) {
        if (!inputElement) return;

        inputElement.addEventListener('input', (e) => {
            const email = e.target.value.trim();
            
            // Clear previous timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            // Basic email format check first
            if (!this.isValidEmailFormat(email)) {
                this.showError(errorElement, email ? 'Please enter a valid email address' : '');
                return;
            }

            // Skip if same email as last check
            if (email === this.lastCheckedEmail) return;

            // Debounce API calls
            this.debounceTimer = setTimeout(async () => {
                await this.checkEmailAvailability(email, errorElement);
            }, 500);
        });

        // Also validate on blur
        inputElement.addEventListener('blur', async (e) => {
            const email = e.target.value.trim();
            if (email && this.isValidEmailFormat(email)) {
                await this.checkEmailAvailability(email, errorElement);
            }
        });
    }

    // Check if email format is valid
    isValidEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Check email availability against backend
    async checkEmailAvailability(email, errorElement) {
        try {
            this.lastCheckedEmail = email;
            
            // Show checking state
            this.showChecking(errorElement);

            const response = await fetch(`${this.apiUrl}/auth/check-email?email=${encodeURIComponent(email)}`);
            const data = await response.json();

            if (data.success) {
                if (data.exists) {
                    // Email is already in use
                    const message = data.details ? 
                        `Email already registered as ${data.details.userType}` :
                        'Email already in use';
                    this.showError(errorElement, message);
                    return false;
                } else {
                    // Email is available
                    this.showSuccess(errorElement, 'Email is available');
                    return true;
                }
            } else {
                // API error - allow form to proceed but warn
                this.showWarning(errorElement, 'Unable to verify email availability');
                return true;
            }

        } catch (error) {
            console.error('Email validation error:', error);
            this.showWarning(errorElement, 'Unable to verify email availability');
            return true; // Allow form to proceed on error
        }
    }

    // Validate email before form submission
    async validateOnSubmit(email) {
        if (!this.isValidEmailFormat(email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/auth/check-email?email=${encodeURIComponent(email)}`);
            const data = await response.json();

            if (data.success && data.exists) {
                return {
                    valid: false,
                    message: data.details ? 
                        `Email already registered as ${data.details.userType}` :
                        'Email already in use'
                };
            }

            return { valid: true };

        } catch (error) {
            console.error('Email validation error:', error);
            // Allow form to proceed if validation service is down
            return { valid: true };
        }
    }

    // UI feedback methods
    showError(element, message) {
        if (!element) return;
        element.textContent = message;
        element.className = 'email-error error';
        element.style.display = message ? 'block' : 'none';
        element.style.color = '#dc3545';
    }

    showSuccess(element, message) {
        if (!element) return;
        element.textContent = message;
        element.className = 'email-success success';
        element.style.display = 'block';
        element.style.color = '#28a745';
    }

    showWarning(element, message) {
        if (!element) return;
        element.textContent = message;
        element.className = 'email-warning warning';
        element.style.display = 'block';
        element.style.color = '#ffc107';
    }

    showChecking(element) {
        if (!element) return;
        element.textContent = 'Checking email availability...';
        element.className = 'email-checking checking';
        element.style.display = 'block';
        element.style.color = '#6c757d';
    }

    // Initialize validation for signup form
    initializeSignupValidation() {
        const emailInput = document.querySelector('input[type="email"]');
        let errorElement = document.querySelector('.email-validation-message');
        
        // Create error element if it doesn't exist
        if (emailInput && !errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'email-validation-message';
            errorElement.style.fontSize = '0.875rem';
            errorElement.style.marginTop = '0.25rem';
            emailInput.parentNode.appendChild(errorElement);
        }

        if (emailInput && errorElement) {
            this.validateEmailField(emailInput, errorElement);
            console.log('✅ Email validation initialized for signup form');
        }
    }

    // Prevent form submission if email is invalid
    preventInvalidSubmission(formElement) {
        if (!formElement) return;

        formElement.addEventListener('submit', async (e) => {
            const emailInput = formElement.querySelector('input[type="email"]');
            if (!emailInput) return;

            const email = emailInput.value.trim();
            if (!email) return;

            e.preventDefault();
            
            const validation = await this.validateOnSubmit(email);
            
            if (validation.valid) {
                // Email is valid, submit the form
                console.log('✅ Email validation passed, submitting form');
                formElement.submit();
            } else {
                // Show error and prevent submission
                const errorElement = formElement.querySelector('.email-validation-message');
                this.showError(errorElement, validation.message);
                
                // Focus back to email field
                emailInput.focus();
                console.log('❌ Email validation failed:', validation.message);
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const emailValidator = new EmailValidator();
    
    // Initialize for signup forms
    emailValidator.initializeSignupValidation();
    
    // Prevent invalid form submissions
    const signupForm = document.querySelector('form');
    if (signupForm) {
        emailValidator.preventInvalidSubmission(signupForm);
    }
    
    // Make available globally for debugging
    window.emailValidator = emailValidator;
});

export default EmailValidator;