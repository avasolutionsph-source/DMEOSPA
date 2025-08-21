// ENABLE ALL FEATURES FOR ALL USERS - No restrictions
console.log('🚀 Enabling all features for all users...');

(function() {
    // Continuously enable all features
    function enableAllFeatures() {
        // Enable all navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('disabled', 'locked', 'premium-locked');
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
            item.style.cursor = 'pointer';
            
            // Remove any lock or crown icons
            const icons = item.querySelectorAll('.fa-lock, .fa-crown, .crown-icon');
            icons.forEach(icon => icon.remove());
            
            // Remove upgrade onclick handlers
            if (item.onclick && item.onclick.toString().includes('showUpgradePrompt')) {
                item.onclick = null;
            }
        });
        
        // Remove any upgrade modals
        const modals = document.querySelectorAll('.upgrade-modal, .premium-feature-modal, [class*="upgrade"], [class*="premium"]');
        modals.forEach(modal => {
            if (modal.textContent.includes('Premium Feature') || 
                modal.textContent.includes('Upgrade') || 
                modal.textContent.includes('Pro Plan')) {
                modal.remove();
            }
        });
        
        // If entitlements system exists, override it
        if (window.entitlementsSystem) {
            window.entitlementsSystem.can = () => true;
            window.entitlementsSystem.requiresUpgrade = () => false;
            window.entitlementsSystem.showUpgradePrompt = (feature) => {
                if (window.app && window.app.navigateTo) {
                    window.app.navigateTo(feature);
                }
            };
        }
    }
    
    // Run immediately
    enableAllFeatures();
    
    // Run periodically to ensure everything stays enabled
    setInterval(enableAllFeatures, 1000);
    
    // Run on DOM changes
    const observer = new MutationObserver(() => {
        enableAllFeatures();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'onclick']
    });
    
    console.log('✅ All features enabled for all users!');
})();