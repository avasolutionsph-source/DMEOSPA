// Bookings Management
console.log('📚 bookings.js script loaded successfully');
class BookingsManager {
	constructor() {
		this.bookings = [];
		this.lastSync = null;
		this.therapistBookings = [];
	}

	async init() {
		console.log('🚀 BookingsManager.init() called');
		try {
			if (this.isTherapistView()) {
				console.log('👨‍⚕️ Therapist view detected, building therapist page');
				this.buildTherapistPage();
				await this.syncTherapistOnly();
				if (!this._therapistSyncTimer) {
					this._therapistSyncTimer = setInterval(() => this.syncTherapistOnly().catch(()=>{}), 60000);
				}
				console.log('✅ Therapist view initialized successfully');
				return;
			}

			console.log('👔 Owner/Manager view detected, building regular bookings page');
			this.ensureTable();
			await this.loadBookings();
			this.setupEventListeners();
			this.setupAutoSync();
			// Force an immediate sync on first open to avoid blank state
			this.syncExternalBookings().catch(()=>{});
			console.log('✅ Regular bookings view initialized successfully');
		} catch (error) {
			console.error('❌ Error initializing bookings:', error);
		}
	}

	isTherapistView() {
		try {
			const roleA = (window.roleManager?.activeEmployee?.role || '').toLowerCase();
			const roleB = (window.authSystem?.currentUser?.role || '').toLowerCase();
			console.log('🔍 Therapist check:', { roleA, roleB, activeEmployee: window.roleManager?.activeEmployee, currentUser: window.authSystem?.currentUser });
			return roleA === 'therapist' || roleB === 'therapist';
		} catch(e) { 
			console.warn('Therapist check error:', e);
			return false; 
		}
	}

	buildTherapistPage() {
		console.log('🏗️ Building therapist page...');
		const page = document.getElementById('bookings');
		if (!page) {
			console.error('❌ Bookings page element not found!');
			return;
		}
		console.log('📄 Found bookings page element, replacing content...');
		page.innerHTML = `
			<div class="page-header"><h1>My Bookings</h1></div>
			<div class="bookings-list-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Date/Time</th>
							<th>Customer</th>
							<th>Service</th>
							<th>Room</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody id="therapistBookingsBody"><tr><td colspan="5" style="text-align:center;padding:1rem;color:var(--gray);">Loading…</td></tr></tbody>
				</table>
			</div>
		`;
		console.log('✅ Therapist page HTML built successfully');
	}

	async getTherapistIdentifiers() {
		const identifiers = { ids: [], name: '', email: '' };
		
		// Get email from current user
		try { identifiers.email = (window.authSystem?.currentUser?.email || '').toLowerCase(); } catch(_) {}
		
		// Get name from role manager (active employee session)
		try {
			if (window.roleManager?.activeEmployee?.name) {
				identifiers.name = window.roleManager.activeEmployee.name;
			}
		} catch(_) {}
		
		// Try to resolve employee id and name from local employees database
		try {
			const emps = await db.getAll('employees');
			console.log('📋 Local employees found:', emps?.length || 0);
			
			if (Array.isArray(emps)) {
				// Try to match by email first
				if (identifiers.email) {
					const emailMatch = emps.find(e => (e.email||'').toLowerCase() === identifiers.email);
					if (emailMatch) {
						console.log('✅ Found employee by email:', emailMatch);
						if (emailMatch.id) identifiers.ids.push(String(emailMatch.id));
						if (emailMatch._id) identifiers.ids.push(String(emailMatch._id));
						if (emailMatch.name && !identifiers.name) identifiers.name = emailMatch.name;
					}
				}
				
				// Try to match by name if we have one
				if (identifiers.name) {
					const nameMatch = emps.find(e => (e.name||'').toLowerCase() === identifiers.name.toLowerCase());
					if (nameMatch && nameMatch !== identifiers.email) {
						console.log('✅ Found employee by name:', nameMatch);
						if (nameMatch.id) identifiers.ids.push(String(nameMatch.id));
						if (nameMatch._id) identifiers.ids.push(String(nameMatch._id));
					}
				}
				
				// If still no matches, try all employees with "therapist" role
				if (identifiers.ids.length === 0) {
					const therapists = emps.filter(e => (e.position||e.role||'').toLowerCase().includes('therapist'));
					console.log('🔍 Found therapists by role:', therapists);
					therapists.forEach(t => {
						if (t.id) identifiers.ids.push(String(t.id));
						if (t._id) identifiers.ids.push(String(t._id));
					});
				}
			}
		} catch(e) {
			console.warn('Error loading local employees:', e);
		}
		
		// Fallback name sources
		if (!identifiers.name) {
			identifiers.name = window.authSystem?.currentUser?.employeeName 
				|| window.authSystem?.currentUser?.name
				|| window.authSystem?.currentUser?.businessName
				|| '';
		}
		
		console.log('🆔 Final therapist identifiers:', identifiers);
		return identifiers;
	}

