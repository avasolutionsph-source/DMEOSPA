// Rooms and Session Timers
class RoomsManager {
	constructor() {
		this.rooms = [];
	}

	async init() {
		await this.ensureDefaultRooms();
		await this.loadRooms();
		this.setupEventListeners();
	}

	setupEventListeners() {
		if (this._listenersAttached) return;
		this._listenersAttached = true;
		const btn = document.getElementById('configureRoomsBtn');
		if (btn) btn.addEventListener('click', () => this.configureRooms());
	}

	async ensureDefaultRooms() {
		this.rooms = await db.getAll('rooms');
		if (this.rooms.length === 0) {
			for (let i = 1; i <= 8; i++) {
				await db.add('rooms', { number: i.toString(), status: 'available', group: i % 2 === 0 ? 'B' : 'A', type: 'standard' });
			}
		}
	}

	async loadRooms() {
		this.rooms = await db.getAll('rooms');
		this.render();
	}

	render() {
		const grid = document.getElementById('roomsGrid');
		if (!grid) return;
		if (this.rooms.length === 0) {
			grid.innerHTML = '<div style="text-align:center;padding:1rem;grid-column:1/-1;">No rooms configured</div>';
			return;
		}
		grid.innerHTML = this.rooms.map(r => `
			<div class="room-card">
				<div style="display:flex;justify-content:space-between;align-items:center;">
					<strong>Room ${r.number}</strong>
					<span id="roomStatus_${r.id}" class="room-status-${r.status}">${r.status}</span>
				</div>
				<div class="room-meta"><span class="room-type">${(r.type || 'standard').toUpperCase()}</span><span>Group ${r.group || '-'}</span></div>
				<div class="room-timer" id="roomTimer_${r.id}">--:--:--</div>
				<div id="roomAssign_${r.id}" style="font-size:.85rem;color:var(--gray);margin:.25rem 0;">${r.currentEmployeeName || r.currentServiceName ? `${r.currentEmployeeName ? `<strong>${r.currentEmployeeName}</strong>` : ''} ${r.currentServiceName ? `• ${r.currentServiceName}` : ''}` : ''}</div>
				${r.estimatedMinutes ? `<div class="room-meta" style="margin-top:2px; font-size:.8rem; color:#64748b;">⏱ ${r.estimatedMinutes} min</div>` : ''}
				<div class="room-actions">
					<button id="startBtn_${r.id}" class="btn btn-secondary" onclick="roomsManager.startTimer(${r.id})" ${r.status==='occupied' ? 'disabled' : ''}>Start</button>
					<button id="finishBtn_${r.id}" class="btn btn-primary" onclick="roomsManager.finishTimer(${r.id})" ${r.status!=='occupied' ? 'disabled' : ''}>Finish</button>
				</div>
			</div>
		`).join('');

		// Start timers for any rooms already occupied
		this.rooms.forEach(r => {
			if (r.status === 'occupied' && r.sessionStartTime) {
				this.tickTimer(r.id, r.sessionStartTime);
			}
		});
	}

	// New multi-field configuration modal
	async configureRooms() {
		const modal = document.getElementById('roomsConfigModal');
		if (!modal) return;
		const form = modal.querySelector('#roomsConfigForm');
		const countInput = modal.querySelector('#roomsCount');
		const defaultSelect = modal.querySelector('#defaultRoomType');
		const list = modal.querySelector('#roomTypeList');
		const applyBtn = modal.querySelector('#applyDefaultTypeBtn');

		// Build grid
		const buildList = () => {
			const count = Math.min(100, Math.max(1, parseInt(countInput.value || '8')));
			list.innerHTML = '';
			for (let i = 1; i <= count; i++) {
				const wrapper = document.createElement('div');
				wrapper.className = 'room-type-item';
				wrapper.innerHTML = `
					<label style="min-width:60px;">Room ${i}</label>
					<select class="form-input room-type-select">
						<option value="standard">Standard</option>
						<option value="vip">VIP</option>
						<option value="couple">Couple</option>
					</select>
				`;
				const select = wrapper.querySelector('select');
				select.value = (i % 5 === 0 ? 'vip' : (i % 2 === 0 ? 'couple' : defaultSelect.value));
				list.appendChild(wrapper);
			}
		};

		// Events
		countInput.oninput = buildList;
		applyBtn.onclick = () => {
			const selects = list.querySelectorAll('.room-type-select');
			selects.forEach(s => { s.value = defaultSelect.value; });
		};

		// Initial render
		buildList();
		modal.classList.add('active');

		form.onsubmit = async (e) => {
			e.preventDefault();
			const count = Math.min(100, Math.max(1, parseInt(countInput.value || '8')));
			// Replace all rooms
			const existing = await db.getAll('rooms');
			for (const r of existing) { await db.delete('rooms', r.id); }
			const selects = list.querySelectorAll('.room-type-select');
			for (let i = 1; i <= count; i++) {
				const type = selects[i-1]?.value || defaultSelect.value;
				await db.add('rooms', { number: i.toString(), status: 'available', group: i % 2 === 0 ? 'B' : 'A', type });
			}
			modal.classList.remove('active');
			await this.loadRooms();
			showNotification('Rooms configuration saved', 'success');
		};
	}

