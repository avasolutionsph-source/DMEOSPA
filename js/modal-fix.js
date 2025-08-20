// Emergency Modal Fix - Force Close Any Modal
(function() {
    console.log('🚨 MODAL FIX: Emergency modal closer loaded');

    // Force close any modal immediately
    function forceCloseAllModals() {
        console.log('🚨 Force closing all modals...');
        
        // Method 1: Hide by ID
        const modalIds = ['authModal', 'loginModal', 'userModal'];
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
                console.log(`✅ Closed modal: ${id}`);
            }
        });

        // Method 2: Hide by class
        const modalClasses = ['.modal', '.modal.active', '.popup', '.overlay'];
        modalClasses.forEach(className => {
            document.querySelectorAll(className).forEach(modal => {
                modal.style.display = 'none';
                modal.classList.remove('active');
                console.log(`✅ Closed modal by class: ${className}`);
            });
        });

        // Method 3: Remove modal-open class from body
        document.body.classList.remove('modal-open');
        
        // Method 4: Hide any element with modal-like styling
        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' && style.zIndex > 100) {
                const rect = el.getBoundingClientRect();
                if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
                    el.style.display = 'none';
                    console.log('✅ Closed potential modal element');
                }
            }
        });

        console.log('✅ All modals force closed');
    }

    // Add close button to any visible modal
    function addEmergencyCloseButton() {
        document.querySelectorAll('.modal, [id*="modal"], [id*="Modal"]').forEach(modal => {
            if (window.getComputedStyle(modal).display !== 'none') {
                // Check if it already has a close button
                if (!modal.querySelector('.emergency-close')) {
                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'emergency-close';
                    closeBtn.innerHTML = '✕ CLOSE';
                    closeBtn.style.cssText = `
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 5px;
                        cursor: pointer;
                        z-index: 99999;
                        font-weight: bold;
                    `;
                    
                    closeBtn.onclick = () => {
                        modal.style.display = 'none';
                        modal.remove();
                    };
                    
                    modal.appendChild(closeBtn);
                    console.log('✅ Added emergency close button to modal');
                }
            }
        });
    }

    // Create emergency close overlay
    function createEmergencyCloseOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'emergencyCloseOverlay';
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 15px;
                border-radius: 8px;
                z-index: 99999;
                cursor: pointer;
                font-weight: bold;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            " onclick="forceCloseEverything()">
                ✕ EMERGENCY CLOSE
            </div>
        `;
        
        document.body.appendChild(overlay);
        console.log('✅ Emergency close overlay added');
    }

    // Ultimate modal killer
    window.forceCloseEverything = function() {
        console.log('🚨 EMERGENCY: Closing everything!');
        
        // Remove all modals
        document.querySelectorAll('.modal, [id*="modal"], [id*="Modal"], .popup, .overlay').forEach(el => {
            el.remove();
        });
        
        // Remove emergency overlay
        const emergency = document.getElementById('emergencyCloseOverlay');
        if (emergency) emergency.remove();
        
        // Clear body classes
        document.body.classList.remove('modal-open', 'popup-open', 'overlay-open');
        
        // Force enable scrolling
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        console.log('✅ Everything force closed!');
        
        // Show success message
        if (window.showNotification) {
            window.showNotification('Modal closed successfully!', 'success');
        }
    };

    // Auto-execute emergency fixes
    setTimeout(() => {
        forceCloseAllModals();
        addEmergencyCloseButton();
        createEmergencyCloseOverlay();
    }, 500);

    // Add keyboard shortcut (Escape key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            console.log('🚨 Escape key pressed - force closing modals');
            forceCloseAllModals();
        }
    });

    // Add click outside to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') || e.target.id === 'authModal') {
            console.log('🚨 Clicked outside modal - force closing');
            forceCloseAllModals();
        }
    });

    console.log('🚨 MODAL FIX READY - Escape key, click outside, or red button to close');
})();
