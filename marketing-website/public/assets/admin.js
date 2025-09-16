// Admin Panel JavaScript
let currentUser = null;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;

// API Configuration - Updated to use deployed backend
window.API_BASE_URL = window.API_BASE_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:4001' 
    : 'https://daetspa-backend.onrender.com');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
    if (token) {
        // If using userToken, copy it to adminToken for compatibility
        if (!localStorage.getItem('adminToken') && localStorage.getItem('userToken')) {
            localStorage.setItem('adminToken', localStorage.getItem('userToken'));
            
            // Also copy userData if needed
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    currentUser = user;
                } catch (error) {
                    console.error('Error parsing userData:', error);
                }
            }
        }
        showDashboard();
        loadDashboard();
    } else {
        showLogin();
    }
});

// Show/Hide sections
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
}

// Login form handler
document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('adminToken', data.token);
            currentUser = data.user;
            
            // Show role-based title
            const roleTitle = data.user.role === 'superAdmin' ? 'Platform Owner' : 'Admin';
            document.getElementById('adminName').textContent = `${data.user.firstName} (${roleTitle})`;
            
            showDashboard();
            loadDashboard();
            loadSyncStats(); // Load sync stats on login
        } else {
            showError('loginError', data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('loginError', 'Network error. Please try again.');
    }
});

