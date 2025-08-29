// Payroll Management System
class PayrollManager {
    constructor() {
        this.payrollRecords = [];
        this.employees = [];
        this.attendanceRecords = [];
        this.holidays = [];
        this.attendanceRules = null;
        this.requests = [];
        this.managerPassword = '1234'; // Default password, should be configurable
    }

    async init() {
        console.log('🚀 Initializing Payroll System...');
        try {
            await this.loadAttendanceRules();
            await this.loadEmployees();
            await this.loadHolidays();
            await this.loadPayrollRecords();
            await this.loadRequests();
            
            // Load hardcoded attendance for pok@gmail.com
            await this.loadHardcodedAttendanceForPok();
            
            this.setupEventListeners();
            this.updateDashboardStats();
            
            // Display initial data
            this.displayPayrollRecords();
            this.displayPayrollRecordsTable();
            this.displayAttendanceRecords();
            this.displayHolidaysList();
            this.displayPendingRequests();
            
            console.log('✅ Payroll System initialized with', this.employees.length, 'employees');
        } catch (error) {
            console.error('❌ Failed to initialize payroll:', error);
        }
    }

    async loadAttendanceRules() {
        try {
            const rules = await window.db.getAll('attendanceRules');
            if (rules && rules.length > 0) {
                this.attendanceRules = rules[0];
            } else {
                // Default rules
                this.attendanceRules = {
                    businessOpenTime: '08:00',
                    lateGraceMinutes: 5,
                    latePenaltyMinusOneHour: true,
                    overtimeRequiresApproval: true,
                    nightDifferentialStart: '22:00',
                    nightDifferentialEnd: '06:00',
                    nightDifferentialRate: 0.1, // 10%
                };
                // Save default rules
                await window.db.add('attendanceRules', this.attendanceRules);
            }
        } catch (error) {
            console.error('Failed to load attendance rules:', error);
        }
    }

    async loadEmployees() {
        try {
            const employees = await window.db.getAll('employees');
            // Enhance employees with payroll data
            this.employees = employees.map(emp => ({
                ...emp,
                wageType: emp.wageType || 'daily', // daily or monthly
                dailyRate: emp.dailyRate || 500,
                monthlyRate: emp.monthlyRate || 15000,
                sssNumber: emp.sssNumber || '',
                philHealthNumber: emp.philHealthNumber || '',
                pagIbigNumber: emp.pagIbigNumber || '',
                tinNumber: emp.tinNumber || '',
                allowances: emp.allowances || 0,
                deductions: emp.deductions || 0
            }));
            
            // Populate all employee dropdowns after loading
            this.populateEmployeeDropdowns();
        } catch (error) {
            console.error('Failed to load employees:', error);
            this.employees = [];
        }
    }

    async loadHolidays() {
        try {
            const currentYear = new Date().getFullYear();
            this.holidays = await window.db.getByIndex('holidays', 'year', currentYear);
            
            // Add default Philippine holidays if none exist
            if (this.holidays.length === 0) {
                const defaultHolidays = [
                    { date: `${currentYear}-01-01`, name: "New Year's Day", type: 'regular' },
                    { date: `${currentYear}-04-09`, name: "Araw ng Kagitingan", type: 'regular' },
                    { date: `${currentYear}-05-01`, name: "Labor Day", type: 'regular' },
                    { date: `${currentYear}-06-12`, name: "Independence Day", type: 'regular' },
                    { date: `${currentYear}-08-21`, name: "Ninoy Aquino Day", type: 'special' },
                    { date: `${currentYear}-08-26`, name: "National Heroes Day", type: 'regular' },
                    { date: `${currentYear}-11-01`, name: "All Saints Day", type: 'special' },
                    { date: `${currentYear}-11-30`, name: "Bonifacio Day", type: 'regular' },
                    { date: `${currentYear}-12-25`, name: "Christmas Day", type: 'regular' },
                    { date: `${currentYear}-12-30`, name: "Rizal Day", type: 'regular' },
                ];
                
                for (const holiday of defaultHolidays) {
                    await window.db.add('holidays', { ...holiday, year: currentYear });
                }
                this.holidays = defaultHolidays;
            }
        } catch (error) {
            console.error('Failed to load holidays:', error);
            this.holidays = [];
        }
    }

    async loadPayrollRecords() {
        try {
            this.payrollRecords = await window.db.getAll('payroll');
        } catch (error) {
            console.error('Failed to load payroll records:', error);
            this.payrollRecords = [];
        }
    }
    
    async loadHardcodedAttendanceForPok() {
        // Check if current user is pok@gmail.com
        const currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.email !== 'pok@gmail.com') {
            return;
        }
        
        console.log('Loading hardcoded attendance data for pok@gmail.com...');
        
        // Clear existing attendance records
        const existingAttendance = await window.db.getAll('attendance');
        for (const record of existingAttendance) {
            await window.db.delete('attendance', record.id);
        }
        
        // Generate attendance for the last 30 days for all employees
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        for (const employee of this.employees) {
            const currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
                const dayOfWeek = currentDate.getDay();
                
                // Skip weekends
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    // Generate realistic attendance data
                    const isLate = Math.random() < 0.15; // 15% chance of being late
                    const checkInHour = isLate ? 8 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 60) / 60;
                    const checkOutHour = 17 + Math.floor(Math.random() * 3); // Between 5 PM and 8 PM
                    
