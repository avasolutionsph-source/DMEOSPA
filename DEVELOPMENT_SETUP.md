# Development Setup Guide

## Overview

This guide helps developers set up the complete Ava Solutions development environment, including all three services: Marketing Website, PWA Frontend, and Backend API.

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher  
- **Git**: Latest version
- **MongoDB**: Local installation or Atlas account
- **VS Code**: Recommended IDE with extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## Project Structure

```
DAETSPA/
├── backend/                    # Backend API (Node.js/Express)
│   ├── middleware/            # Auth, validation, logging
│   ├── models/               # MongoDB/Mongoose schemas  
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic
│   ├── .env                  # Backend environment config
│   └── server.js             # Main server file
├── marketing-website/         # Marketing & Admin Site
│   ├── public/               # Static frontend files
│   │   ├── assets/          # CSS, JS, images
│   │   ├── admin.html       # Super Admin dashboard
│   │   ├── admin-dashboard.html # Admin dashboard
│   │   └── index.html       # Landing page
│   ├── routes/              # Express routes
│   ├── models/              # Database models
│   ├── .env                 # Marketing site config
│   └── server.js            # Marketing server
├── PWA-Repository/           # Progressive Web App
│   ├── js/                  # JavaScript modules
│   ├── css/                 # Stylesheets
│   ├── index.html           # PWA main page
│   ├── manifest.json        # PWA manifest
│   └── service-worker.js    # Offline functionality
├── ADMIN_DASHBOARD_GUIDE.md  # Admin system documentation
├── API_DOCUMENTATION.md      # API reference
├── DATABASE_SCHEMA.md        # Database documentation
└── CLAUDE.md                 # Project instructions
```

## Installation Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd DAETSPA
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Backend .env Configuration:**
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# JWT Configuration  
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server Configuration
PORT=4001
NODE_ENV=development

# Logging
LOG_LEVEL=info
LOG_SLOW_QUERIES=false
```

### 3. Marketing Website Setup

```bash
cd ../marketing-website
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Marketing Website .env Configuration:**
```env
PORT=3002
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name
JWT_SECRET=your-jwt-secret-key-must-match-backend
JWT_EXPIRE=999y
ALLOWED_ORIGINS=http://localhost:3002,http://localhost:8080,http://localhost:4001
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure-admin-password
PWA_BACKEND_URL=http://localhost:4001
```

### 4. PWA Setup

The PWA is a static frontend application requiring no build process.

```bash
cd ../PWA-Repository

# No installation required - runs directly from static files
# Served via HTTP server or local development server
```

## Development Workflow

### Starting All Services

#### Option 1: Manual Start (Recommended for Development)

```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Marketing Website  
cd marketing-website
npm run dev

# Terminal 3: PWA Frontend
cd PWA-Repository
npx http-server -p 8080
```

#### Option 2: Using Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Monitor services
pm2 monit

# Stop all services
pm2 stop all
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'backend-api',
      script: './backend/server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 4001
      }
    },
    {
      name: 'marketing-website',
      script: './marketing-website/server.js', 
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      }
    },
    {
      name: 'pwa-frontend',
      script: 'npx',
      args: 'http-server PWA-Repository -p 8080'
    }
  ]
};
```

### Service URLs

After starting all services:

- **Backend API**: http://localhost:4001
- **Marketing Website**: http://localhost:3002
- **PWA Frontend**: http://localhost:8080
- **Super Admin**: http://localhost:3002/admin
- **Admin Dashboard**: http://localhost:3002/admin-dashboard

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Atlas Account**: https://www.mongodb.com/atlas
2. **Create Cluster**: Follow setup wizard
3. **Create Database User**: With read/write permissions
4. **Whitelist IP**: Add your development IP
5. **Get Connection String**: Use in .env files

### Local MongoDB (Alternative)

```bash
# Install MongoDB locally
brew install mongodb/brew/mongodb-community  # macOS
sudo apt install mongodb                      # Ubuntu

# Start MongoDB service
brew services start mongodb-community        # macOS
sudo systemctl start mongod                  # Ubuntu

# Connection string for local MongoDB
MONGODB_URI=mongodb://localhost:27017/ava-marketing-website
```

### Database Initialization

```bash
cd marketing-website
npm run seed    # Creates initial admin user
```

Default admin credentials:
- **Email**: avasolutionsph@gmail.com
- **Password**: Ava12345
- **Role**: superAdmin

## Development Commands

### Backend Development

```bash
cd backend

