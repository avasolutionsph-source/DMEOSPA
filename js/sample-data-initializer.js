// Sample Data Initializer for pok@gmail.com account
// This module creates comprehensive sample data for all features

class SampleDataInitializer {
    constructor() {
        this.currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
    }

    async clearAllData() {
        console.log('🗑️ Clearing all existing data...');
        
        const stores = [
            'products',
            'inventory',
            'employees', 
            'transactions',
            'expenses',
            'rooms',
            'giftCertificates',
            'attendance',
            'payroll',
            'employeeRequests',
            'holidays',
            'attendanceRules'
        ];

        for (const store of stores) {
            try {
                const data = await window.db.getAll(store);
                for (const item of data) {
                    await window.db.delete(store, item.id);
                }
                console.log(`✅ Cleared ${store}`);
            } catch (error) {
                console.warn(`Could not clear ${store}:`, error);
            }
        }

        // Clear localStorage flags
        localStorage.removeItem('payrollSamplesInitialized');
        localStorage.removeItem('sampleDataInitialized');
        localStorage.removeItem('attendanceSamplesInitialized');
        localStorage.removeItem('sampleDataRefreshed');
    }

    async initializeAllSampleData() {
        if (this.currentUser.email !== 'pok@gmail.com') {
            console.log('Sample data only for pok@gmail.com account');
            return;
        }

        // Check if already initialized
        const initialized = localStorage.getItem('sampleDataInitialized');
        if (initialized === 'v3') {
            console.log('Sample data already initialized');
            return;
        }

        console.log('🚀 Initializing comprehensive sample data...');

        // Clear existing data first
        await this.clearAllData();

        // Initialize all sample data
        await this.createEmployees();
        await this.createProducts();
        await this.createInventory();
        await this.createTransactions();
        await this.createExpenses();
        await this.createRooms();
        await this.createGiftCertificates();
        await this.createAttendanceData();
        await this.createPayrollData();
        await this.createEmployeeRequests();
        await this.createHolidays();

        // Mark as initialized
        localStorage.setItem('sampleDataInitialized', 'v3');
        console.log('✅ All spa business sample data initialized successfully!');
    }

    async createEmployees() {
        const employees = [
            {
                id: 'emp001',
                name: 'Maria Santos',
                position: 'Spa Manager',
                email: 'maria.santos@avasolutions.ph',
                phone: '09171234567',
                department: 'Management',
                salary: 45000,
                dailyRate: 2000,
                employmentDate: '2022-08-15',
                status: 'active',
                photo: null,
                certifications: ['Licensed Massage Therapist', 'Spa Management Certification']
            },
            {
                id: 'emp002',
                name: 'Anna Reyes',
                position: 'Senior Massage Therapist',
                email: 'anna.reyes@avasolutions.ph',
                phone: '09181234567',
                department: 'Therapy',
                salary: 32000,
                dailyRate: 1400,
                employmentDate: '2022-10-20',
                status: 'active',
                photo: null,
                certifications: ['Swedish Massage', 'Deep Tissue', 'Hot Stone Therapy']
            },
            {
                id: 'emp003',
                name: 'Carmen dela Cruz',
                position: 'Facial Specialist',
                email: 'carmen.delacruz@avasolutions.ph',
                phone: '09191234567',
                department: 'Aesthetics',
                salary: 28000,
                dailyRate: 1200,
                employmentDate: '2023-01-10',
                status: 'active',
                photo: null,
                certifications: ['Basic Facial Treatments', 'Chemical Peel Specialist']
            },
            {
                id: 'emp004',
                name: 'Isabella Garcia',
                position: 'Nail Technician',
                email: 'isabella.garcia@avasolutions.ph',
                phone: '09201234567',
                department: 'Nail Care',
                salary: 24000,
                dailyRate: 1000,
                employmentDate: '2023-04-01',
                status: 'active',
                photo: null,
                certifications: ['Manicure & Pedicure', 'Gel Extensions']
            },
            {
                id: 'emp005',
                name: 'Sofia Mendoza',
                position: 'Receptionist',
                email: 'sofia.mendoza@avasolutions.ph',
                phone: '09211234567',
                department: 'Front Desk',
                salary: 22000,
                dailyRate: 900,
                employmentDate: '2023-06-15',
                status: 'active',
                photo: null,
                certifications: ['Customer Service Excellence', 'Basic Computer Skills']
            },
            {
                id: 'emp006',
                name: 'Patricia Morales',
                position: 'Junior Massage Therapist',
                email: 'patricia.morales@avasolutions.ph',
                phone: '09221234567',
                department: 'Therapy',
                salary: 26000,
                dailyRate: 1100,
                employmentDate: '2023-09-01',
                status: 'active',
                photo: null,
                certifications: ['Basic Massage Therapy', 'Prenatal Massage']
            }
        ];

        for (const employee of employees) {
            await window.db.add('employees', employee);
        }
        console.log('✅ Created', employees.length, 'spa employees');
    }

