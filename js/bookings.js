// Bookings Management
class BookingsManager {
	constructor() {
		this.bookings = [];
	}

	async init() {
		await this.loadBookings();
		this.setupEventListeners();
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
		this.bookings = await db.getAll('bookings');
		this.renderBookingsTable();
	}

	renderBookingsTable() {
		const tbody = document.getElementById('bookingsTableBody');
		if (!tbody) return;
		if (this.bookings.length === 0) {
			tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1rem;">No bookings yet</td></tr>';
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
						<button class="btn-icon" title="Edit" onclick="bookingsManager.edit(${b.id})"><i class="fas fa-edit"></i></button>
						<button class="btn-icon" title="Cancel" onclick="bookingsManager.cancel(${b.id})"><i class="fas fa-ban"></i></button>
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
			modal.classList.remove('active');
			await this.loadBookings();
		};
	}

	async cancel(id) {
		const b = await db.get('bookings', id);
		if (!b) return;
		const ok = await app.confirm('Cancel Booking', 'Cancel this booking?');
		if (!ok) return;
		b.status = 'cancelled';
		b.modifiedAt = new Date().toISOString();
		await db.update('bookings', b);
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