	async syncTherapistOnly() {
		console.log('🔄 Starting therapist bookings sync...');
		try {
			if (!window.apiClient) {
				console.warn('❌ No API client available');
				return;
			}
			console.log('📡 Fetching from /api/business/bookings...');
			const resp = await window.apiClient.get('/api/business/bookings');
			console.log('📡 Response status:', resp.status, resp.ok);
			let json = null;
			try { json = await resp.json(); } catch(_) { json = null; }
			console.log('📦 Raw bookings data:', json);
			const all = json?.bookings || json?.data || [];
			console.log('📋 All bookings count:', all.length);
			const me = await this.getTherapistIdentifiers();
			console.log('👤 Therapist identifiers:', me);
			const norm = (s) => (s||'').trim().toLowerCase();
			const filtered = all.filter(b => {
				const bid = String(b.employeeId || '');
 			const bname = norm(b.employeeName || '');
				const bemail = norm(b.employeeEmail || '');
				
				// Check multiple matching criteria
				const matchById = me.ids.includes(bid);
				const matchByName = !!me.name && bname === norm(me.name);
				const matchByEmail = !!me.email && bemail === me.email;
				
				const match = matchById || matchByName || matchByEmail;
				
				console.log('🔍 Checking booking:', {
					booking: b,
					therapistIds: me.ids,
					therapistName: me.name,
					therapistEmail: me.email,
					bookingEmployeeId: bid,
					bookingEmployeeName: bname,
					bookingEmployeeEmail: bemail,
					matchById,
					matchByName,
					matchByEmail,
					finalMatch: match
				});
				
				if (match) console.log('✅ Booking matches therapist:', b);
				return match;
			});
			console.log('🎯 Filtered bookings for therapist:', filtered.length);
			this.therapistBookings = filtered.sort((a,b) => new Date(a.startTime||a.date) - new Date(b.startTime||b.date));
			this.renderTherapistBookings();
		} catch (e) {
			console.warn('❌ Therapist bookings fetch failed, falling back to local', e);
			// Fallback to locally cached bookings filtered by therapist
			let local = await db.getAll('bookings');
			console.log('💾 Local bookings count:', local.length);
			const me = await this.getTherapistIdentifiers();
			console.log('👤 Therapist identifiers (fallback):', me);
			const norm = (s) => (s||'').trim().toLowerCase();
			local = local.filter(b => me.ids.includes(String(b.employeeId||'')) || (!!me.name && norm(b.employeeName) === norm(me.name)));
			console.log('🎯 Local filtered bookings for therapist:', local.length);
			this.therapistBookings = local.sort((a,b) => new Date(a.date) - new Date(b.date));
			this.renderTherapistBookings();
		}
	}

