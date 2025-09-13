# Database Schema Documentation

## Overview

This document describes the MongoDB database schema for the Ava Solutions multi-service platform. The system uses a unified database approach with collections optimized for both admin management and business operations.

## Database Connection

**Connection String**: `mongodb+srv://avasolutionsph:Ava12345@avasolutions.impyywn.mongodb.net/ava-marketing-website`

**Database Name**: `ava-marketing-website`

## Collections

### Users Collection

The primary collection storing all user accounts, business data, and administrative information.

#### Schema Definition

```javascript
const userSchema = new mongoose.Schema({
  // Basic Authentication Fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // User Profile Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Role-Based Access Control
  role: {
    type: String,
    enum: ['branch', 'admin', 'superAdmin'],
    default: 'branch',
    index: true
  },
  
  // Admin Account Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true // For efficient admin isolation queries
  },
  plainPassword: {
    type: String,
    required: false // Only stored for admin-created branch accounts
  },
  
  // PWA Integration
  pwaUserId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Business Metrics (Synced from PWA)
  businessMetrics: {
    // Sales Data
    totalSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    totalEmployees: { type: Number, default: 0 },
    
    // Time-Based Sales Metrics
    todaySales: { type: Number, default: 0 },
    todayTransactions: { type: Number, default: 0 },
    monthSales: { type: Number, default: 0 },
    monthTransactions: { type: Number, default: 0 },
    yearSales: { type: Number, default: 0 },
    yearTransactions: { type: Number, default: 0 },
    
    // Sync Tracking
    lastSyncDate: { type: Date },
    lastActiveDate: { type: Date }
  },
  
  // Employee Data (Synced from PWA)
  employees: [{
    id: String,
    name: String,
    position: String,
    email: String,
    phone: String,
    hiredDate: Date,
    commission: Number,
    
    // Performance Metrics
    totalSales: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    transactions: { type: Number, default: 0 },
    avgSale: { type: Number, default: 0 },
    
    // Attendance & Payroll Metrics
    attendanceRecords: [{
      date: String, // YYYY-MM-DD format
      checkInTime: Date,
      checkOutTime: Date,
      hoursWorked: Number,
      isLate: Boolean,
      lateMinutes: Number,
      checkOutDeduction: Number, // Hours deducted for early departure
      payDeduction: Number, // Monetary deduction amount
      isEarlyDeparture: Boolean,
      gracePeriodUsed: Boolean
    }],
    
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Inventory Data (Synced from PWA)
  inventory: [{
    id: String,
    name: String,
    sku: String,
    category: String,
    price: Number,
    cost: Number,
    stock: Number,
    minStock: Number,
    
    // Tracking
    totalSold: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Admin Notes
  notes: {
    type: String,
    trim: true
  },
  
  // Subscription Management (Future Use)
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'unpaid'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired'],
    default: 'active'
  },
  subscriptionStart: {
    type: Date,
    default: Date.now
  },
  subscriptionEnd: {
    type: Date
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'users'
});
```

#### Indexes

```javascript
// Compound indexes for efficient queries
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ createdBy: 1, role: 1 });
userSchema.index({ email: 1, role: 1 });
userSchema.index({ 'businessMetrics.lastSyncDate': -1 });

// Text search index
userSchema.index({
  email: 'text',
  businessName: 'text',
  firstName: 'text',
  lastName: 'text'
});
```

#### Middleware

```javascript
// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
```

## Data Relationships

### Role Hierarchy

```
superAdmin (highest authority)
    ├── Can create: admin, branch, superAdmin
    ├── Can access: All system data
    └── Can modify: All user roles
    
admin (middle authority)  
    ├── Can create: branch only
    ├── Can access: Own created accounts only
    └── Can modify: Own created branch accounts
    
branch (lowest authority)
    ├── Can create: None
    ├── Can access: Own business data only  
    └── Can modify: Own business operations
```

### Account Creation Tracking

```javascript
// When admin creates a branch account
{
  email: "branch@example.com",
  role: "branch",
  createdBy: ObjectId("admin_user_id"), // Links to creating admin
  plainPassword: "original_password"     // Visible to creating admin
}

// Query to get admin's created accounts
db.users.find({
  createdBy: ObjectId("admin_user_id"),
  role: "branch"
});
```

### Business Data Relationships

