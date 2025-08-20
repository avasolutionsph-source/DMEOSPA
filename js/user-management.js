// User Management System for Permanent Authentication
class UserManagementSystem {
    constructor() {
        this.users = [];
    }

    // Initialize user management
    async init() {
        console.log('👥 Initializing User Management System...');
        await this.loadUsers();
        this.setupEventListeners();
    }

    // Load users from permanent auth system
    async loadUsers() {
        if (window.permanentAuth) {
            try {
                this.users = window.permanentAuth.getAllUsers();
                console.log('✅ Loaded users:', this.users.length);
            } catch (error) {
                console.warn('Could not load users (not admin):', error);
                this.users = [];
            }
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Add user button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showAddUserModal());
        }

        // User management table
        this.renderUserTable();
    }

    // Show add user modal
    showAddUserModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-user-plus"></i> Add New User</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="newUserEmail" class="form-input" placeholder="user@yourbusiness.com" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="newUserPassword" class="form-input" placeholder="Temporary password" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Role</label>
                        <select id="newUserRole" class="form-input" required>
                            <option value="">Select role...</option>
                            <option value="owner">Owner (Full Access)</option>
                            <option value="manager">Manager (Management)</option>
                            <option value="therapist">Therapist (Appointments Only)</option>
                            <option value="receptionist">Receptionist (Front Desk)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" id="newUserFirstName" class="form-input" placeholder="First Name" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" id="newUserLastName" class="form-input" placeholder="Last Name">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" id="createUserBtn">Create User</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle user creation
        document.getElementById('createUserBtn').onclick = () => {
            this.createNewUser(modal);
        };
    }

    // Create new user
    async createNewUser(modal) {
        try {
            const email = document.getElementById('newUserEmail').value.trim();
            const password = document.getElementById('newUserPassword').value;
            const role = document.getElementById('newUserRole').value;
            const firstName = document.getElementById('newUserFirstName').value.trim();
            const lastName = document.getElementById('newUserLastName').value.trim();

            if (!email || !password || !role || !firstName) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            const userData = {
                email: email,
                password: password,
                role: role,
                businessName: window.permanentAuth.currentUser?.businessName || 'Spa Business',
                firstName: firstName,
                lastName: lastName
            };

            await window.permanentAuth.createUser(userData);
            
            modal.remove();
            showNotification(`User ${email} created successfully!`, 'success');
            
            // Refresh user list
            await this.loadUsers();
            this.renderUserTable();

        } catch (error) {
            console.error('Create user error:', error);
            showNotification(error.message || 'Failed to create user', 'error');
        }
    }

    // Render user management table
    renderUserTable() {
        const container = document.getElementById('userManagementTable');
        if (!container) return;

        if (this.users.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No users found. Only admins can view user list.</p>';
            return;
        }

        const tableHtml = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.users.map(user => `
                            <tr>
                                <td>${user.email}</td>
                                <td>${user.firstName} ${user.lastName}</td>
                                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                                <td><span class="status-badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" onclick="userManagement.editUser('${user.email}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="userManagement.resetPassword('${user.email}')">
                                        <i class="fas fa-key"></i>
                                    </button>
                                    ${user.email !== window.permanentAuth.currentUser?.email ? 
                                        `<button class="btn btn-sm btn-danger" onclick="userManagement.toggleUserStatus('${user.email}')">
                                            <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                                        </button>` : ''
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;
    }

    // Edit user
    editUser(email) {
        const user = this.users.find(u => u.email === email);
        if (!user) return;

        // Create edit modal (similar to add user modal but pre-filled)
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-user-edit"></i> Edit User: ${user.email}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Role</label>
                        <select id="editUserRole" class="form-input">
                            <option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Owner (Full Access)</option>
                            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager (Management)</option>
                            <option value="therapist" ${user.role === 'therapist' ? 'selected' : ''}>Therapist (Appointments Only)</option>
                            <option value="receptionist" ${user.role === 'receptionist' ? 'selected' : ''}>Receptionist (Front Desk)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" id="editUserFirstName" class="form-input" value="${user.firstName}">
                    </div>
                    
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" id="editUserLastName" class="form-input" value="${user.lastName}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="userManagement.saveUserEdit('${user.email}', this.closest('.modal'))">Save Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Save user edit
    async saveUserEdit(email, modal) {
        try {
            const newRole = document.getElementById('editUserRole').value;
            
            if (newRole !== this.users.find(u => u.email === email)?.role) {
                await window.permanentAuth.updateUserRole(email, newRole);
                showNotification('User role updated successfully!', 'success');
            }

            modal.remove();
            await this.loadUsers();
            this.renderUserTable();

        } catch (error) {
            console.error('Edit user error:', error);
            showNotification(error.message || 'Failed to update user', 'error');
        }
    }

    // Reset user password
    async resetPassword(email) {
        const newPassword = prompt(`Enter new password for ${email}:`);
        if (!newPassword) return;

        if (newPassword.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            await window.permanentAuth.resetUserPassword(email, newPassword);
            showNotification(`Password reset for ${email}. New password: ${newPassword}`, 'success');
        } catch (error) {
            console.error('Reset password error:', error);
            showNotification(error.message || 'Failed to reset password', 'error');
        }
    }

    // Toggle user status
    async toggleUserStatus(email) {
        try {
            await window.permanentAuth.deactivateUser(email);
            showNotification(`User ${email} status updated`, 'success');
            
            await this.loadUsers();
            this.renderUserTable();
        } catch (error) {
            console.error('Toggle status error:', error);
            showNotification(error.message || 'Failed to update user status', 'error');
        }
    }
}

// Global user management instance
window.userManagement = new UserManagementSystem();

// Load user management when settings page is shown
window.loadUserManagement = async function() {
    console.log('👥 Loading user management...');
    await window.userManagement.init();
};

// Add user management section to settings
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const settingsPage = document.getElementById('settings');
        if (settingsPage && window.permanentAuth?.currentUser?.role === 'owner') {
            // Add user management section
            const userMgmtSection = document.createElement('div');
            userMgmtSection.innerHTML = `
                <div class="settings-section">
                    <h3><i class="fas fa-users-cog"></i> User Management</h3>
                    <div class="form-group">
                        <button class="btn btn-primary" id="addUserBtn">
                            <i class="fas fa-user-plus"></i> Add New User
                        </button>
                    </div>
                    <div id="userManagementTable">
                        <p style="color: #666;">Loading users...</p>
                    </div>
                </div>
            `;
            
            settingsPage.appendChild(userMgmtSection);
            
            // Initialize user management
            window.userManagement.init();
        }
    }, 2000);
});

// Add styles for user management
const userMgmtStyles = document.createElement('style');
userMgmtStyles.textContent = `
.role-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
}
.role-owner { background: #d4edda; color: #155724; }
.role-manager { background: #d1ecf1; color: #0c5460; }
.role-therapist { background: #f8d7da; color: #721c24; }
.role-receptionist { background: #fff3cd; color: #856404; }

.status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
}
.status-badge.active { background: #d4edda; color: #155724; }
.status-badge.inactive { background: #f8d7da; color: #721c24; }

.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
}
.data-table th,
.data-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #dee2e6;
}
.data-table th {
    background: #f8f9fa;
    font-weight: 600;
}
.btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    margin: 0 0.1rem;
}
`;
document.head.appendChild(userMgmtStyles);

console.log('👥 User Management System loaded');
