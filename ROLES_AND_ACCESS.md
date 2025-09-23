# Roles and Access Control Documentation

## System Overview
The DAETSPA system implements role-based access control (RBAC) with two main user types: **Business Users** (owners/managers) and **Employee Users** (therapists/staff).

---

## User Types & Roles

### 1. Business Users (`type: 'business'`)
Full system access for business management and operations.

#### Available Roles:
- **`owner`** - Business owner with complete system access
- **`manager`** - Delegated management access
- **`admin`** - Administrative access (optional)

#### Access Rights:
| Feature | Access Level |
|---------|--------------|
| Dashboard | ✅ Full access with analytics |
| POS System | ✅ Can process all transactions |
| Employee Management | ✅ Add/edit/delete employees |
| Payroll Management | ✅ Generate payroll, approve requests |
| Inventory | ✅ Full CRUD operations |
| Products/Services | ✅ Full CRUD operations |
| Customers | ✅ Full access to customer database |
| Reports & Analytics | ✅ View all business reports |
| Attendance | ✅ View/manage all employee attendance |
| Settings | ✅ Configure business settings |
| Gift Certificates | ✅ Issue and manage |
| Expenses | ✅ Track business expenses |
| Appointments | ✅ Manage all appointments |

---

### 2. Employee Users (`type: 'employee'`)
Limited access focused on personal work-related features.

#### Available Roles:
- **`senior_therapist`** - Senior spa therapist
- **`junior_therapist`** - Junior spa therapist  
- **`new_therapist`** - Newly hired therapist
- **`receptionist`** - Front desk staff
- **`other_staff`** - General staff members

#### Access Rights:
| Feature | Access Level |
|---------|--------------|
| Dashboard | ❌ No access (redirects to attendance) |
| POS System | ⚠️ Limited (receptionist only) |
| Employee Management | ❌ No access |
| Payroll Requests | ✅ Own requests only |
| Payroll History | ✅ Own history only |
| Inventory | ❌ No access |
| Products/Services | 👁️ View only (for POS) |
| Customers | ❌ No access |
| Reports & Analytics | ❌ No access |
| Attendance | ✅ Own attendance only |
| Settings | ❌ No access |
| Gift Certificates | ❌ No access |
| Expenses | ❌ No access |
| Appointments | ⚠️ Own appointments only |

---

## Page-Specific Access Control

### Public Pages (No Authentication Required)
- `/login.html` - Login page
- `/register.html` - Business registration

### Employee-Only Pages
- `/payroll-requests` - Submit leave/overtime/payroll requests
- `/attendance` - Check in/out, view own attendance

### Manager-Only Pages  
- `/dashboard` - Business analytics dashboard
- `/employees` - Employee management
- `/payroll` - Payroll generation and management
- `/inventory` - Stock management
- `/products` - Product/service catalog
- `/customers` - Customer database
- `/settings` - System configuration
- `/reports` - Business reports

### Shared Pages (Different Views)
- `/pos` - Point of Sale
  - **Managers**: Full access, all payment methods
  - **Receptionist**: Limited to basic transactions
  - **Other Employees**: No access

---

## Authentication Flow

### Login Process
1. User enters email and password
2. System checks user type:
   - **Business User** → Full authentication with business data
   - **Employee User** → Limited authentication with employee data
3. JWT token issued with role information
4. Menu and navigation updated based on role

### Session Management
- JWT tokens expire after 7 days
- Offline mode supported with cached credentials
- Role checked on each page navigation
- Unauthorized access redirects:
  - Employees trying manager pages → Redirected to attendance
  - Unauthenticated users → Redirected to login

---

## API Endpoint Access

### Employee Endpoints
```
GET  /api/payroll-requests     - Own requests only
POST /api/payroll-requests     - Create own request
GET  /api/attendance/my-records - Own attendance
POST /api/attendance/check-in   - Personal check-in
POST /api/attendance/check-out  - Personal check-out
```

### Manager Endpoints
```
GET    /api/business/employees     - All employees
POST   /api/business/employees     - Add employee
PUT    /api/business/employees/:id - Update employee
DELETE /api/business/employees/:id - Remove employee

GET  /api/payroll-requests/all    - All employee requests
PUT  /api/payroll-requests/:id    - Approve/reject requests
POST /api/payroll/generate        - Generate payroll

GET  /api/business/transactions   - All transactions
GET  /api/business/analytics      - Dashboard data
GET  /api/business/reports        - Business reports
```

---

## Role Verification Code Examples

### Frontend (JavaScript)
```javascript
// Check if user is employee
const isEmployee = user?.type === 'employee';

// Check if user is manager/owner
const isManager = user?.type === 'business' || 
                  user?.role === 'owner' || 
                  user?.role === 'manager';

// Check specific employee roles
const canAccessPOS = user?.role === 'receptionist' || isManager;
```

### Backend (Node.js)
```javascript
// Middleware for manager-only routes
router.use('/api/business/*', requireBusinessUser);

// Middleware for employee routes
router.use('/api/payroll-requests', authenticateJWT);
```

---

## Security Considerations

1. **Principle of Least Privilege**: Employees only access their own data
2. **Role Checking**: Every API call validates user role
3. **Token Validation**: JWT tokens contain role information
4. **Audit Logging**: All sensitive operations are logged
5. **Offline Security**: Limited offline access for employees
6. **Password Protection**: Manager password required for sensitive operations

---

## Common Role-Based Scenarios

### Scenario 1: Employee Requesting Leave
- Employee logs in → Redirected to attendance page
- Navigates to payroll-requests
- Submits leave request
- Can only view own requests

### Scenario 2: Manager Approving Payroll
- Manager logs in → Dashboard displayed
- Views all pending requests
- Approves/rejects requests
- Generates payroll for all employees

### Scenario 3: Receptionist Processing Sale
- Receptionist logs in → Limited POS access
- Can process basic transactions
- Cannot access inventory management
- Cannot view business reports

---

## Role Migration Guide

### Adding a New Role
1. Add role to employee roles array in `payroll.js`
2. Update authentication middleware in backend
3. Add role-specific permissions in `auth.js`
4. Update menu visibility rules
5. Test all access paths

### Changing User Role
1. Manager navigates to Employee Management
2. Selects employee to modify
3. Updates role field
4. Changes take effect on next login

---

## Troubleshooting Access Issues

| Issue | Solution |
|-------|----------|
| Employee sees manager features | Clear cache and localStorage |
| Cannot access payroll requests | Verify employee role is set correctly |
| Menu items missing | Check `authSystem.updateMenuForRole()` |
| API returns 403 | Token may be expired or role incorrect |
| Blank page after login | Role might not be recognized |

---

*Last Updated: September 2025*
*System Version: DAETSPA v2.0*