	renderTherapistBookings() {
		console.log('🎨 Rendering therapist bookings, count:', this.therapistBookings.length);
		const tbody = document.getElementById('therapistBookingsBody');
		if (!tbody) {
			console.warn('❌ therapistBookingsBody element not found');
			return;
		}
		if (this.therapistBookings.length === 0) {
			tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;">No bookings assigned to you yet</td></tr>';
			console.log('📄 Rendered empty state');
			return;
		}
		tbody.innerHTML = this.therapistBookings.map(b => `
			<tr>
				<td>${app.formatDateTime(b.startTime || b.date)}</td>
				<td>${b.customer?.name || b.customerName || '-'}</td>
				<td>${b.serviceName || '-'}</td>
				<td>${b.roomNumber || '-'}</td>
				<td><span class="badge badge-${(b.status||'pending')==='confirmed'?'success':(b.status==='cancelled'?'danger':'warning')}">${b.status||'pending'}</span></td>
			</tr>
		`).join('');
		console.log('✅ Rendered', this.therapistBookings.length, 'therapist bookings');
	}

	setupEventListeners() {
		if (this._listenersAttached) return;
		this._listenersAttached = true;
		const addBtn = document.getElementById('addBookingBtn');
		if (addBtn) {
			addBtn.addEventListener('click', () => this.openCreateDialog());
		}
	}

	async loadBookings() {
		let allBookings = await db.getAll('bookings');
		// Filter for therapist role - show only their own bookings
		if (window.roleManager?.activeEmployee?.role === 'therapist') {
			const therapistId = String(window.roleManager.activeEmployee.id);
			allBookings = allBookings.filter(b => String(b.employeeId||'') === therapistId);
		}
		this.bookings = allBookings;
		this.renderBookingsTable();
	}

	// If the table markup is missing (visual bug), rebuild a minimal table
	ensureTable() {
		const page = document.getElementById('bookings');
		if (!page) return;
		if (!document.getElementById('bookingsTableBody')) {
			const container = document.createElement('div');
			container.className = 'bookings-list-container';
			container.innerHTML = `
				<table class="data-table">
					<thead>
						<tr>
							<th>Date/Time</th><th>Customer</th><th>Service</th><th>Therapist</th><th>Room</th><th>Status</th><th>Actions</th>
						</tr>
					</thead>
					<tbody id="bookingsTableBody"><tr><td colspan="7" style="text-align:center;padding:1rem;color:var(--gray);">Loading…</td></tr></tbody>
				</table>`;
			page.appendChild(container);
		}
	}

	setupAutoSync() {
		if (this._syncTimer) return;
		this.syncExternalBookings().catch(()=>{});
		this._syncTimer = setInterval(() => this.syncExternalBookings().catch(()=>{}), 60000);
	}

	async syncExternalBookings() {
		try {
			if (!window.apiClient) return;
			// Only sync if logged in
			if (!window.authSystem?.isLoggedIn) return;
			const since = this.lastSync || (await db.get('settings', 'externalBookingsLastSync'))?.value || '';
			// Always include x-user-id via apiClient if no token; apiClient injects it now
			let res = await window.apiClient.get(`/api/bookings${since ? `?since=${encodeURIComponent(since)}` : ''}`);
			if (!res.ok) throw new Error(`primary bookings failed ${res.status}`);
			const { data } = await res.json();
			if (Array.isArray(data)) {
				for (const bk of data) {
					const toSave = {
						id: bk._id || bk.id || undefined,
						source: bk.source || 'booking-site',
						externalId: bk.externalId || null,
						date: bk.startTime,
						serviceId: bk.serviceId,
						serviceName: bk.serviceName,
						employeeId: bk.employeeId,
						employeeName: bk.employeeName,
						customerName: bk.customer?.name || '',
						roomNumber: bk.roomNumber || '',
						status: bk.status || 'pending',
						storeId: bk.storeId || 'default',
						partySize: bk.partySize || 1,
						duration: bk.durationMins || 60,
						modifiedAt: bk.updatedAt
					};
					// Upsert by externalId or id
					if (toSave.id) {
						await db.update('bookings', toSave);
					} else if (toSave.externalId) {
						const existing = (await db.getAll('bookings')).find(x => x.externalId === toSave.externalId);
						if (existing) {
							await db.update('bookings', { ...existing, ...toSave });
						} else {
							await db.add('bookings', toSave);
						}
					} else {
						await db.add('bookings', toSave);
					}
				}
				this.lastSync = new Date().toISOString();
				await db.update('settings', { key: 'externalBookingsLastSync', value: this.lastSync });
				await this.loadBookings();
			}
		} catch (e) {
			console.warn('External bookings sync failed', e);
			// As a fallback, fetch public bookings from marketing DB using x-user-id
			try {
				const bid = (await db.get('settings','businessConfig'))?.value?.userId;
				if (bid) {
					const resp = await fetch('https://ava-marketing-api.onrender.com/api/business/bookings', { headers: { 'Authorization': `Bearer ${localStorage.getItem('userToken')||''}` } }).catch(()=>null);
					if (resp && resp.ok) {
						const j = await resp.json();
						const list = j.bookings || j.data || [];
						if (Array.isArray(list)) {
							for (const bk of list) {
								const toSave = {
									id: bk._id || bk.id || undefined,
									date: bk.startTime,
									serviceId: bk.serviceId,
									serviceName: bk.serviceName,
									employeeId: bk.employeeId,
									employeeName: bk.employeeName,
									customerName: bk.customer?.name || '',
									roomNumber: bk.roomNumber || '',
									status: bk.status || 'pending',
									storeId: bk.storeId || 'default',
									partySize: bk.partySize || 1,
									duration: bk.durationMins || 60,
									modifiedAt: bk.updatedAt
								};
								if (toSave.id) await db.update('bookings', toSave); else await db.add('bookings', toSave);
							}
							await this.loadBookings();
						}
					}
				}
			} catch(_){}
		}
	}

