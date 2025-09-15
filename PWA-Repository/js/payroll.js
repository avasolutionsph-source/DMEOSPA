// Payroll Management System
// NOTE: This system focuses on payroll calculations and management.
// Attendance management has been moved to the dedicated Attendance page.
// This system only REFERENCES attendance data for payroll calculations.
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
    
    // Get authentication token for API requests
    getAuthToken() {
        // Use global token manager if available
        if (window.getAuthToken) {
            return window.getAuthToken();
        }
        
        // Check auth system if available
        if (window.authSystem && window.authSystem.authToken) {
            return window.authSystem.authToken;
        }
        
        // Check multiple possible token locations
        const possibleKeys = ['authToken', 'userToken', 'jwt_token', 'token'];
        
        for (const key of possibleKeys) {
            // Check localStorage first
            let token = localStorage.getItem(key);
            if (token && token !== 'null' && token !== 'undefined') {
                return token;
            }
            
            // Then check sessionStorage
            token = sessionStorage.getItem(key);
            if (token && token !== 'null' && token !== 'undefined') {
                return token;
            }
        }
        
        return null;
    }

    async init() {
        console.log('🚀 Initializing Payroll System...');
        try {
            await this.loadAttendanceRules();
            await this.loadEmployees();
            await this.loadHolidays();
            await this.loadPayrollRecords();
            await this.loadRequests();
            
            
            this.setupEventListeners();
            this.updateDashboardStats();
            
            // Display initial data
            this.displayPayrollRecords();
            this.displayPayrollRecordsTable();
            // Attendance records are managed in the dedicated Attendance page
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
                    businessCloseTime: '18:00',
                    lateGraceMinutes: 5,
                    checkOutGracePeriodMinutes: 15,
                    earlyDepartureDeductionType: 'progressive', // 'progressive', 'fixed', 'none'
                    maxDailyEarlyDepartureDeduction: 4, // hours
                    latePenaltyMinusOneHour: true,
                    overtimeRequiresApproval: true,
                    nightDifferentialStart: '22:00',
                    nightDifferentialEnd: '06:00',
                    nightDifferentialRate: 0.1, // 10%
                };
                // Save default rules
                await window.db.add('attendanceRules', this.attendanceRules);
            }
            
            // Load payroll settings
            await this.loadPayrollSettings();
        } catch (error) {
            console.error('Failed to load attendance rules:', error);
        }
    }

    async loadPayrollSettings() {
        try {
            const settings = await window.db.getAll('payrollSettings');
            if (settings && settings.length > 0) {
                this.payrollSettings = settings[0];
            } else {
                // Default payroll settings - employee salaries now configured individually
                this.payrollSettings = {
                    nightDifferentialRate: 0.10, // 10%
                    philhealthRate: 0.02, // 2% employee share
                    pagibigRate: 0.02, // 2%
                    sssCalculationType: 'table', // 'table' or 'percentage'
                    sssRate: 0.045, // 4.5% employee share for percentage method
                    sssMinContribution: 135, // Minimum monthly contribution
                    sssMaxContribution: 900, // Maximum monthly contribution
                    sssTable: null, // Will use default table if not configured
                    taxCalculationType: 'bir', // 'bir' or 'simplified'
                    simplifiedTaxRate: 0.08, // 8% flat rate for simplified method
                    taxExemption: 20833, // Monthly tax exemption amount
                    taxBrackets: null, // Will use default BIR brackets if not configured
                    lateDeductionType: 'progressive',
                    maxDailyLateDeduction: 4 // hours
                };
                // Save default settings
                await window.db.add('payrollSettings', this.payrollSettings);
            }
            
            // Update UI with loaded settings
            this.updateSettingsUI();
        } catch (error) {
            console.error('Failed to load payroll settings:', error);
        }
    }

    updateSettingsUI() {
        // Update form fields with loaded settings - employee salaries configured individually
        const fields = [
            'nightDiffRate',
            'philhealthRate',
            'pagibigRate',
            'sssCalculationType',
            'taxCalculationType',
            'lateDeductionType',
            'maxDailyLateDeduction'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && this.payrollSettings) {
                if (element.type === 'select-one') {
                    element.value = this.payrollSettings[field] || element.value;
                } else {
                    let value = this.payrollSettings[field];
                    // Convert percentage rates for UI display
                    if (field.includes('Rate') && field !== 'defaultDailyRate' && field !== 'defaultMonthlyRate') {
                        value = (value * 100); // Convert 0.10 to 10 for display
                    }
                    element.value = value || element.value;
                }
            }
        });
        
        // Update attendance rules UI
        if (this.attendanceRules) {
            const businessOpenTime = document.getElementById('businessOpenTime');
            const businessCloseTime = document.getElementById('businessCloseTime');
            const lateGracePeriod = document.getElementById('lateGracePeriod');
            const checkOutGracePeriod = document.getElementById('checkOutGracePeriod');
            const earlyDepartureDeductionType = document.getElementById('earlyDepartureDeductionType');
            const maxDailyEarlyDepartureDeduction = document.getElementById('maxDailyEarlyDepartureDeduction');
            const nightDiffStart = document.getElementById('nightDiffStart');
            const nightDiffEnd = document.getElementById('nightDiffEnd');
            
            if (businessOpenTime) businessOpenTime.value = this.attendanceRules.businessOpenTime || '08:00';
            if (businessCloseTime) businessCloseTime.value = this.attendanceRules.businessCloseTime || '18:00';
            if (lateGracePeriod) lateGracePeriod.value = this.attendanceRules.lateGraceMinutes || 15;
            if (checkOutGracePeriod) checkOutGracePeriod.value = this.attendanceRules.checkOutGracePeriodMinutes || 15;
            if (earlyDepartureDeductionType) earlyDepartureDeductionType.value = this.attendanceRules.earlyDepartureDeductionType || 'progressive';
            if (maxDailyEarlyDepartureDeduction) maxDailyEarlyDepartureDeduction.value = this.attendanceRules.maxDailyEarlyDepartureDeduction || 4;
            if (nightDiffStart) nightDiffStart.value = this.attendanceRules.nightDifferentialStart || '22:00';
            if (nightDiffEnd) nightDiffEnd.value = this.attendanceRules.nightDifferentialEnd || '06:00';
        }
    }

    async loadEmployees() {
        try {
            console.log('👥 [PAYROLL] Loading employees from MongoDB API...');
            
            // Get authentication token
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ [PAYROLL] No authentication token found');
                this.employees = [];
                this.populateEmployeeDropdowns();
                return;
            }
            
            // Direct API call to MongoDB (same as Employee Management)
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/employees`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const employees = result.data || [];
                console.log(`✅ [PAYROLL] Loaded ${employees.length} employees from MongoDB`);
                
                // Process employees with salary configurations and name conversion
                this.employees = employees.map(emp => ({
                    ...emp,
                    // Convert MongoDB _id to id for PWA compatibility
                    id: emp._id || emp.id,
                    // Convert firstName/lastName to name for PWA compatibility
                    name: emp.firstName ? `${emp.firstName} ${emp.lastName}`.trim() : emp.name,
                    // Individual salary configurations
                    wageType: emp.salaryType || 'daily',
                    dailyRate: emp.dailyRate || 0,
                    monthlyRate: emp.monthlyRate || 0,
                    hourlyRate: emp.hourlyRate || 0,
                    overtimeMultiplier: emp.overtimeMultiplier || 1.25,
                    sssNumber: emp.sssNumber || '',
                    philHealthNumber: emp.philHealthNumber || '',
                    pagIbigNumber: emp.pagIbigNumber || '',
                    tinNumber: emp.tinNumber || '',
                    allowances: emp.allowances || 0,
                    deductions: emp.deductions || 0,
                    // Government benefits configuration
                    hasSSS: emp.hasSSS || false,
                    hasPhilHealth: emp.hasPhilHealth || false,
                    hasPagibig: emp.hasPagibig || false
                }));
            } else {
                console.error('❌ [PAYROLL] Failed to load employees:', response.status);
                this.employees = [];
            }
            
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
            
            // Add sample requests for pok@gmail.com account ONLY if no requests exist
            const currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            // Initialize empty requests array if none exist
            if (this.requests.length === 0) {
                this.requests = [];
            }
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
        const earlyDepartureDeduction = this.calculateEarlyDepartureDeductions(employee, attendanceRecords);
        const tips = await this.calculateTipsCommissions(employeeId, periodStart, periodEnd);
        
        // Government deductions
        const sss = this.calculateSSS(basePay);
        const philHealth = this.calculatePhilHealth(basePay);
        const pagIbig = this.calculatePagIbig(basePay);
        const tax = this.calculateWithholdingTax(basePay);
        
        const grossPay = basePay + overtime + nightDiff + holidayPay + tips - latePenalty - earlyDepartureDeduction;
        const totalDeductions = sss + philHealth + pagIbig + tax + employee.deductions;
        const netPay = grossPay - totalDeductions + employee.allowances;

        console.log(`💰 [PAYROLL] Final calculation for ${employee.name}:`, {
            basePay,
            overtime,
            nightDiff,
            holidayPay,
            tips,
            latePenalty,
            earlyDepartureDeduction,
            grossPay,
            sss,
            philHealth,
            pagIbig,
            tax,
            otherDeductions: employee.deductions,
            allowances: employee.allowances,
            totalDeductions,
            netPay
        });

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
            earlyDepartureDeduction,
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
                totalLateMinutes: attendanceRecords.reduce((sum, a) => sum + (a.lateMinutes || 0), 0),
                earlyDepartureCount: attendanceRecords.filter(a => a.checkOutDeduction && a.checkOutDeduction > 0).length,
                totalEarlyDepartureHours: attendanceRecords.reduce((sum, a) => sum + (a.checkOutDeduction || 0), 0)
            }
        };
    }

    calculateBasePay(employee, attendanceRecords, periodStart, periodEnd) {
        console.log(`💰 [PAYROLL] Calculating base pay for ${employee.name}:`, {
            wageType: employee.wageType,
            dailyRate: employee.dailyRate,
            monthlyRate: employee.monthlyRate,
            attendanceRecordsCount: attendanceRecords.length,
            attendanceRecords: attendanceRecords.map(r => ({ date: r.date, employeeId: r.employeeId }))
        });
        
        if (employee.wageType === 'monthly') {
            // For monthly, calculate based on days worked vs total work days
            const totalWorkDays = this.getWorkDaysInPeriod(periodStart, periodEnd);
            const daysWorked = attendanceRecords.length;
            const basePay = (employee.monthlyRate / totalWorkDays) * daysWorked;
            console.log(`💰 [PAYROLL] Monthly calculation: ₱${employee.monthlyRate} / ${totalWorkDays} * ${daysWorked} = ₱${basePay}`);
            return basePay;
        } else {
            // Daily wage
            const basePay = employee.dailyRate * attendanceRecords.length;
            console.log(`💰 [PAYROLL] Daily calculation: ₱${employee.dailyRate} * ${attendanceRecords.length} = ₱${basePay}`);
            return basePay;
        }
    }

    calculateOvertime(employee, attendanceRecords, approvedOT) {
        let totalOT = 0;
        const hourlyRate = employee.wageType === 'monthly' 
            ? employee.monthlyRate / 22 / 8  // Assuming 22 work days, 8 hours
            : employee.dailyRate / 8;

        // Use employee's individual overtime multiplier
        const overtimeMultiplier = employee.overtimeMultiplier || 1.25;

        approvedOT.forEach(ot => {
            totalOT += ot.hours * hourlyRate * overtimeMultiplier;
        });

        return totalOT;
    }

    calculateNightDifferential(employee, attendanceRecords) {
        let totalNightDiff = 0;
        const hourlyRate = employee.wageType === 'monthly' 
            ? employee.monthlyRate / 22 / 8
            : employee.dailyRate / 8;

        const nightDiffRate = this.payrollSettings?.nightDifferentialRate || this.attendanceRules.nightDifferentialRate || 0.1;

        attendanceRecords.forEach(record => {
            const nightHours = this.calculateNightHours(record);
            totalNightDiff += nightHours * hourlyRate * nightDiffRate;
        });

        return totalNightDiff;
    }

    calculateNightHours(attendanceRecord) {
        if (!attendanceRecord.checkInTime || !attendanceRecord.checkOutTime) {
            return 0; // No valid times recorded
        }

        // Get configured night differential period
        const nightStart = this.attendanceRules?.nightDifferentialStart || '22:00';
        const nightEnd = this.attendanceRules?.nightDifferentialEnd || '06:00';

        // Parse times to minutes since midnight for easier calculation
        const parseTimeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const checkIn = parseTimeToMinutes(attendanceRecord.checkInTime);
        const checkOut = parseTimeToMinutes(attendanceRecord.checkOutTime);
        const nightStartMin = parseTimeToMinutes(nightStart);
        const nightEndMin = parseTimeToMinutes(nightEnd);

        let nightMinutes = 0;

        // Handle night period that crosses midnight (e.g., 22:00 to 06:00)
        if (nightStartMin > nightEndMin) {
            // Night period: nightStart to 24:00, then 00:00 to nightEnd
            
            // Case 1: Work entirely within same day
            if (checkIn <= checkOut) {
                // Check overlap with evening night period (nightStart to 24:00)
                if (checkOut > nightStartMin) {
                    const eveningStart = Math.max(checkIn, nightStartMin);
                    const eveningEnd = Math.min(checkOut, 24 * 60);
                    nightMinutes += Math.max(0, eveningEnd - eveningStart);
                }
                
                // Check overlap with morning night period (00:00 to nightEnd)
                if (checkIn < nightEndMin) {
                    const morningStart = Math.max(checkIn, 0);
                    const morningEnd = Math.min(checkOut, nightEndMin);
                    nightMinutes += Math.max(0, morningEnd - morningStart);
                }
            }
            // Case 2: Work crosses midnight (e.g., 23:00 to 07:00 next day)
            else {
                // Evening portion: checkIn to midnight
                if (checkIn >= nightStartMin) {
                    nightMinutes += (24 * 60) - checkIn;
                } else if (checkIn < nightStartMin) {
                    nightMinutes += (24 * 60) - nightStartMin;
                }
                
                // Morning portion: midnight to checkOut
                if (checkOut <= nightEndMin) {
                    nightMinutes += checkOut;
                } else if (checkOut > nightEndMin) {
                    nightMinutes += nightEndMin;
                }
            }
        } 
        // Handle night period within same day (rare, but possible)
        else {
            const nightWorkStart = Math.max(checkIn, nightStartMin);
            const nightWorkEnd = Math.min(checkOut, nightEndMin);
            nightMinutes = Math.max(0, nightWorkEnd - nightWorkStart);
        }

        // Convert minutes to hours (rounded to nearest 0.25 for precision)
        const nightHours = Math.round(nightMinutes / 15) / 4; // Round to nearest quarter hour
        
        console.log(`Night hours calculation: ${attendanceRecord.checkInTime}-${attendanceRecord.checkOutTime}, Night period: ${nightStart}-${nightEnd}, Result: ${nightHours}h`);
        
        return nightHours;
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
        // Check if late deductions are enabled
        const deductionType = this.payrollSettings?.lateDeductionType || 'none';
        if (deductionType === 'none') {
            return 0;
        }

        const hourlyRate = employee.wageType === 'monthly' 
            ? employee.monthlyRate / 22 / 8
            : employee.dailyRate / 8;

        const gracePeriod = this.attendanceRules?.lateGraceMinutes || 15;
        const maxDailyDeduction = this.payrollSettings?.maxDailyLateDeduction || 4;
        
        let totalPenaltyHours = 0;

        attendanceRecords.forEach(record => {
            const minutesLate = record.minutesLate || record.lateMinutes || 0;
            if (!record.isLate || !minutesLate) {
                return; // No penalty if not late or no minutes recorded
            }

            // Skip if within grace period
            if (minutesLate <= gracePeriod) {
                return;
            }

            let penaltyHours = 0;
            const effectiveLateMinutes = minutesLate - gracePeriod;

            if (deductionType === 'progressive') {
                // Progressive: 16-60min = 1hr, 61-120min = 2hr, 121-180min = 3hr, etc.
                penaltyHours = Math.floor(effectiveLateMinutes / 60) + 1;
                
                // Cap daily penalty
                penaltyHours = Math.min(penaltyHours, maxDailyDeduction);
                
            } else if (deductionType === 'fixed') {
                // Fixed: Always 1 hour per late (original behavior)
                penaltyHours = 1;
            }

            totalPenaltyHours += penaltyHours;

            // Log the penalty calculation for transparency
            console.log(`📝 Late Penalty: ${record.date} - ${minutesLate}min late (effective: ${effectiveLateMinutes}min) = ${penaltyHours}hr deduction`);
        });

        const totalPenaltyAmount = totalPenaltyHours * hourlyRate;
        
        console.log(`⚖️ Total Late Penalty: ${totalPenaltyHours} hours × ₱${hourlyRate.toFixed(2)}/hr = ₱${totalPenaltyAmount.toFixed(2)}`);
        
        return totalPenaltyAmount;
    }

    calculateEarlyDepartureDeductions(employee, attendanceRecords) {
        const hourlyRate = employee.wageType === 'monthly' 
            ? employee.monthlyRate / 22 / 8
            : employee.dailyRate / 8;

        // Check if early departure deductions are enabled
        const deductionType = this.attendanceRules?.earlyDepartureDeductionType || 'progressive';
        if (deductionType === 'none') {
            return 0;
        }

        const gracePeriod = this.attendanceRules?.checkOutGracePeriodMinutes || 15;
        const businessCloseTime = this.attendanceRules?.businessCloseTime || '18:00';
        const maxDailyDeduction = this.attendanceRules?.maxDailyEarlyDepartureDeduction || 4;

        let totalDeductionAmount = 0;

        attendanceRecords.forEach(record => {
            // Check if record has early departure deduction data from check-out
            if (record.checkOutDeduction && record.checkOutDeduction > 0) {
                let deductionHours = record.checkOutDeduction;

                // Apply deduction type logic if we need to recalculate
                if (record.earlyDepartureMinutes && deductionType !== 'progressive') {
                    const effectiveEarlyMinutes = Math.max(0, record.earlyDepartureMinutes - gracePeriod);
                    
                    if (deductionType === 'fixed') {
                        // Fixed: Always 1 hour per early departure
                        deductionHours = effectiveEarlyMinutes > 0 ? 1 : 0;
                    } else if (deductionType === 'progressive') {
                        // Progressive: Round up to next hour (default behavior)
                        deductionHours = effectiveEarlyMinutes > 0 ? Math.ceil(effectiveEarlyMinutes / 60) : 0;
                    }
                    
                    // Cap daily penalty
                    deductionHours = Math.min(deductionHours, maxDailyDeduction);
                }

                const deductionAmount = deductionHours * hourlyRate;
                totalDeductionAmount += deductionAmount;
                
                // Log the deduction calculation for transparency
                console.log(`📅 Early Departure: ${record.date} - ${deductionHours}hr deduction (${deductionType} method) = ₱${deductionAmount.toFixed(2)}`);
            }
        });
        
        if (totalDeductionAmount > 0) {
            console.log(`⏰ Total Early Departure Deduction: ₱${totalDeductionAmount.toFixed(2)}`);
        }
        
        return totalDeductionAmount;
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
        const calculationType = this.payrollSettings?.sssCalculationType || 'table';
        
        if (calculationType === 'percentage') {
            // Percentage-based calculation (employee share of 4.5%)
            const rate = this.payrollSettings?.sssRate || 0.045;
            const minContribution = this.payrollSettings?.sssMinContribution || 135;
            const maxContribution = this.payrollSettings?.sssMaxContribution || 1800;
            
            const contribution = basePay * rate;
            return Math.max(minContribution, Math.min(contribution, maxContribution));
        }
        
        // Table-based calculation (configurable brackets)
        const sssTable = this.payrollSettings?.sssTable || this.getDefaultSSSTable();
        
        for (const bracket of sssTable) {
            if (basePay <= bracket.maxSalary) {
                return bracket.contribution;
            }
        }
        
        // Return maximum contribution if salary exceeds all brackets
        return sssTable[sssTable.length - 1].contribution;
    }

    getDefaultSSSTable() {
        // Default SSS contribution table (2023 rates - employee share)
        return [
            { maxSalary: 4250, contribution: 180 },
            { maxSalary: 4750, contribution: 202.50 },
            { maxSalary: 5250, contribution: 225 },
            { maxSalary: 5750, contribution: 247.50 },
            { maxSalary: 6250, contribution: 270 },
            { maxSalary: 6750, contribution: 292.50 },
            { maxSalary: 7250, contribution: 315 },
            { maxSalary: 7750, contribution: 337.50 },
            { maxSalary: 8250, contribution: 360 },
            { maxSalary: 8750, contribution: 382.50 },
            { maxSalary: 9250, contribution: 405 },
            { maxSalary: 9750, contribution: 427.50 },
            { maxSalary: 10250, contribution: 450 },
            { maxSalary: 10750, contribution: 472.50 },
            { maxSalary: 11250, contribution: 495 },
            { maxSalary: 11750, contribution: 517.50 },
            { maxSalary: 12250, contribution: 540 },
            { maxSalary: 12750, contribution: 562.50 },
            { maxSalary: 13250, contribution: 585 },
            { maxSalary: 13750, contribution: 607.50 },
            { maxSalary: 14250, contribution: 630 },
            { maxSalary: 14750, contribution: 652.50 },
            { maxSalary: 15250, contribution: 675 },
            { maxSalary: 15750, contribution: 697.50 },
            { maxSalary: 16250, contribution: 720 },
            { maxSalary: 16750, contribution: 742.50 },
            { maxSalary: 17250, contribution: 765 },
            { maxSalary: 17750, contribution: 787.50 },
            { maxSalary: 18250, contribution: 810 },
            { maxSalary: 18750, contribution: 832.50 },
            { maxSalary: 19250, contribution: 855 },
            { maxSalary: 19750, contribution: 877.50 },
            { maxSalary: Infinity, contribution: 900 } // Maximum contribution
        ];
    }

    calculatePhilHealth(basePay) {
        // Use configurable rate (default 2% employee share)
        const rate = this.payrollSettings?.philhealthRate || 0.02;
        return basePay * rate;
    }

    calculatePagIbig(basePay) {
        // Use configurable rate (default 2%)
        const rate = this.payrollSettings?.pagibigRate || 0.02;
        if (basePay <= 1500) return basePay * (rate / 2); // Lower rate for low earners
        return Math.min(basePay * rate, 100); // Maximum 100 peso contribution
    }

    calculateWithholdingTax(basePay) {
        const calculationType = this.payrollSettings?.taxCalculationType || 'bir';
        
        if (calculationType === 'simplified') {
            // Simplified percentage-based calculation
            const rate = this.payrollSettings?.simplifiedTaxRate || 0.08; // 8% flat rate
            const exemption = this.payrollSettings?.taxExemption || 20833; // Monthly exemption
            
            if (basePay <= exemption) return 0;
            return (basePay - exemption) * rate;
        }
        
        // BIR-compliant calculation (configurable brackets)
        const taxBrackets = this.payrollSettings?.taxBrackets || this.getDefaultTaxBrackets();
        
        // Find the appropriate tax bracket
        for (const bracket of taxBrackets) {
            if (basePay > bracket.minIncome && basePay <= bracket.maxIncome) {
                const taxableAmount = basePay - bracket.minIncome;
                const tax = bracket.baseTax + (taxableAmount * bracket.rate);
                return Math.max(0, tax);
            }
        }
        
        return 0; // Should not reach here with properly configured brackets
    }

    getDefaultTaxBrackets() {
        // Default BIR tax brackets (2023) - monthly basis
        return [
            { 
                minIncome: 0, 
                maxIncome: 20833, 
                rate: 0, 
                baseTax: 0,
                description: "Tax-exempt" 
            },
            { 
                minIncome: 20833, 
                maxIncome: 33333, 
                rate: 0.20, 
                baseTax: 0,
                description: "20%" 
            },
            { 
                minIncome: 33333, 
                maxIncome: 66667, 
                rate: 0.25, 
                baseTax: 2500,
                description: "25%" 
            },
            { 
                minIncome: 66667, 
                maxIncome: 166667, 
                rate: 0.30, 
                baseTax: 10833,
                description: "30%" 
            },
            { 
                minIncome: 166667, 
                maxIncome: 666667, 
                rate: 0.32, 
                baseTax: 40833,
                description: "32%" 
            },
            { 
                minIncome: 666667, 
                maxIncome: Infinity, 
                rate: 0.35, 
                baseTax: 200833,
                description: "35%" 
            }
        ];
    }

    async getAttendanceForPeriod(employeeId, periodStart, periodEnd) {
        try {
            console.log(`📋 [PAYROLL] Loading attendance from MongoDB API for employee ${employeeId}...`);
            
            // Get authentication token
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ [PAYROLL] No authentication token found for attendance');
                return [];
            }
            
            // Call MongoDB attendance API
            const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'https://daetspa-backend.onrender.com'}/api/attendance`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const allAttendance = result.data || [];
                console.log(`✅ [PAYROLL] Loaded ${allAttendance.length} attendance records from MongoDB`);
                
                // Filter for specific employee and date range
                const filtered = allAttendance.filter(a => 
                    a.employeeId === employeeId &&
                    new Date(a.date) >= new Date(periodStart) &&
                    new Date(a.date) <= new Date(periodEnd)
                );
                
                console.log(`📊 [PAYROLL] Found ${filtered.length} attendance records for employee ${employeeId} between ${periodStart} and ${periodEnd}`);
                return filtered;
            } else {
                console.error('❌ [PAYROLL] Failed to load attendance from API:', response.status, response.statusText);
                return [];
            }
        } catch (error) {
            console.error('❌ [PAYROLL] Error loading attendance from MongoDB API:', error);
            return [];
        }
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
            const payrollRecord = {
                ...payroll,
                status: 'pending',
                createdAt: new Date().toISOString(),
                createdBy: 'system'
            };
            
            const id = await window.db.add('payroll', payrollRecord);
            payrollRecord.id = id; // Store the generated ID
            
            // Add to audit log
            await this.addAuditLog('PAYROLL_PROCESSED', 'payroll', payroll.employeeId, payroll);
            
            // 🔄 TRIGGER SYNC: Upload payroll to MongoDB for cross-device access
            if (window.syncManager) {
                console.log('💾 Triggering payroll sync after processing...');
                window.syncManager.triggerSync();
            }
        }

        // 🔄 CRITICAL FIX: Refresh payroll records after processing to include new data
        console.log('🔄 [PAYROLL] Refreshing payroll records after processing...');
        this.payrollRecords = await window.db.getAll('payroll');
        console.log(`✅ [PAYROLL] Loaded ${this.payrollRecords.length} payroll records from storage`);
        
        // Update display
        this.displayPayrollRecordsTable();

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

    // NOTE: Attendance management has been moved to the dedicated Attendance page
    // This function is kept for backward compatibility but should not be used
    // Use the Attendance page for all attendance management
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
                        <span style="background: #800020; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                            ${emp.name}
                        </span>
                    `).join('')}
                </div>
            `;
        } else if (select.value) {
            const employee = this.employees.find(e => e.id == select.value);
            if (employee) {
                display.innerHTML = `
                    <span style="background: var(--primary-color, #800020); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
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
            
            // 🔄 TRIGGER SYNC: Upload batch payroll to MongoDB for cross-device access
            if (window.syncManager) {
                console.log('💾 Triggering payroll sync after batch processing...');
                window.syncManager.triggerSync();
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
                <td style="color: #800020;">-₱${record.totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="color: #800020; font-weight: 600;">₱${record.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                    <span style="background: ${record.status === 'paid' ? '#800020' : '#600015'}; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">
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
                        <p style="margin: 0.25rem 0; color: #800020; font-weight: 600;">-₱${record.totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p style="margin: 0; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">Net Pay</p>
                        <p style="margin: 0.25rem 0; color: #800020; font-weight: 700; font-size: 1.125rem;">₱${record.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                            <span>Early Departure:</span>
                            <span>₱${(record.earlyDepartureDeduction || 0).toFixed(2)}</span>
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
            
            // 🔄 TRIGGER SYNC: Upload payroll status update to MongoDB
            if (window.syncManager) {
                console.log('💾 Triggering payroll sync after marking as paid...');
                window.syncManager.triggerSync();
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
        
        // Business operating hours calculation
        const businessOpenTime = document.getElementById('businessOpenTime');
        const businessCloseTime = document.getElementById('businessCloseTime');
        if (businessOpenTime) {
            businessOpenTime.addEventListener('change', () => this.calculateBusinessOperatingHours());
        }
        if (businessCloseTime) {
            businessCloseTime.addEventListener('change', () => this.calculateBusinessOperatingHours());
        }
        
        // Calculate initial business operating hours on load
        this.calculateBusinessOperatingHours();
        
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

    // Save payroll settings
    async savePayrollSettings() {
        try {
            // Get values from UI - employee salaries configured individually
            const settings = {
                nightDifferentialRate: parseFloat(document.getElementById('nightDiffRate')?.value) / 100 || 0.10,
                philhealthRate: parseFloat(document.getElementById('philhealthRate')?.value) / 100 || 0.02,
                pagibigRate: parseFloat(document.getElementById('pagibigRate')?.value) / 100 || 0.02,
                sssCalculationType: document.getElementById('sssCalculationType')?.value || 'table',
                sssRate: parseFloat(document.getElementById('sssRate')?.value) / 100 || 0.045,
                sssMinContribution: parseFloat(document.getElementById('sssMinContribution')?.value) || 135,
                sssMaxContribution: parseFloat(document.getElementById('sssMaxContribution')?.value) || 900,
                taxCalculationType: document.getElementById('taxCalculationType')?.value || 'bir',
                simplifiedTaxRate: parseFloat(document.getElementById('simplifiedTaxRate')?.value) / 100 || 0.08,
                taxExemption: parseFloat(document.getElementById('taxExemption')?.value) || 20833,
                lateDeductionType: document.getElementById('lateDeductionType')?.value || 'progressive',
                maxDailyLateDeduction: parseFloat(document.getElementById('maxDailyLateDeduction')?.value) || 4
            };

            // Update attendance rules
            const attendanceRules = {
                ...this.attendanceRules,
                businessOpenTime: document.getElementById('businessOpenTime')?.value || '08:00',
                businessCloseTime: document.getElementById('businessCloseTime')?.value || '18:00',
                lateGraceMinutes: parseInt(document.getElementById('lateGracePeriod')?.value) || 15,
                checkOutGracePeriodMinutes: parseInt(document.getElementById('checkOutGracePeriod')?.value) || 15,
                earlyDepartureDeductionType: document.getElementById('earlyDepartureDeductionType')?.value || 'progressive',
                maxDailyEarlyDepartureDeduction: parseInt(document.getElementById('maxDailyEarlyDepartureDeduction')?.value) || 4,
                nightDifferentialStart: document.getElementById('nightDiffStart')?.value || '22:00',
                nightDifferentialEnd: document.getElementById('nightDiffEnd')?.value || '06:00',
                nightDifferentialRate: settings.nightDifferentialRate
            };

            // Save to database
            if (this.payrollSettings && this.payrollSettings.id) {
                settings.id = this.payrollSettings.id;
                await window.db.update('payrollSettings', settings);
            } else {
                await window.db.add('payrollSettings', settings);
            }

            if (this.attendanceRules && this.attendanceRules.id) {
                await window.db.update('attendanceRules', attendanceRules);
            } else {
                await window.db.add('attendanceRules', attendanceRules);
            }

            // Update local objects
            this.payrollSettings = settings;
            this.attendanceRules = attendanceRules;

            // Reload employees with new default rates
            await this.loadEmployees();

            if (window.showNotification) {
                window.showNotification('Payroll settings saved successfully', 'success');
            }

        } catch (error) {
            console.error('Failed to save payroll settings:', error);
            if (window.showNotification) {
                window.showNotification('Failed to save settings', 'error');
            }
        }
    }

    // Reset to default values
    async resetToDefaults() {
        if (!confirm('Are you sure you want to reset all payroll settings to defaults?')) {
            return;
        }

        try {
            // Reset UI to defaults
            document.getElementById('defaultDailyRate').value = 500;
            document.getElementById('defaultMonthlyRate').value = 15000;
            document.getElementById('minimumHourlyRate').value = 62.50;
            document.getElementById('overtimeMultiplier').value = 1.25;
            document.getElementById('nightDiffRate').value = 10;
            document.getElementById('philhealthRate').value = 2.0;
            document.getElementById('pagibigRate').value = 2.0;
            document.getElementById('sssCalculationType').value = 'table';
            document.getElementById('taxCalculationType').value = 'bir';
            document.getElementById('lateDeductionType').value = 'progressive';
            document.getElementById('maxDailyLateDeduction').value = 4;
            document.getElementById('businessOpenTime').value = '08:00';
            document.getElementById('businessCloseTime').value = '18:00';
            document.getElementById('lateGracePeriod').value = 15;
            document.getElementById('checkOutGracePeriod').value = 15;
            document.getElementById('earlyDepartureDeductionType').value = 'progressive';
            document.getElementById('maxDailyEarlyDepartureDeduction').value = 4;
            document.getElementById('nightDiffStart').value = '22:00';

            if (window.showNotification) {
                window.showNotification('Settings reset to defaults. Click Save to apply changes.', 'info');
            }

        } catch (error) {
            console.error('Failed to reset settings:', error);
            if (window.showNotification) {
                window.showNotification('Failed to reset settings', 'error');
            }
        }
    }

    // Show payroll calculation guide
    showPayrollCalculationGuide() {
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
            padding: 1rem;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        `;
        
        // Get current settings for examples
        const dailyRate = this.payrollSettings?.defaultDailyRate || 500;
        const monthlyRate = this.payrollSettings?.defaultMonthlyRate || 15000;
        const otMultiplier = this.payrollSettings?.overtimeMultiplier || 1.25;
        const nightDiffRate = ((this.payrollSettings?.nightDifferentialRate || 0.10) * 100).toFixed(1);
        const philhealthRate = ((this.payrollSettings?.philhealthRate || 0.02) * 100).toFixed(1);
        const pagibigRate = ((this.payrollSettings?.pagibigRate || 0.02) * 100).toFixed(1);
        
        const hourlyFromDaily = (dailyRate / 8).toFixed(2);
        const hourlyFromMonthly = (monthlyRate / 22 / 8).toFixed(2);
        
        modalContent.innerHTML = `
            <div style="padding: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 2rem;">
                    <h2 style="margin: 0; color: #1f2937; font-size: 1.5rem;">
                        <i class="fas fa-calculator" style="color: #800020; margin-right: 0.5rem;"></i>
                        How Payroll is Calculated
                    </h2>
                    <button onclick="this.closest('div[style*=\\'position: fixed\\']').remove()" style="background: none; border: none; font-size: 1.5rem; color: #9ca3af; cursor: pointer; padding: 0.5rem;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div style="display: grid; gap: 2rem;">
                    <!-- Base Pay Section -->
                    <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.75rem;">
                            1. Base Pay Calculation
                        </h3>
                        <div style="display: grid; gap: 1.5rem;">
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Daily Rate Employees:</h4>
                                <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                    <div>Formula: Base Pay = Daily Rate × Days Worked</div>
                                    <div style="margin-top: 0.5rem; color: #666;">Example: ₱${dailyRate.toLocaleString()} × 22 days = ₱${(dailyRate * 22).toLocaleString()}</div>
                                </div>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Monthly Salary Employees:</h4>
                                <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                    <div>Formula: Base Pay = (Monthly Rate ÷ Work Days) × Days Worked</div>
                                    <div style="margin-top: 0.5rem; color: #666;">Example: (₱${monthlyRate.toLocaleString()} ÷ 22) × 20 = ₱${((monthlyRate / 22) * 20).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Overtime Section -->
                    <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.75rem;">
                            2. Overtime Pay Calculation
                        </h3>
                        <div style="display: grid; gap: 1.5rem;">
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Hourly Rate Conversion:</h4>
                                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: #666; line-height: 1.6;">
                                    <li>Daily Rate: ₱${dailyRate.toLocaleString()} ÷ 8 hours = ₱${hourlyFromDaily}/hour</li>
                                    <li>Monthly Salary: ₱${monthlyRate.toLocaleString()} ÷ 22 days ÷ 8 hours = ₱${hourlyFromMonthly}/hour</li>
                                </ul>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Overtime Formula:</h4>
                                <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                    <div>Overtime Pay = OT Hours × Hourly Rate × ${otMultiplier}</div>
                                    <div style="margin-top: 0.5rem; color: #666;">Example: 4 hours × ₱${hourlyFromDaily} × ${otMultiplier} = ₱${(4 * hourlyFromDaily * otMultiplier).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Night Differential Section -->
                    <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.75rem;">
                            3. Night Differential (10:00 PM - 6:00 AM)
                        </h3>
                        <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                            <div>Night Differential = Night Hours × Hourly Rate × ${nightDiffRate}%</div>
                            <div style="margin-top: 0.5rem; color: #666;">Example: 6 hours × ₱${hourlyFromDaily} × ${nightDiffRate}% = ₱${(6 * hourlyFromDaily * (nightDiffRate/100)).toFixed(2)}</div>
                        </div>
                    </div>

                    <!-- Holiday Pay Section -->
                    <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.75rem;">
                            4. Holiday Pay (Philippine Labor Code)
                        </h3>
                        <div style="display: grid; gap: 1rem;">
                            <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                <div>Regular Holiday: Daily Rate × 200%</div>
                                <div style="margin-top: 0.5rem; color: #666;">Example: ₱${dailyRate.toLocaleString()} × 2.00 = ₱${(dailyRate * 2).toLocaleString()}</div>
                            </div>
                            <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                <div>Special Non-Working Holiday: Daily Rate × 130%</div>
                                <div style="margin-top: 0.5rem; color: #666;">Example: ₱${dailyRate.toLocaleString()} × 1.30 = ₱${(dailyRate * 1.3).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Deductions Section -->
                    <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.75rem;">
                            5. Mandatory Government Deductions
                        </h3>
                        <div style="display: grid; gap: 1.5rem;">
                            <div>
                                <h4 style="margin: 0 0 0.5rem 0; color: #555; font-weight: 500;">SSS (Social Security System)</h4>
                                <p style="margin: 0; color: #666; font-size: 0.9rem; line-height: 1.5;">Contribution based on official SSS table (₱180-₱400 depending on salary bracket)</p>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">PhilHealth</h4>
                                <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                    <div>PhilHealth = Base Pay × ${philhealthRate}% (employee share)</div>
                                    <div style="margin-top: 0.5rem; color: #666;">Example: ₱${(dailyRate * 22).toLocaleString()} × ${philhealthRate}% = ₱${((dailyRate * 22) * (philhealthRate/100)).toFixed(2)}</div>
                                </div>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Pag-IBIG</h4>
                                <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                    <div>Pag-IBIG = Base Pay × ${pagibigRate}% (maximum ₱100)</div>
                                    <div style="margin-top: 0.5rem; color: #666;">Example: ₱${(dailyRate * 22).toLocaleString()} × ${pagibigRate}% = ₱${Math.min((dailyRate * 22) * (pagibigRate/100), 100).toFixed(2)}</div>
                                </div>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.5rem 0; color: #555; font-weight: 500;">Withholding Tax</h4>
                                <p style="margin: 0; color: #666; font-size: 0.9rem; line-height: 1.5;">Progressive tax rates per BIR Tax Code (Train Law): 0%, 20%, 25%, 30%, 32%</p>
                            </div>
                        </div>
                    </div>

                    <!-- Final Calculation Section -->
                    <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.75rem;">
                            6. Final Net Pay Calculation
                        </h3>
                        <div style="display: grid; gap: 1rem;">
                            <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                Gross Pay = Base Pay + Overtime + Night Differential + Holiday Pay + Tips - Late Penalties - Early Departure Deductions
                            </div>
                            <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                Total Deductions = SSS + PhilHealth + Pag-IBIG + Withholding Tax + Other Deductions
                            </div>
                            <div style="background: #333; color: white; padding: 1.25rem; border-radius: 4px; font-family: 'Courier New', monospace; font-weight: bold; text-align: center;">
                                NET PAY = Gross Pay - Total Deductions + Allowances
                            </div>
                        </div>
                    </div>

                    <!-- Late Penalty Section -->
                    <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.75rem;">
                            7. Late Penalty System
                        </h3>
                        <div style="display: grid; gap: 1.5rem;">
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Grace Period:</h4>
                                <p style="margin: 0; color: #666; font-size: 0.9rem; line-height: 1.5;">Employees have a ${this.attendanceRules?.lateGraceMinutes || 15}-minute grace period. No penalty is applied for lateness within this period.</p>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Progressive Penalty System:</h4>
                                <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                    <div>16-60 minutes late: 1 hour pay deduction</div>
                                    <div style="margin-top: 0.25rem;">61-120 minutes late: 2 hours pay deduction</div>
                                    <div style="margin-top: 0.25rem;">121-180 minutes late: 3 hours pay deduction</div>
                                    <div style="margin-top: 0.25rem; color: #666;">...and so on (progressive)</div>
                                </div>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Example Calculations:</h4>
                                <div style="display: grid; gap: 0.5rem;">
                                    <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                        <div>30 minutes late: 15min grace + 15min penalty = 1 hour deduction</div>
                                        <div style="margin-top: 0.25rem; color: #666;">₱${hourlyFromDaily} × 1 hour = ₱${hourlyFromDaily}</div>
                                    </div>
                                    <div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                        <div>90 minutes late: 15min grace + 75min penalty = 2 hours deduction</div>
                                        <div style="margin-top: 0.25rem; color: #666;">₱${hourlyFromDaily} × 2 hours = ₱${(hourlyFromDaily * 2).toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Early Departure Deduction Section -->
                    <div style="background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.75rem;">
                            8. Early Departure Deduction System (Configurable)
                        </h3>
                        <div style="display: grid; gap: 1.5rem;">
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Business Hours & Grace Period:</h4>
                                <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                                    <div style="font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                        <div><strong>Business Close Time:</strong> ${this.attendanceRules?.businessCloseTime || '18:00'}</div>
                                        <div style="margin-top: 0.25rem;"><strong>Grace Period:</strong> ${this.attendanceRules?.checkOutGracePeriodMinutes || 15} minutes before closing</div>
                                        <div style="margin-top: 0.25rem; color: #666;">Allowed checkout window: Until ${(() => {
                                            const closeTime = this.attendanceRules?.businessCloseTime || '18:00';
                                            const gracePeriod = this.attendanceRules?.checkOutGracePeriodMinutes || 15;
                                            const [hour, minute] = closeTime.split(':').map(Number);
                                            const allowedTime = new Date();
                                            allowedTime.setHours(hour, minute - gracePeriod, 0, 0);
                                            return allowedTime.toTimeString().slice(0, 5);
                                        })()} with no penalty</div>
                                    </div>
                                </div>
                                <p style="margin: 0; color: #666; font-size: 0.9rem; line-height: 1.5;">Employees can leave up to ${this.attendanceRules?.checkOutGracePeriodMinutes || 15} minutes before closing time without any deduction.</p>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Deduction Policy: ${(() => {
                                    const type = this.attendanceRules?.earlyDepartureDeductionType || 'progressive';
                                    return type.charAt(0).toUpperCase() + type.slice(1);
                                })()}</h4>
                                ${(() => {
                                    const deductionType = this.attendanceRules?.earlyDepartureDeductionType || 'progressive';
                                    if (deductionType === 'none') {
                                        return `<div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 1rem; border-radius: 4px;">
                                            <strong>No Early Departure Penalties:</strong> Employees can leave early without any pay deductions.
                                        </div>`;
                                    } else if (deductionType === 'fixed') {
                                        return `<div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                            <div><strong>Fixed Deduction Policy:</strong></div>
                                            <div style="margin-top: 0.5rem;">Any early departure (beyond grace period) = 1 hour pay deduction</div>
                                            <div style="margin-top: 0.25rem; color: #666;">Simple and consistent penalty regardless of early departure duration</div>
                                        </div>`;
                                    } else {
                                        return `<div style="background: #f5f5f5; border: 1px solid #ddd; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                            <div><strong>Progressive Deduction Policy:</strong></div>
                                            <div style="margin-top: 0.5rem;">1-60 minutes early: 1 hour pay deduction</div>
                                            <div style="margin-top: 0.25rem;">61-120 minutes early: 2 hours pay deduction</div>
                                            <div style="margin-top: 0.25rem;">121-180 minutes early: 3 hours pay deduction</div>
                                            <div style="margin-top: 0.25rem; color: #666;">...and so on (rounds up to next hour)</div>
                                        </div>`;
                                    }
                                })()}
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Maximum Daily Deduction Cap:</h4>
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 1rem; border-radius: 4px;">
                                    <div style="font-weight: 600; color: #856404;">Maximum: ${this.attendanceRules?.maxDailyEarlyDepartureDeduction || 4} hours per day</div>
                                    <div style="color: #856404; font-size: 0.9rem; margin-top: 0.25rem;">Even with multiple early departures, total deductions cannot exceed this daily limit.</div>
                                </div>
                            </div>
                            <div>
                                <h4 style="margin: 0 0 0.75rem 0; color: #555; font-weight: 500;">Example Calculations:</h4>
                                <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 1rem; border-radius: 4px;">
                                    <div style="font-family: 'Courier New', monospace; font-size: 0.9rem;">
                                        <div><strong>Scenario:</strong> Employee leaves at 17:30 (Business closes at ${this.attendanceRules?.businessCloseTime || '18:00'})</div>
                                        <div style="margin-top: 0.5rem;"><strong>Calculation:</strong></div>
                                        <div style="margin-left: 1rem; margin-top: 0.25rem;">• Grace period ends at: ${(() => {
                                            const closeTime = this.attendanceRules?.businessCloseTime || '18:00';
                                            const gracePeriod = this.attendanceRules?.checkOutGracePeriodMinutes || 15;
                                            const [hour, minute] = closeTime.split(':').map(Number);
                                            const allowedTime = new Date();
                                            allowedTime.setHours(hour, minute - gracePeriod, 0, 0);
                                            return allowedTime.toTimeString().slice(0, 5);
                                        })()}</div>
                                        <div style="margin-left: 1rem; margin-top: 0.25rem;">• Left at: 17:30 (15 minutes early)</div>
                                        <div style="margin-left: 1rem; margin-top: 0.25rem;">• Deduction: ${(() => {
                                            const deductionType = this.attendanceRules?.earlyDepartureDeductionType || 'progressive';
                                            if (deductionType === 'none') return '0 hours (no penalties)';
                                            if (deductionType === 'fixed') return '1 hour (fixed policy)';
                                            return '1 hour (15min rounds up to 1hr)';
                                        })()}</div>
                                        <div style="margin-left: 1rem; margin-top: 0.25rem; color: #666;">• Pay deduction: ₱${hourlyFromDaily} × ${(() => {
                                            const deductionType = this.attendanceRules?.earlyDepartureDeductionType || 'progressive';
                                            return deductionType === 'none' ? '0' : '1';
                                        })()} = ₱${(() => {
                                            const deductionType = this.attendanceRules?.earlyDepartureDeductionType || 'progressive';
                                            return deductionType === 'none' ? '0.00' : hourlyFromDaily;
                                        })()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Example Section -->
                    <div style="background: #f8f8f8; border: 2px solid #333; border-radius: 6px; padding: 2rem;">
                        <h3 style="margin: 0 0 1.5rem 0; color: #333; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.75rem;">
                            Complete Payroll Example
                        </h3>
                        <div style="background: white; border: 1px solid #ddd; padding: 1.5rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem; line-height: 1.8;">
                            <div style="font-weight: bold; margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">Employee: Daily Rate Worker, ₱${dailyRate.toLocaleString()}/day, 22 days worked, 4 hours overtime, late 2 times (30min, 90min), left early 1 time (45min)</div>
                            
                            <div style="margin-bottom: 1rem;">
                                <div style="font-weight: bold; color: #333; margin-bottom: 0.5rem;">EARNINGS:</div>
                                <div>Base Pay: ₱${dailyRate.toLocaleString()} × 22 days = ₱${(dailyRate * 22).toLocaleString()}</div>
                                <div>Overtime: 4 hours × ₱${hourlyFromDaily} × ${otMultiplier} = ₱${(4 * hourlyFromDaily * otMultiplier).toFixed(2)}</div>
                                <div style="font-weight: bold; border-top: 1px solid #eee; padding-top: 0.5rem; margin-top: 0.5rem;">Subtotal Earnings: ₱${((dailyRate * 22) + (4 * hourlyFromDaily * otMultiplier)).toLocaleString()}</div>
                            </div>
                            
                            <div style="margin-bottom: 1rem;">
                                <div style="font-weight: bold; color: #333; margin-bottom: 0.5rem;">LATE PENALTIES:</div>
                                <div>30min late (15min penalty): 1hr × ₱${hourlyFromDaily} = ₱${hourlyFromDaily}</div>
                                <div>90min late (75min penalty): 2hr × ₱${hourlyFromDaily} = ₱${(hourlyFromDaily * 2).toFixed(2)}</div>
                                <div style="font-weight: bold; border-top: 1px solid #eee; padding-top: 0.5rem; margin-top: 0.5rem;">Total Late Penalties: ₱${(parseFloat(hourlyFromDaily) + (hourlyFromDaily * 2)).toFixed(2)}</div>
                            </div>
                            
                            <div style="margin-bottom: 1rem;">
                                <div style="font-weight: bold; color: #333; margin-bottom: 0.5rem;">EARLY DEPARTURE DEDUCTIONS:</div>
                                ${(() => {
                                    const deductionType = this.attendanceRules?.earlyDepartureDeductionType || 'progressive';
                                    const gracePeriod = this.attendanceRules?.checkOutGracePeriodMinutes || 15;
                                    if (deductionType === 'none') {
                                        return `<div>No early departure penalties configured</div>
                                               <div style="font-weight: bold; border-top: 1px solid #eee; padding-top: 0.5rem; margin-top: 0.5rem;">Total Early Departure Deductions: ₱0.00</div>`;
                                    } else {
                                        const exampleEarlyMin = gracePeriod + 30; // 30min beyond grace period
                                        const exampleDeductionHrs = deductionType === 'fixed' ? 1 : Math.ceil(30 / 60); // 1hr for both scenarios
                                        const exampleAmount = hourlyFromDaily * exampleDeductionHrs;
                                        return `<div>Left ${exampleEarlyMin}min early (${30}min beyond ${gracePeriod}min grace): ${exampleDeductionHrs}hr × ₱${hourlyFromDaily} = ₱${exampleAmount.toFixed(2)}</div>
                                               <div style="font-weight: bold; border-top: 1px solid #eee; padding-top: 0.5rem; margin-top: 0.5rem;">Total Early Departure Deductions: ₱${exampleAmount.toFixed(2)}</div>`;
                                    }
                                })()}
                                <div style="font-weight: bold; margin-top: 0.5rem; color: #800020;">Gross Pay: ₱${(() => {
                                    const deductionType = this.attendanceRules?.earlyDepartureDeductionType || 'progressive';
                                    const earlyDepartureDeduction = deductionType === 'none' ? 0 : parseFloat(hourlyFromDaily);
                                    return ((dailyRate * 22) + (4 * hourlyFromDaily * otMultiplier) - (parseFloat(hourlyFromDaily) + (hourlyFromDaily * 2)) - earlyDepartureDeduction).toFixed(2);
                                })()}</div>
                            </div>
                            
                            <div style="margin-bottom: 1rem;">
                                <div style="font-weight: bold; color: #333; margin-bottom: 0.5rem;">GOVERNMENT DEDUCTIONS:</div>
                                <div>SSS: ₱360.00 (table-based)</div>
                                <div>PhilHealth: ₱${((dailyRate * 22) * (philhealthRate/100)).toFixed(2)}</div>
                                <div>Pag-IBIG: ₱${Math.min((dailyRate * 22) * (pagibigRate/100), 100).toFixed(2)}</div>
                                <div>Withholding Tax: ₱0.00 (below taxable threshold)</div>
                                <div style="font-weight: bold; border-top: 1px solid #eee; padding-top: 0.5rem; margin-top: 0.5rem;">Total Deductions: ₱${(360 + ((dailyRate * 22) * (philhealthRate/100)) + Math.min((dailyRate * 22) * (pagibigRate/100), 100)).toFixed(2)}</div>
                            </div>
                            
                            <div style="font-weight: bold; font-size: 1.1rem; text-align: center; background: #333; color: white; padding: 1rem; border-radius: 4px;">
                                NET PAY: ₱${(((dailyRate * 22) + (4 * hourlyFromDaily * otMultiplier) - (parseFloat(hourlyFromDaily) + (hourlyFromDaily * 2)) - parseFloat(hourlyFromDaily)) - (360 + ((dailyRate * 22) * (philhealthRate/100)) + Math.min((dailyRate * 22) * (pagibigRate/100), 100))).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                    <button onclick="this.closest('div[style*=\\'position: fixed\\']').remove()" style="background: #800020; color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; cursor: pointer; font-size: 1rem;">
                        <i class="fas fa-check"></i> Got it!
                    </button>
                </div>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
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
                <button onclick="window.payrollManager.addHoliday()" style="padding: 0.5rem 1.5rem; background: #800020; color: white; border: none; border-radius: 6px; cursor: pointer;">
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
                        <button onclick="window.payrollManager.removeHoliday(${holiday.id})" style="background: #800020; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
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

    showNewRequestModal() {
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
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        modalContent.innerHTML = `
            <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: #1f2937;">New Request</h2>
            </div>
            
            <div style="display: grid; gap: 1rem;">
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">Request Type</label>
                    <select id="requestType" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="leave">Leave Request</option>
                        <option value="overtime">Overtime Request</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">Employee</label>
                    <select id="requestEmployee" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                        <option value="">Select Employee</option>
                        ${this.employees.map(emp => `
                            <option value="${emp.id}">${emp.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">Start Date</label>
                    <input type="date" id="requestStartDate" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>
                
                <div class="form-group" id="endDateGroup">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">End Date</label>
                    <input type="date" id="requestEndDate" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>
                
                <div class="form-group" id="hoursGroup" style="display: none;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">Overtime Hours</label>
                    <input type="number" id="requestHours" class="form-control" min="1" max="8" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px;" placeholder="Enter hours">
                </div>
                
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">Reason/Notes</label>
                    <textarea id="requestReason" class="form-control" rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical;" placeholder="Enter reason for request"></textarea>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: flex-end;">
                <button onclick="this.closest('div[style*=\\'position: fixed\\']').remove()" style="padding: 0.5rem 1.5rem; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; cursor: pointer;">
                    Cancel
                </button>
                <button onclick="window.payrollManager.submitNewRequest()" style="padding: 0.5rem 1.5rem; background: #800020; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Submit Request
                </button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Set default date to today
        document.getElementById('requestStartDate').valueAsDate = new Date();
        document.getElementById('requestEndDate').valueAsDate = new Date();
        
        // Toggle fields based on request type
        document.getElementById('requestType').addEventListener('change', (e) => {
            const isOvertime = e.target.value === 'overtime';
            document.getElementById('endDateGroup').style.display = isOvertime ? 'none' : 'block';
            document.getElementById('hoursGroup').style.display = isOvertime ? 'block' : 'none';
        });
    }

    async submitNewRequest() {
        const type = document.getElementById('requestType').value;
        const employeeId = document.getElementById('requestEmployee').value;
        const startDate = document.getElementById('requestStartDate').value;
        const endDate = document.getElementById('requestEndDate').value;
        const hours = document.getElementById('requestHours').value;
        const reason = document.getElementById('requestReason').value;
        
        if (!employeeId || !startDate || !reason) {
            if (window.showNotification) {
                window.showNotification('Please fill in all required fields', 'error');
            }
            return;
        }
        
        const employee = this.employees.find(e => e.id === employeeId);
        
        try {
            const request = {
                id: Date.now().toString(),
                requestType: type,
                employeeId: employeeId,
                employeeName: employee ? employee.name : 'Unknown',
                requestDate: startDate,
                endDate: type === 'leave' ? endDate : null,
                hours: type === 'overtime' ? parseFloat(hours) : null,
                reason: reason,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            
            await window.db.add('employeeRequests', request);
            this.requests.push(request);
            
            // Update displays
            this.displayPendingRequests();
            this.updateDashboardStats();
            
            // Close modal
            document.querySelector('div[style*="position: fixed"]').remove();
            
            if (window.showNotification) {
                window.showNotification('Request submitted successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to submit request:', error);
            if (window.showNotification) {
                window.showNotification('Failed to submit request', 'error');
            }
        }
    }

    displayPendingRequests() {
        const requestsList = document.getElementById('pendingRequestsList');
        if (!requestsList) return;
        
        // Filter pending requests
        const pendingRequests = this.requests.filter(r => r.status === 'pending');
        
        // Update badge counts
        const badge = document.querySelector('.requests-section .badge');
        const headerBadge = document.getElementById('pendingRequestsHeaderBadge');
        const tabBadge = document.getElementById('requestsBadge');
        
        if (badge) {
            badge.textContent = pendingRequests.length;
        }
        if (headerBadge) {
            headerBadge.textContent = pendingRequests.length;
        }
        if (tabBadge) {
            tabBadge.textContent = pendingRequests.length;
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
                                    style="flex: 1; background: #800020; color: white; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button onclick="window.payrollManager.rejectRequest('${request.id}')" 
                                    style="flex: 1; background: #800020; color: white; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
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
                    .late { color: #800020; }
                    .on-time { color: #800020; }
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


    // Business operating hours calculation
    calculateBusinessOperatingHours() {
        const openTimeInput = document.getElementById('businessOpenTime');
        const closeTimeInput = document.getElementById('businessCloseTime');
        const operatingHoursInput = document.getElementById('businessOperatingHours');
        
        if (!openTimeInput || !closeTimeInput || !operatingHoursInput) return;
        
        const openTime = openTimeInput.value;
        const closeTime = closeTimeInput.value;
        
        if (openTime && closeTime) {
            // Parse times
            const [openHour, openMin] = openTime.split(':').map(Number);
            const [closeHour, closeMin] = closeTime.split(':').map(Number);
            
            // Convert to minutes for easier calculation
            const openMinutes = openHour * 60 + openMin;
            const closeMinutes = closeHour * 60 + closeMin;
            
            // Calculate difference
            let diffMinutes = closeMinutes - openMinutes;
            
            // Handle overnight shifts (close time next day)
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60; // Add 24 hours in minutes
            }
            
            // Convert back to hours and minutes
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            
            // Format the result
            let result = `${hours} hour${hours !== 1 ? 's' : ''}`;
            if (minutes > 0) {
                result += ` ${minutes} minute${minutes !== 1 ? 's' : ''}`;
            }
            
            operatingHoursInput.value = result;
            
            console.log(`🕐 Business Operating Hours: ${openTime} to ${closeTime} = ${result}`);
        } else {
            operatingHoursInput.value = '';
        }
    }
}

// Create and export payroll manager
const payrollManager = new PayrollManager();
window.payrollManager = payrollManager;

// export default payrollManager; // Commented out for compatibility