// Load dashboard data
async function loadDashboard() {
    try {
        const token = localStorage.getItem('adminToken');
        
        // Set admin name if currentUser is available
        if (currentUser) {
            const roleTitle = currentUser.role === 'superAdmin' ? 'Platform Owner' : 'Admin';
            document.getElementById('adminName').textContent = `${currentUser.firstName} (${roleTitle})`;
        }
        
        // Load stats
        const statsResponse = await fetch(`${window.API_BASE_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            updateDashboardStats(statsData.stats);
        }
        
        // Load users
        await loadUsers();
        
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

// Update dashboard stats
function updateDashboardStats(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
    document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
    document.getElementById('totalRevenue').textContent = `₱${(stats.totalRevenue || 0).toLocaleString()}`;
    
    const paidUsers = stats.planDistribution ? 
        stats.planDistribution.filter(p => p._id !== 'free').reduce((sum, p) => sum + p.count, 0) : 0;
    document.getElementById('paidUsers').textContent = paidUsers;
}

// Load users
async function loadUsers() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            allUsers = data.users || [];
            filteredUsers = [...allUsers];
            renderUsers();
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Load users error:', error);
        document.getElementById('usersContainer').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Users</h3>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

// Render users table
function renderUsers() {
    const container = document.getElementById('usersContainer');
    
    if (filteredUsers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Users Found</h3>
                <p>No users match your current filters.</p>
            </div>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);
    
    // Debug: Check user object structure
    console.log('Rendering users. First user structure:', pageUsers[0]);
    
    const tableHTML = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Business</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pageUsers.map(user => `
                    <tr>
                        <td>
                            <div class="user-info">
                                <div class="user-name">${user.firstName} ${user.lastName}</div>
                                <div class="user-email">${user.email}</div>
                            </div>
                        </td>
                        <td>${user.businessName}</td>
                        <td>
                            <span class="role-badge role-${user.role}">
                                ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                        </td>
                        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>${user.businessMetrics?.lastActiveDate ? new Date(user.businessMetrics.lastActiveDate).toLocaleDateString() : 'Never'}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="editUser('${user._id || user.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="changeUserRole('${user._id || user.id}', '${user.email}', '${user.role}')">
                                <i class="fas fa-user-cog"></i> Role
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${renderPagination()}
    `;
    
    container.innerHTML = tableHTML;
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (totalPages <= 1) return '';
    
    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="changePage(${currentPage - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="page-btn active">${i}</button>`;
        } else {
            paginationHTML += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="changePage(${currentPage + 1})">Next</button>`;
    }
    
    paginationHTML += '</div>';
    return paginationHTML;
}

// Change page
function changePage(page) {
    currentPage = page;
    renderUsers();
}

// Filter users
function filterUsers() {
    const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter')?.value;
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            user.firstName.toLowerCase().includes(searchTerm) ||
            user.lastName.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.businessName.toLowerCase().includes(searchTerm);
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        
        return matchesSearch && matchesRole;
    });
    
    currentPage = 1;
    renderUsers();
}

// Edit user
window.editUser = function(userId) {
    console.log('Edit user clicked for:', userId);
    console.log('All users:', allUsers);
    
    const user = allUsers.find(u => u._id === userId || u.id === userId);
    if (!user) {
        console.error('User not found:', userId);
        console.log('Available user IDs:', allUsers.map(u => ({ id: u.id, _id: u._id, email: u.email })));
        alert('User not found. Please refresh the page and try again.');
        return;
    }
    
    console.log('Found user:', user);
    
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserInfo').textContent = `${user.firstName} ${user.lastName} (${user.email})`;
    document.getElementById('editNotes').value = user.notes || '';
    
    console.log('Opening modal...');
    document.getElementById('editUserModal').style.display = 'block';
}

// Edit user form handler
document.getElementById('editUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const notes = document.getElementById('editNotes').value;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/users/${userId}/notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('modalSuccess', 'User notes updated successfully!');
            setTimeout(() => {
                closeModal();
                loadUsers();
            }, 1500);
        } else {
            showError('modalError', data.error || 'Update failed');
        }
    } catch (error) {
        console.error('Update user error:', error);
        showError('modalError', 'Network error. Please try again.');
    }
});

// Refresh users
async function refreshUsers() {
    document.getElementById('usersContainer').innerHTML = '<div class="loading">Loading users...</div>';
    await loadUsers();
}

// Close modal
window.closeModal = function() {
    document.getElementById('editUserModal').style.display = 'none';
    hideMessage('modalError');
    hideMessage('modalSuccess');
}

// Logout
function logout() {
    // Remove all authentication tokens and user data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    
    // Clear current user
    currentUser = null;
    
    // Redirect to marketing website homepage (completely logged out)
    window.location.href = '/';
}

// Utility functions
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => hideMessage(elementId), 5000);
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => hideMessage(elementId), 3000);
}

function hideMessage(elementId) {
    document.getElementById(elementId).style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const editModal = document.getElementById('editUserModal');
    const roleModal = document.getElementById('changeRoleModal');
    
    if (e.target === editModal) {
        closeModal();
    }
    
    if (e.target === roleModal) {
        closeRoleModal();
    }
});

// Sync Management Functions
async function cleanupOldSyncs() {
    if (!confirm('This will delete old sync data to save cloud storage. Continue?')) {
        return;
    }

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/cleanup-syncs`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const result = await response.json();
            alert(`Cleanup completed! Deleted ${result.deletedSyncs} old sync records and freed ${result.freedSpace} MB of storage.`);
            loadSyncStats();
        } else {
            throw new Error('Cleanup failed');
        }
    } catch (error) {
        console.error('Cleanup error:', error);
        alert('Cleanup failed. Please try again.');
    }
}

async function loadSyncStats() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/sync-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalSyncs').textContent = stats.totalSyncs || 0;
            document.getElementById('activeSyncs').textContent = stats.activeSyncs || 0;
            document.getElementById('oldSyncs').textContent = stats.oldSyncs || 0;
            document.getElementById('storageUsed').textContent = `${stats.storageUsed || 0} MB`;
        }
    } catch (error) {
        console.error('Failed to load sync stats:', error);
    }
}

// Change user role (superAdmin only) - Open modal
window.changeUserRole = function(userId, email, currentRole) {
    // Only allow superAdmin to change roles
    if (!currentUser || currentUser.role !== 'superAdmin') {
        alert('Access denied. Only Platform Owner can change user roles.');
        return;
    }
    
    // Set the modal fields
    document.getElementById('changeRoleUserId').value = userId;
    document.getElementById('changeRoleUserEmail').value = email;
    document.getElementById('changeRoleUserInfo').textContent = email;
    document.getElementById('currentRoleDisplay').textContent = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
    
    // Set the current role in select (disabled) and focus on new role
    const newRoleSelect = document.getElementById('newRoleSelect');
    newRoleSelect.value = ''; // Clear selection
    
    // Show the modal
    document.getElementById('changeRoleModal').style.display = 'block';
}

