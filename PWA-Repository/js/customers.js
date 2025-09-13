// Customer Management System for Daet Massage & Spa
class CustomerManager {
    constructor() {
        this.customers = [];
        this.filteredCustomers = [];
        this.selectedCustomerId = null;
        // Performance cache
        this.transactionsCache = null;
        this.cacheTimestamp = null;
        this.cacheValidityMs = 30000; // 30 seconds
        // Initialization flags to prevent infinite loops
        this.isInitializing = false;
        this.isDropdownInitialized = false;
        this.customersLoaded = false;
    }

    async init() {
        // Check if customers table exists, if not trigger database upgrade
        await this.ensureCustomersTable();
        await this.loadCustomers();
        this.setupEventListeners();
        this.updateCustomerStats();
    }

    async ensureCustomersTable() {
        console.log('🔍 Checking if customers table exists...');
        
        // Prevent infinite loops by checking if we're already initializing
        if (window.db && window.db.isInitializing) {
            console.log('⏳ Database is already initializing, waiting...');
            // Wait for initialization to complete
            while (window.db.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Simple check - try to access customers table
        try {
            if (window.db && window.db.db) {
                // Check if customers store exists in the database
                if (window.db.db.objectStoreNames.contains('customers')) {
                    console.log('✅ Customers table exists');
                    return true;
                } else {
                    console.log('⚠️ Customers table missing from database schema');
                    // Don't try to reinitialize - just return false
                    // The database should be upgraded through normal means
                    return false;
                }
            } else {
                console.log('⚠️ Database not initialized yet');
                return false;
            }
        } catch (error) {
            console.warn('Could not check customers table:', error.message);
            return false;
        }
    }

    setupEventListeners() {
        // Add Customer Button
        const addCustomerBtn = document.getElementById('addCustomerBtn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => this.showAddCustomerModal());
        }

        // Customer selection in checkout - handled by searchable dropdown
        // The checkoutCustomerSelect is now a hidden input managed by the search functionality

        // Customer search - handled by initializeSearchableCustomerDropdown
        // This will be set up when loadCustomersInCheckout() is called
    }

    async loadCustomers() {
        if (this.isInitializing) {
            console.log('⏳ Already loading customers, skipping...');
            return;
        }
        
        this.isInitializing = true;
        
        try {
            // Show loading state
            const customersGrid = document.getElementById('customersGrid');
            if (customersGrid) {
                customersGrid.innerHTML = `
                    <div class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading customers...</p>
                    </div>
                `;
            }

            // Check if database and customers table are ready
            if (!window.db || !window.db.db) {
                throw new Error('Database not initialized');
            }

            if (!window.db.db.objectStoreNames.contains('customers')) {
                console.log('⚠️ Customers table not available yet, showing empty state');
                this.customers = [];
                this.filteredCustomers = [];
                this.customersLoaded = true;
                this.displayCustomers();
                this.updateCustomerStats();
                return;
            }

            this.customers = await window.db.getAll('customers') || [];
            this.filteredCustomers = [...this.customers];
            this.customersLoaded = true;
            
            // Refresh dropdown if it was initialized but customers weren't loaded yet
            if (this.isDropdownInitialized && this.customers.length > 0) {
                console.log('🔄 Refreshing customer dropdown with loaded data');
                this.renderCustomerOptions();
            }
            
            // Show enrichment progress for large datasets
            if (this.customers.length > 20) {
                if (customersGrid) {
                    customersGrid.innerHTML = `
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading customer data... (${this.customers.length} customers)</p>
                        </div>
                    `;
                }
            }
            
            await this.enrichCustomersWithServiceHistory();
            this.displayCustomers();
            
            // Only initialize dropdown if it hasn't been done yet
            if (!this.isDropdownInitialized) {
                this.loadCustomersInCheckout();
            }
            
            this.updateCustomerStats();
        } catch (error) {
            console.warn('Customer database not yet available:', error);
            this.customers = [];
            this.filteredCustomers = [];
            this.customersLoaded = true;
            // Still display empty state and basic functionality
            this.displayCustomers();
            this.updateCustomerStats();
        } finally {
            this.isInitializing = false;
        }
    }

    displayCustomers() {
        const customersGrid = document.getElementById('customersGrid');
        if (!customersGrid) return;

        const customersToShow = this.filteredCustomers.length > 0 ? this.filteredCustomers : this.customers;

        if (customersToShow.length === 0) {
            if (this.customers.length === 0) {
                customersGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No Customers Yet</h3>
                        <p>Add your first customer to get started</p>
                        <button class="btn btn-primary" onclick="window.customerManager.showAddCustomerModal()">
                            <i class="fas fa-user-plus"></i> Add Customer
                        </button>
                    </div>
                `;
            } else {
                customersGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No Customers Found</h3>
                        <p>No customers match your search criteria</p>
                    </div>
                `;
            }
            return;
        }

        customersGrid.innerHTML = customersToShow.map(customer => this.createCustomerCard(customer)).join('');
    }

    createCustomerCard(customer) {
        const totalVisits = customer.totalVisits || 0;
        const totalSpent = customer.totalSpent || 0;
        const favoriteService = customer.favoriteService || 'None yet';
        const lastVisit = customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never';
        
        return `
            <div class="customer-card" data-customer-id="${customer.id}">
                <div class="customer-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="customer-info">
                    <h4>${customer.firstName} ${customer.lastName}</h4>
                    <div class="customer-contact">
                        <p><i class="fas fa-phone"></i> ${customer.phone}</p>
                        ${customer.email ? `<p><i class="fas fa-envelope"></i> ${customer.email}</p>` : ''}
                    </div>
                    <div class="customer-stats-row">
                        <div class="stat-item">
                            <span class="stat-value">${totalVisits}</span>
                            <span class="stat-label">Visits</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">₱${totalSpent.toLocaleString()}</span>
                            <span class="stat-label">Total Spent</span>
                        </div>
                    </div>
                    <div class="customer-details">
                        <p><i class="fas fa-heart"></i> <strong>Favorite Service:</strong> ${favoriteService}</p>
                        <p><i class="fas fa-clock"></i> <strong>Last Visit:</strong> ${lastVisit}</p>
                        <p><i class="fas fa-calendar"></i> <strong>Customer Since:</strong> ${new Date(customer.dateAdded).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="customer-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.customerManager.viewCustomerHistory(${customer.id})">
                        <i class="fas fa-history"></i> History
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="window.customerManager.editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.customerManager.deleteCustomer(${customer.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    loadCustomersInCheckout() {
        // Initialize searchable customer dropdown
        this.initializeSearchableCustomerDropdown();
    }

    async initializeSearchableCustomerDropdown() {
        if (this.isDropdownInitialized) {
            console.log('✅ Customer dropdown already initialized, skipping...');
            return;
        }
        
        console.log('🚀 Starting customer dropdown initialization...');
        
        const searchInput = document.getElementById('checkoutCustomerSearchInput');
        const dropdown = document.getElementById('checkoutCustomerDropdown');
        const container = document.querySelector('.customer-search-container');
        
        if (!searchInput || !dropdown || !container) {
            console.log('❌ Customer dropdown elements not found');
            console.log('Search input:', searchInput);
            console.log('Dropdown:', dropdown);
            console.log('Container:', container);
            return;
        }

        // Wait for customers to be loaded if they're still loading, but don't trigger a reload
        if (!this.customersLoaded && this.isInitializing) {
            console.log('⏳ Customers are loading, initializing dropdown without waiting to prevent UI freeze...');
            // Don't wait - this was causing UI freezes
            // The dropdown will update when customers finish loading
        }
        
        // If customers still aren't loaded, use empty array but don't try to load them
        if (!this.customersLoaded) {
            console.log('⚠️ Customers not loaded yet, using empty array for now');
            this.customers = this.customers || [];
        }
        
        console.log('📊 Available customers:', this.customers.length);

        // Remove any existing event listeners to prevent duplicates
        if (this.filterCustomersHandler) {
            searchInput.removeEventListener('input', this.filterCustomersHandler);
            searchInput.removeEventListener('focus', this.showDropdownHandler);
            searchInput.removeEventListener('keydown', this.keydownHandler);
        }

        // Create bound handlers
        this.filterCustomersHandler = (e) => this.filterCustomers(e.target.value);
        this.showDropdownHandler = () => this.showCustomerDropdown();
        this.keydownHandler = (e) => this.handleCustomerSearchKeydown(e);
        this.clickOutsideHandler = (e) => {
            if (!container.contains(e.target)) {
                this.hideCustomerDropdown();
            }
        };

        // Setup event listeners
        searchInput.addEventListener('input', this.filterCustomersHandler);
        searchInput.addEventListener('focus', this.showDropdownHandler);
        searchInput.addEventListener('keydown', this.keydownHandler);
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', this.clickOutsideHandler);

        // Load initial customer list
        this.renderCustomerOptions();
        
        // Mark dropdown as initialized to prevent re-initialization
        this.isDropdownInitialized = true;
        
        console.log('✅ Customer dropdown initialized successfully with', this.customers.length, 'customers');
    }

    filterCustomers(searchTerm) {
        console.log('🔍 Filtering customers for:', searchTerm);
        console.log('📊 Total customers available:', this.customers.length);
        
        const trimmedSearch = searchTerm.trim();
        
        // If empty search, show all customers
        if (!trimmedSearch) {
            console.log('📝 Empty search, showing all customers');
            this.renderCustomerOptions(this.customers, '');
            this.showCustomerDropdown();
            return;
        }

        // Filter customers that contain the search term anywhere in their name or phone
        const filtered = this.customers.filter(customer => {
            const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
            const phone = customer.phone.toLowerCase();
            const matches = fullName.includes(trimmedSearch.toLowerCase()) || 
                   phone.includes(trimmedSearch.toLowerCase());
            if (matches) {
                console.log('✅ Match found:', fullName);
            }
            return matches;
        });
        
        console.log('🎯 Filtered results:', filtered.length);
        this.renderCustomerOptions(filtered, trimmedSearch);
        this.showCustomerDropdown();
    }

    renderCustomerOptions(filteredCustomers = this.customers, searchTerm = '') {
        const dropdown = document.getElementById('checkoutCustomerDropdown');
        if (!dropdown) return;

        // Clear existing options
        dropdown.innerHTML = '';

        // Add filtered customers
        filteredCustomers.forEach(customer => {
            const option = document.createElement('div');
            option.className = 'customer-option';
            option.dataset.value = customer.id;
            
            const visitCount = this.getCustomerVisitCount(customer.id);
            
            option.innerHTML = `
                <span class="customer-name">${customer.firstName} ${customer.lastName}</span>
                <span class="customer-phone">${customer.phone}</span>
                ${visitCount > 0 ? `<span class="customer-visits">(${visitCount} visits)</span>` : ''}
            `;
            
            option.addEventListener('click', () => this.selectCustomer(customer));
            dropdown.appendChild(option);
        });

        // If there's a search term and no matches, show "Add as new customer" option
        if (searchTerm && filteredCustomers.length === 0) {
            const addSearchedOption = document.createElement('div');
            addSearchedOption.className = 'customer-option add-new';
            addSearchedOption.dataset.value = 'new-from-search';
            addSearchedOption.innerHTML = `<i class="fas fa-plus-circle"></i> Add "${searchTerm}" as new customer`;
            addSearchedOption.addEventListener('click', () => this.addNewCustomerFromSearch(searchTerm));
            dropdown.appendChild(addSearchedOption);
        }

        // Always add "Add New Customer" option at the end
        const addNewOption = document.createElement('div');
        addNewOption.className = 'customer-option add-new';
        addNewOption.dataset.value = 'new';
        addNewOption.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Customer';
        addNewOption.addEventListener('click', () => this.selectNewCustomer());
        dropdown.appendChild(addNewOption);
    }

    getCustomerVisitCount(customerId) {
        // Simple visit count - you can enhance this with actual transaction data
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        return transactions.filter(t => t.customerId === customerId).length;
    }

    showCustomerDropdown() {
        console.log('🔽 Attempting to show customer dropdown');
        const dropdown = document.getElementById('checkoutCustomerDropdown');
        const container = document.querySelector('.customer-search-container');
        
        console.log('📦 Dropdown element:', dropdown);
        console.log('📦 Container element:', container);
        
        if (dropdown && container) {
            dropdown.style.display = 'block';
            container.classList.add('active');
            console.log('✅ Dropdown shown successfully');
        } else {
            console.error('❌ Cannot show dropdown - elements not found');
        }
    }

    hideCustomerDropdown() {
        const dropdown = document.getElementById('checkoutCustomerDropdown');
        const container = document.querySelector('.customer-search-container');
        if (dropdown && container) {
            dropdown.style.display = 'none';
            container.classList.remove('active');
        }
    }

    selectCustomer(customer) {
        const searchInput = document.getElementById('checkoutCustomerSearchInput');
        const hiddenInput = document.getElementById('checkoutCustomerSelect');
        
        if (searchInput && hiddenInput) {
            searchInput.value = `${customer.firstName} ${customer.lastName} - ${customer.phone}`;
            hiddenInput.value = customer.id;
            this.selectedCustomerId = customer.id;
            this.handleCheckoutCustomerSelection(customer.id);
        }
        this.hideCustomerDropdown();
    }

    selectNewCustomer() {
        const searchInput = document.getElementById('checkoutCustomerSearchInput');
        const hiddenInput = document.getElementById('checkoutCustomerSelect');
        
        if (searchInput && hiddenInput) {
            searchInput.value = 'Add New Customer';
            hiddenInput.value = 'new';
            this.selectedCustomerId = null;
            this.handleCheckoutCustomerSelection('new');
        }
        this.hideCustomerDropdown();
    }

    addNewCustomerFromSearch(searchTerm) {
        const searchInput = document.getElementById('checkoutCustomerSearchInput');
        const hiddenInput = document.getElementById('checkoutCustomerSelect');
        
        if (searchInput && hiddenInput) {
            searchInput.value = `Add "${searchTerm}" as new customer`;
            hiddenInput.value = 'new';
            this.selectedCustomerId = null;
            
            // Pre-populate the new customer form with the searched name
            this.handleCheckoutCustomerSelection('new');
            this.prePopulateCustomerForm(searchTerm);
        }
        this.hideCustomerDropdown();
    }

    prePopulateCustomerForm(searchTerm) {
        // Try to parse the search term into first and last name
        const nameParts = searchTerm.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Pre-populate the form fields
        setTimeout(() => {
            const firstNameInput = document.getElementById('customerFirstName');
            const lastNameInput = document.getElementById('customerLastName');
            
            if (firstNameInput) {
                firstNameInput.value = firstName;
            }
            if (lastNameInput && lastName) {
                lastNameInput.value = lastName;
            }
            
            // Focus on the phone field since name is already filled
            const phoneInput = document.getElementById('customerPhone');
            if (phoneInput) {
                phoneInput.focus();
            }
        }, 100);
    }

    handleCustomerSearchKeydown(e) {
        const dropdown = document.getElementById('checkoutCustomerDropdown');
        if (!dropdown || dropdown.style.display === 'none') return;

        const options = dropdown.querySelectorAll('.customer-option');
        let currentIndex = Array.from(options).findIndex(opt => opt.classList.contains('selected'));

        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < options.length - 1) {
                    this.highlightOption(options, currentIndex + 1);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    this.highlightOption(options, currentIndex - 1);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0) {
                    options[currentIndex].click();
                }
                break;
            case 'Escape':
                this.hideCustomerDropdown();
                break;
        }
    }

    highlightOption(options, index) {
        options.forEach((opt, i) => {
            opt.classList.toggle('selected', i === index);
        });
    }

    handleCheckoutCustomerSelection(value) {
        const newCustomerForm = document.getElementById('newCustomerForm');
        if (!newCustomerForm) return;

        if (value === 'new') {
            newCustomerForm.style.display = 'block';
            this.selectedCustomerId = null;
        } else {
            newCustomerForm.style.display = 'none';
            this.selectedCustomerId = value;
        }
    }

    showAddCustomerModal() {
        // Create and show modal for adding new customer
        const modalHtml = `
            <div id="addCustomerModal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-user-plus"></i> Add New Customer</h2>
                        <button class="modal-close" onclick="window.customerManager.closeAddCustomerModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="addCustomerForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>First Name *</label>
                                    <input type="text" id="newCustomerFirstName" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label>Last Name *</label>
                                    <input type="text" id="newCustomerLastName" class="form-input" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Phone Number *</label>
                                <input type="tel" id="newCustomerPhone" class="form-input" placeholder="09XXXXXXXXX" required>
                            </div>
                            <div class="form-group">
                                <label>Email (optional)</label>
                                <input type="email" id="newCustomerEmail" class="form-input" placeholder="customer@email.com">
                            </div>
                            <div class="form-group">
                                <label>Address (optional)</label>
                                <textarea id="newCustomerAddress" class="form-input" rows="3" placeholder="Customer address"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Notes (optional)</label>
                                <textarea id="newCustomerNotes" class="form-input" rows="2" placeholder="Special notes about the customer"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="window.customerManager.closeAddCustomerModal()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="window.customerManager.saveCustomer()">
                            <i class="fas fa-save"></i> Save Customer
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('addCustomerModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    closeAddCustomerModal() {
        const modal = document.getElementById('addCustomerModal');
        if (modal) modal.remove();
    }

    async saveCustomer() {
        const firstName = document.getElementById('newCustomerFirstName').value.trim();
        const lastName = document.getElementById('newCustomerLastName').value.trim();
        const phone = document.getElementById('newCustomerPhone').value.trim();
        const email = document.getElementById('newCustomerEmail').value.trim();
        const address = document.getElementById('newCustomerAddress').value.trim();
        const notes = document.getElementById('newCustomerNotes').value.trim();

        // Validation
        if (!firstName || !lastName || !phone) {
            showError('Please fill in all required fields (First Name, Last Name, Phone)');
            return;
        }

        // Phone validation (simple)
        if (!/^09\d{9}$/.test(phone)) {
            showError('Phone number must be in format 09XXXXXXXXX');
            return;
        }

        try {
            const customer = {
                id: Date.now(),
                firstName,
                lastName,
                phone,
                email: email || null,
                address: address || null,
                notes: notes || null,
                dateAdded: new Date().toISOString(),
                lastVisit: null,
                totalVisits: 0,
                totalSpent: 0
            };

            await window.db.add('customers', customer);
            
            // Update customers array directly instead of reloading to prevent initialization loops
            this.customers.push(customer);
            this.filteredCustomers = [...this.customers];
            
            // Update displays
            this.displayCustomers();
            this.updateCustomerStats();
            
            // Update dropdown options if it's initialized
            if (this.isDropdownInitialized) {
                this.renderCustomerOptions();
            }
            
            this.closeAddCustomerModal();
            
            showSuccess('Customer added successfully!');
        } catch (error) {
            console.error('Error saving customer:', error);
            showError('Failed to save customer. Please try again.');
        }
    }

    async getCustomerFromCheckout() {
        const customerSelect = document.getElementById('checkoutCustomerSelect');
        if (!customerSelect) return null;

        const selectedValue = customerSelect.value;

        if (!selectedValue) {
            return null; // No customer selected
        }

        if (selectedValue === 'new') {
            // Create new customer from form
            const firstName = document.getElementById('customerFirstName')?.value.trim();
            const lastName = document.getElementById('customerLastName')?.value.trim();
            const phone = document.getElementById('customerPhone')?.value.trim();
            const email = document.getElementById('customerEmail')?.value.trim();

            if (!firstName || !lastName || !phone) {
                throw new Error('Please fill in customer first name, last name, and phone number');
            }

            // Phone validation
            if (!/^09\d{9}$/.test(phone)) {
                throw new Error('Phone number must be in format 09XXXXXXXXX');
            }

            const customer = {
                id: Date.now(),
                firstName,
                lastName,
                phone,
                email: email || null,
                dateAdded: new Date().toISOString(),
                lastVisit: new Date().toISOString(),
                totalVisits: 1,
                totalSpent: 0
            };

            // Save to database
            try {
                await window.db.add('customers', customer);
                // Invalidate cache when new data is added
                this.transactionsCache = null;
                
                // Update customers array directly instead of reloading
                this.customers.push(customer);
                this.filteredCustomers = [...this.customers];
                this.updateCustomerStats();
                
                // Update dropdown options if it's initialized
                if (this.isDropdownInitialized) {
                    this.renderCustomerOptions();
                }
                
                return customer;
            } catch (dbError) {
                console.warn('Customer database not available, proceeding without saving:', dbError);
                // Return customer data for transaction but don't save to DB
                return customer;
            }
        } else {
            // Existing customer
            const customer = this.customers.find(c => c.id == selectedValue);
            if (customer) {
                // Update last visit
                customer.lastVisit = new Date().toISOString();
                customer.totalVisits = (customer.totalVisits || 0) + 1;
                try {
                    await window.db.update('customers', customer);
                } catch (dbError) {
                    console.warn('Could not update customer in database:', dbError);
                }
            }
            return customer;
        }
    }

    async editCustomer(customerId) {
        // Implementation for editing customer
        console.log('Edit customer:', customerId);
    }

    async deleteCustomer(customerId) {
        if (!confirm('Are you sure you want to delete this customer?')) return;

        try {
            await window.db.delete('customers', customerId);
            
            // Update customers array directly instead of reloading
            this.customers = this.customers.filter(c => c.id !== customerId);
            this.filteredCustomers = [...this.customers];
            
            // Update displays
            this.displayCustomers();
            this.updateCustomerStats();
            
            // Update dropdown options if it's initialized
            if (this.isDropdownInitialized) {
                this.renderCustomerOptions();
            }
            
            showSuccess('Customer deleted successfully!');
        } catch (error) {
            console.error('Error deleting customer:', error);
            showError('Failed to delete customer. Please try again.');
        }
    }

    searchCustomers(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredCustomers = [...this.customers];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredCustomers = this.customers.filter(customer => {
                const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
                const phone = customer.phone.toLowerCase();
                const email = (customer.email || '').toLowerCase();
                
                return fullName.includes(term) || 
                       phone.includes(term) || 
                       email.includes(term);
            });
        }
        this.displayCustomers();
    }

    async getTransactionsWithCache() {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.transactionsCache && this.cacheTimestamp && 
            (now - this.cacheTimestamp) < this.cacheValidityMs) {
            return this.transactionsCache;
        }
        
        // Load fresh data and cache it
        const transactions = await window.db.getAll('transactions') || [];
        this.transactionsCache = transactions;
        this.cacheTimestamp = now;
        
        return transactions;
    }

    async enrichCustomersWithServiceHistory() {
        try {
            const transactions = await this.getTransactionsWithCache();
            
            // Process customers in chunks to prevent UI blocking
            for (let i = 0; i < this.customers.length; i++) {
                const customer = this.customers[i];
                
                // Yield control every 5 customers to keep UI responsive
                if (i > 0 && i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                const customerTransactions = transactions.filter(t => 
                    t.customerId === customer.id || 
                    (t.customerInfo && (t.customerInfo.phone === customer.phone))
                );
                
                customer.totalVisits = customerTransactions.length;
                customer.totalSpent = customerTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
                
                // Calculate favorite service - count all items regardless of type
                const serviceCount = {};
                let totalItems = 0;
                
                customerTransactions.forEach(transaction => {
                    if (transaction.items && Array.isArray(transaction.items)) {
                        transaction.items.forEach(item => {
                            if (item && item.name && item.name.trim()) {
                                // Count all items, not just services - in a spa, products are also services
                                const itemName = item.name.trim();
                                const quantity = parseInt(item.quantity) || 1;
                                serviceCount[itemName] = (serviceCount[itemName] || 0) + quantity;
                                totalItems += quantity;
                            }
                        });
                    }
                });
                
                if (Object.keys(serviceCount).length > 0) {
                    // Find the service with the highest count
                    customer.favoriteService = Object.keys(serviceCount).reduce((a, b) => 
                        serviceCount[a] > serviceCount[b] ? a : b
                    );
                } else {
                    customer.favoriteService = 'No services yet';
                }
                
                // Debug info removed for performance
                // Uncomment for debugging: 
                // console.log(`Customer ${customer.firstName} ${customer.lastName}:`, {
                //     transactions: customerTransactions.length, services: serviceCount
                // });
                
                // Update last visit - use 'date' field from transactions
                if (customerTransactions.length > 0) {
                    const lastTransaction = customerTransactions.sort((a, b) => 
                        new Date(b.date) - new Date(a.date)
                    )[0];
                    customer.lastVisit = lastTransaction.date;
                }
            }
        } catch (error) {
            console.error('Error enriching customer data:', error);
        }
    }

    updateCustomerStats() {
        const totalCustomersEl = document.getElementById('totalCustomers');
        const newCustomersThisMonthEl = document.getElementById('newCustomersThisMonth');
        const activeCustomersEl = document.getElementById('activeCustomers');
        
        if (totalCustomersEl) {
            totalCustomersEl.textContent = this.customers.length;
        }
        
        if (newCustomersThisMonthEl) {
            const thisMonth = new Date();
            const newThisMonth = this.customers.filter(customer => {
                const customerDate = new Date(customer.dateAdded);
                return customerDate.getMonth() === thisMonth.getMonth() && 
                       customerDate.getFullYear() === thisMonth.getFullYear();
            }).length;
            newCustomersThisMonthEl.textContent = newThisMonth;
        }
        
        if (activeCustomersEl) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const activeCustomers = this.customers.filter(customer => {
                return customer.lastVisit && new Date(customer.lastVisit) >= thirtyDaysAgo;
            }).length;
            activeCustomersEl.textContent = activeCustomers;
        }
    }

    async viewCustomerHistory(customerId) {
        const customer = this.customers.find(c => c.id == customerId);
        if (!customer) return;
        
        try {
            const transactions = await this.getTransactionsWithCache();
            const customerTransactions = transactions.filter(t => 
                t.customerId === customer.id || 
                (t.customerInfo && t.customerInfo.phone === customer.phone)
            ).sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.showCustomerHistoryModal(customer, customerTransactions);
        } catch (error) {
            console.error('Error loading customer history:', error);
            showError('Failed to load customer history.');
        }
    }

    showCustomerHistoryModal(customer, transactions) {
        const modalHtml = `
            <div id="customerHistoryModal" class="modal active">
                <div class="modal-content large-modal">
                    <div class="modal-header">
                        <h2><i class="fas fa-history"></i> ${customer.firstName} ${customer.lastName} - Visit History</h2>
                        <button class="modal-close" onclick="window.customerManager.closeCustomerHistoryModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="customer-summary">
                            <div class="summary-stats">
                                <div class="stat">
                                    <span class="stat-value">${transactions.length}</span>
                                    <span class="stat-label">Total Visits</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value">₱${transactions.reduce((sum, t) => sum + (t.total || 0), 0).toLocaleString()}</span>
                                    <span class="stat-label">Total Spent</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value">${customer.favoriteService || 'N/A'}</span>
                                    <span class="stat-label">Favorite Service</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="transaction-history">
                            <h3>Visit History</h3>
                            ${transactions.length === 0 ? 
                                '<p class="no-data">No visit history found.</p>' :
                                `<div class="transaction-list">
                                    ${transactions.map(transaction => `
                                        <div class="transaction-item">
                                            <div class="transaction-header">
                                                <span class="transaction-date">${new Date(transaction.date).toLocaleString()}</span>
                                                <span class="transaction-total">₱${(transaction.total || 0).toLocaleString()}</span>
                                            </div>
                                            <div class="transaction-items">
                                                ${(transaction.items || []).map(item => `
                                                    <div class="transaction-item-detail">
                                                        <span class="item-name">${item.name || 'Unknown Item'}</span>
                                                        <span class="item-quantity">x${item.quantity || 1}</span>
                                                        <span class="item-price">₱${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>`
                            }
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="window.customerManager.closeCustomerHistoryModal()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('customerHistoryModal');
        if (existingModal) existingModal.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    closeCustomerHistoryModal() {
        const modal = document.getElementById('customerHistoryModal');
        if (modal) modal.remove();
    }
}

// Initialize customer manager
window.customerManager = new CustomerManager();

// Debug function to test dropdown manually
window.testCustomerDropdown = async function() {
    console.log('🧪 Testing customer dropdown...');
    const input = document.getElementById('checkoutCustomerSearchInput');
    const dropdown = document.getElementById('checkoutCustomerDropdown');
    const container = document.querySelector('.customer-search-container');
    
    console.log('Input element:', input);
    console.log('Dropdown element:', dropdown);
    console.log('Container element:', container);
    
    if (input && dropdown && container) {
        console.log('✅ All elements found');
        await window.customerManager.initializeSearchableCustomerDropdown();
        window.customerManager.filterCustomers('d');
    } else {
        console.log('❌ Missing elements');
    }
};

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.customerManager.init();
    });
} else {
    window.customerManager.init();
}