	async startTimer(roomId, skipConfirm, overrides = {}) {
		const room = await db.get('rooms', roomId);
		if (!room) return;
		if (room.status === 'occupied') { showNotification('Room is already occupied', 'warning'); return; }
		if (!skipConfirm) {
			const ok = await app.confirm('Start Session', `Start session in Room ${room.number}?`);
			if (!ok) return;
		}
		room.status = 'occupied';
		// Attach selected employee and first service in POS cart if available
		const employeeId = overrides.employeeId || window.posSystem?.selectedEmployee || null;
		let employeeName = '';
		if (employeeId) {
			const emp = await db.get('employees', parseInt(employeeId));
			employeeName = emp?.name || '';
		}
		let serviceName = '';
		let serviceDuration = 0;
		if (overrides.serviceName) {
			serviceName = overrides.serviceName;
		} else {
			const cart = window.posSystem?.cart || [];
			const firstService = cart.find(i => i.type === 'service');
			if (firstService) { serviceName = firstService.name; serviceDuration = firstService.duration || 0; }
		}
		if (overrides.serviceDuration) { serviceDuration = overrides.serviceDuration; }
		// Fallback: if duration is still unknown, look up the service in products by name
		if ((!serviceDuration || serviceDuration === 0) && serviceName) {
			try {
				const products = await db.getAll('products');
				const svc = products.find(p => p.type === 'service' && p.name === serviceName);
				if (svc && svc.duration) serviceDuration = svc.duration;
			} catch(_) {}
		}
		room.currentEmployeeId = employeeId || null;
		room.currentEmployeeName = employeeName || '';
		room.currentServiceName = serviceName || '';
		await db.update('rooms', room);
		// Update UI immediately
		const statusEl = document.getElementById(`roomStatus_${room.id}`);
		if (statusEl) { statusEl.textContent = 'occupied'; statusEl.className = 'room-status-occupied'; }
		const startBtn = document.getElementById(`startBtn_${room.id}`);
		const finishBtn = document.getElementById(`finishBtn_${room.id}`);
		if (startBtn) startBtn.disabled = true;
		if (finishBtn) finishBtn.disabled = false;
		const assignEl = document.getElementById(`roomAssign_${room.id}`);
		if (assignEl) assignEl.innerHTML = `${employeeName ? `<strong>${employeeName}</strong>` : ''} ${serviceName ? `• ${serviceName}` : ''}`;
		const session = {
			roomId,
			status: 'active',
			startTime: new Date().toISOString(),
			employeeId: employeeId ? String(employeeId) : null,
			employeeName: employeeName || null,
			serviceName: serviceName || null,
			estimatedMinutes: serviceDuration || null
		};
		const id = await db.add('sessions', session);
		room.activeSessionId = id;
		room.sessionStartTime = session.startTime;
		room.estimatedMinutes = serviceDuration || null;
		await db.update('rooms', room);
		this.tickTimer(roomId, room.sessionStartTime);
		showNotification(`Timer started for Room ${room.number}`, 'success');
		await this.loadRooms();
	}

	async finishTimer(roomId) {
		const room = await db.get('rooms', roomId);
		if (!room || !room.activeSessionId) return;
		const ok = await app.confirm('Finish Session', `Finish session in Room ${room.number}?`);
		if (!ok) return;
		const session = await db.get('sessions', room.activeSessionId);
		if (!session) return;
		session.status = 'completed';
		session.endTime = new Date().toISOString();
		await db.update('sessions', session);
		room.status = 'available';
		delete room.activeSessionId;
		delete room.sessionStartTime;
		delete room.currentEmployeeId; delete room.currentEmployeeName; delete room.currentServiceName;
		await db.update('rooms', room);
		// Update UI immediately
		const statusEl = document.getElementById(`roomStatus_${room.id}`);
		if (statusEl) { statusEl.textContent = 'available'; statusEl.className = 'room-status-available'; }
		const startBtn = document.getElementById(`startBtn_${room.id}`);
		const finishBtn = document.getElementById(`finishBtn_${room.id}`);
		if (startBtn) startBtn.disabled = false;
		if (finishBtn) finishBtn.disabled = true;
		await this.loadRooms();
	}

	// Start room directly from POS with a selected room number
	async assignRoomFromPOS(roomNumber, employeeIdOverride, serviceNameOverride, serviceDurationOverride) {
		const rooms = await db.getAll('rooms');
		const room = rooms.find(r => String(r.number) === String(roomNumber));
		if (!room) { showNotification('Room not found', 'error'); return; }
		if (room.status === 'occupied') { showNotification('Room already occupied', 'warning'); return; }
		const employeeId = employeeIdOverride || window.posSystem?.selectedEmployee || null;
		let serviceName = serviceNameOverride || '';
		let duration = serviceDurationOverride || null;
		if (!serviceName) {
			const cart = window.posSystem?.cart || [];
			const firstService = cart.find(i => i.type === 'service');
			if (firstService) { serviceName = firstService.name; duration = firstService.duration || null; }
		}
		await this.startTimer(room.id, true, { employeeId, serviceName, serviceDuration: duration });
	}

	tickTimer(roomId, startTimeISO) {
		const el = document.getElementById(`roomTimer_${roomId}`);
		if (!el) return;
		let start = startTimeISO ? new Date(startTimeISO).getTime() : Date.now();
		const update = () => {
			const diff = Date.now() - start;
			const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
			const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
			const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
			el.textContent = `${h}:${m}:${s}`;
			if (el.isConnected) requestAnimationFrame(update);
		};
		requestAnimationFrame(update);
	}
}

const roomsManager = new RoomsManager();
window.loadRooms = async function() { await roomsManager.init(); };
// Expose helper for POS
window.assignRoomFromPOS = (roomNumber) => roomsManager.assignRoomFromPOS(roomNumber);
// Also expose the instance for direct calls from POS
window.roomsManager = roomsManager;


