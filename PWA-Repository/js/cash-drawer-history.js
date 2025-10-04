// Cash Drawer History Management System
class CashDrawerHistoryManager {
    constructor() {
        this.sessions = [];
        this.filteredSessions = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 0;
        this.isInitialized = false;
        this.filters = {
            dateRange: '30',
            startDate: null,
            endDate: null,
            status: 'all',
            user: 'all',
            search: ''
        };
    }

    async init() {
        try {
            console.log('🏪 Initializing Cash Drawer History Manager...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadHistory();
            
            this.isInitialized = true;
            console.log('✅ Cash Drawer History Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Cash Drawer History Manager:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Date range change handler
        const dateRangeSelect = document.getElementById('dateRange');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                const customDateRange = document.getElementById('customDateRange');
                if (e.target.value === 'custom') {
                    customDateRange.style.display = 'flex';
                    this.setDefaultCustomDates();
                } else {
                    customDateRange.style.display = 'none';
                    this.filters.dateRange = e.target.value;
                    this.applyFilters();
                }
            });
        }

        // Custom date inputs
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', () => this.updateCustomDateFilter());
            endDateInput.addEventListener('change', () => this.updateCustomDateFilter());
        }

        // Search input with debouncing
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.applyFilters();
                }, 300);
            });
        }

        // Status and user filter changes
        const statusFilter = document.getElementById('statusFilter');
        const userFilter = document.getElementById('userFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }
        if (userFilter) {
            userFilter.addEventListener('change', (e) => {
                this.filters.user = e.target.value;
                this.applyFilters();
            });
        }

        // Pagination controls
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.previousPage());
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.nextPage());
        }

        // Print session button
        const printSessionBtn = document.getElementById('printSessionBtn');
        if (printSessionBtn) {
            printSessionBtn.addEventListener('click', () => this.printSessionDetails());
        }
    }

    setDefaultCustomDates() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) startDateInput.value = startDate.toISOString().split('T')[0];
        if (endDateInput) endDateInput.value = endDate.toISOString().split('T')[0];
    }

    updateCustomDateFilter() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
            this.filters.startDate = startDateInput.value;
            this.filters.endDate = endDateInput.value;
            this.filters.dateRange = 'custom';
            this.applyFilters();
        }
    }

    async loadHistory() {
        try {
            console.log('📊 Loading cash drawer history...');
            
            // Load from IndexedDB first (for offline support)
            if (window.db) {
                try {
                    this.sessions = await window.db.getAll('cashDrawerSessions') || [];
                    console.log(`📝 Loaded ${this.sessions.length} sessions from IndexedDB`);
                } catch (e) {
                    console.warn('⚠️ Could not load from IndexedDB:', e);
                    this.sessions = [];
                }
            }

            // Load from API if online
            if (navigator.onLine && window.HybridAPIClient) {
                try {
                    const response = await window.HybridAPIClient.get('/api/cash-drawer/sessions?limit=100');
                    if (response.success && response.data) {
                        this.sessions = response.data;
                        console.log(`🌐 Loaded ${this.sessions.length} sessions from API`);
                    }
                } catch (e) {
                    console.warn('⚠️ Could not load from API:', e);
                }
            }

            // Sort sessions by date (newest first)
            this.sessions.sort((a, b) => new Date(b.createdAt || b.openedAt) - new Date(a.createdAt || a.openedAt));

            // Populate user filter dropdown
            this.populateUserFilter();

            // Apply initial filters
            this.applyFilters();

        } catch (error) {
            console.error('❌ Error loading history:', error);
            this.showError('Failed to load cash drawer history');
        }
    }

    populateUserFilter() {
        const userFilter = document.getElementById('userFilter');
        if (!userFilter) return;

        // Get unique users from sessions
        const users = new Set();
        this.sessions.forEach(session => {
            if (session.openedByName) users.add(session.openedByName);
            if (session.closedByName) users.add(session.closedByName);
        });

        // Clear existing options except "All Users"
        userFilter.innerHTML = '<option value="all">All Users</option>';

        // Add user options
        Array.from(users).sort().forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            userFilter.appendChild(option);
        });
    }

    applyFilters() {
        console.log('🔍 Applying filters:', this.filters);

        this.filteredSessions = this.sessions.filter(session => {
            // Date range filter
            if (!this.passesDateFilter(session)) return false;

            // Status filter
            if (this.filters.status !== 'all' && session.status !== this.filters.status) return false;

            // User filter
            if (this.filters.user !== 'all') {
                const matchesOpener = session.openedByName === this.filters.user;
                const matchesCloser = session.closedByName === this.filters.user;
                if (!matchesOpener && !matchesCloser) return false;
            }

            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const searchableText = [
                    session.id || '',
                    session.sessionId || '',
                    session.openedByName || '',
                    session.closedByName || '',
                    session.notes || ''
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) return false;
            }

            return true;
        });

        // Reset to first page
        this.currentPage = 1;
        this.updateDisplay();
    }

    passesDateFilter(session) {
        const sessionDate = new Date(session.createdAt || session.openedAt);
        const now = new Date();

        if (this.filters.dateRange === 'custom') {
            if (this.filters.startDate && this.filters.endDate) {
                const startDate = new Date(this.filters.startDate);
                const endDate = new Date(this.filters.endDate);
                endDate.setHours(23, 59, 59, 999); // End of day
                return sessionDate >= startDate && sessionDate <= endDate;
            }
            return true;
        } else {
            const daysBack = parseInt(this.filters.dateRange);
            const cutoffDate = new Date(now);
            cutoffDate.setDate(cutoffDate.getDate() - daysBack);
            return sessionDate >= cutoffDate;
        }
    }

    updateDisplay() {
        this.updateStatistics();
        this.renderTable();
        this.updatePagination();
    }

    updateStatistics() {
        const totalSessions = this.filteredSessions.length;
        const totalCashHandled = this.filteredSessions.reduce((sum, session) => {
            const opening = session.openingFloat || 0;
            const closing = session.closingBalance || 0;
            return sum + Math.max(opening, closing);
        }, 0);

        const totalVariance = this.filteredSessions.reduce((sum, session) => {
            return sum + (session.variance || 0);
        }, 0);

        const avgDuration = this.calculateAverageDuration();

        // Update stat displays
        const totalSessionsEl = document.getElementById('total-sessions');
        const totalCashHandledEl = document.getElementById('total-cash-handled');
        const avgSessionDurationEl = document.getElementById('avg-session-duration');
        const totalVarianceEl = document.getElementById('total-variance');

        if (totalSessionsEl) totalSessionsEl.textContent = totalSessions;
        if (totalCashHandledEl) totalCashHandledEl.textContent = this.formatCurrency(totalCashHandled);
        if (avgSessionDurationEl) avgSessionDurationEl.textContent = avgDuration;
        if (totalVarianceEl) {
            totalVarianceEl.textContent = this.formatCurrency(Math.abs(totalVariance));
            totalVarianceEl.parentElement.className = `stat-content ${totalVariance >= 0 ? 'positive' : 'negative'}`;
        }
    }

    calculateAverageDuration() {
        const closedSessions = this.filteredSessions.filter(session => 
            session.status === 'closed' && session.openedAt && session.closedAt
        );

        if (closedSessions.length === 0) return '0h 0m';

        const totalDuration = closedSessions.reduce((sum, session) => {
            const start = new Date(session.openedAt);
            const end = new Date(session.closedAt);
            return sum + (end - start);
        }, 0);

        const avgDurationMs = totalDuration / closedSessions.length;
        const hours = Math.floor(avgDurationMs / (1000 * 60 * 60));
        const minutes = Math.floor((avgDurationMs % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    }

    renderTable() {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;

        if (this.filteredSessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem; color: #9ca3af;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">No sessions found</div>
                        <div style="font-size: 0.9rem;">Try adjusting your filters or search terms</div>
                    </td>
                </tr>
            `;
            return;
        }

        // Calculate pagination
        this.totalPages = Math.ceil(this.filteredSessions.length / this.pageSize);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredSessions.length);
        const currentPageSessions = this.filteredSessions.slice(startIndex, endIndex);

        tbody.innerHTML = currentPageSessions.map(session => {
            const sessionId = (session.sessionId || session.id || '').substring(0, 12) + '...';
            const openedAt = new Date(session.openedAt || session.createdAt).toLocaleString();
            const openedBy = session.openedByName || 'Unknown';
            const closedBy = session.closedByName || (session.status === 'open' ? 'N/A' : 'Unknown');
            const openingFloat = this.formatCurrency(session.openingFloat || 0);
            const closingBalance = session.closingBalance !== undefined ? 
                this.formatCurrency(session.closingBalance) : 'N/A';
            const variance = session.variance !== undefined ? session.variance : null;
            
            let varianceDisplay = 'N/A';
            let varianceClass = '';
            if (variance !== null) {
                const absVariance = Math.abs(variance);
                varianceDisplay = this.formatCurrency(absVariance);
                if (variance > 0) {
                    varianceDisplay = '+' + varianceDisplay;
                    varianceClass = 'variance-positive';
                } else if (variance < 0) {
                    varianceDisplay = '-' + varianceDisplay;
                    varianceClass = 'variance-negative';
                } else {
                    varianceClass = 'variance-zero';
                }
            }

            const statusBadge = session.status === 'open' ? 
                '<span class="badge badge-success">Open</span>' : 
                '<span class="badge badge-secondary">Closed</span>';

            return `
                <tr>
                    <td>
                        <code class="session-id" title="${session.sessionId || session.id}">${sessionId}</code>
                        ${statusBadge}
                    </td>
                    <td>${openedAt}</td>
                    <td>${openedBy}</td>
                    <td>${closedBy}</td>
                    <td>₱${openingFloat}</td>
                    <td>₱${closingBalance}</td>
                    <td><span class="variance ${varianceClass}">${varianceDisplay}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="window.cashDrawerHistoryManager.showSessionDetails('${session.id || session._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updatePagination() {
        const paginationInfo = document.getElementById('paginationInfo');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const pageNumbers = document.getElementById('pageNumbers');

        if (paginationInfo) {
            const startIndex = (this.currentPage - 1) * this.pageSize + 1;
            const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredSessions.length);
            paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredSessions.length} sessions`;
        }

        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }

        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= this.totalPages;
        }

        if (pageNumbers) {
            pageNumbers.innerHTML = this.generatePageNumbers();
        }
    }

    generatePageNumbers() {
        const maxVisiblePages = 5;
        const pages = [];
        
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage;
            pages.push(`
                <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="window.cashDrawerHistoryManager.goToPage(${i})"
                        ${isActive ? 'disabled' : ''}>
                    ${i}
                </button>
            `);
        }

        return pages.join('');
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
            this.updatePagination();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.renderTable();
            this.updatePagination();
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderTable();
        this.updatePagination();
    }

    async showSessionDetails(sessionId) {
        try {
            const session = this.sessions.find(s => (s.id || s._id) === sessionId);
            if (!session) {
                this.showError('Session not found');
                return;
            }

            // Try to get detailed session data from API
            let detailedSession = session;
            if (navigator.onLine && window.HybridAPIClient) {
                try {
                    const response = await window.HybridAPIClient.get(`/api/cash-drawer/sessions/${sessionId}`);
                    if (response.success && response.data) {
                        detailedSession = response.data;
                    }
                } catch (e) {
                    console.warn('Could not load detailed session data:', e);
                }
            }

            this.renderSessionDetailsModal(detailedSession);
            if (window.openModal) {
                window.openModal('sessionDetailsModal');
            }

        } catch (error) {
            console.error('Error showing session details:', error);
            this.showError('Failed to load session details');
        }
    }

    renderSessionDetailsModal(session) {
        const content = document.getElementById('sessionDetailsContent');
        if (!content) return;

        const duration = this.calculateSessionDuration(session.openedAt, session.closedAt);
        const variance = session.variance || 0;
        const variancePercent = session.expectedBalance ? 
            ((variance / session.expectedBalance) * 100).toFixed(2) : '0.00';

        content.innerHTML = `
            <div class="session-details-grid">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Session Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">Session ID:</span>
                            <span class="value"><code>${session.sessionId || session.id}</code></span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Status:</span>
                            <span class="value">
                                <span class="badge ${session.status === 'open' ? 'badge-success' : 'badge-secondary'}">
                                    ${session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                </span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Duration:</span>
                            <span class="value">${duration}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-user"></i> User Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">Opened By:</span>
                            <span class="value">${session.openedByName || 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Opened At:</span>
                            <span class="value">${new Date(session.openedAt).toLocaleString()}</span>
                        </div>
                        ${session.closedByName ? `
                        <div class="detail-item">
                            <span class="label">Closed By:</span>
                            <span class="value">${session.closedByName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Closed At:</span>
                            <span class="value">${new Date(session.closedAt).toLocaleString()}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-money-bill-wave"></i> Financial Details</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">Opening Float:</span>
                            <span class="value currency">₱${this.formatCurrency(session.openingFloat || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Expected Balance:</span>
                            <span class="value currency">₱${this.formatCurrency(session.expectedBalance || 0)}</span>
                        </div>
                        ${session.closingBalance !== undefined ? `
                        <div class="detail-item">
                            <span class="label">Closing Balance:</span>
                            <span class="value currency">₱${this.formatCurrency(session.closingBalance)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Variance:</span>
                            <span class="value variance ${variance >= 0 ? 'positive' : 'negative'}">
                                ₱${this.formatCurrency(Math.abs(variance))} 
                                (${variance >= 0 ? '+' : '-'}${Math.abs(variancePercent)}%)
                                ${variance > 0 ? ' Over' : variance < 0 ? ' Short' : ' Perfect'}
                            </span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="label">Total Cash Sales:</span>
                            <span class="value currency">₱${this.formatCurrency(session.totalCashSales || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Transaction Count:</span>
                            <span class="value">${session.transactionCount || 0}</span>
                        </div>
                    </div>
                </div>

                ${session.notes ? `
                <div class="detail-section">
                    <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                    <div class="notes-content">
                        ${session.notes}
                    </div>
                </div>
                ` : ''}

                ${session.cashTransactions && session.cashTransactions.length > 0 ? `
                <div class="detail-section">
                    <h4><i class="fas fa-list"></i> Transactions (${session.cashTransactions.length})</h4>
                    <div class="transactions-list">
                        ${session.cashTransactions.map(tx => `
                            <div class="transaction-item">
                                <span class="transaction-time">${new Date(tx.timestamp).toLocaleTimeString()}</span>
                                <span class="transaction-amount">₱${this.formatCurrency(tx.amount)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    calculateSessionDuration(openedAt, closedAt) {
        if (!openedAt) return 'Unknown';
        if (!closedAt) return 'Ongoing';

        const start = new Date(openedAt);
        const end = new Date(closedAt);
        const diffMs = end - start;

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    async refreshHistory() {
        try {
            const refreshBtn = document.getElementById('refresh-history-btn');
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                refreshBtn.disabled = true;
            }

            await this.loadHistory();
            this.showSuccess('History refreshed successfully');

        } catch (error) {
            console.error('Error refreshing history:', error);
            this.showError('Failed to refresh history');
        } finally {
            const refreshBtn = document.getElementById('refresh-history-btn');
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshBtn.disabled = false;
            }
        }
    }

    clearFilters() {
        // Reset filter values
        this.filters = {
            dateRange: '30',
            startDate: null,
            endDate: null,
            status: 'all',
            user: 'all',
            search: ''
        };

        // Reset UI elements
        const dateRangeSelect = document.getElementById('dateRange');
        const statusFilter = document.getElementById('statusFilter');
        const userFilter = document.getElementById('userFilter');
        const searchInput = document.getElementById('searchInput');
        const customDateRange = document.getElementById('customDateRange');

        if (dateRangeSelect) dateRangeSelect.value = '30';
        if (statusFilter) statusFilter.value = 'all';
        if (userFilter) userFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        if (customDateRange) customDateRange.style.display = 'none';

        // Reapply filters
        this.applyFilters();
    }

    exportHistory() {
        try {
            const csvContent = this.generateCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `cash-drawer-history-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showSuccess('History exported successfully');

        } catch (error) {
            console.error('Error exporting history:', error);
            this.showError('Failed to export history');
        }
    }

    generateCSV() {
        const headers = [
            'Session ID',
            'Date',
            'Time',
            'Opened By',
            'Closed By',
            'Opening Float',
            'Closing Balance',
            'Expected Balance',
            'Variance',
            'Total Cash Sales',
            'Transaction Count',
            'Status',
            'Duration',
            'Notes'
        ];

        const rows = this.filteredSessions.map(session => {
            const openedAt = new Date(session.openedAt || session.createdAt);
            const duration = this.calculateSessionDuration(session.openedAt, session.closedAt);
            
            return [
                session.sessionId || session.id || '',
                openedAt.toLocaleDateString(),
                openedAt.toLocaleTimeString(),
                session.openedByName || '',
                session.closedByName || '',
                session.openingFloat || 0,
                session.closingBalance || '',
                session.expectedBalance || 0,
                session.variance || 0,
                session.totalCashSales || 0,
                session.transactionCount || 0,
                session.status || '',
                duration,
                (session.notes || '').replace(/"/g, '""') // Escape quotes for CSV
            ];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    printSessionDetails() {
        window.print();
    }

    formatCurrency(amount) {
        if (window.formatCurrency && typeof window.formatCurrency === 'function') {
            return window.formatCurrency(amount || 0);
        }
        return (amount || 0).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    showSuccess(message) {
        if (window.showSuccess) {
            window.showSuccess(message);
        } else {
            console.log('✅ Success:', message);
        }
    }

    showError(message) {
        if (window.showError) {
            window.showError(message);
        } else {
            console.error('❌ Error:', message);
        }
    }
}

// Auto-initialize when DOM is ready
console.log('🏪 Cash Drawer History Manager script loading...');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🏪 DOM Content Loaded - initializing CashDrawerHistoryManager');
        if (!window.cashDrawerHistoryManager) {
            window.cashDrawerHistoryManager = new CashDrawerHistoryManager();
            console.log('✅ CashDrawerHistoryManager instance created');
        }
    });
} else {
    console.log('🏪 DOM already ready - initializing CashDrawerHistoryManager immediately');
    if (!window.cashDrawerHistoryManager) {
        window.cashDrawerHistoryManager = new CashDrawerHistoryManager();
        console.log('✅ CashDrawerHistoryManager instance created');
    }
}

console.log('🏪 Cash Drawer History Manager class loaded and setup complete');