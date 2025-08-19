(function(){
	const isLocal = ['localhost','127.0.0.1'].some(h => location.hostname.startsWith(h));
	const marketingApi = 'https://ava-marketing-api.onrender.com';
	// read ?pwa override
	try { const qp = new URLSearchParams(location.search).get('pwa'); if (qp) localStorage.setItem('pwaApiUrl', qp); } catch(e){}
	// Always prefer marketing proxy first; only fall back to direct PWA if we have a valid HTTPS URL
	let apiHost = marketingApi;
	const apiBase = () => `${apiHost}/api`;

	const params = new URLSearchParams(location.search);
	const businessId = params.get('businessId');
	if (businessId) localStorage.setItem('bookingBusinessId', businessId);

	function isHttps(url){ try { return typeof url === 'string' && url.startsWith('https://'); } catch(_) { return false; } }

	async function ensureBackendUrl(){
		const stored = localStorage.getItem('pwaApiUrl');
		if (stored && isHttps(stored)) { return stored; }
		try {
			const r = await fetch(`${marketingApi}/api/config`);
			const j = await r.json();
			if (j.pwaBackendUrl && isHttps(j.pwaBackendUrl)) {
				localStorage.setItem('pwaApiUrl', j.pwaBackendUrl);
				return j.pwaBackendUrl;
			}
			return null;
		} catch(e){ return null; }
	}

	const qs = sel => document.querySelector(sel);
	const storeSelect = qs('#storeSelect');
	const serviceSelect = qs('#serviceSelect');
	const employeeSelect = qs('#employeeSelect');
	const submitBtn = qs('#submitBookingBtn');
	const checkBtn = qs('#checkAvailabilityBtn');
	const availabilityResult = qs('#availabilityResult');
	const serviceChips = qs('#serviceChips');
	const serviceCards = qs('#serviceCards');
	const slotGrid = qs('#slotGrid');
	const dateInput = qs('#dateInput');
	const summaryService = qs('#summaryService');
	const summaryTime = qs('#summaryTime');

	let selectedService = null;
	let selectedSlot = null;

	async function fetchJSON(url, opts={}){
		const headers = { 'Content-Type':'application/json' };
		if (businessId) headers['x-user-id'] = businessId;
		const res = await fetch(url, { ...opts, headers });
		if (!res.ok) throw new Error(await res.text());
		const ct = res.headers.get('content-type') || '';
		return ct.includes('application/json') ? res.json() : { raw: await res.text() };
	}

	async function loadStores(){ const stores = [ { id:'default', name:'Main Branch' } ]; storeSelect.innerHTML = stores.map(s=>`<option value="${s.id}">${s.name}</option>`).join(''); }

	function renderServiceChips(services){ serviceChips.innerHTML = services.map(s => `<button class="chip" data-id="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}">${s.name}</button>`).join(''); serviceChips.querySelectorAll('.chip').forEach(chip => { chip.addEventListener('click', () => { serviceChips.querySelectorAll('.chip').forEach(c=>c.classList.remove('active')); chip.classList.add('active'); selectService({ id: chip.dataset.id, name: chip.dataset.name, duration: parseInt(chip.dataset.duration||'60',10) }); }); }); }

	function renderServiceCards(services){ serviceCards.innerHTML = services.map(s => `<button class="svc-card" data-id="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}"><div class="svc-thumb">${(s.name||'S')[0]}</div><div class="svc-info"><div class="svc-name">${s.name}</div><div class="svc-meta">${s.duration?`${s.duration} min`:'Custom'} • ₱${(s.price||0).toLocaleString()}</div></div></button>`).join(''); serviceCards.querySelectorAll('.svc-card').forEach(card => { card.addEventListener('click', () => { serviceCards.querySelectorAll('.svc-card').forEach(c=>c.classList.remove('active')); card.classList.add('active'); selectService({ id: card.dataset.id, name: card.dataset.name, duration: parseInt(card.dataset.duration||'60',10) }); }); }); }

	function selectService(svc){ selectedService = svc; serviceSelect.value = svc.id; qs('#durationInput').value = svc.duration; updateSummary(); }

	async function tryProducts(){
		// Prefer marketing proxy
		try {
			apiHost = marketingApi;
			return await fetchJSON(`${apiBase()}/products`);
		} catch (e) {
			const pwa = localStorage.getItem('pwaApiUrl');
			if (isHttps(pwa)) {
				try { return await fetchJSON(`${pwa}/api/products`); } catch(e2){}
			}
			return null;
		}
	}

	async function loadCatalog(){ await ensureBackendUrl(); const res = await tryProducts(); if (!res) { availabilityResult.textContent = 'Unable to load services.'; return; } const services = (res.data||[]).filter(p=>p.category==='service' || p.category==='massage'); serviceSelect.innerHTML = services.map(s=>`<option value="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}">${s.name}${s.duration?` (${s.duration}m)`:''}</option>`).join(''); renderServiceChips(services); renderServiceCards(services); if (services[0]) selectService({ id: services[0]._id||services[0].id, name: services[0].name, duration: services[0].duration||60 }); const empsRes = await fetchJSON(`${apiBase()}/employees`).catch(()=>null); if (empsRes) { employeeSelect.innerHTML = '<option value="">Any available</option>' + (empsRes.data||[]).map(e=>`<option value="${e._id||e.id}" data-name="${e.name}">${e.name||e.email||'Employee'}</option>`).join(''); } }

	function updateSummary(){ summaryService.textContent = selectedService ? selectedService.name : 'Select a service'; summaryTime.textContent = selectedSlot ? new Date(selectedSlot).toLocaleString() : 'No time selected'; }

	async function tryAvailability(dateStr){
		try {
			apiHost = marketingApi;
			return await fetchJSON(`${apiBase()}/availability?date=${encodeURIComponent(dateStr)}&serviceId=${encodeURIComponent(serviceSelect.value)}`);
		} catch (e) {
			const pwa = localStorage.getItem('pwaApiUrl');
			if (isHttps(pwa)) {
				try { return await fetchJSON(`${pwa}/api/availability?date=${encodeURIComponent(dateStr)}&serviceId=${encodeURIComponent(serviceSelect.value)}`); } catch(e2){}
			}
			return null;
		}
	}

	function buildSlots(slots){ slotGrid.innerHTML = slots.map(s=>`<button class="slot" data-ts="${s.startTime}" ${s.available===false?'disabled':''}>${new Date(s.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</button>`).join(''); slotGrid.querySelectorAll('.slot').forEach(btn => { if (btn.disabled) btn.classList.add('disabled'); btn.addEventListener('click', () => { slotGrid.querySelectorAll('.slot').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); selectedSlot = btn.dataset.ts; updateSummary(); }); }); }

	async function checkAvailability(){ availabilityResult.textContent=''; const dateStr = dateInput.value || new Date().toISOString().split('T')[0]; if (!serviceSelect.value) { availabilityResult.textContent = 'Select a service first'; return; } const r = await tryAvailability(dateStr); if (!r) { availabilityResult.textContent = 'Unable to load availability.'; return; } const slots = r.data?.slots || []; buildSlots(slots); availabilityResult.textContent = slots.length ? 'Select a slot' : 'No slots available'; }

	async function submitBooking(){ try { const sOpt = serviceSelect.options[serviceSelect.selectedIndex]; const payload = { source: 'booking-site', storeId: storeSelect.value, storeName: storeSelect.options[storeSelect.selectedIndex]?.text || 'Main Branch', customer: { name: qs('#customerName').value, phone: qs('#customerPhone').value, email: qs('#customerEmail').value }, serviceId: serviceSelect.value, serviceName: sOpt?.dataset?.name || selectedService?.name || '', durationMins: parseInt(qs('#durationInput').value || selectedService?.duration || '60', 10), partySize: parseInt(qs('#partySizeInput').value || '1', 10), startTime: selectedSlot ? new Date(selectedSlot).toISOString() : new Date(`${dateInput.value}T09:00:00`).toISOString(), status: 'pending', employeeId: employeeSelect.value || undefined, employeeName: (employeeSelect.options[employeeSelect.selectedIndex]?.text || ''), notes: qs('#notes').value || '' }; await fetchJSON(`${apiBase()}/bookings`, { method:'POST', body: JSON.stringify(payload) }); alert('Booking submitted!'); } catch(e){ alert('Booking failed'); } }

	dateInput.valueAsDate = new Date();
	loadStores();
	ensureBackendUrl().then(() => { loadCatalog(); });
	checkBtn.addEventListener('click', checkAvailability);
	submitBtn.addEventListener('click', submitBooking);
	serviceSelect.addEventListener('change', () => { const opt = serviceSelect.options[serviceSelect.selectedIndex]; selectService({ id: opt.value, name: opt.dataset.name, duration: parseInt(opt.dataset.duration||'60',10) }); });
})();
