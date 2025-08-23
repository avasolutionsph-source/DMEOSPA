// Enhanced AI Chatbot Assistant - Ultra Intelligent Business Advisor
// Version 2.0 - Complete rewrite with advanced intelligence

class ChatbotAssistant {
    constructor() {
        this.messages = [];
        this.isProcessing = false;
        this.conversationContext = {
            lastTopic: null,
            lastIntent: null,
            userPreferences: {},
            businessMetrics: {},
            conversationHistory: [],
            clarificationNeeded: false,
            followUpQuestions: [],
            sessionStartTime: new Date(),
            interactionCount: 0
        };
        this.dataCache = {
            lastFetch: null,
            transactions: [],
            inventory: [],
            employees: [],
            products: []
        };
    }

    init() {
        this.setupEventListeners();
        this.loadChatHistory();
        this.refreshDataCache();
        this.initializeConversation();
    }

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

    async refreshDataCache() {
        try {
            this.dataCache.transactions = await db.getAll('transactions') || [];
            this.dataCache.inventory = await db.getAll('inventory') || [];
            this.dataCache.employees = await db.getAll('employees') || [];
            this.dataCache.products = await db.getAll('products') || [];
            this.dataCache.lastFetch = new Date();
            
            // Calculate key business metrics
            this.updateBusinessMetrics();
        } catch (error) {
            if (window.logger) {
                window.logger.error('Error refreshing data cache', {
                    category: 'AI',
                    operation: 'refresh_data_cache',
                    error: error
                });
            }
        }
    }

