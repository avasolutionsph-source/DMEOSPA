// Bookings Management
class BookingsManager {
	constructor() {
		this.bookings = [];
		this.lastSync = null;
		this.therapistBookings = [];
	}

	async init() {
		if (this.isTherapistView()) {
			this.buildTherapistPage();
			await this.syncTherapistOnly();
			if (!this._therapistSyncTimer) {
				this._therapistSyncTimer = setInterval(() => this.syncTherapistOnly().catch(()=>{}), 60000);
			}
			return;
		}

		this.ensureTable();
		await this.loadBookings();
		this.setupEventListeners();
		this.setupAutoSync();
		// Force an immediate sync on first open to avoid blank state
		this.syncExternalBookings().catch(()=>{});
	}

	isTherapistView() {
		try {
			const roleA = (window.roleManager?.activeEmployee?.role || '').toLowerCase();
			const roleB = (window.authSystem?.currentUser?.role || '').toLowerCase();
			return roleA === 'therapist' || roleB === 'therapist';
		} catch(_) { return false; }
	}

	buildTherapistPage() {
		const page = document.getElementById('bookings');
		if (!page) return;
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
	}

	async getTherapistIdentifiers() {
		const identifiers = { ids: [], name: '', email: '' };
		try { identifiers.email = (window.authSystem?.currentUser?.email || '').toLowerCase(); } catch(_) {}
		try {
			// Try to resolve employee id and name from local employees by email
			const emps = await db.getAll('employees');
			if (Array.isArray(emps) && identifiers.email) {
				const match = emps.find(e => (e.email||'').toLowerCase() === identifiers.email);
				if (match) {
					if (match.id) identifiers.ids.push(String(match.id));
					if (match._id) identifiers.ids.push(String(match._id));
					if (match.name) identifiers.name = match.name;
				}
			}
		} catch(_) {}
		// Fallback name from role manager or user profile
		if (!identifiers.name) {
			identifiers.name = window.roleManager?.activeEmployee?.name 
				|| window.authSystem?.currentUser?.employeeName 
				|| '';
		}
		return identifiers;
	}

	async syncTherapistOnly() {
		try {
			if (!window.apiClient) return;
			const resp = await window.apiClient.get('/api/business/bookings');
			let json = null;
			try { json = await resp.json(); } catch(_) { json = null; }
			const all = json?.bookings || json?.data || [];
			const me = await this.getTherapistIdentifiers();
			const norm = (s) => (s||'').trim().toLowerCase();
			const filtered = all.filter(b => {
				const bid = String(b.employeeId || '');
				const bname = norm(b.employeeName);
				return (me.ids.includes(bid)) || (!!me.name && bname === norm(me.name));
			});
			this.therapistBookings = filtered.sort((a,b) => new Date(a.startTime||a.date) - new Date(b.startTime||b.date));
			this.renderTherapistBookings();
		} catch (e) {
			console.warn('Therapist bookings fetch failed, falling back to local', e);
			// Fallback to locally cached bookings filtered by therapist
			let local = await db.getAll('bookings');
			const me = await this.getTherapistIdentifiers();
			const norm = (s) => (s||'').trim().toLowerCase();
			local = local.filter(b => me.ids.includes(String(b.employeeId||'')) || (!!me.name && norm(b.employeeName) === norm(me.name)));
			this.therapistBookings = local.sort((a,b) => new Date(a.date) - new Date(b.date));
			this.renderTherapistBookings();
		}
	}

	renderTherapistBookings() {
		const tbody = document.getElementById('therapistBookingsBody');
		if (!tbody) return;
		if (this.therapistBookings.length === 0) {
			tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1rem;">No bookings assigned to you yet</td></tr>';
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

const bookingsManager = new BookingsManager();
window.loadBookings = async function() { await bookingsManager.init(); };

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


