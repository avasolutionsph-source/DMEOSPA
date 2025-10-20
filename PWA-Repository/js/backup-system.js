// Automated Data Backup System for SPA PWA
class BackupSystem {
    constructor() {
        this.dbName = 'AvaBackupsDB';
        this.version = 1;
        this.db = null;
        this.isEnabled = this.getBackupSetting();
        this.backupInterval = 24 * 60 * 60 * 1000; // 24 hours
        this.maxBackups = 30; // Keep 30 backups max
        this.compressionEnabled = true;
        
        // Backup schedule settings
        this.scheduleSettings = {
            enabled: true,
            interval: 'daily', // daily, weekly, manual
            time: '02:00', // 2 AM
            lastBackup: null,
            autoCleanup: true
        };
        
        this.init();
    }

    async init() {
        try {
            await this.initBackupDB();
            await this.loadSettings();
            this.setupScheduler();
            console.log('🔄 Backup system initialized');
            
            // Log initialization
            if (window.logger) {
                window.logger.log({
                    type: 'BACKUP',
                    category: 'INIT',
                    level: 'INFO',
                    message: 'Backup system initialized',
                    data: {
                        enabled: this.isEnabled,
                        maxBackups: this.maxBackups,
                        interval: this.scheduleSettings.interval
                    }
                });
            }
        } catch (error) {
            console.error('Failed to initialize backup system:', error);
        }
    }

    async initBackupDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // Backups store
                if (!db.objectStoreNames.contains('backups')) {
                    const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
                    backupStore.createIndex('timestamp', 'timestamp', { unique: false });
                    backupStore.createIndex('type', 'type', { unique: false });
                    backupStore.createIndex('size', 'size', { unique: false });
                }

