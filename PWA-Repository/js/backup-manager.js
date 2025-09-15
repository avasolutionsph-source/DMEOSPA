// Backup Manager UI Controller for Ava Solutions PWA
class BackupManager {
    constructor() {
        this.initialized = false;
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        // Wait for backup system to be ready
        if (!window.backupSystem) {
            console.log('⏳ Waiting for backup system...');
            setTimeout(() => this.init(), 500);
            return;
        }
        
        this.initialized = true;
        this.updateBackupStatus();
        console.log('✅ Backup Manager UI initialized');
    }

    async updateBackupStatus() {
        try {
            // Get backup stats
            const stats = await window.backupSystem.getBackupStats();
            const isEnabled = window.backupSystem.isEnabled;
            const schedule = window.backupSystem.getSchedule();
            
            // Update UI elements
            const statusText = document.getElementById('backupStatusText');
            const lastBackupTime = document.getElementById('lastBackupTime');
            const totalBackupsCount = document.getElementById('totalBackupsCount');
            const toggleBackupText = document.getElementById('toggleBackupText');
            
            if (statusText) {
                statusText.innerHTML = isEnabled ? '✅ Enabled' : '❌ Disabled';
                statusText.style.color = isEnabled ? '#28a745' : '#dc3545';
            }
            
            if (lastBackupTime && stats) {
                if (schedule.lastBackup) {
                    const date = new Date(schedule.lastBackup);
                    lastBackupTime.textContent = date.toLocaleString();
                } else {
                    lastBackupTime.textContent = 'Never';
                }
            }
            
            if (totalBackupsCount && stats) {
                totalBackupsCount.textContent = stats.totalBackups || 0;
            }
            
            if (toggleBackupText) {
                toggleBackupText.textContent = isEnabled ? 'Disable Auto' : 'Enable Auto';
            }
            
        } catch (error) {
            console.error('Failed to update backup status:', error);
        }
    }

    async createManualBackup() {
        try {
            // Show loading state
            const button = event.target;
            const originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating backup...';
            
            // Create backup
            const result = await window.backupSystem.createFullBackup('manual');
            
            // Show success
            showSuccess(`Backup created successfully! (${result.recordCounts.customers || 0} customers backed up)`);
            
            // Update status
            await this.updateBackupStatus();
            
            // Restore button
            button.disabled = false;
            button.innerHTML = originalText;
            
        } catch (error) {
            console.error('Backup failed:', error);
            showError('Failed to create backup: ' + error.message);
            
            // Restore button
            const button = event.target;
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-shield-alt"></i> Backup Now';
        }
    }

    async showBackupList() {
        try {
            const backups = await window.backupSystem.getBackupList();
            
            if (backups.length === 0) {
                showInfo('No backups found. Create your first backup now!');
                return;
            }
            
            // Create modal
            const modalHtml = `
                <div id="backupListModal" class="modal active">
                    <div class="modal-content large-modal">
                        <div class="modal-header">
                            <h2><i class="fas fa-list"></i> Available Backups (${backups.length})</h2>
                            <button class="modal-close" onclick="document.getElementById('backupListModal').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f8f9fa;">
                                        <th style="padding: 10px; text-align: left;">Date</th>
                                        <th style="padding: 10px; text-align: left;">Type</th>
                                        <th style="padding: 10px; text-align: left;">Size</th>
                                        <th style="padding: 10px; text-align: left;">Customers</th>
                                        <th style="padding: 10px; text-align: left;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${backups.map(backup => `
                                        <tr style="border-bottom: 1px solid #dee2e6;">
                                            <td style="padding: 10px;">${new Date(backup.date).toLocaleString()}</td>
                                            <td style="padding: 10px;">
                                                <span class="badge" style="background: ${backup.type === 'manual' ? '#007bff' : '#28a745'}; color: white; padding: 3px 8px; border-radius: 3px;">
                                                    ${backup.type}
                                                </span>
                                            </td>
                                            <td style="padding: 10px;">${(backup.size / 1024).toFixed(1)} KB</td>
                                            <td style="padding: 10px;">${backup.metadata?.recordCounts?.customers || 0}</td>
                                            <td style="padding: 10px;">
                                                <button class="btn btn-sm btn-info" onclick="window.backupManager.exportBackup(${backup.id})">
                                                    <i class="fas fa-download"></i>
                                                </button>
                                                <button class="btn btn-sm btn-success" onclick="window.backupManager.restoreBackup(${backup.id})">
                                                    <i class="fas fa-undo"></i>
                                                </button>
                                                <button class="btn btn-sm btn-danger" onclick="window.backupManager.deleteBackup(${backup.id})">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="document.getElementById('backupListModal').remove()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existing = document.getElementById('backupListModal');
            if (existing) existing.remove();
            
            // Add modal
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
        } catch (error) {
            console.error('Failed to show backup list:', error);
            showError('Failed to load backups');
        }
    }

    async exportBackup(backupId) {
        try {
            await window.backupSystem.exportBackup(backupId);
            showSuccess('Backup exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            showError('Failed to export backup');
        }
    }

    async exportLatestBackup() {
        try {
            const backups = await window.backupSystem.getBackupList();
            if (backups.length === 0) {
                showError('No backups available to export');
                return;
            }
            
            await window.backupSystem.exportBackup(backups[0].id);
            showSuccess('Latest backup exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            showError('Failed to export backup');
        }
    }

    async restoreBackup(backupId) {
        if (!confirm('⚠️ WARNING: This will replace all current data with the backup. Continue?')) {
            return;
        }
        
        try {
            // Show loading
            showInfo('Restoring backup... Please wait...');
            
            const result = await window.backupSystem.restoreFromBackup(backupId);
            
            showSuccess(`Backup restored successfully! ${result.recordCounts.customers || 0} customers restored.`);
            
            // Reload page to reflect changes
            setTimeout(() => {
                if (confirm('Page will reload to apply changes. OK?')) {
                    window.location.reload();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Restore failed:', error);
            showError('Failed to restore backup: ' + error.message);
        }
    }

    async deleteBackup(backupId) {
        if (!confirm('Delete this backup? This cannot be undone.')) {
            return;
        }
        
        try {
            await window.backupSystem.deleteBackup(backupId);
            showSuccess('Backup deleted');
            
            // Refresh the list
            this.showBackupList();
            await this.updateBackupStatus();
            
        } catch (error) {
            console.error('Delete failed:', error);
            showError('Failed to delete backup');
        }
    }

    async toggleAutoBackup() {
        try {
            const isEnabled = window.backupSystem.isEnabled;
            window.backupSystem.setEnabled(!isEnabled);
            
            await this.updateBackupStatus();
            
            showSuccess(isEnabled ? 'Automatic backups disabled' : 'Automatic backups enabled');
            
        } catch (error) {
            console.error('Toggle failed:', error);
            showError('Failed to toggle auto backup');
        }
    }
}

// Initialize backup manager UI
window.backupManager = new BackupManager();

// Auto-update status when settings page is shown
document.addEventListener('DOMContentLoaded', () => {
    // Update backup status when settings page is shown
    const originalShowPage = window.app?.showPage;
    if (originalShowPage) {
        window.app.showPage = function(pageName) {
            originalShowPage.call(this, pageName);
            if (pageName === 'settings' && window.backupManager) {
                window.backupManager.updateBackupStatus();
            }
        };
    }
});