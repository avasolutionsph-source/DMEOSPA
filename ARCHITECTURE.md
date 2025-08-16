# Ava Solutions - Three-Server Architecture

## 🏗️ **System Architecture**

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Marketing Website │    │   PWA Application   │    │    PWA Backend      │
│    (Port 3000)      │    │    (Port 8080)      │    │    (Port 4000)      │
│                     │    │                     │    │                     │
│ • Landing Page      │    │ • Spa Management    │    │ • Data Sync API     │
│ • Pricing Plans     │    │ • POS System        │    │ • Authentication    │
│ • User Registration │    │ • Inventory         │    │ • User Profiles     │
│ • Admin Panel       │    │ • Employees         │    │ • Business Data     │
│ • Subscriptions     │    │ • AI Chatbot        │    │ • Offline Sync      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
          │                           │                           │
          │                           │                           │
          │                           └───────────────────────────┘
          │                              API Calls for:
          │                              • Login/Register
          │                              • Data Sync
          │                              • User Profile
          │
          └─────────────────────────────────────────────────────────────────┐
                                    User Upgrades:                          │
                                    • Plan Changes                          │
                                    • Subscription Management               │
                                    • Account Settings                      │
```

## 🔗 **Connection Flow**

### **1. User Journey:**
1. **Visit Marketing Website** → `http://localhost:3000`
2. **See pricing and features** → Choose subscription plan
3. **Register account** → Create account on marketing website
4. **Access PWA** → `http://localhost:8080`
5. **Login to PWA** → Uses PWA Backend API
6. **Use business features** → All data syncs with PWA Backend

### **2. API Connections:**

#### **PWA Application (Port 8080) → PWA Backend (Port 4000):**
- ✅ User authentication: `/api/auth/login`
- ✅ Data synchronization: `/api/products/sync`, `/api/inventory/sync`
- ✅ User profile: `/api/user/profile`
- ✅ Business data: All CRUD operations

#### **PWA Application (Port 8080) → Marketing Website (Port 3000):**
- ✅ Subscription upgrades: `/upgrade?plan=basic`
- ✅ Support requests: `/contact`
- ✅ Feature information: `/features`

#### **Marketing Website (Port 3000) → Own Database:**
- ✅ User accounts and subscriptions
- ✅ Admin panel data
- ✅ Marketing analytics

## 🚀 **How to Start All Three Servers:**

### **Option 1: Use the Batch Script**
```bash
.\start-dev.bat
```

### **Option 2: Manual Startup**
```bash
# Terminal 1 - PWA Backend
cd pwa-backend
npm run dev

# Terminal 2 - Marketing Website  
cd marketing-website
npm run dev

# Terminal 3 - PWA Application
npx http-server -p 8080 -c-1
```

## 🎯 **Access Points:**

- **🌐 Marketing Website**: http://localhost:3000
- **📱 PWA Application**: http://localhost:8080  
- **🔧 PWA Backend API**: http://localhost:4000/api/health
- **👑 Admin Panel**: http://localhost:3000/admin

## ✅ **Benefits of This Architecture:**

1. **Separation of Concerns**: Each server has a specific purpose
2. **Independent Scaling**: Can scale each component separately
3. **Development Flexibility**: Can work on each part independently
4. **Production Ready**: Easy to deploy to different services
5. **No Port Conflicts**: Each service runs on its own port
6. **Service Worker Isolation**: PWA service worker only affects port 8080

## 🔧 **Configuration:**

- **PWA** connects to **PWA Backend** (port 4000) for all business data
- **Marketing Website** has its own API and database (port 3000)
- **Users** can upgrade subscriptions by being redirected from PWA to Marketing Website
- **All three** can run simultaneously without conflicts

This architecture provides the best of both worlds: separation for development and deployment, but seamless integration for the user experience.
