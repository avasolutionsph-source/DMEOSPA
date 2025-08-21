// Owner Page Cleanup - Removes duplicate code and consolidates initialization
(function() {
    'use strict';
    
    console.log('🧹 Owner Page Cleanup starting...');
    
    // Check if we've already cleaned up
    if (window.ownerPageCleaned) {
        console.log('✅ Page already cleaned');
        return;
    }
    
    // Remove duplicate event listeners
    function removeDuplicateListeners() {
        // Get all nav items
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            // Clone to remove all event listeners
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            // Add single clean event listener
            if (newItem.dataset.page) {
                newItem.addEventListener('click', function(e) {
                    e.preventDefault();
                    navigateToPage(this.dataset.page);
                });
            }
        });
    }
    
    // Single navigation function
    function navigateToPage(pageName) {
        console.log('📍 Navigating to:', pageName);
        
        // Remove active from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active to clicked item
        const clickedItem = document.querySelector(`[data-page="${pageName}"]`);
        if (clickedItem) {
            clickedItem.classList.add('active');
        }
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
            page.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('active');
            
            // Save state
            localStorage.setItem('lastActivePage', pageName);
            
            // Trigger page init if exists
            const initFunc = window[pageName + 'Init'];
            if (typeof initFunc === 'function') {
                initFunc();
            }
        }
    }
    
    // Remove duplicate script behaviors
    function cleanupDuplicates() {
        // Remove multiple modal handlers
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                const newBtn = closeBtn.cloneNode(true);
                closeBtn.parentNode.replaceChild(newBtn, closeBtn);
                
                newBtn.addEventListener('click', function() {
                    modal.style.display = 'none';
                });
            }
        });
        
        // Clean up duplicate form submissions
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // Remove inline onsubmit
            form.onsubmit = null;
            form.removeAttribute('onsubmit');
        });
    }
    
    // Consolidate initialization
    function initializeOnce() {
        console.log('🚀 Single initialization running...');
        
        // Remove duplicate listeners
        removeDuplicateListeners();
        
        // Clean up duplicates
        cleanupDuplicates();
        
        // Initialize business name once
        const businessNameEl = document.getElementById('businessName');
        if (businessNameEl && businessNameEl.textContent === 'Loading...') {
            const userData = localStorage.getItem('userData') || localStorage.getItem('auth_user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    businessNameEl.textContent = user.businessName || 'Ava Solutions';
                } catch (e) {
                    businessNameEl.textContent = 'Ava Solutions';
                }
            }
        }
        
        // Set up logout once
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = null; // Clear existing
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    // Clear auth data
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('auth_user');
                    localStorage.removeItem('userData');
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('authToken');
                    sessionStorage.clear();
                    
                    // Redirect
                    window.location.href = '/login.html';
                }
            });
        }
        
        // Mark as cleaned
        window.ownerPageCleaned = true;
        console.log('✅ Owner page cleaned and optimized');
    }
    
    // Run cleanup when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOnce);
    } else {
        // Small delay to let other scripts load first
        setTimeout(initializeOnce, 100);
    }
    
    // Export for global use
    window.ownerCleanup = {
        clean: cleanupDuplicates,
        init: initializeOnce,
        navigate: navigateToPage
    };
    
})();