```javascript
// Business metrics relationship
{
  _id: ObjectId("branch_user_id"),
  businessName: "Coffee Shop",
  businessMetrics: {
    totalSales: 15000.00,
    totalTransactions: 450,
    lastSyncDate: ISODate("2025-09-07T06:00:00.000Z")
  },
  employees: [
    {
      id: "emp_1",
      name: "John Doe",
      totalSales: 5000.00,
      totalCommission: 500.00
    }
  ],
  inventory: [
    {
      id: "prod_1", 
      name: "Coffee Beans",
      stock: 25,
      price: 12.99
    }
  ]
}
```

## Common Queries

### Authentication Queries

```javascript
// User login
db.users.findOne({ email: "user@example.com" });

// Role-based access check
db.users.findOne({ 
  _id: ObjectId("user_id"), 
  role: { $in: ["admin", "superAdmin"] } 
});
```

### Admin Management Queries

```javascript
// Get all users (super admin)
db.users.find({})
  .select("-password")
  .sort({ createdAt: -1 })
  .limit(20);

// Get admin's created accounts only
db.users.find({
  createdBy: ObjectId("admin_user_id"),
  role: "branch"
}).select("businessName email plainPassword createdAt");

// Get branch business data
db.users.findOne({ 
  _id: ObjectId("branch_id"),
  role: "branch" 
}).select("-password");
```

### Business Analytics Queries

```javascript
// Active users (synced in last 7 days)
db.users.countDocuments({
  "businessMetrics.lastActiveDate": {
    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
});

// Total sales across all branches
db.users.aggregate([
  { $match: { role: "branch" } },
  { $group: { 
    _id: null, 
    totalSales: { $sum: "$businessMetrics.totalSales" },
    totalTransactions: { $sum: "$businessMetrics.totalTransactions" }
  }}
]);

// Top performing branches
db.users.find({ role: "branch" })
  .sort({ "businessMetrics.totalSales": -1 })
  .limit(10)
  .select("businessName businessMetrics.totalSales");
```

### Search Queries

```javascript
// Text search across user fields
db.users.find({
  $text: { $search: "coffee shop" }
});

// Advanced search with filters
db.users.find({
  $or: [
    { email: { $regex: "coffee", $options: "i" } },
    { businessName: { $regex: "coffee", $options: "i" } },
    { firstName: { $regex: "coffee", $options: "i" } },
    { lastName: { $regex: "coffee", $options: "i" } }
  ]
});
```

## Data Migration Scripts

### Adding New Fields

```javascript
// Add createdBy field to existing users
db.users.updateMany(
  { createdBy: { $exists: false } },
  { $set: { createdBy: null } }
);

// Initialize business metrics for existing users
db.users.updateMany(
  { "businessMetrics.totalSales": { $exists: false } },
  { $set: { 
    "businessMetrics.totalSales": 0,
    "businessMetrics.totalTransactions": 0,
    "businessMetrics.totalProducts": 0,
    "businessMetrics.totalEmployees": 0
  }}
);
```

### Role Migration

```javascript
// Migrate from old 'customer' role to 'branch'
db.users.updateMany(
  { role: "customer" },
  { $set: { role: "branch" } }
);

// Update any references in application code
// Old: role: 'customer'
// New: role: 'branch'
```

## Performance Optimization

### Index Usage

```javascript
// Explain query performance
db.users.find({ 
  createdBy: ObjectId("admin_id"), 
  role: "branch" 
}).explain("executionStats");

// Ensure indexes are used effectively
db.users.getIndexes();
```

### Query Optimization Tips

1. **Use Projection**: Only select needed fields
```javascript
.select("businessName email businessMetrics employees")
```

2. **Limit Results**: Use pagination for large datasets
```javascript
.limit(20).skip((page - 1) * 20)
```

3. **Sort with Indexes**: Ensure sort fields are indexed
```javascript
.sort({ createdAt: -1 })
```

4. **Compound Queries**: Use compound indexes for multi-field queries
```javascript
{ createdBy: 1, role: 1, createdAt: -1 }
```

## Data Validation

### Schema Validation

```javascript
// MongoDB schema validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "firstName", "lastName", "businessName"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        role: {
          enum: ["branch", "admin", "superAdmin"]
        },
        "businessMetrics.totalSales": {
          bsonType: ["number", "null"],
          minimum: 0
        }
      }
    }
  }
});
```

### Application-Level Validation

```javascript
// Express-validator rules
const createAccountValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('businessName').trim().isLength({ min: 1 }),
  body('role').isIn(['branch', 'admin', 'superAdmin'])
];
```