                // Backup metadata store
                if (!db.objectStoreNames.contains('metadata')) {
                    const metaStore = db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    getBackupSetting() {
        const stored = localStorage.getItem('ava_backup_enabled');
        return stored !== null ? stored === 'true' : true; // Default enabled
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('ava_backup_enabled', enabled.toString());
        
        if (enabled) {
            this.setupScheduler();
        } else {
            this.clearScheduler();
        }
        
        console.log(`🔄 Backup system ${enabled ? 'enabled' : 'disabled'}`);
    }

    async loadSettings() {
        try {
            if (!this.db) return;

            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            
            const request = store.get('schedule_settings');
            const result = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (result) {
                this.scheduleSettings = { ...this.scheduleSettings, ...result.value };
            }
        } catch (error) {
            console.error('Failed to load backup settings:', error);
        }
    }

    async saveSettings() {
        try {
            if (!this.db) return;

            const transaction = this.db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            
            await new Promise((resolve, reject) => {
                const request = store.put({
                    key: 'schedule_settings',
                    value: this.scheduleSettings
                });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to save backup settings:', error);
        }
    }

    setupScheduler() {
        if (!this.isEnabled || !this.scheduleSettings.enabled) return;

        this.clearScheduler();

        // Check for pending backups on startup
        this.checkScheduledBackup();

        // Set up periodic checks
        this.schedulerInterval = setInterval(() => {
            this.checkScheduledBackup();
        }, 60 * 60 * 1000); // Check every hour
    }

    clearScheduler() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
    }

    async checkScheduledBackup() {
        if (!this.scheduleSettings.enabled) return;

        const now = new Date();
        const lastBackup = this.scheduleSettings.lastBackup ? 
            new Date(this.scheduleSettings.lastBackup) : null;

        let shouldBackup = false;

        if (!lastBackup) {
            shouldBackup = true;
        } else {
            switch (this.scheduleSettings.interval) {
                case 'daily':
                    shouldBackup = now.getTime() - lastBackup.getTime() >= 24 * 60 * 60 * 1000;
                    break;
                case 'weekly':
                    shouldBackup = now.getTime() - lastBackup.getTime() >= 7 * 24 * 60 * 60 * 1000;
                    break;
                default:
                    shouldBackup = false;
            }
        }

        // Check if it's the right time of day
        if (shouldBackup && this.scheduleSettings.time) {
            const [targetHour, targetMinute] = this.scheduleSettings.time.split(':').map(Number);
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            // Allow 1-hour window for the backup
            if (currentHour !== targetHour && Math.abs(currentHour - targetHour) > 1) {
                shouldBackup = false;
            }
        }

        if (shouldBackup) {
            console.log('🔄 Running scheduled backup...');
            await this.createFullBackup('scheduled');
        }
    }

    async createFullBackup(type = 'manual', options = {}) {
        if (!this.isEnabled) {
            throw new Error('Backup system is disabled');
        }

        const startTime = performance.now();
        console.log('🔄 Starting full backup...');

        try {
            // Collect all data from main database
            const backupData = await this.collectAllData();
            
            // Create backup entry
            const backup = {
                timestamp: Date.now(),
                date: new Date().toISOString(),
                type: type, // 'manual', 'scheduled', 'auto'
                version: this.getAppVersion(),
                size: 0,
                compressed: this.compressionEnabled,
                data: backupData,
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    userId: this.getCurrentUserId(),
                    stores: Object.keys(backupData),
                    recordCounts: this.getRecordCounts(backupData)
                }
            };

            // Compress if enabled
            if (this.compressionEnabled) {
                backup.data = await this.compressData(backup.data);
            }

            // Calculate size
            backup.size = this.calculateBackupSize(backup);

            // Store backup
            const backupId = await this.storeBackup(backup);
            
            // Update last backup time
            if (type === 'scheduled') {
                this.scheduleSettings.lastBackup = new Date().toISOString();
                await this.saveSettings();
            }

            // Cleanup old backups
            if (this.scheduleSettings.autoCleanup) {
                await this.cleanupOldBackups();
            }

            const duration = performance.now() - startTime;
            
            console.log(`✅ Backup completed in ${duration.toFixed(0)}ms (ID: ${backupId})`);
            
            // Log backup creation
            if (window.logger) {
                window.logger.log({
                    type: 'BACKUP',
                    category: 'CREATE',
                    level: 'INFO',
                    message: `Backup created successfully`,
                    data: {
                        backupId,
                        type,
                        size: backup.size,
                        duration,
                        recordCounts: backup.metadata.recordCounts
                    }
                });
            }

            return {
                id: backupId,
                size: backup.size,
                duration,
                timestamp: backup.timestamp,
                recordCounts: backup.metadata.recordCounts
            };

        } catch (error) {
            console.error('❌ Backup failed:', error);
            
            if (window.logger) {
                window.logger.logError(error, {
                    operation: 'backup_create',
                    type,
                    duration: performance.now() - startTime
                }, 'backup-system');
            }
            
            throw error;
        }
    }

    async collectAllData() {
        if (!window.db) {
            console.warn('Database not yet initialized for backup');
            return {}; // Return empty data instead of throwing error
        }

        const data = {};
        
        // Use window.db directly which is our database interface
        // Note: Use actual store names from database.js (camelCase for giftCertificates)
        const storesToBackup = [
            'products', 
            'inventory', 
            'employees', 
            'transactions', 
            'customers',         // CRITICAL: Added customers to backup
            'rooms', 
            'giftCertificates',  // camelCase, not snake_case
            'settings',
            'state',
            'config',
            'promoDiscounts',
            'activeServices',
            'syncQueue',
            // ADDED: Missing critical data stores for complete backup
            'appointments',      // Customer appointments
            'operations',        // Business operations
            'serviceHistory',    // Service history records
            'expenses',          // Expense tracking
            'attendance',        // Employee attendance records
            'attendance_media',  // Attendance photos/media
            'activities',        // Activity logs
            'payroll',          // Payroll records
            'employeeRequests',  // Employee requests/leave
            'auditLog',         // Audit trail
            'attendanceRules',   // Attendance configuration
            'holidays',         // Holiday calendar
            'cache',            // Cached data (optional but included)
            'requestQueue',     // API request queue
            'migrations'        // Database migrations
        ];

        for (const storeName of storesToBackup) {
            try {
                const storeData = await window.db.getAll(storeName);
                data[storeName] = storeData || [];
            } catch (error) {
                console.warn(`Failed to backup store ${storeName}:`, error);
                data[storeName] = []; // Use empty array instead of null
            }
        }

        // Also backup localStorage data
        data._localStorage = this.exportLocalStorage();
        
        // Backup app settings
        data._appSettings = {
            version: this.getAppVersion(),
            businessConfig: await this.getBusinessConfig(),
            userPreferences: await this.getUserPreferences()
        };

        return data;
    }

    exportLocalStorage() {
        const localStorageData = {};
        
        // Only backup app-specific keys
        const keysToBackup = [
            'businessName',
            'currentUser',
            'userToken',
            'lastSync',
            'businessConfig',
            'perfMode',
            'ava_logging_enabled',
            'ava_backup_enabled'
        ];

        for (const key of keysToBackup) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                localStorageData[key] = value;
            }
        }

