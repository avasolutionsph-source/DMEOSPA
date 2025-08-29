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
        if (initialized === 'v2') {
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
        localStorage.setItem('sampleDataInitialized', 'v2');
        console.log('✅ All sample data initialized successfully!');
    }

    async createEmployees() {
        const employees = [
            {
                id: 'emp001',
                name: 'John Doe',
                position: 'Store Manager',
                email: 'john.doe@avasolutions.ph',
                phone: '09171234567',
                department: 'Management',
                salary: 35000,
                dailyRate: 1500,
                employmentDate: '2023-01-15',
                status: 'active',
                photo: null
            },
            {
                id: 'emp002',
                name: 'Jane Smith',
                position: 'Senior Cashier',
                email: 'jane.smith@avasolutions.ph',
                phone: '09181234567',
                department: 'Sales',
                salary: 25000,
                dailyRate: 1000,
                employmentDate: '2023-03-20',
                status: 'active',
                photo: null
            },
            {
                id: 'emp003',
                name: 'Mike Johnson',
                position: 'Inventory Manager',
                email: 'mike.j@avasolutions.ph',
                phone: '09191234567',
                department: 'Inventory',
                salary: 28000,
                dailyRate: 1200,
                employmentDate: '2023-02-10',
                status: 'active',
                photo: null
            },
            {
                id: 'emp004',
                name: 'Sarah Wilson',
                position: 'Cashier',
                email: 'sarah.w@avasolutions.ph',
                phone: '09201234567',
                department: 'Sales',
                salary: 20000,
                dailyRate: 800,
                employmentDate: '2023-06-01',
                status: 'active',
                photo: null
            },
            {
                id: 'emp005',
                name: 'Robert Brown',
                position: 'Stock Clerk',
                email: 'robert.b@avasolutions.ph',
                phone: '09211234567',
                department: 'Inventory',
                salary: 18000,
                dailyRate: 750,
                employmentDate: '2023-07-15',
                status: 'active',
                photo: null
            }
        ];

        for (const employee of employees) {
            await window.db.add('employees', employee);
        }
        console.log('✅ Created', employees.length, 'employees');
    }

    async createProducts() {
        const products = [
            // Electronics
            {
                id: 'prod001',
                name: 'Wireless Bluetooth Headphones',
                category: 'Electronics',
                price: 2500,
                cost: 1500,
                barcode: '1234567890123',
                sku: 'WBH-001',
                stock: 50,
                minStock: 10,
                supplier: 'TechSupplier Inc.',
                description: 'High-quality wireless headphones with noise cancellation'
            },
            {
                id: 'prod002',
                name: 'USB-C Fast Charger',
                category: 'Electronics',
                price: 800,
                cost: 400,
                barcode: '1234567890124',
                sku: 'USC-001',
                stock: 100,
                minStock: 20,
                supplier: 'TechSupplier Inc.',
                description: '65W fast charging adapter'
            },
            // Clothing
            {
                id: 'prod003',
                name: 'Cotton T-Shirt (Large)',
                category: 'Clothing',
                price: 500,
                cost: 250,
                barcode: '2234567890123',
                sku: 'CTS-L01',
                stock: 75,
                minStock: 15,
                supplier: 'Fashion Wholesale Co.',
                description: '100% cotton comfortable t-shirt'
            },
            {
                id: 'prod004',
                name: 'Denim Jeans (32)',
                category: 'Clothing',
                price: 1500,
                cost: 800,
                barcode: '2234567890124',
                sku: 'DNJ-32',
                stock: 40,
                minStock: 10,
                supplier: 'Fashion Wholesale Co.',
                description: 'Classic fit denim jeans'
            },
            // Food & Beverages
            {
                id: 'prod005',
                name: 'Organic Coffee Beans 1kg',
                category: 'Food & Beverages',
                price: 650,
                cost: 400,
                barcode: '3234567890123',
                sku: 'OCB-1KG',
                stock: 30,
                minStock: 10,
                supplier: 'Coffee Importers Ltd.',
                description: 'Premium arabica coffee beans'
            },
            {
                id: 'prod006',
                name: 'Mineral Water 500ml',
                category: 'Food & Beverages',
                price: 25,
                cost: 10,
                barcode: '3234567890124',
                sku: 'MW-500',
                stock: 200,
                minStock: 50,
                supplier: 'Beverage Distributors',
                description: 'Natural mineral water'
            },
            // Home & Living
            {
                id: 'prod007',
                name: 'LED Desk Lamp',
                category: 'Home & Living',
                price: 1200,
                cost: 600,
                barcode: '4234567890123',
                sku: 'LED-DL1',
                stock: 25,
                minStock: 5,
                supplier: 'Home Essentials Inc.',
                description: 'Adjustable LED desk lamp with USB charging'
            },
            {
                id: 'prod008',
                name: 'Throw Pillow Set (2pcs)',
                category: 'Home & Living',
                price: 800,
                cost: 400,
                barcode: '4234567890124',
                sku: 'TP-SET2',
                stock: 35,
                minStock: 10,
                supplier: 'Home Essentials Inc.',
                description: 'Decorative throw pillows'
            },
            // Beauty & Personal Care
            {
                id: 'prod009',
                name: 'Organic Face Moisturizer',
                category: 'Beauty',
                price: 450,
                cost: 250,
                barcode: '5234567890123',
                sku: 'OFM-50ML',
                stock: 60,
                minStock: 15,
                supplier: 'Beauty Products Co.',
                description: 'Natural organic moisturizer 50ml'
            },
            {
                id: 'prod010',
                name: 'Shampoo & Conditioner Set',
                category: 'Beauty',
                price: 350,
                cost: 180,
                barcode: '5234567890124',
                sku: 'SCS-500',
                stock: 80,
                minStock: 20,
                supplier: 'Beauty Products Co.',
                description: 'Professional hair care set'
            }
        ];

        for (const product of products) {
            product.createdAt = new Date().toISOString();
            product.updatedAt = new Date().toISOString();
            await window.db.add('products', product);
        }
        console.log('✅ Created', products.length, 'products');
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
        
        // Generate 50 sample transactions over the past 30 days
        for (let i = 0; i < 50; i++) {
            const transactionDate = new Date(startDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
            const numItems = Math.floor(Math.random() * 4) + 1;
            const items = [];
            let total = 0;

            // Random products for each transaction
            const productSamples = [
                { id: 'prod001', name: 'Wireless Bluetooth Headphones', price: 2500 },
                { id: 'prod002', name: 'USB-C Fast Charger', price: 800 },
                { id: 'prod003', name: 'Cotton T-Shirt (Large)', price: 500 },
                { id: 'prod005', name: 'Organic Coffee Beans 1kg', price: 650 },
                { id: 'prod006', name: 'Mineral Water 500ml', price: 25 },
                { id: 'prod009', name: 'Organic Face Moisturizer', price: 450 }
            ];

            for (let j = 0; j < numItems; j++) {
                const product = productSamples[Math.floor(Math.random() * productSamples.length)];
                const quantity = Math.floor(Math.random() * 3) + 1;
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

            const paymentMethods = ['cash', 'credit_card', 'debit_card', 'gcash', 'maya'];
            const cashiers = ['Jane Smith', 'Sarah Wilson'];

            transactions.push({
                id: `trans${String(i + 1).padStart(3, '0')}`,
                transactionNumber: `TRN-2024-${String(i + 1).padStart(5, '0')}`,
                items: items,
                subtotal: total,
                tax: total * 0.12,
                discount: Math.random() > 0.7 ? total * 0.1 : 0,
                total: total * 1.12 * (Math.random() > 0.7 ? 0.9 : 1),
                paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                cashier: cashiers[Math.floor(Math.random() * cashiers.length)],
                date: transactionDate.toISOString(),
                status: 'completed',
                customerName: Math.random() > 0.5 ? `Customer ${i + 1}` : null,
                createdAt: transactionDate.toISOString()
            });
        }

        for (const transaction of transactions) {
            await window.db.add('transactions', transaction);
        }
        console.log('✅ Created', transactions.length, 'transactions');
    }

    async createExpenses() {
        const expenses = [
            {
                id: 'exp001',
                category: 'Utilities',
                amount: 15000,
                description: 'Electricity bill for November',
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'bank_transfer',
                vendor: 'Meralco',
                receiptNumber: 'ELEC-2024-11-001',
                status: 'paid',
                createdBy: 'John Doe'
            },
            {
                id: 'exp002',
                category: 'Rent',
                amount: 50000,
                description: 'Monthly store rent',
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'check',
                vendor: 'ABC Properties',
                receiptNumber: 'RENT-2024-12',
                status: 'paid',
                createdBy: 'John Doe'
            },
            {
                id: 'exp003',
                category: 'Supplies',
                amount: 3500,
                description: 'Office supplies and cleaning materials',
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'cash',
                vendor: 'National Bookstore',
                receiptNumber: 'NBS-12345',
                status: 'paid',
                createdBy: 'Mike Johnson'
            },
            {
                id: 'exp004',
                category: 'Marketing',
                amount: 8000,
                description: 'Facebook and Google ads',
                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'credit_card',
                vendor: 'Meta Ads',
                receiptNumber: 'FB-ADS-2024-11',
                status: 'paid',
                createdBy: 'John Doe'
            },
            {
                id: 'exp005',
                category: 'Maintenance',
                amount: 5000,
                description: 'AC cleaning and maintenance',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'cash',
                vendor: 'CoolTech Services',
                receiptNumber: 'CT-2024-156',
                status: 'paid',
                createdBy: 'Mike Johnson'
            },
            {
                id: 'exp006',
                category: 'Transportation',
                amount: 2500,
                description: 'Delivery and logistics',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                paymentMethod: 'gcash',
                vendor: 'Lalamove',
                receiptNumber: 'LLM-789456',
                status: 'paid',
                createdBy: 'Sarah Wilson'
            }
        ];

        for (const expense of expenses) {
            expense.createdAt = new Date().toISOString();
            await window.db.add('expenses', expense);
        }
        console.log('✅ Created', expenses.length, 'expenses');
    }

    async createRooms() {
        const rooms = [
            {
                id: 'room001',
                roomNumber: '101',
                type: 'Standard',
                capacity: 2,
                price: 2500,
                status: 'occupied',
                floor: 1,
                amenities: ['WiFi', 'AC', 'TV', 'Mini Bar'],
                currentGuest: 'Mr. Antonio Cruz',
                checkInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                checkOutDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'room002',
                roomNumber: '102',
                type: 'Standard',
                capacity: 2,
                price: 2500,
                status: 'available',
                floor: 1,
                amenities: ['WiFi', 'AC', 'TV'],
                lastCleaned: new Date().toISOString()
            },
            {
                id: 'room003',
                roomNumber: '201',
                type: 'Deluxe',
                capacity: 3,
                price: 3500,
                status: 'occupied',
                floor: 2,
                amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub'],
                currentGuest: 'Ms. Maria Santos',
                checkInDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'room004',
                roomNumber: '202',
                type: 'Deluxe',
                capacity: 3,
                price: 3500,
                status: 'maintenance',
                floor: 2,
                amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub'],
                maintenanceNotes: 'AC repair in progress'
            },
            {
                id: 'room005',
                roomNumber: '301',
                type: 'Suite',
                capacity: 4,
                price: 5000,
                status: 'reserved',
                floor: 3,
                amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Bathtub', 'Kitchen', 'Living Room'],
                reservedBy: 'Mr. John Smith',
                reservationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];

        for (const room of rooms) {
            room.createdAt = new Date().toISOString();
            await window.db.add('rooms', room);
        }
        console.log('✅ Created', rooms.length, 'rooms');
    }

    async createGiftCertificates() {
        const certificates = [
            {
                id: 'gc001',
                code: 'GIFT-2024-001',
                amount: 1000,
                balance: 1000,
                status: 'active',
                issuedTo: 'Maria Garcia',
                issuedBy: 'John Doe',
                issuedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                expiryDate: new Date(Date.now() + 355 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Birthday gift'
            },
            {
                id: 'gc002',
                code: 'GIFT-2024-002',
                amount: 500,
                balance: 250,
                status: 'active',
                issuedTo: 'Robert Lee',
                issuedBy: 'Jane Smith',
                issuedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                expiryDate: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000).toISOString(),
                usageHistory: [
                    {
                        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                        amount: 250,
                        transaction: 'TRN-2024-00045'
                    }
                ]
            },
            {
                id: 'gc003',
                code: 'GIFT-2024-003',
                amount: 2000,
                balance: 0,
                status: 'redeemed',
                issuedTo: 'Anna Martinez',
                issuedBy: 'John Doe',
                issuedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
                redeemedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                usageHistory: [
                    {
                        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                        amount: 2000,
                        transaction: 'TRN-2024-00048'
                    }
                ]
            },
            {
                id: 'gc004',
                code: 'GIFT-2024-004',
                amount: 1500,
                balance: 1500,
                status: 'active',
                issuedTo: 'James Chen',
                issuedBy: 'Sarah Wilson',
                issuedDate: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Anniversary promotion'
            }
        ];

        for (const cert of certificates) {
            cert.createdAt = new Date().toISOString();
            await window.db.add('giftCertificates', cert);
        }
        console.log('✅ Created', certificates.length, 'gift certificates');
    }

    async createAttendanceData() {
        const employees = ['emp001', 'emp002', 'emp003', 'emp004', 'emp005'];
        const employeeNames = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Robert Brown'];
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
                employeeName: 'Jane Smith',
                requestDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Family vacation to Boracay',
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'req002',
                requestType: 'overtime',
                employeeId: 'emp003',
                employeeName: 'Mike Johnson',
                requestDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                hours: 4,
                reason: 'Year-end inventory count',
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'req003',
                requestType: 'leave',
                employeeId: 'emp004',
                employeeName: 'Sarah Wilson',
                requestDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Medical appointment',
                status: 'pending',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'req004',
                requestType: 'overtime',
                employeeId: 'emp001',
                employeeName: 'John Doe',
                requestDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                hours: 3,
                reason: 'Monthly report preparation',
                status: 'approved',
                approvedDate: new Date().toISOString(),
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'req005',
                requestType: 'leave',
                employeeId: 'emp005',
                employeeName: 'Robert Brown',
                requestDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Wedding anniversary trip',
                status: 'pending',
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'req006',
                requestType: 'overtime',
                employeeId: 'emp002',
                employeeName: 'Jane Smith',
                requestDate: new Date().toISOString().split('T')[0],
                hours: 2,
                reason: 'Customer rush hour support',
                status: 'pending',
                createdAt: new Date().toISOString()
            },
            {
                id: 'req007',
                requestType: 'leave',
                employeeId: 'emp001',
                employeeName: 'John Doe',
                requestDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reason: 'Personal emergency',
                status: 'approved',
                approvedDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];

        for (const request of requests) {
            await window.db.add('employeeRequests', request);
        }
        console.log('✅ Created', requests.length, 'employee requests');
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
        if (localStorage.getItem('sampleDataInitialized') === 'v2' && !localStorage.getItem('sampleDataRefreshed')) {
            localStorage.setItem('sampleDataRefreshed', 'true');
            window.location.reload();
        }
    }
});

export default SampleDataInitializer;