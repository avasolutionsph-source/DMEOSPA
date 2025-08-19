(function(){
	const apiBase = (localStorage.getItem('pwaApiUrl') || 'http://localhost:4000') + '/api';
	let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;

	const qs = sel => document.querySelector(sel);
	const storeSelect = qs('#storeSelect');
	const serviceSelect = qs('#serviceSelect');
	const employeeSelect = qs('#employeeSelect');
	const loginBtn = qs('#loginBtn');
	const logoutBtn = qs('#logoutBtn');
	const submitBtn = qs('#submitBookingBtn');
	const checkBtn = qs('#checkAvailabilityBtn');
	const availabilityResult = qs('#availabilityResult');

	function setToken(t){ token = t; if(t){ localStorage.setItem('authToken', t); } }

	async function fetchJSON(url, opts={}){
		const headers = { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) };
		const res = await fetch(url, { ...opts, headers });
		if (!res.ok) throw new Error(await res.text());
		return res.json();
	}

	function initAuth(){
		// Try to reuse marketing token if available in top window
		try {
			if (!token && window.getMarketingAuthToken) setToken(window.getMarketingAuthToken());
		} catch(e){}
		loginBtn.style.display = token ? 'none' : 'inline-block';
		logoutBtn.style.display = token ? 'inline-block' : 'none';
	}

	async function login() {
		const email = prompt('Email'); if(!email) return;
		const password = prompt('Password'); if(!password) return;
		// Use marketing API login (proxied through marketing site if different origin). Here we assume same JWT as backend.
		try {
			// As a simplification in this prototype, accept any email/password by calling PWA backend /api/auth/login
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

	async function loadStores(){
		// Placeholder stores; can be fetched from marketing user profile later
		const stores = [ { id:'default', name:'Main Branch' } ];
		storeSelect.innerHTML = stores.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
	}

	async function loadCatalog(){
		// Load services from PWA backend products (category service)
		try {
			const res = await fetchJSON(`${apiBase}/products`);
			const services = (res.data||[]).filter(p=>p.category==='service' || p.category==='massage');
			serviceSelect.innerHTML = services.map(s=>`<option value="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}">${s.name}${s.duration?` (${s.duration}m)`:''}</option>`).join('');
			// Load employees
			const empsRes = await fetchJSON(`${apiBase}/employees`);
			employeeSelect.innerHTML = '<option value="">Any available</option>' + (empsRes.data||[]).map(e=>`<option value="${e._id||e.id}" data-name="${e.name}">${e.name||e.email||'Employee'}</option>`).join('');
		} catch(e){
			console.warn('Catalog load failed', e);
		}
	}

	async function checkAvailability(){
		availabilityResult.textContent = 'Checking...';
		try{
			const dateTime = qs('#dateTimeInput').value;
			const serviceId = serviceSelect.value;
			const r = await fetchJSON(`${apiBase}/availability?date=${encodeURIComponent(dateTime)}&serviceId=${encodeURIComponent(serviceId)}`);
			const slots = r.data?.slots || [];
			availabilityResult.innerHTML = slots.slice(0,8).map(s=>`<span>${new Date(s.startTime).toLocaleTimeString()}</span>`).join('');
		}catch(e){
			availabilityResult.textContent = 'Availability check failed';
		}
	}

	async function submitBooking(){
		try {
			const serviceId = serviceSelect.value;
			const selectedService = serviceSelect.options[serviceSelect.selectedIndex];
			const serviceName = selectedService?.dataset?.name || '';
			const durationMins = parseInt(qs('#durationInput').value || selectedService?.dataset?.duration || '60', 10);
			const startTime = new Date(qs('#dateTimeInput').value).toISOString();
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

	loginBtn.addEventListener('click', login);
	logoutBtn.addEventListener('click', logout);
	checkBtn.addEventListener('click', checkAvailability);
	submitBtn.addEventListener('click', submitBooking);

	initAuth();
	loadStores();
	if (token) loadCatalog();
})();