// Handle role change form submission
document.getElementById('changeRoleForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('changeRoleUserId').value;
    const email = document.getElementById('changeRoleUserEmail').value;
    const newRole = document.getElementById('newRoleSelect').value;
    const currentRole = document.getElementById('currentRoleDisplay').textContent.toLowerCase();
    
    if (!newRole) {
        showRoleError('Please select a new role.');
        return;
    }
    
    if (newRole === currentRole) {
        showRoleError('User already has this role.');
        return;
    }
    
    // Special confirmation for superAdmin promotion
    if (newRole === 'superAdmin') {
        if (!confirm(`⚠️ CRITICAL ACTION ⚠️\n\nYou are about to promote ${email} to SUPER ADMIN.\n\nThis will grant them FULL PLATFORM CONTROL including:\n• Ability to change ANY user roles (including yours)\n• Access to ALL admin functions\n• Complete system management\n\nAre you absolutely sure?`)) {
            return;
        }
    }
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                role: newRole
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showRoleSuccess(`✅ Role updated for ${email} from ${currentRole} to ${newRole}`);
            setTimeout(() => {
                closeRoleModal();
                loadUsers(); // Refresh the user list
            }, 2000);
        } else {
            showRoleError(`Failed to change role: ${data.error}`);
        }
        
    } catch (error) {
        console.error('Change role error:', error);
        showRoleError('Failed to change role. Please try again.');
    }
});

// Close role modal
window.closeRoleModal = function() {
    document.getElementById('changeRoleModal').style.display = 'none';
    hideMessage('roleModalError');
    hideMessage('roleModalSuccess');
    document.getElementById('changeRoleForm').reset();
}

// Role modal utility functions
function showRoleError(message) {
    const element = document.getElementById('roleModalError');
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => hideMessage('roleModalError'), 5000);
}

function showRoleSuccess(message) {
    const element = document.getElementById('roleModalSuccess');
    element.textContent = message;
    element.style.display = 'block';
}

// Account Creation Functions
window.openCreateAccountModal = function() {
    document.getElementById('createAccountModal').style.display = 'block';
    hideMessage('createAccountError');
    hideMessage('createAccountSuccess');
}

window.closeCreateAccountModal = function() {
    document.getElementById('createAccountModal').style.display = 'none';
    hideMessage('createAccountError');
    hideMessage('createAccountSuccess');
    document.getElementById('createAccountForm').reset();
}

// Handle account creation form
document.getElementById('createAccountForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        role: document.getElementById('newAccountRole').value,
        firstName: document.getElementById('newAccountFirstName').value,
        lastName: document.getElementById('newAccountLastName').value,
        email: document.getElementById('newAccountEmail').value,
        password: document.getElementById('newAccountPassword').value,
        businessName: document.getElementById('newAccountBusinessName').value,
        phone: document.getElementById('newAccountPhone').value
    };
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/create-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showCreateAccountSuccess(`✅ Account created successfully for ${formData.email}`);
            setTimeout(() => {
                closeCreateAccountModal();
                loadUsers(); // Refresh user list
                loadBranchList(); // Refresh branch dropdown
            }, 2000);
        } else {
            showCreateAccountError(`Failed to create account: ${data.error}`);
        }
        
    } catch (error) {
        console.error('Account creation error:', error);
        showCreateAccountError('Failed to create account. Please try again.');
    }
});