    updateBusinessMetrics() {
        const transactions = this.dataCache.transactions;
        
        if (transactions.length > 0) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            
            this.conversationContext.businessMetrics = {
                totalTransactions: transactions.length,
                todayRevenue: this.calculateRevenue(transactions, today),
                monthRevenue: this.calculateRevenue(transactions, thisMonth),
                last30DaysRevenue: this.calculateRevenue(transactions, last30Days),
                avgTransactionValue: this.calculateAverageTransaction(transactions),
                hasData: true
            };
        } else {
            this.conversationContext.businessMetrics = { hasData: false };
        }
    }

    calculateRevenue(transactions, startDate) {
        return transactions
            .filter(t => new Date(t.date) >= startDate)
            .reduce((sum, t) => sum + (t.total || 0), 0);
    }

    calculateAverageTransaction(transactions) {
        if (transactions.length === 0) return 0;
        const total = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
        return total / transactions.length;
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message || this.isProcessing) return;

        // Add user message
        this.addMessage(message, 'user');
        input.value = '';

        // Update conversation context
        this.conversationContext.interactionCount++;
        this.conversationContext.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        // Process message
        this.isProcessing = true;
        
        // Always refresh data for performance queries, otherwise every 30 seconds
        const performanceKeywords = ['revenue', 'sales', 'staff', 'employee', 'service', 'today', 'doing'];
        const isPerformanceQuery = performanceKeywords.some(keyword => message.toLowerCase().includes(keyword));
        
        if (isPerformanceQuery || !this.dataCache.lastFetch || 
            (new Date() - this.dataCache.lastFetch) > 30000) {
            await this.refreshDataCache();
        }
        
        const response = await this.processMessage(message);
        this.addMessage(response, 'bot');
        
        // Store bot response in history
        this.conversationContext.conversationHistory.push({
            role: 'bot',
            content: response,
            timestamp: new Date()
        });
        
        this.isProcessing = false;
    }

    async processMessage(message) {
        // Check for commands first
        if (message.toLowerCase().trim() === '/help') {
            return this.getHelpGuide();
        }
        
        const intent = this.analyzeIntent(message);
        const context = this.conversationContext;
        
        // Update context with current intent
        context.lastIntent = intent;
        
        // Handle different intents with intelligent responses
        switch (intent.type) {
            case 'greeting':
                return this.handleGreeting();
            
            case 'business_analysis':
                return await this.handleBusinessAnalysis(intent);
            
            case 'revenue_query':
                return await this.handleRevenueQuery(intent);
            
            case 'financial_report':
                return await this.handleFinancialReport(intent);
            
            case 'employee_query':
                return await this.handleEmployeeQuery(intent);
            
            case 'inventory_query':
                return await this.handleInventoryQuery(intent);
            
            case 'profit_tips':
                return await this.handleProfitTips();
            
            case 'security_concern':
                return await this.handleSecurityConcern();
            
            case 'operating_hours':
                return await this.handleOperatingHours();
            
            case 'sync_status':
                return await this.handleSyncStatus();
            
            case 'sync_now':
                return await this.handleSyncNow();
            
            case 'marketing_advice':
                return await this.handleMarketingAdvice();
            
            case 'staff_management':
                return await this.handleStaffManagement();
            
            case 'forecast':
                return await this.handleForecast(intent);
            
            case 'tips_menu':
                return this.getTipCategories();
            
            case 'gratitude':
                return this.handleGratitude();
            
            case 'help':
                return this.provideHelp();
            
            default:
                return this.handleGeneralQuery(message, intent);
        }
    }

    analyzeIntent(message) {
        const lowerMessage = message.toLowerCase().trim();
        
        // Advanced intent detection with confidence scoring
        const intents = [
            {
                type: 'greeting',
                patterns: [/^(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings?)$/i],
                confidence: 0
            },
            {
                type: 'revenue_query',
                patterns: [/revenue|earnings?|income|sales|money|profit|how much.*(?:made|earned|sold)/i],
                confidence: 0
            },
            {
                type: 'financial_report',
                patterns: [/financial.*(?:report|status|overview|summary)|finance.*(?:report|status)|business.*(?:report|summary|overview)|financial?.*status|financial?.*report|full.*report|complete.*financial/i],
                confidence: 0
            },
            {
                type: 'employee_query',
                patterns: [/employee|staff|team|worker|best\s+performer|top\s+seller|staff.*performance|show.*staff|employee.*sales/i],
                confidence: 0
            },
            {
                type: 'inventory_query',
                patterns: [/inventory|stock|supplies?|products?|running low|out of stock/i],
                confidence: 0
            },
            {
                type: 'security_concern',
                patterns: [/steal|theft|missing|disappear|lost|security|someone taking|loss\s+prevention|prevent.*theft|suspicious|cameras|locks/i],
                confidence: 0
            },
            {
                type: 'forecast',
                patterns: [/forecast|predict|projection|future|will\s+(?:i|we)\s+(?:make|earn)|next\s+(?:month|week|year)/i],
                confidence: 0
            },
            {
                type: 'profit_tips',
                patterns: [/(?:increase|improve|boost|grow).*(?:profit|revenue|income)|profit\s+tips?|make\s+more\s+money/i],
                confidence: 0
            },
            {
                type: 'operating_hours',
                patterns: [/operating\s+hours?|when.*(?:open|close)|business\s+hours?|peak\s+(?:hours?|times?)|best.*time|close.*time|find.*best.*times?|optimal.*hours?/i],
                confidence: 0
            },
            {
                type: 'sync_status',
                patterns: [/(?:last\s+)?sync|synchroniz|when.*(?:sync|last\s+sync)|sync.*(?:status|time|date)|data.*sync|last.*sync.*time|sync.*data/i],
                confidence: 0
            },
            {
                type: 'sync_now',
                patterns: [/sync\s+now|start\s+sync|trigger\s+sync|sync\s+data\s+now|do\s+sync|run\s+sync/i],
                confidence: 0
            },
            {
                type: 'marketing_advice',
                patterns: [/marketing|customers?|promote|advertise|attract|grow.*business|acquisition|retention|digital.*marketing/i],
                confidence: 0
            },
            {
                type: 'staff_management',
                patterns: [/manage.*(?:staff|employees?|team)|staff.*(?:tips?|management)|coaching.*tips?|train.*staff/i],
                confidence: 0
            },
            {
                type: 'tips_menu',
                patterns: [/tips?(?:\s+menu)?|advice|help me with|suggestions?|what can you help/i],
                confidence: 0
            },
            {
                type: 'gratitude',
                patterns: [/thank|thanks|appreciate|grateful|awesome|great\s+job/i],
                confidence: 0
            },
            {
                type: 'help',
                patterns: [/^help$|what can you do|how do you work|guide|assist/i],
                confidence: 0
            },
            {
                type: 'business_analysis',
                patterns: [/analyze|analysis|how.*business.*doing|performance|overview/i],
                confidence: 0
            }
        ];
        
        // Calculate confidence for each intent
        let bestMatch = { type: 'general', confidence: 0.3 };
        
        for (const intent of intents) {
            for (const pattern of intent.patterns) {
                if (pattern.test(lowerMessage)) {
                    intent.confidence = this.calculatePatternConfidence(lowerMessage, pattern);
                    if (intent.confidence > bestMatch.confidence) {
                        bestMatch = intent;
                    }
                    break;
            }
            }
        }
        
        // Extract additional context
        bestMatch.timeframe = this.extractTimeframe(lowerMessage);
        bestMatch.entities = this.extractEntities(lowerMessage);
        bestMatch.sentiment = this.analyzeSentiment(lowerMessage);
        
        return bestMatch;
    }

    calculatePatternConfidence(message, pattern) {
        const match = message.match(pattern);
        if (!match) return 0;
        
        // Higher confidence for exact matches
        if (match[0].length === message.length) return 1.0;
        
        // Calculate based on match coverage
        const coverage = match[0].length / message.length;
        return Math.min(0.5 + coverage * 0.5, 0.95);
    }

    extractTimeframe(message) {
        const timeframes = {
            today: /today|right now|current/i,
            yesterday: /yesterday/i,
            thisWeek: /this week|past week|last 7 days/i,
            thisMonth: /this month|current month/i,
            lastMonth: /last month|previous month/i,
            thisYear: /this year|current year/i,
            custom: /(?:last|past)\s+(\d+)\s+days?/i
        };
        
        for (const [key, pattern] of Object.entries(timeframes)) {
            if (pattern.test(message)) {
                if (key === 'custom') {
                    const match = message.match(pattern);
                    return { type: 'custom', days: parseInt(match[1]) };
                }
                return { type: key };
            }
        }
        
        return { type: 'default' };
    }

    extractEntities(message) {
        const entities = {
            services: [],
            employees: [],
            amounts: [],
            percentages: []
        };
        
        // Extract monetary amounts
        const amountPattern = /\$?\d+(?:,\d{3})*(?:\.\d{2})?/g;
        const amounts = message.match(amountPattern);
        if (amounts) entities.amounts = amounts;
        
        // Extract percentages
        const percentPattern = /\d+(?:\.\d+)?%/g;
        const percentages = message.match(percentPattern);
        if (percentages) entities.percentages = percentages;
        
        // Match against known entities
        this.dataCache.employees.forEach(emp => {
            if (message.toLowerCase().includes(emp.name.toLowerCase())) {
                entities.employees.push(emp.name);
            }
        });
        
        this.dataCache.products.forEach(product => {
            if (message.toLowerCase().includes(product.name.toLowerCase())) {
                entities.services.push(product.name);
            }
        });
        
        return entities;
    }

    analyzeSentiment(message) {
        const positive = /good|great|excellent|amazing|wonderful|love|best|perfect|awesome|fantastic/i;
        const negative = /bad|terrible|awful|hate|worst|problem|issue|wrong|difficult|frustrated/i;
        const neutral = /okay|fine|alright|normal|average/i;
        
        if (positive.test(message)) return 'positive';
        if (negative.test(message)) return 'negative';
        if (neutral.test(message)) return 'neutral';
        return 'neutral';
    }

    initializeConversation() {
        // Clear old chat data to force new welcome message
        localStorage.removeItem('chatHistory');
        localStorage.removeItem('chatContext');
        
        // Clear existing messages and show new welcome
        this.messages = [];
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
            chatContainer.innerHTML = '';
        }
        
        setTimeout(() => {
            this.addMessage(this.getWelcomeMessage(), 'bot');
        }, 500);
    }

    getWelcomeMessage() {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        
        return `${greeting}! 👋 I'm here to help you with your business!

Type **/help** to see what I can do, or just ask me anything directly.

How can I assist you today? 😊`;
    }

    handleGreeting() {
        const context = this.conversationContext;
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        
        // Personalized greeting based on context
        if (context.interactionCount > 1) {
            return `Hello again! 😊 How can I help you now?`;
        }
        
        // First greeting with quick stats if available
        if (this.conversationContext.businessMetrics.hasData) {
            const metrics = this.conversationContext.businessMetrics;
            return `${timeGreeting}! 👋 Welcome back!

Today's revenue: ${this.formatCurrency(metrics.todayRevenue)}
This month: ${this.formatCurrency(metrics.monthRevenue)}

How can I help you today? 😊`;
        }
        
        return this.getWelcomeMessage();
    }

    getContextualFollowUp() {
        const lastTopic = this.conversationContext.lastTopic;
        
        const followUps = {
            revenue: "Ask me about 'profit tips' or 'marketing strategies' for more insights!",
            employees: "Try 'staff management' for coaching tips or 'best service' analysis!",
            inventory: "Ask 'loss prevention' or 'best service' for more insights!",
            marketing: "Try 'operating hours' or 'revenue analysis' for more data!",
            forecast: "Want an updated forecast?",
            default: "What can I help you with today?"
        };
        
        return followUps[lastTopic] || followUps.default;
    }

    async handleBusinessAnalysis(intent) {
        try {
            const transactions = this.dataCache.transactions;
            const inventory = this.dataCache.inventory;
            const employees = this.dataCache.employees;
            
            if (transactions.length === 0) {
                return this.noDataResponse('business analysis');
            }
            
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            
            // Calculate metrics
            const todayRevenue = this.calculateRevenue(transactions, today);
            const monthRevenue = this.calculateRevenue(transactions, thisMonth);
            const lastMonthRevenue = this.calculateRevenue(transactions.filter(t => {
                const date = new Date(t.date);
                return date >= lastMonth && date < thisMonth;
            }), lastMonth);
            
            const avgTransaction = this.calculateAverageTransaction(transactions);
            const growthRate = lastMonthRevenue > 0 ? 
                ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
            
            // Get top service
            const serviceStats = this.analyzeServices(transactions);
            const topService = serviceStats[0];
            
            // Check inventory status
            const lowStockCount = inventory.filter(item => 
                item.currentStock <= item.minStock).length;
            
            let response = `📊 **Business Performance Overview**

**Financial Status:**
• Today: ${this.formatCurrency(todayRevenue)} ${todayRevenue > 0 ? '✅' : '⏳ No sales yet today'}
• This Month: ${this.formatCurrency(monthRevenue)}
• Growth: ${growthRate >= 0 ? '📈' : '📉'} ${growthRate.toFixed(1)}% vs last month
• Avg Transaction: ${this.formatCurrency(avgTransaction)}

**Operations:**`;

            if (topService) {
                response += `
• Top Service: "${topService.name}" (${this.formatCurrency(topService.revenue)} revenue)`;
            }

            if (employees.length > 0) {
                const topEmployee = this.getTopEmployee(transactions, employees);
                if (topEmployee) {
                    response += `
• Top Employee: ${topEmployee.name} (${topEmployee.salesCount} sales)`;
                }
            }

            if (inventory.length > 0) {
                response += `
• Inventory: ${lowStockCount > 0 ? `⚠️ ${lowStockCount} items low` : '✅ All stocked'}`;
            }

            // Smart insights
            response += `

**💡 Quick Insights:**`;
            
            if (growthRate > 10) {
                response += `
• Excellent growth! Consider expanding capacity or services`;
            } else if (growthRate < -5) {
                response += `
• Revenue declining - let's discuss strategies to reverse this`;
            }
            
            if (avgTransaction < 1000) {
                response += `
• Focus on upselling to increase transaction value`;
            }
            
            if (lowStockCount > 0) {
                response += `
• Restock soon to avoid service disruptions`;
            }

            response += `

💡 **Need specific help?** Ask me about:
• "Marketing strategies" - Complete marketing guide
• "Profit tips" - Revenue optimization strategies  
• "Staff management" - Team coaching guide
• "Operating hours" - Best times analysis`;
            
            // Update context
            this.conversationContext.lastTopic = 'business_analysis';
            
            return response;
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Error in business analysis', {
                    category: 'AI',
                    operation: 'business_analysis',
                    error: error
                });
            }
            return "I encountered an issue analyzing your business data. Let me refresh the data and try again. Please ask me again in a moment.";
        }
    }

    async handleRevenueQuery(intent) {
        try {
            const transactions = this.dataCache.transactions;
            if (!transactions || transactions.length === 0) {
                return `📊 **Detailed Revenue Analysis**\n\n❌ **No sales data found!**\n\nTo get detailed revenue insights, please:\n1. Go to POS (Point of Sale) section\n2. Start recording your daily sales\n3. Include service types and amounts\n4. Come back for complete revenue analysis!\n\nOnce you have data, I'll show you:\n• Daily, weekly, and monthly revenue breakdowns\n• Best performing services and their profits\n• Revenue trends and growth patterns\n• Peak hours and optimal pricing strategies\n• Forecasts for future earnings\n• Specific recommendations to increase revenue`;
            }
            
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            
            // Calculate revenue for different periods
            const todayRevenue = this.calculateRevenue(transactions, today);
            const weekRevenue = this.calculateRevenue(transactions, thisWeek);
            const monthRevenue = this.calculateRevenue(transactions, thisMonth);
            const lastMonthRevenue = this.calculateRevenue(transactions.filter(t => 
                new Date(t.date) >= lastMonth && new Date(t.date) <= lastMonthEnd
            ));
            
            const avgTransaction = this.calculateAverageTransaction(transactions);
            const totalRevenue = this.calculateRevenue(transactions);
            
            // Calculate growth rates
            const monthGrowth = lastMonthRevenue > 0 ? 
                ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
            
            // Calculate daily averages
            const daysInMonth = now.getDate();
            const dailyAvg = monthRevenue / daysInMonth;
            
            let response = `📊 **Complete Revenue Analysis Report**\n\n`;
            
            // Current Performance
            response += `💰 **CURRENT PERFORMANCE:**\n`;
            response += `• Today's revenue: ${this.formatCurrency(todayRevenue)}\n`;
            response += `• This week: ${this.formatCurrency(weekRevenue)}\n`;
            response += `• This month: ${this.formatCurrency(monthRevenue)}\n`;
            response += `• Last month: ${this.formatCurrency(lastMonthRevenue)}\n`;
            response += `• All-time total: ${this.formatCurrency(totalRevenue)}\n\n`;
            
            // Growth Analysis
            response += `📈 **GROWTH ANALYSIS:**\n`;
            if (monthGrowth > 0) {
                response += `• Month-over-month: +${monthGrowth.toFixed(1)}% 📈 (Growing!)\n`;
            } else if (monthGrowth < 0) {
                response += `• Month-over-month: ${monthGrowth.toFixed(1)}% 📉 (Declining)\n`;
            } else {
                response += `• Month-over-month: 0% (Stable)\n`;
            }
            response += `• Daily average this month: ${this.formatCurrency(dailyAvg)}\n`;
            response += `• Average transaction value: ${this.formatCurrency(avgTransaction)}\n\n`;
            
            // Transaction Analysis
            const thisMonthTransactions = transactions.filter(t => new Date(t.date) >= thisMonth);
            response += `🔢 **TRANSACTION DETAILS:**\n`;
            response += `• Total transactions: ${transactions.length}\n`;
            response += `• This month's sales: ${thisMonthTransactions.length}\n`;
            response += `• Average sales per day: ${(thisMonthTransactions.length / daysInMonth).toFixed(1)}\n\n`;
            
            // Service Analysis (if service data exists)
            const serviceRevenue = {};
            thisMonthTransactions.forEach(t => {
                const service = t.service || t.product || 'General Service';
                serviceRevenue[service] = (serviceRevenue[service] || 0) + parseFloat(t.amount || t.total || 0);
            });
            
            if (Object.keys(serviceRevenue).length > 0) {
                response += `🏆 **TOP SERVICES THIS MONTH:**\n`;
                const sortedServices = Object.entries(serviceRevenue)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);
                
                sortedServices.forEach(([service, revenue], index) => {
                    const percentage = (revenue / monthRevenue * 100).toFixed(1);
                    response += `${index + 1}. **${service}** - ${this.formatCurrency(revenue)} (${percentage}%)\n`;
                });
                response += `\n`;
            }
            
            // Performance Insights
            response += `💡 **PERFORMANCE INSIGHTS:**\n`;
            
            if (avgTransaction > 2000) {
                response += `• ✅ Excellent transaction value (₱${avgTransaction.toFixed(0)})\n`;
            } else if (avgTransaction > 1500) {
                response += `• ✅ Good transaction value (₱${avgTransaction.toFixed(0)})\n`;
            } else {
                response += `• ⚠️ Low transaction value (₱${avgTransaction.toFixed(0)}) - Consider bundling services\n`;
            }
            
            if (monthGrowth > 10) {
                response += `• 🚀 Outstanding growth! Keep up the momentum!\n`;
            } else if (monthGrowth > 5) {
                response += `• 📈 Solid growth! You're on the right track\n`;
            } else if (monthGrowth > 0) {
                response += `• ↗️ Positive growth - consider strategies to accelerate\n`;
            } else {
                response += `• 📉 Revenue declining - immediate action needed\n`;
            }
            
            if (dailyAvg > 5000) {
                response += `• 💪 Strong daily performance (₱${dailyAvg.toFixed(0)}/day)\n`;
            } else if (dailyAvg > 3000) {
                response += `• 👍 Decent daily performance (₱${dailyAvg.toFixed(0)}/day)\n`;
            } else {
                response += `• 🎯 Room for improvement (₱${dailyAvg.toFixed(0)}/day)\n`;
            }
            
            // Action Recommendations
            response += `\n🎯 **ACTION RECOMMENDATIONS:**\n`;
            
            if (avgTransaction < 1500) {
                response += `1. **PRIORITY:** Increase average sale value\n`;
                response += `   • Offer service packages (save 15-20%)\n`;
                response += `   • Upsell add-on treatments\n`;
                response += `   • Create premium service tiers\n`;
            }
            
            if (monthGrowth < 5) {
                response += `${avgTransaction < 1500 ? '2' : '1'}. **Focus on growth strategies:**\n`;
                response += `   • Run monthly promotions\n`;
                response += `   • Improve customer retention\n`;
                response += `   • Expand marketing efforts\n`;
            }
            
            response += `${avgTransaction < 1500 && monthGrowth < 5 ? '3' : avgTransaction < 1500 || monthGrowth < 5 ? '2' : '1'}. **Track performance daily:**\n`;
            response += `   • Monitor revenue vs. target (₱${(dailyAvg * 1.2).toFixed(0)}/day goal)\n`;
            response += `   • Identify peak hours and optimize staffing\n`;
            response += `   • Analyze which services drive the most revenue\n`;
            
            // Monthly Target
            const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
            const targetDaily = dailyAvg * 1.2; // 20% improvement target
            const projectedMonth = monthRevenue + (targetDaily * daysLeft);
            
            response += `\n🎯 **MONTHLY TARGET:**\n`;
            response += `• Current pace: ${this.formatCurrency(monthRevenue + (dailyAvg * daysLeft))}\n`;
            response += `• Target pace: ${this.formatCurrency(projectedMonth)} (20% better)\n`;
            response += `• Need: ${this.formatCurrency(targetDaily)}/day for remaining ${daysLeft} days\n`;
            
            this.conversationContext.lastTopic = 'revenue';
            return response;
            
        } catch (error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Chatbot analysis error', { category: 'AI', error, context: { operation: 'revenueAnalysis' } });
            } else {
                if (window.logger) {
                    window.logger.error('Chatbot error', {
                        category: 'AI',
                        operation: 'process_response',
                        error: error
                    });
                }
            }
            return `📊 **Revenue Analysis Error**\n\n❌ Sorry, I couldn't load your revenue data right now.\n\nPlease try:\n1. Refreshing the page\n2. Checking your internet connection\n3. Making sure sales data is saved properly\n\nThen ask me again! I'll give you a complete revenue breakdown with insights and recommendations.`;
        }
    }

    async handleFinancialReport(intent) {
        try {
            const transactions = this.dataCache.transactions;
            const employees = this.dataCache.employees;
            const inventory = this.dataCache.inventory;
            const products = this.dataCache.products;
            
            if (!transactions || transactions.length === 0) {
                return `📊 **Complete Financial Report**\n\n❌ **No business data found!**\n\nTo generate your comprehensive financial report:\n1. Record sales in POS system\n2. Add employee data\n3. Track inventory levels\n4. Return for complete business overview!\n\nYour report will include:\n• **Revenue Analysis** - Daily, weekly, monthly breakdowns\n• **Service Performance** - Best selling services and profitability\n• **Staff Analysis** - Employee performance and sales metrics\n• **Inventory Status** - Stock levels and reorder alerts\n• **Growth Metrics** - Trends and forecasting\n• **Business Insights** - Actionable recommendations\n• **Financial Health** - Cash flow and profit analysis`;
            }
            
            let response = `📊 **COMPLETE FINANCIAL & BUSINESS REPORT**\n\n`;
            response += `📅 **Report Generated:** ${new Date().toLocaleDateString()}\n\n`;
            
            // === FINANCIAL OVERVIEW ===
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            
            const todayRevenue = this.calculateRevenue(transactions, today);
            const weekRevenue = this.calculateRevenue(transactions, thisWeek);
            const monthRevenue = this.calculateRevenue(transactions, thisMonth);
            const lastMonthRevenue = this.calculateRevenue(transactions.filter(t => 
                new Date(t.date) >= lastMonth && new Date(t.date) <= lastMonthEnd
            ));
            const totalRevenue = this.calculateRevenue(transactions);
            const avgTransaction = this.calculateAverageTransaction(transactions);
            
            response += `💰 **FINANCIAL OVERVIEW**\n`;
            response += `• **Today's Revenue:** ${this.formatCurrency(todayRevenue)}\n`;
            response += `• **This Week:** ${this.formatCurrency(weekRevenue)}\n`;
            response += `• **This Month:** ${this.formatCurrency(monthRevenue)}\n`;
            response += `• **Last Month:** ${this.formatCurrency(lastMonthRevenue)}\n`;
            response += `• **Total Revenue:** ${this.formatCurrency(totalRevenue)}\n`;
            response += `• **Average Transaction:** ${this.formatCurrency(avgTransaction)}\n\n`;
            
            // === GROWTH ANALYSIS ===
            const monthGrowth = lastMonthRevenue > 0 ? 
                ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
            const daysInMonth = now.getDate();
            const dailyAvg = monthRevenue / daysInMonth;
            
            response += `📈 **GROWTH & PERFORMANCE**\n`;
            if (monthGrowth > 0) {
                response += `• **Growth Rate:** +${monthGrowth.toFixed(1)}% 📈 (Growing)\n`;
            } else if (monthGrowth < 0) {
                response += `• **Growth Rate:** ${monthGrowth.toFixed(1)}% 📉 (Declining)\n`;
            } else {
                response += `• **Growth Rate:** 0% (Stable)\n`;
            }
            response += `• **Daily Average:** ${this.formatCurrency(dailyAvg)}\n`;
            response += `• **Transaction Count:** ${transactions.length} total\n`;
            response += `• **Monthly Sales:** ${transactions.filter(t => new Date(t.date) >= thisMonth).length}\n\n`;
            
            // === SERVICE ANALYSIS ===
            const serviceStats = {};
            let totalServiceRevenue = 0;
            
            transactions.forEach(transaction => {
                if (transaction.items && Array.isArray(transaction.items)) {
                    transaction.items.forEach(item => {
                        const service = item.name || item.serviceName || 'Unknown Service';
                        const amount = parseFloat(item.price || 0) * parseInt(item.quantity || 1);
                        
                        if (!serviceStats[service]) {
                            serviceStats[service] = { revenue: 0, sales: 0 };
                        }
                        serviceStats[service].revenue += amount;
                        serviceStats[service].sales += parseInt(item.quantity || 1);
                        totalServiceRevenue += amount;
                    });
                }
            });
            
            response += `🏆 **SERVICE PERFORMANCE**\n`;
            if (Object.keys(serviceStats).length > 0) {
                const sortedServices = Object.entries(serviceStats)
                    .sort(([,a], [,b]) => b.revenue - a.revenue)
                    .slice(0, 5);
                
                sortedServices.forEach(([service, stats], index) => {
                    const percentage = totalServiceRevenue > 0 ? (stats.revenue / totalServiceRevenue * 100).toFixed(1) : 0;
                    const avgPrice = stats.sales > 0 ? (stats.revenue / stats.sales).toFixed(0) : 0;
                    response += `${index + 1}. **${service}**\n`;
                    response += `   Revenue: ${this.formatCurrency(stats.revenue)} (${percentage}%)\n`;
                    response += `   Sales: ${stats.sales} • Avg: ${this.formatCurrency(avgPrice)}\n`;
                });
            } else {
                response += `• No detailed service data available\n`;
            }
            response += `\n`;
            
            // === STAFF ANALYSIS ===
            response += `👥 **STAFF PERFORMANCE**\n`;
            if (employees && employees.length > 0) {
                const employeeStats = {};
                
                // Initialize employee stats
                employees.forEach(emp => {
                    employeeStats[emp.name] = {
                        name: emp.name,
                        position: emp.position || 'Staff',
                        salesCount: 0,
                        revenue: 0
                    };
                });
                
                // Calculate employee performance
                transactions.forEach(transaction => {
                    if (transaction.employeeId) {
                        const employee = employees.find(emp => emp.id === transaction.employeeId);
                        if (employee && employeeStats[employee.name]) {
                            const transactionTotal = parseFloat(transaction.total || 0);
                            employeeStats[employee.name].salesCount++;
                            employeeStats[employee.name].revenue += transactionTotal;
                        }
                    }
                });
                
                const sortedEmployees = Object.values(employeeStats)
                    .sort((a, b) => b.revenue - a.revenue);
                
                sortedEmployees.forEach((emp, index) => {
                    const avgSale = emp.salesCount > 0 ? (emp.revenue / emp.salesCount) : 0;
                    response += `${index + 1}. **${emp.name}** (${emp.position})\n`;
                    response += `   Sales: ${emp.salesCount} • Revenue: ${this.formatCurrency(emp.revenue)}\n`;
                    response += `   Average: ${this.formatCurrency(avgSale)}\n`;
                });
            } else {
                response += `• No employee data available\n`;
            }
            response += `\n`;
            
            // === INVENTORY STATUS ===
            response += `📦 **INVENTORY STATUS**\n`;
            if (inventory && inventory.length > 0) {
                const lowStock = inventory.filter(item => 
                    (item.currentStock || 0) <= (item.reorderLevel || 0)
                );
                const totalItems = inventory.length;
                const lowStockCount = lowStock.length;
                
                response += `• **Total Items:** ${totalItems}\n`;
                response += `• **Low Stock Items:** ${lowStockCount}\n`;
                
                if (lowStockCount > 0) {
                    response += `• **Reorder Needed:**\n`;
                    lowStock.slice(0, 3).forEach(item => {
                        response += `  - ${item.name}: ${item.currentStock || 0} left\n`;
                    });
                    if (lowStockCount > 3) {
                        response += `  - ...and ${lowStockCount - 3} more items\n`;
                    }
                } else {
                    response += `• ✅ All items adequately stocked\n`;
                }
            } else {
                response += `• No inventory data available\n`;
            }
            response += `\n`;
            
            // === BUSINESS HEALTH INDICATORS ===
            response += `🔍 **BUSINESS HEALTH INDICATORS**\n`;
            
            // Transaction frequency
            const avgTransactionsPerDay = transactions.length / Math.max(1, 
                Math.ceil((now - new Date(transactions[0]?.date || now)) / (1000 * 60 * 60 * 24)));
            
            response += `• **Transaction Frequency:** ${avgTransactionsPerDay.toFixed(1)} sales/day\n`;
            
            if (avgTransaction > 2000) {
                response += `• **Transaction Value:** ✅ Excellent (${this.formatCurrency(avgTransaction)})\n`;
            } else if (avgTransaction > 1500) {
                response += `• **Transaction Value:** ✅ Good (${this.formatCurrency(avgTransaction)})\n`;
            } else {
                response += `• **Transaction Value:** ⚠️ Below target (${this.formatCurrency(avgTransaction)})\n`;
            }
            
            if (monthGrowth > 5) {
                response += `• **Growth Trend:** ✅ Healthy growth\n`;
            } else if (monthGrowth > 0) {
                response += `• **Growth Trend:** ⚠️ Slow growth\n`;
            } else {
                response += `• **Growth Trend:** ⚠️ Declining or stagnant\n`;
            }
            
            // Service diversity
            const serviceCount = Object.keys(serviceStats).length;
            response += `• **Service Diversity:** ${serviceCount} active services\n\n`;
            
            // === ACTIONABLE RECOMMENDATIONS ===
            response += `💡 **KEY RECOMMENDATIONS**\n\n`;
            
            if (avgTransaction < 1500) {
                response += `🎯 **PRIORITY - Increase Transaction Value:**\n`;
                response += `• Create service bundles (save 15-20%)\n`;
                response += `• Train staff to upsell add-ons\n`;
                response += `• Offer premium service options\n\n`;
            }
            
            if (monthGrowth < 5) {
                response += `📈 **GROWTH ACCELERATION:**\n`;
                response += `• Launch targeted marketing campaigns\n`;
                response += `• Implement customer referral program\n`;
                response += `• Analyze peak hours for optimization\n\n`;
            }
            
            if (inventory && inventory.filter(i => (i.currentStock || 0) <= (i.reorderLevel || 0)).length > 0) {
                response += `📦 **INVENTORY MANAGEMENT:**\n`;
                response += `• Restock low inventory items immediately\n`;
                response += `• Set up automatic reorder alerts\n`;
                response += `• Review supplier relationships\n\n`;
            }
            
            // === FORECAST ===
            const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
            const projectedMonthRevenue = monthRevenue + (dailyAvg * daysLeft);
            
            response += `🔮 **FINANCIAL FORECAST**\n`;
            response += `• **Projected Month End:** ${this.formatCurrency(projectedMonthRevenue)}\n`;
            response += `• **Days Remaining:** ${daysLeft}\n`;
            response += `• **Daily Target:** ${this.formatCurrency(dailyAvg * 1.2)} (20% improvement)\n\n`;
            
            response += `📋 **NEXT ACTIONS**\n`;
            response += `1. **This Week:** Focus on highest priority recommendation\n`;
            response += `2. **Daily:** Monitor transaction values and service performance\n`;
            response += `3. **Weekly:** Review staff performance and inventory levels\n`;
            response += `4. **Monthly:** Generate updated financial report for progress tracking\n\n`;
            
            response += `💬 **Need Help?** Ask me:\n`;
            response += `• "Marketing strategies" - Growth tactics\n`;
            response += `• "Profit tips" - Revenue optimization\n`;
            response += `• "Staff management" - Team performance\n`;
            response += `• "Best service" - Service analysis\n`;
            
            this.conversationContext.lastTopic = 'financial_report';
            return response;
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Financial Report Error', {
                    category: 'AI',
                    operation: 'financial_report',
                    error: error
                });
            }
            return `📊 **Financial Report Error**\n\n❌ Sorry, I couldn't generate your financial report right now.\n\nPlease try:\n1. Refreshing the page\n2. Ensuring all data is properly saved\n3. Checking your internet connection\n\nThen ask for your "financial report" again! I'll provide a complete business overview with insights and recommendations.`;
        }
    }

    async handleEmployeeQuery(intent) {
        try {
            const employees = this.dataCache.employees;
            const transactions = this.dataCache.transactions;
            
            // Debug: Log the raw data we have
            if (window.logger) {
                window.logger.debug('Chatbot Debug - Raw Data', {
                    category: 'AI',
                    operation: 'debug_data',
                    data: {
                        employeeCount: employees?.length || 0,
                        transactionCount: transactions?.length || 0,
                        employees: employees?.map(e => ({ id: e.id, idType: typeof e.id, name: e.name })),
                        sampleTransactions: transactions?.slice(0, 3).map(t => ({
                            id: t.id,
                            total: t.total,
                            employeeId: t.employeeId,
                            employeeIdType: typeof t.employeeId,
                            date: t.date
                        }))
                    }
                });
            }
            
            if (!employees || employees.length === 0) {
                return `👥 **Complete Employee Performance Analysis**\n\n❌ **No employees added yet!**\n\nTo track staff performance:\n1. Add team members in the Employee section\n2. Record which employee handles each service\n3. Track their sales and customer satisfaction\n4. Come back for detailed performance reports!\n\nOnce you have data, I'll show you:\n• Individual sales performance\n• Revenue generated per employee\n• Customer satisfaction ratings\n• Productivity comparisons\n• Coaching recommendations for each staff member`;
            }
            
            let response = `👥 **Complete Employee Performance Report**\n\n`;
            
            // Calculate performance for each employee
            const employeeStats = {};
            
            // Use the SAME calculation method as Employee Management screen
            const employeesWithStats = await Promise.all(employees.map(async (emp) => {
                const transactions = await db.getByIndex('transactions', 'employeeId', emp.id.toString());
                const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
                const totalCommission = totalSales * (emp.commissionRate / 100);
                const transactionCount = transactions.length;
                
                return { 
                    ...emp, 
                    totalSales, 
                    totalCommission, 
                    transactionCount,
                    salesCount: transactionCount,
                    totalRevenue: totalSales,
                    commission: totalCommission,
                    averageTransaction: transactionCount > 0 ? totalSales / transactionCount : 0,
                    role: emp.position || 'Staff Member'
                };
            }));
            
            // Convert to stats object
            employeesWithStats.forEach(emp => {
                employeeStats[emp.name] = emp;
            });

            
            // Sort employees by performance
            const sortedEmployees = Object.values(employeeStats)
                .sort((a, b) => b.totalRevenue - a.totalRevenue);
            
            response += `📊 **TEAM OVERVIEW:**\n`;
            response += `• Total staff members: ${employees.length}\n`;
            
            // Calculate team totals from employee stats
            const totalTeamRevenue = sortedEmployees.reduce((sum, emp) => sum + emp.totalRevenue, 0);
            const totalTeamSales = sortedEmployees.reduce((sum, emp) => sum + emp.salesCount, 0);
            const avgRevenuePerEmployee = employees.length > 0 ? totalTeamRevenue / employees.length : 0;
            
            response += `• Total team revenue: ${this.formatCurrency(totalTeamRevenue)}\n`;
            response += `• Total team sales: ${totalTeamSales}\n`;
            response += `• Average per employee: ${this.formatCurrency(avgRevenuePerEmployee)}\n\n`;
            
            // Detailed performance for each employee
            response += `👥 **INDIVIDUAL PERFORMANCE BREAKDOWN:**\n\n`;
            
            sortedEmployees.forEach((emp, index) => {
                const rank = index + 1;
                const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👤';
                
                response += `${emoji} **${emp.name}** (${emp.role})\n`;
                
                // Display the sales data from Employee Management screen
                response += `   💰 **Total Sales:** ${this.formatCurrency(emp.totalSales || 0)}\n`;
                response += `   🏆 **Commission:** ${this.formatCurrency(emp.totalCommission || 0)}\n`;
                response += `   📊 **Transactions:** ${emp.transactionCount || 0}\n`;
                
                if (emp.transactionCount > 0) {
                    response += `   💵 **Average Sale:** ${this.formatCurrency(emp.averageTransaction || 0)}\n`;
                    
                    // Performance rating based on actual sales
                    if (emp.totalSales > 4000) {
                        response += `   ⭐ **Status:** Top Performer! 🔥\n`;
                    } else if (emp.totalSales > 2000) {
                        response += `   ⭐ **Status:** Good Performer 👍\n`;
                    } else if (emp.totalSales > 0) {
                        response += `   ⭐ **Status:** Active Contributor\n`;
                    }
                } else {
                    response += `   ⚠️ **Status:** No sales recorded\n`;
                }
                
                response += `\n`;
            });
            
            // Performance insights and recommendations
            if (sortedEmployees.length > 1 && sortedEmployees[0].salesCount > 0) {
                response += `🎯 **PERFORMANCE INSIGHTS:**\n\n`;
                
                const topPerformer = sortedEmployees[0];
                const bottomPerformer = sortedEmployees[sortedEmployees.length - 1];
                
                response += `**🏆 Top Performer:** ${topPerformer.name}\n`;
                response += `• ${topPerformer.salesCount} sales, ${this.formatCurrency(topPerformer.totalRevenue)} revenue\n`;
                response += `• Average: ${this.formatCurrency(topPerformer.averageTransaction)} per service\n\n`;
                
                if (bottomPerformer.salesCount === 0) {
                    response += `**⚠️ Needs Attention:** ${bottomPerformer.name}\n`;
                    response += `• No sales recorded - ensure proper tracking\n`;
                    response += `• Consider additional training or support\n\n`;
                } else if (topPerformer.totalRevenue > bottomPerformer.totalRevenue * 2) {
                    response += `**📈 Performance Gap Detected:**\n`;
                    response += `• ${topPerformer.name}: ${this.formatCurrency(topPerformer.totalRevenue)}\n`;
                    response += `• ${bottomPerformer.name}: ${this.formatCurrency(bottomPerformer.totalRevenue)}\n`;
                    response += `• **Recommendation:** Pair low performer with top performer for mentoring\n\n`;
                }
                
                // Team average analysis
                const avgRevenue = sortedEmployees.reduce((sum, emp) => sum + emp.totalRevenue, 0) / sortedEmployees.length;
                const belowAverage = sortedEmployees.filter(emp => emp.totalRevenue < avgRevenue * 0.8);
                
                if (belowAverage.length > 0) {
                    response += `**🎓 Training Recommendations:**\n`;
                    belowAverage.forEach(emp => {
                        response += `• ${emp.name}: Focus on upselling and customer retention\n`;
                    });
                    response += `\n`;
                }
            }
            
            // Actionable next steps
            response += `📋 **ACTION ITEMS FOR THIS WEEK:**\n\n`;
            
            if (sortedEmployees.some(emp => emp.salesCount === 0)) {
                response += `1. **Track all services:** Ensure every service is recorded with employee name\n`;
            }
            
            if (sortedEmployees.length > 1) {
                response += `2. **One-on-one meetings:** Schedule 15 min with each team member\n`;
                response += `3. **Set individual goals:** Monthly targets based on current performance\n`;
                response += `4. **Recognition:** Acknowledge top performers publicly\n`;
            }
            
            response += `5. **Monitor daily:** Check who's performing which services\n`;
            response += `6. **Customer feedback:** Track satisfaction per employee\n\n`;
            
            response += `🏆 **PERFORMANCE TARGETS:**\n`;
            response += `• Sales per month: 30+ services per employee\n`;
            response += `• Revenue per month: ₱25,000+ per employee\n`;
            response += `• Customer satisfaction: 4.5+ stars average\n`;
            response += `• Upselling rate: 30% of services should include add-ons\n\n`;
            
            response += `💡 **Remember:** Great employees drive business success. Invest in training and recognition!`;
            
            this.conversationContext.lastTopic = 'employees';
            return response;
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Error analyzing employees', {
                    category: 'AI',
                    operation: 'analyze_employees',
                    error: error
                });
            }
            return `👥 **Employee Analysis Error**\n\n❌ Sorry, I couldn't load your employee data right now.\n\nPlease try:\n1. Refreshing the page\n2. Checking your internet connection\n3. Making sure employee data is saved properly\n\nThen ask me again! I'll give you a complete team performance breakdown.`;
        }
    }

    async handleBestServiceQuery(intent) {
        try {
            const transactions = this.dataCache.transactions;
            const products = this.dataCache.products;
            
            // If no transactions but have services configured, show service analysis
            if ((!transactions || transactions.length === 0) && products && products.length > 0) {
                let response = `🏆 **Service Portfolio Analysis**\n\n`;
                response += `📊 **AVAILABLE SERVICES:**\n`;
                response += `• Total services configured: ${products.length}\n\n`;
                
                response += `💎 **YOUR SPA SERVICES:**\n\n`;
                
                // Sort services by price (highest revenue potential first)
                const sortedServices = products.sort((a, b) => (b.price || 0) - (a.price || 0));
                
                sortedServices.forEach((service, index) => {
                    const rank = index + 1;
                    const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                    
                    response += `${emoji} **${service.name}**\n`;
                    response += `   💰 **Price:** ${this.formatCurrency(service.price || 0)}\n`;
                    response += `   ⏱️ **Duration:** ${service.duration ? service.duration + ' minutes' : 'Not specified'}\n`;
                    response += `   🏷️ **Category:** ${service.category || 'General'}\n`;
                    if (service.description) {
                        response += `   📝 **Description:** ${service.description}\n`;
                    }
                    response += `   🎯 **POS Status:** ${service.showInPOS ? 'Available in POS' : 'Not in POS'}\n\n`;
                });
                
                const highestPriced = sortedServices[0];
                response += `🎯 **KEY INSIGHTS:**\n\n`;
                response += `**🏆 Highest Revenue Potential: ${highestPriced.name}**\n`;
                response += `• ${this.formatCurrency(highestPriced.price)} per service\n`;
                response += `• Focus marketing efforts on this premium service\n`;
                response += `• Ensure staff are trained to upsell this service\n\n`;
                
                response += `💡 **RECOMMENDATIONS:**\n\n`;
                response += `**🚀 Start Recording Sales:**\n`;
                response += `1. Use POS system to track which services sell\n`;
                response += `2. Record customer preferences and feedback\n`;
                response += `3. Track employee performance per service\n`;
                response += `4. Monitor peak hours for each service type\n\n`;
                
                response += `**📈 Service Optimization:**\n`;
                response += `• Create service packages combining multiple treatments\n`;
                response += `• Offer loyalty discounts for repeat customers\n`;
                response += `• Train staff on upselling techniques\n`;
                response += `• Track which services lead to rebookings\n\n`;
                
                response += `💬 **Next Steps:** Start using the POS system to record sales, then ask me again for data-driven insights about your best performing services!`;
                
                this.conversationContext.lastTopic = 'service_portfolio';
                return response;
            }
            
            if (!transactions || transactions.length === 0) {
                return `🏆 **Best Service Analysis**\n\n❌ **No sales data found!**\n\nTo analyze your best-performing services:\n1. Go to POS (Point of Sale) section\n2. Record your daily services and sales\n3. Include service types and amounts\n4. Come back for detailed service analysis!\n\nOnce you have data, I'll show you:\n• Which services sell the most\n• Revenue breakdown per service type\n• Average price per service\n• Most profitable services\n• Customer preferences and trends\n• Recommendations for service optimization`;
            }
            
            let response = `🏆 **Best Service Performance Analysis**\n\n`;
            
            // Analyze services from transactions
            const serviceStats = {};
            let totalRevenue = 0;
            let totalSales = 0;
            
            transactions.forEach(transaction => {
                const date = new Date(transaction.date || transaction.timestamp);
                const client = transaction.customer || transaction.client;
                
                // Handle items array (from POS system)
                if (transaction.items && Array.isArray(transaction.items)) {
                    transaction.items.forEach(item => {
                        const service = item.name || item.serviceName || item.product || 'Unknown Service';
                        const amount = parseFloat(item.price || 0) * parseInt(item.quantity || 1);
                        
                        if (!serviceStats[service]) {
                            serviceStats[service] = {
                                name: service,
                                sales: 0,
                                revenue: 0,
                                averagePrice: 0,
                                firstSale: date,
                                lastSale: date,
                                clients: new Set()
                            };
                        }
                        
                        serviceStats[service].sales += parseInt(item.quantity || 1);
                        serviceStats[service].revenue += amount;
                        serviceStats[service].lastSale = date > serviceStats[service].lastSale ? date : serviceStats[service].lastSale;
                        serviceStats[service].firstSale = date < serviceStats[service].firstSale ? date : serviceStats[service].firstSale;
                        
                        if (client) {
                            serviceStats[service].clients.add(client);
                        }
                        
                        totalRevenue += amount;
                        totalSales += parseInt(item.quantity || 1);
                    });
                } else {
                    // Fallback for old transaction format
                    const service = transaction.service || transaction.product || transaction.item || 'General Service';
                    const amount = parseFloat(transaction.total || transaction.amount || 0);
                    
                    if (!serviceStats[service]) {
                        serviceStats[service] = {
                            name: service,
                            sales: 0,
                            revenue: 0,
                            averagePrice: 0,
                            firstSale: date,
                            lastSale: date,
                            clients: new Set()
                        };
                    }
                    
                    serviceStats[service].sales++;
                    serviceStats[service].revenue += amount;
                    serviceStats[service].lastSale = date > serviceStats[service].lastSale ? date : serviceStats[service].lastSale;
                    serviceStats[service].firstSale = date < serviceStats[service].firstSale ? date : serviceStats[service].firstSale;
                    
                    if (client) {
                        serviceStats[service].clients.add(client);
                    }
                    
                    totalRevenue += amount;
                    totalSales++;
                }
            });
            
            // Calculate averages and sort by revenue
            const services = Object.values(serviceStats).map(service => {
                service.averagePrice = service.revenue / service.sales;
                service.revenuePercentage = (service.revenue / totalRevenue) * 100;
                service.salesPercentage = (service.sales / totalSales) * 100;
                service.uniqueClients = service.clients.size;
                return service;
            }).sort((a, b) => b.revenue - a.revenue);
            
            response += `📊 **SERVICE PERFORMANCE OVERVIEW:**\n`;
            response += `• Total services offered: ${services.length}\n`;
            response += `• Total sales recorded: ${totalSales}\n`;
            response += `• Total revenue generated: ${this.formatCurrency(totalRevenue)}\n\n`;
            
            response += `🥇 **TOP PERFORMING SERVICES:**\n\n`;
            
            services.forEach((service, index) => {
                const rank = index + 1;
                const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                
                response += `${emoji} **${service.name}**\n`;
                response += `   💰 **Revenue:** ${this.formatCurrency(service.revenue)} (${service.revenuePercentage.toFixed(1)}% of total)\n`;
                response += `   📊 **Sales:** ${service.sales} times (${service.salesPercentage.toFixed(1)}% of all sales)\n`;
                response += `   💵 **Average price:** ${this.formatCurrency(service.averagePrice)}\n`;
                
                if (service.uniqueClients > 0) {
                    response += `   👥 **Unique clients:** ${service.uniqueClients}\n`;
                }
                
                // Calculate days since last sale
                const daysSinceLastSale = Math.floor((new Date() - service.lastSale) / (1000 * 60 * 60 * 24));
                response += `   📅 **Last sold:** ${daysSinceLastSale === 0 ? 'Today' : daysSinceLastSale + ' days ago'}\n`;
                
                // Performance rating
                if (rank === 1) {
                    response += `   ⭐ **Status:** Your #1 money-maker! 🔥\n`;
                } else if (rank === 2) {
                    response += `   ⭐ **Status:** Strong performer! 💪\n`;
                } else if (rank === 3) {
                    response += `   ⭐ **Status:** Good revenue generator 👍\n`;
                } else if (service.revenuePercentage < 5) {
                    response += `   ⭐ **Status:** Low performer - consider improvement 📈\n`;
                } else {
                    response += `   ⭐ **Status:** Solid contributor\n`;
                }
                
                response += `\n`;
            });
            
            // Best service insights
            if (services.length > 0) {
                const bestService = services[0];
                const worstService = services[services.length - 1];
                
                response += `🎯 **KEY INSIGHTS:**\n\n`;
                
                response += `**🏆 Your Champion Service: ${bestService.name}**\n`;
                response += `• Generates ${bestService.revenuePercentage.toFixed(1)}% of your total revenue\n`;
                response += `• Sold ${bestService.sales} times at ${this.formatCurrency(bestService.averagePrice)} average\n`;
                response += `• **Strategy:** This is your bread and butter - promote it heavily!\n\n`;
                
                if (services.length > 1) {
                    response += `**📊 Performance Gap Analysis:**\n`;
                    response += `• Best: ${bestService.name} (${this.formatCurrency(bestService.revenue)})\n`;
                    response += `• Weakest: ${worstService.name} (${this.formatCurrency(worstService.revenue)})\n`;
                    response += `• Gap: ${this.formatCurrency(bestService.revenue - worstService.revenue)}\n\n`;
                    
                    if (bestService.revenue > worstService.revenue * 3) {
                        response += `**⚠️ Recommendation:** Your service offerings are imbalanced.\n`;
                        response += `Consider improving or removing underperforming services.\n\n`;
                    }
                }
                
                // Service optimization recommendations
                response += `💡 **SERVICE OPTIMIZATION RECOMMENDATIONS:**\n\n`;
                
                // For top performers
                const topServices = services.slice(0, 3);
                response += `**🚀 Double Down on Winners:**\n`;
                topServices.forEach(service => {
                    response += `• **${service.name}:** Create premium version (+30% price)\n`;
                });
                response += `\n`;
                
                // For underperformers
                const underperformers = services.filter(s => s.revenuePercentage < 10);
                if (underperformers.length > 0) {
                    response += `**📈 Improve or Remove:**\n`;
                    underperformers.forEach(service => {
                        if (service.sales < 3) {
                            response += `• **${service.name}:** Only ${service.sales} sales - consider discontinuing\n`;
                        } else {
                            response += `• **${service.name}:** Rebrand, reprice, or bundle with popular services\n`;
                        }
                    });
                    response += `\n`;
                }
                
                // Price optimization
                response += `**💰 Price Optimization:**\n`;
                services.forEach(service => {
                    if (service.averagePrice < 1000) {
                        response += `• **${service.name}:** Price too low (${this.formatCurrency(service.averagePrice)}) - consider ₱1,200+\n`;
                    } else if (service.averagePrice > 3000 && service.sales < 5) {
                        response += `• **${service.name}:** High price (${this.formatCurrency(service.averagePrice)}) but low sales - review market fit\n`;
                    }
                });
                response += `\n`;
            }
            
            // Actionable next steps
            response += `📋 **IMMEDIATE ACTION PLAN:**\n\n`;
            
            if (services.length > 0) {
                const bestService = services[0];
                response += `**This Week:**\n`;
                response += `1. **Promote your winner:** Feature "${bestService.name}" in all marketing\n`;
                response += `2. **Upsell opportunities:** Offer add-ons to "${bestService.name}" clients\n`;
                response += `3. **Price test:** Try ₱${(bestService.averagePrice * 1.1).toFixed(0)} for "${bestService.name}"\n`;
                response += `4. **Track competitors:** Research how others price similar services\n`;
                response += `5. **Customer feedback:** Ask why clients love "${bestService.name}"\n\n`;
                
                response += `**This Month:**\n`;
                response += `• Create 2-3 service bundles featuring "${bestService.name}"\n`;
                response += `• Launch "Customer Favorite" campaign around top services\n`;
                response += `• Train staff to recommend your best performers first\n`;
                response += `• Analyze which services lead to repeat bookings\n\n`;
            }
            
            response += `🏆 **SUCCESS METRICS TO TRACK:**\n`;
            response += `• Revenue per service type (monthly)\n`;
            response += `• Service popularity trends (which are growing/declining)\n`;
            response += `• Average transaction value per service\n`;
            response += `• Customer satisfaction per service type\n`;
            response += `• Repeat booking rates per service\n\n`;
            
            response += `💡 **Pro Tip:** Your best service is your competitive advantage. Build your entire business strategy around it!`;
            
            this.conversationContext.lastTopic = 'best_service';
            return response;
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Error analyzing best service', {
                    category: 'AI',
                    operation: 'analyze_best_service',
                    error: error
                });
            }
            return `🏆 **Service Analysis Error**\n\n❌ Sorry, I couldn't analyze your service data right now.\n\nPlease try:\n1. Refreshing the page\n2. Checking your internet connection\n3. Making sure POS data is saved properly\n\nThen ask me again! I'll give you a complete breakdown of your best-performing services.`;
        }
    }

    async handleServicesListQuery(intent) {
        try {
            const products = this.dataCache.products;
            
            if (!products || products.length === 0) {
                return `💎 **Your Spa Services**\n\n❌ **No services configured yet!**\n\nTo add your spa services:\n1. Go to **Services** section in the sidebar\n2. Click **"Add Service"**\n3. Enter service details (name, price, duration, category)\n4. Save your services\n\nOnce you have services set up, ask me again and I'll show you your complete service menu! 🌟`;
            }
            
            let response = `💎 **Your Spa Services Menu**\n\n`;
            response += `📊 **SERVICES OVERVIEW:**\n`;
            response += `• Total services available: ${products.length}\n`;
            response += `• Services in POS: ${products.filter(p => p.showInPOS).length}\n\n`;
            
            response += `🎯 **YOUR SERVICES:**\n\n`;
            
            // Group services by category
            const servicesByCategory = products.reduce((groups, service) => {
                const category = service.category || 'General';
                if (!groups[category]) {
                    groups[category] = [];
                }
                groups[category].push(service);
                return groups;
            }, {});
            
            // Display services by category
            Object.entries(servicesByCategory).forEach(([category, services]) => {
                response += `**${category.toUpperCase()} SERVICES:**\n`;
                
                services.forEach((service, index) => {
                    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '💫';
                    
                    response += `${emoji} **${service.name}**\n`;
                    response += `   💰 **Price:** ${this.formatCurrency(service.price || 0)}\n`;
                    response += `   ⏱️ **Duration:** ${service.duration ? service.duration + ' minutes' : 'Flexible'}\n`;
                    if (service.description) {
                        response += `   📝 **Description:** ${service.description}\n`;
                    }
                    response += `   🎯 **POS Status:** ${service.showInPOS ? 'Available in POS' : 'Not in POS'}\n\n`;
                });
            });
            
            // Add recommendations
            const highestPriced = products.reduce((max, service) => 
                (service.price || 0) > (max.price || 0) ? service : max, products[0]);
            
            response += `💡 **QUICK INSIGHTS:**\n\n`;
            response += `**🏆 Premium Service:** ${highestPriced.name} (${this.formatCurrency(highestPriced.price || 0)})\n`;
            response += `**📈 Revenue Potential:** Focus on promoting your higher-priced services\n`;
            response += `**🎯 Marketing Tip:** Bundle services together for package deals\n\n`;
            
            response += `💬 **Want more insights?** Ask me:\n`;
            response += `• "What's my best service?" - Performance analysis\n`;
            response += `• "Service revenue" - Sales breakdown by service\n`;
            response += `• "Profit tips" - Ways to increase service revenue`;
            
            this.conversationContext.lastTopic = 'services_list';
            return response;
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Error listing services', {
                    category: 'AI',
                    operation: 'list_services',
                    error: error
                });
            }
            return `💎 **Services List Error**\n\n❌ Sorry, I couldn't load your service list right now.\n\nPlease try:\n1. Refreshing the page\n2. Checking that services are properly saved\n3. Going to the Services section to verify your services\n\nThen ask me again! I'll show you your complete spa service menu.`;
        }
    }

    async handleInventoryQuery(intent) {
        try {
            const inventory = this.dataCache.inventory;
            if (!inventory || inventory.length === 0) {
                return `📦 **Detailed Inventory Analysis**\n\n❌ **No inventory data found!**\n\nTo get detailed stock analysis, please:\n1. Go to Inventory section\n2. Add your products and supplies\n3. Set quantity levels for each item\n4. Come back and ask me again!\n\nOnce you have data, I'll tell you:\n• Exactly which items are out of stock\n• Which items need urgent reordering\n• Current stock levels for each product\n• Recommendations for reorder quantities\n• Cost analysis for purchasing decisions`;
            }
            
            // Categorize items by stock level
            const lowStock = inventory.filter(item => {
                const current = parseInt(item.currentStock) || parseInt(item.quantity) || 0;
                const min = parseInt(item.minStock) || parseInt(item.minimumLevel) || 5;
                return current > 0 && current <= min;
            });
            
            const outOfStock = inventory.filter(item => {
                const current = parseInt(item.currentStock) || parseInt(item.quantity) || 0;
                return current === 0;
            });
            
            const normalStock = inventory.filter(item => {
                const current = parseInt(item.currentStock) || parseInt(item.quantity) || 0;
                const min = parseInt(item.minStock) || parseInt(item.minimumLevel) || 5;
                return current > min;
            });
            
            let response = `📦 **Complete Inventory Status Report**\n\n`;
            
            // Critical - Out of Stock
            if (outOfStock.length > 0) {
                response += `🚨 **CRITICAL - COMPLETELY OUT OF STOCK (${outOfStock.length} items):**\n`;
                outOfStock.forEach(item => {
                    const cost = parseFloat(item.cost) || parseFloat(item.price) || 0;
                    response += `• **${item.name}** - 0 units remaining\n`;
                    if (cost > 0) response += `  💰 Reorder cost: ${this.formatCurrency(cost * 10)} (suggested 10 units)\n`;
                });
                response += `\n⚡ **ACTION REQUIRED:** Buy these items TODAY or you'll lose sales!\n\n`;
            }
            
            // Warning - Low Stock
            if (lowStock.length > 0) {
                response += `⚠️ **LOW STOCK WARNING (${lowStock.length} items):**\n`;
                lowStock.forEach(item => {
                    const current = parseInt(item.currentStock) || parseInt(item.quantity) || 0;
                    const min = parseInt(item.minStock) || parseInt(item.minimumLevel) || 5;
                    const cost = parseFloat(item.cost) || parseFloat(item.price) || 0;
                    response += `• **${item.name}** - Only ${current} left (minimum: ${min})\n`;
                    if (cost > 0) {
                        const suggestedOrder = Math.max(20, min * 3);
                        response += `  💰 Suggested reorder: ${suggestedOrder} units (${this.formatCurrency(cost * suggestedOrder)})\n`;
                    }
                });
                response += `\n📅 **ACTION:** Reorder these within 3-5 days\n\n`;
            }
            
            // Good Stock Levels
            if (normalStock.length > 0) {
                response += `✅ **HEALTHY STOCK LEVELS (${normalStock.length} items):**\n`;
                normalStock.slice(0, 8).forEach(item => {
                    const current = parseInt(item.currentStock) || parseInt(item.quantity) || 0;
                    const min = parseInt(item.minStock) || parseInt(item.minimumLevel) || 5;
                    const daysLeft = Math.floor(current / Math.max(1, min / 7)); // Rough estimate
                    response += `• **${item.name}** - ${current} units (${daysLeft}+ days supply)\n`;
                });
                if (normalStock.length > 8) {
                    response += `• ... and ${normalStock.length - 8} more items with good stock\n`;
                }
                response += `\n`;
            }
            
            // Summary Stats
            response += `📊 **INVENTORY SUMMARY:**\n`;
            response += `• Total tracked items: ${inventory.length}\n`;
            response += `• 🚨 Out of stock: ${outOfStock.length} items\n`;
            response += `• ⚠️ Low stock: ${lowStock.length} items\n`;
            response += `• ✅ Good stock: ${normalStock.length} items\n`;
            
            // Calculate total reorder cost
            let totalReorderCost = 0;
            [...outOfStock, ...lowStock].forEach(item => {
                const cost = parseFloat(item.cost) || parseFloat(item.price) || 0;
                const isOut = outOfStock.includes(item);
                const suggestedQty = isOut ? 10 : Math.max(20, (parseInt(item.minStock) || 5) * 3);
                totalReorderCost += cost * suggestedQty;
            });
            
            if (totalReorderCost > 0) {
                response += `💳 **Estimated reorder cost: ${this.formatCurrency(totalReorderCost)}**\n`;
            }
            
            // Priority Actions
            if (outOfStock.length > 0 || lowStock.length > 0) {
                response += `\n🎯 **YOUR PRIORITY ACTIONS:**\n`;
                if (outOfStock.length > 0) {
                    response += `1. 🔥 **TODAY:** Buy ${outOfStock.length} out-of-stock items immediately\n`;
                }
                if (lowStock.length > 0) {
                    response += `${outOfStock.length > 0 ? '2' : '1'}. 📅 **THIS WEEK:** Reorder ${lowStock.length} low-stock items\n`;
                }
                response += `${outOfStock.length > 0 ? '3' : '2'}. 🔔 Set up automatic alerts when items hit minimum levels\n`;
                response += `${outOfStock.length > 0 ? '4' : '3'}. 💡 Consider bulk buying for better prices\n`;
            } else {
                response += `\n🎉 **Excellent!** Your inventory is well-managed. Keep monitoring daily to stay on top of stock levels.`;
            }
            
            this.conversationContext.lastTopic = 'inventory';
            return response;
            
        } catch (error) {
            return `📦 **Inventory Analysis Error**\n\n❌ Sorry, I couldn't load your inventory data right now.\n\nPlease try:\n1. Refreshing the page\n2. Checking your internet connection\n3. Making sure inventory data is saved properly\n\nThen ask me again! I'll give you a complete stock analysis.`;
        }
    }

    async handleProfitTips() {
        const transactions = this.dataCache.transactions;
        const inventory = this.dataCache.inventory;
        const employees = this.dataCache.employees;
        const hasData = transactions && transactions.length > 0;
        
        let response = `💰 **Complete Profit Optimization Strategies**\n\n`;
        
        // Current Performance Analysis
        if (hasData) {
            const avg = this.calculateAverageTransaction(transactions);
            const monthRevenue = this.calculateRevenue(transactions, new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            const dailyAvg = monthRevenue / new Date().getDate();
            
            response += `📊 **YOUR CURRENT PERFORMANCE:**\n`;
            response += `• Average transaction: ${this.formatCurrency(avg)}\n`;
            response += `• This month's revenue: ${this.formatCurrency(monthRevenue)}\n`;
            response += `• Daily average: ${this.formatCurrency(dailyAvg)}\n\n`;
            
            if (avg < 1500) {
                response += `⚠️ **PRIORITY:** Your average transaction (${this.formatCurrency(avg)}) is below industry standard (₱1,500+)\n\n`;
            }
        }
        
        response += `🚀 **IMMEDIATE PROFIT BOOSTERS:**\n\n`;
        
        response += `**1. SERVICE BUNDLING (Increase 30-50%)** 📦\n`;
        response += `• **Spa Package Deals:**\n`;
        response += `  - "Relaxation Package": Massage + Facial + Aromatherapy (₱2,500)\n`;
        response += `  - "Beauty Complete": Facial + Manicure + Pedicure (₱2,000)\n`;
        response += `  - "VIP Experience": Full spa day with lunch (₱4,500)\n`;
        response += `• **Benefits:** Customers spend more, feel they get better value\n`;
        response += `• **Implementation:** Create 3-5 packages, offer 15% discount vs individual services\n\n`;
        
        response += `**2. PEAK HOUR PRICING (Increase 15-25%)** ⏰\n`;
        response += `• **Premium hours:** 2 PM - 6 PM (busiest times)\n`;
        response += `• **Regular hours:** 10 AM - 2 PM, 6 PM - 8 PM\n`;
        response += `• **Discount hours:** 9 AM - 10 AM (encourage early bookings)\n`;
        response += `• **Weekend premium:** Add ₱200-500 to all services\n`;
        response += `• **Result:** ₱500-1,000 extra per busy-hour client\n\n`;
        
        response += `**3. UPSELLING STRATEGIES (Increase 20-40%)** 📈\n`;
        response += `• **Add-on services:**\n`;
        response += `  - Hot stone upgrade (+₱300)\n`;
        response += `  - Essential oil aromatherapy (+₱200)\n`;
        response += `  - Extended massage time (+₱500)\n`;
        response += `  - Scalp treatment (+₱400)\n`;
        response += `• **Product sales:** Sell home care products (50% markup)\n`;
        response += `• **Membership programs:** Monthly unlimited for ₱5,000\n\n`;
        
        response += `**4. COST OPTIMIZATION** 💡\n`;
        response += `• **Smart scheduling:** Match staff to demand\n`;
        response += `• **Inventory management:** Reduce waste by 20%\n`;
        response += `• **Energy savings:** LED lights, efficient equipment\n`;
        response += `• **Supplier negotiation:** Bulk buying for 10-15% discounts\n`;
        response += `• **Cross-training:** One person can handle multiple services\n\n`;
        
        response += `**5. CUSTOMER RETENTION (Increase lifetime value 200%+)** 🔄\n`;
        response += `• **Loyalty program:**\n`;
        response += `  - Visit 5 times, get 6th free\n`;
        response += `  - Spend ₱10,000, get ₱1,500 credit\n`;
        response += `  - Birthday month: 25% off any service\n`;
        response += `• **Rebooking incentives:** Book next appointment, get 10% off\n`;
        response += `• **Referral rewards:** ₱500 credit for successful referrals\n\n`;
        
        response += `**6. NEW REVENUE STREAMS** 🆕\n`;
        response += `• **Corporate packages:** Office group bookings\n`;
        response += `• **Bridal packages:** Complete wedding preparation\n`;
        response += `• **Home services:** Premium in-home spa (charge 50% more)\n`;
        response += `• **Online classes:** Virtual wellness sessions\n`;
        response += `• **Gift certificates:** Pre-paid revenue, great for cash flow\n\n`;
        
        // Personalized recommendations based on data
        if (hasData) {
            response += `🎯 **PERSONALIZED RECOMMENDATIONS FOR YOUR SPA:**\n\n`;
            
            const avg = this.calculateAverageTransaction(transactions);
            if (avg < 1000) {
                response += `**URGENT PRIORITY - Average Transaction Too Low:**\n`;
                response += `1. Immediately create 3 service bundles\n`;
                response += `2. Train staff to suggest add-ons with every service\n`;
                response += `3. Offer "upgrade for just ₱X more" options\n`;
                response += `**Target:** Increase from ₱${avg.toFixed(0)} to ₱1,500+ per client\n\n`;
            } else if (avg < 1500) {
                response += `**FOCUS ON UPSELLING:**\n`;
                response += `1. Package deals to increase transaction value\n`;
                response += `2. Premium service options\n`;
                response += `3. Product sales training for staff\n`;
                response += `**Target:** Increase from ₱${avg.toFixed(0)} to ₱2,000+ per client\n\n`;
            } else {
                response += `**OPTIMIZE HIGH PERFORMANCE:**\n`;
                response += `1. VIP membership programs\n`;
                response += `2. Premium location expansion\n`;
                response += `3. Corporate partnership development\n`;
                response += `**Target:** Maintain ₱${avg.toFixed(0)}+ while expanding capacity\n\n`;
            }
        }
        
        response += `💰 **PROFIT IMPACT CALCULATOR:**\n`;
        response += `• **Bundle services (50% adoption):** +₱15,000-25,000/month\n`;
        response += `• **Peak hour pricing:** +₱8,000-12,000/month\n`;
        response += `• **Successful upselling (30% rate):** +₱10,000-18,000/month\n`;
        response += `• **Loyalty program (20% retention boost):** +₱20,000-40,000/month\n`;
        response += `• **Combined strategies:** +₱50,000-100,000/month! 🚀\n\n`;
        
        response += `📋 **IMPLEMENTATION PLAN - START THIS WEEK:**\n\n`;
        response += `**Week 1:**\n`;
        response += `• Create 3 service bundle packages\n`;
        response += `• Train staff on upselling techniques\n`;
        response += `• Design loyalty program structure\n\n`;
        
        response += `**Week 2:**\n`;
        response += `• Launch bundle packages with promotional pricing\n`;
        response += `• Promote services during peak hours\n`;
        response += `• Start tracking upselling success rates\n\n`;
        
        response += `**Week 3:**\n`;
        response += `• Launch loyalty program\n`;
        response += `• Analyze first results and adjust pricing\n`;
        response += `• Train staff on advanced selling techniques\n\n`;
        
        response += `**Week 4:**\n`;
        response += `• Review all metrics and profitability\n`;
        response += `• Expand successful strategies\n`;
        response += `• Plan next month's profit initiatives\n\n`;
        
        response += `🏆 **SUCCESS METRICS TO TRACK:**\n`;
        response += `• Average transaction value (target: 20% increase)\n`;
        response += `• Service bundle adoption rate (target: 50%)\n`;
        response += `• Customer return rate (target: 70%+)\n`;
        response += `• Monthly revenue growth (target: 15%+)\n`;
        response += `• Profit margin improvement (target: 10%+)\n\n`;
        
        response += `💡 **PRO TIP:** Start with ONE strategy, master it, then add the next. Don't try to implement everything at once!`;
        
        this.conversationContext.lastTopic = 'profit';
        return response;
    }

    async handleSecurityConcern() {
        const inventory = this.dataCache.inventory;
        const transactions = this.dataCache.transactions;
        const employees = this.dataCache.employees;
        
        if (!inventory || inventory.length === 0) {
            return `🛡️ **Complete Loss Prevention Strategy**\n\n❌ **No inventory data to analyze for theft patterns.**\n\nTo detect theft and protect your business:\n\n**📊 IMMEDIATE SETUP:**\n1. Add all products to inventory system\n2. Set accurate stock levels and costs\n3. Record every sale and usage\n4. Track employee access\n\n**🔒 PHYSICAL SECURITY:**\n• Install security cameras in storage areas\n• Use locked cabinets for expensive items\n• Limit storage room access to managers only\n• Install motion sensors for after-hours monitoring\n\n**📋 INVENTORY CONTROLS:**\n• Daily spot checks on high-value items\n• Weekly full inventory counts\n• Monthly variance reports\n• Require signatures for inventory usage\n\n**👥 STAFF PROTOCOLS:**\n• Background checks for all employees\n• Clear theft policies with consequences\n• Anonymous reporting system\n• Regular training on security procedures\n\n**💰 FINANCIAL CONTROLS:**\n• Separate ordering and receiving duties\n• Require manager approval for returns\n• Daily cash counts by different people\n• Regular surprise audits\n\nStart tracking inventory and I'll analyze patterns to detect potential theft! 🔍`;
        }
        
        // Analyze inventory for suspicious patterns
        const suspiciousItems = [];
        const highValueItems = [];
        
        inventory.forEach(item => {
            const current = parseInt(item.currentStock) || parseInt(item.quantity) || 0;
            const min = parseInt(item.minStock) || parseInt(item.minimumLevel) || 5;
            const cost = parseFloat(item.cost) || parseFloat(item.price) || 0;
            
            // High value items that are low/out of stock
            if (cost > 500 && current <= min) {
                highValueItems.push({...item, current, cost});
            }
            
            // Items with unusually low stock
            if (current === 0 && min > 0) {
                suspiciousItems.push({...item, reason: 'Completely depleted', current, min});
            } else if (current < min * 0.3 && min > 10) {
                suspiciousItems.push({...item, reason: 'Unusually low (below 30% of minimum)', current, min});
            }
        });
        
        let response = `🛡️ **Complete Theft Detection & Loss Prevention Analysis**\n\n`;
        
        // Suspicious Activity Section
        if (suspiciousItems.length > 0) {
            response += `🚨 **SUSPICIOUS INVENTORY PATTERNS (${suspiciousItems.length} items):**\n`;
            suspiciousItems.slice(0, 5).forEach(item => {
                response += `• **${item.name}** - ${item.reason}\n`;
                response += `  Current: ${item.current}, Expected min: ${item.min}\n`;
            });
            response += `\n⚠️ **IMMEDIATE ACTION:** Investigate these discrepancies!\n\n`;
        }
        
        // High Value Monitoring
        if (highValueItems.length > 0) {
            response += `💎 **HIGH-VALUE ITEMS TO MONITOR (${highValueItems.length} items):**\n`;
            highValueItems.slice(0, 5).forEach(item => {
                response += `• **${item.name}** - ${this.formatCurrency(item.cost)} (${item.current} left)\n`;
            });
            response += `\n🔐 **Keep these items in locked storage!**\n\n`;
        }
        
        // Security Recommendations based on analysis
        response += `🔒 **PERSONALIZED SECURITY RECOMMENDATIONS:**\n\n`;
        
        if (suspiciousItems.length > 3) {
            response += `**🚨 HIGH RISK - Immediate Action Required:**\n`;
            response += `1. **Install cameras ASAP** in storage and work areas\n`;
            response += `2. **Daily inventory counts** for all high-value items\n`;
            response += `3. **Review employee access** - who has keys/access?\n`;
            response += `4. **Check for internal theft** - review recent transactions\n\n`;
        } else if (suspiciousItems.length > 0) {
            response += `**⚠️ MODERATE RISK - Enhanced Monitoring:**\n`;
            response += `1. **Weekly inventory audits** for flagged items\n`;
            response += `2. **Secure storage** for expensive products\n`;
            response += `3. **Track usage patterns** per employee\n\n`;
        } else {
            response += `**✅ LOW RISK - Maintain Good Practices:**\n`;
            response += `1. **Monthly inventory counts** to stay on top\n`;
            response += `2. **Basic security measures** are sufficient\n`;
            response += `3. **Continue monitoring** for changes\n\n`;
        }
        
        // Comprehensive Prevention Strategy
        response += `🛡️ **COMPLETE LOSS PREVENTION STRATEGY:**\n\n`;
        
        response += `**📹 PHYSICAL SECURITY:**\n`;
        response += `• Security cameras covering all storage areas\n`;
        response += `• Motion sensors for after-hours alerts\n`;
        response += `• Locked cabinets for items over ₱1,000\n`;
        response += `• Key access log (who, when, why)\n`;
        response += `• Good lighting in all work areas\n\n`;
        
        response += `**📋 INVENTORY CONTROLS:**\n`;
        response += `• Daily spot checks on random items\n`;
        response += `• Weekly full counts by different staff\n`;
        response += `• Monthly variance analysis\n`;
        response += `• Require signatures for large withdrawals\n`;
        response += `• Photo documentation of damaged items\n\n`;
        
        response += `**👥 STAFF MANAGEMENT:**\n`;
        response += `• Clear theft policy with consequences\n`;
        response += `• Anonymous tip system for reporting\n`;
        response += `• Regular training on security procedures\n`;
        response += `• Background checks for new hires\n`;
        response += `• Separate duties (ordering vs receiving)\n\n`;
        
        response += `**🎯 WHAT TO DO THIS WEEK:**\n`;
        if (suspiciousItems.length > 0) {
            response += `1. **Investigate flagged items** - where did they go?\n`;
            response += `2. **Count all inventory** to establish baseline\n`;
            response += `3. **Install basic security camera** if not already done\n`;
        } else {
            response += `1. **Set up weekly inventory counting** schedule\n`;
            response += `2. **Create security checklist** for staff\n`;
            response += `3. **Review current access controls**\n`;
        }
        response += `4. **Train staff on proper procedures**\n`;
        response += `5. **Document all security measures**\n\n`;
        
        // Cost of Theft Analysis
        if (suspiciousItems.length > 0) {
            let potentialLoss = 0;
            suspiciousItems.forEach(item => {
                const cost = parseFloat(item.cost) || parseFloat(item.price) || 0;
                const missing = Math.max(0, item.min - item.current);
                potentialLoss += cost * missing;
            });
            
            if (potentialLoss > 0) {
                response += `💰 **POTENTIAL LOSS ANALYSIS:**\n`;
                response += `• Estimated missing inventory value: ${this.formatCurrency(potentialLoss)}\n`;
                response += `• Monthly security system cost: ₱5,000-15,000\n`;
                response += `• **ROI:** Security investment pays for itself in 1-3 months!\n\n`;
            }
        }
        
        response += `🏆 **REMEMBER:** A secure business is a profitable business. Prevention costs less than replacement!`;
        
        this.conversationContext.lastTopic = 'security';
        return response;
    }

    async handleOperatingHours() {
        const transactions = this.dataCache.transactions;
        
        if (!transactions || transactions.length === 0) {
            return `⏰ **Complete Operating Hours Analysis**\n\n❌ **No sales data to analyze your optimal hours.**\n\nTo find your best times and when to close:\n\n**📊 WHAT I'LL ANALYZE (once you have data):**\n• Peak revenue hours vs slow hours\n• Best days of the week for business\n• When to close early to save costs\n• Hourly revenue comparisons\n\n**🏢 INDUSTRY BENCHMARKS FOR SPAS:**\n\n**⏰ TYPICAL HOURS:**\n• **Open:** 9:00 AM - 10:00 AM\n• **Close:** 7:00 PM - 8:00 PM\n• **Lunch break:** 12:00 PM - 1:00 PM (optional)\n\n**📈 TYPICAL PEAK TIMES:**\n• **Morning rush:** 10:00 AM - 12:00 PM\n• **Afternoon peak:** 2:00 PM - 6:00 PM\n• **Weekend busy:** 10:00 AM - 4:00 PM\n\n**📉 TYPICALLY SLOW:**\n• **Early morning:** 9:00 AM - 10:00 AM\n• **Lunch time:** 12:00 PM - 1:00 PM\n• **Late evening:** 6:00 PM - 8:00 PM\n• **Monday mornings** and **Sunday evenings**\n\n**💡 RECOMMENDED SCHEDULE:**\n• **Monday-Friday:** 10:00 AM - 7:00 PM\n• **Saturday:** 9:00 AM - 6:00 PM\n• **Sunday:** 11:00 AM - 5:00 PM\n\n**💰 COST SAVINGS:**\n• Close 1 hour early on slow days = Save ₱2,000-3,000/month\n• Reduce staff during lunch = Save ₱1,500/month\n• Close Sundays if revenue < ₱3,000 = Save ₱8,000/month\n\nStart recording sales and I'll give you personalized recommendations! 📊`;
        }
        
        // Analyze hourly patterns
        const hourlyData = {};
        const dailyData = {};
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        
        transactions.forEach(t => {
            const date = new Date(t.date);
            const hour = date.getHours();
            const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            const amount = parseFloat(t.total) || parseFloat(t.amount) || 0;
            
            // Hourly analysis
            if (!hourlyData[hour]) {
                hourlyData[hour] = { count: 0, revenue: 0, avgTransaction: 0 };
            }
            hourlyData[hour].count++;
            hourlyData[hour].revenue += amount;
            
            // Daily analysis
            if (!dailyData[day]) {
                dailyData[day] = { count: 0, revenue: 0, name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day] };
            }
            dailyData[day].count++;
            dailyData[day].revenue += amount;
        });
        
        // Calculate averages
        Object.keys(hourlyData).forEach(hour => {
            if (hourlyData[hour].count > 0) {
                hourlyData[hour].avgTransaction = hourlyData[hour].revenue / hourlyData[hour].count;
            }
        });
        
        // Sort by revenue
        const hoursSorted = Object.entries(hourlyData)
            .map(([h, d]) => ({ hour: parseInt(h), ...d }))
            .sort((a, b) => b.revenue - a.revenue);
        
        const daysSorted = Object.entries(dailyData)
            .map(([d, data]) => ({ day: parseInt(d), ...data }))
            .sort((a, b) => b.revenue - a.revenue);
        
        let response = `⏰ **Complete Operating Hours Analysis & Best Times Report**\n\n`;
        
        // Peak Hours Analysis
        if (hoursSorted.length > 0) {
            const topHours = hoursSorted.slice(0, 3);
            const slowHours = hoursSorted.slice(-3).reverse();
            
            response += `🚀 **YOUR PEAK HOURS (Top 3):**\n`;
            topHours.forEach((hour, index) => {
                response += `${index + 1}. **${this.formatHour(hour.hour)}** - ${this.formatCurrency(hour.revenue)} (${hour.count} sales)\n`;
                response += `   Average per transaction: ${this.formatCurrency(hour.avgTransaction)}\n`;
            });
            response += `\n`;
            
            response += `📉 **YOUR SLOWEST HOURS (Bottom 3):**\n`;
            slowHours.forEach((hour, index) => {
                response += `${index + 1}. **${this.formatHour(hour.hour)}** - ${this.formatCurrency(hour.revenue)} (${hour.count} sales)\n`;
            });
            response += `\n`;
        }
        
        // Best Days Analysis
        if (daysSorted.length > 0) {
            response += `📅 **BEST DAYS OF THE WEEK:**\n`;
            daysSorted.forEach((day, index) => {
                const emoji = index < 2 ? '🔥' : index < 4 ? '👍' : '📉';
                response += `${index + 1}. ${emoji} **${day.name}** - ${this.formatCurrency(day.revenue)} (${day.count} sales)\n`;
            });
            response += `\n`;
        }
        
        // Smart Recommendations
        response += `💡 **SMART OPERATING RECOMMENDATIONS:**\n\n`;
        
        if (hoursSorted.length >= 3) {
            const topHour = hoursSorted[0];
            const slowestHour = hoursSorted[hoursSorted.length - 1];
            const revenueGap = topHour.revenue - slowestHour.revenue;
            
            if (revenueGap > topHour.revenue * 0.5) { // 50% difference
                response += `**🎯 PRIORITY ACTIONS:**\n`;
                response += `1. **Extend hours during peak (${this.formatHour(topHour.hour)}):**\n`;
                response += `   • Stay open 1 hour later on busy days\n`;
                response += `   • Add extra staff during ${this.formatHour(topHour.hour)}\n`;
                response += `   • Potential extra revenue: ${this.formatCurrency(topHour.avgTransaction * 2)}/day\n\n`;
                
                response += `2. **Consider closing early during slow hours (${this.formatHour(slowestHour.hour)}):**\n`;
                response += `   • Close 1 hour early = Save ₱1,000-2,000/day in costs\n`;
                response += `   • Current revenue loss: Only ${this.formatCurrency(slowestHour.revenue)}\n`;
                response += `   • **Net savings: ₱500-1,500/day** 💰\n\n`;
            }
        }
        
        // Weekly Schedule Optimization
        if (daysSorted.length > 0) {
            const bestDay = daysSorted[0];
            const worstDay = daysSorted[daysSorted.length - 1];
            
            response += `**📋 OPTIMIZED WEEKLY SCHEDULE:**\n`;
            
            daysSorted.forEach(day => {
                if (day.revenue > bestDay.revenue * 0.7) { // Good days (70%+ of best)
                    response += `• **${day.name}:** Full hours (10 AM - 7 PM) 🔥\n`;
                } else if (day.revenue > bestDay.revenue * 0.4) { // Decent days (40-70%)
                    response += `• **${day.name}:** Reduced hours (11 AM - 6 PM) 👍\n`;
                } else { // Poor days (<40%)
                    response += `• **${day.name}:** Consider closing or short hours (12 PM - 5 PM) 📉\n`;
                }
            });
            response += `\n`;
        }
        
        // Cost-Benefit Analysis
        response += `💰 **COST-BENEFIT ANALYSIS:**\n\n`;
        
        const totalRevenue = hoursSorted.reduce((sum, h) => sum + h.revenue, 0);
        const avgHourlyRevenue = totalRevenue / hoursSorted.length;
        
        const lowPerformingHours = hoursSorted.filter(h => h.revenue < avgHourlyRevenue * 0.3);
        
        if (lowPerformingHours.length > 0) {
            const savingsPerHour = 1500; // Estimated cost per hour (staff + utilities)
            const potentialSavings = lowPerformingHours.length * savingsPerHour * 30; // Monthly
            const revenueLoss = lowPerformingHours.reduce((sum, h) => sum + h.revenue, 0) * 30;
            
            response += `**💡 COST OPTIMIZATION OPPORTUNITY:**\n`;
            response += `• Close ${lowPerformingHours.length} low-performing hours daily\n`;
            response += `• **Monthly cost savings:** ${this.formatCurrency(potentialSavings)}\n`;
            response += `• **Monthly revenue loss:** ${this.formatCurrency(revenueLoss)}\n`;
            response += `• **Net monthly benefit:** ${this.formatCurrency(potentialSavings - revenueLoss)} 💰\n\n`;
            
            if (potentialSavings > revenueLoss) {
                response += `✅ **RECOMMENDATION:** Close during these hours to increase profit!\n\n`;
            } else {
                response += `⚠️ **RECOMMENDATION:** Keep current hours but consider promotions during slow times.\n\n`;
            }
        }
        
        // Specific Time Recommendations
        response += `🎯 **SPECIFIC RECOMMENDATIONS FOR THIS WEEK:**\n\n`;
        
        if (hoursSorted.length > 0) {
            const bestHour = hoursSorted[0];
            const worstHour = hoursSorted[hoursSorted.length - 1];
            
            response += `1. **Best time to schedule premium services:** ${this.formatHour(bestHour.hour)} (highest revenue)\n`;
            response += `2. **Best time for staff training:** ${this.formatHour(worstHour.hour)} (lowest activity)\n`;
            response += `3. **Consider early closing:** After ${this.formatHour(worstHour.hour)} on slow days\n`;
            response += `4. **Staff lunch breaks:** During ${this.formatHour(worstHour.hour)} to minimize impact\n`;
            response += `5. **Run promotions:** During slow hours to boost revenue\n\n`;
        }
        
        // Best Closing Time Recommendation
        const eveningHours = hoursSorted.filter(h => h.hour >= 17 && h.hour <= 21); // 5 PM to 9 PM
        if (eveningHours.length > 0) {
            eveningHours.sort((a, b) => a.revenue - b.revenue); // Sort by revenue (lowest first)
            const worstEveningHour = eveningHours[0];
            
            response += `🏁 **BEST TIME TO CLOSE:**\n`;
            response += `• **Current worst evening hour:** ${this.formatHour(worstEveningHour.hour)}\n`;
            response += `• **Revenue after this time:** ${this.formatCurrency(worstEveningHour.revenue)}\n`;
            response += `• **Recommended closing:** ${this.formatHour(Math.max(17, worstEveningHour.hour - 1))}\n`;
            response += `• **Why:** Maximize profit by avoiding low-revenue hours with high costs\n\n`;
        }
        
        response += `📊 **Want more insights?** Ask me about "profit tips" or "staff management"!`;
        
        this.conversationContext.lastTopic = 'operating_hours';
        return response;
    }

    async handleSyncStatus() {
        try {
            // Get sync status from IndexedDB settings
            const lastSyncSetting = await db.get('settings', 'lastSync');
            const lastSyncValue = lastSyncSetting?.value;
            
            // Get sync manager status if available
            const syncManager = window.syncManager;
            const isOnline = navigator.onLine;
            
            let response = `🔄 **Data Synchronization Status**\n\n`;
            
            // Last sync information
            if (lastSyncValue) {
                const lastSyncDate = new Date(lastSyncValue);
                const now = new Date();
                const timeDiff = now - lastSyncDate;
                const minutesAgo = Math.floor(timeDiff / (1000 * 60));
                const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
                const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                
                let timeAgoText;
                if (minutesAgo < 1) {
                    timeAgoText = "just now";
                } else if (minutesAgo < 60) {
                    timeAgoText = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
                } else if (hoursAgo < 24) {
                    timeAgoText = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
                } else {
                    timeAgoText = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
                }
                
                response += `✅ **Last Successful Sync:** ${timeAgoText}\n`;
                response += `📅 **Exact Time:** ${lastSyncDate.toLocaleString()}\n\n`;
                
                // Sync freshness indicator
                if (minutesAgo < 5) {
                    response += `🟢 **Status:** Data is fresh and up-to-date\n`;
                } else if (minutesAgo < 30) {
                    response += `🟡 **Status:** Data is recent\n`;
                } else if (hoursAgo < 24) {
                    response += `🟠 **Status:** Data may need refreshing\n`;
                } else {
                    response += `🔴 **Status:** Data is outdated, sync recommended\n`;
                }
            } else {
                response += `❌ **Last Sync:** Never synced\n`;
                response += `🔴 **Status:** No sync data available\n`;
            }
            
            // Connection status
            response += `\n📡 **Connection Status:**\n`;
            response += `• Internet: ${isOnline ? '🟢 Connected' : '🔴 Offline'}\n`;
            
            // Sync manager status
            if (syncManager) {
                const isProcessing = syncManager.syncInProgress;
                response += `• Sync Service: ${isProcessing ? '🔄 Currently syncing...' : '🟢 Ready'}\n`;
            } else {
                response += `• Sync Service: 🟡 Initializing...\n`;
            }
            
            // Data summary
            const transactions = this.dataCache.transactions || [];
            const products = this.dataCache.products || [];
            const inventory = this.dataCache.inventory || [];
            const employees = this.dataCache.employees || [];
            
            response += `\n📊 **Current Data Summary:**\n`;
            response += `• Transactions: ${transactions.length}\n`;
            response += `• Services: ${products.length}\n`;
            response += `• Inventory Items: ${inventory.length}\n`;
            response += `• Employees: ${employees.length}\n`;
            
            // Recommendations
            response += `\n💡 **Recommendations:**\n`;
            if (!lastSyncValue) {
                response += `• Click the "Sync Now" button to sync your data\n`;
                response += `• Make sure you're connected to the internet\n`;
            } else if (hoursAgo > 24) {
                response += `• Your data is outdated - sync now for latest info\n`;
                response += `• Consider enabling automatic sync\n`;
            } else if (minutesAgo > 30) {
                response += `• Data is getting old - sync for freshest data\n`;
            } else {
                response += `• Your data is current and synced! ✨\n`;
                response += `• All systems are working properly\n`;
            }
            
            // Quick sync option
            if (isOnline && syncManager && !syncManager.syncInProgress) {
                response += `\n🚀 **Quick Action:** Type "sync now" to start immediate sync!`;
            }
            
            return response;
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Error getting sync status', {
                    category: 'AI',
                    operation: 'get_sync_status',
                    error: error
                });
            }
            return `🔄 **Sync Status Check Failed**\n\n❌ Unable to retrieve sync information.\n\nThis might be because:\n• Database is not initialized\n• System is still loading\n• There's a technical issue\n\nTry refreshing the page or contact support if the problem persists.`;
        }
    }

    async handleSyncNow() {
        try {
            const syncManager = window.syncManager;
            const isOnline = navigator.onLine;
            
            if (!isOnline) {
                return `🔄 **Sync Request**\n\n❌ **Cannot sync - you're offline!**\n\n📡 Please check your internet connection and try again.\n\nOnce you're back online, I can help you sync your data to the cloud.`;
            }
            
            if (!syncManager) {
                return `🔄 **Sync Request**\n\n⏳ **Sync service is still initializing...**\n\nPlease wait a moment and try again, or use the manual sync button in the top-right corner.`;
            }
            
            if (syncManager.syncInProgress) {
                return `🔄 **Sync Request**\n\n⚡ **Sync is already in progress!**\n\nPlease wait for the current sync to complete. You should see a notification when it's done.`;
            }
            
            // Trigger the sync
            try {
                await syncManager.syncAll();
                
                // Get updated sync status
                const lastSyncSetting = await db.get('settings', 'lastSync');
                const syncTime = lastSyncSetting?.value ? new Date(lastSyncSetting.value).toLocaleString() : 'just now';
                
                return `🔄 **Sync Completed Successfully!** ✅\n\n🎉 **Your data has been synced to the cloud!**\n\n📅 **Sync Time:** ${syncTime}\n\n📊 **What was synced:**\n• All transactions and sales data\n• Product/service information\n• Inventory levels\n• Employee data\n• Business metrics\n\n✨ **Your data is now up-to-date across all devices!**\n\nType "last sync" anytime to check your sync status.`;
                
            } catch (syncError) {
                if (window.logger) {
                    window.logger.error('Chatbot sync error', {
                        category: 'AI',
                        operation: 'sync_chat',
                        error: syncError
                    });
                }
                return `🔄 **Sync Failed** ❌\n\n😔 **Something went wrong during sync.**\n\n**Possible reasons:**\n• Network connection issues\n• Server temporarily unavailable\n• Authentication problems\n\n**What to try:**\n• Check your internet connection\n• Try again in a few moments\n• Use the manual sync button\n• Refresh the page if problems persist\n\n**Error details:** ${syncError.message || 'Unknown error'}`;
            }
            
        } catch (error) {
            if (window.logger) {
                window.logger.error('Error handling sync now', {
                    category: 'AI',
                    operation: 'handle_sync_now',
                    error: error
                });
            }
            return `🔄 **Sync Error**\n\n❌ Unable to start sync process.\n\nPlease try using the sync button in the top-right corner, or refresh the page and try again.`;
        }
    }

    async handleMarketingAdvice() {
        const transactions = this.dataCache.transactions;
        const hasData = transactions && transactions.length > 0;
        
        let response = `📈 **Marketing Strategies for Your Spa**\n\n`;
        
        response += `**1. Digital Marketing (Most Important!)** 📱\n`;
        response += `• Post before/after photos on Instagram daily\n`;
        response += `• Use hashtags: #SpaTreatment #Relaxation #YourCity\n`;
        response += `• Run Facebook ads targeting women 25-55 within 5km\n`;
        response += `• Claim and optimize your Google My Business listing\n`;
        response += `• Ask happy clients for Google reviews (aim for 50+ reviews)\n\n`;
        
        response += `**2. Customer Acquisition (Get New Clients)** 🎯\n`;
        response += `• First-time visitor special: 20% off any service\n`;
        response += `• Partner with local gyms and hotels for referrals\n`;
        response += `• Host a monthly "Spa Open House" with mini treatments\n`;
        response += `• Create a referral program: Both parties get 15% off\n\n`;
        
        response += `**3. Customer Retention (Keep Them Coming)** 💝\n`;
        response += `• Loyalty card: Buy 5 treatments, get 1 free\n`;
        response += `• Monthly membership: $99/month for 20% off all services\n`;
        response += `• Birthday month special: 30% off any treatment\n`;
        response += `• Send SMS reminders for rebooking after 4 weeks\n\n`;
        
        response += `**4. Seasonal Campaigns** 🎉\n`;
        response += `• Valentine's: Couples massage packages\n`;
        response += `• Mother's Day: Mom & daughter spa day\n`;
        response += `• Summer: "Beach body" treatment packages\n`;
        response += `• December: Gift certificate promotions\n\n`;
        
        if (hasData && transactions.length < 50) {
            response += `**🎯 Your Priority:** Focus on acquisition - you need more customers!\n`;
            response += `Start with Instagram posts and Google reviews this week.`;
        } else if (hasData) {
            response += `**🎯 Your Priority:** Focus on retention - keep your existing clients happy!\n`;
            response += `Launch a loyalty program this week.`;
            } else {
            response += `**🎯 Start Here:** Create your Google Business profile today and post on Instagram!`;
        }
        
        response += `\n\nWant details on any specific strategy? Just ask! 😊`;
        
        this.conversationContext.lastTopic = 'marketing';
            return response;
    }

    async handleStaffManagement() {
        const employees = this.dataCache.employees;
        const transactions = this.dataCache.transactions;
        const hasEmployeeData = employees && employees.length > 0;
        
        let response = `👥 **Complete Staff Management & Coaching Guide**\n\n`;
        
        if (hasEmployeeData) {
            response += `📊 **YOUR CURRENT TEAM:** ${employees.length} staff members\n\n`;
        } else {
            response += `❌ **No staff data found.** Add team members to track performance.\n\n`;
        }
        
        response += `🎯 **COMPLETE STAFF MANAGEMENT SYSTEM:**\n\n`;
        
        response += `**1. PERFORMANCE MANAGEMENT** 📈\n`;
        response += `• **Monthly targets for each staff:**\n`;
        response += `  - Revenue target: ₱25,000-50,000/month\n`;
        response += `  - Customer satisfaction: 4.5+ stars average\n`;
        response += `  - Upselling rate: 30% of services\n`;
        response += `  - Product sales: ₱5,000/month minimum\n`;
        response += `• **Weekly one-on-one meetings:**\n`;
        response += `  - Review performance metrics\n`;
        response += `  - Address concerns and challenges\n`;
        response += `  - Set weekly goals and provide coaching\n\n`;
        
        response += `**2. TRAINING & DEVELOPMENT** 🎓\n`;
        response += `• **Technical skills:** Massage, facial, product knowledge\n`;
        response += `• **Customer service:** Greeting, consultation, problem-solving\n`;
        response += `• **Sales training:** Upselling, packages, retention strategies\n`;
        response += `• **Cross-training:** Every staff can do 2-3 services\n\n`;
        
        response += `**3. MOTIVATION & INCENTIVES** 🏆\n`;
        response += `• **Commission structure:**\n`;
        response += `  - Base salary + 10-15% commission on services\n`;
        response += `  - 20% commission on product sales\n`;
        response += `  - Bonus for exceeding monthly targets\n`;
        response += `• **Recognition:** Employee of month, best reviews, achievement awards\n`;
        response += `• **Career advancement:** Senior roles, trainer positions, management track\n\n`;
        
        response += `**4. TEAM BUILDING & CULTURE** 🤝\n`;
        response += `• **Monthly activities:** Team dinner, workshops, wellness activities\n`;
        response += `• **Communication:** Daily huddles, weekly meetings, feedback system\n`;
        response += `• **Work environment:** Comfortable breaks, uniforms, fair scheduling\n\n`;
        
        response += `**5. DEALING WITH ISSUES** ⚠️\n`;
        response += `• **Common problems:** Late arrivals, poor reviews, low sales, attitude\n`;
        response += `• **Solutions:** Training, coaching, mentoring, clear expectations\n`;
        response += `• **Progressive discipline:** Verbal → Written → Final → Termination\n\n`;
        
        response += `📋 **START THIS WEEK:**\n`;
        response += `• Set clear job descriptions and KPIs\n`;
        response += `• Schedule weekly one-on-one meetings\n`;
        response += `• Create training and incentive programs\n`;
        response += `• Track performance metrics and satisfaction\n\n`;
        
        response += `💡 **REMEMBER:** Great staff = Happy customers = More profit!`;
        
        this.conversationContext.lastTopic = 'staff_management';
        return response;
    }

    async handleForecast(intent) {
        const transactions = this.dataCache.transactions;
        if (!transactions || transactions.length < 7) {
            return `🔮 **Monthly Earnings Forecast**\n\n📊 I need at least 7 days of sales data to predict your earnings accurately.\n\n**Current data:** ${transactions ? transactions.length : 0} transaction(s)\n\n**General Spa Industry Benchmarks:**\n• Small spa: ₱150,000 - ₱300,000/month\n• Medium spa: ₱300,000 - ₱600,000/month\n• Large spa: ₱600,000+ /month\n\n**To maximize earnings:**\n• Aim for 5-8 clients per day\n• Average service price: ₱1,500-2,500\n• Focus on package deals\n• Maintain 70%+ rebooking rate\n\nStart recording your sales and I'll give you personalized predictions! 💪`;
        }
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const daysInMonth = new Date(now.getFullYear(), currentMonth + 1, 0).getDate();
        const daysPassed = now.getDate();
        const daysRemaining = daysInMonth - daysPassed;
        
        const last30 = new Date();
        last30.setDate(last30.getDate() - 30);
        const revenue30Days = this.calculateRevenue(transactions, last30);
        const dailyAvg = revenue30Days / 30;
        
        // Calculate this month's actual revenue
        const thisMonth = new Date(now.getFullYear(), currentMonth, 1);
        const monthRevenue = this.calculateRevenue(transactions, thisMonth);
        const projectedMonthTotal = monthRevenue + (dailyAvg * daysRemaining);
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentMonthName = monthNames[currentMonth];
        
        let response = `🔮 **How Much You'll Earn This Month (${currentMonthName})**\n\n`;
        
        response += `**📊 Current Performance:**\n`;
        response += `• Earned so far: ${this.formatCurrency(monthRevenue)}\n`;
        response += `• Days passed: ${daysPassed} of ${daysInMonth}\n`;
        response += `• Daily average: ${this.formatCurrency(dailyAvg)}\n\n`;
        
        response += `**💰 This Month's Projection:**\n`;
        response += `• Expected total: ${this.formatCurrency(projectedMonthTotal)}\n`;
        response += `• Remaining to earn: ${this.formatCurrency(projectedMonthTotal - monthRevenue)}\n`;
        response += `• Days left: ${daysRemaining} days\n\n`;
        
        response += `**🎯 Monthly Targets:**\n`;
        response += `• Minimum goal: ${this.formatCurrency(projectedMonthTotal * 0.9)} (Easy)\n`;
        response += `• Target goal: ${this.formatCurrency(projectedMonthTotal)} (On track)\n`;
        response += `• Stretch goal: ${this.formatCurrency(projectedMonthTotal * 1.2)} (Challenge)\n\n`;
        
        response += `**📈 To Hit Your Stretch Goal:**\n`;
        const stretchDaily = (projectedMonthTotal * 1.2 - monthRevenue) / daysRemaining;
        response += `• Need ${this.formatCurrency(stretchDaily)}/day for remaining days\n`;
        response += `• That's about ${Math.ceil(stretchDaily / 1500)} clients per day\n`;
        response += `• Focus on high-value services and packages\n\n`;
        
        response += `**💡 Quick Tips to Boost This Month:**\n`;
        response += `• Run a "End of Month Special" - 15% off packages\n`;
        response += `• Call clients who haven't visited in 30+ days\n`;
        response += `• Upsell add-on treatments to existing bookings\n`;
        
        this.conversationContext.lastTopic = 'forecast';
                return response;
            }

    getTipCategories() {
        return `💡 **I'd love to help! What area should we focus on?**

💰 **Profit Optimization** - Increase your revenue
🛡️ **Loss Prevention** - Protect your inventory  
⏰ **Operating Hours** - Find your best times
📈 **Marketing** - Attract more customers
👥 **Staff Management** - Improve team performance
📦 **Inventory** - Smart stock management

Just tell me what you need help with! 😊`;
    }

    handleGratitude() {
        const responses = [
            "You're welcome! 😊 What else can I help with?",
            "Happy to help! 🌟 Anything else?",
            "My pleasure! 💪 What's next?",
            "Glad I could help! 🚀"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getHelpGuide() {
        return `📚 **Complete Guide - How to Use Your AI Business Assistant**

**🎯 Getting Started:**
Just talk to me naturally! Type your questions as you would ask a business consultant.

**💬 Example Questions You Can Ask:**

**📊 Business Analysis**
• "How's my business doing?"
• "Show me today's revenue"
• "What's my best selling service?"
• "Analyze my growth"

**👥 Staff Management**
• "Who's my best employee?"
• "Show staff performance"
• "How can I motivate my team?"

**📦 Inventory Control**
• "What's my inventory status?"
• "What needs restocking?"
• "Is someone stealing from me?"

**💰 Profit & Growth**
• "How can I increase profits?"
• "Give me marketing strategies"
• "Forecast my monthly earnings"
• "What are my peak hours?"

**🔍 Smart Features:**
• I analyze your actual data
• I provide specific recommendations
• I remember our conversation context
• I work offline and sync when online

**💡 Pro Tips:**
• Be specific for better answers
• Ask follow-up questions
• Request detailed explanations
• Use me daily for best insights

**⚡ Quick Commands:**
• **/help** - Show this guide

Ready to help you succeed! What would you like to know? 😊`;
    }
    
    provideHelp() {
        return this.getHelpGuide();
    }

    async handleGeneralQuery(message, intent) {
        const lowerMessage = message.toLowerCase();
        
        // Inventory-related keywords
        if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('supply') || 
            lowerMessage.includes('reorder') || lowerMessage.includes('out of stock') || lowerMessage.includes('low stock')) {
            return await this.handleInventoryQuery(intent);
        }
        
        // Financial report keywords (more comprehensive than revenue)
        if (lowerMessage.includes('financial') || lowerMessage.includes('finance') ||
            (lowerMessage.includes('business') && (lowerMessage.includes('report') || lowerMessage.includes('status') || lowerMessage.includes('overview'))) ||
            lowerMessage.includes('full report') || lowerMessage.includes('complete report') ||
            lowerMessage.includes('financial status') || lowerMessage.includes('financial report')) {
            return await this.handleFinancialReport(intent);
        }
        
        // Revenue-related keywords  
        if (lowerMessage.includes('revenue') || lowerMessage.includes('sales') || lowerMessage.includes('income') ||
            lowerMessage.includes('earnings') || lowerMessage.includes('money made') || lowerMessage.includes('total sales')) {
            return await this.handleRevenueQuery(intent);
        }
        
        // Employee-related keywords
        if (lowerMessage.includes('employee') || lowerMessage.includes('staff') || lowerMessage.includes('worker') ||
            lowerMessage.includes('best employee') || lowerMessage.includes('top performer') || lowerMessage.includes('team')) {
            return await this.handleEmployeeQuery(intent);
        }
        
        // Staff performance specific (show actual performance data)
        if ((lowerMessage.includes('staff') && lowerMessage.includes('performance')) ||
            (lowerMessage.includes('show') && lowerMessage.includes('staff')) ||
            lowerMessage.includes('staff sales') || lowerMessage.includes('employee sales')) {
            return await this.handleEmployeeQuery(intent);
        }
        
        // Forecast-related keywords
        if (lowerMessage.includes('forecast') || lowerMessage.includes('predict') || lowerMessage.includes('projection') ||
            lowerMessage.includes('earn') && lowerMessage.includes('month') || lowerMessage.includes('future earnings')) {
            return await this.handleForecast(intent);
        }
        
        // Marketing-related keywords
        if (lowerMessage.includes('marketing') || lowerMessage.includes('promote') || lowerMessage.includes('advertise') ||
            lowerMessage.includes('acquisition') || lowerMessage.includes('new customer') || lowerMessage.includes('new client') ||
            lowerMessage.includes('grow business') || lowerMessage.includes('get customers')) {
            return await this.handleMarketingAdvice();
        }
        
        // Profit-related keywords
        if (lowerMessage.includes('profit') || lowerMessage.includes('increase money') || lowerMessage.includes('make more') ||
            lowerMessage.includes('more profit') || lowerMessage.includes('profit tips')) {
            return await this.handleProfitTips();
        }
        
        // Security/theft-related keywords
        if (lowerMessage.includes('steal') || lowerMessage.includes('theft') || lowerMessage.includes('security') ||
            lowerMessage.includes('missing') || lowerMessage.includes('suspicious') || lowerMessage.includes('loss prevention') ||
            lowerMessage.includes('prevent theft') || lowerMessage.includes('cameras') || lowerMessage.includes('locks')) {
            return await this.handleSecurityConcern();
        }
        
        // Operating hours and timing keywords
        if (lowerMessage.includes('hours') || lowerMessage.includes('close') || lowerMessage.includes('open') ||
            lowerMessage.includes('best time') || lowerMessage.includes('peak time') || lowerMessage.includes('optimal') ||
            lowerMessage.includes('find') && lowerMessage.includes('time') || lowerMessage.includes('when to close')) {
            return await this.handleOperatingHours();
        }
        
        // Business analysis keywords
        if (lowerMessage.includes('business') && (lowerMessage.includes('doing') || lowerMessage.includes('performance') ||
            lowerMessage.includes('how') || lowerMessage.includes('analysis') || lowerMessage.includes('overview'))) {
            return await this.handleBusinessAnalysis(intent);
        }
        
        // Direct services inquiry - show available services
        if (lowerMessage === 'services' || lowerMessage === 'my services' || 
            lowerMessage === 'show services' || lowerMessage === 'show my services' ||
            lowerMessage === 'what services' || lowerMessage === 'list services') {
            return await this.handleServicesListQuery(intent);
        }
        
        // Service performance keywords
        if (lowerMessage.includes('service') && (lowerMessage.includes('best') || lowerMessage.includes('sell') ||
            lowerMessage.includes('popular') || lowerMessage.includes('top'))) {
            return await this.handleBestServiceQuery(intent);
        }
        
        // Best selling/performing service specific
        if ((lowerMessage.includes('best') && lowerMessage.includes('service')) || 
            (lowerMessage.includes('top') && lowerMessage.includes('service')) ||
            lowerMessage.includes('best selling') || lowerMessage.includes('most popular') ||
            lowerMessage.includes('which service sells')) {
            return await this.handleBestServiceQuery(intent);
        }
        
        // Default intelligent response
        return `I understand you're asking about "${message}". 

I can help you with:
• **Revenue analysis** - "show me my revenue"
• **Inventory status** - "what's my inventory status"  
• **Staff performance** - "show staff performance"
• **Best service** - "what is my best service"
• **Monthly forecast** - "how much will I earn this month"
• **Marketing guide** - "marketing strategies"
• **Profit strategies** - "profit tips"
• **Loss prevention** - "loss prevention"
• **Operating hours** - "find your best times"

Type **/help** for the complete guide. What would you like to know? 😊`;
    }

    noDataResponse(analysisType) {
        return `📊 I need some data to analyze ${analysisType}.

Start recording sales in the POS system, and I'll give you amazing insights!

Meanwhile, would you like some general business tips? 😊`;
    }

    getMotivationalMessage() {
        const msgs = ["Customers are coming! 💪", "First sale starts the day! 🌟", "Stay positive! 🚀"];
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    analyzeServices(transactions) {
        const stats = {};
                transactions.forEach(t => {
            if (t.items && Array.isArray(t.items)) {
                t.items.forEach(item => {
                    if (!stats[item.name]) stats[item.name] = { name: item.name, revenue: 0, count: 0 };
                    stats[item.name].revenue += (item.price || 0) * (item.quantity || 1);
                    stats[item.name].count += item.quantity || 1;
                });
            }
        });
        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }

    getTopEmployee(transactions, employees) {
        const stats = employees.map(emp => {
            const trans = transactions.filter(t => t.employeeId === emp.id || t.employeeId === emp.id.toString());
                return {
                    ...emp,
                salesCount: trans.length,
                revenue: trans.reduce((sum, t) => sum + (t.total || 0), 0)
            };
        }).sort((a, b) => b.revenue - a.revenue);
        return stats[0];
    }
    
    formatCurrency(amount) {
        if (typeof app !== 'undefined' && app.formatCurrency) {
            return app.formatCurrency(amount);
        }
        return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }

    formatHour(hour) {
        if (hour === 0) return "12 AM";
        if (hour === 12) return "12 PM";
        if (hour < 12) return `${hour} AM`;
        return `${hour - 12} PM`;
    }

    addMessage(content, sender) {
        const messagesDiv = document.getElementById('chatMessages');
        if (!messagesDiv) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        // Format content with proper markdown support
        const formattedContent = this.formatMessageContent(content);

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${sender === 'bot' ? 'robot' : 'user'}"></i>
            </div>
            <div class="message-content">
                <p>${formattedContent}</p>
            </div>
        `;

        messagesDiv.appendChild(messageDiv);
        
        // Only auto-scroll for user messages, not bot responses
        // This keeps the user's message visible when the bot replies
        if (sender === 'user') {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Save to history
        this.messages.push({ content, sender, timestamp: new Date() });
        this.saveChatHistory();
    }

    formatMessageContent(content) {
        // Fix formatting issues and convert markdown
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic  
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/• /g, '&bull; ') // Bullet points
            .replace(/₱/g, '₱') // Currency symbol
            .replace(/🏆|🥇|🥈|🥉|💰|📊|👥|📦|⚠️|🚨|✅|🎯|💡|⭐|🌟|📈|📉|🔍|🛡️|⏰|📱|💝|🎉|🤝|📚|💪|🚀|😊|👋|🤖|🔮/g, match => `<span class="emoji">${match}</span>`); // Emojis
    }

    saveChatHistory() {
        // Limit history to last 50 messages
        const historyToSave = this.messages.slice(-50);
        localStorage.setItem('chatHistory', JSON.stringify(historyToSave));
        
        // Save conversation context
        localStorage.setItem('chatContext', JSON.stringify({
            lastTopic: this.conversationContext.lastTopic,
            userPreferences: this.conversationContext.userPreferences,
            businessMetrics: this.conversationContext.businessMetrics
        }));
    }

    loadChatHistory() {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            this.messages = JSON.parse(saved);
        }
        
        // Load conversation context
        const savedContext = localStorage.getItem('chatContext');
        if (savedContext) {
            const context = JSON.parse(savedContext);
            this.conversationContext.lastTopic = context.lastTopic;
            this.conversationContext.userPreferences = context.userPreferences || {};
            this.conversationContext.businessMetrics = context.businessMetrics || {};
        }
    }
}

// Additional helper methods
// Initialize chatbot
const chatbot = new ChatbotAssistant();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    chatbot.init();
});