## Backup and Recovery

### Backup Strategy

```bash
# Daily backup
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/ava-marketing-website" --out=/backups/$(date +%Y%m%d)

# Selective collection backup
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/ava-marketing-website" --collection=users --out=/backups/users_$(date +%Y%m%d)
```

### Recovery Process

```bash
# Full restore
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/ava-marketing-website" /backups/20250907/

# Collection restore
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/ava-marketing-website" --collection=users /backups/users_20250907/
```

## Security Considerations

### Data Protection

1. **Password Hashing**: bcrypt with salt rounds
2. **Sensitive Data**: plainPassword only for admin-created accounts
3. **Access Control**: Role-based with proper isolation
4. **Indexes**: No sensitive data in compound indexes

### Connection Security

1. **Connection String**: Use environment variables
2. **SSL/TLS**: Always enabled for production
3. **IP Whitelisting**: Configure in MongoDB Atlas
4. **Authentication**: Strong passwords and rotation

### Data Anonymization

```javascript
// Anonymize user data for testing
db.users.updateMany(
  {},
  {
    $set: {
      email: { $concat: ["user", { $toString: "$_id" }, "@example.com"] },
      firstName: "Test",
      lastName: "User",
      phone: "555-0000"
    }
  }
);
```

## Monitoring and Maintenance

### Performance Monitoring

```javascript
// Slow query logging
db.setProfilingLevel(1, { slowms: 100 });

// Index usage statistics  
db.users.aggregate([{ $indexStats: {} }]);

// Collection statistics
db.users.stats();
```

### Maintenance Tasks

1. **Index Optimization**: Rebuild indexes monthly
2. **Data Cleanup**: Remove old sync data
3. **Performance Review**: Analyze slow queries
4. **Backup Verification**: Test restore procedures

## System Analysis Integration

### Business Metrics Aggregation
```javascript
// Aggregate total system metrics across all users
db.users.aggregate([
  { $match: { role: "branch" } },
  { $group: { 
    _id: null, 
    totalSystemSales: { $sum: "$businessMetrics.totalSales" },
    totalSystemTransactions: { $sum: "$businessMetrics.totalTransactions" },
    totalActiveBusinesses: { $sum: 1 },
    avgSalesPerBusiness: { $avg: "$businessMetrics.totalSales" }
  }}
]);
```

### Performance Analytics
```javascript
// Track system performance metrics
const performanceMetrics = {
  pwaBenchmarks: {
    averageStartupTime: "2.3s",
    offlineCapabilityScore: 98,
    cacheEfficiency: 94,
    serviceWorkerHealth: "active"
  },
  systemOptimizations: {
    removedLegacyFiles: 3,
    reducedHttpRequests: 3,
    uiFreezeFixes: true,
    longRunningSessionSupport: true
  }
};
```

### Attendance System Queries
```javascript
// Get employees with early departure issues
db.users.find({
  "employees.attendanceRecords.isEarlyDeparture": true
}).forEach(user => {
  const problematicEmployees = user.employees.filter(emp => 
    emp.attendanceRecords.some(att => att.isEarlyDeparture)
  );
  print(`Business: ${user.businessName}, Problem employees: ${problematicEmployees.length}`);
});

// Calculate total payroll deductions system-wide  
db.users.aggregate([
  { $unwind: "$employees" },
  { $unwind: "$employees.attendanceRecords" },
  { $group: {
    _id: null,
    totalPayrollDeductions: { $sum: "$employees.attendanceRecords.payDeduction" },
    totalEarlyDepartures: { $sum: { $cond: ["$employees.attendanceRecords.isEarlyDeparture", 1, 0] } }
  }}
]);
```

### Market Value Data Structure
```javascript
const marketAnalysis = {
  technicalGrade: "B+",
  overallScore: 3.4,
  marketValue: {
    conservative: 150000,
    optimistic: 300000,
    currency: "USD"
  },
  competitivePosition: {
    advantages: [
      "offline-first-capability",
      "no-transaction-fees", 
      "philippine-compliance",
      "service-industry-specialization"
    ],
    marketFit: "strong-buy",
    revenueProjections: {
      year1: 2100000, // PHP
      year2: 7200000, // PHP  
      year3: 16200000 // PHP
    }
  }
};
```

---

**Last Updated**: September 9, 2025
**Version**: 1.1.0
**Major Updates**: Attendance system schema, payroll integration, system analytics