// Branch Management Functions
window.loadBranchData = async function() {
    const branchId = document.getElementById('branchSelector').value;
    const container = document.getElementById('branchDataContainer');
    
    if (!branchId) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <h3>No Branch Selected</h3>
                <p>Select a branch from the dropdown to view their business data</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '<div class="loading">Loading branch data... <span class="loading-spinner"></span></div>';
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/branch-data/${branchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderBranchData(data.branchData);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Data</h3>
                    <p>${data.error}</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Branch data error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Data</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function renderBranchData(branchData) {
    const { user, businessStats, recentTransactions, productCount } = branchData;
    
    const html = `
        <div class="branch-data-grid">
            <div class="branch-data-card">
                <h4><i class="fas fa-user"></i> Business Information</h4>
                <ul class="data-list">
                    <li><span>Business Name:</span> <span class="data-value">${user.businessName}</span></li>
                    <li><span>Owner:</span> <span class="data-value">${user.firstName} ${user.lastName}</span></li>
                    <li><span>Email:</span> <span class="data-value">${user.email}</span></li>
                    <li><span>Phone:</span> <span class="data-value">${user.phone || 'Not provided'}</span></li>
                    <li><span>Joined:</span> <span class="data-value">${new Date(user.createdAt).toLocaleDateString()}</span></li>
                </ul>
            </div>
            
            <div class="branch-data-card">
                <h4><i class="fas fa-chart-line"></i> Business Stats</h4>
                <ul class="data-list">
                    <li><span>Total Sales:</span> <span class="data-value">₱${businessStats.totalSales.toLocaleString()}</span></li>
                    <li><span>Total Transactions:</span> <span class="data-value">${businessStats.totalTransactions}</span></li>
                    <li><span>This Month:</span> <span class="data-value">₱${businessStats.monthSales.toLocaleString()}</span></li>
                    <li><span>Today:</span> <span class="data-value">₱${businessStats.todaySales.toLocaleString()}</span></li>
                    <li><span>Products:</span> <span class="data-value">${productCount}</span></li>
                </ul>
            </div>
            
            <div class="branch-data-card">
                <h4><i class="fas fa-receipt"></i> Recent Transactions</h4>
                ${recentTransactions.length > 0 ? `
                    <ul class="data-list">
                        ${recentTransactions.slice(0, 5).map(t => `
                            <li>
                                <span>${new Date(t.createdAt).toLocaleDateString()}</span>
                                <span class="data-value">₱${t.total.toLocaleString()}</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : '<p>No transactions yet</p>'}
            </div>
        </div>
    `;
    
    document.getElementById('branchDataContainer').innerHTML = html;
}

async function loadBranchList() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const selector = document.getElementById('branchSelector');
            selector.innerHTML = '<option value="">Select a branch to view data...</option>';
            
            data.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = `${user.businessName} (${user.firstName} ${user.lastName})`;
                selector.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Failed to load branch list:', error);
    }
}

// Utility functions for account creation
function showCreateAccountError(message) {
    const element = document.getElementById('createAccountError');
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => hideMessage('createAccountError'), 5000);
}

function showCreateAccountSuccess(message) {
    const element = document.getElementById('createAccountSuccess');
    element.textContent = message;
    element.style.display = 'block';
}

// Load branch list on dashboard load
const originalLoadDashboard = loadDashboard;
loadDashboard = async function() {
    await originalLoadDashboard();
    // Load branch list after main dashboard loads
    if (document.getElementById('branchSelector')) {
        setTimeout(loadBranchList, 500);
    }
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    const editModal = document.getElementById('editUserModal');
    const roleModal = document.getElementById('changeRoleModal');
    const createModal = document.getElementById('createAccountModal');
    
    if (e.target === editModal) {
        closeModal();
    }
    
    if (e.target === roleModal) {
        closeRoleModal();
    }
    
    if (e.target === createModal) {
        closeCreateAccountModal();
    }
});

// ============================================================================
// PAYROLL MANAGEMENT FUNCTIONS
// ============================================================================

// Global payroll state
let currentPayrollData = null;
let selectedEmployees = [];

