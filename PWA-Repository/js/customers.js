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
        
        // Virtual scrolling and pagination
        this.pageSize = 20; // Items per page
        this.currentPage = 1;
        this.totalPages = 1;
        this.displayMode = 'pagination'; // 'pagination' or 'virtual'
        this.virtualScrollContainer = null;
        this.renderedItems = new Set();
        this.scrollObserver = null;
    }

    async init() {
        // Check if customers table exists, if not trigger database upgrade
        await this.ensureCustomersTable();
        await this.loadCustomers();
        this.setupEventListeners();
        this.updateCustomerStats();
    }

    async waitForDatabaseReady() {
        const maxWaitTime = 5000; // 5 seconds max wait
        const checkInterval = 50; // Check every 50ms
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const checkDatabase = () => {
                if (!window.db || !window.db.isInitializing) {
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > maxWaitTime) {
                    console.warn('Database initialization timeout');
                    resolve();
                    return;
                }
                
                // Use requestAnimationFrame for better performance
                requestAnimationFrame(() => {
                    setTimeout(checkDatabase, checkInterval);
                });
            };
            
            checkDatabase();
        });
    }

    async ensureCustomersTable() {
        console.log('🔍 Checking if customers table exists...');
        
        // Non-blocking wait for database initialization
        if (window.db && window.db.isInitializing) {
            console.log('⏳ Database is initializing, waiting...');
            // Use promise-based waiting instead of blocking while loop
            await this.waitForDatabaseReady();
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
            this.hidePaginationControls();
            return;
        }

        // Calculate pagination
        this.totalPages = Math.ceil(customersToShow.length / this.pageSize);
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        
        // Get customers for current page
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageCustomers = customersToShow.slice(startIndex, endIndex);

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');
        
        tempDiv.innerHTML = pageCustomers.map(customer => this.createCustomerCard(customer)).join('');
        
        // Move all children to fragment
        while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
        }
        
        // Clear grid and append fragment in one operation
        customersGrid.innerHTML = '';
        customersGrid.appendChild(fragment);
        
        // Update pagination controls
        this.updatePaginationControls(customersToShow.length);
    }
    
    updatePaginationControls(totalItems) {
        let paginationContainer = document.getElementById('customersPagination');
        
        // Create pagination container if it doesn't exist
        if (!paginationContainer) {
            const customersSection = document.querySelector('.customers-section') || 
                                   document.getElementById('customersGrid')?.parentElement;
            if (!customersSection) return;
            
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'customersPagination';
            paginationContainer.className = 'pagination-controls';
            paginationContainer.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                margin-top: 20px;
                padding: 10px;
            `;
            customersSection.appendChild(paginationContainer);
        }
        
        // Show pagination only if more than one page
        if (this.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        paginationContainer.innerHTML = `
            <button class="btn btn-sm" onclick="window.customerManager.goToPage(1)" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button class="btn btn-sm" onclick="window.customerManager.previousPage()" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-left"></i>
            </button>
            <span style="margin: 0 10px;">
                Page ${this.currentPage} of ${this.totalPages} 
                (${totalItems} customers)
            </span>
            <button class="btn btn-sm" onclick="window.customerManager.nextPage()" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                <i class="fas fa-angle-right"></i>
            </button>
            <button class="btn btn-sm" onclick="window.customerManager.goToPage(${this.totalPages})" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                <i class="fas fa-angle-double-right"></i>
            </button>
        `;
    }
    
    hidePaginationControls() {
        const paginationContainer = document.getElementById('customersPagination');
        if (paginationContainer) {
            paginationContainer.style.display = 'none';
        }
    }
    
    // Pagination methods
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.displayCustomers();
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayCustomers();
        }
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.displayCustomers();
        }
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

        // Create debounced filter handler for better performance
        const debouncedFilter = typeof debounce !== 'undefined' 
            ? debounce((value) => this.filterCustomers(value), 300)
            : (value) => this.filterCustomers(value);
        
        // Create bound handlers
        this.filterCustomersHandler = (e) => debouncedFilter(e.target.value);
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

        // Initially show only "Add New Customer" option
        this.renderCustomerOptions([], '');
        
        // Mark dropdown as initialized to prevent re-initialization
        this.isDropdownInitialized = true;
        
        console.log('✅ Customer dropdown initialized successfully with', this.customers.length, 'customers');
    }

    filterCustomers(searchTerm) {
        console.log('🔍 Filtering customers for:', searchTerm);
        console.log('📊 Total customers available:', this.customers.length);
        
        const trimmedSearch = searchTerm.trim();
        
        // If empty search, show only "Add New Customer" option
        if (!trimmedSearch) {
            console.log('📝 Empty search, showing only Add New Customer option');
            this.renderCustomerOptions([], '');
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

    renderCustomerOptions(filteredCustomers = [], searchTerm = '') {
        const dropdown = document.getElementById('checkoutCustomerDropdown');
        if (!dropdown) return;

        // Remove existing click handler to prevent memory leaks
        if (this.dropdownClickHandler) {
            dropdown.removeEventListener('click', this.dropdownClickHandler);
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();

        // Always add "Add New Customer" option first
        const addNewOption = document.createElement('div');
        addNewOption.className = 'customer-option add-new';
        addNewOption.dataset.value = searchTerm && filteredCustomers.length === 0 ? 'new-from-search' : 'new';
        addNewOption.dataset.searchTerm = searchTerm;
        
        if (!searchTerm) {
            // No search term - show plain "Add New Customer"
            addNewOption.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Customer';
        } else if (filteredCustomers.length === 0) {
            // Search term with no matches - show "Add [term] as new customer"
            addNewOption.innerHTML = `<i class="fas fa-plus-circle"></i> Add "${searchTerm}" as new customer`;
        } else {
            // Search term with matches - show plain "Add New Customer"
            addNewOption.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Customer';
        }
        
        fragment.appendChild(addNewOption);

        // Only show existing customers if there's a search term and matches
        if (searchTerm && filteredCustomers.length > 0) {
            // Add a separator
            const separator = document.createElement('div');
            separator.style.borderTop = '1px solid #e5e7eb';
            separator.style.margin = '0';
            fragment.appendChild(separator);
            
            // Add filtered customers
            filteredCustomers.forEach(customer => {
                const option = document.createElement('div');
                option.className = 'customer-option';
                option.dataset.value = customer.id;
                option.dataset.customerId = customer.id;
                
                const visitCount = this.getCustomerVisitCount(customer.id);
                
                option.innerHTML = `
                    <span class="customer-name">${customer.firstName} ${customer.lastName}</span>
                    <span class="customer-phone">${customer.phone}</span>
                    ${visitCount > 0 ? `<span class="customer-visits">(${visitCount} visits)</span>` : ''}
                `;
                
                fragment.appendChild(option);
            });
        }

        // Clear and append all at once
        dropdown.innerHTML = '';
        dropdown.appendChild(fragment);

        // Use event delegation for better performance
        this.dropdownClickHandler = (e) => {
            const option = e.target.closest('.customer-option');
            if (!option) return;

            const value = option.dataset.value;
            const customerId = option.dataset.customerId;
            const searchTerm = option.dataset.searchTerm;

            if (value === 'new') {
                this.selectNewCustomer();
            } else if (value === 'new-from-search' && searchTerm) {
                this.addNewCustomerFromSearch(searchTerm);
            } else if (customerId) {
                const customer = this.customers.find(c => 
                    String(c.id) === String(customerId) || 
                    String(c._id) === String(customerId)
                );
                if (customer) {
                    this.selectCustomer(customer);
                } else {
                    console.error('Customer not found with ID:', customerId);
                }
            }
        };

        dropdown.addEventListener('click', this.dropdownClickHandler);
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
        const searchInput = document.getElementById('checkoutCustomerSearchInput');
        
        console.log('📦 Dropdown element:', dropdown);
        console.log('📦 Container element:', container);
        
        if (dropdown && container) {
            dropdown.style.display = 'block';
            container.classList.add('active');
            
            // On focus, if empty, show only "Add New Customer"
            if (searchInput && !searchInput.value.trim()) {
                this.renderCustomerOptions([], '');
            }
            
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

        // CHECK FOR DUPLICATE PHONE NUMBER
        if (this.isDuplicatePhone(phone)) {
            const existingCustomer = this.customers.find(c => c.phone === phone);
            const confirmAdd = confirm(
                `A customer with phone ${phone} already exists:\n` +
                `${existingCustomer.firstName} ${existingCustomer.lastName}\n\n` +
                `Do you still want to add this customer?`
            );
            
            if (!confirmAdd) {
                return;
            }
        }

        try {
            // Better ID generation to avoid collisions
            const customer = {
                id: Date.now() + Math.random(),
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
            const address = document.getElementById('customerAddress')?.value.trim();

            if (!firstName || !lastName || !phone) {
                throw new Error('Please fill in customer first name, last name, and phone number');
            }

            // Phone validation
            if (!/^09\d{9}$/.test(phone)) {
                throw new Error('Phone number must be in format 09XXXXXXXXX');
            }

            // CHECK FOR DUPLICATE IN CHECKOUT TOO
            if (this.isDuplicatePhone(phone)) {
                const existingCustomer = this.customers.find(c => c.phone === phone);
                throw new Error(
                    `Customer with phone ${phone} already exists: ${existingCustomer.firstName} ${existingCustomer.lastName}. ` +
                    `Please select them from the dropdown instead.`
                );
            }

            const customer = {
                id: Date.now() + Math.random(), // Better ID generation
                firstName,
                lastName,
                phone,
                email: email || null,
                address: address || null,
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
            
            // Process customers in smaller batches with better yielding
            const batchSize = 10;
            for (let i = 0; i < this.customers.length; i += batchSize) {
                // Process a batch of customers
                const batch = this.customers.slice(i, Math.min(i + batchSize, this.customers.length));
                
                batch.forEach(customer => {
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
                    
                    // Update last visit - use 'date' field from transactions
                    if (customerTransactions.length > 0) {
                        const lastTransaction = customerTransactions.sort((a, b) => 
                            new Date(b.date) - new Date(a.date)
                        )[0];
                        customer.lastVisit = lastTransaction.date;
                    }
                });
                
                // Yield control back to the browser after each batch
                // Using requestAnimationFrame for smoother UI updates
                if (i + batchSize < this.customers.length) {
                    await new Promise(resolve => {
                        requestAnimationFrame(() => resolve());
                    });
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

    // EXPORT/IMPORT FUNCTIONALITY FOR DATA PROTECTION
    async exportCustomersToCSV() {
        try {
            const customers = this.customers;
            if (customers.length === 0) {
                showError('No customers to export');
                return;
            }

            // CSV Headers
            const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Address', 'Notes', 'Date Added', 'Last Visit', 'Total Visits', 'Total Spent', 'Favorite Service'];
            
            // Convert customers to CSV rows
            const rows = customers.map(customer => [
                customer.firstName || '',
                customer.lastName || '',
                customer.phone || '',
                customer.email || '',
                customer.address || '',
                customer.notes || '',
                customer.dateAdded ? new Date(customer.dateAdded).toLocaleDateString() : '',
                customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : '',
                customer.totalVisits || 0,
                customer.totalSpent || 0,
                customer.favoriteService || ''
            ]);

            // Create CSV content
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => {
                    // Escape quotes and wrap in quotes if contains comma
                    const escaped = String(cell).replace(/"/g, '""');
                    return escaped.includes(',') ? `"${escaped}"` : escaped;
                }).join(','))
            ].join('\n');

            // Download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            
            link.href = url;
            link.download = `customers-${date}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showSuccess(`Exported ${customers.length} customers to CSV`);
            console.log(`✅ Exported ${customers.length} customers to CSV`);
            
        } catch (error) {
            console.error('Export failed:', error);
            showError('Failed to export customers');
        }
    }

    async exportCustomersToJSON() {
        try {
            const customers = this.customers;
            if (customers.length === 0) {
                showError('No customers to export');
                return;
            }

            const exportData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                businessName: localStorage.getItem('businessName') || 'Unknown',
                totalCustomers: customers.length,
                customers: customers
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            
            link.href = url;
            link.download = `customers-backup-${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showSuccess(`Exported ${customers.length} customers to JSON backup`);
            console.log(`✅ Exported ${customers.length} customers to JSON`);
            
        } catch (error) {
            console.error('Export failed:', error);
            showError('Failed to export customers');
        }
    }

    async importCustomersFromFile(file) {
        try {
            const text = await file.text();
            let importedCustomers = [];

            // Detect file type
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                const data = JSON.parse(text);
                importedCustomers = data.customers || data;
            } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                importedCustomers = this.parseCSV(text);
            } else {
                throw new Error('Unsupported file type. Please use JSON or CSV.');
            }

            if (!Array.isArray(importedCustomers)) {
                throw new Error('Invalid file format');
            }

            // Check for duplicates and import
            let imported = 0;
            let skipped = 0;
            let updated = 0;

            for (const importCustomer of importedCustomers) {
                // Validate required fields
                if (!importCustomer.firstName || !importCustomer.lastName || !importCustomer.phone) {
                    skipped++;
                    continue;
                }

                // Check for duplicate by phone number
                const existing = this.customers.find(c => c.phone === importCustomer.phone);
                
                if (existing) {
                    // Update existing customer if needed
                    const shouldUpdate = confirm(`Customer ${importCustomer.firstName} ${importCustomer.lastName} with phone ${importCustomer.phone} already exists. Update their information?`);
                    
                    if (shouldUpdate) {
                        // Merge data, keeping existing ID
                        const updatedCustomer = {
                            ...existing,
                            ...importCustomer,
                            id: existing.id, // Keep original ID
                            dateAdded: existing.dateAdded // Keep original date
                        };
                        
                        await window.db.update('customers', updatedCustomer);
                        const index = this.customers.findIndex(c => c.id === existing.id);
                        this.customers[index] = updatedCustomer;
                        updated++;
                    } else {
                        skipped++;
                    }
                } else {
                    // Add new customer
                    const newCustomer = {
                        ...importCustomer,
                        id: Date.now() + Math.random(), // Better ID generation
                        dateAdded: importCustomer.dateAdded || new Date().toISOString()
                    };
                    
                    await window.db.add('customers', newCustomer);
                    this.customers.push(newCustomer);
                    imported++;
                }
            }

            // Refresh display
            this.filteredCustomers = [...this.customers];
            this.displayCustomers();
            this.updateCustomerStats();
            
            // Update dropdown if initialized
            if (this.isDropdownInitialized) {
                this.renderCustomerOptions();
            }

            const message = `Import complete: ${imported} new, ${updated} updated, ${skipped} skipped`;
            showSuccess(message);
            console.log(`✅ ${message}`);
            
        } catch (error) {
            console.error('Import failed:', error);
            showError(`Import failed: ${error.message}`);
        }
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const customers = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const customer = {};

            // Map CSV columns to customer properties
            const columnMap = {
                'first name': 'firstName',
                'last name': 'lastName',
                'phone': 'phone',
                'email': 'email',
                'address': 'address',
                'notes': 'notes',
                'date added': 'dateAdded',
                'last visit': 'lastVisit',
                'total visits': 'totalVisits',
                'total spent': 'totalSpent',
                'favorite service': 'favoriteService'
            };

            headers.forEach((header, index) => {
                const prop = columnMap[header] || header;
                let value = values[index] || '';
                
                // Convert numeric values
                if (['totalVisits', 'totalSpent'].includes(prop)) {
                    value = parseFloat(value) || 0;
                }
                
                customer[prop] = value;
            });

            customers.push(customer);
        }

        return customers;
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    // Check for duplicate phone number
    isDuplicatePhone(phone, excludeId = null) {
        return this.customers.some(customer => 
            customer.phone === phone && customer.id !== excludeId
        );
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