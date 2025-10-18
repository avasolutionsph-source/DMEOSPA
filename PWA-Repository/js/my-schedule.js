// My Schedule Manager for DAETSPA PWA
// Allows employees to view their own shift schedule (read-only)

class MyScheduleManager {
    constructor() {
        this.schedule = null;
        this.employee = null;
        this.initialized = false;

        console.log('📅 My Schedule Manager constructor called');

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }

    async init() {
        console.log('📅 Initializing My Schedule Manager...');
        this.initialized = true;
        console.log('✅ My Schedule Manager initialized');
    }

    // Load employee's own schedule
    async loadMySchedule() {
        try {
            console.log('📅 Loading my schedule...');

            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ No authentication token found');
                this.showError('Authentication required. Please log in again.');
                return;
            }

            const apiUrl = this.getApiUrl();
            const url = `${apiUrl}/api/shift-schedules/my-schedule`;

            console.log('🌐 Making API request to:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ API Error:', response.status, errorData);

                if (response.status === 404) {
                    // No employee record or no schedule
                    this.showNoScheduleMessage(errorData.error || 'You do not have a schedule assigned yet.');
                    return;
                }

                throw new Error(`Failed to load schedule: ${response.status} - ${errorData.error}`);
            }

            const result = await response.json();
            this.schedule = result.data;
            this.employee = result.employee;

            console.log('✅ Loaded my schedule:', this.schedule);
            console.log('✅ Employee info:', this.employee);

