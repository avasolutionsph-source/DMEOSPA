// Service History Manager
class ServiceHistoryManager {
    constructor() {
        this.services = [];
        this.filteredServices = [];
    }

    async init() {
        console.log('📋 [SERVICE-HISTORY] Initializing...');

        // Create IndexedDB store if it doesn't exist
        await this.ensureStore();

        // Load service history
        await this.loadHistory();

        // Display history
        this.displayHistory();

        console.log('✅ [SERVICE-HISTORY] Initialized');
    }

    async ensureStore() {
        // Check if service history store exists in IndexedDB
        if (!window.db) {
            console.warn('⚠️ [SERVICE-HISTORY] Database not ready yet');
            return;
        }

        try {
            const stores = window.db.db.objectStoreNames;
            if (!stores.contains('serviceHistory')) {
                console.log('📦 [SERVICE-HISTORY] Creating serviceHistory store...');
                // Store will be created on next database upgrade
            }
        } catch (error) {
            console.error('❌ [SERVICE-HISTORY] Error checking store:', error);
        }
    }

    async recordServiceStart(serviceData) {
        console.log('📝 [SERVICE-HISTORY] Recording service start:', serviceData);

        const record = {
            id: serviceData.id || Date.now().toString(),
            type: serviceData.type || 'advance', // 'advance' or 'home'
            serviceName: serviceData.serviceName,
            clientName: serviceData.clientName || 'Did not select customer',
            clientAddress: serviceData.clientAddress || null,
            startTime: serviceData.startTime || new Date().toISOString(),
            endTime: null,
            duration: serviceData.estimatedDuration || null,
            actualDuration: null,
            status: 'in-progress',
            therapistId: serviceData.therapistId,
            therapistName: serviceData.therapistName,
            createdAt: new Date().toISOString()
        };

        try {
            // Save to IndexedDB
            if (window.db) {
                await window.db.put('serviceHistory', record);
                console.log('✅ [SERVICE-HISTORY] Service start recorded');
            }

            // Add to local array
            this.services.push(record);

            return record;
        } catch (error) {
            console.error('❌ [SERVICE-HISTORY] Error recording start:', error);
        }
    }

    async recordServiceEnd(serviceId, endTime) {
        console.log('📝 [SERVICE-HISTORY] Recording service end:', serviceId);

        try {
            // Find the service record
            let record = this.services.find(s => s.id === serviceId);

            if (!record && window.db) {
                // Try to load from IndexedDB
                record = await window.db.get('serviceHistory', serviceId);
            }

            if (!record) {
                console.warn('⚠️ [SERVICE-HISTORY] Service record not found:', serviceId);
                return;
            }

            // Calculate actual duration
            const start = new Date(record.startTime);
            const end = new Date(endTime || new Date());
            const durationMs = end - start;
            const actualDurationMinutes = Math.floor(durationMs / 60000);

            // Update record
            record.endTime = endTime || new Date().toISOString();
            record.actualDuration = actualDurationMinutes;
            record.status = 'completed';
            record.completedAt = new Date().toISOString();

            // Save to IndexedDB
            if (window.db) {
                await window.db.put('serviceHistory', record);
                console.log('✅ [SERVICE-HISTORY] Service end recorded:', {
                    serviceId,
                    actualDuration: actualDurationMinutes,
                    startTime: record.startTime,
                    endTime: record.endTime
                });
            }

            // Update local array
            const index = this.services.findIndex(s => s.id === serviceId);
            if (index !== -1) {
                this.services[index] = record;
            }

            return record;
        } catch (error) {
            console.error('❌ [SERVICE-HISTORY] Error recording end:', error);
        }
    }

    async loadHistory() {
        console.log('📥 [SERVICE-HISTORY] Loading history...');

        try {
            if (!window.db) {
                console.warn('⚠️ [SERVICE-HISTORY] Database not ready');
                return;
            }

            // Load from IndexedDB
            const allServices = await window.db.getAll('serviceHistory');

            if (allServices && allServices.length > 0) {
                this.services = allServices;
                console.log('✅ [SERVICE-HISTORY] Loaded services:', allServices.length);
            } else {
                console.log('📭 [SERVICE-HISTORY] No service history found');
                this.services = [];
            }

            this.filteredServices = [...this.services];

        } catch (error) {
            console.error('❌ [SERVICE-HISTORY] Error loading history:', error);
            this.services = [];
            this.filteredServices = [];
        }
    }

