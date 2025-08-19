// Dashboard Management
class DashboardManager {
    constructor() {
        this.salesChart = null;
        this.stats = {
            todaySales: 0,
            todayTransactions: 0,
            lowStockCount: 0,
            monthlyRevenue: 0
        };
    }

    async init() {
        // Check if user is on unpaid plan and show registration prompt
        if (window.entitlementsSystem?.currentPlan === 'unpaid') {
            this.showUnpaidDashboard();
            return;
        }

        // Role-specific dashboard initialization
        const role = window.roleManager?.activeEmployee?.role;
        if (role === 'therapist') {
            if (window.loadTherapistDashboard) await window.loadTherapistDashboard();
            return;
        } else if (role === 'rider') {
            if (window.loadRiderDashboard) await window.loadRiderDashboard();
            return;
        }

        await this.loadDashboardData();

        const perf = window.performanceProfile || 'balanced';
        if (perf === 'low') {
            // Skip chart rendering in low-performance mode
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:220px;color:var(--gray);font-size:0.95rem;background:var(--light);border-radius:12px;">
                        Sales chart disabled for performance
                    </div>
                `;
            }
        } else {
            // Defer chart initialization to idle time
            const defer = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
            defer(() => this.initializeChart());
        }
        await this.loadRecentTransactions();
        await this.loadLowStockAlerts();
    }

    showUnpaidDashboard() {
        const dashboardElement = document.getElementById('dashboard');
        if (dashboardElement) {
            dashboardElement.innerHTML = `
                <div style="padding: 2rem; text-align: center; max-width: 800px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem 2rem; border-radius: 16px; margin-bottom: 2rem;">
                        <i class="fas fa-chart-line" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.9;"></i>
                        <h1 style="margin-bottom: 1rem; font-size: 2.5rem;">Welcome to Ava Solutions</h1>
                        <p style="font-size: 1.2rem; opacity: 0.9; margin-bottom: 2rem;">
                            Your complete business management solution for spas, salons, and service businesses
                        </p>
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <a href="https://ava-solutions-marketing.netlify.app/register" target="_blank" 
                               class="btn btn-light btn-lg" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-user-plus"></i> Register Your Business
                            </a>
                            <button onclick="showLoginModalDirect()" class="btn btn-outline-light btn-lg">
                                <i class="fas fa-sign-in-alt"></i> Login
                            </button>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-bottom: 3rem;">
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #10b981;">
                            <i class="fas fa-cash-register" style="font-size: 2.5rem; color: #10b981; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Point of Sale</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Process transactions, manage cart, track sales with employee assignment and commission tracking.</p>
                            <span style="background: #dcfce7; color: #166534; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #f59e0b;">
                            <i class="fas fa-boxes" style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Inventory Management</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Track stock levels, manage suppliers, monitor expiry dates, and automate reorder alerts.</p>
                            <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #8b5cf6;">
                            <i class="fas fa-users" style="font-size: 2.5rem; color: #8b5cf6; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Employee & Payroll</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Manage staff, track attendance, process payroll with deductions, and monitor performance.</p>
                            <span style="background: #ede9fe; color: #6b21a8; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #ef4444;">
                            <i class="fas fa-door-open" style="font-size: 2.5rem; color: #ef4444; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Room Management</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Track massage rooms, session timers, and automatically assign rooms to services.</p>
                            <span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #06b6d4;">
                            <i class="fas fa-calendar-alt" style="font-size: 2.5rem; color: #06b6d4; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">Booking System</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Manage appointments, track cancellations, and analyze booking patterns.</p>
                            <span style="background: #cffafe; color: #155e75; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                        
                        <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-left: 4px solid #84cc16;">
                            <i class="fas fa-robot" style="font-size: 2.5rem; color: #84cc16; margin-bottom: 1rem;"></i>
                            <h3 style="margin-bottom: 0.5rem;">AI Assistant</h3>
                            <p style="color: #6b7280; margin-bottom: 1rem;">Get instant help, business insights, and automated support with our AI chatbot.</p>
                            <span style="background: #ecfccb; color: #365314; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                                <i class="fas fa-lock"></i> Registration Required
                            </span>
                        </div>
                    </div>
                    
                    <div style="background: #f9fafb; padding: 2rem; border-radius: 12px; border: 2px dashed #d1d5db;">
                        <h3 style="color: #374151; margin-bottom: 1rem;">
                            <i class="fas fa-info-circle" style="color: #6366f1;"></i>
                            Why Choose Ava Solutions?
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; text-align: left;">
                            <div>
                                <i class="fas fa-shield-alt" style="color: #10b981; margin-right: 0.5rem;"></i>
                                <strong>Secure & Reliable</strong>
                                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">Your data is encrypted and backed up</p>
                            </div>
                            <div>
                                <i class="fas fa-mobile-alt" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                                <strong>Mobile Optimized</strong>
                                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">Works on any device, anywhere</p>
                            </div>
                            <div>
                                <i class="fas fa-wifi" style="color: #8b5cf6; margin-right: 0.5rem;"></i>
                                <strong>Offline Capable</strong>
                                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">Continue working without internet</p>
                            </div>
                            <div>
                                <i class="fas fa-headset" style="color: #ef4444; margin-right: 0.5rem;"></i>
                                <strong>24/7 Support</strong>
                                <p style="font-size: 0.9rem; color: #6b7280; margin: 0;">Get help when you need it</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async loadDashboardData() {
        try {
            // Get local data first (for offline capability)
            const todayTransactions = await db.getTodayTransactions();
            this.stats.todayTransactions = todayTransactions.length;
            this.stats.todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);

            // Get monthly revenue
            this.stats.monthlyRevenue = await db.getMonthlyRevenue();

            // Get low stock count
            const lowStockItems = await db.getLowStockItems();
            this.stats.lowStockCount = lowStockItems.length;

            // Try to get synced data from Marketing Website (if online and logged in)
            await this.loadSyncedData();

            // Update UI
            this.updateStatsDisplay();
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadSyncedData() {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                console.log('📊 No token available, using local data only');
                return;
            }

            // Hardcoded API URL for production deployment
            const apiUrl = 'https://ava-marketing-api.onrender.com';

            console.log('📊 Fetching synced business stats from:', `${apiUrl}/api/business/stats`);

            const response = await fetch(`${apiUrl}/api/business/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const syncedStats = await response.json();
                console.log('📊 Synced stats received:', syncedStats);

                // Use synced data if available (overrides local data)
                if (syncedStats.totalSales > 0) {
                    this.stats.todaySales = syncedStats.totalSales;
                    console.log('💰 Using synced sales total:', syncedStats.totalSales);
                }
                if (syncedStats.totalTransactions > 0) {
                    this.stats.todayTransactions = syncedStats.totalTransactions;
                    console.log('📋 Using synced transaction count:', syncedStats.totalTransactions);
                }
                if (syncedStats.totalSales > 0) {
                    this.stats.monthlyRevenue = syncedStats.totalSales; // Use total sales as monthly revenue
                    console.log('📈 Using synced monthly revenue:', syncedStats.totalSales);
                }
            } else {
                console.log('📊 Could not fetch synced stats, using local data');
            }
        } catch (error) {
            console.log('📊 Error fetching synced data, using local data:', error.message);
        }
    }

    updateStatsDisplay() {
        // Update stat cards
        document.getElementById('todaySales').textContent = app.formatCurrency(this.stats.todaySales);
        document.getElementById('todayTransactions').textContent = this.stats.todayTransactions;
        document.getElementById('lowStockCount').textContent = this.stats.lowStockCount;
        document.getElementById('monthlyRevenue').textContent = app.formatCurrency(this.stats.monthlyRevenue);

        // Calculate and display percentage changes
        this.calculateGrowth();
    }

    async calculateGrowth() {
        try {
            // Get yesterday's data for comparison
            const allTransactions = await db.getAll('transactions');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            const yesterdayTransactions = allTransactions.filter(t => 
                new Date(t.date).toDateString() === yesterdayStr
            );
            
            const yesterdaySales = yesterdayTransactions.reduce((sum, t) => sum + t.total, 0);
            
            if (yesterdaySales > 0) {
                const growth = ((this.stats.todaySales - yesterdaySales) / yesterdaySales) * 100;
                const growthElement = document.querySelector('#todaySales').nextElementSibling;
                if (growthElement) {
                    growthElement.textContent = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
                    growthElement.className = `stat-change ${growth >= 0 ? 'positive' : 'negative'}`;
                }
            }

            // Calculate monthly growth
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthTransactions = allTransactions.filter(t => {
                const date = new Date(t.date);
                return date.getMonth() === lastMonth.getMonth() && 
                       date.getFullYear() === lastMonth.getFullYear();
            });
            
            const lastMonthRevenue = lastMonthTransactions.reduce((sum, t) => sum + t.total, 0);
            
            if (lastMonthRevenue > 0) {
                const monthlyGrowth = ((this.stats.monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
                const monthlyGrowthElement = document.querySelector('#monthlyRevenue').nextElementSibling;
                if (monthlyGrowthElement) {
                    monthlyGrowthElement.textContent = `${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth.toFixed(1)}%`;
                    monthlyGrowthElement.className = `stat-change ${monthlyGrowth >= 0 ? 'positive' : 'negative'}`;
                }
            }
        } catch (error) {
            console.error('Failed to calculate growth:', error);
        }
    }

    async initializeChart() {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        // If Chart.js hasn't been loaded yet (low perf), load it on demand now
        if (typeof Chart === 'undefined' && typeof window.deferChartLoad === 'function') {
            await new Promise((resolve) => { window.deferChartLoad(); setTimeout(resolve, 300); });
        }

        // Prepare data for last 7 days
        const salesData = await this.getSalesDataForChart();

        // Destroy existing chart if it exists
        if (this.salesChart) {
            this.salesChart.destroy();
        }

        const perf = window.performanceProfile || 'balanced';
        const tension = perf === 'low' ? 0.1 : 0.3;
        const animation = perf === 'low' ? false : { duration: perf === 'balanced' ? 300 : 600 };

        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: salesData.labels,
                datasets: [{
                    label: 'Daily Sales',
                    data: salesData.values,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: tension,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2, // Make chart wider than tall
                animation: animation,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Sales: ' + app.formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₱' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    async getSalesDataForChart() {
        const transactions = await db.getAll('transactions');
        const last7Days = [];
        const salesByDay = {};

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push(dateStr);
            salesByDay[dateStr] = 0;
        }

        // Aggregate sales by day
        transactions.forEach(t => {
            const dateStr = new Date(t.date).toISOString().split('T')[0];
            if (salesByDay.hasOwnProperty(dateStr)) {
                salesByDay[dateStr] += t.total;
            }
        });

        return {
            labels: last7Days.map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }),
            values: last7Days.map(date => salesByDay[date])
        };
    }

    async loadRecentTransactions() {
        try {
            const transactions = await db.getAll('transactions');
            const recentTransactions = transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);

            const container = document.getElementById('recentTransactionsList');
            if (!container) return;

            if (recentTransactions.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--gray);">No transactions yet</p>';
                return;
            }

            container.innerHTML = recentTransactions.map(t => `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--light);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <strong>Transaction #${t.id}</strong>
                        <strong>${app.formatCurrency(t.total)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--gray);">
                        <span>${app.formatDateTime(t.date)}</span>
                        <span>${t.items ? t.items.length : 0} items</span>
                    </div>
                    ${t.employeeId ? `<div style="font-size: 0.75rem; color: var(--gray); margin-top: 0.25rem;">Employee #${t.employeeId}</div>` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load recent transactions:', error);
        }
    }

    async loadLowStockAlerts() {
        try {
            const lowStockItems = await db.getLowStockItems();
            const container = document.getElementById('lowStockList');
            if (!container) return;

            if (lowStockItems.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--gray);">All items are well stocked!</p>';
                return;
            }

            container.innerHTML = lowStockItems.map(item => {
                const stockPercentage = (item.currentStock / item.minStock) * 100;
                const isOutOfStock = item.currentStock === 0;
                
                return `
                    <div style="padding: 0.75rem; background: ${isOutOfStock ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)'}; border-radius: 8px; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${item.name}</strong>
                                <div style="font-size: 0.875rem; color: var(--gray); margin-top: 0.25rem;">
                                    SKU: ${item.sku}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.25rem; font-weight: 700; color: ${isOutOfStock ? 'var(--danger-color)' : 'var(--warning-color)'};">
                                    ${item.currentStock}
                                </div>
                                <div style="font-size: 0.75rem; color: var(--gray);">
                                    Min: ${item.minStock}
                                </div>
                            </div>
                        </div>
                        ${isOutOfStock ? 
                            '<div style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: var(--danger-color); color: white; border-radius: 4px; font-size: 0.75rem; text-align: center;">OUT OF STOCK</div>' :
                            `<div style="margin-top: 0.5rem; height: 4px; background: var(--light); border-radius: 2px;">
                                <div style="height: 100%; width: ${Math.min(stockPercentage, 100)}%; background: var(--warning-color); border-radius: 2px;"></div>
                            </div>`
                        }
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load low stock alerts:', error);
        }
    }

    // Analytics methods
    async getBestSellingProducts() {
        const transactions = await db.getAll('transactions');
        const productSales = {};

        transactions.forEach(t => {
            if (t.items) {
                t.items.forEach(item => {
                    if (!productSales[item.name]) {
                        productSales[item.name] = {
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productSales[item.name].quantity += item.quantity;
                    productSales[item.name].revenue += item.price * item.quantity;
                });
            }
        });

        return Object.entries(productSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }

    async getRevenueByCategory() {
        const transactions = await db.getAll('transactions');
        const products = await db.getAll('products');
        const inventory = await db.getAll('inventory');
        
        const categoryRevenue = {};

        transactions.forEach(t => {
            if (t.items) {
                t.items.forEach(item => {
                    // Find the category for this item
                    let category = 'Uncategorized';
                    const product = products.find(p => p.id === item.id);
                    const inventoryItem = inventory.find(i => i.id === item.id);
                    
                    if (product && product.category) {
                        category = product.category;
                    } else if (inventoryItem && inventoryItem.category) {
                        category = inventoryItem.category;
                    }

                    if (!categoryRevenue[category]) {
                        categoryRevenue[category] = 0;
                    }
                    categoryRevenue[category] += item.price * item.quantity;
                });
            }
        });

        return categoryRevenue;
    }

    async getPeakHours() {
        const transactions = await db.getAll('transactions');
        const hourlyData = {};

        transactions.forEach(t => {
            const hour = new Date(t.date).getHours();
            if (!hourlyData[hour]) {
                hourlyData[hour] = {
                    transactions: 0,
                    revenue: 0
                };
            }
            hourlyData[hour].transactions++;
            hourlyData[hour].revenue += t.total;
        });

        return hourlyData;
    }

    refresh() {
        this.init();
    }
}

// Initialize dashboard manager
const dashboardManager = new DashboardManager();

// Load dashboard when page is shown
window.loadDashboard = async function() {
    await dashboardManager.init();
};

// Update low stock alerts function for other modules
window.updateLowStockAlerts = async function() {
    await dashboardManager.loadLowStockAlerts();
    const lowStockItems = await db.getLowStockItems();
    document.getElementById('lowStockCount').textContent = lowStockItems.length;
};
