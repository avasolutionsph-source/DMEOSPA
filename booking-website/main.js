(function(){
	const isLocal = ['localhost','127.0.0.1'].some(h => location.hostname.startsWith(h));
	const pwaBackendApi = 'http://localhost:4000/api'; // MongoDB-enabled PWA Backend
	const marketingApi = 'https://ava-pwa-backend.onrender.com'; // Use existing PWA backend
	const authApi = isLocal ? pwaBackendApi : marketingApi; // Use PWA backend for everything
	const qs = sel => document.querySelector(sel);
	
	console.log('📱 Booking site using auth API:', authApi);
	const businessList = qs('#businessList');
	const loginBtn = qs('#loginBtn');
	const logoutBtn = qs('#logoutBtn');
	const loginModal = qs('#loginModal');

	function initAuth(){
		const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
		if (loginBtn) loginBtn.style.display = token ? 'none' : 'inline-block';
		if (logoutBtn) logoutBtn.style.display = token ? 'inline-block' : 'none';
		const ownerLink = document.getElementById('ownerBookingsLink');
		if (ownerLink) ownerLink.style.display = token ? 'inline-block' : 'none';
	}

	function bindAuthButtons(){
		if (loginBtn && !loginBtn._bound){
			// link navigates to /login.html
			loginBtn._bound = true;
		}
		if (logoutBtn && !logoutBtn._bound){
			logoutBtn.addEventListener('click', () => {
				localStorage.removeItem('authToken');
				sessionStorage.removeItem('authToken');
				initAuth();
			});
			logoutBtn._bound = true;
		}
		// Listen for token from marketing site (kept for SSO compatibility)
		if (!window.__authBridgeBound){
			window.__authBridgeBound = true;
			window.addEventListener('message', (event) => {
				try {
					const origin = event.origin || '';
					if (!origin.startsWith('https://ava-solutions-marketing.netlify.app')) return;
					const data = event.data || {};
					if (data.type === 'MARKETING_TOKEN_RESPONSE' || data.type === 'MARKETING_LOGIN_SUCCESS') {
						if (data.token) {
							localStorage.setItem('authToken', data.token);
							initAuth();
						}
					}
				} catch(_){ }
			});
		}
	}

	// Booking site login using unified MongoDB authentication
	async function bookingSiteLogin(email, password){
		console.log('🔐 Booking site login attempt for:', email);
		try {
			const res = await fetch(`${authApi}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			const data = await res.json();
			
			if (!res.ok || !data.success || !data.token) {
				throw new Error(data.error || 'Login failed');
			}
			
			console.log('✅ Booking site login successful for:', data.user.email, 'Role:', data.user.role);
			
			// Store authentication data
			localStorage.setItem('authToken', data.token);
			localStorage.setItem('bookingUser', JSON.stringify(data.user));
			
			// Store business ID for owners/managers
			if (data.user && (data.user._id || data.user.id)) {
				localStorage.setItem('bookingBusinessId', String(data.user._id || data.user.id));
			}
			
			initAuth();
			if (loginModal) loginModal.style.display = 'none';
			return true;
		} catch (e) {
			console.error('❌ Booking site login error:', e);
			alert(e.message || 'Login failed');
			return false;
		}
	}

	async function loadBusinesses(){
		console.log('📋 Loading businesses...');
		
		if (!businessList) {
			console.warn('❌ Business list element not found');
			return;
		}
		
		try {
			// Try PWA backend first (correct endpoint with /api prefix)
			console.log('🔍 Fetching businesses from PWA backend:', `${marketingApi}/api/auth/public/businesses`);
			let response = await fetch(`${marketingApi}/api/auth/public/businesses`);
			
			if (!response.ok) {
				// Fallback: Try local PWA backend
				console.log('⚠️ Remote PWA failed (status:', response.status, '), trying local PWA backend fallback');
				const pwaBackendEndpoint = `${pwaBackendApi}/api/auth/public/businesses`;
				try {
					response = await fetch(pwaBackendEndpoint);
				} catch (e) {
					console.log('⚠️ Local PWA backend also failed:', e.message);
					response = { ok: false };
				}
			}
			
			if (!response.ok) {
				// Show demo businesses if no API works
				console.log('⚠️ No business API available, showing demo businesses');
				showDemoBusinesses();
				return;
			}
			
			const data = await response.json();
			const businesses = data.data || data.businesses || [];
			
			console.log('✅ Loaded', businesses.length, 'businesses');
			
			if (businesses.length === 0) {
				showEmptyBusinessState();
				return;
			}
			
			// Display businesses
			businessList.innerHTML = businesses.map(business => `
				<button class="biz-card" data-biz="${business.id || business._id}">
					<div class="biz-thumb">${(business.businessName || business.name || 'S')[0].toUpperCase()}</div>
					<div class="biz-info">
						<div class="biz-name">${business.businessName || business.name || 'Spa Business'}</div>
						<div class="biz-meta">Spa • Open</div>
					</div>
				</button>
			`).join('');
			
			// Add click handlers
			businessList.querySelectorAll('.biz-card').forEach(card => {
				card.addEventListener('click', () => {
					const id = card.dataset.biz;
					window.location.href = `/spa.html?businessId=${encodeURIComponent(id)}`;
				});
			});
			
		} catch(error) {
			console.error('❌ Error loading businesses:', error);
			// Always show demo businesses on error instead of empty state
			console.log('📋 Showing demo businesses as fallback');
			showDemoBusinesses();
		}
	}
	
	function showDemoBusinesses() {
		console.log('📋 Showing demo businesses');
		
		if (!businessList) return;
		
		// Demo businesses for testing
		const demoBusinesses = [
			{ id: 'demo-spa-1', name: 'Serenity Wellness Spa', type: 'Full Service Spa' },
			{ id: 'demo-spa-2', name: 'Zen Garden Massage', type: 'Massage Therapy' },
			{ id: 'demo-spa-3', name: 'Harmony Health Center', type: 'Wellness Center' }
		];
		
		businessList.innerHTML = demoBusinesses.map(business => `
			<button class="biz-card" data-biz="${business.id}">
				<div class="biz-thumb">${business.name[0].toUpperCase()}</div>
				<div class="biz-info">
					<div class="biz-name">${business.name}</div>
					<div class="biz-meta">${business.type} • Open</div>
				</div>
			</button>
		`).join('');
		
		// Add click handlers
		businessList.querySelectorAll('.biz-card').forEach(card => {
			card.addEventListener('click', () => {
				const id = card.dataset.biz;
				window.location.href = `/spa.html?businessId=${encodeURIComponent(id)}`;
			});
		});
	}
	
	function showEmptyBusinessState() {
		console.log('📋 Showing empty business state');
		
		if (!businessList) return;
		
		businessList.innerHTML = `
			<div style="text-align: center; padding: 3rem 1rem; color: #666;">
				<div style="font-size: 4rem; margin-bottom: 1rem;">🏪</div>
				<h3 style="color: #333; margin-bottom: 1rem;">No Businesses Available</h3>
				<p style="margin-bottom: 2rem; max-width: 400px; margin-left: auto; margin-right: auto;">
					We're building our directory of spa and wellness businesses. 
					Check back soon as new businesses join our platform!
				</p>
				<div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; max-width: 500px; margin: 0 auto;">
					<h4 style="color: #333; margin-bottom: 1rem;">📝 Business Owner?</h4>
					<p style="margin-bottom: 1rem; font-size: 0.9rem;">
						Register your spa or wellness business to start accepting online bookings!
					</p>
					<a href="https://ava-solutions-marketing.netlify.app/register" 
					   style="display: inline-block; padding: 0.75rem 1.5rem; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
						Register Your Business
					</a>
				</div>
			</div>
		`;
	}

	initAuth();
	bindAuthButtons();
	loadBusinesses();

	// Expose login function for /login.html reuse if script is shared
	window.bookingSiteLogin = bookingSiteLogin;
})();
