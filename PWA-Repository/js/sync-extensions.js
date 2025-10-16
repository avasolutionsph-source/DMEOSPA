// Sync Extensions - Additional sync functions for appointments, rooms, gift certificates, etc.
// This file extends sync.js with functions for features that were missing cross-device sync

// Add sync methods to SyncManager prototype
if (window.SyncManager) {

    // ============================================================================
    // APPOINTMENTS SYNC - Sync appointment/booking data across devices
    // ============================================================================

    SyncManager.prototype.syncAppointments = async function() {
        try {
            console.log('📅 [APPOINTMENTS-SYNC] Syncing appointments...');

            const allAppointments = await window.db.getAll('appointments');

            if (!allAppointments || allAppointments.length === 0) {
                console.log('📅 [APPOINTMENTS-SYNC] No appointments to sync');
                return;
            }

            console.log(`📅 [APPOINTMENTS-SYNC] Found ${allAppointments.length} appointments`);

            const response = await this.sendToServer('/api/sync/appointments', {
                appointments: allAppointments,
                summary: {
                    total: allAppointments.length,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                console.log('✅ [APPOINTMENTS-SYNC] Successfully synced');
                for (const appointment of allAppointments) {
                    appointment.syncStatus = 'synced';
                    await window.db.update('appointments', appointment);
                }
            }
        } catch (error) {
            console.error('❌ [APPOINTMENTS-SYNC] Failed:', error);
        }
    };

    // ============================================================================
    // ROOMS SYNC - Sync room status and assignments across devices
    // ============================================================================

    SyncManager.prototype.syncRooms = async function() {
        try {
            console.log('🚪 [ROOMS-SYNC] Syncing rooms...');

            const allRooms = await window.db.getAll('rooms');

            if (!allRooms || allRooms.length === 0) {
                console.log('🚪 [ROOMS-SYNC] No rooms to sync');
                return;
            }

            console.log(`🚪 [ROOMS-SYNC] Found ${allRooms.length} rooms`);

            const response = await this.sendToServer('/api/sync/rooms', {
                rooms: allRooms,
                summary: {
                    total: allRooms.length,
                    occupied: allRooms.filter(r => r.status === 'occupied').length,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                console.log('✅ [ROOMS-SYNC] Successfully synced');
                for (const room of allRooms) {
                    room.syncStatus = 'synced';
                    await window.db.update('rooms', room);
                }
            }
        } catch (error) {
            console.error('❌ [ROOMS-SYNC] Failed:', error);
        }
    };

    // ============================================================================
    // GIFT CERTIFICATES SYNC
    // ============================================================================

    SyncManager.prototype.syncGiftCertificates = async function() {
        try {
            console.log('🎁 [GIFT-CERT-SYNC] Syncing gift certificates...');

            const allGCs = await window.db.getAll('giftCertificates');

            if (!allGCs || allGCs.length === 0) {
                console.log('🎁 [GIFT-CERT-SYNC] No gift certificates to sync');
                return;
            }

            console.log(`🎁 [GIFT-CERT-SYNC] Found ${allGCs.length} gift certificates`);

            const response = await this.sendToServer('/api/sync/giftcertificates', {
                giftCertificates: allGCs,
                summary: {
                    total: allGCs.length,
                    active: allGCs.filter(gc => gc.status === 'active').length,
                    used: allGCs.filter(gc => gc.status === 'used').length,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                console.log('✅ [GIFT-CERT-SYNC] Successfully synced');
                for (const gc of allGCs) {
                    gc.syncStatus = 'synced';
                    await window.db.update('giftCertificates', gc);
                }
            }
        } catch (error) {
            console.error('❌ [GIFT-CERT-SYNC] Failed:', error);
        }
    };

    // ============================================================================
    // SHIFT SCHEDULES SYNC
    // ============================================================================

    SyncManager.prototype.syncShiftSchedules = async function() {
        try {
            console.log('📋 [SHIFT-SCHEDULE-SYNC] Syncing shift schedules...');

            const allSchedules = await window.db.getAll('shiftSchedules');

            if (!allSchedules || allSchedules.length === 0) {
                console.log('📋 [SHIFT-SCHEDULE-SYNC] No schedules to sync');
                return;
            }

            console.log(`📋 [SHIFT-SCHEDULE-SYNC] Found ${allSchedules.length} schedules`);

            const response = await this.sendToServer('/api/sync/shift-schedules', {
                schedules: allSchedules,
                summary: {
                    total: allSchedules.length,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                console.log('✅ [SHIFT-SCHEDULE-SYNC] Successfully synced');
                for (const schedule of allSchedules) {
                    schedule.syncStatus = 'synced';
                    await window.db.update('shiftSchedules', schedule);
                }
            }
        } catch (error) {
            console.error('❌ [SHIFT-SCHEDULE-SYNC] Failed:', error);
        }
    };

    // ============================================================================
    // SERVICE HISTORY SYNC
    // ============================================================================

    SyncManager.prototype.syncServiceHistory = async function() {
        try {
            console.log('📜 [SERVICE-HISTORY-SYNC] Syncing service history...');

            const allHistory = await window.db.getAll('serviceHistory');

            if (!allHistory || allHistory.length === 0) {
                console.log('📜 [SERVICE-HISTORY-SYNC] No service history to sync');
                return;
            }

            console.log(`📜 [SERVICE-HISTORY-SYNC] Found ${allHistory.length} records`);

            const response = await this.sendToServer('/api/sync/service-history', {
                serviceHistory: allHistory,
                summary: {
                    total: allHistory.length,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                console.log('✅ [SERVICE-HISTORY-SYNC] Successfully synced');
                for (const record of allHistory) {
                    record.syncStatus = 'synced';
                    await window.db.update('serviceHistory', record);
                }
            }
        } catch (error) {
            console.error('❌ [SERVICE-HISTORY-SYNC] Failed:', error);
        }
    };

    // ============================================================================
    // EXPENSES SYNC
    // ============================================================================

    SyncManager.prototype.syncExpenses = async function() {
        try {
            console.log('💸 [EXPENSES-SYNC] Syncing expenses...');

            const allExpenses = await window.db.getAll('expenses');

            if (!allExpenses || allExpenses.length === 0) {
                console.log('💸 [EXPENSES-SYNC] No expenses to sync');
                return;
            }

            console.log(`💸 [EXPENSES-SYNC] Found ${allExpenses.length} expenses`);

            const totalAmount = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

            const response = await this.sendToServer('/api/sync/expenses', {
                expenses: allExpenses,
                summary: {
                    total: allExpenses.length,
                    totalAmount: totalAmount,
                    lastUpdated: new Date().toISOString()
                }
            });

            if (response.ok) {
                console.log('✅ [EXPENSES-SYNC] Successfully synced');
                for (const expense of allExpenses) {
                    expense.syncStatus = 'synced';
                    await window.db.update('expenses', expense);
                }
            }
        } catch (error) {
            console.error('❌ [EXPENSES-SYNC] Failed:', error);
        }
    };

    console.log('✅ Sync extensions loaded - Added 6 new sync functions');
}
