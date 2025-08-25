// Pricing page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const billingToggle = document.getElementById('billingToggle');
    
    if (billingToggle) {
        billingToggle.addEventListener('change', function() {
            const monthlyPrices = document.querySelectorAll('.monthly-price');
            const annualPrices = document.querySelectorAll('.annual-price');
            
            if (this.checked) {
                // Show annual prices
                monthlyPrices.forEach(price => price.style.display = 'none');
                annualPrices.forEach(price => price.style.display = 'inline');
            } else {
                // Show monthly prices
                monthlyPrices.forEach(price => price.style.display = 'inline');
                annualPrices.forEach(price => price.style.display = 'none');
            }
        });
    }
    
    // Handle plan selection from URL
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPlan = urlParams.get('plan');
    
    if (selectedPlan) {
        // Highlight selected plan
        const planCards = document.querySelectorAll('.pricing-card');
        planCards.forEach(card => {
            const planButton = card.querySelector('.plan-button');
            if (planButton && planButton.href.includes(`plan=${selectedPlan}`)) {
                card.classList.add('featured');
            }
        });
    }
});