	renderBookingsTable() {
		const tbody = document.getElementById('bookingsTableBody');
		if (!tbody) return;
		if (this.bookings.length === 0) {
			tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1rem;">No bookings yet</td></tr>';
			return;
		}
		tbody.innerHTML = this.bookings
			.sort((a,b)=> new Date(a.date) - new Date(b.date))
			.map(b => `
				<tr>
					<td>${app.formatDateTime(b.date)}</td>
					<td>${b.customerName || '-'}</td>
					<td>${b.serviceName || '-'}</td>
					<td>${b.employeeName || '-'}</td>
					<td>${b.roomNumber || '-'}</td>
					<td><span class="badge badge-${b.status==='confirmed'?'success':b.status==='cancelled'?'danger':'warning'}">${b.status||'pending'}</span></td>
					<td>
						<button class="btn-icon" title="Accept" onclick="bookingsManager.accept(${b.id})"><i class="fas fa-check"></i></button>
						<button class="btn-icon" title="Edit" onclick="bookingsManager.edit(${b.id})"><i class="fas fa-edit"></i></button>
						${b.status === 'pending_cancel' ? `
							<button class="btn-icon" title="Approve Cancel" onclick="bookingsManager.approveCancellation(${b.id})" style="color:var(--success-color);"><i class="fas fa-check-circle"></i></button>
							<button class="btn-icon" title="Deny Cancel" onclick="bookingsManager.denyCancellation(${b.id})" style="color:var(--danger-color);"><i class="fas fa-times-circle"></i></button>
						` : `
							<button class="btn-icon" title="Cancel" onclick="bookingsManager.cancel(${b.id})"><i class="fas fa-ban"></i></button>
						`}
					</td>
				</tr>
			`).join('');
	}

	async openCreateDialog() {
		const modal = document.getElementById('bookingModal');
		if (!modal) return;
		const form = document.getElementById('bookingForm');
		// Reset
		form.reset();
		modal.classList.add('active');
		form.onsubmit = async (e) => {
			e.preventDefault();
			const record = {
				date: new Date(document.getElementById('bookingDate').value).toISOString(),
				serviceName: document.getElementById('bookingService').value,
				employeeName: document.getElementById('bookingEmployee').value,
				customerName: document.getElementById('bookingCustomer').value,
				roomNumber: document.getElementById('bookingRoom').value,
				status: document.getElementById('bookingStatus').value || 'confirmed'
			};
			await db.add('bookings', record);
			modal.classList.remove('active');
			await this.loadBookings();
			showNotification('Booking created', 'success');
		};
	}

