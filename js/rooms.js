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
		
		// Filter rooms for therapist role - show only their assigned rooms
		let roomsToShow = this.rooms;
		if (window.roleManager?.activeEmployee?.role === 'therapist') {
			const therapistId = window.roleManager.activeEmployee.id;
			roomsToShow = this.rooms.filter(r => 
				!r.currentEmployeeId || String(r.currentEmployeeId) === String(therapistId)
			);
		}
		
		grid.innerHTML = roomsToShow.map(r => `
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
					<button id="cleanBtn_${r.id}" class="btn btn-warning" onclick="roomsManager.showCleaningChecklist(${r.id})" ${r.status==='cleaning' ? 'disabled' : ''} style="font-size:.8rem;">Clean</button>
					<button id="readyBtn_${r.id}" class="btn btn-success" onclick="roomsManager.markReady(${r.id})" ${r.status!=='cleaning' ? 'disabled' : ''} style="font-size:.8rem;">Ready</button>
				</div>
			</div>
		`).join('');

		// Start timers for any rooms already occupied
		this.rooms.forEach(r => {
			if (r.status === 'occupied' && r.sessionStartTime) {
				this.tickTimer(r.id, r.sessionStartTime, r.estimatedMinutes || null);
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
		// Ask for service, duration, and employee if not provided
		let selectedServiceName = overrides.serviceName || '';
		let selectedServiceDuration = overrides.serviceDuration || 0;
		let selectedEmployeeId = overrides.employeeId || window.posSystem?.selectedEmployee || null;
		if (!selectedServiceName || !selectedServiceDuration || !selectedEmployeeId) {
			const details = await this.promptSessionDetails(room, { employeeId: selectedEmployeeId });
			if (!details) return; // cancelled
			selectedServiceName = details.serviceName;
			selectedServiceDuration = details.duration;
			selectedEmployeeId = details.employeeId || selectedEmployeeId;
		}
		if (!skipConfirm) {
			const ok = await app.confirm('Start Session', `Start ${selectedServiceName} for ${selectedServiceDuration} min in Room ${room.number}?`);
			if (!ok) return;
		}
		room.status = 'occupied';
		// Attach selected employee
		const employeeId = selectedEmployeeId || null;
		let employeeName = '';
		if (employeeId) {
			const emp = await db.get('employees', parseInt(employeeId));
			employeeName = emp?.name || '';
		}
		let serviceName = selectedServiceName;
		let serviceDuration = selectedServiceDuration;
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
		this.tickTimer(roomId, room.sessionStartTime, serviceDuration);
		showNotification(`Timer started for Room ${room.number}`, 'success');
		await this.loadRooms();
	}

	// Prompt helper for selecting service + duration + employee in ONE modal
	async promptSessionDetails(room, prefill = {}) {
		try {
			const products = await db.getAll('products');
			const services = (products || []).filter(p => p.type === 'service');
			const employees = await db.getAll('employees');
			if (!services.length) { showNotification('No services configured. Please add services first.', 'warning'); return null; }

			// Build modal dynamically (single step)
			const modal = document.createElement('div');
			modal.className = 'modal active';
			modal.innerHTML = `
				<div class="modal-content">
					<div class="modal-header">
						<h2>Start Session</h2>
						<button class="modal-close" aria-label="Close">&times;</button>
					</div>
					<div class="modal-body">
						<label style="font-weight:600;">Select service</label>
						<select id="sessionServiceSelect" class="form-input">
							${services.map(s => `<option value="${s.id}">${s.name}${s.duration ? ` (${s.duration} min)` : ''}</option>`).join('')}
						</select>
						<div style="height:8px;"></div>
						<label style="font-weight:600;">Duration (minutes)</label>
						<input id="sessionDurationInput" class="form-input" type="number" min="1" placeholder="Minutes" />
						<div style="height:8px;"></div>
						<label style="font-weight:600;">Assign Employee</label>
						<select id="sessionEmployeeSelect" class="form-input">
							${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
						</select>
					</div>
					<div class="modal-footer" style="display:flex; justify-content:flex-end; gap:.75rem;">
						<button class="btn btn-secondary" id="sessionCancelBtn">Cancel</button>
						<button class="btn btn-primary" id="sessionOkBtn">OK</button>
					</div>
				</div>
			`;
			document.body.appendChild(modal);

			const close = () => { 
				try { 
					document.removeEventListener('keydown', keyHandler);
					document.body.removeChild(modal); 
				} catch(_){} 
			};
			modal.querySelector('.modal-close').onclick = close;
			modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

			const serviceSelect = modal.querySelector('#sessionServiceSelect');
			const durationInput = modal.querySelector('#sessionDurationInput');
			const employeeSelect = modal.querySelector('#sessionEmployeeSelect');

			// Prefill values
			if (prefill.employeeId) employeeSelect.value = String(prefill.employeeId);
			// Default selection sync with duration
			const syncDuration = () => {
				const svc = services.find(s => String(s.id) === String(serviceSelect.value));
				if (svc && svc.duration && (!durationInput.value || durationInput.value === '')) {
					durationInput.value = String(svc.duration);
				}
			};
			syncDuration();
			serviceSelect.addEventListener('change', syncDuration);

			const keyHandler = (e) => {
				if (e.key === 'Escape') { e.preventDefault(); close(); }
				if (e.key === 'Enter') { e.preventDefault(); modal.querySelector('#sessionOkBtn').click(); }
			};
			document.addEventListener('keydown', keyHandler);

			return await new Promise(resolve => {
				modal.querySelector('#sessionCancelBtn').onclick = () => { close(); resolve(null); };
				modal.querySelector('#sessionOkBtn').onclick = () => {
					const svc = services.find(s => String(s.id) === String(serviceSelect.value));
					const duration = Math.max(1, parseInt(durationInput.value || (svc?.duration || 60), 10));
					const employeeId = employeeSelect.value ? String(employeeSelect.value) : null;
					if (!svc || !employeeId) { showNotification('Please select service and employee', 'warning'); return; }
					const payload = { serviceName: svc.name, duration, employeeId };
					close();
					resolve(payload);
				};
			});
		} catch (e) {
			console.error('Failed to prompt session details', e);
			return null;
		}
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
	async assignRoomFromPOS(roomNumber, employeeIdOverride, serviceNameOverride, serviceDurationOverride, serviceIdOverride) {
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
		// If still no duration, try to fetch from products
		if (!duration) {
			try {
				if (serviceIdOverride) {
					const svc = await db.get('products', serviceIdOverride);
					if (svc && svc.duration) duration = svc.duration;
				}
				if (!duration && serviceName) {
					const products = await db.getAll('products');
					const svc2 = products.find(p => p.type === 'service' && p.name === serviceName);
					if (svc2 && svc2.duration) duration = svc2.duration;
				}
			} catch(_) {}
		}
		await this.startTimer(room.id, true, { employeeId, serviceName, serviceDuration: duration });
	}

	async showCleaningChecklist(roomId) {
		const room = await db.get('rooms', roomId);
		if (!room) return;
		if (room.status === 'occupied') { showNotification('Cannot clean occupied room', 'warning'); return; }
		
		const modal = document.createElement('div');
		modal.className = 'modal active';
		modal.innerHTML = `
			<div class="modal-content">
				<div class="modal-header">
					<h2>Cleaning Checklist - Room ${room.number}</h2>
					<button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
				</div>
				<div class="modal-body">
					<div class="form-group">
						<label style="margin-bottom:.5rem;">Was the room cleaned by the previous therapist?</label>
						<div style="display:flex;gap:1rem;">
							<label><input type="radio" name="prevCleaned" value="yes"> Yes</label>
							<label><input type="radio" name="prevCleaned" value="no"> No</label>
						</div>
					</div>
					<div class="form-group">
						<label style="margin-bottom:.5rem;">Cleaning Items:</label>
						<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
							<label><input type="checkbox" id="cleanBoxer"> Boxer/Linens</label>
							<label><input type="checkbox" id="cleanBedding"> Beddings</label>
							<label><input type="checkbox" id="cleanPillow"> Pillow</label>
							<label><input type="checkbox" id="cleanTowel"> Towel</label>
						</div>
					</div>
					<div class="form-group">
						<label>Additional Notes</label>
						<textarea id="cleaningNotes" class="form-input" rows="2" placeholder="Any issues or special notes"></textarea>
					</div>
				</div>
				<div class="modal-actions">
					<button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
					<button class="btn btn-primary" id="completeCleaningBtn">Complete Cleaning</button>
				</div>
			</div>
		`;
		document.body.appendChild(modal);

		modal.querySelector('#completeCleaningBtn').onclick = async () => {
			const prevCleaned = modal.querySelector('input[name="prevCleaned"]:checked')?.value;
			const items = {
				boxer: modal.querySelector('#cleanBoxer').checked,
				bedding: modal.querySelector('#cleanBedding').checked,
				pillow: modal.querySelector('#cleanPillow').checked,
				towel: modal.querySelector('#cleanTowel').checked
			};
			const notes = modal.querySelector('#cleaningNotes').value.trim();

			room.status = 'cleaning';
			room.cleaningStartTime = new Date().toISOString();
			room.cleaningChecklist = {
				prevCleaned,
				items,
				notes,
				cleanedBy: window.roleManager?.activeEmployee?.name || 'Unknown',
				completedAt: new Date().toISOString()
			};
			await db.update('rooms', room);
			showNotification(`Room ${room.number} cleaning recorded`, 'success');
			modal.remove();
			await this.loadRooms();
		};
	}

	async markReady(roomId) {
		const room = await db.get('rooms', roomId);
		if (!room) return;
		room.status = 'available';
		delete room.cleaningStartTime;
		await db.update('rooms', room);
		showNotification(`Room ${room.number} is ready`, 'success');
		await this.loadRooms();
	}

	tickTimer(roomId, startTimeISO, expectedMinutes = null) {
		const el = document.getElementById(`roomTimer_${roomId}`);
		if (!el) return;
		let start = startTimeISO ? new Date(startTimeISO).getTime() : Date.now();
		const update = () => {
			const diff = Date.now() - start;
			const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
			const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
			const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
			el.textContent = `${h}:${m}:${s}`;
			if (expectedMinutes && expectedMinutes > 0) {
				const exceeded = diff > expectedMinutes * 60000;
				el.style.color = exceeded ? '#dc2626' : '';
			}
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


