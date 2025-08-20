(function(){
	const isLocal = ['localhost','127.0.0.1'].some(h => location.hostname.startsWith(h));
	const pwaBackendApi = 'https://ava-pwa-backend.onrender.com'; // Use existing PWA backend
	// Use PWA backend for everything - no more marketing API needed
	let apiHost = pwaBackendApi;
	const apiBase = () => `${apiHost}/api`;

	const params = new URLSearchParams(location.search);
	const businessId = params.get('businessId');
	if (businessId) localStorage.setItem('bookingBusinessId', businessId);

	function isHttps(url){ try { return typeof url === 'string' && url.startsWith('https://'); } catch(_) { return false; } }

	async function ensureBackendUrl(){
		// Always use PWA backend - no need for config endpoint
		const pwaUrl = 'https://ava-pwa-backend.onrender.com';
		localStorage.setItem('pwaApiUrl', pwaUrl);
		return pwaUrl;
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
		const bid = businessId || localStorage.getItem('bookingBusinessId');
		if (bid) headers['x-user-id'] = bid;
		const res = await fetch(url, { ...opts, headers, mode:'cors', credentials:'omit' });
		if (!res.ok) throw new Error(await res.text());
		const ct = res.headers.get('content-type') || '';
		return ct.includes('application/json') ? res.json() : { raw: await res.text() };
	}

	async function loadStores(){ const stores = [ { id:'default', name:'Main Branch' } ]; storeSelect.innerHTML = stores.map(s=>`<option value="${s.id}">${s.name}</option>`).join(''); }

	function renderServiceChips(services){ serviceChips.innerHTML = services.map(s => `<button class="chip" data-id="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}">${s.name}</button>`).join(''); serviceChips.querySelectorAll('.chip').forEach(chip => { chip.addEventListener('click', () => { serviceChips.querySelectorAll('.chip').forEach(c=>c.classList.remove('active')); chip.classList.add('active'); selectService({ id: chip.dataset.id, name: chip.dataset.name, duration: parseInt(chip.dataset.duration||'60',10) }); }); }); }

	function renderServiceCards(services){ serviceCards.innerHTML = services.map(s => `<button class="svc-card" data-id="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}"><div class="svc-thumb">${(s.name||'S')[0]}</div><div class="svc-info"><div class="svc-name">${s.name}</div><div class="svc-meta">${s.duration?`${s.duration} min`:'Custom'} • ₱${(s.price||0).toLocaleString()}</div></div></button>`).join(''); serviceCards.querySelectorAll('.svc-card').forEach(card => { card.addEventListener('click', () => { serviceCards.querySelectorAll('.svc-card').forEach(c=>c.classList.remove('active')); card.classList.add('active'); selectService({ id: card.dataset.id, name: card.dataset.name, duration: parseInt(card.dataset.duration||'60',10) }); }); }); }

	function selectService(svc){ selectedService = svc; serviceSelect.value = svc.id; qs('#durationInput').value = svc.duration; updateSummary(); }

	async function tryProducts(){
		// Load services from published catalog in Marketing API (where they're stored)
		try {
			console.log('📡 Loading services from published catalog...');
			const businessId = params.get('businessId') || localStorage.getItem('bookingBusinessId');
			
			if (!businessId) {
				console.error('❌ No businessId found');
				return { success: false, error: 'Business ID required' };
			}
			
			// Get published services from user's published catalog
			console.log('🔍 Loading published services for business:', businessId);
			
			// Try multiple endpoints to get published services
			let catalogData = null;
			
			// Method 1: Try new business catalog endpoint
			try {
				console.log('🔍 Method 1: Trying business catalog endpoint...');
				const catalogResponse = await fetch(`${pwaBackendApi}/api/public/business-catalog/${businessId}`);
				if (catalogResponse.ok) {
					catalogData = await catalogResponse.json();
					console.log('✅ Business catalog loaded:', catalogData);
					if (catalogData.success && catalogData.services) {
						return { success: true, data: catalogData.services };
					}
				}
			} catch (e) {
				console.warn('⚠️ Business catalog endpoint failed:', e);
			}
			
			// Method 2: Try products endpoint with business ID header
			try {
				console.log('🔍 Method 2: Trying products endpoint with business ID header...');
				const productsResponse = await fetch(`${pwaBackendApi}/api/products`, {
					headers: {
						'x-user-id': businessId,
						'Content-Type': 'application/json'
					}
				});
				
				if (productsResponse.ok) {
					const productsData = await productsResponse.json();
					console.log('✅ Products loaded via products endpoint:', productsData);
					if (productsData.data && productsData.data.length > 0) {
						return { success: true, data: productsData.data };
					}
				}
			} catch (e) {
				console.warn('⚠️ Products endpoint failed:', e);
			}
			
			// Method 3: Try public employees endpoint to see if business exists
			try {
				console.log('🔍 Method 3: Checking if business exists via employees endpoint...');
				const employeesResponse = await fetch(`${pwaBackendApi}/api/public/employees`, {
					headers: {
						'x-user-id': businessId,
						'Content-Type': 'application/json'
					}
				});
				
				if (employeesResponse.ok) {
					const employeesData = await employeesResponse.json();
					console.log('📋 Business exists, but no services published yet:', employeesData);
					return { success: true, data: [], message: 'Business exists but no services published yet' };
				}
			} catch (e) {
				console.warn('⚠️ Employees check failed:', e);
			}
			
			throw new Error('Business not found or no published catalog available');
			
		} catch (e) {
			console.warn('❌ Published catalog failed, trying marketing API products endpoint:', e);
			
			// Fallback to PWA backend products endpoint
			try {
				apiHost = pwaBackendApi;
				const fallbackData = await fetchJSON(`${apiBase()}/products`);
				console.log('✅ Fallback products loaded:', fallbackData);
				return fallbackData;
			} catch (e2) {
				console.error('❌ All product loading methods failed:', e2);
				return { success: false, error: e2.message };
			}
		}
	}

	async function loadCatalog(){
		await ensureBackendUrl();
		const res = await tryProducts();
		
		if (!res || !res.success) { 
			availabilityResult.textContent = res?.error || 'Unable to load services.'; 
			console.error('❌ Failed to load catalog:', res);
			return; 
		}
		
		const services = (res.data||[]).filter(p=>p.category==='service' || p.category==='massage' || !p.category);
		console.log('📋 Processing services:', services.length, 'services found');
		
		if (services.length === 0) {
			availabilityResult.textContent = 'No services available. Please contact the business to publish their catalog.';
			console.warn('⚠️ No services found for business');
			return;
		}
		
		serviceSelect.innerHTML = services.map(s=>`<option value="${s._id||s.id}" data-name="${s.name}" data-duration="${s.duration||60}">${s.name}${s.duration?` (${s.duration}m)`:''}</option>`).join('');
		renderServiceChips(services);
		renderServiceCards(services);
		if (services[0]) selectService({ id: services[0]._id||services[0].id, name: services[0].name, duration: services[0].duration||60 });
		
		console.log('✅ Services loaded successfully:', services.length, 'services');
		// Load employees from the same business catalog we got services from
		try {
			console.log('👥 Loading employees for business:', businessId);
			
			if (businessId) {
				// Try the business catalog endpoint first
				try {
					const catalogResponse = await fetch(`${pwaBackendApi}/api/public/business-catalog/${businessId}`);
					if (catalogResponse.ok) {
						const catalogData = await catalogResponse.json();
						console.log('✅ Business catalog loaded for employees:', catalogData);
						
						if (catalogData.success && catalogData.employees) {
							const employees = catalogData.employees;
							employeeSelect.innerHTML = '<option value="">Any available</option>' + 
								employees.map(e => `<option value="${e.id}" data-name="${e.name}">${e.name || 'Employee'} (${e.position || 'Staff'})</option>`).join('');
							console.log('✅ Employee dropdown populated with', employees.length, 'employees');
							return; // Success, exit early
						}
					}
				} catch (catalogError) {
					console.warn('⚠️ Business catalog endpoint failed for employees:', catalogError);
				}
				
				// Fallback: Try public employees endpoint
				try {
					let empsRes = await fetchJSON(`${apiBase()}/public/employees`).catch(()=>null);
					if (!empsRes) { 
						empsRes = await fetchJSON(`${apiBase()}/employees`).catch(()=>null); 
					}
					if (empsRes && empsRes.data) {
						employeeSelect.innerHTML = '<option value="">Any available</option>' + 
							(empsRes.data||[]).map(e=>`<option value="${e._id||e.id}" data-name="${e.name}">${e.name||e.email||'Employee'}</option>`).join('');
						console.log('✅ Employees loaded from fallback API');
					}
				} catch (fallbackError) {
					console.error('❌ All employee loading methods failed:', fallbackError);
				}
			}
		} catch (e) {
			console.error('❌ Employee loading failed:', e);
		}
	}

	function updateSummary(){ summaryService.textContent = selectedService ? selectedService.name : 'Select a service'; summaryTime.textContent = selectedSlot ? new Date(selectedSlot).toLocaleString() : 'No time selected'; }

	async function tryAvailability(dateStr){
		try {
			apiHost = pwaBackendApi;
			return await fetchJSON(`${apiBase()}/availability?date=${encodeURIComponent(dateStr)}&serviceId=${encodeURIComponent(serviceSelect.value)}`);
		} catch (e) {
			console.error('❌ Availability check failed:', e);
			return null;
		}
	}

	function buildSlots(slots){ slotGrid.innerHTML = slots.map(s=>`<button class="slot" data-ts="${s.startTime}" ${s.available===false?'disabled':''}>${new Date(s.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</button>`).join(''); slotGrid.querySelectorAll('.slot').forEach(btn => { if (btn.disabled) btn.classList.add('disabled'); btn.addEventListener('click', () => { slotGrid.querySelectorAll('.slot').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); selectedSlot = btn.dataset.ts; updateSummary(); }); }); }

	async function checkAvailability(){ availabilityResult.textContent=''; const dateStr = dateInput.value || new Date().toISOString().split('T')[0]; if (!serviceSelect.value) { availabilityResult.textContent = 'Select a service first'; return; } const r = await tryAvailability(dateStr); if (!r) { availabilityResult.textContent = 'Unable to load availability.'; return; } const slots = r.data?.slots || []; buildSlots(slots); availabilityResult.textContent = slots.length ? 'Select a slot' : 'No slots available'; }

	async function submitBooking(){
		try {
			const sOpt = serviceSelect.options[serviceSelect.selectedIndex];
			const payload = { 
				source: 'booking-website', 
				businessId: businessId || localStorage.getItem('bookingBusinessId'),
				storeId: storeSelect.value, 
				storeName: storeSelect.options[storeSelect.selectedIndex]?.text || 'Main Branch', 
				customer: { 
					name: qs('#customerName').value, 
					phone: qs('#customerPhone').value, 
					email: qs('#customerEmail').value 
				}, 
				serviceId: serviceSelect.value, 
				serviceName: sOpt?.dataset?.name || selectedService?.name || '', 
				durationMins: parseInt(qs('#durationInput').value || selectedService?.duration || '60', 10), 
				partySize: parseInt(qs('#partySizeInput').value || '1', 10), 
				startTime: selectedSlot ? new Date(selectedSlot).toISOString() : new Date(`${dateInput.value}T09:00:00`).toISOString(), 
				status: 'confirmed', // Direct bookings are confirmed immediately
				employeeId: employeeSelect.value || undefined, 
				employeeName: (employeeSelect.options[employeeSelect.selectedIndex]?.text || ''), 
				notes: qs('#notes').value || '' 
			};
			
			console.log('📝 Submitting booking directly to PWA:', payload);
			console.log('🏢 Business ID:', payload.businessId);
			
			// NEW: Submit directly to PWA backend via postMessage
			const pwaUrl = 'https://ava-solutions-pwa.netlify.app';
			const pwaWindow = window.open(pwaUrl, 'pwa_booking_submit', 'width=1,height=1,left=-1000,top=-1000');
			
			// Wait for PWA to load and send booking data
			const submitPromise = new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					pwaWindow.close();
					reject(new Error('PWA booking timeout'));
				}, 10000);
				
				const messageHandler = (event) => {
					if (event.origin !== pwaUrl) return;
					
					if (event.data.type === 'PWA_READY') {
						console.log('🔗 PWA ready, sending booking...');
						pwaWindow.postMessage({
							type: 'SUBMIT_BOOKING',
							booking: payload
						}, pwaUrl);
					}
					
					if (event.data.type === 'BOOKING_SUCCESS') {
						console.log('✅ Booking submitted successfully via PWA:', event.data);
						clearTimeout(timeout);
						pwaWindow.close();
						window.removeEventListener('message', messageHandler);
						resolve(event.data);
					}
					
					if (event.data.type === 'BOOKING_ERROR') {
						console.warn('❌ PWA booking failed:', event.data.error);
						clearTimeout(timeout);
						pwaWindow.close();
						window.removeEventListener('message', messageHandler);
						reject(new Error(event.data.error));
					}
				};
				
				window.addEventListener('message', messageHandler);
			});
			
			await submitPromise;
			alert('Booking submitted successfully! The therapist will see it in their PWA.');
			
		} catch(e){
			console.error('❌ Direct PWA booking failed:', e);
			alert('Booking failed - please try again or contact support');
		}
	}

	dateInput.valueAsDate = new Date();
	loadStores();
	ensureBackendUrl().then(() => { loadCatalog(); });
	checkBtn.addEventListener('click', checkAvailability);
	submitBtn.addEventListener('click', submitBooking);
	serviceSelect.addEventListener('change', () => { const opt = serviceSelect.options[serviceSelect.selectedIndex]; selectService({ id: opt.value, name: opt.dataset.name, duration: parseInt(opt.dataset.duration||'60',10) }); });
})();