            if (this.schedule) {
                this.renderSchedule();
            } else {
                this.showNoScheduleMessage('You do not have an active shift schedule assigned yet.');
            }

        } catch (error) {
            console.error('❌ Error loading my schedule:', error);
            this.showError(`Failed to load your schedule: ${error.message}`);
        }
    }

    renderSchedule() {
        const container = document.getElementById('myScheduleContainer');
        if (!container) {
            console.error('❌ My schedule container not found');
            return;
        }

        if (!this.schedule || !this.employee) {
            this.showNoScheduleMessage('No schedule data available.');
            return;
        }

        const employeeName = `${this.employee.firstName} ${this.employee.lastName}`;
        const position = this.employee.position || 'Staff';
        const effectiveDate = this.schedule.effectiveDate ?
            new Date(this.schedule.effectiveDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Not specified';

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        const scheduleHTML = `
            <div class="my-schedule-header" style="
                background: linear-gradient(135deg, #800020 0%, #600015 100%);
                color: white;
                padding: 2rem;
                border-radius: 16px;
                margin-bottom: 2rem;
                box-shadow: 0 10px 25px -5px rgba(128, 0, 32, 0.3);
            ">
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                    <div style="
                        width: 80px;
                        height: 80px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 2rem;
                        font-weight: 700;
                        border: 3px solid rgba(255, 255, 255, 0.3);
                    ">
                        ${employeeName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2)}
                    </div>
                    <div>
                        <h1 style="margin: 0 0 0.5rem 0; font-size: 2rem; font-weight: 700;">My Schedule</h1>
                        <p style="margin: 0; font-size: 1.2rem; opacity: 0.9;">${employeeName} - ${position}</p>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.95rem; opacity: 0.8;">Effective from: ${effectiveDate}</p>
                    </div>
                </div>
            </div>

            <div class="schedule-grid-container" style="
                background: white;
                padding: 2rem;
                border-radius: 16px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                margin-bottom: 2rem;
            ">
                <table class="my-schedule-table" style="
                    width: 100%;
                    border-collapse: collapse;
                ">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
                            ${dayLabels.map(day => `
                                <th style="
                                    padding: 1.25rem;
                                    text-align: center;
                                    font-weight: 700;
                                    font-size: 1.1rem;
                                    color: #1f2937;
                                    border-bottom: 3px solid #800020;
                                ">${day}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            ${days.map(day => {
                                const daySchedule = this.schedule.weeklySchedule[day];
                                const shift = daySchedule.shift || 'off';
                                const startTime = daySchedule.startTime || '09:00';
                                const endTime = daySchedule.endTime || '17:00';

                                let badgeColor, badgeText, timeText;

                                if (shift === 'day') {
                                    badgeColor = 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)';
                                    badgeText = 'Day Shift';
                                    timeText = `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
                                } else if (shift === 'night') {
                                    badgeColor = 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)';
                                    badgeText = 'Night Shift';
                                    timeText = `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
                                } else {
                                    badgeColor = 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)';
                                    badgeText = 'Off';
                                    timeText = '';
                                }

                                return `
                                    <td style="
                                        padding: 1.5rem;
                                        text-align: center;
                                        border-bottom: 1px solid #e2e8f0;
                                        vertical-align: top;
                                    ">
                                        <div style="
                                            background: ${badgeColor};
                                            padding: 0.75rem 1rem;
                                            border-radius: 12px;
                                            font-weight: 600;
                                            font-size: 0.95rem;
                                            color: #1f2937;
                                            margin-bottom: ${timeText ? '0.75rem' : '0'};
                                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                                        ">
                                            ${badgeText}
                                        </div>
                                        ${timeText ? `
                                            <div style="
                                                font-size: 0.9rem;
                                                color: #6b7280;
                                                font-weight: 500;
                                                line-height: 1.6;
                                            ">
                                                ${timeText}
                                            </div>
                                        ` : ''}
                                    </td>
                                `;
                            }).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>

            ${this.schedule.notes ? `
                <div style="
                    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
                    border-left: 4px solid #F59E0B;
                    padding: 1.5rem;
                    border-radius: 12px;
                    margin-bottom: 2rem;
                ">
                    <h3 style="margin: 0 0 0.5rem 0; color: #92400E; font-size: 1.1rem;">
                        <i class="fas fa-sticky-note"></i> Schedule Notes
                    </h3>
                    <p style="margin: 0; color: #78350F; line-height: 1.6;">${this.schedule.notes}</p>
                </div>
            ` : ''}

            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button
                    onclick="window.myScheduleManager.printSchedule()"
                    style="
                        background: linear-gradient(135deg, #800020 0%, #600015 100%);
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 1rem;
                        color: white;
                        box-shadow: 0 10px 15px -3px rgba(128, 0, 32, 0.3);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                    "
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 20px 25px -5px rgba(128, 0, 32, 0.4)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 15px -3px rgba(128, 0, 32, 0.3)';"
                >
                    <i class="fas fa-print"></i> Print Schedule
                </button>

                <button
                    onclick="window.myScheduleManager.loadMySchedule()"
                    style="
                        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 1rem;
                        color: white;
                        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                    "
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 20px 25px -5px rgba(16, 185, 129, 0.4)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 15px -3px rgba(16, 185, 129, 0.3)';"
                >
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        `;

        container.innerHTML = scheduleHTML;
    }

    showNoScheduleMessage(message) {
        const container = document.getElementById('myScheduleContainer');
        if (!container) return;

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userName = userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'User';

        container.innerHTML = `
            <div style="
                text-align: center;
                padding: 4rem 2rem;
                background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
                border-radius: 16px;
                border: 2px dashed #e2e8f0;
                margin: 2rem 0;
            ">
                <div style="
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 2rem auto;
                    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.3);
                ">
                    <i class="fas fa-calendar-times" style="
                        font-size: 3rem;
                        color: #F59E0B;
                    "></i>
                </div>
                <h2 style="
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0 0 1rem 0;
                ">No Schedule Assigned</h2>
                <p style="
                    color: #6b7280;
                    font-size: 1.1rem;
                    line-height: 1.6;
                    margin: 0 0 2rem 0;
                    max-width: 500px;
                    margin-left: auto;
                    margin-right: auto;
                ">${message}</p>
                <p style="
                    color: #9ca3af;
                    font-size: 0.95rem;
                    font-style: italic;
                ">Please contact your manager to have a shift schedule assigned to you.</p>
            </div>
        `;
    }

    formatTime(timeString) {
        // Convert 24-hour time to 12-hour format
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    printSchedule() {
        if (!this.schedule || !this.employee) {
            alert('No schedule to print');
            return;
        }

        const employeeName = `${this.employee.firstName} ${this.employee.lastName}`;
        const position = this.employee.position || 'Staff';
        const effectiveDate = this.schedule.effectiveDate ?
            new Date(this.schedule.effectiveDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Not specified';

        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>My Schedule - ${employeeName}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 2rem;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    h1 {
                        color: #800020;
                        text-align: center;
                        margin-bottom: 0.5rem;
                    }
                    .subtitle {
                        text-align: center;
                        color: #666;
                        margin-bottom: 2rem;
                        font-size: 1.1rem;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 2rem;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 1rem;
                        text-align: left;
                    }
                    th {
                        background-color: #800020;
                        color: white;
                        font-weight: bold;
                    }
                    .day-shift {
                        background-color: #FEF3C7;
                        font-weight: bold;
                    }
                    .night-shift {
                        background-color: #DBEAFE;
                        font-weight: bold;
                    }
                    .off {
                        background-color: #F3F4F6;
                        color: #999;
                    }
                    .notes {
                        background: #FEF3C7;
                        border-left: 4px solid #F59E0B;
                        padding: 1rem;
                        margin-bottom: 2rem;
                    }
                    @media print {
                        body { padding: 1rem; }
                    }
                </style>
            </head>
            <body>
                <h1>Work Schedule</h1>
                <div class="subtitle">
                    <strong>${employeeName}</strong> - ${position}<br>
                    Effective from: ${effectiveDate}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>Shift Type</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${days.map((day, index) => {
                            const daySchedule = this.schedule.weeklySchedule[day];
                            const shift = daySchedule.shift || 'off';
                            const startTime = daySchedule.startTime || '09:00';
                            const endTime = daySchedule.endTime || '17:00';

                            let shiftClass, shiftText, timeText;

                            if (shift === 'day') {
                                shiftClass = 'day-shift';
                                shiftText = 'Day Shift';
                                timeText = `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
                            } else if (shift === 'night') {
                                shiftClass = 'night-shift';
                                shiftText = 'Night Shift';
                                timeText = `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
                            } else {
                                shiftClass = 'off';
                                shiftText = 'Off';
                                timeText = '-';
                            }

                            return `
                                <tr>
                                    <td><strong>${dayLabels[index]}</strong></td>
                                    <td class="${shiftClass}">${shiftText}</td>
                                    <td>${timeText}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                ${this.schedule.notes ? `
                    <div class="notes">
                        <strong>Notes:</strong><br>
                        ${this.schedule.notes}
                    </div>
                ` : ''}

                <p style="text-align: center; color: #999; font-size: 0.9rem;">
                    Printed on ${new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    getApiUrl() {
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            return window.API_CONFIG.BASE_URL;
        }

        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

        return isLocalhost ? 'http://localhost:4001' : 'https://daetspa-backend.onrender.com';
    }

    getAuthToken() {
        if (window.API_CONFIG && typeof window.API_CONFIG.getToken === 'function') {
            const token = window.API_CONFIG.getToken();
            if (token) return token;
        }

        let token = localStorage.getItem('authToken');
        if (token) return token;

        if (window.authSystem && window.authSystem.authToken) {
            return window.authSystem.authToken;
        }

        token = localStorage.getItem('userToken') || sessionStorage.getItem('authToken');
        if (token) return token;

        console.warn('⚠️ No authentication token found');
        return null;
    }

    showSuccess(message) {
        if (window.StateHelpers && window.StateHelpers.showNotification) {
            window.StateHelpers.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.StateHelpers && window.StateHelpers.showNotification) {
            window.StateHelpers.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    // Called when My Schedule page is shown
    async onPageShow() {
        console.log('📅 My Schedule page shown, loading schedule...');
        await this.loadMySchedule();
    }
}

// Initialize the my schedule manager
window.myScheduleManager = new MyScheduleManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MyScheduleManager;
}
