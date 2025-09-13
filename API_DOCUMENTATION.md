# API Documentation

## Overview

This document describes the complete API structure for the multi-service Ava Solutions platform, including authentication, admin management, and business operations.

## Base URLs

- **Backend API**: `http://localhost:4001`
- **Marketing Website**: `http://localhost:3003`
- **PWA Frontend**: `http://localhost:8082`

## Authentication

### JWT Token System

All API requests require JWT authentication via the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Token Structure

```javascript
{
  "id": "user_mongodb_id",
  "userId": "user_mongodb_id", 
  "email": "user@example.com",
  "role": "branch|admin|superAdmin",
  "firstName": "First",
  "lastName": "Last", 
  "businessName": "Business Name",
  "iat": 1757223853,
  "exp": 1757828653
}
```

## Authentication Endpoints

### POST `/api/auth/login`

User login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "First",
    "lastName": "Last",
    "businessName": "Business Name",
    "role": "admin"
  }
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid credentials
- `400` - Validation error

## Admin Management API

Base path: `/api/admin`

### Authentication Middleware

All admin endpoints require appropriate role-based middleware:

#### `requireSuperAdmin` Middleware
- **Strict Access Control**: Only users with `role: 'superAdmin'`
- **Database Verification**: Real-time role checking against database
- **Security Logging**: Failed attempts logged for audit trail
- **Token Validation**: JWT token verification on every request
- **Used on**: `/api/admin/users`, `/api/admin/users/:userId/branch-data`

#### `requireAdmin` Middleware  
- **Multi-role Access**: Accepts `admin` or `superAdmin` roles
- **Standard Validation**: JWT token and role verification
- **Used on**: General admin operations

**Security Flow:**
1. JWT token extracted and validated
2. User lookup in database to verify current role
3. Role permissions checked against endpoint requirements
4. Access granted/denied with appropriate logging

### User Management

#### GET `/api/admin/users` 🔐 Super Admin Only

Get all users (with pagination and search).

**Security**: Requires `requireSuperAdmin` middleware - ONLY super admin accounts can access all user data.

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `search` (optional) - Search in email, businessName, firstName, lastName

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "_id": "user_id",
      "email": "user@example.com",
      "firstName": "First",
      "lastName": "Last",
      "businessName": "Business Name",
      "role": "branch",
      "createdAt": "2025-09-07T06:03:52.425Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### GET `/api/admin/users/:userId`

Get specific user details.

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "firstName": "First",
    "lastName": "Last",
    "businessName": "Business Name",
    "role": "branch",
    "businessMetrics": {
      "totalSales": 1500.00,
      "totalTransactions": 25,
      "lastSyncDate": "2025-09-07T05:30:00.000Z"
    },
    "employees": [],
    "inventory": []
  }
}
```

#### PUT `/api/admin/users/:userId/role`

Change user role (superAdmin only).

**Request:**
```json
{
  "role": "branch|admin|superAdmin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User role updated from branch to admin",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "businessName": "Business Name",
    "role": "admin",
    "firstName": "First",
    "lastName": "Last"
  }
}
```

**Restrictions:**
- Only `superAdmin` can change roles
- Cannot change own role (prevents lockout)
- Validates role is in allowed enum values

### Account Creation

#### POST `/api/admin/create-account`

Create new user account.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "First",
  "lastName": "Last", 
  "businessName": "New Business",
  "phone": "+1234567890",
  "role": "branch|admin|superAdmin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "new_user_id",
    "email": "newuser@example.com",
    "firstName": "First",
    "lastName": "Last",
    "businessName": "New Business", 
    "role": "branch"
  }
}
```

**Database Fields Set:**
- `createdBy`: Current admin's userId
- `plainPassword`: Original password (for admin visibility)

### Branch Management

#### GET `/api/admin/branches`

Get all branch users.

**Response:**
```json
{
  "success": true,
  "branches": [
    {
      "_id": "branch_id",
      "email": "branch@example.com",
      "firstName": "Branch",
      "lastName": "Manager",
      "businessName": "Branch Business",
      "createdAt": "2025-09-07T06:03:52.425Z"
    }
  ]
}
```