	async edit(id) {
		const b = await db.get('bookings', id);
		if (!b) return;
		const modal = document.getElementById('bookingModal');
		const form = document.getElementById('bookingForm');
		document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
		document.getElementById('bookingDate').value = (b.date||'').slice(0,16);
		document.getElementById('bookingService').value = b.serviceName||'';
		document.getElementById('bookingEmployee').value = b.employeeName||'';
		document.getElementById('bookingCustomer').value = b.customerName||'';
		document.getElementById('bookingRoom').value = b.roomNumber||'';
		document.getElementById('bookingStatus').value = b.status||'confirmed';
		modal.classList.add('active');
		form.onsubmit = async (e) => {
			e.preventDefault();
			b.date = new Date(document.getElementById('bookingDate').value).toISOString();
			b.serviceName = document.getElementById('bookingService').value;
			b.employeeName = document.getElementById('bookingEmployee').value;
			b.customerName = document.getElementById('bookingCustomer').value;
			b.roomNumber = document.getElementById('bookingRoom').value;
			b.status = document.getElementById('bookingStatus').value || 'confirmed';
			b.modifiedAt = new Date().toISOString();
			await db.update('bookings', b);
			// Push status/assignment to backend if exists
			try {
				if (window.apiClient && b.id) {
					await window.apiClient.put(`/api/bookings/${b.id}/status`, {
						status: b.status,
						employeeId: b.employeeId || null,
						employeeName: b.employeeName || null,
						roomNumber: b.roomNumber || null
					});
				}
			} catch (err) { console.warn('Booking status push failed', err); }
			modal.classList.remove('active');
			await this.loadBookings();
		};
	}

	async cancel(id) {
		const b = await db.get('bookings', id);
		if (!b) return;
		// If receptionist, require manager/admin approval
		const isReceptionist = !!(window.roleManager?.activeEmployee && window.roleManager.activeEmployee.role === 'receptionist');
		const ok = await app.confirm('Cancel Booking', isReceptionist ? 'Submit cancellation request for manager/admin approval?' : 'Cancel this booking?');
		if (!ok) return;
		if (isReceptionist) {
			b.status = 'pending_cancel';
			showNotification('Cancellation submitted for approval', 'info');
		} else {
			b.status = 'cancelled';
		}
		b.modifiedAt = new Date().toISOString();
		await db.update('bookings', b);
		try {
			if (window.apiClient && b.id) {
				await window.apiClient.put(`/api/bookings/${b.id}/status`, { status: b.status });
			}
		} catch (e) { console.warn('Cancel push failed', e); }
		await this.loadBookings();
	}

	async accept(id) {
		const b = await db.get('bookings', id);
		if (!b) return;
		// Auto-assign therapist via rotation if none
		if (!b.employeeId && window.assignTherapistByRotation) {
			try {
				const assignedId = await window.assignTherapistByRotation({ bookingId: id });
				if (assignedId) {
					b.employeeId = assignedId;
					const emp = await db.get('employees', assignedId);
					b.employeeName = emp?.name || b.employeeName || '';
				}
			} catch(e){ console.warn('Rotation assignment failed', e); }
		}
		b.status = 'confirmed';
		b.modifiedAt = new Date().toISOString();
		await db.update('bookings', b);
		try {
			if (window.apiClient && b.id) {
				await window.apiClient.put(`/api/bookings/${b.id}/status`, { status: 'confirmed', employeeId: b.employeeId, employeeName: b.employeeName });
			}
		} catch (e) { console.warn('Accept push failed', e); }
		await this.loadBookings();
	}

	async approveCancellation(id) {
		const b = await db.get('bookings', id);
		if (!b) return;
		const ok = await app.confirm('Approve Cancellation', 'Approve this cancellation request?');
		if (!ok) return;
		b.status = 'cancelled';
		b.cancelledAt = new Date().toISOString();
		b.cancelledBy = window.roleManager?.activeEmployee?.name || 'Manager';
		await db.update('bookings', b);
		try {
			if (window.apiClient && b.id) {
				await window.apiClient.put(`/api/bookings/${b.id}/status`, { status: 'cancelled' });
			}
		} catch (e) { console.warn('Cancel approval push failed', e); }
		showNotification('Cancellation approved', 'success');
		await this.loadBookings();
	}

