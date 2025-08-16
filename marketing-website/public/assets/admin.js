// Admin Panel JavaScript
let currentUser = null;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('adminToken');
    if (token) {
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
        const response = await fetch('/api/auth/admin-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        
        // Load stats
        const statsResponse = await fetch('/api/admin/stats', {
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
        const response = await fetch('/api/admin/users', {
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
    
    const tableHTML = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Business</th>
                    <th>Plan</th>
                    <th>Status</th>
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
                            <span class="plan-badge plan-${user.subscriptionPlan}">
                                ${user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1)}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge status-${user.subscriptionStatus}">
                                ${user.subscriptionStatus.charAt(0).toUpperCase() + user.subscriptionStatus.slice(1)}
                            </span>
                        </td>
                        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>${user.businessMetrics?.lastActiveDate ? new Date(user.businessMetrics.lastActiveDate).toLocaleDateString() : 'Never'}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="editUser('${user._id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="fixUserSubscription('${user._id}', '${user.email}', '${user.subscriptionPlan}')">
                                <i class="fas fa-wrench"></i> Fix
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
    const planFilter = document.getElementById('planFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            user.firstName.toLowerCase().includes(searchTerm) ||
            user.lastName.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.businessName.toLowerCase().includes(searchTerm);
        
        const matchesPlan = !planFilter || user.subscriptionPlan === planFilter;
        const matchesStatus = !statusFilter || user.subscriptionStatus === statusFilter;
        
        return matchesSearch && matchesPlan && matchesStatus;
    });
    
    currentPage = 1;
    renderUsers();
}

// Edit user
function editUser(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserInfo').textContent = `${user.firstName} ${user.lastName} (${user.email})`;
    document.getElementById('editPlan').value = user.subscriptionPlan;
    document.getElementById('editStatus').value = user.subscriptionStatus;
    document.getElementById('editNotes').value = user.notes || '';
    
    document.getElementById('editUserModal').style.display = 'block';
}

// Edit user form handler
document.getElementById('editUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const plan = document.getElementById('editPlan').value;
    const status = document.getElementById('editStatus').value;
    const notes = document.getElementById('editNotes').value;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/admin/users/${userId}/subscription`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ plan, status, notes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('modalSuccess', 'User subscription updated successfully!');
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
function closeModal() {
    document.getElementById('editUserModal').style.display = 'none';
    hideMessage('modalError');
    hideMessage('modalSuccess');
}

// Logout
function logout() {
    localStorage.removeItem('adminToken');
    currentUser = null;
    showLogin();
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
    const modal = document.getElementById('editUserModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Sync Management Functions
async function cleanupOldSyncs() {
    if (!confirm('This will delete old sync data to save cloud storage. Continue?')) {
        return;
    }

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/cleanup-syncs', {
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
        const response = await fetch('/api/admin/sync-stats', {
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

// Fix user subscription inconsistencies
async function fixUserSubscription(userId, email, currentPlan) {
    const newPlan = prompt(`Fix subscription for ${email}\nCurrent plan shown: ${currentPlan}\n\nEnter correct plan (unpaid, pro):`, currentPlan);
    
    if (!newPlan || !['unpaid', 'pro'].includes(newPlan.toLowerCase())) {
        alert('Invalid plan. Please use: unpaid or pro');
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/admin/fix-user-subscription/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subscriptionPlan: newPlan.toLowerCase(),
                subscriptionStatus: 'active'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Fixed subscription for ${email}\nNew plan: ${newPlan.toLowerCase()}`);
            loadUsers(); // Refresh the user list
        } else {
            alert(`❌ Failed to fix subscription: ${data.error}`);
        }
        
    } catch (error) {
        console.error('Fix subscription error:', error);
        alert('Failed to fix subscription. Please try again.');
    }
}
