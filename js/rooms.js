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
					<span class="room-status-${r.status}">${r.status}</span>
				</div>
				<div class="room-meta"><span class="room-type">${(r.type || 'standard').toUpperCase()}</span><span>Group ${r.group || '-'}</span></div>
				<div class="room-timer" id="roomTimer_${r.id}">--:--:--</div>
				<div class="room-actions">
					<button class="btn btn-secondary" onclick="roomsManager.startTimer(${r.id})">Start</button>
					<button class="btn btn-primary" onclick="roomsManager.finishTimer(${r.id})">Finish</button>
				</div>
			</div>
		`).join('');
	}

	async configureRooms() {
		const countStr = await app.prompt({ title: 'Configure Rooms', label: 'How many rooms? (1-100)', inputType: 'number', value: String(this.rooms.length || 8) });
		if (countStr === null) return;
		const count = Math.min(100, Math.max(1, parseInt(countStr || '8')));
		const existing = await db.getAll('rooms');
		for (const r of existing) { await db.delete('rooms', r.id); }
		for (let i = 1; i <= count; i++) {
			const type = await app.prompt({ title: `Room ${i}`, label: 'Type', type: 'select', options: [
				{ value: 'standard', label: 'Standard' },
				{ value: 'vip', label: 'VIP' },
				{ value: 'couple', label: 'Couple' },
			], value: (i % 5 === 0 ? 'vip' : (i % 2 === 0 ? 'couple' : 'standard')) });
			if (type === null) { continue; }
			await db.add('rooms', { number: i.toString(), status: 'available', group: i % 2 === 0 ? 'B' : 'A', type });
		}
		await this.loadRooms();
	}

	async startTimer(roomId) {
		const room = await db.get('rooms', roomId);
		if (!room) return;
		if (room.status === 'occupied') { showNotification('Room is already occupied', 'warning'); return; }
		const ok = await app.confirm('Start Session', `Start session in Room ${room.number}?`);
		if (!ok) return;
		room.status = 'occupied';
		await db.update('rooms', room);
		const session = {
			roomId,
			status: 'active',
			startTime: new Date().toISOString()
		};
		const id = await db.add('sessions', session);
		room.activeSessionId = id;
		await db.update('rooms', room);
		this.tickTimer(roomId);
		showNotification(`Timer started for Room ${room.number}`, 'success');
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
		await db.update('rooms', room);
		await this.loadRooms();
	}

	tickTimer(roomId) {
		const el = document.getElementById(`roomTimer_${roomId}`);
		if (!el) return;
		let start = Date.now();
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


