(function(){
	const marketingApi = 'https://ava-marketing-api.onrender.com';
	const qs = sel => document.querySelector(sel);
	const businessList = qs('#businessList');
	const loginBtn = qs('#loginBtn');
	const logoutBtn = qs('#logoutBtn');

	function initAuth(){
		const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
		if (loginBtn) loginBtn.style.display = token ? 'none' : 'inline-block';
		if (logoutBtn) logoutBtn.style.display = token ? 'inline-block' : 'none';
		const ownerLink = document.getElementById('ownerBookingsLink');
		if (ownerLink) {
			ownerLink.style.display = token ? 'inline-block' : 'none';
			ownerLink.onclick = (e) => {
				e.preventDefault();
				const businessId = localStorage.getItem('bookingBusinessId');
				window.location.href = `/owner.html${businessId?`?businessId=${encodeURIComponent(businessId)}`:''}`;
			};
		}
	}

	function bindAuthButtons(){
		if (loginBtn && !loginBtn._bound){
			loginBtn.addEventListener('click', () => {
				// Open marketing login in a named window
				let w;
				try { w = window.open('https://ava-solutions-marketing.netlify.app/login', 'ava_marketing_login'); } catch(_) {}
				// Request token via postMessage in case already logged in
				try { w && w.postMessage({ type: 'REQUEST_MARKETING_TOKEN' }, 'https://ava-solutions-marketing.netlify.app'); } catch(_){ }
				// Fallback: navigate current tab if pop-up blocked
				if (!w || w.closed) { window.location.href = 'https://ava-solutions-marketing.netlify.app/login'; }
			});
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
		// Listen for token from marketing site
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
})();
