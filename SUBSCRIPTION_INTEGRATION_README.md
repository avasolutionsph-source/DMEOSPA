# Subscription Integration Guide

Your PWA is now ready to connect to a MERN subscription website! Here's what has been implemented and how to set it up.

## 🚀 What's Been Added

### 1. **Entitlements System** (`js/entitlements.js`)
- Feature gating based on subscription plans (Free, Basic, Pro)
- Plan limits enforcement
- Subscription status UI indicators
- Upgrade modals and prompts

### 2. **API Client** (`js/api.js`)
- MERN backend communication
- JWT token handling
- Offline request queueing
- Network error handling and retries

### 3. **Enhanced Authentication** (`js/auth.js`)
- Real API integration with fallback to demo mode
- JWT token management
- Entitlements integration

### 4. **Cloud Sync** (`js/cloud-sync.js`)
- Minimal cloud sync for entitlements and authentication
- Usage tracking for analytics
- Backup/restore functionality (Pro plan feature)

### 5. **Feature Gating Integration**
- All modules now respect subscription limits
- UI elements are hidden/disabled based on plan
- Upgrade prompts when limits are reached

## 📋 Plan Features

### Free Plan
- ✅ POS System (basic)
- ✅ Dashboard (lite)
- ❌ Inventory Management
- ❌ Employee Management  
- ❌ AI Assistant
- **Limits**: 50 transactions, 10 services

### Basic Plan ($9.99/month)
- ✅ Everything in Free
- ✅ Inventory Management
- ✅ AI Assistant (lite)
- ✅ Cloud Backup
- ❌ Employee Management
- **Limits**: 500 transactions, 50 services, 100 inventory items

### Pro Plan ($19.99/month)
- ✅ Everything in Basic
- ✅ Employee Management
- ✅ Advanced Analytics
- ✅ Full AI Assistant
- ✅ Multi-user Access
- **Limits**: Unlimited

## 🔧 Setup Instructions

### 1. Update API URL
In `js/api.js` and `js/entitlements.js`, update the `baseUrl`:
```javascript
this.baseUrl = 'https://your-mern-website.com'; // Replace with your actual URL
```

### 2. MERN Backend Requirements

Your MERN backend should implement these endpoints:

#### Authentication
```
POST /api/auth/login
POST /api/auth/register  
POST /api/auth/refresh
POST /api/auth/logout
```

#### Entitlements
```
GET /api/entitlements
GET /api/user/profile
```

#### Subscription Management
```
GET /api/subscription/status
POST /api/subscription/checkout
GET /api/subscription/portal
```

#### Optional Features
```
POST /api/analytics/usage
GET /api/analytics/summary
POST /api/backup/upload
GET /api/backup/download
```

### 3. JWT Token Structure

Your JWT tokens should include these claims:
```json
{
  "sub": "user_id",
  "orgId": "organization_id", 
  "plan": "free|basic|pro",
  "entitlements": {
    "pos": true,
    "inventory": false,
    "employees": false, 
    "dashboard": "lite|full",
    "chatbot": false|"lite"|"full",
    "cloudBackup": false,
    "analytics": false,
    "multiUser": false,
    "support": "community|email|priority"
  },
  "exp": 1234567890
}
```

### 4. Stripe Integration

For payments, integrate Stripe in your MERN backend:

1. **Create subscription plans** in Stripe Dashboard
2. **Implement Stripe Checkout** for plan upgrades  
3. **Handle webhooks** to update entitlements
4. **Customer Portal** for plan management

### 5. Database Schema (MongoDB)

#### Users Collection
```javascript
{
  email: String,
  passwordHash: String,
  orgId: ObjectId,
  createdAt: Date
}
```

#### Organizations Collection  
```javascript
{
  name: String,
  plan: String, // 'free', 'basic', 'pro'
  entitlements: Object,
  stripeCustomerId: String,
  subscriptionStatus: String,
  subscriptionId: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🎯 Testing

### Demo Mode
The app works in demo mode without a backend:
- Email: `demo@spa.com`
- Password: `demo123`
- Plan: Basic (with inventory access)

### Plan Testing
1. **Free Plan**: Register a new account - starts with free plan
2. **Upgrade Flow**: Click upgrade buttons to test payment flow
3. **Feature Gating**: Try accessing locked features
4. **Limit Testing**: Add items to test plan limits

## 🔄 Sync Behavior

### Online
- Real-time API calls to your MERN backend
- Immediate entitlement updates
- Usage tracking for analytics

### Offline
- All core PWA functionality continues to work
- Operations are queued for sync when online
- Entitlements cached locally

## 🛠 Development Workflow

1. **Test locally** with demo mode
2. **Set up MERN backend** with required endpoints
3. **Update API URLs** in the code
4. **Implement Stripe** for payments
5. **Deploy and test** subscription flow

## 📱 User Experience

### New Users
1. Register → Free plan automatically assigned
2. Use basic features → Hit limits  
3. See upgrade prompts → Click to payment portal
4. Complete payment → Instant access to new features

### Existing Users  
1. Login → Entitlements loaded from server
2. Feature access based on current plan
3. Upgrade anytime via in-app prompts
4. Manage subscription via Customer Portal

## 🔐 Security Notes

- JWT tokens expire and refresh automatically
- Entitlements verified server-side
- Sensitive operations require authentication
- Plan limits enforced both client and server-side

## 📈 Analytics & Usage

The system tracks:
- Daily active usage
- Feature utilization  
- Plan limit approaches
- Upgrade conversion points

This data helps optimize pricing and features.

## 🎉 Ready to Deploy!

Your PWA now seamlessly integrates with subscription billing. Users get immediate value from the free plan while being guided toward upgrades as they grow their business.

The architecture keeps MongoDB usage minimal by storing only authentication, billing, and entitlements data - all heavy operational data stays in IndexedDB on the user's device.