    async createProducts() {
        const products = [
            // Spa Services
            {
                id: 'serv001',
                name: 'Swedish Massage (60 min)',
                category: 'Massage Services',
                price: 1800,
                cost: 600,
                barcode: '1001001001',
                sku: 'SW-M60',
                stock: 999, // Services don't have stock limits
                minStock: 0,
                supplier: 'Internal Service',
                description: 'Relaxing full body Swedish massage for stress relief',
                duration: 60,
                serviceType: 'massage'
            },
            {
                id: 'serv002',
                name: 'Deep Tissue Massage (90 min)',
                category: 'Massage Services',
                price: 2500,
                cost: 800,
                barcode: '1001001002',
                sku: 'DT-M90',
                stock: 999,
                minStock: 0,
                supplier: 'Internal Service',
                description: 'Intensive therapeutic massage targeting muscle tension',
                duration: 90,
                serviceType: 'massage'
            },
            {
                id: 'serv003',
                name: 'Hot Stone Massage (75 min)',
                category: 'Massage Services',
                price: 2200,
                cost: 750,
                barcode: '1001001003',
                sku: 'HS-M75',
                stock: 999,
                minStock: 0,
                supplier: 'Internal Service',
                description: 'Relaxing massage using heated volcanic stones',
                duration: 75,
                serviceType: 'massage'
            },
            {
                id: 'serv004',
                name: 'Classic Facial (60 min)',
                category: 'Facial Treatments',
                price: 1500,
                cost: 500,
                barcode: '1002001001',
                sku: 'CF-60',
                stock: 999,
                minStock: 0,
                supplier: 'Internal Service',
                description: 'Deep cleansing facial with extraction and moisturizing',
                duration: 60,
                serviceType: 'facial'
            },
            {
                id: 'serv005',
                name: 'Anti-Aging Facial (90 min)',
                category: 'Facial Treatments',
                price: 2800,
                cost: 1000,
                barcode: '1002001002',
                sku: 'AF-90',
                stock: 999,
                minStock: 0,
                supplier: 'Internal Service',
                description: 'Advanced facial treatment with collagen and vitamin C',
                duration: 90,
                serviceType: 'facial'
            },
            {
                id: 'serv006',
                name: 'Manicure with Gel Polish',
                category: 'Nail Care',
                price: 800,
                cost: 250,
                barcode: '1003001001',
                sku: 'MAN-GEL',
                stock: 999,
                minStock: 0,
                supplier: 'Internal Service',
                description: 'Complete nail care with long-lasting gel polish',
                duration: 60,
                serviceType: 'nails'
            },
            {
                id: 'serv007',
                name: 'Pedicure with Massage',
                category: 'Nail Care',
                price: 1000,
                cost: 300,
                barcode: '1003001002',
                sku: 'PED-MAS',
                stock: 999,
                minStock: 0,
                supplier: 'Internal Service',
                description: 'Relaxing pedicure with foot massage and polish',
                duration: 75,
                serviceType: 'nails'
            },
            // Retail Products
            {
                id: 'prod001',
                name: 'Organic Face Serum',
                category: 'Skincare Products',
                price: 1200,
                cost: 600,
                barcode: '2001001001',
                sku: 'OFS-30ML',
                stock: 25,
                minStock: 5,
                supplier: 'Natural Beauty Co.',
                description: 'Premium anti-aging serum with hyaluronic acid'
            },
            {
                id: 'prod002',
                name: 'Lavender Body Oil',
                category: 'Aromatherapy',
                price: 850,
                cost: 400,
                barcode: '2002001001',
                sku: 'LBO-100ML',
                stock: 30,
                minStock: 8,
                supplier: 'Essential Oils Ltd.',
                description: 'Pure lavender essential oil for relaxation'
            },
            {
                id: 'prod003',
                name: 'Himalayan Salt Scrub',
                category: 'Body Care',
                price: 650,
                cost: 300,
                barcode: '2003001001',
                sku: 'HSS-200G',
                stock: 40,
                minStock: 10,
                supplier: 'Spa Supply Corp.',
                description: 'Exfoliating body scrub with natural minerals'
            },
            {
                id: 'prod004',
                name: 'Bamboo Facial Brush',
                category: 'Spa Tools',
                price: 450,
                cost: 200,
                barcode: '2004001001',
                sku: 'BFB-001',
                stock: 20,
                minStock: 5,
                supplier: 'Eco Tools Inc.',
                description: 'Sustainable bamboo facial cleansing brush'
            },
            {
                id: 'prod005',
                name: 'Aromatherapy Candle Set',
                category: 'Aromatherapy',
                price: 1500,
                cost: 700,
                barcode: '2005001001',
                sku: 'ACS-3PC',
                stock: 15,
                minStock: 3,
                supplier: 'Zen Candles Co.',
                description: '3-piece candle set with lavender, eucalyptus, and vanilla'
            },
            // Spa Packages
            {
                id: 'pack001',
                name: 'Relaxation Package (3 hours)',
                category: 'Spa Packages',
                price: 4500,
                cost: 1500,
                barcode: '3001001001',
                sku: 'RELAX-3H',
                stock: 999,
                minStock: 0,
                supplier: 'Internal Package',
                description: 'Swedish massage, facial, manicure & pedicure combo',
                duration: 180,
                serviceType: 'package'
            },
            {
                id: 'pack002',
                name: 'Couples Massage Package',
                category: 'Spa Packages',
                price: 3600,
                cost: 1200,
                barcode: '3001001002',
                sku: 'COUP-MAS',
                stock: 999,
                minStock: 0,
                supplier: 'Internal Package',
                description: 'Side-by-side Swedish massage for two people',
                duration: 60,
                serviceType: 'package'
            }
        ];

        for (const product of products) {
            product.createdAt = new Date().toISOString();
            product.updatedAt = new Date().toISOString();
            await window.db.add('products', product);
        }
        console.log('✅ Created', products.length, 'spa services and products');
    }

