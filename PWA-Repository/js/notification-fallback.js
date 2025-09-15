// Notification Fallback System
// Provides fallback notification functions if they're not defined elsewhere

(function() {
    'use strict';
    
    // Check if notification functions already exist
    if (typeof window.showSuccess === 'function' && 
        typeof window.showError === 'function' && 
        typeof window.showInfo === 'function' && 
        typeof window.showWarning === 'function') {
        console.log('✅ Notification functions already defined');
        return;
    }
    
    // Create notification container if it doesn't exist
    function ensureNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }
    
    // Create notification element
    function createNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Determine colors based on type
        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
            info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
        };
        
        const color = colors[type] || colors.info;
        
        notification.style.cssText = `
            background: ${color.bg};
            border: 1px solid ${color.border};
            color: ${color.text};
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            min-width: 250px;
            max-width: 400px;
            pointer-events: auto;
            cursor: pointer;
            transition: opacity 0.3s, transform 0.3s;
            transform: translateX(0);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
        `;
        
        // Add icon based on type
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const icon = icons[type] || icons.info;
        notification.innerHTML = `<strong>${icon}</strong> ${message}`;
        
        // Click to dismiss
        notification.onclick = function() {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        };
        
        return notification;
    }
    
    // Show notification
    function showNotification(message, type = 'info', duration = 5000) {
        try {
            const container = ensureNotificationContainer();
            const notification = createNotification(message, type);
            
            // Add to container
            container.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.style.opacity = '1';
            }, 10);
            
            // Auto dismiss after duration
            if (duration > 0) {
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.style.opacity = '0';
                        notification.style.transform = 'translateX(100%)';
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.remove();
                            }
                        }, 300);
                    }
                }, duration);
            }
            
        } catch (error) {
            // Fallback to console if DOM manipulation fails
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // Define global notification functions if they don't exist
    if (typeof window.showSuccess !== 'function') {
        window.showSuccess = function(message, duration = 5000) {
            showNotification(message, 'success', duration);
        };
    }
    
    if (typeof window.showError !== 'function') {
        window.showError = function(message, duration = 7000) {
            showNotification(message, 'error', duration);
            console.error('[ERROR]', message);
        };
    }
    
    if (typeof window.showWarning !== 'function') {
        window.showWarning = function(message, duration = 6000) {
            showNotification(message, 'warning', duration);
            console.warn('[WARNING]', message);
        };
    }
    
    if (typeof window.showInfo !== 'function') {
        window.showInfo = function(message, duration = 5000) {
            showNotification(message, 'info', duration);
        };
    }
    
    // Also provide showNotification as a utility
    if (typeof window.showNotification !== 'function') {
        window.showNotification = showNotification;
    }
    
    // Provide a test function
    window.testNotifications = function() {
        showSuccess('This is a success message!');
        setTimeout(() => showInfo('This is an info message!'), 500);
        setTimeout(() => showWarning('This is a warning message!'), 1000);
        setTimeout(() => showError('This is an error message!'), 1500);
    };
    
    console.log('✅ Notification fallback system initialized');
    
})();