// Load admin multi-branch payroll data
async function loadAdminPayrollData() {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
        // Load branch summary
        const periodStart = new Date();
        periodStart.setDate(1); // First day of current month
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1, 0); // Last day of current month

        const summaryResponse = await fetch(`${window.API_BASE_URL}/api/payroll/admin/summary?periodStart=${periodStart.toISOString()}&periodEnd=${periodEnd.toISOString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const employeesResponse = await fetch(`${window.API_BASE_URL}/api/payroll/admin/all-employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (summaryResponse.ok && employeesResponse.ok) {
            const summaryData = await summaryResponse.json();
            const employeesData = await employeesResponse.json();

            updateAdminPayrollStats(summaryData.data, employeesData.data);
        }
    } catch (error) {
        console.error('Failed to load admin payroll data:', error);
    }
}

// Update admin payroll statistics
function updateAdminPayrollStats(summaryData, employeesData) {
    const totalBranches = document.getElementById('totalBranches');
    const totalEmployees = document.getElementById('totalEmployees');
    const totalMonthlyPayroll = document.getElementById('totalMonthlyPayroll');
    const avgBranchPayroll = document.getElementById('avgBranchPayroll');

    if (totalBranches) totalBranches.textContent = summaryData.branches.length || 0;
    if (totalEmployees) totalEmployees.textContent = summaryData.totals?.totalEmployees || 0;
    if (totalMonthlyPayroll) totalMonthlyPayroll.textContent = formatCurrency(summaryData.totals?.totalNetPay || 0);
    if (avgBranchPayroll) {
        const avgPayroll = summaryData.branches.length > 0 ? 
            (summaryData.totals?.totalNetPay || 0) / summaryData.branches.length : 0;
        avgBranchPayroll.textContent = formatCurrency(avgPayroll);
    }
}

// Load branch-specific payroll data
async function loadBranchPayrollData() {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
        // Load branch employees
        const employeesResponse = await fetch(`${window.API_BASE_URL}/api/payroll/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Load recent payroll records
        const recordsResponse = await fetch(`${window.API_BASE_URL}/api/payroll/records?limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (employeesResponse.ok && recordsResponse.ok) {
            const employeesData = await employeesResponse.json();
            const recordsData = await recordsResponse.json();

            updateBranchPayrollStats(employeesData.data, recordsData.data);
            renderBranchPayrollActivity(recordsData.data);
        }
    } catch (error) {
        console.error('Failed to load branch payroll data:', error);
    }
}

// Update branch payroll statistics
function updateBranchPayrollStats(employees, records) {
    const activeEmployees = document.getElementById('branchActiveEmployees');
    const monthlyPayroll = document.getElementById('branchMonthlyPayroll');
    const pendingPayrolls = document.getElementById('branchPendingPayrolls');
    const avgSalary = document.getElementById('branchAvgSalary');
    const employeeCount = document.getElementById('payrollEmployeeCount');

    if (activeEmployees) activeEmployees.textContent = employees.length || 0;
    if (employeeCount) employeeCount.textContent = employees.length || 0;

    // Calculate current month totals
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthRecords = records.filter(record => {
        const recordDate = new Date(record.periodStart);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    });

    const totalMonthly = thisMonthRecords.reduce((sum, record) => sum + (record.netPay || 0), 0);
    const pendingCount = records.filter(record => record.status === 'pending' || record.status === 'draft').length;
    const avgMonthlySalary = employees.length > 0 ? 
        employees.reduce((sum, emp) => sum + (emp.monthlyRate || 0), 0) / employees.length : 0;

    if (monthlyPayroll) monthlyPayroll.textContent = formatCurrency(totalMonthly);
    if (pendingPayrolls) pendingPayrolls.textContent = pendingCount;
    if (avgSalary) avgSalary.textContent = formatCurrency(avgMonthlySalary);
}