# Development mode (auto-restart)
npm run dev

# Production mode
npm start

# Run tests with coverage
npm test

# Linting
npm run lint
npm run lint:fix

# Database operations
npm run seed        # Seed initial data
npm run migrate     # Run migrations
```

### Marketing Website Development

```bash
cd marketing-website

# Development mode
npm run dev

# Production mode  
npm start

# Database operations
npm run seed        # Create admin user
npm run cleanup     # Remove test users
```

### PWA Development

```bash
cd PWA-Repository

# Local development server
npx http-server -p 8080

# Alternative servers
python -m http.server 8080
php -S localhost:8080
```

## Development Tools

### API Testing

#### Using cURL

```bash
# Test login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'

# Test admin endpoint
curl -X GET http://localhost:3002/api/admin/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Using Postman

Import the provided Postman collection:

```json
{
  "info": {
    "name": "Ava Solutions API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  }
}
```

### Database Management

#### MongoDB Compass

1. **Download**: https://www.mongodb.com/products/compass
2. **Connect**: Use connection string from .env
3. **Explore**: Browse collections and documents
4. **Query**: Test database queries

#### VS Code MongoDB Extension

```bash
# Install extension
code --install-extension mongodb.mongodb-vscode

# Connect to database in VS Code
# Use Command Palette: "MongoDB: Connect"
```

### Debugging

#### Backend Debugging

```javascript
// Add to package.json scripts
"debug": "node --inspect=0.0.0.0:9229 server.js"

// VS Code launch.json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Backend",
  "port": 9229,
  "localRoot": "${workspaceFolder}/backend",
  "remoteRoot": "/app"
}
```

#### Frontend Debugging

- **Browser DevTools**: F12 or right-click → Inspect
- **Console Logging**: Use `console.log()`, `console.error()`
- **Network Tab**: Monitor API requests/responses
- **Application Tab**: Check localStorage, sessionStorage
- **Sources Tab**: Set breakpoints in JavaScript

### Environment Configuration

#### Development vs Production

**Development (.env.development):**
```env
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=*
RATE_LIMIT=1000
```

**Production (.env.production):**
```env
NODE_ENV=production
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT=100
```

#### Environment Variables Priority

1. Command line arguments
2. .env.local (ignored by git)
3. .env.development / .env.production
4. .env
5. Default values in code

## Testing

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.js
```

### Frontend Testing

```bash
# Manual testing checklist
- [ ] All pages load correctly
- [ ] Login/logout functionality
- [ ] Role-based access control
- [ ] Admin account creation
- [ ] Business data viewing
- [ ] Mobile responsive design
- [ ] Cross-browser compatibility
```

### Integration Testing

```bash
# Test complete user workflows
- [ ] Super admin creates admin account
- [ ] Admin logs in and accesses dashboard
- [ ] Admin creates branch account
- [ ] Admin views branch business data
- [ ] Branch user accesses PWA system
```

## Troubleshooting

### Common Issues

#### "Cannot connect to MongoDB"

```bash
# Check connection string
echo $MONGODB_URI

# Test connection
mongosh "mongodb+srv://cluster.mongodb.net/test"

# Check firewall/VPN settings
ping cluster.mongodb.net
```

#### "Port already in use"

```bash
# Find process using port
netstat -ano | findstr :3002    # Windows
lsof -ti:3002                   # macOS/Linux

# Kill process
taskkill /F /PID <process_id>   # Windows  
kill -9 <process_id>            # macOS/Linux
```

#### "JWT token invalid"

```bash
# Check token expiration
node -e "console.log(JSON.parse(Buffer.from('TOKEN'.split('.')[1], 'base64').toString()))"

# Verify JWT secret matches between services
grep JWT_SECRET backend/.env marketing-website/.env
```

#### "Module not found"

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Debug Scripts

```bash
# Check all service status
curl -I http://localhost:4001/api/health
curl -I http://localhost:3002/api/health  
curl -I http://localhost:8080

# Database connection test
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));
"

# JWT token validation test
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Token valid:', decoded);
} catch(err) {
  console.error('❌ Token invalid:', err.message);
}
"
```

## Code Style and Standards

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', 'node'],
  env: {
    node: true,
    es2022: true
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single']
  }
};
```

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Git Workflow

```bash
# Feature branch workflow
git checkout main
git pull origin main
git checkout -b feature/admin-dashboard-enhancement

# Make changes, then commit
git add .
git commit -m "feat: add business data viewer to admin dashboard"

# Push and create PR
git push origin feature/admin-dashboard-enhancement
```

