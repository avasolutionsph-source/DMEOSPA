(function(){
	const marketingApi = 'https://ava-marketing-api.onrender.com';
	const qs = sel => document.querySelector(sel);
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

	// Booking site login using marketing API directly (used by /login.html, kept here for reuse)
	async function bookingSiteLogin(email, password){
		try {
			const res = await fetch(`${marketingApi}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			const data = await res.json();
			if (!res.ok || !data.token) throw new Error(data.error || 'Login failed');
			localStorage.setItem('authToken', data.token);
			initAuth();
			if (loginModal) loginModal.style.display = 'none';
			return true;
		} catch (e) {
			alert(e.message || 'Login failed');
			return false;
		}
	}

	async function ensureBackendUrl(){
		const existing = localStorage.getItem('pwaApiUrl');
		if (existing) return existing;
		try{
			const r = await fetch(`${marketingApi}/api/config`);
			const j = await r.json();
			if (j.pwaBackendUrl) localStorage.setItem('pwaApiUrl', j.pwaBackendUrl);
			return j.pwaBackendUrl;
		}catch(e){ return null; }
	}

	async function loadBusinesses(){
		await ensureBackendUrl();
		try {
			const r = await fetch(`${marketingApi}/api/public/businesses`);
			const j = await r.json();
			const list = j.data || [];
			businessList.innerHTML = list.map(b => `
				<button class="biz-card" data-biz="${b.id}">
					<div class="biz-thumb">${(b.name||'S')[0]}</div>
					<div class="biz-info">
						<div class="biz-name">${b.name}</div>
						<div class="biz-meta">Spa • Open</div>
					</div>
				</button>
			`).join('');
			businessList.querySelectorAll('.biz-card').forEach(card => {
				card.addEventListener('click', () => {
					const id = card.dataset.biz;
					window.location.href = `/spa.html?businessId=${encodeURIComponent(id)}`;
				});
			});
		} catch(e) { /* silent */ }
	}

	initAuth();
	bindAuthButtons();
	loadBusinesses();

	// Expose login function for /login.html reuse if script is shared
	window.bookingSiteLogin = bookingSiteLogin;
})();
