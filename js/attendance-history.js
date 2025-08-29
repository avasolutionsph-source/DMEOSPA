// Attendance History Display Functions

// Render attendance history table
if (window.attendanceManager) {
    window.attendanceManager.renderAttendanceHistoryTable = function() {
        const tbody = document.getElementById('attendanceHistoryTable');
        if (!tbody) return;
        
        const recordsToShow = this.allAttendanceRecords || [];
        
        if (recordsToShow.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #9ca3af;">
                        No attendance records found. Attendance data will appear here once employees check in.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Sort by date and time, newest first
        recordsToShow.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + (a.checkInTime || '00:00'));
            const dateB = new Date(b.date + ' ' + (b.checkInTime || '00:00'));
            return dateB - dateA;
        });
        
        // Display only the most recent 50 records for performance
        const recentRecords = recordsToShow.slice(0, 50);
        
        tbody.innerHTML = recentRecords.map(record => {
            const checkInTime = record.checkInTime || '--';
            const checkOutTime = record.checkOutTime || '--';
            const hoursWorked = record.hoursWorked ? record.hoursWorked.toFixed(1) + ' hrs' : '--';
            const status = record.isLate ? 'Late' : 'On Time';
            const statusColor = record.isLate ? '#f59e0b' : '#10b981';
            
            return `
                <tr>
                    <td>${record.employeeName || 'Unknown'}</td>
                    <td>${new Date(record.date).toLocaleDateString()}</td>
                    <td>${checkInTime}</td>
                    <td>${checkOutTime}</td>
                    <td>${hoursWorked}</td>
                    <td>
                        <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">
                            ${status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="window.attendanceManager.viewAttendanceRecord(${recentRecords.indexOf(record)})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log(`Rendered ${recentRecords.length} attendance records in table`);
    };

    // Update attendance statistics
    window.attendanceManager.updateAttendanceStats = function() {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = this.allAttendanceRecords?.filter(r => r.date === today) || [];
        const lateRecords = todayRecords.filter(r => r.isLate);
        
        // Update counts
        const presentCount = document.getElementById('presentTodayCount');
        const lateCount = document.getElementById('lateTodayCount');
        const absentCount = document.getElementById('absentTodayCount');
        
        if (presentCount) presentCount.textContent = todayRecords.length;
        if (lateCount) lateCount.textContent = lateRecords.length;
        if (absentCount) {
            // Calculate absent count (total employees - present)
            const totalEmployees = this.employees.length;
            const absentToday = Math.max(0, totalEmployees - todayRecords.length);
            absentCount.textContent = absentToday;
        }
        
        console.log(`Stats updated - Present: ${todayRecords.length}, Late: ${lateRecords.length}`);
    };
}