                    const attendanceRecord = {
                        employeeId: employee.id,
                        employeeName: employee.name,
                        date: currentDate.toISOString().split('T')[0],
                        checkInTime: `${Math.floor(checkInHour).toString().padStart(2, '0')}:${Math.floor((checkInHour % 1) * 60).toString().padStart(2, '0')}`,
                        checkOutTime: `${checkOutHour}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                        isLate: isLate,
                        lateMinutes: isLate ? Math.floor(Math.random() * 30) + 5 : 0,
                        hoursWorked: checkOutHour - checkInHour,
                        overtimeHours: checkOutHour > 17 ? checkOutHour - 17 : 0,
                        status: 'present',
                        createdAt: new Date().toISOString()
                    };
                    
                    await window.db.add('attendance', attendanceRecord);
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        console.log('✅ Hardcoded attendance data loaded for', this.employees.length, 'employees');
        this.attendanceRecords = await window.db.getAll('attendance');
    }
    
    // Populate all employee dropdowns (similar to POS and Attendance)
    populateEmployeeDropdowns() {
        const dropdownIds = [
            'payrollEmployeeSelect',
            'requestEmployee',
            'payslipEmployee'
        ];
        
        dropdownIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select Employee</option>';
                
                // Add "All Employees" option for payroll select
                if (id === 'payrollEmployeeSelect') {
                    const allOption = document.createElement('option');
                    allOption.value = 'all';
                    allOption.textContent = '📋 All Employees';
                    select.appendChild(allOption);
                }
                
                this.employees.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = `${emp.name} - ${emp.position}`;
                    select.appendChild(option);
                });
            }
        });
        
        console.log('✅ Employee dropdowns populated with', this.employees.length, 'employees');
    }

    async loadRequests() {
        try {
            this.requests = await window.db.getAll('employeeRequests');
        } catch (error) {
            console.error('Failed to load requests:', error);
            this.requests = [];
        }
    }

    // Calculate payroll for an employee for a period
    async calculatePayroll(employeeId, periodStart, periodEnd) {
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        // Get attendance records for the period
        const attendanceRecords = await this.getAttendanceForPeriod(employeeId, periodStart, periodEnd);
        
        // Get approved OT requests
        const approvedOT = this.requests.filter(r => 
            r.employeeId === employeeId && 
            r.requestType === 'overtime' && 
            r.status === 'approved' &&
            new Date(r.requestDate) >= new Date(periodStart) &&
            new Date(r.requestDate) <= new Date(periodEnd)
        );

        // Calculate components
        const basePay = this.calculateBasePay(employee, attendanceRecords, periodStart, periodEnd);
        const overtime = this.calculateOvertime(employee, attendanceRecords, approvedOT);
        const nightDiff = this.calculateNightDifferential(employee, attendanceRecords);
        const holidayPay = this.calculateHolidayPay(employee, attendanceRecords);
        const latePenalty = this.calculateLatePenalty(employee, attendanceRecords);
        const tips = await this.calculateTipsCommissions(employeeId, periodStart, periodEnd);
        
        // Government deductions
        const sss = this.calculateSSS(basePay);
        const philHealth = this.calculatePhilHealth(basePay);
        const pagIbig = this.calculatePagIbig(basePay);
        const tax = this.calculateWithholdingTax(basePay);
        
        const grossPay = basePay + overtime + nightDiff + holidayPay + tips - latePenalty;
        const totalDeductions = sss + philHealth + pagIbig + tax + employee.deductions;
        const netPay = grossPay - totalDeductions + employee.allowances;

        return {
            employeeId,
            employeeName: employee.name,
            periodStart,
            periodEnd,
            basePay,
            overtime,
            nightDifferential: nightDiff,
            holidayPay,
            tips,
            latePenalty,
            grossPay,
            sss,
            philHealth,
            pagIbig,
            witholdingTax: tax,
            otherDeductions: employee.deductions,
            allowances: employee.allowances,
            totalDeductions,
            netPay,
            attendanceSummary: {
                daysWorked: attendanceRecords.length,
                lateCount: attendanceRecords.filter(a => a.isLate).length,
                totalLateMinutes: attendanceRecords.reduce((sum, a) => sum + (a.lateMinutes || 0), 0)
            }
        };
    }

    calculateBasePay(employee, attendanceRecords, periodStart, periodEnd) {
        if (employee.wageType === 'monthly') {
            // For monthly, calculate based on days worked vs total work days
            const totalWorkDays = this.getWorkDaysInPeriod(periodStart, periodEnd);
            const daysWorked = attendanceRecords.length;
            return (employee.monthlyRate / totalWorkDays) * daysWorked;
        } else {
            // Daily wage
            return employee.dailyRate * attendanceRecords.length;
        }
    }

    calculateOvertime(employee, attendanceRecords, approvedOT) {
        let totalOT = 0;
        const hourlyRate = employee.wageType === 'monthly' 
            ? employee.monthlyRate / 22 / 8  // Assuming 22 work days, 8 hours
            : employee.dailyRate / 8;

        approvedOT.forEach(ot => {
            totalOT += ot.hours * hourlyRate * 1.25; // OT rate is 125%
        });

        return totalOT;
    }

    calculateNightDifferential(employee, attendanceRecords) {
        let totalNightDiff = 0;
        const hourlyRate = employee.wageType === 'monthly' 
            ? employee.monthlyRate / 22 / 8
            : employee.dailyRate / 8;

        attendanceRecords.forEach(record => {
            const nightHours = this.calculateNightHours(record);
            totalNightDiff += nightHours * hourlyRate * this.attendanceRules.nightDifferentialRate;
        });

        return totalNightDiff;
    }

    calculateNightHours(attendanceRecord) {
        // Calculate hours worked between 10PM and 6AM
        // This is simplified - you'd need more complex logic for actual implementation
        return 0; // Placeholder
    }

    calculateHolidayPay(employee, attendanceRecords) {
        let holidayPay = 0;
        const dailyRate = employee.wageType === 'monthly' 
            ? employee.monthlyRate / 22
            : employee.dailyRate;

        attendanceRecords.forEach(record => {
            const holiday = this.holidays.find(h => h.date === record.date);
            if (holiday) {
                if (holiday.type === 'regular') {
                    holidayPay += dailyRate * 2; // 200%
                } else if (holiday.type === 'special') {
                    holidayPay += dailyRate * 1.3; // 130%
                } else if (holiday.type === 'double') {
                    holidayPay += dailyRate * 3; // 300%
                }
            }
        });

        return holidayPay;
    }

    calculateLatePenalty(employee, attendanceRecords) {
        if (!this.attendanceRules.latePenaltyMinusOneHour) {
            return 0;
        }

        const hourlyRate = employee.wageType === 'monthly' 
            ? employee.monthlyRate / 22 / 8
            : employee.dailyRate / 8;

        const lateCount = attendanceRecords.filter(a => a.isLate).length;
        return lateCount * hourlyRate; // Deduct 1 hour per late
    }

    async calculateTipsCommissions(employeeId, periodStart, periodEnd) {
        // Get transactions for the period and calculate commissions
        const transactions = await window.db.getAll('transactions');
        const employeeTransactions = transactions.filter(t => 
            t.employeeId === employeeId &&
            new Date(t.date) >= new Date(periodStart) &&
            new Date(t.date) <= new Date(periodEnd)
        );

        return employeeTransactions.reduce((sum, t) => sum + (t.tip || 0), 0);
    }

    // Government deduction calculations (Philippine rates)
    calculateSSS(basePay) {
        // Simplified SSS calculation
        if (basePay <= 4250) return 180;
        if (basePay <= 4750) return 202.50;
        if (basePay <= 5250) return 225;
        if (basePay <= 5750) return 247.50;
        if (basePay <= 6250) return 270;
        if (basePay <= 6750) return 292.50;
        if (basePay <= 7250) return 315;
        if (basePay <= 7750) return 337.50;
        if (basePay <= 8250) return 360;
        if (basePay <= 8750) return 382.50;
        return 400; // Maximum for simplification
    }

    calculatePhilHealth(basePay) {
        // 4% of basic salary (2% employee, 2% employer)
        return basePay * 0.02;
    }

    calculatePagIbig(basePay) {
        // Fixed rate
        if (basePay <= 1500) return basePay * 0.01;
        return basePay * 0.02; // Maximum 100
    }

    calculateWithholdingTax(basePay) {
        // Simplified tax calculation
        if (basePay <= 20833) return 0;
        if (basePay <= 33333) return (basePay - 20833) * 0.20;
        if (basePay <= 66667) return 2500 + (basePay - 33333) * 0.25;
        if (basePay <= 166667) return 10833 + (basePay - 66667) * 0.30;
        return 40833 + (basePay - 166667) * 0.32;
    }

    async getAttendanceForPeriod(employeeId, periodStart, periodEnd) {
        const allAttendance = await window.db.getAll('attendance');
        const filtered = allAttendance.filter(a => 
            a.employeeId === employeeId &&
            new Date(a.date) >= new Date(periodStart) &&
            new Date(a.date) <= new Date(periodEnd)
        );
        console.log(`Found ${filtered.length} attendance records for employee ${employeeId} between ${periodStart} and ${periodEnd}`);
        return filtered;
    }

    getWorkDaysInPeriod(periodStart, periodEnd) {
        let count = 0;
        const start = new Date(periodStart);
        const end = new Date(periodEnd);
        
        while (start <= end) {
            const dayOfWeek = start.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                count++;
            }
            start.setDate(start.getDate() + 1);
        }
        
        return count;
    }

    // Process payroll for all employees
    async processPayroll(periodStart, periodEnd) {
        const payrollBatch = [];
        
        for (const employee of this.employees) {
            try {
                const payrollData = await this.calculatePayroll(employee.id, periodStart, periodEnd);
                payrollBatch.push(payrollData);
            } catch (error) {
                console.error(`Failed to calculate payroll for ${employee.name}:`, error);
            }
        }

        // Save payroll batch
        for (const payroll of payrollBatch) {
            await window.db.add('payroll', {
                ...payroll,
                status: 'pending',
                createdAt: new Date().toISOString(),
                createdBy: 'system'
            });
            
            // Add to audit log
            await this.addAuditLog('PAYROLL_PROCESSED', 'payroll', payroll.employeeId, payroll);
        }

        return payrollBatch;
    }

    // Request management
    async submitRequest(employeeId, requestType, requestData) {
        const request = {
            employeeId,
            requestType, // 'overtime' or 'leave'
            requestDate: requestData.date,
            hours: requestData.hours || 0,
            reason: requestData.reason,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const id = await window.db.add('employeeRequests', request);
        await this.addAuditLog('REQUEST_SUBMITTED', 'request', id, request);
        
        return id;
    }

    async approveRequest(requestId, managerId, password) {
        // Verify manager password
        if (password !== this.managerPassword) {
            throw new Error('Invalid manager password');
        }

        const request = await window.db.get('employeeRequests', requestId);
        if (!request) {
            throw new Error('Request not found');
        }

        request.status = 'approved';
        request.approvedBy = managerId;
        request.approvedAt = new Date().toISOString();

        await window.db.update('employeeRequests', request);
        await this.addAuditLog('REQUEST_APPROVED', 'request', requestId, { approvedBy: managerId });

        return request;
    }

    async denyRequest(requestId, managerId, password, reason) {
        // Verify manager password
        if (password !== this.managerPassword) {
            throw new Error('Invalid manager password');
        }

        const request = await window.db.get('employeeRequests', requestId);
        if (!request) {
            throw new Error('Request not found');
        }

        request.status = 'denied';
        request.deniedBy = managerId;
        request.deniedAt = new Date().toISOString();
        request.denialReason = reason;

        await window.db.update('employeeRequests', request);
        await this.addAuditLog('REQUEST_DENIED', 'request', requestId, { deniedBy: managerId, reason });

        return request;
    }

    // Audit logging
    async addAuditLog(action, entityType, entityId, details) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            userId: window.currentUser?.id || 'system',
            action,
            entityType,
            entityId,
            details,
            ipAddress: 'local' // Would get actual IP in production
        };

        await window.db.add('auditLog', auditEntry);
        console.log('Audit log:', auditEntry);
    }

    // Update attendance rules
    async updateAttendanceRules(rules, managerId, password) {
        // Verify manager password
        if (password !== this.managerPassword) {
            throw new Error('Invalid manager password');
        }

        const existingRules = await window.db.getAll('attendanceRules');
        if (existingRules.length > 0) {
            rules.id = existingRules[0].id;
            await window.db.update('attendanceRules', rules);
        } else {
            await window.db.add('attendanceRules', rules);
        }

        this.attendanceRules = rules;
        await this.addAuditLog('RULES_UPDATED', 'attendanceRules', rules.id, { updatedBy: managerId });

        return rules;
    }

    // Mark attendance with late calculation
    async markAttendance(employeeId, checkInTime) {
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        const businessOpen = this.parseTime(this.attendanceRules.businessOpenTime);
        const graceMinutes = this.attendanceRules.lateGraceMinutes;
        const checkIn = this.parseTime(checkInTime);
        
        const allowedTime = new Date(businessOpen.getTime() + graceMinutes * 60000);
        const isLate = checkIn > allowedTime;
        const lateMinutes = isLate ? Math.floor((checkIn - allowedTime) / 60000) : 0;

        const attendanceRecord = {
            employeeId,
            date: new Date().toISOString().split('T')[0],
            checkInTime,
            isLate,
            lateMinutes,
            createdAt: new Date().toISOString()
        };

        const id = await window.db.add('attendance', attendanceRecord);
        await this.addAuditLog('ATTENDANCE_MARKED', 'attendance', id, attendanceRecord);

        return attendanceRecord;
    }

    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return date;
    }
    
    updateSelectedEmployeesDisplay() {
        const display = document.getElementById('selectedEmployeesDisplay');
        const select = document.getElementById('payrollEmployeeSelect');
        
        if (!display || !select) return;
        
        if (select.value === 'all') {
            display.innerHTML = `
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${this.employees.map(emp => `
                        <span style="background: #3b82f6; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                            ${emp.name}
                        </span>
                    `).join('')}
                </div>
            `;
        } else if (select.value) {
            const employee = this.employees.find(e => e.id == select.value);
            if (employee) {
                display.innerHTML = `
                    <span style="background: #3b82f6; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                        ${employee.name}
                    </span>
                `;
            }
        } else {
            display.innerHTML = '<p style="color: #94a3b8; text-align: center; margin: 0;">No employees selected</p>';
        }
    }
    
    // Handle process payroll button click
    async handleProcessPayroll() {
        const employeeSelect = document.getElementById('payrollEmployeeSelect');
        const periodStart = document.getElementById('periodStart');
        const periodEnd = document.getElementById('periodEnd');
        
        if (!employeeSelect || !periodStart || !periodEnd) {
            window.showNotification('Missing required fields', 'error');
            return;
        }
        
        const employeeValue = employeeSelect.value;
        const startDate = periodStart.value;
        const endDate = periodEnd.value;
        
        if (!employeeValue || !startDate || !endDate) {
            window.showNotification('Please select employee(s) and period', 'error');
            return;
        }
        
        try {
            let employeesToProcess = [];
            
            if (employeeValue === 'all') {
                employeesToProcess = this.employees;
            } else {
                const employee = this.employees.find(e => e.id == employeeValue);
                if (employee) employeesToProcess = [employee];
            }
            
            if (employeesToProcess.length === 0) {
                window.showNotification('No employees selected', 'error');
                return;
            }
            
            window.showNotification(`Processing payroll for ${employeesToProcess.length} employee(s)...`, 'info');
            
            for (const employee of employeesToProcess) {
                // Process payroll for each employee
                const payrollData = await this.calculatePayroll(
                    employee.id, 
                    startDate, 
                    endDate
                );
                
                // Save payroll record
                const payrollRecord = {
                    ...payrollData,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    createdBy: 'system'
                };
                
                await window.db.add('payroll', payrollRecord);
                this.payrollRecords.push(payrollRecord);
            }
            
            window.showNotification(`Payroll processed successfully for ${employeesToProcess.length} employee(s)`, 'success');
            
            // Refresh displays
            this.displayPayrollRecords();
            this.displayPayrollRecordsTable();
            this.updateDashboardStats();
            
            // Auto-switch to Records tab to show the processed payroll
            const recordsTab = document.querySelector('.tab-btn[data-tab="payroll-records"]');
            if (recordsTab) {
                recordsTab.click();
            }
            
            // Reset form
            employeeSelect.value = '';
            this.updateSelectedEmployeesDisplay();
            document.getElementById('payrollSummaryPreview').style.display = 'none';
            
        } catch (error) {
            console.error('Failed to process payroll:', error);
            window.showNotification('Failed to process payroll', 'error');
        }
    }
    
    // Display payroll records in table format for professional design
    displayPayrollRecordsTable() {
        const tbody = document.getElementById('payrollRecordsTableBody');
        if (!tbody) return;
        
        if (this.payrollRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #9ca3af;">
                        No payroll records found. Process payroll to see records here.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Sort records by date, newest first
        const sortedRecords = [...this.payrollRecords].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        tbody.innerHTML = sortedRecords.map((record, index) => {
            const recordId = record.id || index;
            return `
            <tr>
                <td>${record.employeeName}</td>
                <td>${new Date(record.periodStart).toLocaleDateString()} - ${new Date(record.periodEnd).toLocaleDateString()}</td>
                <td>₱${record.basePay.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>₱${(record.overtime || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="color: #ef4444;">-₱${record.totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="color: #10b981; font-weight: 600;">₱${record.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>
                    <span class="badge ${record.status === 'paid' ? 'badge-success' : 'badge-warning'}" id="status-${recordId}">
                        ${record.status === 'paid' ? 'PAID' : 'PENDING'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.payrollManager.generatePayslip('${recordId}')" style="margin-right: 0.25rem;" title="Generate Payslip">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="window.payrollManager.markAsPaidTable('${recordId}')" ${record.status === 'paid' ? 'disabled' : ''} id="pay-btn-${recordId}" title="Mark as Paid">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            </tr>
        `}).join('');
        
        // Also call the old display method for compatibility
        this.displayPayrollRecords();
    }
    
    // Display payroll records in the UI
    displayPayrollRecords() {
        const container = document.getElementById('payrollRecordsList');
        if (!container) return;
        
        if (this.payrollRecords.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #94a3b8;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No payroll records found. Process payroll to see records here.</p>
                </div>
            `;
            return;
        }
        
        // Sort records by date, newest first
        const sortedRecords = [...this.payrollRecords].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        container.innerHTML = sortedRecords.map(record => `
            <div class="payroll-record-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; transition: all 0.2s;" 
                 onmouseover="this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'" 
                 onmouseout="this.style.boxShadow='none'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="margin: 0; color: #1e293b; font-size: 1.125rem;">${record.employeeName}</h4>
                        <p style="margin: 0.25rem 0; color: #64748b; font-size: 0.875rem;">
                            Period: ${new Date(record.periodStart).toLocaleDateString()} - ${new Date(record.periodEnd).toLocaleDateString()}
                        </p>
                    </div>
                    <span style="background: ${record.status === 'paid' ? '#10b981' : '#f59e0b'}; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">
                        ${record.status}
                    </span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <p style="margin: 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Basic Pay</p>
                        <p style="margin: 0.25rem 0; color: #334155; font-weight: 600;">₱${record.basePay.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p style="margin: 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Overtime</p>
                        <p style="margin: 0.25rem 0; color: #334155; font-weight: 600;">₱${(record.overtime || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p style="margin: 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Deductions</p>
                        <p style="margin: 0.25rem 0; color: #ef4444; font-weight: 600;">-₱${record.totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p style="margin: 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Net Pay</p>
                        <p style="margin: 0.25rem 0; color: #10b981; font-weight: 700; font-size: 1.125rem;">₱${record.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-primary" onclick="window.payrollManager.generatePayslip(${record.id || this.payrollRecords.indexOf(record)})" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;">
                        <i class="fas fa-file-pdf"></i> Generate Payslip
                    </button>
                    <button class="btn btn-sm btn-success" onclick="window.payrollManager.markAsPaid(${record.id || this.payrollRecords.indexOf(record)})" style="padding: 0.375rem 0.75rem; font-size: 0.875rem;" ${record.status === 'paid' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i> Mark as Paid
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="window.payrollManager.viewDetails(${record.id || this.payrollRecords.indexOf(record)})" style="padding: 0.375rem 0.75rem; font-size: 0.875rem; border: 1px solid #cbd5e1; background: white; color: #475569;">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Generate payslip for an employee
    async generatePayslip(recordId) {
        // Find the record either by ID or index
        let record = this.payrollRecords.find(r => r.id === recordId || r.id === parseInt(recordId));
        if (!record && !isNaN(recordId)) {
            record = this.payrollRecords[parseInt(recordId)];
        }
        
        if (!record) {
            window.showNotification('Payroll record not found', 'error');
            return;
        }
        
        // Create payslip HTML
        const payslipHTML = `
            <html>
            <head>
                <title>Payslip - ${record.employeeName}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .company-name { font-size: 24px; font-weight: bold; }
                    .payslip-title { font-size: 18px; margin-top: 10px; }
                    .info-section { margin-bottom: 20px; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .earnings-deductions { display: flex; gap: 20px; }
                    .column { flex: 1; }
                    .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px; }
                    .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .total-row { font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
                    .net-pay { font-size: 20px; font-weight: bold; text-align: center; margin-top: 30px; padding: 15px; background: #f0f0f0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">Ava Solutions</div>
                    <div class="payslip-title">PAYSLIP</div>
                </div>
                
                <div class="info-section">
                    <div class="info-row">
                        <span>Employee Name:</span>
                        <span>${record.employeeName}</span>
                    </div>
                    <div class="info-row">
                        <span>Pay Period:</span>
                        <span>${new Date(record.periodStart).toLocaleDateString()} - ${new Date(record.periodEnd).toLocaleDateString()}</span>
                    </div>
                    <div class="info-row">
                        <span>Date Generated:</span>
                        <span>${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                
                <div class="earnings-deductions">
                    <div class="column">
                        <div class="section-title">EARNINGS</div>
                        <div class="item-row">
                            <span>Basic Pay:</span>
                            <span>₱${record.basePay.toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>Overtime:</span>
                            <span>₱${(record.overtime || 0).toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>Holiday Pay:</span>
                            <span>₱${(record.holidayPay || 0).toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>Night Differential:</span>
                            <span>₱${(record.nightDifferential || 0).toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>Allowances:</span>
                            <span>₱${(record.allowances || 0).toFixed(2)}</span>
                        </div>
                        <div class="total-row item-row">
                            <span>Gross Pay:</span>
                            <span>₱${record.grossPay.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="column">
                        <div class="section-title">DEDUCTIONS</div>
                        <div class="item-row">
                            <span>SSS:</span>
                            <span>₱${(record.sss || 0).toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>PhilHealth:</span>
                            <span>₱${(record.philHealth || 0).toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>Pag-IBIG:</span>
                            <span>₱${(record.pagIbig || 0).toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>Tax:</span>
                            <span>₱${(record.witholdingTax || 0).toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>Late Penalty:</span>
                            <span>₱${(record.latePenalty || 0).toFixed(2)}</span>
                        </div>
                        <div class="item-row">
                            <span>Other:</span>
                            <span>₱${(record.otherDeductions || 0).toFixed(2)}</span>
                        </div>
                        <div class="total-row item-row">
                            <span>Total Deductions:</span>
                            <span>₱${record.totalDeductions.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="net-pay">
                    NET PAY: ₱${record.netPay.toFixed(2)}
                </div>
            </body>
            </html>
        `;
        
        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(payslipHTML);
        printWindow.document.close();
        printWindow.print();
    }
    
    // Mark payroll as paid from table
    async markAsPaidTable(recordId) {
        try {
            // Find the record either by ID or index
            let record = this.payrollRecords.find(r => r.id === recordId || r.id === parseInt(recordId));
            if (!record && !isNaN(recordId)) {
                record = this.payrollRecords[parseInt(recordId)];
            }
            
            if (!record) {
                window.showNotification('Payroll record not found', 'error');
                return;
            }
            
            // Update record status
            record.status = 'paid';
            record.paidAt = new Date().toISOString();
            
            // Update in database if record has an ID
            if (record.id) {
                await window.db.update('payroll', record);
            } else {
                // If no ID, save it to get an ID
                const id = await window.db.add('payroll', record);
                record.id = id;
            }
            
            // Update UI immediately
            const statusBadge = document.getElementById(`status-${recordId}`);
            const payButton = document.getElementById(`pay-btn-${recordId}`);
            
            if (statusBadge) {
                statusBadge.className = 'badge badge-success';
                statusBadge.textContent = 'PAID';
            }
            
            if (payButton) {
                payButton.disabled = true;
            }
            
            window.showNotification(`Payroll for ${record.employeeName} marked as paid`, 'success');
            
            // Update displays
            this.updateDashboardStats();
            
        } catch (error) {
            console.error('Failed to mark payroll as paid:', error);
            window.showNotification('Failed to update payroll status', 'error');
        }
    }
    
    // Mark payroll as paid (legacy function for compatibility)
    async markAsPaid(recordIndex) {
        const record = this.payrollRecords[recordIndex];
        if (!record) {
            window.showNotification('Payroll record not found', 'error');
            return;
        }
        
        record.status = 'paid';
        record.paidAt = new Date().toISOString();
        
        // Update in database
        if (record.id) {
            await window.db.update('payroll', record);
        }
        
        window.showNotification('Payroll marked as paid', 'success');
        this.displayPayrollRecords();
        this.displayPayrollRecordsTable();
        this.updateDashboardStats();
    }
    
    // Display attendance records in the attendance tab
    displayAttendanceRecords() {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;
        
        // Get today's attendance records
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = this.attendanceRecords?.filter(a => a.date === today) || [];
        
        // Update attendance stats
        const presentCount = document.getElementById('presentToday');
        const lateCount = document.getElementById('lateToday');
        const absentCount = document.getElementById('absentToday');
        
        if (presentCount) presentCount.textContent = todayAttendance.filter(a => a.status === 'present').length;
        if (lateCount) lateCount.textContent = todayAttendance.filter(a => a.isLate).length;
        if (absentCount) {
            const totalEmployees = this.employees.length;
            const presentEmployees = todayAttendance.length;
            absentCount.textContent = totalEmployees - presentEmployees;
        }
        
        // Display all attendance records (last 30 days)
        const recentAttendance = (this.attendanceRecords || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 100); // Show last 100 records
        
        if (recentAttendance.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #9ca3af;">
                        No attendance records found.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = recentAttendance.map(record => `
            <tr>
                <td>${record.employeeName || 'Unknown'}</td>
                <td>${new Date(record.date).toLocaleDateString()}</td>
                <td>${record.checkInTime || '--'}</td>
                <td>${record.checkOutTime || '--'}</td>
                <td>${record.hoursWorked ? record.hoursWorked.toFixed(1) + ' hrs' : '--'}</td>
                <td>
                    <span class="badge ${record.isLate ? 'badge-warning' : 'badge-success'}">
                        ${record.isLate ? 'Late' : 'On Time'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    // View detailed payroll information
    viewDetails(recordIndex) {
        const record = this.payrollRecords[recordIndex];
        if (!record) {
            window.showNotification('Payroll record not found', 'error');
            return;
        }
        
        // Show detailed modal or expand view
        alert(`
Payroll Details for ${record.employeeName}

Period: ${record.periodStart} to ${record.periodEnd}
Days Worked: ${record.attendanceSummary?.daysWorked || 0}
Late Count: ${record.attendanceSummary?.lateCount || 0}

Earnings:
- Basic Pay: ₱${record.basePay.toFixed(2)}
- Overtime: ₱${(record.overtime || 0).toFixed(2)}
- Holiday Pay: ₱${(record.holidayPay || 0).toFixed(2)}

Deductions:
- SSS: ₱${(record.sss || 0).toFixed(2)}
- PhilHealth: ₱${(record.philHealth || 0).toFixed(2)}
- Pag-IBIG: ₱${(record.pagIbig || 0).toFixed(2)}
- Tax: ₱${(record.witholdingTax || 0).toFixed(2)}

Net Pay: ₱${record.netPay.toFixed(2)}
        `);
    }

    // Helper methods for quick period selection
    setCurrentPayPeriod() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('periodStart').value = startOfMonth.toISOString().split('T')[0];
        document.getElementById('periodEnd').value = today.toISOString().split('T')[0];
        this.updatePayrollPreview();
    }
    
    setLastPayPeriod() {
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        
        document.getElementById('periodStart').value = lastMonth.toISOString().split('T')[0];
        document.getElementById('periodEnd').value = lastMonthEnd.toISOString().split('T')[0];
        this.updatePayrollPreview();
    }
    
    setMonthlyPeriod() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('periodStart').value = startOfMonth.toISOString().split('T')[0];
        document.getElementById('periodEnd').value = endOfMonth.toISOString().split('T')[0];
        this.updatePayrollPreview();
    }
    
    updatePayrollPreview() {
        const startDate = document.getElementById('periodStart').value;
        const endDate = document.getElementById('periodEnd').value;
        const employeeSelect = document.getElementById('payrollEmployeeSelect');
        
        if (startDate && endDate) {
            const preview = document.getElementById('payrollSummaryPreview');
            if (preview) {
                preview.style.display = 'block';
                document.getElementById('summaryPeriod').textContent = `${startDate} to ${endDate}`;
                
                const selectedCount = employeeSelect.value === 'all' ? this.employees.length : 
                                     employeeSelect.value ? 1 : 0;
                document.getElementById('summaryEmployees').textContent = selectedCount;
            }
        }
    }
    
    updateDashboardStats() {
        // Update dashboard statistics
        const totalEmployees = document.getElementById('totalEmployeesCount');
        const pendingPayroll = document.getElementById('pendingPayrollCount');
        const monthlyTotal = document.getElementById('monthlyTotalPayroll');
        const pendingRequestsCount = document.getElementById('pendingRequestsCount');
        
        if (totalEmployees) totalEmployees.textContent = this.employees.length;
        if (pendingPayroll) {
            const pending = this.payrollRecords.filter(r => r.status === 'pending').length;
            pendingPayroll.textContent = pending;
        }
        
        // Update pending requests count
        if (pendingRequestsCount) {
            const pendingReqs = this.requests.filter(r => r.status === 'pending').length;
            pendingRequestsCount.textContent = pendingReqs;
        }
        
        if (monthlyTotal) {
            const thisMonth = this.payrollRecords.filter(r => {
                const recordDate = new Date(r.createdAt);
                const now = new Date();
                return recordDate.getMonth() === now.getMonth() && 
                       recordDate.getFullYear() === now.getFullYear();
            });
            const total = thisMonth.reduce((sum, r) => sum + (r.netPay || 0), 0);
            monthlyTotal.textContent = `₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (pendingRequests) {
            const pending = this.requests.filter(r => r.status === 'pending').length;
            pendingRequests.textContent = pending;
        }
    }
    
    setupEventListeners() {
        // Process Payroll Button
        const processBtn = document.getElementById('processPayrollBtn');
        if (processBtn) {
            processBtn.onclick = () => this.handleProcessPayroll();
        }
        
        // Employee selection changes
        const employeeSelect = document.getElementById('payrollEmployeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', () => {
                this.updateSelectedEmployeesDisplay();
                this.updatePayrollPreview();
            });
        }
        
        // Period date changes
        const periodStart = document.getElementById('periodStart');
        const periodEnd = document.getElementById('periodEnd');
        if (periodStart) periodStart.addEventListener('change', () => this.updatePayrollPreview());
        if (periodEnd) periodEnd.addEventListener('change', () => this.updatePayrollPreview());
        
        // Select/Clear all buttons
        const selectAllBtn = document.getElementById('selectAllEmployees');
        const clearAllBtn = document.getElementById('clearAllEmployees');
        if (selectAllBtn) {
            selectAllBtn.onclick = () => {
                document.getElementById('payrollEmployeeSelect').value = 'all';
                this.updateSelectedEmployeesDisplay();
                this.updatePayrollPreview();
            };
        }
        if (clearAllBtn) {
            clearAllBtn.onclick = () => {
                document.getElementById('payrollEmployeeSelect').value = '';
                this.updateSelectedEmployeesDisplay();
                this.updatePayrollPreview();
            };
        }
        
        // Tab switching - Updated for new professional design
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.getAttribute('data-tab');
                
                // Update active button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Update active panel
                tabPanels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === targetTab) {
                        panel.classList.add('active');
                    }
                });
            });
        });
        
        // Old tab system compatibility
        const oldTabLinks = document.querySelectorAll('.tab-link');
        oldTabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Remove active class from all tabs
                oldTabLinks.forEach(l => l.classList.remove('active'));
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                // Hide all tab contents
                const tabContents = document.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Show selected tab content
                const tabId = e.target.getAttribute('data-tab');
                const selectedTab = document.getElementById(tabId);
                if (selectedTab) {
                    selectedTab.classList.add('active');
                }
            });
        });
        
        console.log('✅ Payroll event listeners attached');
    }

    showAddHolidayModal() {
        // Create modal for adding holiday
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: #1f2937;">Add Holiday</h2>
            </div>
            
            <div style="display: grid; gap: 1rem;">
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">Holiday Name</label>
                    <input type="text" id="holidayName" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;" placeholder="e.g., Christmas Day">
                </div>
                
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">Date</label>
                    <input type="date" id="holidayDate" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>
                
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">Holiday Type</label>
                    <select id="holidayType" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="regular">Regular Holiday (100% pay)</option>
                        <option value="special">Special Non-Working Holiday (30% pay)</option>
                    </select>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
                <button onclick="this.closest('div[style*=\\'position: fixed\\']').remove()" style="padding: 0.5rem 1.5rem; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; cursor: pointer;">
                    Cancel
                </button>
                <button onclick="window.payrollManager.addHoliday()" style="padding: 0.5rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Add Holiday
                </button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Set default date to today
        document.getElementById('holidayDate').valueAsDate = new Date();
    }

    async addHoliday() {
        const name = document.getElementById('holidayName').value.trim();
        const date = document.getElementById('holidayDate').value;
        const type = document.getElementById('holidayType').value;
        
        if (!name || !date) {
            if (window.showNotification) {
                window.showNotification('Please fill in all fields', 'error');
            }
            return;
        }
        
        try {
            const holiday = {
                id: Date.now(),
                name: name,
                date: date,
                type: type,
                year: new Date(date).getFullYear(),
                createdAt: new Date().toISOString()
            };
            
            await window.db.add('holidays', holiday);
            this.holidays.push(holiday);
            
            // Update holidays list display
            this.displayHolidaysList();
            
            // Close modal
            document.querySelector('div[style*="position: fixed"]').remove();
            
            if (window.showNotification) {
                window.showNotification('Holiday added successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to add holiday:', error);
            if (window.showNotification) {
                window.showNotification('Failed to add holiday', 'error');
            }
        }
    }

    displayHolidaysList() {
        const holidaysList = document.getElementById('holidaysList');
        if (!holidaysList) return;
        
        if (this.holidays.length === 0) {
            holidaysList.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 1rem;">No holidays added yet</p>';
            return;
        }
        
        // Sort holidays by date
        const sortedHolidays = [...this.holidays].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        holidaysList.innerHTML = `
            <div style="margin-top: 1rem;">
                ${sortedHolidays.map(holiday => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem;">
                        <div>
                            <strong style="color: #1f2937;">${holiday.name}</strong>
                            <div style="color: #6b7280; font-size: 0.875rem;">
                                ${new Date(holiday.date).toLocaleDateString()} • ${holiday.type === 'regular' ? 'Regular Holiday' : 'Special Holiday'}
                            </div>
                        </div>
                        <button onclick="window.payrollManager.removeHoliday(${holiday.id})" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                            Remove
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async removeHoliday(holidayId) {
        if (confirm('Are you sure you want to remove this holiday?')) {
            try {
                await window.db.delete('holidays', holidayId);
                this.holidays = this.holidays.filter(h => h.id !== holidayId);
                this.displayHolidaysList();
                
                if (window.showNotification) {
                    window.showNotification('Holiday removed', 'success');
                }
            } catch (error) {
                console.error('Failed to remove holiday:', error);
                if (window.showNotification) {
                    window.showNotification('Failed to remove holiday', 'error');
                }
            }
        }
    }

    displayPendingRequests() {
        const requestsList = document.getElementById('pendingRequestsList');
        if (!requestsList) return;
        
        // Filter pending requests
        const pendingRequests = this.requests.filter(r => r.status === 'pending');
        
        // Update badge count
        const badge = document.querySelector('.requests-section .badge');
        if (badge) {
            badge.textContent = pendingRequests.length;
        }
        
        if (pendingRequests.length === 0) {
            requestsList.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 2rem;">No pending requests</p>';
            return;
        }
        
        requestsList.innerHTML = `
            <div class="requests-container">
                ${pendingRequests.map(request => `
                    <div class="request-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                            <div>
                                <h4 style="margin: 0; color: #1f2937;">${request.employeeName || 'Unknown Employee'}</h4>
                                <p style="margin: 0.25rem 0; color: #6b7280; font-size: 0.875rem;">
                                    ${request.requestType === 'leave' ? 'Leave Request' : 'Overtime Request'}
                                </p>
                            </div>
                            <span style="background: #fbbf24; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">
                                Pending
                            </span>
                        </div>
                        
                        <div style="color: #374151; font-size: 0.875rem; margin-bottom: 0.75rem;">
                            <p style="margin: 0.25rem 0;">
                                <strong>Date:</strong> ${new Date(request.requestDate).toLocaleDateString()}
                                ${request.endDate ? ` - ${new Date(request.endDate).toLocaleDateString()}` : ''}
                            </p>
                            ${request.hours ? `<p style="margin: 0.25rem 0;"><strong>Hours:</strong> ${request.hours}</p>` : ''}
                            ${request.reason ? `<p style="margin: 0.25rem 0;"><strong>Reason:</strong> ${request.reason}</p>` : ''}
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="window.payrollManager.approveRequest('${request.id}')" 
                                    style="flex: 1; background: #10b981; color: white; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button onclick="window.payrollManager.rejectRequest('${request.id}')" 
                                    style="flex: 1; background: #ef4444; color: white; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async approveRequest(requestId) {
        try {
            const request = this.requests.find(r => r.id === requestId);
            if (!request) return;
            
            request.status = 'approved';
            request.approvedDate = new Date().toISOString();
            
            await window.db.put('employeeRequests', request);
            
            // Reload and refresh display
            await this.loadRequests();
            this.displayPendingRequests();
            this.updateDashboardStats();
            
            if (window.showNotification) {
                window.showNotification('Request approved', 'success');
            }
        } catch (error) {
            console.error('Failed to approve request:', error);
            if (window.showNotification) {
                window.showNotification('Failed to approve request', 'error');
            }
        }
    }

    async rejectRequest(requestId) {
        try {
            const request = this.requests.find(r => r.id === requestId);
            if (!request) return;
            
            request.status = 'rejected';
            request.rejectedDate = new Date().toISOString();
            
            await window.db.put('employeeRequests', request);
            
            // Reload and refresh display
            await this.loadRequests();
            this.displayPendingRequests();
            this.updateDashboardStats();
            
            if (window.showNotification) {
                window.showNotification('Request rejected', 'success');
            }
        } catch (error) {
            console.error('Failed to reject request:', error);
            if (window.showNotification) {
                window.showNotification('Failed to reject request', 'error');
            }
        }
    }

    // Report generation functions
    viewPayrollSummaryReport() {
        // Generate payroll summary report
        const reportWindow = window.open('', '_blank');
        const reportHTML = `
            <html>
            <head>
                <title>Payroll Summary Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1f2937; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px; text-align: left; border: 1px solid #e5e7eb; }
                    th { background: #f3f4f6; font-weight: bold; }
                    .total-row { font-weight: bold; background: #f9fafb; }
                </style>
            </head>
            <body>
                <h1>Payroll Summary Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                
                <h2>Monthly Payroll by Department</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Gross Pay</th>
                            <th>Deductions</th>
                            <th>Net Pay</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.payrollRecords.map(record => `
                            <tr>
                                <td>${record.employeeName}</td>
                                <td>${record.department || 'General'}</td>
                                <td>₱${record.grossPay.toFixed(2)}</td>
                                <td>₱${record.totalDeductions.toFixed(2)}</td>
                                <td>₱${record.netPay.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2">Total</td>
                            <td>₱${this.payrollRecords.reduce((sum, r) => sum + r.grossPay, 0).toFixed(2)}</td>
                            <td>₱${this.payrollRecords.reduce((sum, r) => sum + r.totalDeductions, 0).toFixed(2)}</td>
                            <td>₱${this.payrollRecords.reduce((sum, r) => sum + r.netPay, 0).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </body>
            </html>
        `;
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
    }

    generatePayslips() {
        // Generate bulk payslips
        if (this.payrollRecords.length === 0) {
            if (window.showNotification) {
                window.showNotification('No payroll records to generate payslips', 'warning');
            }
            return;
        }
        
        // Generate payslips for all records
        this.payrollRecords.forEach(record => {
            this.generatePayslip(record.id);
        });
        
        if (window.showNotification) {
            window.showNotification(`Generated ${this.payrollRecords.length} payslips`, 'success');
        }
    }

    viewAttendanceReport() {
        // Generate attendance report
        const reportWindow = window.open('', '_blank');
        const reportHTML = `
            <html>
            <head>
                <title>Attendance Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1f2937; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px; text-align: left; border: 1px solid #e5e7eb; }
                    th { background: #f3f4f6; font-weight: bold; }
                    .late { color: #ef4444; }
                    .on-time { color: #10b981; }
                </style>
            </head>
            <body>
                <h1>Employee Attendance Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Total Days</th>
                            <th>Present</th>
                            <th>Late</th>
                            <th>Absent</th>
                            <th>Attendance Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.employees.map(employee => {
                            const records = this.attendanceRecords.filter(r => r.employeeId === employee.id);
                            const lateRecords = records.filter(r => r.isLate);
                            const attendanceRate = records.length > 0 ? ((records.length / 30) * 100).toFixed(1) : 0;
                            
                            return `
                                <tr>
                                    <td>${employee.name}</td>
                                    <td>30</td>
                                    <td>${records.length}</td>
                                    <td class="late">${lateRecords.length}</td>
                                    <td>${30 - records.length}</td>
                                    <td class="${attendanceRate >= 90 ? 'on-time' : 'late'}">${attendanceRate}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
    }

    generateGovernmentRemittances() {
        // Generate government remittances report
        const reportWindow = window.open('', '_blank');
        const reportHTML = `
            <html>
            <head>
                <title>Government Remittances Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1f2937; }
                    .section { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { padding: 10px; text-align: left; border: 1px solid #e5e7eb; }
                    th { background: #f3f4f6; font-weight: bold; }
                    .total-row { font-weight: bold; background: #f9fafb; }
                </style>
            </head>
            <body>
                <h1>Government Remittances Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                
                <div class="section">
                    <h2>SSS Contributions</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>SSS Number</th>
                                <th>Employee Share</th>
                                <th>Employer Share</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.payrollRecords.map(record => `
                                <tr>
                                    <td>${record.employeeName}</td>
                                    <td>${record.sssNumber || 'N/A'}</td>
                                    <td>₱${record.sss.toFixed(2)}</td>
                                    <td>₱${record.sss.toFixed(2)}</td>
                                    <td>₱${(record.sss * 2).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2">Total</td>
                                <td>₱${this.payrollRecords.reduce((sum, r) => sum + r.sss, 0).toFixed(2)}</td>
                                <td>₱${this.payrollRecords.reduce((sum, r) => sum + r.sss, 0).toFixed(2)}</td>
                                <td>₱${this.payrollRecords.reduce((sum, r) => sum + (r.sss * 2), 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <h2>PhilHealth Contributions</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>PhilHealth Number</th>
                                <th>Contribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.payrollRecords.map(record => `
                                <tr>
                                    <td>${record.employeeName}</td>
                                    <td>${record.philHealthNumber || 'N/A'}</td>
                                    <td>₱${record.philHealth.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2">Total</td>
                                <td>₱${this.payrollRecords.reduce((sum, r) => sum + r.philHealth, 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <h2>Pag-IBIG Contributions</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Pag-IBIG Number</th>
                                <th>Contribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.payrollRecords.map(record => `
                                <tr>
                                    <td>${record.employeeName}</td>
                                    <td>${record.pagIbigNumber || 'N/A'}</td>
                                    <td>₱${record.pagIbig.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2">Total</td>
                                <td>₱${this.payrollRecords.reduce((sum, r) => sum + r.pagIbig, 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
    }
}

// Create and export payroll manager
const payrollManager = new PayrollManager();
window.payrollManager = payrollManager;

export default payrollManager;