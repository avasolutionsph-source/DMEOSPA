# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ava Solutions PWA is a unified web application ecosystem consisting of a Progressive Web App (PWA), marketing website, and comprehensive backend API. The codebase recently underwent major refactoring to eliminate code duplication and implement unified utility systems.

## Common Commands

### Backend Development
```bash
# Start backend development server
cd backend && npm run dev

# Run backend tests
cd backend && npm test

# Run backend linting
cd backend && npm run lint

# Fix backend linting issues
cd backend && npm run lint:fix

# Run backend build/validation
cd backend && npm run build
```

### Marketing Website Development  
```bash
# Start marketing development server
cd marketing-website && npm run dev

# Start marketing production server
cd marketing-website && npm start

# Seed marketing database
cd marketing-website && npm run seed
```

### PWA Development
The PWA is a frontend-only application that connects to the backend API. It uses vanilla JavaScript with modular architecture.

### Testing
```bash
# Backend tests with coverage
cd backend && npm run test

# Watch mode testing
cd backend && npm run test:watch

# Frontend testing - open test-utilities.html in browser for integrated testing
```

## High-Level Architecture

### Repository Structure
The repository contains multiple applications:
- **backend/** - Unified Node.js/Express API server handling all backend operations
- **marketing-website/** - Marketing website with admin panel (Express + static files)  
- **PWA-Repository/** - Progressive Web App (vanilla JavaScript)
- **js/** - PWA JavaScript modules (legacy location, mainly for development)
- **docs/** - Technical documentation

### Database Architecture
- **MongoDB** - Primary database for all applications (users, products, inventory, transactions)
- **Unified Models** - Shared Mongoose models across all applications
- **Connection Pooling** - Single database connection shared by all services

### PWA Frontend Architecture
Modern modular JavaScript architecture with:
- **State Management** - Centralized StateManager with automatic UI updates
- **Unified Utilities** - Logger, notification, error handling, and API client systems
- **Component System** - HTML components loaded dynamically 
- **API Client** - Resource-specific API clients with automatic retry and error handling

### Authentication Flow
- **JWT Tokens** - Primary authentication method
- **Session-based** - For marketing website (Passport.js)
- **Multi-level Auth** - User and admin authentication with role-based permissions

### Real-time Features
- **Socket.IO** - Real-time updates between PWA and backend
- **StateManager Integration** - Automatic state synchronization across clients
- **Live Data Sync** - Inventory, transactions, and employee data sync

### Unified Systems (Recently Implemented)
The codebase uses unified utility systems that eliminated 85% of code duplication:

#### Logging System
All logging goes through unified logger helper functions that work consistently across platforms:
```javascript
import { logError, logInfo, logDebug, logSuccess } from './js/utils/logger-helper.js';
```

#### Notification System  
Unified toast-style notifications with auto-detection and queue management:
```javascript
import { showSuccess, showError, showWarning, showInfo } from './js/utils/notification-manager.js';
```

#### Error Handling
Centralized error handling with user-friendly messages and automatic logging:
```javascript
import { withErrorHandling, handleError } from './js/utils/error-handler.js';
```

#### API Client System
Resource-specific API clients with automatic retry, error handling, and timeout management:
```javascript
import { apiClient, productsAPI, authAPI } from './js/utils/base-api-client.js';
```

#### Backend Route Handlers
Unified CRUD route handlers with automatic pagination, search, and validation:
```javascript
import BaseRouteHandler from './backend/utils/base-route-handler.js';
```

## Key Patterns

### Frontend Development
1. **Always import unified utilities** - Use the centralized systems instead of duplicating code
2. **Use resource APIs** - Prefer `productsAPI.list()` over `apiClient.get('/api/products')`  
3. **Consistent logging categories** - Use predefined categories (AUTH, DATABASE, API, UI, VALIDATION, SYNC, POS, INVENTORY, EMPLOYEES)
4. **Error handling wrapper** - Wrap risky operations with `withErrorHandling()`
5. **State management** - Use StateManager for application state instead of local variables

### Backend Development
1. **Use BaseRouteHandler** - Create CRUD routes with the unified base handler
2. **Unified error handling** - All routes use the consolidated error handling middleware
3. **Consistent logging** - Use Winston logger with structured logging
4. **Database patterns** - Use the database helper functions for connections and queries
5. **Authentication middleware** - Use the unified auth middleware for protected routes

### Code Organization
- **Modular CSS** - Styles are split into modular files in `src/css/`
- **Component-based HTML** - HTML components in `src/components/`
- **Utility-first JavaScript** - Core utilities in `js/utils/` and `src/js/utils/`
- **Resource-specific APIs** - Each data type has its own API module

## Important File Locations

### PWA Core Files
- `PWA-Repository/index.html` - Main PWA entry point
- `PWA-Repository/js/app.js` - Main application controller
- `PWA-Repository/js/state-manager.js` - Centralized state management
- `PWA-Repository/service-worker.js` - PWA service worker
- `PWA-Repository/manifest.json` - PWA manifest

### Backend Core Files  
- `backend/server.js` - Main Express server
- `backend/config/database.js` - MongoDB connection and helpers
- `backend/utils/base-route-handler.js` - Unified CRUD route handler
- `backend/middleware/errorHandler.js` - Unified error handling
- `backend/utils/logger.js` - Winston logging system

### Unified Utility Systems
- `js/utils/unified-logger.js` - Core logging system
- `js/utils/logger-helper.js` - Convenient logging functions
- `js/utils/notification-manager.js` - Toast notification system
- `js/utils/error-handler.js` - Centralized error handling
- `js/utils/base-api-client.js` - HTTP client with retry logic
- `js/utils/resource-apis.js` - Resource-specific API clients

### Documentation
- `TEAM_GUIDE.md` - Comprehensive guide for using unified systems
- `API_REFERENCE.md` - Technical reference for all utilities
- `PROJECT-STRUCTURE.md` - Detailed file organization documentation
- `PROJECT_STATUS.md` - Current project status and completed improvements

## Development Workflow

### Making Changes to PWA
1. Work in the `js/` directory for development
2. Copy changes to `PWA-Repository/js/` for deployment
3. Test with `test-utilities.html` to ensure unified systems work correctly

### Making Changes to Backend
1. All backend changes in `backend/` directory
2. Use BaseRouteHandler for new CRUD endpoints
3. Follow existing patterns for authentication and error handling
4. Run tests to ensure compatibility

### Database Changes
1. Update Mongoose models in `backend/models/`
2. Create migration scripts if needed with `backend/scripts/migrate.js`
3. Test with seed data using `npm run seed`

## Testing Strategy
- **Backend Tests** - Jest testing framework with supertest for API testing
- **Integration Testing** - `test-utilities.html` for testing unified frontend systems
- **Manual Testing** - Use development servers for full application testing
- **Database Testing** - Seed scripts for consistent test data

## Performance Considerations
- **Modular Loading** - JavaScript modules loaded on demand
- **Connection Pooling** - Database connections shared across requests  
- **Caching** - Redis caching for frequently accessed data
- **Code Elimination** - Unified systems eliminated 85% of duplicate code
- **Bundle Size** - Modular CSS and JS reduce overall bundle size

## Deployment Architecture
- **Backend** - Deployed to Render/Railway as unified API server
- **PWA** - Deployed to Netlify as static PWA
- **Marketing** - Can be deployed separately or served by backend
- **Database** - MongoDB Atlas for production
- **Real-time** - Socket.IO for live updates

This codebase prioritizes maintainability, performance, and developer experience through unified systems and consistent patterns.