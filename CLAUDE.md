# CLAUDE.md - Ava Solutions System Architecture Guide

This file helps AI assistants understand the DAETSPA codebase architecture and design decisions.

## System Overview

A multi-service spa/salon management system designed for the Philippine market with offline-first capabilities.

### Core Components

1. **PWA-Repository/** - Offline-first Progressive Web App (Vanilla JS)
2. **backend/** - Unified API server (Node.js/Express/MongoDB)  
3. **marketing-website/** - Marketing site with admin panel (Node.js/Express)

## Why It's Coded This Way - Key Design Decisions

### 1. Offline-First Architecture
**Problem**: Philippine businesses face frequent internet/power outages
**Solution**: 
- IndexedDB for complete offline operation
- HybridAPIClient manages online/offline state intelligently
- Service Worker caches all static assets
- Transactions queue when offline, sync when online

### 2. No Build Process for PWA
**Problem**: Complex build tools increase deployment friction
**Solution**: 
- Vanilla JavaScript with ES6 modules
- Direct file serving (no webpack/bundling)
- Instant updates without compilation
- Easier debugging in production

### 3. Employee-Transaction Data Linking
**Problem**: Maintaining data consistency between employees and their sales
**Solution**:
- Transactions store employee data as embedded object: `employee: {id, name, position}`
- Employee stats calculated dynamically from transactions (single source of truth)
- Frontend maps MongoDB `_id` to `id` for consistency
- Backend `/api/business/employees` aggregates transaction data in real-time

### 4. Dual Authentication Strategy
**Problem**: Business can't stop if auth server is down
**Solution**:
- JWT tokens with offline validation
- Background session validation (non-blocking)
- Demo mode for offline testing
- Tokens persist in localStorage for offline access

## Critical Data Flows

### Transaction → Employee Stats Flow
```
1. POS creates transaction with employee.id (from dropdown)
2. Transaction saved with: employee: {id, name, position}
3. Backend GET /api/business/employees:
   - Fetches all transactions
   - Filters by employee.id === emp._id.toString()
   - Calculates totalSales, totalCommission, transactionCount
4. Frontend displays calculated stats (not stored fields)
```

### Offline → Online Sync Flow
```
1. PWA detects offline state (navigator.onLine)
2. Data saves to IndexedDB with syncStatus: 'pending'
3. HybridAPIClient queues failed requests
4. On reconnection:
   - Process queued requests
   - Sync pending IndexedDB records
   - Update syncStatus: 'synced'
```

## Port Configuration

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Backend API | 4001 | http://localhost:4001 | Unified API server |
| Marketing | 3003 | http://localhost:3003 | Marketing & admin site |
| PWA | 8080-8082 | http://localhost:8082 | Business management app |

## Database Architecture

### MongoDB Collections
- **users** - Authentication & business accounts
- **employees** - Staff records (stats calculated, not stored)
- **transactions** - POS sales (source of truth for revenue)
- **products/inventory** - Stock management
- **attendance** - Time tracking with check-out deductions
- **customers** - Client management
- **giftCertificates** - Gift card tracking

### IndexedDB Stores (PWA)
- Version 13 with 15+ object stores
- Mirrors MongoDB structure for offline operation
- Automatic schema migrations on version change
- Sync metadata tracks online/offline changes

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...  # MongoDB Atlas connection
JWT_SECRET=...                  # JWT signing key
PORT=4001                       # Server port
NODE_ENV=development            # Environment
```

### Marketing Website (.env)
```
MONGODB_URI=...                 # Same as backend
JWT_SECRET=...                  # Same as backend  
PORT=3003                       # Server port
```

## Common Issues & Solutions

### Employee Sales Showing ₱0.00
**Cause**: Transactions not linked to employee
**Fix**: Ensure employee selected in POS before checkout
**Backend Fix**: `/api/business/employees` now calculates from transactions

### Slow Initial Login
**Cause**: Render.com free tier cold start (30-60 seconds)
**Solution**: Backend takes time to wake up - normal behavior

### Offline Sync Not Working
**Check**:
1. HybridAPIClient.isOnline status
2. IndexedDB syncStatus fields
3. Network tab for failed requests
4. Console for sync queue processing

## Development Workflow

### Starting Services
```bash
# Backend (required for auth)
cd backend && npm run dev

# PWA (no build needed)
cd PWA-Repository
npx http-server -p 8082

# Marketing (optional)
cd marketing-website && npm run dev
```

### Testing Offline Mode
1. Login while online (gets auth token)
2. Open DevTools → Network → Offline
3. Continue using POS, inventory, etc.
4. Go back online - data auto-syncs

### Adding New Features
1. Add IndexedDB store if needed (increment version)
2. Create API endpoint in backend/routes/api/
3. Add offline support in HybridAPIClient
4. Update service-worker.js cache list

## Performance Optimizations

### Memory Management
- Auto-cleanup after 4 hours
- Garbage collection triggers
- Dashboard refresh on low memory
- Transaction cache with TTL

### Load Time Optimizations  
- Service Worker pre-caches assets
- Lazy loading for large modules
- Background auth validation
- Deferred non-critical operations

## Security Considerations

- JWT tokens expire after 7 days
- Super admin role for system access
- API rate limiting on backend
- Sanitized user inputs
- No sensitive data in localStorage

## Deployment

### Backend (Render.com)
- Connects to MongoDB Atlas
- Free tier: 30-60 second cold start
- Auto-deploys from GitHub main branch

### PWA (Netlify/Vercel)
- Static file hosting
- No build process required
- Service worker handles offline

### Marketing (Render.com)
- Server-side rendered
- Session-based auth for admin

## Known Issues (Fixed)

### ~~Payroll Requests - Manager Access Issue~~ ✅ FIXED
**Issue**: Managers couldn't see payroll requests even though backend endpoint exists
**Root Cause**: Backend was filtering requests by userId, but managers have different userId than branch owner
**Fix Applied**: 
- Backend now properly handles manager role with branch owner's userId
- Managers (role='manager') now see all branch requests
- Frontend properly calls `/api/payroll-requests` endpoint

## Recent Fixes (2025)

### Employee Stats Calculation (Sept 2025)
- Changed from static fields to dynamic calculation
- `/api/business/employees` aggregates transaction data
- Ensures accurate, real-time statistics

### Login Issues (Sept 2025)
- Fixed backend URL inconsistencies
- Corrected CSS path references
- Unified authentication endpoints

### Performance (Sept 2025)
- Removed blocking while loops
- Optimized memory management
- Reduced sync frequency

---

*This documentation reflects the actual code implementation as of September 2025*