        return localStorageData;
    }

    async getBusinessConfig() {
        try {
            return await window.database?.get('settings', 'businessConfig') || null;
        } catch (error) {
            return null;
        }
    }

    async getUserPreferences() {
        try {
            return await window.database?.get('settings', 'userPreferences') || null;
        } catch (error) {
            return null;
        }
    }

    getAppVersion() {
        // Try to get version from manifest or set a default
        return '1.0.0'; // This could be dynamic based on your versioning
    }

    getCurrentUserId() {
        try {
            const userStr = localStorage.getItem('currentUser');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id || user.email || 'unknown';
            }
            return 'anonymous';
        } catch (error) {
            return 'unknown';
        }
    }

    getRecordCounts(data) {
        const counts = {};
        for (const [store, records] of Object.entries(data)) {
            if (store.startsWith('_')) continue;
            counts[store] = Array.isArray(records) ? records.length : 0;
        }
        return counts;
    }

    async compressData(data) {
        // Simple JSON compression using native browser APIs when available
        try {
            const jsonString = JSON.stringify(data);
            
            if ('CompressionStream' in window) {
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                writer.write(new TextEncoder().encode(jsonString));
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) chunks.push(value);
                }
                
                return {
                    compressed: true,
                    data: chunks,
                    originalSize: jsonString.length
                };
            } else {
                // Fallback: return uncompressed but marked
                return {
                    compressed: false,
                    data: jsonString,
                    originalSize: jsonString.length
                };
            }
        } catch (error) {
            console.warn('Compression failed, storing uncompressed:', error);
            const jsonString = JSON.stringify(data);
            return {
                compressed: false,
                data: jsonString,
                originalSize: jsonString.length
            };
        }
    }

    async decompressData(compressedData) {
        try {
            if (!compressedData.compressed) {
                return typeof compressedData.data === 'string' ? 
                    JSON.parse(compressedData.data) : compressedData.data;
            }

            if ('DecompressionStream' in window) {
                const stream = new DecompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();
                
                // Write compressed chunks
                for (const chunk of compressedData.data) {
                    writer.write(chunk);
                }
                writer.close();
                
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) chunks.push(value);
                }
                
                const decompressed = new TextDecoder().decode(
                    new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
                );
                
                return JSON.parse(decompressed);
            } else {
                throw new Error('Decompression not supported');
            }
        } catch (error) {
            console.error('Decompression failed:', error);
            throw new Error('Failed to decompress backup data');
        }
    }

    calculateBackupSize(backup) {
        const jsonString = JSON.stringify(backup);
        return jsonString.length;
    }

    async storeBackup(backup) {
        if (!this.db) throw new Error('Backup database not available');

        const transaction = this.db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        
        return new Promise((resolve, reject) => {
            const request = store.add(backup);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getBackupList() {
        if (!this.db) return [];

        const transaction = this.db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        const index = store.index('timestamp');
        
        return new Promise((resolve, reject) => {
            const backups = [];
            const request = index.openCursor(null, 'prev'); // Newest first
            
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    const backup = cursor.value;
                    
                    // Return metadata only, not the full data
                    backups.push({
                        id: backup.id,
                        timestamp: backup.timestamp,
                        date: backup.date,
                        type: backup.type,
                        version: backup.version,
                        size: backup.size,
                        compressed: backup.compressed,
                        metadata: backup.metadata
                    });
                    
                    cursor.continue();
                } else {
                    resolve(backups);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async getBackup(backupId) {
        if (!this.db) throw new Error('Backup database not available');

        const transaction = this.db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        
        return new Promise((resolve, reject) => {
            const request = store.get(backupId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async restoreFromBackup(backupId, options = {}) {
        console.log(`🔄 Starting restore from backup ${backupId}...`);
        const startTime = performance.now();

        try {
            // Get backup
            const backup = await this.getBackup(backupId);
            if (!backup) {
                throw new Error('Backup not found');
            }

            // Decompress data if needed
            let backupData = backup.data;
            if (backup.compressed) {
                backupData = await this.decompressData(backup.data);
            }

            // Create restore point before proceeding
            if (options.createRestorePoint !== false) {
                console.log('📦 Creating restore point...');
                const restorePoint = await this.createFullBackup('restore_point');
                console.log(`✅ Restore point created: ${restorePoint.id}`);
            }

            // Restore data
            await this.restoreData(backupData, options);

            // Update localStorage if included
            if (backupData._localStorage && options.restoreSettings !== false) {
                this.restoreLocalStorage(backupData._localStorage);
            }

            const duration = performance.now() - startTime;
            console.log(`✅ Restore completed in ${duration.toFixed(0)}ms`);

            // Log restore
            if (window.logger) {
                window.logger.log({
                    type: 'BACKUP',
                    category: 'RESTORE',
                    level: 'INFO',
                    message: `Data restored from backup`,
                    data: {
                        backupId,
                        backupDate: backup.date,
                        duration,
                        recordCounts: backup.metadata.recordCounts
                    }
                });
            }

            return {
                success: true,
                duration,
                backupDate: backup.date,
                recordCounts: backup.metadata.recordCounts
            };

        } catch (error) {
            console.error('❌ Restore failed:', error);
            
            if (window.logger) {
                window.logger.logError(error, {
                    operation: 'backup_restore',
                    backupId,
                    duration: performance.now() - startTime
                }, 'backup-system');
            }
            
            throw error;
        }
    }

    async restoreData(backupData, options = {}) {
        if (!window.database || !window.database.db) {
            throw new Error('Main database not available');
        }

        const storesToRestore = options.stores || Object.keys(backupData).filter(key => !key.startsWith('_'));
        
        for (const storeName of storesToRestore) {
            try {
                if (!backupData[storeName] || backupData[storeName] === null) {
                    console.warn(`Skipping ${storeName} - no data in backup`);
                    continue;
                }

                console.log(`🔄 Restoring ${storeName}...`);
                
                // Clear existing data if requested
                if (options.clearExisting !== false) {
                    await this.clearStore(storeName);
                }

                // Restore data
                const records = backupData[storeName];
                if (Array.isArray(records) && records.length > 0) {
                    for (const record of records) {
                        try {
                            await window.database.add(storeName, record);
                        } catch (error) {
                            // Handle duplicate keys or other issues
                            console.warn(`Failed to restore record in ${storeName}:`, error);
                        }
                    }
                }

                console.log(`✅ Restored ${records.length} records to ${storeName}`);

            } catch (error) {
                console.error(`Failed to restore ${storeName}:`, error);
                if (options.stopOnError) {
                    throw error;
                }
            }
        }
    }

    async clearStore(storeName) {
        if (!window.database || !window.database.db) return;

        try {
            const transaction = window.database.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn(`Failed to clear store ${storeName}:`, error);
        }
    }

    restoreLocalStorage(localStorageData) {
        for (const [key, value] of Object.entries(localStorageData)) {
            try {
                localStorage.setItem(key, value);
            } catch (error) {
                console.warn(`Failed to restore localStorage key ${key}:`, error);
            }
        }
    }

    async deleteBackup(backupId) {
        if (!this.db) throw new Error('Backup database not available');

        const transaction = this.db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(backupId);
            request.onsuccess = () => {
                console.log(`🗑️ Backup ${backupId} deleted`);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async cleanupOldBackups() {
        try {
            const backups = await this.getBackupList();
            
            if (backups.length <= this.maxBackups) {
                return; // No cleanup needed
            }

            const backupsToDelete = backups.slice(this.maxBackups);
            console.log(`🧹 Cleaning up ${backupsToDelete.length} old backups...`);

            for (const backup of backupsToDelete) {
                await this.deleteBackup(backup.id);
            }

            console.log(`✅ Cleanup completed - kept ${this.maxBackups} most recent backups`);
        } catch (error) {
            console.error('Backup cleanup failed:', error);
        }
    }

    async exportBackup(backupId) {
        try {
            const backup = await this.getBackup(backupId);
            if (!backup) {
                throw new Error('Backup not found');
            }

            // Decompress if needed for export
            let exportData = backup;
            if (backup.compressed && backup.data.compressed) {
                const decompressedData = await this.decompressData(backup.data);
                exportData = { ...backup, data: decompressedData };
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const date = new Date(backup.timestamp).toISOString().split('T')[0];
            a.href = url;
            a.download = `ava-backup-${date}-${backupId}.json`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`📁 Backup ${backupId} exported`);
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    async importBackup(file) {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            // Validate backup structure
            if (!backupData.timestamp || !backupData.data) {
                throw new Error('Invalid backup file format');
            }

            // Store the imported backup
            const importedBackup = {
                ...backupData,
                type: 'imported',
                imported: true,
                importDate: new Date().toISOString()
            };

            const backupId = await this.storeBackup(importedBackup);
            console.log(`📁 Backup imported with ID: ${backupId}`);
            
            return backupId;
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }

    // Utility methods
    async getStorageUsage() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    available: estimate.quota,
                    usedMB: Math.round(estimate.usage / 1024 / 1024 * 100) / 100,
                    availableMB: Math.round(estimate.quota / 1024 / 1024)
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getBackupStats() {
        try {
            const backups = await this.getBackupList();
            const totalSize = backups.reduce((sum, backup) => sum + (backup.size || 0), 0);
            
            return {
                totalBackups: backups.length,
                totalSize,
                totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
                oldestBackup: backups.length > 0 ? backups[backups.length - 1].date : null,
                newestBackup: backups.length > 0 ? backups[0].date : null,
                lastScheduledBackup: this.scheduleSettings.lastBackup
            };
        } catch (error) {
            console.error('Failed to get backup stats:', error);
            return null;
        }
    }

    // Configuration methods
    setSchedule(settings) {
        this.scheduleSettings = { ...this.scheduleSettings, ...settings };
        this.saveSettings();
        
        if (this.scheduleSettings.enabled) {
            this.setupScheduler();
        } else {
            this.clearScheduler();
        }
    }

    getSchedule() {
        return { ...this.scheduleSettings };
    }

    setMaxBackups(max) {
        this.maxBackups = Math.max(1, Math.min(100, max));
        this.cleanupOldBackups();
    }

    setCompressionEnabled(enabled) {
        this.compressionEnabled = enabled;
    }
}

// Initialize backup system
window.backupSystem = new BackupSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupSystem;
}