#### GET `/api/admin/users/:userId/branch-data` 🔐 Super Admin Only

Get complete business data for a specific user's branch.

**Security**: Requires `requireSuperAdmin` middleware - ONLY super admin can access individual user branch data including sales, employees, and inventory.

**Response:**
```json
{
  "success": true,
  "branchData": {
    "user": {
      "_id": "branch_id",
      "email": "branch@example.com", 
      "firstName": "Branch",
      "lastName": "Manager",
      "businessName": "Branch Business",
      "businessMetrics": {
        "totalSales": 5000.00,
        "totalTransactions": 150,
        "todaySales": 250.00,
        "monthSales": 3500.00,
        "lastSyncDate": "2025-09-07T05:30:00.000Z"
      },
      "employees": [
        {
          "id": "emp_1",
          "name": "John Doe",
          "position": "Sales Associate",
          "totalSales": 1500.00,
          "totalCommission": 150.00
        }
      ],
      "inventory": [
        {
          "id": "prod_1", 
          "name": "Product Name",
          "sku": "SKU001",
          "stock": 25,
          "price": 49.99
        }
      ]
    },
    "businessStats": {
      "totalSales": 5000.00,
      "totalTransactions": 150,
      "monthSales": 3500.00, 
      "todaySales": 250.00
    },
    "productCount": 15
  }
}
```

#### GET `/api/admin/my-created-accounts`

Get accounts created by current admin only.

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": "account_id",
      "businessName": "Created Business",
      "email": "created@example.com",
      "password": "original_password",
      "createdAt": "2025-09-07T06:03:52.425Z"
    }
  ]
}
```

**Note**: Only returns accounts where `createdBy` matches current admin's userId.

### System Statistics

#### GET `/api/admin/stats`

Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "activeUsers": 75,
    "recentUsers": [
      {
        "_id": "user_id",
        "email": "user@example.com",
        "firstName": "First",
        "lastName": "Last",
        "businessName": "Business",
        "createdAt": "2025-09-07T06:03:52.425Z"
      }
    ]
  }
}
```

#### GET `/api/admin/sync-stats`

Get sync management statistics.

**Response:**
```json
{
  "totalSyncs": 45,
  "activeSyncs": 12,
  "oldSyncs": 33,
  "storageUsed": 2.25
}
```

#### POST `/api/admin/cleanup-syncs`

Clean up old sync data.

**Response:**
```json
{
  "success": true,
  "deletedSyncs": 25,
  "freedSpace": 0.5
}
```

### User Notes

#### PUT `/api/admin/users/:userId/notes`

Add/update notes for a user.

**Request:**
```json
{
  "notes": "Important notes about this user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notes updated",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "notes": "Important notes about this user"
  }
}
```

## Business API

Base path: `/api/business`

### Employee Management

#### GET `/api/business/employees`

Get business employees (proxied to PWA backend).

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
Proxied from PWA backend - format depends on PWA implementation.

### Inventory Management

#### GET `/api/business/inventory`

Get business inventory (proxied to PWA backend).

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
Proxied from PWA backend - format depends on PWA implementation.

### Business Statistics

#### GET `/api/business/stats`

Get business statistics (proxied to PWA backend).

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
Proxied from PWA backend - format depends on PWA implementation.

### Business Sync

#### POST `/api/business/sync`

Sync business data from PWA.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request:**
Data from PWA backend (format varies).

**Response:**
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "recordsUpdated": 1,
  "lastSyncDate": "2025-09-07T06:03:52.425Z"
}
```

## User Profile API

#### GET `/api/user/business-name`

Get current user's business information.

**Response:**
```json
{
  "businessName": "User's Business",
  "email": "user@example.com",
  "firstName": "First",
  "lastName": "Last"
}
```

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request / Validation error
- `401` - Unauthorized / Invalid token
- `403` - Forbidden / Insufficient permissions
- `404` - Not found
- `500` - Internal server error

### Authentication Errors

```json
// No token provided
{
  "error": "Access denied. No token provided."
}

