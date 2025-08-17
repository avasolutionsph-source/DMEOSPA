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
		const date = prompt('Booking date & time (YYYY-MM-DDTHH:mm)');
		if (!date) return;
		const serviceName = prompt('Service name');
		const employeeName = prompt('Therapist name');
		const customerName = prompt('Customer name');
		const roomNumber = prompt('Room number');
		const record = {
			date: new Date(date).toISOString(),
			serviceName,
			employeeName,
			customerName,
			roomNumber,
			status: 'confirmed'
		};
		await db.add('bookings', record);
		await this.loadBookings();
		showNotification('Booking created', 'success');
	}

	async edit(id) {
		const b = await db.get('bookings', id);
		if (!b) return;
		const newDate = prompt('New date (YYYY-MM-DDTHH:mm)', b.date?.slice(0,16));
		if (!newDate) return;
		b.date = new Date(newDate).toISOString();
		b.modifiedAt = new Date().toISOString();
		await db.update('bookings', b);
		await this.loadBookings();
	}

	async cancel(id) {
		const b = await db.get('bookings', id);
		if (!b) return;
		if (!confirm('Cancel this booking?')) return;
		b.status = 'cancelled';
		b.modifiedAt = new Date().toISOString();
		await db.update('bookings', b);
		await this.loadBookings();
	}
}

const bookingsManager = new BookingsManager();
window.loadBookings = async function() { await bookingsManager.init(); };