// Render branch payroll activity table
function renderBranchPayrollActivity(records) {
    const tbody = document.getElementById('branchPayrollActivityBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-light);">
                    No payroll records found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => `
        <tr>
            <td style="padding: 12px;">
                <div style="font-weight: 500;">${record.employeeId?.firstName || 'N/A'} ${record.employeeId?.lastName || ''}</div>
                <div style="font-size: 0.8rem; color: #6b7280;">${record.employeeId?.position || ''}</div>
            </td>
            <td style="padding: 12px;">
                <div style="font-size: 0.9rem;">${formatDateRange(record.periodStart, record.periodEnd)}</div>
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="font-weight: 500;">${formatCurrency(record.grossPay)}</span>
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="color: #ef4444;">${formatCurrency(record.totalDeductions || 0)}</span>
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="font-weight: 600; color: #059669;">${formatCurrency(record.netPay)}</span>
            </td>
            <td style="padding: 12px; text-align: center;">
                ${getPayrollStatusBadge(record.status)}
            </td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="viewPayrollRecord('${record._id}')" 
                        style="background: #3b82f6; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; margin-right: 0.25rem;">
                    View
                </button>
                ${record.status === 'processed' ? `
                <button onclick="markPayrollPaid('${record._id}')" 
                        style="background: #10b981; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
                    Mark Paid
                </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// Admin payroll modal functions
async function openBulkPayrollModal() {
    try {
        // Load all branch employees
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/payroll/admin/all-employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            populateBulkPayrollModal(data.data);
            document.getElementById('bulkPayrollModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to open bulk payroll modal:', error);
    }
}

function populateBulkPayrollModal(data) {
    const { branches, employees } = data;
    const branchSelect = document.getElementById('bulkPayrollBranchFilter');
    const employeesList = document.getElementById('bulkPayrollEmployeesList');

    // Populate branch filter
    if (branchSelect) {
        branchSelect.innerHTML = `
            <option value="">All Branches</option>
            ${branches.map(branch => `
                <option value="${branch._id}">${branch.businessName || branch.firstName + ' ' + branch.lastName}</option>
            `).join('')}
        `;
    }

    // Populate employees list
    if (employeesList) {
        employeesList.innerHTML = employees.map(employee => `
            <div class="employee-item" data-employee-id="${employee._id}" onclick="toggleEmployeeSelection('${employee._id}')">
                <input type="checkbox" id="emp_${employee._id}">
                <label for="emp_${employee._id}" style="margin-left: 0.5rem; cursor: pointer;">
                    ${employee.firstName} ${employee.lastName} - ${employee.position}
                    <div style="font-size: 0.8rem; color: #6b7280;">
                        ${employee.salaryType}: ${formatCurrency(employee.monthlyRate || employee.dailyRate || 0)}
                        ${employee.userId?.businessName ? `• ${employee.userId.businessName}` : ''}
                    </div>
                </label>
            </div>
        `).join('');
    }
}

// Branch payroll modal functions
async function openBranchPayrollCalculator() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/payroll/employees`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            populatePayrollCalculator(data.data);
            document.getElementById('branchPayrollCalculatorModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to open payroll calculator:', error);
    }
}

function populatePayrollCalculator(employees) {
    const employeeSelect = document.getElementById('payrollEmployeeSelect');
    
    if (employeeSelect) {
        employeeSelect.innerHTML = `
            <option value="">Select Employee</option>
            ${employees.map(employee => `
                <option value="${employee._id}" data-salary-type="${employee.salaryType}" 
                        data-rate="${employee.monthlyRate || employee.dailyRate || 0}">
                    ${employee.firstName} ${employee.lastName} - ${employee.position}
                </option>
            `).join('')}
        `;
    }

    // Set default period dates
    const periodStart = document.getElementById('payrollPeriodStart');
    const periodEnd = document.getElementById('payrollPeriodEnd');
    
    if (periodStart && periodEnd) {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        periodStart.value = firstDay.toISOString().split('T')[0];
        periodEnd.value = lastDay.toISOString().split('T')[0];
    }
}

async function calculateEmployeePayroll() {
    const employeeId = document.getElementById('payrollEmployeeSelect').value;
    const periodStart = document.getElementById('payrollPeriodStart').value;
    const periodEnd = document.getElementById('payrollPeriodEnd').value;

    if (!employeeId || !periodStart || !periodEnd) {
        alert('Please select employee and period dates');
        return;
    }

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/payroll/calculate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employeeId,
                periodStart,
                periodEnd
            })
        });

        if (response.ok) {
            const result = await response.json();
            displayPayrollCalculation(result.data);
        } else {
            const error = await response.json();
            alert('Calculation failed: ' + error.error);
        }
    } catch (error) {
        console.error('Failed to calculate payroll:', error);
        alert('Failed to calculate payroll');
    }
}

function displayPayrollCalculation(calculation) {
    const resultsDiv = document.getElementById('payrollCalculationResults');
    
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="payroll-calculation-summary">
                <h4>Payroll Calculation Results</h4>
                <div class="calculation-grid">
                    <div class="calc-item">
                        <label>Base Pay:</label>
                        <span>${formatCurrency(calculation.basePay)}</span>
                    </div>
                    <div class="calc-item">
                        <label>Allowances:</label>
                        <span>${formatCurrency(calculation.allowances || 0)}</span>
                    </div>
                    <div class="calc-item">
                        <label>Gross Pay:</label>
                        <span style="font-weight: 600;">${formatCurrency(calculation.grossPay)}</span>
                    </div>
                    <div class="calc-item">
                        <label>SSS:</label>
                        <span class="deduction">${formatCurrency(calculation.deductions?.sss || 0)}</span>
                    </div>
                    <div class="calc-item">
                        <label>PhilHealth:</label>
                        <span class="deduction">${formatCurrency(calculation.deductions?.philHealth || 0)}</span>
                    </div>
                    <div class="calc-item">
                        <label>Pag-IBIG:</label>
                        <span class="deduction">${formatCurrency(calculation.deductions?.pagIbig || 0)}</span>
                    </div>
                    <div class="calc-item">
                        <label>Withholding Tax:</label>
                        <span class="deduction">${formatCurrency(calculation.deductions?.withholdingTax || 0)}</span>
                    </div>
                    <div class="calc-item total">
                        <label>Net Pay:</label>
                        <span style="font-weight: bold; color: #059669;">${formatCurrency(calculation.netPay)}</span>
                    </div>
                </div>
                <div class="calculation-actions" style="margin-top: 1rem;">
                    <button onclick="processCalculatedPayroll()" 
                            style="background: #059669; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">
                        Process This Payroll
                    </button>
                </div>
            </div>
        `;
        
        // Store calculation for processing
        currentPayrollData = calculation;
        resultsDiv.style.display = 'block';
    }
}