    async createInventory() {
        const inventoryMovements = [
            {
                id: 'inv001',
                productId: 'prod001',
                productName: 'Wireless Bluetooth Headphones',
                type: 'purchase',
                quantity: 100,
                date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                reference: 'PO-2024-001',
                notes: 'Initial stock purchase'
            },
            {
                id: 'inv002',
                productId: 'prod001',
                productName: 'Wireless Bluetooth Headphones',
                type: 'sale',
                quantity: -50,
                date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
                reference: 'Multiple sales',
                notes: 'Sales over past month'
            },
            {
                id: 'inv003',
                productId: 'prod005',
                productName: 'Organic Coffee Beans 1kg',
                type: 'purchase',
                quantity: 50,
                date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                reference: 'PO-2024-002',
                notes: 'Restock order'
            },
            {
                id: 'inv004',
                productId: 'prod005',
                productName: 'Organic Coffee Beans 1kg',
                type: 'sale',
                quantity: -20,
                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                reference: 'Sales',
                notes: 'Regular sales'
            },
            {
                id: 'inv005',
                productId: 'prod003',
                productName: 'Cotton T-Shirt (Large)',
                type: 'adjustment',
                quantity: -5,
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                reference: 'ADJ-001',
                notes: 'Damaged items written off'
            }
        ];

        for (const movement of inventoryMovements) {
            movement.createdAt = new Date().toISOString();
            await window.db.add('inventory', movement);
        }
        console.log('✅ Created', inventoryMovements.length, 'inventory movements');
    }