// Invalid token
{
  "error": "Invalid token"
}

// Insufficient permissions
{
  "error": "Access denied. Admin role required."
}
```

## Rate Limiting

All `/api` endpoints are rate limited:
- **Limit**: 1000 requests per 15 minutes per IP
- **Headers**: Rate limit info in response headers
- **Exceeded**: HTTP 429 with retry information

## CORS Configuration

Allowed origins for development:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:8080`
- `http://localhost:8081`
- `http://127.0.0.1:5500`
- `http://localhost:4000`

## Request/Response Examples

### Creating a Branch Account (Admin)

**Request:**
```http
POST /api/admin/create-account HTTP/1.1
Host: localhost:3002
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "businessName": "New Coffee Shop",
  "email": "coffee@shop.com",
  "password": "secure123",
  "firstName": "Coffee",
  "lastName": "Owner",
  "role": "branch"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "68bd204870c313060740230e",
    "email": "coffee@shop.com",
    "firstName": "Coffee",
    "lastName": "Owner",
    "businessName": "New Coffee Shop",
    "role": "branch"
  }
}
```

### Getting Created Accounts (Admin)

**Request:**
```http
GET /api/admin/my-created-accounts HTTP/1.1
Host: localhost:3002
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "accounts": [
    {
      "id": "68bd204870c313060740230e",
      "businessName": "New Coffee Shop",
      "email": "coffee@shop.com", 
      "password": "secure123",
      "createdAt": "2025-09-07T06:03:52.425Z"
    }
  ]
}
```

## Development Tips

### Testing API Endpoints

```bash
# Test login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'

# Test admin endpoints (replace token)
curl -X GET http://localhost:3002/api/admin/my-created-accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test account creation
curl -X POST http://localhost:3002/api/admin/create-account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Test","email":"test@test.com","password":"test123"}'
```

### JWT Token Debugging

```javascript
// Decode JWT token (client-side)
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);

// Check expiration
const now = Math.floor(Date.now() / 1000);
const expired = payload.exp < now;
console.log('Token expired:', expired);
```

### Database Queries

```javascript
// Filter accounts by creator (admin isolation)
const accounts = await User.find({ 
  createdBy: adminUserId,
  role: 'branch' 
});

// Include business metrics in user query
const user = await User.findById(userId)
  .select('businessName email businessMetrics employees inventory');
```

## Recent API Improvements (2025-09-09)

### Enhanced Sync Endpoints

#### POST `/api/sync/pull`

**Marketing Website Sync Endpoint** - Pulls latest data from PWA backend.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "emp-123",
        "name": "John Doe",
        "position": "Staff",
        "totalSales": 1500.00,
        "transactions": 25
      }
    ],
    "products": [...],
    "transactions": [...],
    "inventory": [...]
  },
  "businessStats": {
    "totalSales": 5000.00,
    "totalTransactions": 75,
    "totalEmployees": 3,
    "totalProducts": 15
  },
  "serverTime": "2025-09-09T12:09:18.000Z"
}
```

#### Fixed Sync Direction Issues

- **PWA Dashboard**: Now uses `window.syncManager.syncAll()` (uploads to backend)
- **Marketing Website**: Uses `/api/sync/pull` (downloads from backend)  
- **Automatic Triggers**: POS transactions now trigger sync automatically
- **Modal Cleanup**: Sync modals properly close without dark overlay issues

#### Improved Sync Data Handling

- **Empty Array Sync**: Fixed bug where empty arrays wouldn't clear cached data
- **Transaction Sync**: Resolved issue where PWA transactions weren't syncing to marketing website
- **Real-time Updates**: Sync status shows live data with proper change detection

### Performance API Improvements

#### Reduced Load Times
- **Removed Legacy Files**: 3 fewer HTTP requests on PWA startup
- **Non-blocking Dropdowns**: Customer/employee dropdowns no longer cause UI freezes
- **Optimized Intervals**: Dashboard sync frequency reduced from 1 hour to 4 hours

#### Long-running Session Support
- **Memory Management**: Enhanced garbage collection and resource cleanup
- **Error Recovery**: Automatic recovery from sync failures and connection issues
- **Session Stability**: PWA can run reliably for extended business hours

### Attendance Management API

#### POST `/api/attendance/check-out`

**Employee Check-Out with Early Departure Deductions**

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "employeeId": "emp-123",
  "checkOutTime": "2025-09-09T16:45:00.000Z",
  "notes": "Left early for appointment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee checked out successfully",
  "attendanceRecord": {
    "id": "att-456",
    "employeeId": "emp-123",
    "date": "2025-09-09",
    "checkInTime": "2025-09-09T08:00:00.000Z",
    "checkOutTime": "2025-09-09T16:45:00.000Z",
    "hoursWorked": 8.75,
    "checkOutDeduction": 1,
    "payDeduction": 62.50,
    "isEarlyDeparture": true,
    "gracePeriodUsed": false
  }
}
```