	async denyCancellation(id) {
		const b = await db.get('bookings', id);
		if (!b) return;
		const ok = await app.confirm('Deny Cancellation', 'Deny this cancellation request?');
		if (!ok) return;
		b.status = 'confirmed'; // revert to confirmed
		b.cancelDeniedAt = new Date().toISOString();
		b.cancelDeniedBy = window.roleManager?.activeEmployee?.name || 'Manager';
		await db.update('bookings', b);
		try {
			if (window.apiClient && b.id) {
				await window.apiClient.put(`/api/bookings/${b.id}/status`, { status: 'confirmed' });
			}
		} catch (e) { console.warn('Cancel denial push failed', e); }
		showNotification('Cancellation denied - booking restored', 'info');
		await this.loadBookings();
	}
}

console.log('📦 Creating BookingsManager instance...');
const bookingsManager = new BookingsManager();
console.log('🔗 Setting up window.loadBookings function...');
window.loadBookings = async function() { 
	console.log('📞 window.loadBookings() called');
	try {
		await bookingsManager.init(); 
		console.log('✅ window.loadBookings() completed successfully');
	} catch (error) {
		console.error('❌ window.loadBookings() failed:', error);
	}
};
console.log('✅ window.loadBookings is now available:', typeof window.loadBookings);

// Debug function to test therapist view
window.testTherapistView = function() {
	console.log('🧪 Testing therapist view...');
	console.log('Current role manager:', window.roleManager);
	console.log('Current auth system:', window.authSystem);
	console.log('Is therapist view?', bookingsManager.isTherapistView());
	bookingsManager.buildTherapistPage();
	bookingsManager.syncTherapistOnly();
};

// Debug function to create test bookings for the current therapist
window.createTestBookings = async function() {
	console.log('🧪 Creating test bookings...');
	const me = await bookingsManager.getTherapistIdentifiers();
	console.log('👤 Creating bookings for therapist:', me);
	
	// Create test bookings with the therapist's identifiers
	const testBookings = [
		{
			id: 'test_' + Date.now() + '_1',
			customerName: 'John Doe',
			serviceName: 'Swedish Massage',
			employeeId: me.ids[0] || 'test_therapist_id',
			employeeName: me.name || 'Test Therapist',
			employeeEmail: me.email || 'test@example.com',
			startTime: new Date().toISOString(),
			date: new Date().toISOString(),
			status: 'confirmed',
			roomNumber: 'Room 1',
			duration: 60
		},
		{
			id: 'test_' + Date.now() + '_2',
			customerName: 'Jane Smith',
			serviceName: 'Deep Tissue Massage',
			employeeId: me.ids[0] || 'test_therapist_id',
			employeeName: me.name || 'Test Therapist',
			employeeEmail: me.email || 'test@example.com',
			startTime: new Date(Date.now() + 3600000).toISOString(), // +1 hour
			date: new Date(Date.now() + 3600000).toISOString(),
			status: 'pending',
			roomNumber: 'Room 2',
			duration: 90
		}
	];
	
	// Store test bookings locally
	for (const booking of testBookings) {
		await db.add('bookings', booking);
		console.log('✅ Created test booking:', booking);
	}
	
	// Reload bookings
	await bookingsManager.init();
	console.log('🎉 Test bookings created and page reloaded!');
};

// Hook: when a new booking is created (example function)
async function createBooking(booking) {
	// booking: {customerId, serviceId, startTime, durationMins, employeeId?}
	try {
		const toSave = { ...booking };
		// If no therapist chosen, use rotation
		if (!toSave.employeeId && window.assignTherapistByRotation) {
			const assigned = await window.assignTherapistByRotation({ bookingId: null });
			toSave.employeeId = assigned || null;
		}
		toSave.date = toSave.startTime;
		toSave.status = toSave.status || 'pending';
		await db.add('bookings', toSave);
		showNotification('Booking saved', 'success');
		return toSave;
	} catch (e) {
		console.error('Failed creating booking', e);
		showNotification('Failed to create booking', 'error');
	}
}

// Expose for other modules/UI
window.createBooking = createBooking;