async function processCalculatedPayroll() {
    if (!currentPayrollData) {
        alert('No payroll calculation available');
        return;
    }

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/payroll/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payrolls: [currentPayrollData]
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert('Payroll processed successfully!');
            closePayrollModals();
            loadBranchPayrollData(); // Refresh data
        } else {
            const error = await response.json();
            alert('Processing failed: ' + error.error);
        }
    } catch (error) {
        console.error('Failed to process payroll:', error);
        alert('Failed to process payroll');
    }
}

// Payroll history and settings functions
async function openBranchPayrollHistory() {
    document.getElementById('branchPayrollHistoryModal').style.display = 'block';
    await loadPayrollHistory();
}

async function openBranchPayrollSettings() {
    document.getElementById('branchPayrollSettingsModal').style.display = 'block';
    await loadPayrollSettings();
}

async function loadPayrollHistory() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/payroll/records?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderPayrollHistory(data.data);
        }
    } catch (error) {
        console.error('Failed to load payroll history:', error);
    }
}

function renderPayrollHistory(records) {
    const tbody = document.getElementById('payrollHistoryTableBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">No payroll history found</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${record.employeeId?.firstName || 'N/A'} ${record.employeeId?.lastName || ''}</td>
            <td>${formatDateRange(record.periodStart, record.periodEnd)}</td>
            <td style="text-align: center;">${formatCurrency(record.grossPay)}</td>
            <td style="text-align: center;">${formatCurrency(record.netPay)}</td>
            <td style="text-align: center;">${getPayrollStatusBadge(record.status)}</td>
            <td style="text-align: center;">
                <button onclick="viewPayrollRecord('${record._id}')" 
                        style="background: #3b82f6; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadPayrollSettings() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/payroll/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            populatePayrollSettings(data.data);
        }
    } catch (error) {
        console.error('Failed to load payroll settings:', error);
    }
}