**Business Logic:**
- **Grace Period**: 15 minutes before business closing time (configurable)
- **Deduction Calculation**: Early departure minutes rounded up to next hour
- **Payroll Impact**: Deduction automatically integrated into payroll calculations

**Example Scenarios:**
```javascript
// Left 30 minutes early (15min grace + 15min penalty) = 1 hour deduction
// Left 75 minutes early (15min grace + 60min penalty) = 2 hour deduction
// Left 10 minutes early (within grace period) = 0 deduction
```

#### GET `/api/attendance/payroll-impact/:employeeId`

**Get Attendance Impact on Payroll**

**Response:**
```json
{
  "success": true,
  "payrollImpact": {
    "employeeId": "emp-123",
    "periodStart": "2025-09-01",
    "periodEnd": "2025-09-30",
    "totalLateDeductions": 3,
    "totalEarlyDepartureDeductions": 2,
    "totalHourlyDeductions": 5,
    "totalPayDeduction": 312.50,
    "attendanceSummary": {
      "daysWorked": 22,
      "lateCount": 3,
      "earlyDepartureCount": 2,
      "totalLateMinutes": 45,
      "totalEarlyDepartureHours": 3
    }
  }
}
```

### System Analysis & Metrics API

#### GET `/api/system/analysis`

**Comprehensive System Analysis (Super Admin Only)**

**Security**: Requires `requireSuperAdmin` middleware

**Response:**
```json
{
  "success": true,
  "systemAnalysis": {
    "technicalGrade": "B+",
    "overallScore": 3.4,
    "marketValue": {
      "min": 150000,
      "max": 300000,
      "currency": "USD"
    },
    "metrics": {
      "totalUsers": 145,
      "activeBusinesses": 67,
      "totalTransactions": 15420,
      "totalRevenue": 2150000,
      "systemUptime": "99.8%"
    },
    "competitiveAnalysis": {
      "advantages": [
        "Offline-first capability",
        "No transaction fees",
        "Philippine compliance",
        "Service industry specialization"
      ],
      "marketPosition": "Strong Buy",
      "revenueProjections": {
        "year1": 2100000,
        "year2": 7200000,
        "year3": 16200000
      }
    }
  }
}
```

#### GET `/api/system/performance-metrics`

**System Performance Metrics**

**Response:**
```json
{
  "success": true,
  "performance": {
    "pwaBenchmarks": {
      "startupTime": "2.3s",
      "offlineCapability": true,
      "serviceWorkerStatus": "active",
      "cacheEfficiency": "94%"
    },
    "apiPerformance": {
      "averageResponseTime": "185ms",
      "errorRate": "0.2%",
      "throughput": "450 req/min"
    },
    "databaseMetrics": {
      "connectionPool": "healthy",
      "queryPerformance": "optimized",
      "indexUsage": "efficient"
    },
    "optimizations": {
      "removedLegacyFiles": 3,
      "reducedHttpRequests": 3,
      "fixedUiFreezes": true,
      "longRunningSessionSupport": true
    }
  }
}
```

---

**Last Updated**: September 9, 2025
**Version**: 1.2.0
**Major Updates**: Check-out system, performance optimizations, system analysis endpoints