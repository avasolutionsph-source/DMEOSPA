// Service History Manager
class ServiceHistoryManager {
    constructor() {
        this.services = [];
        this.filteredServices = [];
        this.selectedTherapistId = null;
        this.isManagerView = false;
    }

    async init() {
        console.log('📋 [SERVICE-HISTORY] Initializing...');

        // Check user role
        const userData = window.app?.userData || JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userRole = userData.role;
        const userType = userData.type;

        // Determine if this is a manager/owner view
        this.isManagerView = userType !== 'employee' || userRole === 'manager' || userRole === 'receptionist';

        console.log('👤 [SERVICE-HISTORY] User role:', {
            userRole,
            userType,
            isManagerView: this.isManagerView
        });

        // Show therapist selector for managers/owners
        if (this.isManagerView) {
            await this.loadTherapists();
            document.getElementById('therapistSelector').style.display = 'block';
        } else {
            document.getElementById('therapistSelector').style.display = 'none';
            // For therapists, load their own history
            this.selectedTherapistId = userData.employeeId || userData.id;
        }

        // Create IndexedDB store if it doesn't exist
        await this.ensureStore();

        // Load service history
        await this.loadHistory();

        // Display history
        this.displayHistory();

        console.log('✅ [SERVICE-HISTORY] Initialized');
    }

    async loadTherapists() {
        console.log('👥 [SERVICE-HISTORY] Loading therapists...');

        try {
            // Check if HybridAPIClient is available
            if (!window.HybridAPIClient) {
                console.error('❌ [SERVICE-HISTORY] HybridAPIClient not loaded yet');
                setTimeout(() => this.loadTherapists(), 500);
                return;
            }

            // Use HybridAPIClient for offline support (same as POS)
            console.log('📡 [SERVICE-HISTORY] Calling HybridAPIClient.getEmployees()...');
            const result = await window.HybridAPIClient.getEmployees();

            console.log('📡 [SERVICE-HISTORY] getEmployees result:', result);

            if (!result.success) {
                console.error('❌ [SERVICE-HISTORY] Failed to load employees:', result.error);
                return;
            }

            const rawEmployees = result.data || [];
            console.log(`✅ [SERVICE-HISTORY] Loaded ${rawEmployees.length} employees from ${result.source || 'API'}`);
            console.log('📋 [SERVICE-HISTORY] Raw employees:', rawEmployees);

            // Convert firstName/lastName back to name for PWA compatibility (same as POS)
            const employees = rawEmployees.map(emp => ({
                ...emp,
                name: emp.firstName ? `${emp.firstName} ${emp.lastName}`.trim() : emp.name
            }));

            console.log('📋 [SERVICE-HISTORY] Converted employees:', employees);

            // Filter for therapists only
            const therapists = employees.filter(emp =>
                emp.role && (
                    emp.role === 'senior_therapist' ||
                    emp.role === 'junior_therapist' ||
                    emp.role === 'new_therapist' ||
                    emp.role === 'therapist'
                )
            );

            console.log('✅ [SERVICE-HISTORY] Filtered therapists:', therapists.length);
            console.log('👥 [SERVICE-HISTORY] Therapist details:', therapists);

            // Populate dropdown
            const dropdown = document.getElementById('therapistDropdown');
            if (!dropdown) {
                console.warn('⚠️ [SERVICE-HISTORY] Therapist dropdown not found');
                return;
            }

            dropdown.innerHTML = '<option value="">-- Select a Therapist --</option>';

            therapists.forEach(therapist => {
                const option = document.createElement('option');
                option.value = therapist._id || therapist.id;
                option.textContent = `${therapist.name} - ${(therapist.role || '').replace(/_/g, ' ')}`;
                dropdown.appendChild(option);
                console.log('➕ [SERVICE-HISTORY] Added option:', option.textContent, 'value:', option.value);
            });

            console.log('✅ [SERVICE-HISTORY] Populated dropdown with', therapists.length, 'therapists');
            console.log('📋 [SERVICE-HISTORY] Dropdown HTML:', dropdown.innerHTML.substring(0, 200));

        } catch (error) {
            console.error('❌ [SERVICE-HISTORY] Error loading therapists:', error);
            console.error('❌ [SERVICE-HISTORY] Error stack:', error.stack);
        }
    }

    selectTherapist(therapistId) {
        console.log('👤 [SERVICE-HISTORY] Therapist selected:', therapistId);
        this.selectedTherapistId = therapistId;
        this.loadHistory();
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
                // Filter by selected therapist if in manager view
                if (this.selectedTherapistId) {
                    this.services = allServices.filter(s => s.therapistId === this.selectedTherapistId);
                    console.log('✅ [SERVICE-HISTORY] Loaded services for therapist:', {
                        therapistId: this.selectedTherapistId,
                        count: this.services.length
                    });
                } else {
                    this.services = allServices;
                    console.log('✅ [SERVICE-HISTORY] Loaded all services:', allServices.length);
                }
            } else {
                console.log('📭 [SERVICE-HISTORY] No service history found');
                this.services = [];
            }

            this.filteredServices = [...this.services];
            this.displayHistory();

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
                <div style="text-align: center; padding: 4rem 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <i class="fas fa-clipboard-list" style="font-size: 4rem; color: #ddd; margin-bottom: 1rem;"></i>
                    <h3 style="color: #666; margin-bottom: 0.5rem;">No Service History</h3>
                    <p style="color: #999;">${this.isManagerView && !this.selectedTherapistId ? 'Please select a therapist to view their service history' : 'Completed services will appear here'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedServices.map(service => {
            const isInProgress = service.status === 'in-progress';
            const statusColor = isInProgress ? '#800020' : '#2e7d32';
            const statusBg = isInProgress ? '#fff0f3' : '#e8f5e9';
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
            const typeBadgeColor = service.type === 'home' ? '#1976d2' : '#800020';

            return `
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid ${statusColor}; transition: transform 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                                <span style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: ${typeBadgeColor}15; color: ${typeBadgeColor}; border-radius: 6px; font-size: 0.875rem; font-weight: 600;">
                                    <i class="fas fa-${typeIcon}"></i>
                                    ${typeText}
                                </span>
                            </div>
                            <h3 style="margin: 0; color: #333; font-size: 1.125rem; font-weight: 600;">${service.serviceName}</h3>
                        </div>
                        <div style="text-align: right;">
                            <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: ${statusBg}; color: ${statusColor}; border-radius: 20px; font-size: 0.875rem; font-weight: 600; border: 1px solid ${statusColor};">
                                <i class="fas fa-${statusIcon}"></i>
                                ${statusText}
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; gap: 0.625rem; color: #555; font-size: 0.9375rem;">
                        ${this.isManagerView ? `
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-user-md" style="width: 18px; color: #800020;"></i>
                            <span><strong style="color: #333;">Therapist:</strong> ${service.therapistName || 'Unknown'}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-user" style="width: 18px; color: #800020;"></i>
                            <span><strong style="color: #333;">Client:</strong> ${service.clientName}</span>
                        </div>
                        ${service.clientAddress ? `
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-map-marker-alt" style="width: 18px; color: #800020;"></i>
                            <span><strong style="color: #333;">Location:</strong> ${service.clientAddress}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-clock" style="width: 18px; color: #800020;"></i>
                            <span><strong style="color: #333;">Started:</strong> ${formattedStart}</span>
                        </div>
                        ${durationText ? `
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-hourglass-half" style="width: 18px; color: #800020;"></i>
                            <span><strong style="color: #333;">Duration:</strong> ${durationText}</span>
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
