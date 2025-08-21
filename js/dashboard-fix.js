// Dashboard Fix - Ensures dashboard loads correctly
(function() {
    'use strict';
    
    console.log('📊 Dashboard Fix initializing...');
    
    // Ensure dashboard function exists
    window.loadDashboard = async function() {
        console.log('📊 Loading dashboard data...');
        
        try {
            // Get dashboard elements
            const todaySalesEl = document.querySelector('#dashboard .stats-card:nth-child(1) .stats-value');
            const transactionsEl = document.querySelector('#dashboard .stats-card:nth-child(2) .stats-value');
            const lowStockEl = document.querySelector('#dashboard .stats-card:nth-child(3) .stats-value');
            const activeBookingsEl = document.querySelector('#dashboard .stats-card:nth-child(4) .stats-value');
            
            // Try to load from MongoDB API
            if (window.mongoAPI && window.mongoAPI.getDashboardData) {
                try {
                    const data = await window.mongoAPI.getDashboardData();
                    
                    if (todaySalesEl) todaySalesEl.textContent = `₱${data.todaySales || 0}`;
                    if (transactionsEl) transactionsEl.textContent = data.totalTransactions || 0;
                    if (lowStockEl) lowStockEl.textContent = data.lowStockItems || 0;
                    if (activeBookingsEl) activeBookingsEl.textContent = data.activeBookings || 0;
                } catch (error) {
                    console.warn('Could not load dashboard from API:', error);
                    // Use default values
                    if (todaySalesEl) todaySalesEl.textContent = '₱0.00';
                    if (transactionsEl) transactionsEl.textContent = '0';
                    if (lowStockEl) lowStockEl.textContent = '0';
                    if (activeBookingsEl) activeBookingsEl.textContent = '0';
                }
            } else {
                // Use default values if API not available
                if (todaySalesEl) todaySalesEl.textContent = '₱0.00';
                if (transactionsEl) transactionsEl.textContent = '0';
                if (lowStockEl) lowStockEl.textContent = '0';
                if (activeBookingsEl) activeBookingsEl.textContent = '0';
            }
            
            // Initialize sales chart
            initializeSalesChart();
            
            // Load recent transactions
            loadRecentTransactions();
            
            // Check low stock items
            checkLowStock();
            
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    };
    
    // Initialize sales chart
    function initializeSalesChart() {
        const chartContainer = document.getElementById('salesChart');
        if (chartContainer) {
            // Clear existing content
            chartContainer.innerHTML = '<p style="text-align: center; color: #999;">Sales chart disabled for performance</p>';
        }
    }
    
    // Load recent transactions
    window.loadRecentTransactions = async function() {
        const container = document.querySelector('.recent-transactions tbody') || 
                        document.querySelector('#recentTransactions');
        
        if (!container) return;
        
        try {
            if (window.mongoAPI && window.mongoAPI.getTransactions) {
                const transactions = await window.mongoAPI.getTransactions({ limit: 5 });
                
                if (transactions.length === 0) {
                    container.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transactions yet</td></tr>';
                } else {
                    container.innerHTML = transactions.map(t => `
                        <tr>
                            <td>${new Date(t.date).toLocaleDateString()}</td>
                            <td>${t.customerName || 'Walk-in'}</td>
                            <td>${t.items ? t.items.length : 0} items</td>
                            <td>₱${t.total || 0}</td>
                            <td><span class="badge badge-success">Completed</span></td>
                        </tr>
                    `).join('');
                }
            } else {
                container.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transactions yet</td></tr>';
            }
        } catch (error) {
            console.warn('Could not load transactions:', error);
            container.innerHTML = '<tr><td colspan="5" style="text-align: center;">No transactions yet</td></tr>';
        }
    };
    
    // Check low stock items
    async function checkLowStock() {
        const alertContainer = document.querySelector('.low-stock-alert') || 
                             document.querySelector('#lowStockAlert');
        
        if (!alertContainer) return;
        
        try {
            if (window.mongoAPI && window.mongoAPI.getInventory) {
                const inventory = await window.mongoAPI.getInventory();
                const lowStock = inventory.filter(item => item.quantity < (item.minQuantity || 10));
                
                if (lowStock.length > 0) {
                    alertContainer.innerHTML = `
                        <div class="alert alert-warning">
                            <strong>⚠️ Low Stock Alert</strong>
                            <p>${lowStock.length} items are low on stock!</p>
                            <ul>
                                ${lowStock.slice(0, 3).map(item => 
                                    `<li>${item.name}: ${item.quantity} remaining</li>`
                                ).join('')}
                            </ul>
                            ${lowStock.length > 3 ? `<p>And ${lowStock.length - 3} more...</p>` : ''}
                        </div>
                    `;
                } else {
                    alertContainer.innerHTML = `
                        <div class="alert alert-success">
                            <strong>✅ All items are well stocked!</strong>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.warn('Could not check stock levels:', error);
        }
    }
    
    // Auto-initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Check if dashboard is visible
        const dashboard = document.getElementById('dashboard');
        if (dashboard && (dashboard.classList.contains('active') || dashboard.style.display !== 'none')) {
            setTimeout(() => {
                window.loadDashboard();
            }, 500);
        }
    });
    
    // Also initialize if window loads
    window.addEventListener('load', function() {
        const dashboard = document.getElementById('dashboard');
        if (dashboard && (dashboard.classList.contains('active') || dashboard.style.display !== 'none')) {
            if (!window.dashboardLoaded) {
                window.dashboardLoaded = true;
                window.loadDashboard();
            }
        }
    });
    
    console.log('✅ Dashboard Fix ready');
})();