### Commit Message Convention

```
feat: add new feature
fix: fix bug
docs: update documentation  
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

## Production Deployment

### Environment Preparation

```bash
# Production environment variables
NODE_ENV=production
MONGODB_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/prod-db
JWT_SECRET=super-secure-production-secret
PORT=443
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem
```

### Build Process

```bash
# Backend production build
cd backend
npm run build
npm prune --production

# Marketing website build
cd ../marketing-website  
npm run build
npm prune --production

# PWA optimization
cd ../PWA-Repository
# Optimize images, minify CSS/JS
# Update service worker cache
```

### Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] SSL/TLS certificates installed
- [ ] CORS origins restricted
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Dependencies updated
- [ ] Penetration testing completed

## Performance Optimizations (2025-09-09)

### PWA Performance Improvements

#### Removed Legacy Files
```bash
# These files have been removed to reduce startup time:
# - js/console-log-replacer.js (unused)
# - js/logger-loader.js (unused) 
# - js/browser-universal-fix.js (legacy compatibility)

# Result: 3 fewer HTTP requests on PWA initialization
```

#### Fixed UI Freezing Issues

**Customer Dropdown Fix:**
```javascript
// BEFORE: Blocking while loop (caused 5-second freezes)
while (!this.customersLoaded && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
}

// AFTER: Non-blocking initialization
if (!this.customersLoaded && this.isInitializing) {
    console.log('⏳ Initializing dropdown without waiting to prevent UI freeze...');
    // Dropdown updates when customers finish loading
}
```

**Dashboard Sync Direction Fix:**
```javascript
// BEFORE: Wrong sync direction (download overwrote local data)
if (window.runFullDataSync) {
    await window.runFullDataSync(); // Downloads FROM backend TO PWA
}

// AFTER: Correct sync direction (upload local data)
if (window.syncManager) {
    await window.syncManager.syncAll(); // Uploads FROM PWA TO backend
}
```

### Sync System Improvements

#### Transaction Sync Resolution
```javascript
// Added automatic sync trigger after POS transactions
if (window.syncManager) {
    console.log('💰 Triggering sync to upload new transaction');
    window.syncManager.triggerSync();
} else {
    // Fallback for sync manager not ready
    setTimeout(() => {
        if (window.syncManager) {
            window.syncManager.triggerSync();
        }
    }, 3000);
}
```

#### Marketing Website Modal Fix
```javascript
// Added proper modal cleanup to prevent dark overlay issues
function removeExistingModals() {
    const existingModals = document.querySelectorAll('[data-modal="sync"]');
    existingModals.forEach(modal => modal.remove());
}

// All modal close buttons now use this cleanup function
<button onclick="removeExistingModals()">Perfect!</button>
```

### Long-Running Session Optimizations

#### Memory Management
- **Existing**: Memory manager with cleanup every 60 seconds and garbage collection every 5 minutes
- **Improved**: Console logging disabled in production for better performance
- **Result**: PWA can run reliably during extended business hours

#### Sync Frequency Optimization
```javascript
// Dashboard sync frequency reduced for better performance
const shouldSync = !lastSync || 
    (new Date() - new Date(lastSync.value)) > (4 * 60 * 60 * 1000); // 4 hours instead of 1 hour
```

### Development Testing for Performance

#### Test UI Responsiveness
```bash
# Test customer dropdown (should not freeze)
1. Open PWA → POS → Checkout
2. Click customer dropdown immediately after page load
3. Should open instantly without 5-second freeze

# Test transaction sync
1. Complete a POS transaction
2. Check browser console for sync trigger message
3. Verify transaction appears in marketing website dashboard
```

#### Test Modal Cleanup
```bash
# Test marketing website sync modal
1. Open marketing website → Business Dashboard
2. Click "Sync Now"
3. Close modal using X, Perfect!, or outside click
4. Page should return to normal brightness (no dark overlay)
```

#### Monitor Long-Running Sessions
```javascript
// Enable performance monitoring in browser console
if ('memory' in performance) {
    const memory = performance.memory;
    console.log(`Memory usage: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
}

// Check for memory leaks after extended use
setInterval(() => {
    if ('memory' in performance) {
        const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        if (used > 200) console.warn(`High memory usage: ${used}MB`);
    }
}, 300000); // Every 5 minutes
```

---

**Last Updated**: September 9, 2025
**Version**: 1.1.0