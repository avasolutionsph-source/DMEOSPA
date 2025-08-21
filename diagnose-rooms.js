// DIAGNOSTIC SCRIPT - Find out why Rooms isn't showing
console.log('🔍 RUNNING DIAGNOSTICS...\n');

// 1. Check if nav menu exists
const navMenu = document.querySelector('.nav-menu');
console.log('1. Nav menu found:', !!navMenu);

if (navMenu) {
    // 2. List all menu items
    const menuItems = navMenu.querySelectorAll('a.nav-item');
    console.log('2. Total menu items found:', menuItems.length);
    console.log('   Menu items:');
    menuItems.forEach((item, i) => {
        const page = item.getAttribute('data-page');
        const text = item.textContent.trim();
        console.log(`   ${i + 1}. ${text} (data-page="${page}")`);
    });
    
    // 3. Check for Rooms specifically
    const roomsItem = navMenu.querySelector('[data-page="rooms"]');
    console.log('3. Rooms menu item exists:', !!roomsItem);
    
    if (roomsItem) {
        console.log('   Rooms item details:');
        console.log('   - Display:', roomsItem.style.display);
        console.log('   - Visibility:', roomsItem.style.visibility);
        console.log('   - Opacity:', roomsItem.style.opacity);
        console.log('   - Classes:', roomsItem.className);
        console.log('   - Parent:', roomsItem.parentElement);
    }
}

// 4. Check pages
const allPages = document.querySelectorAll('.page');
console.log('4. Total pages found:', allPages.length);
allPages.forEach(page => {
    console.log(`   - ${page.id || 'unnamed'}`);
});

const roomsPage = document.getElementById('rooms');
console.log('5. Rooms page exists:', !!roomsPage);

// 6. Check entitlements
if (window.entitlementsSystem) {
    console.log('6. Entitlements system:');
    console.log('   - Current plan:', window.entitlementsSystem.currentPlan);
    console.log('   - Rooms enabled:', window.entitlementsSystem.entitlements?.rooms);
    console.log('   - All entitlements:', window.entitlementsSystem.entitlements);
}

// 7. Check app state
if (window.app) {
    console.log('7. App state:');
    console.log('   - Current page:', window.app.currentPage);
    console.log('   - User logged in:', localStorage.getItem('isLoggedIn'));
}

console.log('\n📊 DIAGNOSTIC COMPLETE\n');

// NOW FIX IT
console.log('🔧 APPLYING FIX...\n');

// Remove any existing rooms item
const existingRooms = document.querySelector('[data-page="rooms"]');
if (existingRooms) {
    existingRooms.remove();
    console.log('Removed existing broken rooms item');
}

// Find employees item to insert after
const employeesItem = document.querySelector('[data-page="employees"]');
if (!employeesItem) {
    console.error('❌ Cannot find Employees menu item!');
    console.log('Trying alternative approach...');
    
    // Alternative: Find by text content
    const allNavItems = document.querySelectorAll('.nav-item');
    for (let item of allNavItems) {
        if (item.textContent.includes('Employees')) {
            console.log('Found Employees by text content');
            
            // Create and insert rooms
            const roomsHTML = `
                <a href="#" class="nav-item" data-page="rooms" style="display: flex; align-items: center; padding: 12px 20px; color: white; text-decoration: none;">
                    <i class="fas fa-door-open" style="margin-right: 12px; font-size: 18px;"></i>
                    <span>Rooms</span>
                </a>
            `;
            
            item.insertAdjacentHTML('afterend', roomsHTML);
            console.log('✅ Rooms menu added!');
            
            // Get the new element
            const newRoomsItem = document.querySelector('[data-page="rooms"]');
            
            // Add click handler
            newRoomsItem.onclick = function(e) {
                e.preventDefault();
                
                // Remove active from all
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                
                // Add active to this
                this.classList.add('active');
                
                // Hide all pages
                document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
                
                // Create rooms page if needed
                let roomsPage = document.getElementById('rooms');
                if (!roomsPage) {
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        const roomsPageHTML = `
                            <div id="rooms" class="page">
                                <div class="page-header">
                                    <h1>Room Management</h1>
                                </div>
                                <div style="padding: 20px;">
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
                                        <div style="border: 2px solid #27ae60; padding: 20px; border-radius: 10px; background: white;">
                                            <h3>Room 1</h3>
                                            <p>Status: Available</p>
                                            <button style="background: #27ae60; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Start Service</button>
                                        </div>
                                        <div style="border: 2px solid #e74c3c; padding: 20px; border-radius: 10px; background: white;">
                                            <h3>Room 2</h3>
                                            <p>Status: Occupied</p>
                                            <div style="background: #fee; padding: 10px; border-radius: 5px; margin: 10px 0;">
                                                <strong>Timer: 15:32</strong>
                                            </div>
                                            <button style="background: #e74c3c; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">End Service</button>
                                        </div>
                                        <div style="border: 2px solid #27ae60; padding: 20px; border-radius: 10px; background: white;">
                                            <h3>Room 3</h3>
                                            <p>Status: Available</p>
                                            <button style="background: #27ae60; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Start Service</button>
                                        </div>
                                        <div style="border: 2px solid #27ae60; padding: 20px; border-radius: 10px; background: white;">
                                            <h3>VIP Suite</h3>
                                            <p>Status: Available</p>
                                            <button style="background: #27ae60; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Start Service</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        mainContent.insertAdjacentHTML('beforeend', roomsPageHTML);
                        roomsPage = document.getElementById('rooms');
                        console.log('✅ Rooms page created!');
                    }
                }
                
                // Show rooms page
                if (roomsPage) {
                    roomsPage.style.display = 'block';
                }
                
                console.log('Navigated to Rooms');
            };
            
            // Click it to show
            setTimeout(() => {
                newRoomsItem.click();
                console.log('✅ Auto-navigated to Rooms!');
            }, 500);
            
            break;
        }
    }
} else {
    console.log('Found Employees menu item, inserting Rooms after it...');
    
    // Standard insertion
    const roomsLink = document.createElement('a');
    roomsLink.href = '#';
    roomsLink.className = 'nav-item';
    roomsLink.setAttribute('data-page', 'rooms');
    roomsLink.innerHTML = `
        <i class="fas fa-door-open"></i>
        <span>Rooms</span>
    `;
    
    employeesItem.parentNode.insertBefore(roomsLink, employeesItem.nextSibling);
    console.log('✅ Rooms menu added!');
}

console.log('\n✅ FIX APPLIED - Check your menu now!');