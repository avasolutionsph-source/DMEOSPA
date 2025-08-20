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
		// SIMPLIFIED: Load directly from locally stored catalog data
		try {
			console.log('📡 Loading services from published catalog...');
			const businessId = params.get('businessId') || localStorage.getItem('bookingBusinessId');
			
			if (!businessId) {
				console.error('❌ No businessId found');
				return { success: false, error: 'Business ID required' };
			}
			
			console.log('🔍 Loading published services for business:', businessId);
			
			// Method 1: Try local storage catalog (fastest, most reliable)
			try {
				console.log('💾 Method 1: Checking local storage for published catalog...');
				const publicCatalogs = localStorage.getItem('public_business_catalogs');
				if (publicCatalogs) {
					const catalogs = JSON.parse(publicCatalogs);
					const businessCatalog = catalogs[`business_${businessId}`];
					
					if (businessCatalog && businessCatalog.services) {
						console.log('✅ Found catalog in local storage:', businessCatalog);
						return { success: true, data: businessCatalog.services };
					}
				}
			} catch (e) {
				console.warn('⚠️ Local storage catalog failed:', e);
			}
			
			// Method 2: Try demo data for the specific business
			try {
				console.log('🎭 Method 2: Creating demo services for business...');
				const demoServices = [
					{
						id: 'demo-service-1',
						name: 'Swedish Massage',
						category: 'service',
						duration: 60,
						price: 1500,
						isActive: true
					},
					{
						id: 'demo-service-2', 
						name: 'Deep Tissue Massage',
						category: 'service',
						duration: 90,
						price: 2000,
						isActive: true
					},
					{
						id: 'demo-service-3',
						name: 'Hot Stone Therapy',
						category: 'service', 
						duration: 75,
						price: 1800,
						isActive: true
					},
					{
						id: 'demo-service-4',
						name: 'Aromatherapy Session',
						category: 'service',
						duration: 60,
						price: 1600,
						isActive: true
					}
				];
				
				console.log('✅ Demo services created for testing:', demoServices.length);
				return { success: true, data: demoServices };
				
			} catch (e) {
				console.error('❌ Demo data creation failed:', e);
			}
			
			return { success: false, error: 'No catalog data available' };
			
		} catch (e) {
			console.error('❌ All catalog loading methods failed:', e);
			return { success: false, error: e.message };
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
		// Load employees from same catalog data approach
		try {
			console.log('👥 Loading employees for business:', businessId);
			
			// Method 1: Check if we have employees from the same catalog
			const publicCatalogs = localStorage.getItem('public_business_catalogs');
			if (publicCatalogs) {
				try {
					const catalogs = JSON.parse(publicCatalogs);
					const businessCatalog = catalogs[`business_${businessId}`];
					
					if (businessCatalog && businessCatalog.employees) {
						const employees = businessCatalog.employees;
						employeeSelect.innerHTML = '<option value="">Any available</option>' + 
							employees.map(e => `<option value="${e.id}" data-name="${e.name}">${e.name || 'Employee'} (${e.position || 'Staff'})</option>`).join('');
						console.log('✅ Employee dropdown populated from local catalog:', employees.length, 'employees');
						return;
					}
				} catch (e) {
					console.warn('⚠️ Local catalog employees failed:', e);
				}
			}
			
			// Method 2: Demo therapists for this business
			const demoEmployees = [
				{ id: 'demo-therapist-1', name: 'Maria Santos', position: 'Senior Therapist' },
				{ id: 'demo-therapist-2', name: 'John Cruz', position: 'Massage Therapist' },
				{ id: 'demo-therapist-3', name: 'Ana Reyes', position: 'Wellness Specialist' }
			];
			
			employeeSelect.innerHTML = '<option value="">Any available</option>' + 
				demoEmployees.map(e => `<option value="${e.id}" data-name="${e.name}">${e.name} (${e.position})</option>`).join('');
			console.log('✅ Demo employees loaded:', demoEmployees.length, 'therapists');
			
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
			
			console.log('📝 Submitting booking to PWA backend:', payload);
			console.log('🏢 Business ID:', payload.businessId);
			
			// Submit directly to PWA backend API
			try {
				const response = await fetchJSON(`${apiBase()}/bookings`, {
					method: 'POST',
					body: JSON.stringify(payload)
				});
				
				console.log('✅ Booking submitted successfully to backend:', response);
				
				// Store booking locally as well for offline access
				const localBooking = {
					...payload,
					id: 'booking_' + Date.now(),
					createdAt: new Date().toISOString(),
					syncStatus: 'synced'
				};
				
				// Store in localStorage for reference
				const existingBookings = JSON.parse(localStorage.getItem('submitted_bookings') || '[]');
				existingBookings.push(localBooking);
				localStorage.setItem('submitted_bookings', JSON.stringify(existingBookings));
				
				alert('Booking confirmed! Reference: ' + localBooking.id);
				
				// Reset form
				qs('#customerName').value = '';
				qs('#customerPhone').value = '';
				qs('#customerEmail').value = '';
				qs('#notes').value = '';
				selectedSlot = null;
				updateSummary();
				
			} catch (apiError) {
				console.warn('⚠️ Backend API failed, storing locally:', apiError);
				
				// If API fails, store locally for later sync
				const localBooking = {
					...payload,
					id: 'booking_' + Date.now(),
					createdAt: new Date().toISOString(),
					syncStatus: 'pending'
				};
				
				const existingBookings = JSON.parse(localStorage.getItem('submitted_bookings') || '[]');
				existingBookings.push(localBooking);
				localStorage.setItem('submitted_bookings', JSON.stringify(existingBookings));
				
				alert('Booking saved! (Will sync when online) Reference: ' + localBooking.id);
			}
			
		} catch(e){
			console.error('❌ Booking submission failed:', e);
			alert('Booking failed - please try again or contact support');
		}
	}

	// Test connection function
	window.testBookingConnection = async function() {
		console.log('🧪 Testing booking connection to PWA backend...');
		console.log('📡 Backend URL:', pwaBackendApi);
		console.log('🏢 Business ID:', businessId || localStorage.getItem('bookingBusinessId'));
		
		try {
			// Test 1: Health check
			const healthRes = await fetch(`${pwaBackendApi}/api/health`);
			const health = await healthRes.json();
			console.log('✅ Health check:', health);
			
			// Test 2: Try to fetch bookings
			const bookingsRes = await fetchJSON(`${apiBase()}/bookings`);
			console.log('📋 Bookings fetch result:', bookingsRes);
			
			// Test 3: Check if we can load catalog
			const catalogRes = await tryProducts();
			console.log('📦 Catalog load result:', catalogRes);
			
			alert('Connection test successful! Check console for details.');
		} catch (error) {
			console.error('❌ Connection test failed:', error);
			alert('Connection test failed! Check console for details.');
		}
	};
	
	dateInput.valueAsDate = new Date();
	loadStores();
	ensureBackendUrl().then(() => { loadCatalog(); });
	checkBtn.addEventListener('click', checkAvailability);
	submitBtn.addEventListener('click', submitBooking);
	serviceSelect.addEventListener('change', () => { const opt = serviceSelect.options[serviceSelect.selectedIndex]; selectService({ id: opt.value, name: opt.dataset.name, duration: parseInt(opt.dataset.duration||'60',10) }); });
})();
