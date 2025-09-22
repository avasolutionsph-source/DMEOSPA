# Employee Login System Testing Guide

## Prerequisites
1. Backend server running on port 4001
2. PWA running on port 8080-8082
3. Marketing website accessible

## Quick Test Setup

### Step 1: Start the Backend Server
```bash
cd backend
npm run dev
# Server should start at http://localhost:4001
```

### Step 2: Start the PWA
```bash
cd PWA-Repository
npx http-server -p 8082
# PWA should be accessible at http://localhost:8082
```

### Step 3: Start Marketing Website (Optional)
```bash
cd marketing-website/public
npx http-server -p 3003
# Marketing site at http://localhost:3003
```

## Testing Process

### 1. Create a Branch Owner Account (if not exists)

**Option A: Use existing demo account**
- Email: `demo@spa.com`
- Password: `demo123`

**Option B: Register new branch**
1. Go to PWA registration: http://localhost:8082/register.html
2. Create account with:
   - Business Name: Test Spa
   - Email: owner@testspa.com
   - Password: Test123

### 2. Access Employee Management

1. Login to marketing website as branch owner
2. Navigate to: http://localhost:3003/employee-management.html
3. Or from PWA, you'll need to manually navigate to employee management

### 3. Create Test Employees

Click "Add Employee" and create one of each role:

#### Manager (Read-Only Access)
- Name: Maria Manager
- Email: manager@testspa.com
- Role: Manager
- Create Login: ✓
- Note the temporary password

#### Senior Therapist
- Name: Sandra Senior
- Email: senior@testspa.com
- Role: Senior Therapist
- Assigned Rooms: Room 1, Room 2
- Create Login: ✓

#### Junior Therapist
- Name: Juan Junior
- Email: junior@testspa.com
- Role: Junior Therapist
- Assigned Rooms: Room 3
- Create Login: ✓

#### Receptionist
- Name: Rita Receptionist
- Email: receptionist@testspa.com
- Role: Receptionist
- Create Login: ✓

#### Other Staff (Rider)
- Name: Roberto Rider
- Email: rider@testspa.com
- Role: Other Staff
- Department: Delivery
- Create Login: ✓

### 4. Test Each Employee Login

For each employee created above:

1. **Open PWA in incognito/private window**: http://localhost:8082
2. **Click login** or go to http://localhost:8082/login.html
3. **Check "I'm an employee" checkbox**
4. **Login with employee credentials**
5. **Verify role-specific access**:

#### What Each Role Should See:

**Manager** (Read-Only):
- ✅ Can view all features
- ❌ All edit/delete buttons disabled
- ❌ Cannot modify any data

**Therapists** (Personal Data):
- ✅ Personal appointments only
- ✅ Own attendance records
- ✅ Own payroll information
- ✅ Assigned rooms only
- ❌ No access to other employees' data

**Receptionist** (Operations):
- ✅ POS system
- ✅ Inventory management
- ✅ Customer management
- ✅ All attendance records
- ✅ Payroll viewing
- ✅ Room management
- ✅ Expense tracking
- ❌ No system settings

**Other Staff** (Basic):
- ✅ Own attendance (clock in/out)
- ✅ Own payroll viewing
- ❌ No other features

### 5. Test Security Features

#### A. Password Change
1. Login as any employee
2. Go to Settings/Profile
3. Change password option should be available
4. Test changing password

#### B. Account Locking
1. Try logging in with wrong password 5 times
2. Account should lock
3. Login as branch owner
4. Go to employee management
5. Click unlock button for locked employee
6. New temporary password will be generated

#### C. Branch Isolation
1. Create employees under different branch accounts
2. Verify employees can only see their branch data
3. Check that branch name displays after login

### 6. API Testing with Postman/cURL

#### Employee Login
```bash
curl -X POST http://localhost:4001/api/auth/employee/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@testspa.com","password":"[temporary_password]"}'
```

#### Verify Employee Token
```bash
curl -X POST http://localhost:4001/api/auth/employee/verify \
  -H "Authorization: Bearer [employee_token]"
```

#### Test Role Permissions
```bash
# Manager trying to edit (should fail)
curl -X PUT http://localhost:4001/api/employees/[id] \
  -H "Authorization: Bearer [manager_token]" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test"}'
# Should return: "Managers have read-only access"
```

## Troubleshooting

### Issue: Employee login not working
- Check "I'm an employee" checkbox is checked
- Verify employee has password set (createLogin was checked)
- Check employee is active and not locked

### Issue: Branch not detected
- Ensure employee was created under a branch account
- Check branchId is properly set in employee record
- Verify branch user exists in database

### Issue: Features not filtered by role
- Check employee role is correctly set
- Verify JWT token contains role and permissions
- Check browser console for permission errors

### Issue: Manager can edit data
- Verify enforceReadOnly middleware is applied
- Check API routes have proper middleware chain
- Test with direct API calls to confirm

## Database Verification

Connect to MongoDB and verify:

```javascript
// Check employee structure
db.employees.findOne({email: "manager@testspa.com"})
// Should show: role, branchId, password (hashed), email

// Check branch association
db.users.findOne({_id: ObjectId("[branchId]")})
// Should show branch/business details

// Verify password is hashed
db.employees.findOne({email: "manager@testspa.com"}).password
// Should show bcrypt hash starting with $2a$ or $2b$
```

## Quick Test Checklist

- [ ] Branch owner can create employees
- [ ] Temporary passwords are generated
- [ ] Employees can login with credentials
- [ ] Branch name shows after employee login
- [ ] Manager has read-only access (buttons disabled)
- [ ] Therapists see only personal data
- [ ] Receptionist can access operational features
- [ ] Other staff see only attendance/payroll
- [ ] Password change works
- [ ] Account locking after 5 failed attempts
- [ ] Branch owner can unlock accounts
- [ ] Employees from different branches are isolated

## Test Data Reset

To reset and start fresh:

```javascript
// In MongoDB console
db.employees.deleteMany({email: {$regex: "@testspa.com"}})

// Or via API as branch owner
DELETE /api/employees/[employee_id]
```

## Production Testing

For production deployment:

1. Use HTTPS for all connections
2. Set strong JWT_SECRET in .env
3. Enable rate limiting on login endpoints
4. Monitor failed login attempts
5. Set up email notifications for locked accounts
6. Regular security audits of role permissions

---

**Note**: Always test in a development environment first before deploying to production.