function populatePayrollSettings(settings) {
    // Populate form fields with current settings
    const form = document.getElementById('payrollSettingsForm');
    if (form && settings) {
        const sssRate = form.querySelector('#sssContributionRate');
        const philHealthRate = form.querySelector('#philHealthRate');
        const pagIbigRate = form.querySelector('#pagIbigRate');
        
        if (sssRate) sssRate.value = (settings.governmentDeductions?.sss?.rate || 0.045) * 100;
        if (philHealthRate) philHealthRate.value = (settings.governmentDeductions?.philHealth?.rate || 0.02) * 100;
        if (pagIbigRate) pagIbigRate.value = (settings.governmentDeductions?.pagIbig?.rate || 0.02) * 100;
    }
}

// Utility functions for payroll
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount || 0);
}

function formatDateRange(start, end) {
    const startDate = new Date(start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    const endDate = new Date(end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startDate} - ${endDate}`;
}

function getPayrollStatusBadge(status) {
    const badges = {
        'draft': '<span style="background: #f59e0b; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem;">Draft</span>',
        'processed': '<span style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem;">Processed</span>',
        'paid': '<span style="background: #10b981; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem;">Paid</span>',
        'cancelled': '<span style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.7rem;">Cancelled</span>'
    };
    return badges[status] || status;
}

// Modal control functions
function closePayrollModals() {
    const modals = [
        'bulkPayrollModal',
        'payrollReportsModal', 
        'branchPayrollCalculatorModal',
        'branchPayrollHistoryModal',
        'branchPayrollSettingsModal'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    });
    
    // Reset forms and data
    currentPayrollData = null;
    selectedEmployees = [];
}

// Filter functions
function filterBranchPayrollActivity() {
    const filter = document.getElementById('branchPayrollStatusFilter').value;
    loadBranchPayrollData(); // Reload with filter - would need to implement filtering in API
}

function refreshBranchPayrollActivity() {
    loadBranchPayrollData();
}

// Individual payroll record actions
async function viewPayrollRecord(recordId) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/payroll/records/${recordId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            // Display record details in a modal or expanded view
            console.log('Payroll record:', data.data);
            // TODO: Implement detailed view modal
        }
    } catch (error) {
        console.error('Failed to load payroll record:', error);
    }
}

async function markPayrollPaid(recordId) {
    if (!confirm('Mark this payroll as paid?')) return;

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${window.API_BASE_URL}/api/payroll/records/${recordId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'paid',
                notes: 'Marked as paid via admin dashboard'
            })
        });

        if (response.ok) {
            alert('Payroll marked as paid successfully!');
            loadBranchPayrollData();
        } else {
            const error = await response.json();
            alert('Failed to update status: ' + error.error);
        }
    } catch (error) {
        console.error('Failed to mark payroll as paid:', error);
        alert('Failed to update payroll status');
    }
}

// Employee selection for bulk operations
function toggleEmployeeSelection(employeeId) {
    const checkbox = document.getElementById(`emp_${employeeId}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            selectedEmployees.push(employeeId);
        } else {
            selectedEmployees = selectedEmployees.filter(id => id !== employeeId);
        }
        
        updateBulkPayrollSummary();
    }
}

function updateBulkPayrollSummary() {
    const summary = document.getElementById('bulkPayrollSummary');
    if (summary) {
        summary.textContent = `${selectedEmployees.length} employees selected`;
    }
}

// Enhanced dashboard loading to include payroll data
const originalLoadDashboardEnhanced = loadDashboard;
loadDashboard = async function() {
    await originalLoadDashboardEnhanced();
    
    // Load payroll data if user has admin or branch role
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            if (user.role === 'admin') {
                setTimeout(loadAdminPayrollData, 1000);
            } else if (user.role === 'branch') {
                setTimeout(loadBranchPayrollData, 1000);
            }
        } catch (error) {
            console.error('Error parsing user data for payroll:', error);
        }
    }
};
