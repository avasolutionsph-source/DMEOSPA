/**
 * Unified Notification Manager
 * Centralizes all notification display logic across the application
 * Replaces duplicate showNotification calls with a consistent system
 */

import { logDebug, logWarn } from './logger-helper.js';

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.nextId = 1;
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000; // 5 seconds
        this.positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'];
        this.currentPosition = 'top-right';
        
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupContainer());
        } else {
            this.setupContainer();
        }
    }
    
    setupContainer() {
        // Check if container already exists
        this.container = document.getElementById('notification-container');
        
        if (!this.container) {
            this.createContainer();
        }
        
        this.applyStyles();
        
        logDebug('Notification manager initialized', {
            category: 'UI',
            operation: 'notification_init',
            data: { position: this.currentPosition }
        });
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = `notification-container position-${this.currentPosition}`;
        document.body.appendChild(this.container);
    }
    
    applyStyles() {
        // Inject CSS if not already present
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = this.getCSS();
            document.head.appendChild(style);
        }
    }
    
    getCSS() {
        return `
            .notification-container {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
                width: 100%;
            }
            
            .notification-container.position-top-right {
                top: 20px;
                right: 20px;
            }
            
            .notification-container.position-top-left {
                top: 20px;
                left: 20px;
            }
            
            .notification-container.position-bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .notification-container.position-bottom-left {
                bottom: 20px;
                left: 20px;
            }
            
            .notification-container.position-top-center {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .notification-container.position-bottom-center {
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
            }
            
            .notification {
                background: var(--white, #ffffff);
                border-radius: var(--border-radius-lg, 0.75rem);
                box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
                margin-bottom: 12px;
                padding: 16px;
                pointer-events: auto;
                position: relative;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-left: 4px solid var(--primary-color, #1E3A8A);
                backdrop-filter: blur(16px);
                max-width: 100%;
                word-wrap: break-word;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification.hiding {
                transform: translateX(100%);
                opacity: 0;
            }
            
            .notification.success {
                border-left-color: var(--success-color, #10B981);
                background: linear-gradient(135deg, 
                    rgba(236, 253, 245, 0.9) 0%, 
                    rgba(255, 255, 255, 0.9) 100%);
            }
            
            .notification.error {
                border-left-color: var(--danger-color, #EF4444);
                background: linear-gradient(135deg, 
                    rgba(254, 242, 242, 0.9) 0%, 
                    rgba(255, 255, 255, 0.9) 100%);
            }
            
            .notification.warning {
                border-left-color: var(--warning-color, #F59E0B);
                background: linear-gradient(135deg, 
                    rgba(255, 251, 235, 0.9) 0%, 
                    rgba(255, 255, 255, 0.9) 100%);
            }
            
            .notification.info {
                border-left-color: var(--info-color, #22D3EE);
                background: linear-gradient(135deg, 
                    rgba(236, 254, 255, 0.9) 0%, 
                    rgba(255, 255, 255, 0.9) 100%);
            }
            
            .notification-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .notification-icon {
                flex-shrink: 0;
                font-size: 18px;
                margin-top: 2px;
            }
            
            .notification-text {
                flex: 1;
                font-size: 14px;
                line-height: 1.5;
                color: var(--gray-800, #1E293B);
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: var(--gray-900, #0F172A);
            }
            
            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: var(--gray-400, #94A3B8);
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s;
            }
            
            .notification-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: var(--gray-600, #475569);
            }
            
            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: var(--primary-color, #1E3A8A);
                border-radius: 0 0 var(--border-radius-lg, 0.75rem) var(--border-radius-lg, 0.75rem);
                transition: width linear;
            }
            
            .notification.success .notification-progress {
                background: var(--success-color, #10B981);
            }
            
            .notification.error .notification-progress {
                background: var(--danger-color, #EF4444);
            }
            
            .notification.warning .notification-progress {
                background: var(--warning-color, #F59E0B);
            }
            
            .notification.info .notification-progress {
                background: var(--info-color, #22D3EE);
            }
            
            @media (max-width: 768px) {
                .notification-container {
                    left: 10px !important;
                    right: 10px !important;
                    max-width: none;
                    transform: none !important;
                }
                
                .notification {
                    margin-bottom: 8px;
                    padding: 12px;
                }
            }
        `;
    }
    
    /**
     * Show notification with automatic type detection
     */
    show(message, type = 'info', options = {}) {
        // Auto-detect type from message content if not specified
        if (type === 'auto') {
            type = this.detectTypeFromMessage(message);
        }
        
        const notification = this.createNotification(message, type, options);
        this.addToContainer(notification);
        this.manageQueue();
        
        logDebug('Notification displayed', {
            category: 'UI',
            operation: 'show_notification',
            data: { type, message: message.substring(0, 100) }
        });
        
        return notification.id;
    }
    
    /**
     * Specific notification type methods
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }
    
    error(message, options = {}) {
        return this.show(message, 'error', options);
    }
    
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }
    
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
    
    detectTypeFromMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('success') || lowerMessage.includes('completed') || 
            lowerMessage.includes('saved') || lowerMessage.includes('created')) {
            return 'success';
        }
        if (lowerMessage.includes('error') || lowerMessage.includes('failed') || 
            lowerMessage.includes('not found') || lowerMessage.includes('invalid')) {
            return 'error';
        }
        if (lowerMessage.includes('warning') || lowerMessage.includes('careful') || 
            lowerMessage.includes('attention')) {
            return 'warning';
        }
        
        return 'info';
    }
    
    createNotification(message, type, options) {
        const notification = {
            id: this.nextId++,
            message,
            type,
            title: options.title || '',
            duration: options.duration !== undefined ? options.duration : this.defaultDuration,
            persistent: options.persistent || false,
            clickHandler: options.onClick || null,
            element: null,
            progressElement: null,
            timer: null,
            startTime: Date.now()
        };
        
        notification.element = this.createNotificationElement(notification);
        return notification;
    }
    
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.type}`;
        element.setAttribute('data-id', notification.id);
        
        const icon = this.getIcon(notification.type);
        const title = notification.title ? `<div class="notification-title">${this.escapeHtml(notification.title)}</div>` : '';
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-text">
                    ${title}
                    <div>${this.escapeHtml(notification.message)}</div>
                </div>
            </div>
            <button class="notification-close" title="Close notification">&times;</button>
            ${notification.duration > 0 ? '<div class="notification-progress"></div>' : ''}
        `;
        
        // Set up close handler
        const closeBtn = element.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.hide(notification.id));
        
        // Set up click handler
        if (notification.clickHandler) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', (e) => {
                if (e.target !== closeBtn) {
                    notification.clickHandler(notification);
                }
            });
        }
        
        return element;
    }
    
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    addToContainer(notification) {
        if (!this.container) {
            logWarn('Notification container not available', {
                category: 'UI',
                operation: 'notification_container_missing'
            });
            return;
        }
        
        this.notifications.push(notification);
        this.container.appendChild(notification.element);
        
        // Trigger show animation
        requestAnimationFrame(() => {
            notification.element.classList.add('show');
        });
        
        // Set up auto-hide
        if (notification.duration > 0 && !notification.persistent) {
            this.startAutoHide(notification);
        }
    }
    
    startAutoHide(notification) {
        const progressElement = notification.element.querySelector('.notification-progress');
        
        if (progressElement) {
            // Animate progress bar
            progressElement.style.width = '100%';
            progressElement.style.transitionDuration = `${notification.duration}ms`;
            
            requestAnimationFrame(() => {
                progressElement.style.width = '0%';
            });
        }
        
        notification.timer = setTimeout(() => {
            this.hide(notification.id);
        }, notification.duration);
    }
    
    hide(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;
        
        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }
        
        // Add hiding class for animation
        notification.element.classList.add('hiding');
        
        // Remove after animation
        setTimeout(() => {
            this.remove(id);
        }, 300);
    }
    
    remove(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index === -1) return;
        
        const notification = this.notifications[index];
        
        if (notification.element && notification.element.parentNode) {
            notification.element.parentNode.removeChild(notification.element);
        }
        
        this.notifications.splice(index, 1);
    }
    
    manageQueue() {
        // Remove excess notifications
        while (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications[0];
            this.hide(oldest.id);
        }
    }
    
    hideAll() {
        [...this.notifications].forEach(notification => {
            this.hide(notification.id);
        });
    }
    
    setPosition(position) {
        if (this.positions.includes(position)) {
            this.currentPosition = position;
            if (this.container) {
                this.container.className = `notification-container position-${position}`;
            }
        }
    }
    
    setMaxNotifications(max) {
        this.maxNotifications = max;
        this.manageQueue();
    }
    
    setDefaultDuration(duration) {
        this.defaultDuration = duration;
    }
}

// Create singleton instance
const notificationManager = new NotificationManager();

// Legacy compatibility - global showNotification function
window.showNotification = (message, type = 'info', options = {}) => {
    return notificationManager.show(message, type, options);
};

// Modern API exports
export const showNotification = (message, type = 'info', options = {}) => {
    return notificationManager.show(message, type, options);
};

export const showSuccess = (message, options = {}) => {
    return notificationManager.success(message, options);
};

export const showError = (message, options = {}) => {
    return notificationManager.error(message, options);
};

export const showWarning = (message, options = {}) => {
    return notificationManager.warning(message, options);
};

export const showInfo = (message, options = {}) => {
    return notificationManager.info(message, options);
};

export const hideNotification = (id) => {
    return notificationManager.hide(id);
};

export const hideAllNotifications = () => {
    return notificationManager.hideAll();
};

export { notificationManager as NotificationManager };
export default notificationManager;