    async createTransactions() {
        const transactions = [];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // Spa services and products for transactions
        const spaServices = [
            { id: 'serv001', name: 'Swedish Massage (60 min)', price: 1800 },
            { id: 'serv002', name: 'Deep Tissue Massage (90 min)', price: 2500 },
            { id: 'serv003', name: 'Hot Stone Massage (75 min)', price: 2200 },
            { id: 'serv004', name: 'Classic Facial (60 min)', price: 1500 },
            { id: 'serv005', name: 'Anti-Aging Facial (90 min)', price: 2800 },
            { id: 'serv006', name: 'Manicure with Gel Polish', price: 800 },
            { id: 'serv007', name: 'Pedicure with Massage', price: 1000 },
            { id: 'pack001', name: 'Relaxation Package (3 hours)', price: 4500 },
            { id: 'pack002', name: 'Couples Massage Package', price: 3600 }
        ];

        const retailProducts = [
            { id: 'prod001', name: 'Organic Face Serum', price: 1200 },
            { id: 'prod002', name: 'Lavender Body Oil', price: 850 },
            { id: 'prod003', name: 'Himalayan Salt Scrub', price: 650 },
            { id: 'prod004', name: 'Bamboo Facial Brush', price: 450 },
            { id: 'prod005', name: 'Aromatherapy Candle Set', price: 1500 }
        ];

        const clientNames = [
            'Mrs. Elena Rodriguez', 'Ms. Sophia Chen', 'Mrs. Carmen Villanueva', 
            'Ms. Diana Torres', 'Mrs. Grace Lim', 'Ms. Amanda Santos',
            'Mrs. Rosario Garcia', 'Ms. Michelle Tan', 'Mrs. Jennifer Cruz',
            'Ms. Catherine Morales', 'Mrs. Patricia Dela Rosa', 'Ms. Stephanie Lee',
            'Mrs. Vanessa Reyes', 'Ms. Kristine Flores', 'Mrs. Nicole Pascual'
        ];

        const therapists = ['Anna Reyes', 'Carmen dela Cruz', 'Patricia Morales', 'Isabella Garcia'];

        // Generate 60 spa transactions over the past 30 days
        for (let i = 0; i < 60; i++) {
            const transactionDate = new Date(startDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
            const isServiceTransaction = Math.random() > 0.2; // 80% services, 20% retail
            const items = [];
            let total = 0;

            if (isServiceTransaction) {
                // Service transaction (1-2 services)
                const numServices = Math.random() > 0.7 ? 2 : 1;
                for (let j = 0; j < numServices; j++) {
                    const service = spaServices[Math.floor(Math.random() * spaServices.length)];
                    items.push({
                        productId: service.id,
                        productName: service.name,
                        price: service.price,
                        quantity: 1,
                        subtotal: service.price,
                        therapist: therapists[Math.floor(Math.random() * therapists.length)]
                    });
                    total += service.price;
                }
                
                // Sometimes add retail products
                if (Math.random() > 0.6) {
                    const product = retailProducts[Math.floor(Math.random() * retailProducts.length)];
                    items.push({
                        productId: product.id,
                        productName: product.name,
                        price: product.price,
                        quantity: 1,
                        subtotal: product.price
                    });
                    total += product.price;
                }
            } else {
                // Retail transaction (1-3 products)
                const numProducts = Math.floor(Math.random() * 3) + 1;
                for (let j = 0; j < numProducts; j++) {
                    const product = retailProducts[Math.floor(Math.random() * retailProducts.length)];
                    const quantity = Math.floor(Math.random() * 2) + 1;
                    const subtotal = product.price * quantity;
                    
                    items.push({
                        productId: product.id,
                        productName: product.name,
                        price: product.price,
                        quantity: quantity,
                        subtotal: subtotal
                    });
                    
                    total += subtotal;
                }
            }

            const paymentMethods = ['cash', 'credit_card', 'debit_card', 'gcash', 'maya'];
            const discount = Math.random() > 0.85 ? total * 0.15 : 0; // 15% senior/PWD discount occasionally

            transactions.push({
                id: `spa${String(i + 1).padStart(3, '0')}`,
                transactionNumber: `SPA-${String(i + 1).padStart(5, '0')}`,
                items: items,
                subtotal: total,
                tax: 0, // Spa services are typically VAT-exempt
                discount: discount,
                total: total - discount,
                paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                cashier: 'Sofia Mendoza',
                date: transactionDate.toISOString(),
                status: 'completed',
                customerName: clientNames[Math.floor(Math.random() * clientNames.length)],
                customerPhone: `0917${Math.floor(Math.random() * 9000000) + 1000000}`,
                transactionType: isServiceTransaction ? 'service' : 'retail',
                createdAt: transactionDate.toISOString()
            });
        }

        for (const transaction of transactions) {
            await window.db.add('transactions', transaction);
        }
        console.log('✅ Created', transactions.length, 'spa transactions');
    }

    async createExpenses() {
        const expenses = [
            {
                id: 'exp001',
                category: 'Utilities',
                amount: 18000,
                description: 'Electricity bill for spa operations - November',
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'bank_transfer',
                vendor: 'Meralco',
                receiptNumber: 'ELEC-2024-11-001',
                status: 'paid',
                createdBy: 'Maria Santos'
            },
            {
                id: 'exp002',
                category: 'Rent',
                amount: 65000,
                description: 'Monthly spa facility rent - December',
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'check',
                vendor: 'Wellness Plaza Properties',
                receiptNumber: 'RENT-SPA-2024-12',
                status: 'paid',
                createdBy: 'Maria Santos'
            },
            {
                id: 'exp003',
                category: 'Spa Supplies',
                amount: 12000,
                description: 'Massage oils, towels, and aromatherapy supplies',
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'credit_card',
                vendor: 'Spa Essentials Philippines',
                receiptNumber: 'SE-2024-1156',
                status: 'paid',
                createdBy: 'Carmen dela Cruz'
            },
            {
                id: 'exp004',
                category: 'Marketing',
                amount: 15000,
                description: 'Social media ads and wellness magazine placement',
                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'credit_card',
                vendor: 'Digital Marketing Plus',
                receiptNumber: 'DMP-2024-789',
                status: 'paid',
                createdBy: 'Maria Santos'
            },
            {
                id: 'exp005',
                category: 'Equipment Maintenance',
                amount: 8500,
                description: 'Massage table repair and equipment calibration',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'cash',
                vendor: 'Spa Equipment Services',
                receiptNumber: 'SES-2024-445',
                status: 'paid',
                createdBy: 'Anna Reyes'
            },
            {
                id: 'exp006',
                category: 'Professional Services',
                amount: 5000,
                description: 'Monthly accounting and bookkeeping services',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'bank_transfer',
                vendor: 'Cruz & Associates CPA',
                receiptNumber: 'CPA-2024-12',
                status: 'paid',
                createdBy: 'Maria Santos'
            },
            {
                id: 'exp007',
                category: 'Training & Certification',
                amount: 25000,
                description: 'Advanced massage therapy certification course',
                date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'credit_card',
                vendor: 'Philippine Wellness Institute',
                receiptNumber: 'PWI-2024-CERT-89',
                status: 'paid',
                createdBy: 'Maria Santos'
            },
            {
                id: 'exp008',
                category: 'Insurance',
                amount: 12500,
                description: 'Quarterly professional liability insurance',
                date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'check',
                vendor: 'Wellness Insurance Corp',
                receiptNumber: 'WIC-Q4-2024',
                status: 'paid',
                createdBy: 'Maria Santos'
            },
            {
                id: 'exp009',
                category: 'Laundry Services',
                amount: 4500,
                description: 'Professional laundering of towels and linens',
                date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'gcash',
                vendor: 'Premium Spa Laundry',
                receiptNumber: 'PSL-2024-NOV',
                status: 'paid',
                createdBy: 'Sofia Mendoza'
            }
        ];

        for (const expense of expenses) {
            expense.createdAt = new Date().toISOString();
            await window.db.add('expenses', expense);
        }
        console.log('✅ Created', expenses.length, 'spa expenses');
    }

    async createRooms() {
        const treatmentRooms = [
            {
                id: 'room001',
                roomNumber: 'TR-01',
                type: 'Massage Room',
                capacity: 1,
                price: 0, // Room fee included in service
                status: 'occupied',
                floor: 1,
                amenities: ['Massage Table', 'Essential Oil Diffuser', 'Soft Lighting', 'Sound System', 'Hot Towel Warmer'],
                currentClient: 'Mrs. Elena Rodriguez',
                therapist: 'Anna Reyes',
                serviceInProgress: 'Deep Tissue Massage (90 min)',
                sessionStart: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
                sessionEnd: new Date(Date.now() + 0.5 * 60 * 60 * 1000).toISOString(), // 30 min from now
                temperature: 24
            },
            {
                id: 'room002',
                roomNumber: 'TR-02',
                type: 'Massage Room',
                capacity: 1,
                price: 0,
                status: 'available',
                floor: 1,
                amenities: ['Massage Table', 'Essential Oil Diffuser', 'Soft Lighting', 'Sound System', 'Hot Towel Warmer'],
                lastCleaned: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(),
                temperature: 24
            },
            {
                id: 'room003',
                roomNumber: 'FC-01',
                type: 'Facial Room',
                capacity: 1,
                price: 0,
                status: 'occupied',
                floor: 1,
                amenities: ['Facial Bed', 'Steamer', 'LED Light Therapy', 'UV Sterilizer', 'Magnifying Lamp'],
                currentClient: 'Ms. Sophia Chen',
                therapist: 'Carmen dela Cruz',
                serviceInProgress: 'Anti-Aging Facial (90 min)',
                sessionStart: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString(), // 30 min ago
                sessionEnd: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
                temperature: 22
            },
            {
                id: 'room004',
                roomNumber: 'NC-01',
                type: 'Nail Care Room',
                capacity: 1,
                price: 0,
                status: 'available',
                floor: 1,
                amenities: ['Manicure Station', 'Pedicure Chair', 'UV Nail Lamp', 'Foot Spa', 'Nail Art Tools'],
                lastCleaned: new Date(Date.now() - 0.25 * 60 * 60 * 1000).toISOString(),
                temperature: 23
            },
            {
                id: 'room005',
                roomNumber: 'CR-01',
                type: 'Couples Room',
                capacity: 2,
                price: 0,
                status: 'reserved',
                floor: 2,
                amenities: ['2 Massage Tables', '2 Essential Oil Diffusers', 'Ambient Lighting', 'Premium Sound System', 'Hot Stone Heater', 'Private Shower'],
                reservedBy: 'Mr. & Mrs. Chen',
                therapist: 'Anna Reyes & Patricia Morales',
                serviceScheduled: 'Couples Massage Package',
                reservationStart: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
                reservationEnd: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
                temperature: 25
            },
            {
                id: 'room006',
                roomNumber: 'TR-03',
                type: 'Premium Massage Room',
                capacity: 1,
                price: 0,
                status: 'maintenance',
                floor: 2,
                amenities: ['Premium Massage Table', 'Hot Stone Heater', 'Aromatherapy System', 'Private Shower', 'Relaxation Chair'],
                maintenanceNotes: 'Hot stone heater calibration and deep cleaning',
                maintenanceScheduled: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
                temperature: 0
            },
            {
                id: 'room007',
                roomNumber: 'REL-01',
                type: 'Relaxation Lounge',
                capacity: 6,
                price: 0,
                status: 'available',
                floor: 1,
                amenities: ['Comfortable Seating', 'Herbal Tea Station', 'Soft Music', 'Reading Materials', 'Water Feature'],
                lastCleaned: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                temperature: 23,
                currentOccupancy: 0
            }
        ];

        for (const room of treatmentRooms) {
            room.createdAt = new Date().toISOString();
            await window.db.add('rooms', room);
        }
        console.log('✅ Created', treatmentRooms.length, 'spa treatment rooms');
    }

    async createGiftCertificates() {
        const certificates = [
            {
                id: 'gc001',
                code: 'SPA-RELAX-001',
                amount: 3000,
                balance: 3000,
                status: 'active',
                issuedTo: 'Mrs. Carmen Villanueva',
                issuedBy: 'Sofia Mendoza',
                issuedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                expiryDate: new Date(Date.now() + 355 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Mother\'s Day gift from daughter',
                purchasedBy: 'Ms. Stephanie Villanueva',
                packageType: 'Swedish Massage + Facial Package'
            },
            {
                id: 'gc002',
                code: 'SPA-WELLNESS-002',
                amount: 2000,
                balance: 1200,
                status: 'active',
                issuedTo: 'Ms. Grace Lim',
                issuedBy: 'Sofia Mendoza',
                issuedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                expiryDate: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Birthday gift certificate',
                usageHistory: [
                    {
                        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                        amount: 800,
                        transaction: 'SPA-00045',
                        service: 'Manicure with Gel Polish'
                    }
                ]
            },
            {
                id: 'gc003',
                code: 'SPA-COUPLES-003',
                amount: 4500,
                balance: 0,
                status: 'redeemed',
                issuedTo: 'Mr. & Mrs. Chen',
                issuedBy: 'Maria Santos',
                issuedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
                redeemedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Wedding anniversary gift',
                packageType: 'Relaxation Package (3 hours)',
                usageHistory: [
                    {
                        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                        amount: 4500,
                        transaction: 'SPA-00048',
                        service: 'Relaxation Package (3 hours)'
                    }
                ]
            },
            {
                id: 'gc004',
                code: 'SPA-PREMIUM-004',
                amount: 5000,
                balance: 5000,
                status: 'active',
                issuedTo: 'Ms. Amanda Santos',
                issuedBy: 'Sofia Mendoza',
                issuedDate: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Corporate wellness program gift',
                purchasedBy: 'Santos & Associates Law Firm',
                packageType: 'Premium Spa Package'
            },
            {
                id: 'gc005',
                code: 'SPA-BEAUTY-005',
                amount: 2800,
                balance: 1300,
                status: 'active',
                issuedTo: 'Ms. Diana Torres',
                issuedBy: 'Sofia Mendoza',
                issuedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
                expiryDate: new Date(Date.now() + 345 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Graduation gift',
                usageHistory: [
                    {
                        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                        amount: 1500,
                        transaction: 'SPA-00052',
                        service: 'Classic Facial (60 min)'
                    }
                ]
            },
            {
                id: 'gc006',
                code: 'SPA-HOLIDAY-006',
                amount: 1800,
                balance: 1800,
                status: 'active',
                issuedTo: 'Mrs. Jennifer Cruz',
                issuedBy: 'Maria Santos',
                issuedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                expiryDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Christmas bonus gift certificate',
                purchasedBy: 'Husband - Mr. Roberto Cruz',
                packageType: 'Swedish Massage (60 min)'
            }
        ];

        for (const cert of certificates) {
            cert.createdAt = new Date().toISOString();
            await window.db.add('giftCertificates', cert);
        }
        console.log('✅ Created', certificates.length, 'spa gift certificates');
    }

    async createAttendanceData() {
        const employees = ['emp001', 'emp002', 'emp003', 'emp004', 'emp005', 'emp006'];
        const employeeNames = ['Maria Santos', 'Anna Reyes', 'Carmen dela Cruz', 'Isabella Garcia', 'Sofia Mendoza', 'Patricia Morales'];
        const attendance = [];
        
        // Generate 30 days of attendance
        for (let d = 30; d >= 0; d--) {
            const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            
            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;
            
            for (let i = 0; i < employees.length; i++) {
                // Random chance of absence (10%)
                if (Math.random() > 0.9) continue;
                
                const checkInHour = 8 + Math.random() * 1.5; // 8:00 - 9:30
                const isLate = checkInHour > 9;
                const checkOutHour = 17 + Math.random() * 2; // 5:00 - 7:00 PM
                
                attendance.push({
                    id: `att${dateStr}-${employees[i]}`,
                    employeeId: employees[i],
                    employeeName: employeeNames[i],
                    date: dateStr,
                    checkInTime: `${Math.floor(checkInHour).toString().padStart(2, '0')}:${Math.floor((checkInHour % 1) * 60).toString().padStart(2, '0')}`,
                    checkOutTime: `${Math.floor(checkOutHour).toString().padStart(2, '0')}:${Math.floor((checkOutHour % 1) * 60).toString().padStart(2, '0')}`,
                    hoursWorked: checkOutHour - checkInHour,
                    isLate: isLate,
                    lateMinutes: isLate ? Math.floor((checkInHour - 9) * 60) : 0,
                    overtimeHours: checkOutHour > 17 ? checkOutHour - 17 : 0,
                    status: 'present',
                    createdAt: date.toISOString()
                });
            }
        }

        for (const record of attendance) {
            await window.db.add('attendance', record);
        }
        console.log('✅ Created', attendance.length, 'attendance records');
    }

    async createPayrollData() {
        const payrollRecords = [
            {
                id: 'pay001',
                employeeId: 'emp001',
                employeeName: 'John Doe',
                periodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                periodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                basePay: 17500,
                overtime: 2500,
                nightDifferential: 500,
                holidayPay: 0,
                allowances: 2000,
                deductions: 1000,
                sss: 1350,
                philHealth: 437.50,
                pagIbig: 100,
                tax: 2000,
                grossPay: 22500,
                totalDeductions: 4887.50,
                netPay: 17612.50,
                status: 'paid',
                paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'pay002',
                employeeId: 'emp002',
                employeeName: 'Jane Smith',
                periodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                periodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                basePay: 12500,
                overtime: 1500,
                nightDifferential: 0,
                holidayPay: 0,
                allowances: 1000,
                deductions: 500,
                sss: 1125,
                philHealth: 312.50,
                pagIbig: 100,
                tax: 1000,
                grossPay: 15000,
                totalDeductions: 3037.50,
                netPay: 11962.50,
                status: 'paid',
                paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'pay003',
                employeeId: 'emp003',
                employeeName: 'Mike Johnson',
                periodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                periodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                basePay: 14000,
                overtime: 2000,
                nightDifferential: 300,
                holidayPay: 0,
                allowances: 1500,
                deductions: 800,
                sss: 1200,
                philHealth: 350,
                pagIbig: 100,
                tax: 1500,
                grossPay: 17800,
                totalDeductions: 3950,
                netPay: 13850,
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'pay004',
                employeeId: 'emp004',
                employeeName: 'Sarah Wilson',
                periodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                periodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                basePay: 10000,
                overtime: 800,
                nightDifferential: 0,
                holidayPay: 0,
                allowances: 500,
                deductions: 300,
                sss: 900,
                philHealth: 250,
                pagIbig: 100,
                tax: 500,
                grossPay: 11300,
                totalDeductions: 2050,
                netPay: 9250,
                status: 'pending',
                createdAt: new Date().toISOString()
            }
        ];

        for (const record of payrollRecords) {
            await window.db.add('payroll', record);
        }
        console.log('✅ Created', payrollRecords.length, 'payroll records');
    }

    async createEmployeeRequests() {
        const requests = [
            {
                id: 'req001',
                requestType: 'leave',
                employeeId: 'emp002',
                employeeName: 'Anna Reyes',
                requestDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Attend advanced massage therapy seminar in Cebu',
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'req002',
                requestType: 'overtime',
                employeeId: 'emp003',
                employeeName: 'Carmen dela Cruz',
                requestDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                hours: 3,
                reason: 'VIP client requested late evening facial appointment',
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'req003',
                requestType: 'leave',
                employeeId: 'emp004',
                employeeName: 'Isabella Garcia',
                requestDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Nail technician certification renewal appointment',
                status: 'pending',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'req004',
                requestType: 'overtime',
                employeeId: 'emp001',
                employeeName: 'Maria Santos',
                requestDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                hours: 4,
                reason: 'Monthly spa performance reports and staff scheduling',
                status: 'approved',
                approvedDate: new Date().toISOString(),
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'req005',
                requestType: 'leave',
                employeeId: 'emp005',
                employeeName: 'Sofia Mendoza',
                requestDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Sister\'s wedding - maid of honor duties',
                status: 'pending',
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'req006',
                requestType: 'overtime',
                employeeId: 'emp006',
                employeeName: 'Patricia Morales',
                requestDate: new Date().toISOString().split('T')[0],
                hours: 2,
                reason: 'Cover for Anna during her client\'s extended session',
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'req007',
                requestType: 'leave',
                employeeId: 'emp002',
                employeeName: 'Anna Reyes',
                requestDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Mother\'s medical procedure support',
                status: 'approved',
                approvedDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'req008',
                requestType: 'leave',
                employeeId: 'emp003',
                employeeName: 'Carmen dela Cruz',
                requestDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Dermatology conference - continuing education',
                status: 'pending',
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];

        for (const request of requests) {
            await window.db.add('employeeRequests', request);
        }
        console.log('✅ Created', requests.length, 'spa employee requests');
    }

    async createHolidays() {
        const currentYear = new Date().getFullYear();
        const holidays = [
            {
                id: 'hol001',
                name: "New Year's Day",
                date: `${currentYear}-01-01`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol002',
                name: 'Chinese New Year',
                date: `${currentYear}-02-10`,
                type: 'special',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol003',
                name: 'Araw ng Kagitingan',
                date: `${currentYear}-04-09`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol004',
                name: 'Maundy Thursday',
                date: `${currentYear}-03-28`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol005',
                name: 'Good Friday',
                date: `${currentYear}-03-29`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol006',
                name: 'Labor Day',
                date: `${currentYear}-05-01`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol007',
                name: 'Independence Day',
                date: `${currentYear}-06-12`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol008',
                name: 'National Heroes Day',
                date: `${currentYear}-08-26`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol009',
                name: 'Bonifacio Day',
                date: `${currentYear}-11-30`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol010',
                name: 'Christmas Day',
                date: `${currentYear}-12-25`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            },
            {
                id: 'hol011',
                name: 'Rizal Day',
                date: `${currentYear}-12-30`,
                type: 'regular',
                year: currentYear,
                createdAt: new Date().toISOString()
            }
        ];

        for (const holiday of holidays) {
            await window.db.add('holidays', holiday);
        }
        console.log('✅ Created', holidays.length, 'holidays');
    }
}

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', async () => {
    const initializer = new SampleDataInitializer();
    
    // Only run for pok@gmail.com
    if (initializer.currentUser.email === 'pok@gmail.com') {
        await initializer.initializeAllSampleData();
        
        // Refresh the page to load new data
        if (localStorage.getItem('sampleDataInitialized') === 'v3' && !localStorage.getItem('sampleDataRefreshed')) {
            localStorage.setItem('sampleDataRefreshed', 'true');
            window.location.reload();
        }
    }
});

export default SampleDataInitializer;