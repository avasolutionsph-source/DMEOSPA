// SUBSCRIPTION MANAGEMENT FOR WEBSITE OWNER
// Only avasolutionsph@gmail.com can manage subscriptions

(function() {
    'use strict';
    
    console.log('💳 Subscription Manager Loading...');
    
    // Check if current user is website owner
    function isWebsiteOwner() {
        const userData = localStorage.getItem('userData') || localStorage.getItem('auth_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.email === 'avasolutionsph@gmail.com' || user.isWebsiteOwner === true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }
    
    // Subscription plans
    const SUBSCRIPTION_PLANS = {
        free: {
            name: 'Free',
            price: 0,
            features: ['Basic POS', '10 Bookings/month', '1 Employee'],
            limits: {
                bookings: 10,
                employees: 1,
                products: 10,
                inventory: false,
                reports: false
            }
        },
        basic: {
            name: 'Basic',
            price: 499,
            features: ['Full POS', '100 Bookings/month', '5 Employees', 'Basic Reports'],
            limits: {
                bookings: 100,
                employees: 5,
                products: 50,
                inventory: true,
                reports: 'basic'
            }
        },
        pro: {
            name: 'Professional',
            price: 999,
            features: ['Full POS', 'Unlimited Bookings', '20 Employees', 'Advanced Reports', 'Inventory Management'],
            limits: {
                bookings: -1, // Unlimited
                employees: 20,
                products: -1, // Unlimited
                inventory: true,
                reports: 'advanced'
            }
        },
        enterprise: {
            name: 'Enterprise',
            price: 2999,
            features: ['Everything in Pro', 'Unlimited Employees', 'Multi-branch', 'Custom Features', 'Priority Support'],
            limits: {
                bookings: -1,
                employees: -1,
                products: -1,
                inventory: true,
                reports: 'advanced',
                multiBranch: true,
                customFeatures: true
            }
        }
    };
    
    // Subscription Manager
    window.SubscriptionManager = {
        
        // Get all subscriptions (website owner only)
        getAllSubscriptions: async function() {
            if (!isWebsiteOwner()) {
                console.error('Unauthorized: Only website owner can view all subscriptions');
                return null;
            }
            
            try {
                const response = await fetch('https://ava-pwa-backend.onrender.com/api/subscriptions', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });
                return await response.json();
            } catch (error) {
                console.error('Failed to fetch subscriptions:', error);
                // Return demo data
                return [
                    {
                        businessId: 'demo-1',
                        businessName: 'JC Spa & Wellness',
                        email: 'jc@gmail.com',
                        plan: 'pro',
                        status: 'active',
                        startDate: '2024-01-01',
                        nextBilling: '2024-09-01'
                    },
                    {
                        businessId: 'demo-2',
                        businessName: 'Demo Spa Business',
                        email: 'demo@spa.com',
                        plan: 'basic',
                        status: 'active',
                        startDate: '2024-02-01',
                        nextBilling: '2024-09-01'
                    }
                ];
            }
        },
        
        // Update subscription plan (website owner only)
        updateSubscription: async function(businessId, newPlan) {
            if (!isWebsiteOwner()) {
                console.error('Unauthorized: Only website owner can update subscriptions');
                return null;
            }
            
            try {
                const response = await fetch(`https://ava-pwa-backend.onrender.com/api/subscriptions/${businessId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: JSON.stringify({ plan: newPlan })
                });
                return await response.json();
            } catch (error) {
                console.error('Failed to update subscription:', error);
                return { success: true, message: 'Subscription updated (demo mode)' };
            }
        },
        
        // Cancel subscription (website owner only)
        cancelSubscription: async function(businessId) {
            if (!isWebsiteOwner()) {
                console.error('Unauthorized: Only website owner can cancel subscriptions');
                return null;
            }
            
            if (!confirm('Are you sure you want to cancel this subscription?')) {
                return null;
            }
            
            try {
                const response = await fetch(`https://ava-pwa-backend.onrender.com/api/subscriptions/${businessId}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });
                return await response.json();
            } catch (error) {
                console.error('Failed to cancel subscription:', error);
                return { success: true, message: 'Subscription cancelled (demo mode)' };
            }
        },
        
        // Get subscription stats (website owner only)
        getSubscriptionStats: function() {
            if (!isWebsiteOwner()) {
                return null;
            }
            
            // Return demo stats
            return {
                totalSubscribers: 156,
                activeSubscribers: 142,
                monthlyRevenue: 141858, // PHP
                growthRate: 12.5, // Percentage
                planDistribution: {
                    free: 45,
                    basic: 52,
                    pro: 38,
                    enterprise: 7
                }
            };
        },
        
        // Check if user can access feature based on plan
        canAccessFeature: function(feature, userPlan = 'free') {
            const plan = SUBSCRIPTION_PLANS[userPlan];
            if (!plan) return false;
            
            switch(feature) {
                case 'inventory':
                    return plan.limits.inventory === true;
                case 'reports':
                    return plan.limits.reports !== false;
                case 'unlimited_bookings':
                    return plan.limits.bookings === -1;
                case 'multi_branch':
                    return plan.limits.multiBranch === true;
                default:
                    return true;
            }
        },
        
        // Get plan details
        getPlanDetails: function(planName) {
            return SUBSCRIPTION_PLANS[planName] || null;
        },
        
        // Get all plans
        getAllPlans: function() {
            return SUBSCRIPTION_PLANS;
        }
    };
    
    // Add subscription management UI for website owner
    if (isWebsiteOwner()) {
        console.log('✅ Website owner detected - Subscription management enabled');
        
        // Add subscription menu item if on admin page
        window.addEventListener('DOMContentLoaded', function() {
            const adminMenu = document.querySelector('.admin-menu');
            if (adminMenu && !document.querySelector('[data-page="subscriptions"]')) {
                const subscriptionLink = document.createElement('a');
                subscriptionLink.href = '#';
                subscriptionLink.className = 'admin-menu-item';
                subscriptionLink.setAttribute('data-page', 'subscriptions');
                subscriptionLink.innerHTML = '<i class="fas fa-credit-card"></i> Manage Subscriptions';
                subscriptionLink.onclick = function(e) {
                    e.preventDefault();
                    showSubscriptionManager();
                };
                adminMenu.appendChild(subscriptionLink);
            }
        });
    }
    
    // Show subscription manager UI
    function showSubscriptionManager() {
        if (!isWebsiteOwner()) {
            alert('Unauthorized: Only website owner can access this');
            return;
        }
        
        // This would open a subscription management interface
        console.log('Opening subscription manager...');
        // Implementation would go here
    }
    
    console.log('💳 Subscription Manager Ready');
    
})();