    filterHistory() {
        const dateFilter = document.getElementById('historyDateFilter')?.value || 'today';
        const serviceFilter = document.getElementById('historyServiceFilter')?.value || 'all';

        console.log('🔍 [SERVICE-HISTORY] Filtering:', { dateFilter, serviceFilter });

        let filtered = [...this.services];

        // Filter by date
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateFilter) {
            case 'today':
                filtered = filtered.filter(s => {
                    const serviceDate = new Date(s.startTime);
                    return serviceDate >= today;
                });
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                filtered = filtered.filter(s => {
                    const serviceDate = new Date(s.startTime);
                    return serviceDate >= yesterday && serviceDate < today;
                });
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                filtered = filtered.filter(s => new Date(s.startTime) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                filtered = filtered.filter(s => new Date(s.startTime) >= monthAgo);
                break;
        }

        // Filter by service type
        if (serviceFilter !== 'all') {
            filtered = filtered.filter(s => s.type === serviceFilter);
        }

        this.filteredServices = filtered;
        this.displayHistory();
    }

    displayHistory() {
        const container = document.getElementById('serviceHistoryList');
        if (!container) return;

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayServices = this.services.filter(s => new Date(s.startTime) >= today);
        const completedToday = todayServices.filter(s => s.status === 'completed');
        const totalMinutesToday = completedToday.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
        const totalHours = Math.floor(totalMinutesToday / 60);
        const remainingMinutes = totalMinutesToday % 60;

        // Update stats
        document.getElementById('totalServicesCount').textContent = this.services.length;
        document.getElementById('totalHoursWorked').textContent = `${totalHours}h ${remainingMinutes}m`;
        document.getElementById('todayServicesCount').textContent = todayServices.length;

        // Sort by start time (most recent first)
        const sortedServices = [...this.filteredServices].sort((a, b) => {
            return new Date(b.startTime) - new Date(a.startTime);
        });

        if (sortedServices.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <i class="fas fa-clipboard-list" style="font-size: 4rem; color: #ddd; margin-bottom: 1rem;"></i>
                    <h3 style="color: #666; margin-bottom: 0.5rem;">No Service History</h3>
                    <p style="color: #999;">Your completed services will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedServices.map(service => {
            const isInProgress = service.status === 'in-progress';
            const statusColor = isInProgress ? '#2196F3' : '#4CAF50';
            const statusIcon = isInProgress ? 'spinner fa-spin' : 'check-circle';
            const statusText = isInProgress ? 'In Progress' : 'Completed';

            const startDate = new Date(service.startTime);
            const formattedStart = startDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            let durationText = '';
            if (service.actualDuration) {
                const hours = Math.floor(service.actualDuration / 60);
                const mins = service.actualDuration % 60;
                durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            } else if (service.duration) {
                durationText = `${service.duration} mins (est.)`;
            }

            const typeIcon = service.type === 'home' ? 'home' : 'calendar-check';
            const typeText = service.type === 'home' ? 'Home Service' : 'Advance Booking';

            return `
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-${typeIcon}" style="color: ${statusColor};"></i>
                                <span style="font-size: 0.875rem; color: #666; font-weight: 600;">${typeText}</span>
                            </div>
                            <h3 style="margin: 0; color: #333; font-size: 1.25rem;">${service.serviceName}</h3>
                        </div>
                        <div style="text-align: right;">
                            <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: ${statusColor}20; color: ${statusColor}; border-radius: 20px; font-size: 0.875rem; font-weight: 600;">
                                <i class="fas fa-${statusIcon}"></i>
                                ${statusText}
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; gap: 0.75rem; color: #666;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-user" style="width: 20px; color: ${statusColor};"></i>
                            <span><strong>Client:</strong> ${service.clientName}</span>
                        </div>
                        ${service.clientAddress ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-map-marker-alt" style="width: 20px; color: ${statusColor};"></i>
                            <span><strong>Location:</strong> ${service.clientAddress}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-clock" style="width: 20px; color: ${statusColor};"></i>
                            <span><strong>Started:</strong> ${formattedStart}</span>
                        </div>
                        ${durationText ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-hourglass-half" style="width: 20px; color: ${statusColor};"></i>
                            <span><strong>Duration:</strong> ${durationText}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async refreshHistory() {
        console.log('🔄 [SERVICE-HISTORY] Refreshing...');
        await this.loadHistory();
        this.filterHistory();
    }
}

// Initialize service history manager
const serviceHistory = new ServiceHistoryManager();

// Export for use in other modules
window.serviceHistory = serviceHistory;

console.log('📋 [SERVICE-HISTORY] Module loaded');
