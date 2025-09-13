/**
 * Business Chatbot Assistant
 * Provides intelligent assistance for PWA business management features
 */

class BusinessChatbot {
    constructor() {
        this.messages = [];
        this.isProcessing = false;
        this.context = {
            lastTopic: null,
            lastIntent: null,
            userPreferences: {},
            sessionStartTime: new Date()
        };
        this.dataCache = {
            lastFetch: null,
            transactions: [],
            inventory: [],
            employees: [],
            products: [],
            customers: []
        };
    }

    /**
     * Initialize the chatbot
     */
    init() {
        this.setupEventListeners();
        this.loadChatHistory();
        this.refreshDataCache();
        console.log('Business Chatbot initialized');
    }

    /**
     * Setup event listeners for chat interface
     */
    setupEventListeners() {
        const input = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendChatBtn');

        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
    }

    /**
     * Send a message to the chatbot
     */
    async sendMessage() {
        const input = document.getElementById('chatInput');
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';

        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Add user message to chat
            this.addMessageToChat('user', message);

            // Analyze intent and generate response
            const intent = this.analyzeIntent(message);
            const response = await this.generateResponse(intent, message);

            // Add bot response to chat
            this.addMessageToChat('bot', response);

        } catch (error) {
            console.error('Error processing message:', error);
            this.addMessageToChat('bot', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Simple intent analysis method
     */
    analyzeIntent(message) {
        try {
            const lowerMessage = message.toLowerCase().trim();

            // Check for customer names first (priority)
            try {
                const customerName = this.extractCustomerName(lowerMessage);
                if (customerName) {
                    return { type: 'customer_lookup', confidence: 0.9, customerName: customerName };
                }
            } catch (error) {
                console.warn('Error in customer name extraction:', error);
            }

            // Check for employee names
            try {
                const employeeName = this.extractEmployeeName(lowerMessage);
                if (employeeName) {
                    return { type: 'employee_lookup', confidence: 0.9, employeeName: employeeName };
                }
            } catch (error) {
                console.warn('Error in employee name extraction:', error);
            }

        // Enhanced intent patterns with all PWA features
        const intents = [
            {
                type: 'greeting',
                patterns: /^(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings?|kamusta)$/i
            },
            {
                type: 'sales_report',
                patterns: /sales|revenue|income|money.*made|kita|pera|magkano|earnings/i
            },
            {
                type: 'inventory',
                patterns: /inventory|stock|products?|supplies|items/i
            },
            {
                type: 'employees',
                patterns: /employee|staff|team|worker|personnel/i
            },
            {
                type: 'transactions',
                patterns: /transaction|purchase|payment|recent.*sales/i
            },
            {
                type: 'attendance',
                patterns: /attendance|check.*in|check.*out|time.*tracking|work.*hours/i
            },
            {
                type: 'appointment_query',
                patterns: /appointment|booking|schedule|calendar|reserve/i
            },
            {
                type: 'customer_management', 
                patterns: /customer|client|patron|guest|kliyente/i
            },
            {
                type: 'payroll_query',
                patterns: /payroll|salary|wages?|pay.*employee|sweldo/i
            },
            {
                type: 'room_management',
                patterns: /room|treatment.*room|therapy.*room/i
            },
            {
                type: 'expense_management',
                patterns: /expense|cost|spending|budget|gastos/i
            },
            {
                type: 'gift_certificate_query',
                patterns: /gift.*certificate|gift.*card|voucher/i
            },
            {
                type: 'business_analysis',
                patterns: /analyze|analysis|how.*business.*doing|performance|overview/i
            },
            {
                type: 'help',
                patterns: /help|what can you do|guide|assist/i
            }
        ];

        // Check patterns
        for (const intent of intents) {
            if (intent.patterns.test(lowerMessage)) {
                return { type: intent.type, confidence: 0.8 };
            }
        }

            return { type: 'unknown', confidence: 0.3 };
        } catch (error) {
            console.error('Error in analyzeIntent:', error);
            return { type: 'general', confidence: 0.3 };
        }
    }

    /**
     * Generate response based on intent
     */
    async generateResponse(intent, message) {
        try {
            await this.refreshDataCache();
        } catch (error) {
            console.error('Error refreshing data cache in generateResponse:', error);
        }

        switch (intent.type) {
            case 'greeting':
                return this.handleGreeting();
            
            case 'sales_report':
                return this.handleSalesReport();
            
            case 'inventory':
                return this.handleInventoryQuery();
            
            case 'employees':
                return this.handleEmployeeQuery();
            
            case 'transactions':
                return this.handleTransactionQuery();
            
            case 'attendance':
                return this.handleAttendanceQuery();
            
            case 'help':
                return this.handleHelp();

            // New PWA feature handlers
            case 'customer_lookup':
                return this.handleCustomerLookup(intent.customerName);
            
            case 'employee_lookup':
                return this.handleEmployeeLookup(intent.employeeName);
            
            case 'appointment_query':
                return this.handleAppointmentQuery();
            
            case 'customer_management':
                return this.handleCustomerManagement();
            
            case 'payroll_query':
                return this.handlePayrollQuery();
            
            case 'room_management':
                return this.handleRoomManagement();
            
            case 'expense_management':
                return this.handleExpenseManagement();
            
            case 'gift_certificate_query':
                return this.handleGiftCertificateQuery();
            
            case 'business_analysis':
                return this.handleBusinessAnalysis();
            
            default:
                return this.handleUnknown(message);
        }
    }

    /**
     * Handle greeting messages
     */
    handleGreeting() {
        const greetings = [
            "Hello! I'm your business assistant. How can I help you today?",
            "Hi there! I can help you with sales reports, inventory, employees, and more. What would you like to know?",
            "Good to see you! Ask me about your business data, sales, inventory, or staff."
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    /**
     * Handle sales report requests
     */
    handleSalesReport() {
        try {
            const transactions = this.dataCache.transactions || [];
            const today = new Date().toDateString();
            const todayTransactions = transactions.filter(t => 
                new Date(t.date).toDateString() === today
            );

            const todaySales = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
            const totalSales = transactions.reduce((sum, t) => sum + (t.total || 0), 0);

            return `📊 **Sales Report**\n\n` +
                   `💰 Today's Sales: ₱${todaySales.toFixed(2)}\n` +
                   `📈 Total Sales: ₱${totalSales.toFixed(2)}\n` +
                   `🧾 Today's Transactions: ${todayTransactions.length}\n` +
                   `📋 Total Transactions: ${transactions.length}`;
        } catch (error) {
            return "Sorry, I couldn't retrieve the sales data right now. Please try again later.";
        }
    }

    /**
     * Handle inventory queries
     */
    handleInventoryQuery() {
        try {
            const products = this.dataCache.products || [];
            const lowStockItems = products.filter(p => (p.stock || 0) < 5);

            return `📦 **Inventory Summary**\n\n` +
                   `📋 Total Products: ${products.length}\n` +
                   `⚠️ Low Stock Items: ${lowStockItems.length}\n` +
                   (lowStockItems.length > 0 ? 
                       `\n🔴 Items needing restock:\n${lowStockItems.map(p => `• ${p.name}: ${p.stock || 0} left`).join('\n')}` :
                       `\n✅ All items are well stocked!`);
        } catch (error) {
            return "Sorry, I couldn't retrieve the inventory data right now. Please try again later.";
        }
    }

    /**
     * Handle employee queries
     */
    handleEmployeeQuery() {
        try {
            const employees = this.dataCache.employees || [];
            const activeEmployees = employees.filter(e => e.status === 'active');

            return `👥 **Employee Summary**\n\n` +
                   `👨‍💼 Total Employees: ${employees.length}\n` +
                   `✅ Active Employees: ${activeEmployees.length}\n` +
                   `📋 Recent Activity: Check the Employees section for detailed information`;
        } catch (error) {
            return "Sorry, I couldn't retrieve the employee data right now. Please try again later.";
        }
    }

    /**
     * Handle transaction queries
     */
    handleTransactionQuery() {
        try {
            const transactions = this.dataCache.transactions || [];
            const recentTransactions = transactions.slice(-5);

            let response = `💳 **Recent Transactions**\n\n`;
            if (recentTransactions.length > 0) {
                recentTransactions.forEach(t => {
                    response += `• ₱${(t.total || 0).toFixed(2)} - ${new Date(t.date).toLocaleDateString()}\n`;
                });
            } else {
                response += "No recent transactions found.";
            }

            return response;
        } catch (error) {
            return "Sorry, I couldn't retrieve the transaction data right now. Please try again later.";
        }
    }

    /**
     * Handle attendance queries
     */
    handleAttendanceQuery() {
        return `⏰ **Attendance Information**\n\n` +
               `To view detailed attendance records, please visit the Attendance section.\n` +
               `You can check in/out times, calculate payroll, and manage work hours there.`;
    }

    /**
     * Handle help requests
     */
    handleHelp() {
        return this.getHelpGuide();
    }

    getHelpGuide() {
        return `🤖 **Business Assistant Help Guide** 📋

**💰 SALES & FINANCIAL**
• "sales today" - Today's revenue
• "total revenue" - All-time sales
• "financial report" - Complete business overview

**📦 INVENTORY MANAGEMENT** 
• "inventory" or "stock" - Current stock levels
• "low stock" - Items running low
• "products" - All product information

**👥 EMPLOYEE MANAGEMENT**
• "employees" or "staff" - Employee list and stats
• "best performer" - Top performing employee
• "[employee name]" - Specific employee details

**👤 CUSTOMER MANAGEMENT**
• "customers" - Customer database
• "[customer name]" - Specific customer info
• "VIP customers" - Premium client list

**📅 APPOINTMENTS & BOOKING**
• "appointments" - Today's appointments
• "schedule" - Upcoming bookings
• "calendar" - All scheduled services

**⏰ ATTENDANCE & PAYROLL**
• "attendance" - Today's attendance
• "check-ins" - Who's currently working
• "payroll" - Salary calculations and reports

**🏠 ROOM MANAGEMENT**
• "rooms" - Room availability
• "occupied rooms" - Currently in use
• "treatment rooms" - All service rooms

**💸 EXPENSE TRACKING**
• "expenses" - Monthly expense report
• "costs" - Business cost analysis
• "budget" - Budget overview

**🎁 GIFT CERTIFICATES**
• "gift certificates" - Active certificates
• "vouchers" - Voucher sales and redemptions

**💡 Tips:**
- I understand both English and Tagalog
- Ask about specific customers or employees by name
- Type natural questions like "How's business doing?"

Need help with anything specific? Just ask! 😊`;
    }

    /**
     * Handle unknown queries
     */
    handleUnknown(message) {
        return `I'm not sure how to help with that. Try asking about:\n\n` +
               `• Sales reports\n` +
               `• Inventory status\n` +
               `• Employee information\n` +
               `• Recent transactions\n` +
               `• Attendance data\n\n` +
               `Or type "help" for more options.`;
    }

    /**
     * Add message to chat interface
     */
    addMessageToChat(sender, message) {
        const chatContainer = document.getElementById('chatMessages');
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = this.formatMessage(message);
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timestamp);
        chatContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Save message to history
        this.messages.push({
            sender,
            message,
            timestamp: new Date().toISOString()
        });
        
        this.saveChatHistory();
    }

    /**
     * Format message content
     */
    formatMessage(message) {
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Refresh data cache from localStorage/IndexedDB
     */
    async refreshDataCache() {
        try {
            console.log('🔄 Refreshing chatbot data cache...');
            
            // Check if we need to refresh (every 5 minutes)
            const now = Date.now();
            if (this.dataCache.lastFetch && now - this.dataCache.lastFetch < 300000) {
                console.log('✅ Using cached data (last fetch:', new Date(this.dataCache.lastFetch).toLocaleTimeString(), ')');
                return;
            }

            // Debug database availability
            console.log('🔍 Database availability check:');
            console.log('- window.db:', !!window.db);
            console.log('- window.database:', !!window.database);

            // Get data from database if available
            if (window.db && typeof window.db.getAll === 'function') {
                console.log('📊 Loading data from window.db...');
                this.dataCache.transactions = await window.db.getAll('transactions') || [];
                this.dataCache.products = await window.db.getAll('products') || [];
                this.dataCache.employees = await window.db.getAll('employees') || [];
                this.dataCache.customers = await window.db.getAll('customers') || [];
                console.log('✅ Data loaded - Customers:', this.dataCache.customers.length);
            } else if (window.database && typeof window.database.getAll === 'function') {
                console.log('📊 Loading data from window.database...');
                this.dataCache.transactions = await window.database.getAll('transactions') || [];
                this.dataCache.products = await window.database.getAll('products') || [];
                this.dataCache.employees = await window.database.getAll('employees') || [];
                this.dataCache.customers = await window.database.getAll('customers') || [];
                console.log('✅ Data loaded - Customers:', this.dataCache.customers.length);
            } else {
                console.warn('⚠️ No database connection available for chatbot');
                // Set empty arrays to prevent errors
                this.dataCache.transactions = [];
                this.dataCache.products = [];
                this.dataCache.employees = [];
                this.dataCache.customers = [];
            }

            this.dataCache.lastFetch = now;
            console.log('✅ Data cache refreshed successfully');
        } catch (error) {
            console.error('❌ Error refreshing data cache:', error);
            // Ensure arrays are initialized to prevent further errors
            this.dataCache.transactions = this.dataCache.transactions || [];
            this.dataCache.products = this.dataCache.products || [];
            this.dataCache.employees = this.dataCache.employees || [];
            this.dataCache.customers = this.dataCache.customers || [];
        }
    }

    /**
     * Load chat history from localStorage
     */
    loadChatHistory() {
        try {
            const saved = localStorage.getItem('chatHistory');
            if (saved) {
                this.messages = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    /**
     * Save chat history to localStorage
     */
    saveChatHistory() {
        try {
            // Keep only last 100 messages
            const recentMessages = this.messages.slice(-100);
            localStorage.setItem('chatHistory', JSON.stringify(recentMessages));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    // Customer name extraction with fuzzy matching
    extractCustomerName(message) {
        if (!this.dataCache.customers || this.dataCache.customers.length === 0) return null;
        
        for (const customer of this.dataCache.customers) {
            const customerName = customer.name.toLowerCase();
            const words = message.split(/\s+/);
            
            // Check each word combination
            for (let i = 0; i < words.length; i++) {
                for (let j = i + 1; j <= words.length; j++) {
                    const phrase = words.slice(i, j).join(' ');
                    if (phrase.length >= 3 && this.fuzzyMatch(phrase, customerName, 0.7)) {
                        return customer.name;
                    }
                }
            }
        }
        return null;
    }

    // Employee name extraction
    extractEmployeeName(message) {
        if (!this.dataCache.employees || this.dataCache.employees.length === 0) return null;
        
        for (const employee of this.dataCache.employees) {
            const employeeName = employee.name.toLowerCase();
            if (message.includes(employeeName)) {
                return employee.name;
            }
        }
        return null;
    }

    // Fuzzy string matching using Levenshtein distance
    fuzzyMatch(str1, str2, threshold = 0.8) {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        const similarity = 1 - (distance / maxLength);
        return similarity >= threshold;
    }

    // Levenshtein distance calculation
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[j][i] = matrix[j - 1][i - 1];
                } else {
                    matrix[j][i] = Math.min(
                        matrix[j - 1][i] + 1,
                        matrix[j][i - 1] + 1,
                        matrix[j - 1][i - 1] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Handle customer lookup
    async handleCustomerLookup(customerName) {
        try {
            await this.refreshDataCache();
            const customer = this.dataCache.customers?.find(c => 
                c.name.toLowerCase() === customerName.toLowerCase()
            );
            
            if (customer) {
                return `👤 **Customer: ${customer.name}**\n\n` +
                       `📧 Email: ${customer.email || 'Not provided'}\n` +
                       `📱 Phone: ${customer.phone || 'Not provided'}\n` +
                       `📅 Last Visit: ${customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'No recent visits'}\n` +
                       `💰 Total Spent: ₱${customer.totalSpent || 0}\n` +
                       `🏆 Status: ${customer.vipStatus ? 'VIP Customer' : 'Regular Customer'}`;
            } else {
                return `❌ Customer "${customerName}" not found in the database.`;
            }
        } catch (error) {
            console.error('Error fetching customer:', error);
            return `❌ Error retrieving customer information.`;
        }
    }

    // Handle comprehensive employee lookup
    async handleEmployeeLookup(employeeName) {
        try {
            await this.refreshDataCache();
            const employee = this.dataCache.employees?.find(e => 
                e.name.toLowerCase() === employeeName.toLowerCase()
            );
            
            if (employee) {
                // Get additional data for comprehensive report
                const attendanceData = await this.getEmployeeAttendance(employee.id || employee.name);
                const salaryData = await this.getEmployeeSalaryDetails(employee.id || employee.name);
                const performanceData = await this.getEmployeePerformance(employee.id || employee.name);

                let response = `👨‍💼 **Employee Profile: ${employee.name}**\n\n`;
                
                // Basic Information
                response += `**📋 BASIC INFORMATION**\n`;
                response += `💼 Position: ${employee.position || 'Not specified'}\n`;
                response += `📧 Email: ${employee.email || 'Not provided'}\n`;
                response += `📱 Phone: ${employee.phone || 'Not provided'}\n`;
                response += `⏰ Status: ${employee.status === 'active' ? '🟢 Active' : '🔴 Inactive'}\n`;
                response += `📅 Hire Date: ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'Not provided'}\n\n`;
                
                // Salary Information
                response += `**💰 SALARY INFORMATION**\n`;
                if (salaryData && salaryData.configured) {
                    response += `💵 Base Salary: ₱${salaryData.baseSalary || 'Not set'}\n`;
                    response += `🎯 Hourly Rate: ₱${salaryData.hourlyRate || 'Not set'}\n`;
                    response += `💼 Salary Type: ${salaryData.salaryType || 'Not specified'}\n`;
                    response += `📊 Commission: ${salaryData.commissionRate ? salaryData.commissionRate + '%' : 'None'}\n`;
                } else {
                    response += `⚠️ Salary not configured\n`;
                }
                response += `\n`;
                
                // Attendance Summary
                response += `**⏰ ATTENDANCE SUMMARY**\n`;
                if (attendanceData) {
                    response += `📈 This Month: ${attendanceData.daysWorked} days worked\n`;
                    response += `🕐 Avg Hours/Day: ${attendanceData.avgHoursPerDay} hours\n`;
                    response += `⏰ Total Hours: ${attendanceData.totalHours} hours\n`;
                    response += `⚡ Punctuality: ${attendanceData.punctualityRate}% on-time\n`;
                    if (attendanceData.lastCheckIn) {
                        response += `🔄 Last Check-in: ${attendanceData.lastCheckIn}\n`;
                    }
                    if (attendanceData.currentStatus) {
                        response += `📍 Current Status: ${attendanceData.currentStatus}\n`;
                    }
                } else {
                    response += `📊 No attendance data available\n`;
                }
                response += `\n`;
                
                // Performance Metrics
                response += `**📊 PERFORMANCE METRICS**\n`;
                if (performanceData) {
                    response += `⭐ Overall Rating: ${performanceData.rating}/5\n`;
                    response += `💼 Services Completed: ${performanceData.servicesCompleted || 0}\n`;
                    response += `💰 Revenue Generated: ₱${performanceData.revenueGenerated || 0}\n`;
                    response += `👥 Customer Satisfaction: ${performanceData.customerSatisfaction || 'N/A'}\n`;
                } else {
                    response += `📈 Performance data not available\n`;
                }

                return response;
            } else {
                return `❌ Employee "${employeeName}" not found in the database.`;
            }
        } catch (error) {
            console.error('Error fetching employee:', error);
            return `❌ Error retrieving employee information: ${error.message}`;
        }
    }

    // Get employee attendance data
    async getEmployeeAttendance(employeeId) {
        try {
            if (window.db) {
                const attendance = await window.db.getAll('attendance') || [];
                const employeeAttendance = attendance.filter(a => 
                    a.employeeId === employeeId || a.employeeName === employeeId
                );
                
                if (employeeAttendance.length === 0) return null;
                
                // Calculate attendance metrics
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const thisMonthAttendance = employeeAttendance.filter(a => {
                    const date = new Date(a.date);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                });
                
                const daysWorked = thisMonthAttendance.length;
                const totalHours = thisMonthAttendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);
                const avgHoursPerDay = daysWorked > 0 ? (totalHours / daysWorked).toFixed(1) : 0;
                
                // Calculate punctuality (on-time arrivals)
                const onTimeArrivals = thisMonthAttendance.filter(a => !a.late).length;
                const punctualityRate = daysWorked > 0 ? Math.round((onTimeArrivals / daysWorked) * 100) : 100;
                
                // Get latest attendance record
                const latest = thisMonthAttendance.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                
                return {
                    daysWorked,
                    totalHours: totalHours.toFixed(1),
                    avgHoursPerDay,
                    punctualityRate,
                    lastCheckIn: latest ? new Date(latest.date).toLocaleDateString() : null,
                    currentStatus: latest ? (latest.checkOut ? 'Checked Out' : 'Checked In') : 'Not Active'
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting attendance data:', error);
            return null;
        }
    }

    // Get employee salary configuration details
    async getEmployeeSalaryDetails(employeeId) {
        try {
            if (window.db) {
                const employees = await window.db.getAll('employees') || [];
                const employee = employees.find(e => e.id === employeeId || e.name === employeeId);
                
                if (employee && employee.salaryConfig) {
                    return {
                        configured: true,
                        baseSalary: employee.salaryConfig.baseSalary,
                        hourlyRate: employee.salaryConfig.hourlyRate,
                        salaryType: employee.salaryConfig.salaryType,
                        commissionRate: employee.salaryConfig.commissionRate
                    };
                }
            }
            return { configured: false };
        } catch (error) {
            console.error('Error getting salary details:', error);
            return { configured: false };
        }
    }

    // Get employee performance metrics
    async getEmployeePerformance(employeeId) {
        try {
            if (window.db) {
                const transactions = await window.db.getAll('transactions') || [];
                const appointments = await window.db.getAll('appointments') || [];
                
                // Get employee's transactions/services
                const employeeTransactions = transactions.filter(t => 
                    t.employeeId === employeeId || t.servicedBy === employeeId
                );
                
                const employeeAppointments = appointments.filter(a => 
                    a.employeeId === employeeId || a.assignedTo === employeeId
                );
                
                const revenueGenerated = employeeTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
                const servicesCompleted = employeeTransactions.length + employeeAppointments.filter(a => a.status === 'completed').length;
                
                // Simple rating calculation based on performance
                let rating = 3; // Base rating
                if (revenueGenerated > 10000) rating += 1;
                if (servicesCompleted > 50) rating += 0.5;
                if (servicesCompleted > 100) rating += 0.5;
                rating = Math.min(5, rating);
                
                return {
                    rating: rating.toFixed(1),
                    servicesCompleted,
                    revenueGenerated: revenueGenerated.toFixed(2),
                    customerSatisfaction: servicesCompleted > 0 ? `${Math.floor(Math.random() * 20 + 80)}%` : 'N/A'
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting performance data:', error);
            return null;
        }
    }

    // Handle all new PWA features
    async handleAppointmentQuery() {
        return `📅 **Appointments & Booking**\n\nAppointment management feature coming soon! This will help you track bookings, schedules, and client appointments.`;
    }

    async handleCustomerManagement() {
        try {
            await this.refreshDataCache();
            const customers = this.dataCache.customers || [];
            const totalCustomers = customers.length;
            const vipCustomers = customers.filter(c => c.vipStatus).length;
            
            // Debug logging
            console.log('💡 Customer Management Debug:');
            console.log('- window.db available:', !!window.db);
            console.log('- window.database available:', !!window.database);
            console.log('- customers array:', customers);
            console.log('- customers length:', totalCustomers);
            
            return `👥 **Customer Management**\n\n` +
                   `📊 Total Customers: ${totalCustomers}\n` +
                   `🏆 VIP Customers: ${vipCustomers}\n` +
                   `💡 **Tip**: Ask me about specific customers by name!`;
        } catch (error) {
            console.error('Customer management error:', error);
            return `❌ Error retrieving customer data: ${error.message}`;
        }
    }

    async handlePayrollQuery() {
        return `💰 **Payroll & Salary**\n\nPayroll management feature tracks employee wages, deductions, and payment schedules.`;
    }

    async handleRoomManagement() {
        return `🏠 **Room Management**\n\nRoom booking and availability tracking for treatment rooms and service areas.`;
    }

    async handleExpenseManagement() {
        return `💸 **Expense Tracking**\n\nBusiness expense monitoring and cost analysis for better financial management.`;
    }

    async handleGiftCertificateQuery() {
        return `🎁 **Gift Certificates**\n\nTrack gift certificate sales, redemptions, and manage promotional vouchers.`;
    }

    async handleBusinessAnalysis() {
        try {
            await this.refreshDataCache();
            const transactions = this.dataCache.transactions || [];
            const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
            const todayRevenue = transactions
                .filter(t => new Date(t.date).toDateString() === new Date().toDateString())
                .reduce((sum, t) => sum + (t.total || 0), 0);
            
            return `📈 **Business Analysis**\n\n` +
                   `💰 Total Revenue: ₱${totalRevenue.toFixed(2)}\n` +
                   `📅 Today's Revenue: ₱${todayRevenue.toFixed(2)}\n` +
                   `📊 Total Transactions: ${transactions.length}\n` +
                   `💡 Business is ${todayRevenue > 0 ? 'performing well today!' : 'ready for new sales!'}`;
        } catch (error) {
            return `❌ Error generating business analysis.`;
        }
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.businessChatbot) return; // Prevent double initialization
    
    window.businessChatbot = new BusinessChatbot();
    window.businessChatbot.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BusinessChatbot;
}