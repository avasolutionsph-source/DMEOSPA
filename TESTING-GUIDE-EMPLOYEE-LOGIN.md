# Employee Login System Testing Guide

## System Overview
The employee login system has been successfully implemented with full integration between PWA and marketing website. Employees created in PWA can be given login credentials through the marketing website's employee management page.

## Architecture
- **Single Employee Table**: Both PWA employees and login-enabled employees use the same database table
- **Optional Login**: Employees can exist without login credentials (PWA-only) 
- **Role-Based Access**: When login is created, role determines feature access in PWA

## Testing Instructions

### 1. Access Employee Management (Marketing Website)

**As Branch Owner:**
1. Go to http://localhost:3003/login.html
2. Login with branch owner credentials:
   - Email: owner@testspa.com
   - Password: Test123
3. Click "Manage Employees" from Quick Actions
4. You'll see ALL employees (both with and without login)

### 2. Employee Management Features

**View All Employees:**
- Table shows all employees with:
  - Name, Position, Department
  - Login Status Badge (Has Login / No Login)
  - Login Role (if applicable)
  - Action buttons based on status

**Create Login for PWA Employee:**
1. Find employee without login (No Login badge)
2. Click "Create Login" button
3. Enter:
   - Email address for login
   - Role (determines access level)
   - Temporary password (optional, auto-generates if blank)
4. System provides temporary password to share with employee

**Reset Password:**
1. Find employee with login (Has Login badge)
2. Click "Reset Password" button
3. Confirm action
4. New temporary password is generated

### 3. Employee Login (PWA)

**Test Employee Logins:**

1. Go to http://localhost:8082/login.html
2. Check "I'm an employee" checkbox
3. Login with test credentials:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Manager | manager@testspa.com | a9c9f482 | All features (read-only) |
| Senior Therapist | senior@testspa.com | 0cbd580a | Personal data + assigned rooms |
| Receptionist | receptionist@testspa.com | c40e8f3e | POS, Inventory, Customers, etc |
| Other Staff | rider@testspa.com | 8678ea53 | Attendance & Payroll only |

### 4. Role-Based Access Control

**Manager Role:**
- Can view all features but READ-ONLY (safety precaution)
- Cannot edit/delete any data

**Therapist Roles (Senior/Junior/New):**
- Personal appointments
- Personal attendance
- Personal payroll
- Assigned rooms only

**Receptionist Role:**
- POS (Point of Sale)
- Inventory management
- Customer management
- Attendance tracking
- Payroll viewing
- Room management
- Expense tracking

**Other Staff Role:**
- Own attendance only
- Own payroll only
- Limited dashboard access

### 5. Integration Testing

**Create New PWA Employee with Login:**
1. In Employee Management, click "Add Employee"
2. Fill in employee details
3. Check "Create login account"
4. Set role and temporary password
5. Save employee
6. Verify employee can login in PWA

**Add Login to Existing PWA Employee:**
1. Create employee in PWA (without login)
2. Go to Marketing Website employee management
3. Find the PWA employee (will show "No Login" badge)
4. Click "Create Login"
5. Set email, role, and password
6. Verify employee can now login

### 6. Backend Endpoints

**Authentication:**
- POST `/api/auth/employee/login` - Employee login
- GET `/api/auth/employee/verify` - Verify token
- POST `/api/auth/employee/change-password` - Change password

**Employee Management:**
- GET `/api/employees` - List all employees (includes hasLogin indicator)
- POST `/api/employees` - Create new employee
- PUT `/api/employees/:id` - Update employee (includes password reset)
- DELETE `/api/employees/:id` - Delete employee

### 7. Testing Scripts

Run these scripts to set up test data:

```bash
# Create test branch and employees
cd backend
node scripts/create-test-employees.js

# Test PWA employee login creation flow
node scripts/test-employee-login-creation.js
```

### 8. Common Testing Scenarios

**Scenario 1: Branch Setup**
1. Branch owner creates account on marketing website
2. Branch owner creates employees (some with login, some without)
3. Employees with login can access PWA based on their role

**Scenario 2: Progressive Login Rollout**
1. Start with PWA employees (no login)
2. Gradually add login credentials as needed
3. Employees without login still function in PWA for transactions

**Scenario 3: Password Management**
1. Employee forgets password
2. Branch owner resets password in employee management
3. Share new temporary password with employee
4. Employee changes password on next login

## Success Indicators

✅ All employees visible in management page
✅ Login status badges display correctly  
✅ Create Login button appears for PWA-only employees
✅ Reset Password works for employees with login
✅ Employees can login with correct role-based access
✅ Manager role has read-only enforcement
✅ Therapists see only their assigned rooms
✅ Integration between PWA and marketing website works seamlessly

## Notes

- Role is optional for PWA-only employees
- Role becomes required when password is set
- Same employee record used for both PWA and login
- Branch isolation ensures employees only see their branch data
- JWT tokens include branch context for proper data filtering