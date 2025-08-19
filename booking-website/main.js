(function(){
	const marketingApi = 'https://ava-marketing-api.onrender.com';
	const qs = sel => document.querySelector(sel);
	const businessList = qs('#businessList');
	const loginBtn = qs('#loginBtn');
	const logoutBtn = qs('#logoutBtn');

	function initAuth(){
		const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
		loginBtn.style.display = token ? 'none' : 'inline-block';
		logoutBtn.style.display = token ? 'inline-block' : 'none';
	}

	async function loadBusinesses(){
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
	loadBusinesses();
})();
