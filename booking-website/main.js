(function(){
	const isLocal = ['localhost','127.0.0.1'].some(h => location.hostname.startsWith(h));
	const defaultApiHost = isLocal ? 'http://localhost:4000' : 'https://ava-marketing-api.onrender.com';
	const apiBase = (localStorage.getItem('pwaApiUrl') || defaultApiHost) + '/api';
	let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
	let businessId = null;

	// Read businessId from query (?businessId=xxx) for public booking and persist
	try {
		const params = new URLSearchParams(location.search);
		const qBiz = params.get('businessId') || params.get('userId');
		if (qBiz) localStorage.setItem('bookingBusinessId', qBiz);
		businessId = localStorage.getItem('bookingBusinessId') || null;
	} catch(e) {}

	const qs = sel => document.querySelector(sel);
	const storeSelect = qs('#storeSelect');
	const serviceSelect = qs('#serviceSelect');
	const employeeSelect = qs('#employeeSelect');
	const loginBtn = qs('#loginBtn');
	const logoutBtn = qs('#logoutBtn');
	const submitBtn = qs('#submitBookingBtn');
	const checkBtn = qs('#checkAvailabilityBtn');
	const availabilityResult = qs('#availabilityResult');
	const businessChips = qs('#businessChips');
	const businessList = qs('#businessList');
	const serviceChips = qs('#serviceChips');
	const slotGrid = qs('#slotGrid');
	const dateInput = qs('#dateInput');
	const summaryService = qs('#summaryService');
	const summaryTime = qs('#summaryTime');
	const storeSection = qs('#storeSection');
	const businessHint = qs('#businessHint');

	let selectedService = null;
	let selectedSlot = null;

	function setToken(t){ token = t; if(t){ localStorage.setItem('authToken', t); } }

	async function fetchJSON(url, opts={}){
		const headers = { 'Content-Type':'application/json' };
		if (token) headers['Authorization'] = `Bearer ${token}`;
		else if (businessId) headers['x-user-id'] = businessId;
		const res = await fetch(url, { ...opts, headers });
		if (!res.ok) throw new Error(await res.text());
		const ct = res.headers.get('content-type') || '';
		return ct.includes('application/json') ? res.json() : { raw: await res.text() };
	}

	function initAuth(){
		try { if (!token && window.getMarketingAuthToken) setToken(window.getMarketingAuthToken()); } catch(e){}
		const publicMode = !!businessId && !token;
		loginBtn.style.display = token ? 'none' : (publicMode ? 'none' : 'inline-block');
		logoutBtn.style.display = token ? 'inline-block' : 'none';
	}

	async function login() {
		const email = prompt('Email'); if(!email) return;
		const password = prompt('Password'); if(!password) return;
		try {
			const res = await fetch(`${apiBase}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Login failed');
			setToken(data.token);
			initAuth();
			await loadCatalog();
			alert('Logged in');
		} catch (e) {
			alert('Login failed');
		}
	}

	function logout(){
		localStorage.removeItem('authToken');
		sessionStorage.removeItem('authToken');
		token = null;
		initAuth();
	}

	async function loadBusinesses(){
		try {
			const r = await fetchJSON(`${defaultApiHost}/api/public/businesses`);
			const list = r.data || [];
			if (businessList) {
				businessList.innerHTML = list.map(b => `
					<button class="biz-card${businessId===b.id?' active':''}" data-biz="${b.id}">
						<div class="biz-thumb">${(b.name||'S')[0]}</div>
						<div class="biz-info">
							<div class="biz-name">${b.name}</div>
							<div class="biz-meta">Spa • Open</div>
						</div>
					</button>
				`).join('');
				businessList.querySelectorAll('.biz-card').forEach(card => {
					card.addEventListener('click', async () => {
						businessId = card.dataset.biz;
						localStorage.setItem('bookingBusinessId', businessId);
						businessList.querySelectorAll('.biz-card').forEach(x=>x.classList.remove('active'));
						card.classList.add('active');
						storeSection.style.display = 'block';
						businessHint.textContent = 'Loading services...';
						await loadCatalog();
						businessHint.textContent = 'Spa selected';
						await checkAvailability();
					});
				});
			} else if (businessChips) {
				businessChips.innerHTML = list.map(b => `<button class="chip${businessId===b.id?' active':''}" data-biz="${b.id}">${b.name}</button>`).join('');
				businessChips.querySelectorAll('.chip').forEach(btn => {
					btn.addEventListener('click', async () => {
						businessId = btn.dataset.biz;
						localStorage.setItem('bookingBusinessId', businessId);
						businessChips.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
						btn.classList.add('active');
						storeSection.style.display = 'block';
						businessHint.textContent = 'Loading services...';
						await loadCatalog();
						businessHint.textContent = 'Spa selected';
						await checkAvailability();
					});
				});
			}
			if (!businessId && list[0]) {
				if (businessList) businessList.querySelector('.biz-card')?.click();
				else businessChips.querySelector('.chip')?.click();
			}
		} catch(e){ console.warn('Failed to load businesses', e); }
	}

	async function loadStores(){
		const stores = [ { id:'default', name:'Main Branch' } ];
		storeSelect.innerHTML = stores.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
	}

	function renderServiceChips(services){
		serviceChips.innerHTML = services.map(s => `<button class="chip" data-id="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}">${s.name}</button>`).join('');
		serviceChips.querySelectorAll('.chip').forEach(chip => {
			chip.addEventListener('click', () => {
				serviceChips.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
				chip.classList.add('active');
				serviceSelect.value = chip.dataset.id;
				qs('#durationInput').value = chip.dataset.duration || '60';
				selectedService = { id: chip.dataset.id, name: chip.dataset.name, duration: parseInt(chip.dataset.duration||'60',10) };
				updateSummary();
			});
		});
	}

	async function loadCatalog(){
		try {
			const res = await fetchJSON(`${apiBase}/products`);
			const services = (res.data||[]).filter(p=>p.category==='service' || p.category==='massage');
			serviceSelect.innerHTML = services.map(s=>`<option value="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}">${s.name}${s.duration?` (${s.duration}m)`:''}</option>`).join('');
			renderServiceChips(services);
			if (services[0]) {
				selectedService = { id: services[0]._id||services[0].id, name: services[0].name, duration: services[0].duration||60 };
				serviceSelect.value = selectedService.id;
				qs('#durationInput').value = selectedService.duration;
				serviceChips.querySelector('.chip')?.classList.add('active');
				updateSummary();
			}
			const empsRes = await fetchJSON(`${apiBase}/employees`);
			employeeSelect.innerHTML = '<option value="">Any available</option>' + (empsRes.data||[]).map(e=>`<option value="${e._id||e.id}" data-name="${e.name}">${e.name||e.email||'Employee'}</option>`).join('');
		} catch(e){
			console.warn('Catalog load failed', e);
		}
	}

	function updateSummary(){
		summaryService.textContent = selectedService ? selectedService.name : 'Select a service';
		summaryTime.textContent = selectedSlot ? new Date(selectedSlot).toLocaleString() : 'No time selected';
	}

	function buildSlots(slots){
		slotGrid.innerHTML = slots.map(s=>`<button class="slot" data-ts="${s.startTime}" ${s.available===false?'disabled':''}>${new Date(s.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</button>`).join('');
		slotGrid.querySelectorAll('.slot').forEach(btn => {
			if (btn.disabled) btn.classList.add('disabled');
			btn.addEventListener('click', () => {
				slotGrid.querySelectorAll('.slot').forEach(b=>b.classList.remove('selected'));
				btn.classList.add('selected');
				selectedSlot = btn.dataset.ts;
				updateSummary();
			});
		});
	}

	async function checkAvailability(){
		availabilityResult.textContent = 'Checking...';
		try{
			const dateStr = dateInput.value || new Date().toISOString().split('T')[0];
			const r = await fetchJSON(`${apiBase}/availability?date=${encodeURIComponent(dateStr)}&serviceId=${encodeURIComponent(serviceSelect.value)}`);
			const slots = r.data?.slots || [];
			buildSlots(slots);
			availabilityResult.textContent = slots.length ? 'Select a slot' : 'No slots available';
		}catch(e){
			availabilityResult.textContent = 'Availability check failed';
		}
	}

	async function submitBooking(){
		try {
			const serviceId = serviceSelect.value;
			const sOpt = serviceSelect.options[serviceSelect.selectedIndex];
			const serviceName = sOpt?.dataset?.name || selectedService?.name || '';
			const durationMins = parseInt(qs('#durationInput').value || sOpt?.dataset?.duration || selectedService?.duration || '60', 10);
			const startTime = selectedSlot ? new Date(selectedSlot).toISOString() : new Date(`${dateInput.value}T09:00:00`).toISOString();
			const employeeId = employeeSelect.value || null;
			const employeeName = employeeId ? (employeeSelect.options[employeeSelect.selectedIndex]?.text || '') : '';
			const payload = {
				source: 'booking-site',
				storeId: storeSelect.value,
				storeName: storeSelect.options[storeSelect.selectedIndex]?.text || 'Main Branch',
				customer: {
					name: qs('#customerName').value,
					phone: qs('#customerPhone').value,
					email: qs('#customerEmail').value
				},
				serviceId,
				serviceName,
				durationMins,
				partySize: parseInt(qs('#partySizeInput').value || '1', 10),
				startTime,
				status: 'pending',
				employeeId: employeeId || undefined,
				employeeName: employeeName || undefined,
				notes: qs('#notes').value || ''
			};
			await fetchJSON(`${apiBase}/bookings`, { method:'POST', body: JSON.stringify(payload) });
			alert('Booking submitted!');
		} catch(e) {
			alert('Booking failed');
		}
	}

	loginBtn?.addEventListener('click', login);
	logoutBtn?.addEventListener('click', logout);
	checkBtn?.addEventListener('click', checkAvailability);
	submitBtn?.addEventListener('click', submitBooking);
	serviceSelect?.addEventListener('change', () => {
		const opt = serviceSelect.options[serviceSelect.selectedIndex];
		selectedService = { id: opt.value, name: opt.dataset.name, duration: parseInt(opt.dataset.duration||'60',10) };
		qs('#durationInput').value = selectedService.duration;
		updateSummary();
	});

	// init (no top-level await to avoid module requirement)
	initAuth();
	if (dateInput) dateInput.valueAsDate = new Date();
	loadBusinesses().then(() => {
		loadStores();
		if (businessId) { loadCatalog().then(checkAvailability); }
	});
})();
